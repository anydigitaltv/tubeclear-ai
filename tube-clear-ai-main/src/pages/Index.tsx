import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import HeroScan from "@/components/HeroScan";
import UniversalAuditReport from "@/components/UniversalAuditReport";
import ScanSkeleton from "@/components/ScanSkeleton";
import RecentScans, { type ScanHistoryItem } from "@/components/RecentScans";
import PolicyNewsroom from "@/components/PolicyNewsroom";
import ApiSettings from "@/components/ApiSettings";
import FAQSection from "@/components/FAQSection";
import FeatureStore from "@/components/FeatureStore";
import ShareButton from "@/components/ShareButton";
import ScrollReveal from "@/components/ScrollReveal";
import EngineGrid from "@/components/EngineGrid";
import ViolationAlertPanel from "@/components/ViolationAlertPanel";
import { useHybridScanner, type FullReport, type DeepScanResult } from "@/contexts/HybridScannerContext";
import { useMetadataFetcher, type VideoMetadata } from "@/contexts/MetadataFetcherContext";
import { useCoins, type CoinTransactionType } from "@/contexts/CoinContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PlatformId } from "@/contexts/PlatformContext";

// Calculate scan cost based on duration (from VideoScanContext)
const calculateScanCost = (durationSeconds?: number): { cost: number; warning?: string } => {
  if (!durationSeconds || durationSeconds <= 0) {
    return { cost: 5, warning: 'Unable to detect video duration. Using Standard pricing (5 coins).' };
  }
  
  if (durationSeconds < 60) {
    return { cost: 2 }; // Shorts
  } else if (durationSeconds <= 600) {
    return { cost: 5 }; // Standard (1-10 min)
  } else if (durationSeconds <= 1800) {
    return { cost: 10 }; // Long (10-30 min)
  } else {
    return { cost: 20 }; // Deep (>30 min)
  }
};

const HISTORY_KEY = "tubeclear_scan_history";

const loadHistory = (): ScanHistoryItem[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveHistory = (history: ScanHistoryItem[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { balance, spendCoins } = useCoins();
  const { fetchMetadataWithFailover, getLastFailoverResult } = useMetadataFetcher();
  const { executeHybridScan, generateWhyAnalysis } = useHybridScanner();
  
  const [activeSection, setActiveSection] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [auditReport, setAuditReport] = useState<FullReport | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>(loadHistory);

  const sectionRefs = {
    scan: useRef<HTMLDivElement>(null),
    store: useRef<HTMLDivElement>(null),
    newsroom: useRef<HTMLDivElement>(null),
    faq: useRef<HTMLDivElement>(null),
    settings: useRef<HTMLDivElement>(null),
  };

  const handleNavigate = (section: string) => {
    if (section === "dashboard") {
      navigate("/dashboard");
      return;
    }
    setActiveSection(section);
    sectionRefs[section as keyof typeof sectionRefs]?.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScan = async (url: string) => {
    setIsScanning(true);
    setAuditReport(null);
    setMetadata(null);

    try {
      // STEP 1: Extract platform info from URL
      const platformId: PlatformId = url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 
                                      url.includes('tiktok.com') ? 'tiktok' : 'youtube'; // default
      
      // STEP 2: Fetch metadata with 7-engine failover
      const fetchedMetadata = await fetchMetadataWithFailover(url, platformId);
      setMetadata(fetchedMetadata);
      
      console.log('Metadata source:', fetchedMetadata.fetchedFrom);
      
      // STEP 3: Calculate scan cost based on duration
      const cost = calculateScanCost(fetchedMetadata.durationSeconds).cost;
      
      // STEP 4: Check balance
      if (balance < cost) {
        toast.error(`Insufficient coins. You need ${cost} coins but have ${balance}.`);
        setIsScanning(false);
        return;
      }
      
      // STEP 5: Execute hybrid scan
      const result: DeepScanResult = await executeHybridScan({
        videoId: url.split('/').pop() || 'unknown',
        platformId,
        title: fetchedMetadata.title,
        tags: fetchedMetadata.tags,
        description: fetchedMetadata.description,
        durationSeconds: fetchedMetadata.durationSeconds,
        videoUrl: url,
      });
      
      // STEP 6: Deduct coins
      await spendCoins(cost, "scan_deep", `Scanning: ${fetchedMetadata.title}`);
      
      // STEP 7: Generate why analysis with disclosure verification
      const whyAnalysis = generateWhyAnalysis(result, {
        title: fetchedMetadata.title,
        description: fetchedMetadata.description,
        tags: fetchedMetadata.tags,
        extractedAt: new Date().toISOString()
      }, platformId);
      
      // STEP 8: Build full report
      const report: FullReport = {
        videoUrl: url,
        verifiedTimestamp: new Date().toISOString(),
        platform: platformId,
        overallRisk: result.riskScore,
        aiDetected: result.aiDetectionConfidence > 0.7,
        disclosureVerified: whyAnalysis.disclosureStatus === "verified",
        whyAnalysis,
        shareable: true
      };
      
      setAuditReport(report);
      
      // STEP 9: Show failover result
      const failoverResult = getLastFailoverResult();
      if (failoverResult?.engineUsed && failoverResult.engineUsed !== "native_api") {
        toast.info(`Metadata generated by ${failoverResult.engineUsed}`);
      }
      
      // STEP 10: Add to history
      const newItem: ScanHistoryItem = {
        url,
        title: fetchedMetadata.title,
        risk: result.riskScore,
        date: new Date().toLocaleDateString(),
      };
      const updated = [newItem, ...scanHistory.filter((h) => h.url !== url)].slice(0, 20);
      setScanHistory(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error('Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeSection={activeSection} onNavigate={handleNavigate} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar with sidebar trigger */}
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center justify-between px-4 border-b border-border/30">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">AI Monetization Shield</span>
              </div>
            </div>
            <ViolationAlertPanel />
          </header>

          <main className="flex-1 overflow-y-auto">
            <div ref={sectionRefs.scan}>
              <HeroScan onScan={handleScan} isScanning={isScanning} />
              {isScanning && <ScanSkeleton />}
              {auditReport && metadata && (
                <UniversalAuditReport
                  report={auditReport}
                  metadata={metadata}
                  platform={auditReport.platform}
                  videoUrl={auditReport.videoUrl}
                  isGuest={isGuest}
                  onCopy={() => {
                    navigator.clipboard.writeText(JSON.stringify(auditReport, null, 2));
                    toast.success("Report copied to clipboard!");
                  }}
                  onShare={() => {
                    navigator.clipboard.writeText(auditReport.videoUrl);
                    toast.success("Share link copied!");
                  }}
                  onRunDeepScan={() => {
                    toast.info("Running comprehensive deep scan...");
                    // Deep scan logic can be added here
                  }}
                />
              )}
            </div>

            <RecentScans history={scanHistory} onRescan={handleScan} />

            <EngineGrid />

            <div className="neon-line my-4" />

            <ScrollReveal>
              <div ref={sectionRefs.store} className="container mx-auto px-6 py-8">
                <FeatureStore />
              </div>
            </ScrollReveal>

            <div className="neon-line my-4" />

            <ScrollReveal>
              <div ref={sectionRefs.newsroom}>
                <PolicyNewsroom />
              </div>
            </ScrollReveal>

            <div className="neon-line my-4" />

            <ScrollReveal>
              <div ref={sectionRefs.faq}>
                <FAQSection />
              </div>
            </ScrollReveal>

            <div className="neon-line my-4" />

            <div ref={sectionRefs.settings}>
              <ApiSettings />
            </div>

            <footer className="container mx-auto px-6 py-12 text-center text-sm text-muted-foreground space-y-2">
              <p className="text-gradient font-semibold text-lg">TubeClear</p>
              <p>AI-Powered YouTube Monetization Shield • Built for US/UK Creators</p>
              <p>© 2026 TubeClear. All rights reserved.</p>
            </footer>
          </main>
        </div>
      </div>

      <ShareButton />
    </SidebarProvider>
  );
};

export default Index;

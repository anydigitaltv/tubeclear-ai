import { useState, useRef, useEffect } from "react";
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
import PreScanConsentModal from "@/components/PreScanConsentModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHybridScanner, type FullReport, type DeepScanResult } from "@/contexts/HybridScannerContext";
import { useMetadataFetcher, type VideoMetadata } from "@/contexts/MetadataFetcherContext";
import { useCoins, type CoinTransactionType } from "@/contexts/CoinContext";
import { useAuth } from "@/contexts/AuthContext";
import { getFinalVerdict, type FinalVerdict } from "@/contexts/VideoScanContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlatformId } from "@/contexts/PlatformContext";

// Store pending scan input for modal callbacks
let pendingScanInput: any = null;

// Calculate scan cost based on duration (from VideoScanContext)
const calculateScanCost = (durationSeconds?: number): { cost: number; warning?: string } => {
  if (!durationSeconds || durationSeconds <= 0) {
    // Default to minimum cost instead of standard
    return { cost: 2, warning: 'Unable to detect video duration. Using minimum pricing (2 coins).' };
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
  const { executeHybridScan, executePreScanOnly, generateWhyAnalysis } = useHybridScanner();
  
  const [activeSection, setActiveSection] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [auditReport, setAuditReport] = useState<FullReport | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>(loadHistory);
  const [auditConfigs, setAuditConfigs] = useState<Array<{id: string, label: string, engine_type: string, system_prompt: string}>>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  
  // Pre-scan modal state
  const [showPreScanModal, setShowPreScanModal] = useState(false);
  const [preScanResult, setPreScanResult] = useState<{
    riskScore: number;
    verdict: FinalVerdict;
    issues: string[];
    requiresDeepScan: boolean;
    pendingInput: any;
    patternResult: any;
  } | null>(null);

  // Fetch audit configs from database
  useEffect(() => {
    const fetchAuditConfigs = async () => {
      try {
        // @ts-ignore
        const { data, error } = await supabase
          .from("audit_configs")
          .select("id, label, engine_type, system_prompt")
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setAuditConfigs(data || []);
        if (data && data.length > 0) {
          setSelectedConfig(data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch audit configs:", error);
      }
    };

    fetchAuditConfigs();
  }, []);

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

  const handleScan = async (url: string, platformId: string) => {
    setIsScanning(true);
    setAuditReport(null);
    setMetadata(null);

    try {
      // STEP 1: Check if user has their own API key (FREE SCAN)
      const storedApiKeys = localStorage.getItem("tubeclear_api_keys");
      const hasUserApiKey = storedApiKeys && JSON.parse(storedApiKeys).length > 0;
      
      // STEP 2: Extract platform info from URL
      const platform: PlatformId = platformId as PlatformId || 'youtube';
      
      // STEP 3: Fetch metadata with 7-engine failover
      const fetchedMetadata = await fetchMetadataWithFailover(url, platform);
      setMetadata(fetchedMetadata);
      
      // NEW STEP 4: Run Pre-Scan only (Stages 1 & 2)
      toast.info("Running Pre-Scan analysis...");
      const preScanData = await executePreScanOnly({
        videoId: url.split('/').pop() || 'unknown',
        platformId: platform,
        title: fetchedMetadata.title,
        tags: fetchedMetadata.tags,
        description: fetchedMetadata.description,
        durationSeconds: fetchedMetadata.durationSeconds,
        videoUrl: url,
      });
      
      // Store pending input for modal callbacks
      pendingScanInput = {
        videoId: url.split('/').pop() || 'unknown',
        platformId: platform,
        title: fetchedMetadata.title,
        tags: fetchedMetadata.tags,
        description: fetchedMetadata.description,
        durationSeconds: fetchedMetadata.durationSeconds,
        videoUrl: url,
      };
      
      // Show pre-scan consent modal
      setPreScanResult({
        riskScore: preScanData.riskScore,
        verdict: getFinalVerdict(preScanData.riskScore, platform),
        issues: preScanData.issues,
        requiresDeepScan: preScanData.requiresDeepScan,
        pendingInput: pendingScanInput,
        patternResult: null,
      });
      setShowPreScanModal(true);
      setIsScanning(false); // Stop scanning indicator, waiting for user choice
      
    } catch (error) {
      console.error('Pre-scan failed:', error);
      toast.error('Pre-scan failed. Please try again.');
      setIsScanning(false);
    }
  };

  // Handle user choosing to proceed with deep scan
  const handleProceedToDeepScan = async () => {
    setShowPreScanModal(false);
    setIsScanning(true);
    
    try {
      if (!pendingScanInput) {
        toast.error("Scan data lost. Please try again.");
        return;
      }
      
      // Get selected audit config
      const selectedAuditConfig = auditConfigs.find(c => c.id === selectedConfig);
      
      toast.success(`Proceeding to Deep Scan with ${selectedAuditConfig?.label || 'default config'}...`);
      
      // Execute full hybrid scan with selected config's engine and prompt
      const result: DeepScanResult = await executeHybridScan(
        pendingScanInput,
        selectedAuditConfig?.engine_type,
        selectedAuditConfig?.system_prompt
      );
      
      // Generate why analysis with disclosure verification
      const whyAnalysis = generateWhyAnalysis(result, {
        title: pendingScanInput.title,
        description: pendingScanInput.description,
        tags: pendingScanInput.tags,
        extractedAt: new Date().toISOString()
      }, pendingScanInput.platformId);
      
      // Build full report
      const report: FullReport = {
        videoUrl: pendingScanInput.videoUrl,
        verifiedTimestamp: new Date().toISOString(),
        platform: pendingScanInput.platformId,
        overallRisk: result.riskScore,
        aiDetected: result.aiDetectionConfidence > 0.7,
        disclosureVerified: whyAnalysis.disclosureStatus === "verified",
        whyAnalysis,
        shareable: true
      };
      
      setAuditReport(report);
      
      // Add to history
      const newItem: ScanHistoryItem = {
        url: pendingScanInput.videoUrl,
        title: pendingScanInput.title,
        risk: result.riskScore,
        date: new Date().toLocaleDateString(),
      };
      const updated = [newItem, ...scanHistory.filter((h) => h.url !== newItem.url)].slice(0, 20);
      setScanHistory(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      
      toast.success("Deep Scan Complete!");
      
    } catch (error) {
      console.error('Deep scan failed:', error);
      toast.error('Deep scan failed. Please try again.');
    } finally {
      setIsScanning(false);
      pendingScanInput = null;
    }
  };

  // Handle user choosing to skip deep scan
  const handleSkipDeepScan = () => {
    setShowPreScanModal(false);
    
    if (!preScanResult) return;
    
    // Create a lightweight report from pre-scan results only
    const lightweightReport: FullReport = {
      videoUrl: preScanResult.pendingInput.videoUrl,
      verifiedTimestamp: new Date().toISOString(),
      platform: preScanResult.pendingInput.platformId,
      overallRisk: preScanResult.riskScore,
      aiDetected: false,
      disclosureVerified: preScanResult.riskScore < 20,
      whyAnalysis: {
        riskReason: `Pre-scan detected ${preScanResult.issues.length} issue(s) in metadata.`,
        policyLinks: [],
        exactViolations: preScanResult.issues.map(issue => ({
          text: issue,
          severity: preScanResult.riskScore > 50 ? "high" : "medium"
        })),
        disclosureStatus: preScanResult.riskScore < 20 ? "verified" : "missing"
      },
      shareable: true
    };
    
    setAuditReport(lightweightReport);
    
    // Add to history
    const newItem: ScanHistoryItem = {
      url: preScanResult.pendingInput.videoUrl,
      title: preScanResult.pendingInput.title,
      risk: preScanResult.riskScore,
      date: new Date().toLocaleDateString(),
    };
    const updated = [newItem, ...scanHistory.filter((h) => h.url !== newItem.url)].slice(0, 20);
    setScanHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    
    toast.success("Pre-Scan Complete! (Deep scan skipped)");
    pendingScanInput = null;
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
              {/* Audit Config Dropdown */}
              {auditConfigs.length > 0 && (
                <div className="container mx-auto px-6 pt-6 pb-2">
                  <div className="max-w-2xl mx-auto">
                    <Select value={selectedConfig} onValueChange={setSelectedConfig}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700">
                        <SelectValue placeholder="Select audit type" />
                      </SelectTrigger>
                      <SelectContent>
                        {auditConfigs.map((config) => (
                          <SelectItem key={config.id} value={config.id}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <HeroScan onScan={handleScan} isScanning={isScanning} />
              {isScanning && <ScanSkeleton />}
              {auditReport && metadata && (
                <UniversalAuditReport
                  key={`report-${auditReport.verifiedTimestamp}-${auditReport.overallRisk}`}
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
      
      {/* Pre-Scan Consent Modal */}
      <PreScanConsentModal
        isOpen={showPreScanModal}
        onClose={() => setShowPreScanModal(false)}
        onProceedToDeepScan={handleProceedToDeepScan}
        onSkipDeepScan={handleSkipDeepScan}
        preScanResult={preScanResult}
      />
    </SidebarProvider>
  );
};

export default Index;

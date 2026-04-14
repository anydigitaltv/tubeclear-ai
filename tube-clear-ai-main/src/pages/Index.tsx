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
import PlatformSelector from "@/components/PlatformSelector";
import MyAuditsSection from "@/components/MyAuditsSection";
import { CoinDeductionModal } from "@/utils/CoinDeductionModal";
import { saveAuditReport } from "@/utils/auditStorage";
import { checkRateLimit, recordScan } from "@/utils/rateLimiter";
import { calculateScanCost } from "@/config/pricingConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHybridScanner, type FullReport, type DeepScanResult } from "@/contexts/HybridScannerContext";
import { useMetadataFetcher, type VideoMetadata } from "@/contexts/MetadataFetcherContext";
import { useCoins, type CoinTransactionType } from "@/contexts/CoinContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAIWithRotation } from "@/utils/apiRotationWrapper";
import { vault } from "@/utils/historicalVault";
import { getFinalVerdict, type FinalVerdict } from "@/contexts/VideoScanContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CoinSuccessAnimation from "@/components/CoinSuccessAnimation";
import type { PlatformId } from "@/contexts/PlatformContext";

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
  const { balance, spendCoins, refetchBalance } = useCoins();
  const { fetchMetadataWithFailover, getLastFailoverResult } = useMetadataFetcher();
  const { executeHybridScan, executePreScanOnly, generateWhyAnalysis } = useHybridScanner();
  const { checkPoolHealth } = useAIWithRotation();
  
  const [pendingScanInput, setPendingScanInput] = useState<any>(null);
  const [activeSection, setActiveSection] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [auditReport, setAuditReport] = useState<FullReport | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>(loadHistory);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("youtube");
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0);
  
  // Coin system state
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [pendingScanParams, setPendingScanParams] = useState<{url: string, platformId: string} | null>(null);
  const [currentScanCost, setCurrentScanCost] = useState(10);
  const [showCoinSuccess, setShowCoinSuccess] = useState(false);
  
  // Pre-scan modal state
  const [showPreScanModal, setShowPreScanModal] = useState(false);
  const [preScanResult, setPreScanResult] = useState<{
    riskScore: number;
    verdict: FinalVerdict;
    issues: string[];
    requiresDeepScan: boolean;
    pendingInput: any;
    patternResult: any;
    videoDuration?: number;
    scanCost?: number;
    hasUserAPIKey?: boolean;
  } | null>(null);

  // Check for pending/interrupted scans on mount
  useEffect(() => {
    const checkPendingScans = async () => {
      const pending = await vault.getPendingScans();
      if (pending && pending.length > 0) {
        const latest = pending[0];
        toast.info(`Interrupted scan found: ${latest.title}. Resuming...`, {
          action: {
            label: "Resume Now",
            onClick: () => {
              setMetadata({
                title: latest.title,
                description: latest.description,
                tags: latest.tags,
                thumbnail: latest.thumbnail,
                fetchedFrom: "native"
              });
              handleScan(latest.videoUrl, latest.platformId);
            }
          }
        });
      }
    };
    checkPendingScans();
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
    if (section === "history") {
      navigate("/history");
      return;
    }
    if (section === "market") {
      navigate("/market");
      return;
    }
    if (section === "license-keys") {
      navigate("/license-keys");
      return;
    }
    setActiveSection(section);
    sectionRefs[section as keyof typeof sectionRefs]?.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Check for keys and start scan workflow
  const handleScan = async (url: string, platformId: string) => {
    setIsScanning(true);
    try {
      console.log('🎯 Starting scan for:', url, platformId);
      
      const poolHealth = checkPoolHealth();
      
      // Use provided platformId to fetch metadata
      const platform: PlatformId = platformId as PlatformId;
      const fetchedMetadata = await fetchMetadataWithFailover(url, platform);
      
      console.log('📡 Metadata fetch result:', fetchedMetadata);
      
      if (!fetchedMetadata || !fetchedMetadata.title) {
        console.error('❌ Metadata fetch returned null/empty');
        throw new Error("Metadata fetch failed - no data returned");
      }
      
      setMetadata(fetchedMetadata);
      
      // Update pricing based on fetched duration
      const pricing = calculateScanCost(fetchedMetadata.durationSeconds || 0);
      setCurrentScanCost(pricing);

      // If no user keys (BYOK), trigger coin deduction flow
      if (poolHealth.totalKeys === 0) {
        if (isGuest) {
          toast.error("Bhai, Guest mode mein coins scan ke liye login zaroori hai ya apni API key add karein.");
          setIsScanning(false);
          return;
        }
        
        setPendingScanParams({ url, platformId });
        setIsCoinModalOpen(true);
        setIsScanning(false);
        return;
      }

      startScanProcess(url, platformId, false, fetchedMetadata);
    } catch (error) {
      console.error('Initial metadata fetch failed:', error);
      toast.error('Video details nahi mil saken. URL check karein.');
      setIsScanning(false);
    }
  };

  const startScanProcess = async (url: string, platformId: string, useSystemKeys: boolean = false, preFetchedMetadata?: VideoMetadata) => {
    setIsScanning(true);
    setAuditReport(null);
    try {
      // Use provided platformId instead of state for consistency
      const platform: PlatformId = platformId as PlatformId;

      // Fix: Use pre-fetched metadata to avoid redundant API call due to async state update
      let fetchedMetadata = preFetchedMetadata || metadata;
      if (!fetchedMetadata) {
        console.log('📡 Fetching metadata for:', url, platform);
        fetchedMetadata = await fetchMetadataWithFailover(url, platform);
        console.log('📡 Metadata fetch result:', fetchedMetadata);
        
        if (!fetchedMetadata || !fetchedMetadata.title) {
          console.error('❌ Metadata fetch returned null/empty');
          throw new Error("Metadata fetch failed - no data returned");
        }
        setMetadata(fetchedMetadata);
      }

      const videoId = url.split('/').filter(Boolean).pop() || 'unknown';
      const safeTags = Array.isArray(fetchedMetadata.tags) ? fetchedMetadata.tags : [];

      // Save to Pending Vault immediately in case of interruption
      await vault.savePendingScan({
        videoId,
        platformId: platform,
        title: fetchedMetadata.title,
        description: fetchedMetadata.description,
        tags: safeTags,
        thumbnail: fetchedMetadata.thumbnail,
        videoUrl: url
      });

      
      // NEW STEP 4: Run Pre-Scan only (Stages 1 & 2)
      toast.info("Running Pre-Scan analysis...");
      
      try {
        const preScanData = await executePreScanOnly({
          videoId,
          platformId: platform,
          title: fetchedMetadata.title,
          tags: safeTags,
          thumbnail: fetchedMetadata.thumbnail,
          description: fetchedMetadata.description,
          durationSeconds: fetchedMetadata.durationSeconds,
          videoUrl: url,
        });
        
        console.log('✅ Pre-scan completed:', preScanData);
        
        // Store pending input for modal callbacks
        const scanInput = {
          videoId,
          platformId: platform,
          title: fetchedMetadata.title,
          tags: safeTags,
          description: fetchedMetadata.description,
          durationSeconds: fetchedMetadata.durationSeconds,
          videoUrl: url,
          useSystemKeys: useSystemKeys
        };
        setPendingScanInput(scanInput);
        
        // Calculate scan cost
        const poolHealth = checkPoolHealth();
        const hasUserAPIKey = poolHealth.totalKeys > 0;
        const scanCost = calculateScanCost(fetchedMetadata.durationSeconds || 0);
        
        // Show pre-scan consent modal
        setPreScanResult({
          riskScore: preScanData.riskScore,
          verdict: getFinalVerdict(preScanData.riskScore, platform),
          issues: preScanData.issues || [],
          requiresDeepScan: preScanData.requiresDeepScan,
          pendingInput: scanInput,
          patternResult: null,
          videoDuration: fetchedMetadata.durationSeconds,
          scanCost: hasUserAPIKey ? 0 : scanCost, // FREE if user has API key
          hasUserAPIKey,
        });
        setShowPreScanModal(true);
        setIsScanning(false); // Stop scanning indicator, waiting for user choice
        
      } catch (error) {
        console.error('Pre-scan failed:', error);
        toast.error('Pre-scan failed. Please try again.');
        setIsScanning(false);
      }
      
    } catch (error) {
      console.error('Initial metadata fetch failed:', error);
      toast.error('Video details nahi mil saken. URL check karein.');
      setIsScanning(false);
    }
  };

  // Handle confirmed coin scan
  const handleConfirmCoinScan = async () => {
    if (!pendingScanParams || !user) return;
    
    setIsCoinModalOpen(false);
    setIsScanning(true);

    try {
      // Use CoinContext to deduct coins (safe with canAfford check)
      const deducted = await spendCoins(currentScanCost, "scan_deep", `Video scan - ${metadata?.title || "Unknown"}`);
      
      if (!deducted) {
        toast.error(`Insufficient coins! You need ${currentScanCost} coins.`);
        setIsScanning(false);
        return;
      }

      // Show professional success animation
      setShowCoinSuccess(true);
      
      // Wait for animation to finish before starting scan
      setTimeout(() => {
        setShowCoinSuccess(false);
        startScanProcess(pendingScanParams.url, pendingScanParams.platformId, true, metadata || undefined);
      }, 2500);
      
    } catch (err) {
      toast.error("Transaction mein masla aya. Dobara koshish karein.");
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
      
      // Use default config (audit configs removed)
      toast.success(`Proceeding to Deep Scan...`);
      
      // Execute full hybrid scan with default settings
      const result: DeepScanResult = await executeHybridScan(
        pendingScanInput,
        undefined, // No custom engine type
        undefined, // No custom system prompt
        pendingScanInput.useSystemKeys // Use the coin-scan mode if applicable
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
      
      // Save to audit history (database or local storage)
      await saveAuditReport({
        video_url: pendingScanInput.videoUrl,
        video_title: pendingScanInput.title,
        thumbnail_url: pendingScanInput.thumbnail,
        platform: pendingScanInput.platformId,
        overall_risk: result.riskScore,
        result_json: result,
      }, isGuest, user?.id);
      
      // Clear pending scan as it's finished
      await vault.clearPendingScan(pendingScanInput.videoId);
      
      // Record scan for rate limiting (if using admin API)
      const poolHealth = checkPoolHealth();
      const hasUserApiKey = poolHealth.totalKeys > 0;
      
      if (!hasUserApiKey && user?.id) {
        recordScan(user?.id);
        console.log('Scan recorded for rate limiting');
      }
      
      // Trigger audit section refresh
      setAuditRefreshTrigger(prev => prev + 1);
      
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
      setPendingScanInput(null);
    }
  };

  // Handle user choosing to skip deep scan
  const handleSkipDeepScan = async () => {
    setShowPreScanModal(false);
    
    if (!preScanResult) return;
    
    try {
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
      
      // Save to permanent history even if deep scan is skipped
      await saveAuditReport({
        video_url: preScanResult.pendingInput.videoUrl,
        video_title: preScanResult.pendingInput.title,
        thumbnail_url: preScanResult.pendingInput.thumbnail,
        platform: preScanResult.pendingInput.platformId,
        overall_risk: preScanResult.riskScore,
        result_json: { ...preScanResult, isMetadataOnly: true },
      }, isGuest, user?.id);

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
      
      // Refresh My Audits section
      setAuditRefreshTrigger(prev => prev + 1);

      toast.success("Pre-Scan Complete! (Deep scan skipped)");
    } catch (error) {
      console.error("Failed to save skipped scan:", error);
      toast.error("Scan results save nahi ho sakay.");
    } finally {
      setPendingScanInput(null);
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
              {/* Platform Selector */}
              <div className="container mx-auto px-6 pt-6 pb-2">
                <PlatformSelector selectedPlatform={selectedPlatform} onSelect={setSelectedPlatform} />
              </div>
              
              <HeroScan 
                onScan={handleScan} 
                isScanning={isScanning}
                selectedPlatform={selectedPlatform}
                onPlatformChange={setSelectedPlatform}
              />
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

            <div className="neon-line my-4" />

            {/* My Audits Section */}
            <MyAuditsSection refreshTrigger={auditRefreshTrigger} />

            <footer className="container mx-auto px-6 py-12 text-center text-sm text-muted-foreground space-y-2">
              <p className="text-gradient font-semibold text-lg">TubeClear</p>
              <p>AI-Powered YouTube Monetization Shield • Built for US/UK Creators</p>
              <p>© latest TubeClear. All rights reserved.</p>
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

      {/* Coin Deduction Modal */}
      <CoinDeductionModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        onConfirm={handleConfirmCoinScan}
        onAddKey={() => navigate("/settings")}
        coinCost={currentScanCost}
        userBalance={balance}
      />

      {/* Success Overlay */}
      <CoinSuccessAnimation isVisible={showCoinSuccess} />
    </SidebarProvider>
  );
};

export default Index;

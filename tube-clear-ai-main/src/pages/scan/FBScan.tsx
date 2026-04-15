import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import HeroScan from "@/components/HeroScan";
import UniversalAuditReport from "@/components/UniversalAuditReport";
import ScanSkeleton from "@/components/ScanSkeleton";
import PreScanConsentModal from "@/components/PreScanConsentModal";
import { CoinDeductionModal } from "@/utils/CoinDeductionModal";
import CoinSuccessAnimation from "@/components/CoinSuccessAnimation";
import { saveAuditReport } from "@/utils/auditStorage";
import { calculateScanCost } from "@/config/pricingConfig";
import { useHybridScanner, type FullReport, type DeepScanResult } from "@/contexts/HybridScannerContext";
import { useMetadataFetcher, type VideoMetadata } from "@/contexts/MetadataFetcherContext";
import { useCoins } from "@/contexts/CoinContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAIWithRotation } from "@/utils/apiRotationWrapper";
import { vault } from "@/utils/historicalVault";
import { getFinalVerdict, type FinalVerdict } from "@/contexts/VideoScanContext";
import { toast } from "sonner";
import type { PlatformId } from "@/contexts/PlatformContext";

const FBScan = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { balance, spendCoins } = useCoins();
  const { fetchMetadataWithFailover } = useMetadataFetcher();
  const { executeHybridScan, executePreScanOnly, generateWhyAnalysis } = useHybridScanner();
  const { checkPoolHealth } = useAIWithRotation();
  
  const [activeSection, setActiveSection] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [auditReport, setAuditReport] = useState<FullReport | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [pendingScanInput, setPendingScanInput] = useState<any>(null);
  
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

  const handleNavigate = (section: string) => {
    if (section === "dashboard") { navigate("/dashboard"); return; }
    if (section === "history") { navigate("/history"); return; }
    if (section === "settings") { navigate("/settings"); return; }
    if (section === "scan") { navigate("/"); return; }
    setActiveSection(section);
  };

  // Check for pending scans on mount
  useEffect(() => {
    const checkPendingScans = async () => {
      const pending = await vault.getPendingScans();
      if (pending && pending.length > 0) {
        const latest = pending[0];
        if (latest.platformId === 'facebook') {
          toast.info(`Interrupted scan found: ${latest.title}`, {
            action: {
              label: "Resume",
              onClick: () => handleScan(latest.videoUrl, latest.platformId)
            }
          });
        }
      }
    };
    checkPendingScans();
  }, []);

  const handleScan = async (url: string, platformId: string) => {
    // Guest mode mein pehle login bolo
    if (isGuest) {
      toast.error("Please login karein! Guest mode mein scan ke liye login zaroori hai.", {
        description: "Login karne ke baad aap API key add karke coins buy kar sakte hain."
      });
      return;
    }

    setIsScanning(true);
    try {
      const platform: PlatformId = platformId as PlatformId;
      const fetchedMetadata = await fetchMetadataWithFailover(url, platform);
      
      if (!fetchedMetadata || !fetchedMetadata.title) {
        throw new Error("Metadata fetch failed");
      }
      
      setMetadata(fetchedMetadata);
      
      const pricing = calculateScanCost(fetchedMetadata.durationSeconds || 0);
      setCurrentScanCost(pricing);

      const poolHealth = checkPoolHealth();
      if (poolHealth.totalKeys === 0) {
        if (isGuest) {
          toast.error("Guest mode mein coins scan ke liye login zaroori hai ya apni API key add karein.");
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
      const platform: PlatformId = platformId as PlatformId;
      let fetchedMetadata = preFetchedMetadata || metadata;
      
      if (!fetchedMetadata) {
        fetchedMetadata = await fetchMetadataWithFailover(url, platform);
        if (!fetchedMetadata || !fetchedMetadata.title) {
          throw new Error("Metadata fetch failed");
        }
        setMetadata(fetchedMetadata);
      }

      const videoId = url.split('/').filter(Boolean).pop() || 'unknown';
      const safeTags = Array.isArray(fetchedMetadata.tags) ? fetchedMetadata.tags : [];

      await vault.savePendingScan({
        videoId,
        platformId: platform,
        title: fetchedMetadata.title,
        description: fetchedMetadata.description,
        tags: safeTags,
        thumbnail: fetchedMetadata.thumbnail,
        videoUrl: url
      });

      toast.info("📘 Facebook Policy Engine: Running Pre-Scan analysis...");
      
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
        
        const poolHealth = checkPoolHealth();
        const hasUserAPIKey = poolHealth.totalKeys > 0;
        const scanCost = calculateScanCost(fetchedMetadata.durationSeconds || 0);
        
        setPreScanResult({
          riskScore: preScanData.riskScore,
          verdict: getFinalVerdict(preScanData.riskScore, platform),
          issues: preScanData.issues || [],
          requiresDeepScan: preScanData.requiresDeepScan,
          pendingInput: scanInput,
          patternResult: null,
          videoDuration: fetchedMetadata.durationSeconds,
          scanCost: hasUserAPIKey ? 0 : scanCost,
          hasUserAPIKey,
        });
        setShowPreScanModal(true);
        setIsScanning(false);
        
      } catch (error) {
        console.error('Pre-scan failed:', error);
        toast.error('Pre-scan failed. Please try again.');
        setIsScanning(false);
      }
      
    } catch (error) {
      console.error('Scan process failed:', error);
      toast.error('Video details nahi mil saken. URL check karein.');
      setIsScanning(false);
    }
  };

  const handleConfirmCoinScan = async () => {
    if (!pendingScanParams || !user) return;
    
    setIsCoinModalOpen(false);
    setIsScanning(true);

    try {
      const deducted = await spendCoins(currentScanCost, "scan_deep", `Facebook scan - ${metadata?.title || "Unknown"}`);
      
      if (!deducted) {
        toast.error(`Insufficient coins! You need ${currentScanCost} coins.`);
        setIsScanning(false);
        return;
      }

      setShowCoinSuccess(true);
      
      setTimeout(() => {
        setShowCoinSuccess(false);
        startScanProcess(pendingScanParams.url, pendingScanParams.platformId, true, metadata || undefined);
      }, 2500);
      
    } catch (err) {
      toast.error("Transaction mein masla aya. Dobara koshish karein.");
      setIsScanning(false);
    }
  };

  const handleProceedToDeepScan = async () => {
    setShowPreScanModal(false);
    setIsScanning(true);
    
    try {
      if (!pendingScanInput) {
        toast.error("Scan data lost. Please try again.");
        return;
      }
      
      toast.success(`📘 Facebook Policy Engine: Proceeding to Deep Scan...`);
      
      const result: DeepScanResult = await executeHybridScan(
        pendingScanInput,
        undefined,
        undefined,
        pendingScanInput.useSystemKeys
      );
      
      const whyAnalysis = generateWhyAnalysis(result, {
        title: pendingScanInput.title,
        description: pendingScanInput.description,
        tags: pendingScanInput.tags,
        extractedAt: new Date().toISOString()
      }, pendingScanInput.platformId);
      
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
      
      await saveAuditReport({
        video_url: pendingScanInput.videoUrl,
        video_title: pendingScanInput.title,
        thumbnail_url: pendingScanInput.thumbnail,
        platform: pendingScanInput.platformId,
        overall_risk: result.riskScore,
        result_json: result,
      }, isGuest, user?.id);
      
      await vault.clearPendingScan(pendingScanInput.videoId);
      
      toast.success("✅ Facebook Deep Scan Complete!");
      
    } catch (error) {
      console.error('Deep scan failed:', error);
      toast.error('Deep scan failed. Please try again.');
    } finally {
      setIsScanning(false);
      setPendingScanInput(null);
    }
  };

  const handleSkipDeepScan = async () => {
    setShowPreScanModal(false);
    
    if (!preScanResult) return;
    
    try {
      const lightweightReport: FullReport = {
        videoUrl: preScanResult.pendingInput.videoUrl,
        verifiedTimestamp: new Date().toISOString(),
        platform: preScanResult.pendingInput.platformId,
        overallRisk: preScanResult.riskScore,
        aiDetected: false,
        disclosureVerified: preScanResult.riskScore < 20,
        whyAnalysis: {
          riskReason: `Facebook Pre-scan detected ${preScanResult.issues.length} issue(s) in metadata.`,
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
      
      await saveAuditReport({
        video_url: preScanResult.pendingInput.videoUrl,
        video_title: preScanResult.pendingInput.title,
        thumbnail_url: preScanResult.pendingInput.thumbnail,
        platform: preScanResult.pendingInput.platformId,
        overall_risk: preScanResult.riskScore,
        result_json: { ...preScanResult, isMetadataOnly: true },
      }, isGuest, user?.id);

      toast.success("✅ Facebook Pre-Scan Complete! (Deep scan skipped)");
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
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center justify-between px-4 border-b border-border/30">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">Facebook Scanner</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">Facebook Audit Scanner</h1>
                  <p className="text-muted-foreground">Check video safety & monetization policies</p>
                </div>
              </div>

              <HeroScan 
                onScan={handleScan} 
                isScanning={isScanning}
                selectedPlatform="facebook"
                onPlatformChange={() => {}}
              />
              
              {isScanning && <ScanSkeleton />}
              
              {auditReport && metadata && (
                <UniversalAuditReport
                  key={`report-${auditReport.verifiedTimestamp}`}
                  report={auditReport}
                  metadata={metadata}
                  platform="facebook"
                  videoUrl={auditReport.videoUrl}
                  isGuest={isGuest}
                  onCopy={() => {
                    navigator.clipboard.writeText(JSON.stringify(auditReport, null, 2));
                    toast.success("Report copied!");
                  }}
                  onShare={() => {
                    navigator.clipboard.writeText(auditReport.videoUrl);
                    toast.success("Link copied!");
                  }}
                  onRunDeepScan={() => toast.info("Running deep scan...")}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      <PreScanConsentModal
        isOpen={showPreScanModal}
        onClose={() => setShowPreScanModal(false)}
        onProceedToDeepScan={handleProceedToDeepScan}
        onSkipDeepScan={handleSkipDeepScan}
        preScanResult={preScanResult}
      />

      <CoinDeductionModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        onConfirm={handleConfirmCoinScan}
        onAddKey={() => navigate("/settings")}
        onBuyCoins={() => {
          toast.info("Coins purchase page jald aa rahi hai! Filhal apni API key add karein.", {
            description: "Payment integration coming soon!"
          });
        }}
        coinCost={currentScanCost}
        userBalance={balance}
      />

      <CoinSuccessAnimation isVisible={showCoinSuccess} />
    </SidebarProvider>
  );
};

export default FBScan;

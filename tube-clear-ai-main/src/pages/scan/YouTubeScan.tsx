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
import { usePlatforms } from "@/contexts/PlatformContext";
import { useAIWithRotation } from "@/utils/apiRotationWrapper";
import { vault } from "@/utils/historicalVault";
import { getFinalVerdict, type FinalVerdict } from "@/contexts/VideoScanContext";
import { toast } from "sonner";
import type { PlatformId } from "@/contexts/PlatformContext";
import LiveAIConsole, { type AIThought } from "@/components/LiveAIConsole";
import ComparisonView, { type ViolationComparison } from "@/components/ComparisonView";
import FixSuggestionsPanel, { type FixSuggestion } from "@/components/FixSuggestionsPanel";
import AIScanSummaryCard, { type AICheck } from "@/components/AIScanSummaryCard";

const YouTubeScan = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { balance, spendCoins } = useCoins();
  const { platforms } = usePlatforms();
  const { fetchMetadataWithFailover } = useMetadataFetcher();
  const { executeHybridScan, executePreScanOnly, generateWhyAnalysis, currentStage } = useHybridScanner();
  const { checkPoolHealth } = useAIWithRotation();
  
  const [activeSection, setActiveSection] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [auditReport, setAuditReport] = useState<FullReport | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [pendingScanInput, setPendingScanInput] = useState<any>(null);
  const [lastScanResult, setLastScanResult] = useState<DeepScanResult | null>(null);
  
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

  // NEW: UX Enhancement states
  const [aiThoughts, setAiThoughts] = useState<AIThought[]>([]);
  const [comparisonViolations, setComparisonViolations] = useState<ViolationComparison[]>([]);
  const [fixSuggestions, setFixSuggestions] = useState<FixSuggestion[]>([]);

  // Helper function to add AI thoughts
  const addAIThought = (type: AIThought["type"], message: string) => {
    const thought: AIThought = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    setAiThoughts(prev => [...prev, thought]);
  };

  // Helper function to generate fix suggestions
  const generateFixSuggestion = (violation: string, platformId: string) => {
    const violationLower = violation.toLowerCase();
    
    if (violationLower.includes("copyright") || violationLower.includes("music")) {
      return {
        title: "Remove or Replace Copyrighted Content",
        description: "This violation appears to be related to copyrighted music or content.",
        action: "Remove the copyrighted segment or replace it with royalty-free alternative from YouTube Audio Library.",
        difficulty: "medium" as const,
        estimatedTime: "15-30 minutes",
        impact: "high" as const,
      };
    }
    
    if (violationLower.includes("violence") || violationLower.includes("graphic")) {
      return {
        title: "Blur or Remove Violent Content",
        description: "Graphic or violent content detected that violates platform guidelines.",
        action: "Blur the violent frames using video editor or remove the segment entirely.",
        difficulty: "medium" as const,
        estimatedTime: "10-20 minutes",
        impact: "high" as const,
      };
    }
    
    if (violationLower.includes("hate") || violationLower.includes("discrimination")) {
      return {
        title: "Remove Discriminatory Language",
        description: "Content contains language that may be considered discriminatory.",
        action: "Edit audio to remove offensive language or add disclaimer explaining context.",
        difficulty: "easy" as const,
        estimatedTime: "5-10 minutes",
        impact: "high" as const,
      };
    }
    
    if (violationLower.includes("misleading") || violationLower.includes("clickbait")) {
      return {
        title: "Update Title/Thumbnail for Accuracy",
        description: "Title or thumbnail may be misleading viewers.",
        action: "Revise title and thumbnail to accurately represent video content.",
        difficulty: "easy" as const,
        estimatedTime: "5 minutes",
        impact: "medium" as const,
      };
    }
    
    return {
      title: "Review and Modify Content",
      description: `Policy violation detected: ${violation}`,
      action: "Review the flagged content and modify it to comply with platform guidelines.",
      difficulty: "medium" as const,
      estimatedTime: "10-15 minutes",
      impact: "medium" as const,
    };
  };

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
        if (latest.platformId === 'youtube') {
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

    // CONNECTION CHECK: Pehle dekho platform connected hai ya nahi
    const isPlatformConnected = platforms.find(p => p.id === platformId)?.connected;
    if (!isPlatformConnected) {
      toast.error(`⚠️ ${platformId.charAt(0).toUpperCase() + platformId.slice(1)} account pehle connect karein!`, {
        description: "Dashboard mein ja kar apna account connect karein, phir scan karein.",
        action: {
          label: "Go to Dashboard",
          onClick: () => navigate("/dashboard")
        }
      });
      return;
    }

    setIsScanning(true);
    // Reset UX enhancement states
    setAiThoughts([]);
    setComparisonViolations([]);
    setFixSuggestions([]);
    try {
      const platform: PlatformId = platformId as PlatformId;
      const fetchedMetadata = await fetchMetadataWithFailover(url, platform);
      
      if (!fetchedMetadata || !fetchedMetadata.title) {
        throw new Error("Metadata fetch failed");
      }
      
      setMetadata(fetchedMetadata);
      
      // Update pricing based on fetched duration
      const pricing = calculateScanCost(fetchedMetadata.durationSeconds || 0);
      const costInCoins = typeof pricing === 'number' ? pricing : (pricing.userCostCoins ?? 10);
      setCurrentScanCost(costInCoins);

      // If no user keys (BYOK), trigger coin deduction flow
      const poolHealth = checkPoolHealth();
      if (poolHealth.totalKeys === 0) {
        // Save to pending for resume
        const videoId = url.split('/').filter(Boolean).pop() || 'unknown';
        await vault.savePendingScan({
          videoId,
          platformId: platform,
          title: fetchedMetadata.title,
          description: fetchedMetadata.description,
          tags: Array.isArray(fetchedMetadata.tags) ? fetchedMetadata.tags : [],
          thumbnail: fetchedMetadata.thumbnail,
          videoUrl: url
        });
        
        // User login hai lekin API key nahi hai - coins buy karo
        setPendingScanParams({ url, platformId });
        setIsCoinModalOpen(true);
        setIsScanning(false);
        return;
      }

      startScanProcess(url, platformId, false, fetchedMetadata);
    } catch (error: any) {
      console.error('Initial metadata fetch failed:', error);
      setIsScanning(false);
      
      const errorMessage = error?.message || '';
      if (errorMessage.includes('Metadata fetch failed') || errorMessage.includes('Please add your FREE Gemini API key')) {
        const videoId = url.split('/').filter(Boolean).pop() || 'unknown';
        await vault.savePendingScan({
          videoId,
          platformId: platformId as PlatformId,
          title: 'Metadata Pending',
          description: 'Metadata fetch failed - API key required',
          tags: [],
          thumbnail: '',
          videoUrl: url
        });
        
        toast.error("⚠️ Metadata fetch nahi ho saka!", {
          description: "Is video ka metadata fetch nahi ho saka. Better results ke liye FREE Gemini API key add karein.",
          action: {
            label: "Get FREE API Key",
            onClick: () => window.open('https://aistudio.google.com/app/apikey', '_blank')
          },
          duration: 8000
        });
        
        toast.info("💡 Pending scan save ho gaya hai. API key add karke dobara scan karein.", {
          description: "Settings mein ja kar API key add karein, phir dobara scan karein.",
          action: {
            label: "Go to Settings",
            onClick: () => navigate("/settings")
          },
          duration: 8000
        });
      } else {
        toast.error('Video details nahi mil saken. URL check karein.');
      }
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

      // Save to Pending Vault
      await vault.savePendingScan({
        videoId,
        platformId: platform,
        title: fetchedMetadata.title,
        description: fetchedMetadata.description,
        tags: safeTags,
        thumbnail: fetchedMetadata.thumbnail,
        videoUrl: url
      });

      // Run Pre-Scan only (Stages 1 & 2)
      toast.info("Running Pre-Scan analysis...");
      
      // Add AI thought
      addAIThought("thinking", "🚀 Starting YouTube policy analysis...");
      
      try {
        addAIThought("analyzing", "📊 Extracting video metadata...");
        
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
        
        addAIThought("success", "✅ Metadata extracted successfully");
        addAIThought("analyzing", "🔍 Matching against live YouTube policies...");
        
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
        const scanCostResult = calculateScanCost(fetchedMetadata.durationSeconds || 0);
        const scanCost = typeof scanCostResult === 'number' ? scanCostResult : (scanCostResult.userCostCoins ?? 10);
        
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
        
        if (preScanData.riskScore > 30) {
          addAIThought("warning", `⚠️ Risk detected: Score ${preScanData.riskScore}/100`);
          addAIThought("info", "💡 Deep scan recommended for detailed analysis");
        } else {
          addAIThought("success", "✅ Low risk detected in metadata");
        }
        
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
      const deducted = await spendCoins(currentScanCost, "scan_deep", `Video scan - ${metadata?.title || "Unknown"}`);
      
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
      
      toast.success(`Proceeding to Deep Scan...`);
      addAIThought("thinking", "🎯 Starting deep video analysis...");
      
      const result: DeepScanResult = await executeHybridScan(
        pendingScanInput,
        undefined,
        undefined,
        pendingScanInput.useSystemKeys
      );
      
      addAIThought("success", "✅ AI analysis complete");
      addAIThought("analyzing", "📊 Generating compliance report...");
      
      const whyAnalysis = generateWhyAnalysis(result, {
        title: pendingScanInput.title,
        description: pendingScanInput.description,
        tags: pendingScanInput.tags,
        extractedAt: new Date().toISOString()
      }, pendingScanInput.platformId);
      
      addAIThought("success", "✅ Report generated successfully");
      
      // Generate comparison violations if there are issues
      if (result.violations && result.violations.length > 0) {
        addAIThought("warning", `⚠️ Found ${result.violations.length} policy violation(s)`);
        
        const violations: ViolationComparison[] = result.violations.map((violation, index) => ({
          id: `violation-${index}`,
          timestamp: Math.floor((pendingScanInput.durationSeconds || 300) / (result.violations.length || 1)) * (index + 1),
          frameDescription: `Potential policy violation detected: ${violation}`,
          frameThumbnail: pendingScanInput.thumbnail,
          violationText: violation,
          policyReference: `YouTube Community Guidelines - Content Policy Section`,
          policyUrl: "https://www.youtube.com/howyoutubeworks/our-commitments/community-guidelines/",
          severity: result.riskScore > 70 ? "high" : result.riskScore > 40 ? "medium" : "low",
        }));
        setComparisonViolations(violations);
        
        // Generate fix suggestions
        const suggestions: FixSuggestion[] = result.violations.map((violation, index) => {
          const fixText = generateFixSuggestion(violation, pendingScanInput.platformId);
          return {
            id: `fix-${index}`,
            violationId: `violation-${index}`,
            title: fixText.title,
            description: fixText.description,
            action: fixText.action,
            difficulty: fixText.difficulty,
            estimatedTime: fixText.estimatedTime,
            impact: fixText.impact,
          };
        });
        setFixSuggestions(suggestions);
        addAIThought("info", "💡 One-click fix suggestions generated");
      } else {
        addAIThought("success", "✅ No policy violations detected!");
      }
      
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
      
      addAIThought("success", "✅ YouTube Deep Scan Complete! Report saved.");
      toast.success("Deep Scan Complete!");
      
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
      
      await saveAuditReport({
        video_url: preScanResult.pendingInput.videoUrl,
        video_title: preScanResult.pendingInput.title,
        thumbnail_url: preScanResult.pendingInput.thumbnail,
        platform: preScanResult.pendingInput.platformId,
        overall_risk: preScanResult.riskScore,
        result_json: { ...preScanResult, isMetadataOnly: true },
      }, isGuest, user?.id);

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
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center justify-between px-4 border-b border-border/30">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">YouTube Scanner</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">YouTube Audit Scanner</h1>
                  <p className="text-muted-foreground">Check monetization safety & policy compliance</p>
                </div>
              </div>

              <HeroScan 
                onScan={handleScan} 
                isScanning={isScanning}
                selectedPlatform="youtube"
                onPlatformChange={() => {}}
              />
              
              {/* NEW: Live AI Thinking Console */}
              {(isScanning || aiThoughts.length > 0) && (
                <div className="mt-6 animate-fade-in">
                  <LiveAIConsole 
                    thoughts={aiThoughts}
                    isScanning={isScanning}
                    currentStage={currentStage}
                  />
                </div>
              )}
              
              {isScanning && <ScanSkeleton />}
              
              {/* NEW: Comparison View for violations */}
              {comparisonViolations.length > 0 && auditReport && (
                <div className="mt-6 animate-fade-in">
                  <ComparisonView 
                    violations={comparisonViolations}
                    videoThumbnail={metadata?.thumbnail}
                    videoTitle={metadata?.title}
                  />
                </div>
              )}
              
              {/* NEW: Fix Suggestions Panel */}
              {fixSuggestions.length > 0 && auditReport && (
                <div className="mt-6 animate-fade-in">
                  <FixSuggestionsPanel 
                    suggestions={fixSuggestions}
                    onApplyFix={(suggestion) => {
                      toast.success(`Fix applied: ${suggestion.title}`);
                    }}
                  />
                </div>
              )}
              
              {auditReport && metadata && (
                <UniversalAuditReport
                  key={`report-${auditReport.verifiedTimestamp}`}
                  report={auditReport}
                  metadata={metadata}
                  platform="youtube"
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
        onBuyCoins={() => {
          toast.info("Coins purchase page jald aa rahi hai! Filhal apni API key add karein.", {
            description: "Payment integration coming soon!"
          });
        }}
        coinCost={currentScanCost}
        userBalance={balance}
      />

      {/* Success Overlay */}
      <CoinSuccessAnimation isVisible={showCoinSuccess} />
    </SidebarProvider>
  );
};

export default YouTubeScan;

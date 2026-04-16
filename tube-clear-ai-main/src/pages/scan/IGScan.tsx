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

const IGScan = () => {
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
  
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [pendingScanParams, setPendingScanParams] = useState<{url: string, platformId: string} | null>(null);
  const [currentScanCost, setCurrentScanCost] = useState(10);
  const [showCoinSuccess, setShowCoinSuccess] = useState(false);
  
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
    
    // Default suggestion
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

  useEffect(() => {
    const checkPendingScans = async () => {
      const pending = await vault.getPendingScans();
      if (pending && pending.length > 0) {
        const latest = pending[0];
        if (latest.platformId === 'instagram') {
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
      
      const pricing = calculateScanCost(fetchedMetadata.durationSeconds || 0);
      const costInCoins = typeof pricing === 'number' ? pricing : (pricing.userCostCoins ?? 10);
      setCurrentScanCost(costInCoins);

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
        
        if (isGuest) {
          toast.error("Guest mode mein coins scan ke liye login zaroori hai ya apni API key add karein.", {
            description: "Scan pending save ho gaya hai. Login karke continue karein."
          });
          setIsScanning(false);
          return;
        }
        
        setPendingScanParams({ url, platformId });
        setIsCoinModalOpen(true);
        setIsScanning(false);
        return;
      }

      startScanProcess(url, platformId, false, fetchedMetadata);
    } catch (error: any) {
      console.error('Initial metadata fetch failed:', error);
      setIsScanning(false);
      
      // Check if it's a metadata fetch failure
      const errorMessage = error?.message || '';
      if (errorMessage.includes('Metadata fetch failed') || errorMessage.includes('Please add your FREE Gemini API key')) {
        // Save failed scan to pending for later resume
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
        
        // Show clear error with API key guidance
        toast.error("⚠️ Metadata fetch nahi ho saka!", {
          description: "Is video ka metadata fetch nahi ho saka. Better results ke liye FREE Gemini API key add karein.",
          action: {
            label: "Get FREE API Key",
            onClick: () => {
              window.open('https://aistudio.google.com/app/apikey', '_blank');
            }
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

      await vault.savePendingScan({
        videoId,
        platformId: platform,
        title: fetchedMetadata.title,
        description: fetchedMetadata.description,
        tags: safeTags,
        thumbnail: fetchedMetadata.thumbnail,
        videoUrl: url
      });

      toast.info("📸 Instagram Policy Engine: Running Pre-Scan analysis...");
      
      // Add AI thought
      addAIThought("thinking", "🚀 Starting Instagram policy analysis...");
      
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
        addAIThought("analyzing", "🔍 Matching against live Instagram policies...");
        
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
      const deducted = await spendCoins(currentScanCost, "scan_deep", `Instagram scan - ${metadata?.title || "Unknown"}`);
      
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
      
      toast.success(`📸 Instagram Policy Engine: Proceeding to Deep Scan...`);
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
          policyReference: `Instagram Community Guidelines - Content Policy Section`,
          policyUrl: "https://help.instagram.com/477434105621119",
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
      
      addAIThought("success", "✅ Instagram Deep Scan Complete! Report saved.");
      toast.success("✅ Instagram Deep Scan Complete!");
      
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
          riskReason: `Instagram Pre-scan detected ${preScanResult.issues.length} issue(s) in metadata.`,
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

      toast.success("✅ Instagram Pre-Scan Complete! (Deep scan skipped)");
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
                <span className="text-xs text-muted-foreground">Instagram Scanner</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">Instagram Audit Scanner</h1>
                  <p className="text-muted-foreground">Check Reels & video compliance</p>
                </div>
              </div>

              <HeroScan 
                onScan={handleScan} 
                isScanning={isScanning}
                selectedPlatform="instagram"
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
                  platform="instagram"
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

export default IGScan;

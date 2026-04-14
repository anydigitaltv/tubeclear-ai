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
  const { fetchMetadataWithFailover } = useMetadataFetcher();
  const { executeHybridScan, generateWhyAnalysis } = useHybridScanner();
  
  const [activeSection, setActiveSection] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [auditReport, setAuditReport] = useState<FullReport | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const handleNavigate = (section: string) => {
    if (section === "dashboard") { navigate("/dashboard"); return; }
    if (section === "history") { navigate("/history"); return; }
    if (section === "settings") { navigate("/settings"); return; }
    setActiveSection(section);
  };

  const handleScan = async (url: string, platformId: string) => {
    setIsScanning(true);
    try {
      const platform: PlatformId = platformId as PlatformId;
      const fetchedMetadata = await fetchMetadataWithFailover(url, platform);
      
      if (!fetchedMetadata || !fetchedMetadata.title) {
        throw new Error("Metadata fetch failed");
      }
      
      setMetadata(fetchedMetadata);
      
      const videoId = url.split('/').filter(Boolean).pop() || 'unknown';
      const safeTags = Array.isArray(fetchedMetadata.tags) ? fetchedMetadata.tags : [];

      toast.info("📘 Facebook Policy Engine: Scanning for compliance...");
      
      const result = await executeHybridScan({
        videoId,
        platformId: platform,
        title: fetchedMetadata.title,
        tags: safeTags,
        thumbnail: fetchedMetadata.thumbnail,
        description: fetchedMetadata.description,
        durationSeconds: fetchedMetadata.durationSeconds,
        videoUrl: url,
        useSystemKeys: false
      });
      
      const whyAnalysis = generateWhyAnalysis(result, {
        title: fetchedMetadata.title,
        description: fetchedMetadata.description,
        tags: safeTags,
        extractedAt: new Date().toISOString()
      }, platform);
      
      const report: FullReport = {
        videoUrl: url,
        verifiedTimestamp: new Date().toISOString(),
        platform: platform,
        overallRisk: result.riskScore,
        aiDetected: result.aiDetectionConfidence > 0.7,
        disclosureVerified: whyAnalysis.disclosureStatus === "verified",
        whyAnalysis,
        shareable: true
      };
      
      setAuditReport(report);
      toast.success("✅ Facebook Scan Complete!");
    } catch (error) {
      console.error('Facebook scan failed:', error);
      toast.error('Facebook scan failed. Please try again.');
    } finally {
      setIsScanning(false);
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
                  isGuest={true}
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
    </SidebarProvider>
  );
};

export default FBScan;

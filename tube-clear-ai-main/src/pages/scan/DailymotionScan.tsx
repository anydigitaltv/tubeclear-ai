import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import HeroScan from "@/components/HeroScan";
import UniversalAuditReport from "@/components/UniversalAuditReport";
import ScanSkeleton from "@/components/ScanSkeleton";
import { useHybridScanner, type FullReport } from "@/contexts/HybridScannerContext";
import { useMetadataFetcher, type VideoMetadata } from "@/contexts/MetadataFetcherContext";
import { toast } from "sonner";
import type { PlatformId } from "@/contexts/PlatformContext";

const DailymotionScan = () => {
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

      toast.info("🎬 Dailymotion Policy Engine: Analyzing video content...");
      
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
      toast.success("✅ Dailymotion Scan Complete!");
    } catch (error) {
      console.error('Dailymotion scan failed:', error);
      toast.error('Dailymotion scan failed. Please try again.');
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
                <span className="text-xs text-muted-foreground">Dailymotion Scanner</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-400/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.675 1.325c-2.309 1.596-3.505 4.358-3.236 7.247.023.248.058.494.105.738.024.126.052.251.082.376.045.187.096.372.154.554.066.208.142.412.228.612.065.151.137.299.215.443.103.19.216.374.339.551.076.109.157.215.242.318.147.178.304.347.47.506.076.073.155.143.236.21.181.15.372.288.571.413.093.058.188.113.285.164.203.107.413.201.63.281.105.039.212.074.321.104.219.061.443.109.67.142.108.016.217.028.327.035.231.016.463.016.694 0 .11-.007.219-.019.327-.035.227-.033.451-.081.67-.142.109-.03.216-.065.321-.104.217-.08.427-.174.63-.281.097-.051.192-.106.285-.164.199-.125.39-.263.571-.413.081-.067.16-.137.236-.21.166-.159.323-.328.47-.506.085-.103.166-.209.242-.318.123-.177.236-.361.339-.551.078-.144.15-.292.215-.443.086-.2.162-.404.228-.612.058-.182.109-.367.154-.554.03-.125.058-.25.082-.376.047-.244.082-.49.105-.738.269-2.889-.927-5.651-3.236-7.247C19.796.065 16.252-.065 13.675 1.325z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">Dailymotion Audit Scanner</h1>
                  <p className="text-muted-foreground">Check video safety & content guidelines</p>
                </div>
              </div>

              <HeroScan 
                onScan={handleScan} 
                isScanning={isScanning}
                selectedPlatform="dailymotion"
                onPlatformChange={() => {}}
              />
              
              {isScanning && <ScanSkeleton />}
              
              {auditReport && metadata && (
                <UniversalAuditReport
                  key={`report-${auditReport.verifiedTimestamp}`}
                  report={auditReport}
                  metadata={metadata}
                  platform="dailymotion"
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

export default DailymotionScan;

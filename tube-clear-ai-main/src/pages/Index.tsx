import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import HeroScan from "@/components/HeroScan";
import AuditDashboard, { type AuditResult } from "@/components/AuditDashboard";
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
import { generateMockAudit } from "@/lib/mockAudit";

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
  const [activeSection, setActiveSection] = useState("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
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

  const handleScan = (url: string) => {
    setIsScanning(true);
    setAuditResult(null);
    setTimeout(() => {
      const result = generateMockAudit(url);
      setAuditResult(result);
      setIsScanning(false);

      const newItem: ScanHistoryItem = {
        url,
        title: result.videoTitle,
        risk: result.overallRisk,
        date: new Date().toLocaleDateString(),
      };
      const updated = [newItem, ...scanHistory.filter((h) => h.url !== url)].slice(0, 20);
      setScanHistory(updated);
      saveHistory(updated);
    }, 2500);
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
              {auditResult && <AuditDashboard result={auditResult} />}
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

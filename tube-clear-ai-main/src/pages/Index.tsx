import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import RecentScans, { type ScanHistoryItem } from "@/components/RecentScans";
import MyAuditsSection from "@/components/MyAuditsSection";
import { Shield, Youtube, Music2, Facebook, Instagram, PlayCircle, ArrowRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { vault } from "@/utils/historicalVault";
import { toast } from "sonner";

const HISTORY_KEY = "tubeclear_scan_history";

const loadHistory = (): ScanHistoryItem[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const [activeSection, setActiveSection] = useState("scan");
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>(loadHistory);
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0);

  // Check for pending/interrupted scans on mount
  useEffect(() => {
    const checkPendingScans = async () => {
      const pending = await vault.getPendingScans();
      if (pending && pending.length > 0) {
        const latest = pending[0];
        toast.info(`Interrupted scan found: ${latest.title}`, {
          description: "Click to resume your scan",
          action: {
            label: "Resume",
            onClick: () => {
              navigate(`/scan/${latest.platformId}`);
            }
          }
        });
      }
    };
    checkPendingScans();
  }, [navigate]);

  const handleNavigate = (section: string) => {
    if (section === "dashboard") {
      navigate("/dashboard");
      return;
    }
    if (section === "pending-scans") {
      navigate("/pending-scans");
      return;
    }
    if (section === "violations") {
      navigate("/violations");
      return;
    }
    if (section === "my-videos") {
      navigate("/my-videos");
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
    if (section === "settings") {
      navigate("/settings");
      return;
    }
    if (section === "store") {
      navigate("/store");
      return;
    }
    if (section === "faq") {
      navigate("/faq");
      return;
    }
    if (section === "newsroom") {
      navigate("/newsroom");
      return;
    }
    if (section === "diff-engine") {
      navigate("/diff-engine");
      return;
    }
    if (section === "policy-monitor") {
      navigate("/policy-monitor");
      return;
    }
    if (section === "api-key-manager") {
      navigate("/api-key-manager");
      return;
    }
    setActiveSection(section);
  };

  const platforms = [
    { 
      id: 'youtube', 
      name: 'YouTube', 
      icon: Youtube, 
      color: 'text-red-500', 
      bgColor: 'bg-red-500/10', 
      borderColor: 'border-red-500/50',
      route: '/scan/youtube',
      description: 'Check monetization safety & policy compliance'
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      icon: Music2, 
      color: 'text-pink-500', 
      bgColor: 'bg-pink-500/10', 
      borderColor: 'border-pink-500/50',
      route: '/scan/tiktok',
      description: 'Scan for community guidelines violations'
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-600/10', 
      borderColor: 'border-blue-600/50',
      route: '/scan/facebook',
      description: 'Verify content policy adherence'
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: Instagram, 
      color: 'text-purple-500', 
      bgColor: 'bg-purple-500/10', 
      borderColor: 'border-purple-500/50',
      route: '/scan/instagram',
      description: 'Audit reels and posts for compliance'
    },
    { 
      id: 'dailymotion', 
      name: 'Dailymotion', 
      icon: PlayCircle, 
      color: 'text-blue-400', 
      bgColor: 'bg-blue-400/10', 
      borderColor: 'border-blue-400/50',
      route: '/scan/dailymotion',
      description: 'Check platform-specific policies'
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeSection={activeSection} onNavigate={handleNavigate} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center justify-between px-4 border-b border-border/30">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">AI Monetization Shield</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            {/* Hero Section */}
            <section className="container mx-auto px-6 py-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">AI-Powered Policy Analysis</span>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-bold mb-4">
                  <span className="text-gradient">Protect Your Content</span>
                  <br />
                  <span className="text-white">Before It's Too Late</span>
                </h1>
                
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                  Scan your videos across 5 platforms. Our AI team reviews policies, detects violations, 
                  and provides detailed recommendations to keep your content monetization-safe.
                </p>

                <Button
                  size="lg"
                  onClick={() => navigate("/scan/youtube")}
                  className="bg-primary hover:bg-primary/90 text-lg px-8"
                >
                  Start Scanning
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Card className="glass-card border border-border/20">
                  <CardContent className="pt-6">
                    <Shield className="w-12 h-12 text-primary mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Policy Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Our AI reviews your content against latest platform policies, just like a human team would.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border border-border/20">
                  <CardContent className="pt-6">
                    <Zap className="w-12 h-12 text-accent mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Smart Decisions</h3>
                    <p className="text-sm text-muted-foreground">
                      Get clear PASS/FLAGGED/FAIL verdicts with detailed reasoning for each decision.
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border border-border/20">
                  <CardContent className="pt-6">
                    <Sparkles className="w-12 h-12 text-purple-400 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Actionable Advice</h3>
                    <p className="text-sm text-muted-foreground">
                      Detailed reports showing exactly what's wrong and how to fix it before posting.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Selection */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  Select Your Platform
                </h2>
                <p className="text-muted-foreground text-center mb-8">
                  Choose a platform to start scanning your content
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {platforms.map((platform) => {
                    const Icon = platform.icon;
                    return (
                      <motion.button
                        key={platform.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(platform.route)}
                        className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${platform.bgColor} ${platform.borderColor}`}
                      >
                        <Icon className={`w-12 h-12 mb-3 ${platform.color}`} />
                        <span className={`text-sm font-semibold ${platform.color}`}>{platform.name}</span>
                        <span className="text-xs text-muted-foreground mt-2 text-center">
                          {platform.description}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Recent Scans */}
            {scanHistory.length > 0 && (
              <RecentScans history={scanHistory} onRescan={(url, platformId) => {
                navigate(`/scan/${platformId}`);
              }} />
            )}

            <div className="neon-line my-4" />

            {/* My Audits Section */}
            <MyAuditsSection refreshTrigger={auditRefreshTrigger} />

            {/* Footer */}
            <footer className="container mx-auto px-6 py-12 text-center text-sm text-muted-foreground space-y-2">
              <p className="text-gradient font-semibold text-lg">TubeClear AI</p>
              <p>AI-Powered Multi-Platform Content Auditor • Built for Creators</p>
              <p>© {new Date().getFullYear()} TubeClear. All rights reserved.</p>
            </footer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;

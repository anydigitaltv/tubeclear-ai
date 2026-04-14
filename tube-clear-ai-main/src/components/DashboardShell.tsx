import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Sparkles, Cpu, Youtube, Music2, Facebook, Instagram, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlatformCard from "@/components/PlatformCard";
import VideoDashboard from "@/components/VideoDashboard";
import TopBar from "@/components/TopBar";
import GlobalSafetyMeter, { TokenSavedCounter, VideosInVaultWidget } from "@/components/GlobalSafetyMeter";
import { InsightsWindow } from "@/components/InsightsWindow";
import { ViolationWarningsPanel } from "@/components/ViolationWarningsPanel";
import { useHistoricalVault } from "@/utils/historicalVault";
import { usePlatforms, type PlatformId } from "@/contexts/PlatformContext";

const DashboardShell = () => {
  const navigate = useNavigate();
  const { platforms, connectPlatform, disconnectPlatform, getConnectedCount, isLoading } = usePlatforms();
  const { stats, safetyMeter, isLoading: vaultLoading, refreshStats } = useHistoricalVault();
  const [activeFilter, setActiveFilter] = useState<PlatformId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

  const platformNavItems = [
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/50', route: '/scan/youtube' },
    { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'text-pink-500', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/50', route: '/scan/tiktok' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-600/10', borderColor: 'border-blue-600/50', route: '/scan/facebook' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/50', route: '/scan/instagram' },
    { id: 'dailymotion', name: 'Dailymotion', icon: PlayCircle, color: 'text-blue-400', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/50', route: '/scan/dailymotion' },
  ];

  // Show welcome notification on first load
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("tubeclear_welcome_shown");
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      localStorage.setItem("tubeclear_welcome_shown", "true");
    }
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
  };

  const filteredPlatforms = activeFilter
    ? platforms.filter(p => p.id === activeFilter)
    : platforms;

  const handlePlatformConnect = async (platformId: PlatformId, accountName: string) => {
    return await connectPlatform(platformId, accountName);
  };
  
  const handlePlatformDisconnect = async (platformId: PlatformId) => {
    return await disconnectPlatform(platformId);
  };

  return (
    <div className="min-h-screen">
      {/* Top Bar with Search and Platform Filters */}
      <TopBar
        onSearch={setSearchQuery}
        onPlatformFilter={setActiveFilter}
        activeFilter={activeFilter}
      />

      {/* Welcome Notification Banner */}
      {showWelcome && (
        <div className="container mx-auto px-4 pt-4">
          <div className="glass-card border border-accent/30 p-4 rounded-xl animate-pulse-glow relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-gradient flex items-center gap-2">
                    Welcome to TubeClear
                    <Sparkles className="h-4 w-4 text-accent" />
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your platforms to start scanning. All scans are completely free!
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissWelcome}
                className="shrink-0"
              >
                Got it!
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--neon-blue)/0.5)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Connect and manage your content platforms
              </p>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-4">
            <div className="glass-card px-4 py-2 rounded-lg">
              <span className="text-xs text-muted-foreground">Connected</span>
              <p className="text-lg font-bold text-primary">{getConnectedCount()} / 5</p>
            </div>
            <div className="glass-card px-4 py-2 rounded-lg">
              <span className="text-xs text-muted-foreground">Active Filter</span>
              <p className="text-lg font-bold text-foreground capitalize">
                {activeFilter || "All Platforms"}
              </p>
            </div>
          </div>
        </div>

        {/* NEW: 5 Platform Navigation Buttons */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gradient">Quick Scan - Select Platform</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {platformNavItems.map((platform) => {
              const Icon = platform.icon;
              return (
                <button
                  key={platform.id}
                  onClick={() => navigate(platform.route)}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${platform.bgColor} ${platform.borderColor}`}
                >
                  <Icon className={`w-12 h-12 mb-3 ${platform.color}`} />
                  <span className={`text-sm font-semibold ${platform.color}`}>{platform.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">Start Scan →</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* NEW: Safety Meter & Vault Stats Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Global Safety Meter - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <GlobalSafetyMeter />
          </div>
          
          {/* Right side widgets stack */}
          <div className="space-y-4">
            <TokenSavedCounter tokensSaved={stats.totalTokensSaved} />
            <VideosInVaultWidget
              totalVideos={stats.totalVideos}
              platformsConnected={stats.platformsConnected}
            />
            
            {/* Violation Warnings Panel */}
            <ViolationWarningsPanel />
          </div>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlatforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              onConnect={(accountName) => handlePlatformConnect(platform.id, accountName)}
              onDisconnect={() => handlePlatformDisconnect(platform.id)}
            />
          ))}
        </div>

        {/* Empty state */}
        {getConnectedCount() === 0 && (
          <div className="mt-8 text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Platforms Connected
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect your platforms to start scanning. All scans are completely free!
            </p>
          </div>
        )}

        {/* Video Dashboard - Only show when platforms connected */}
        {getConnectedCount() > 0 && (
          <div className="mt-8">
            <VideoDashboard />
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardShell;

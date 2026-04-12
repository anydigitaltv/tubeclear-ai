import { useState, useEffect } from "react";
import { Search, Youtube, Globe, Loader2, Key, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface HeroScanProps {
  onScan: (url: string, platformId: string) => void;
  isScanning: boolean;
  selectedPlatform?: string;
  onPlatformChange?: (platform: string) => void;
}

const HeroScan = ({ onScan, isScanning, selectedPlatform = "youtube", onPlatformChange }: HeroScanProps) => {
  const [url, setUrl] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedEngine, setSelectedEngine] = useState<"gemini" | "groq" | "grok">("gemini");
  const [scanStepIndex, setScanStepIndex] = useState(0);

  const scanSteps = [
    "📡 Fetching video metadata...",
    "🤖 Initiating AI Audit bot...",
    "⚖️ Comparing against latest policies...",
    "🎨 Analyzing visual frames...",
    "🎵 Scanning audio patterns...",
    "📊 Finalizing safety report..."
  ];

  useEffect(() => {
    if (!isScanning) {
      setScanStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setScanStepIndex((prev) => (prev + 1) % scanSteps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isScanning]);

  const platforms = [
    { id: "youtube", name: "YouTube", color: "text-red-500", bgColor: "hover:bg-red-500/10" },
    { id: "tiktok", name: "TikTok", color: "text-pink-500", bgColor: "hover:bg-pink-500/10" },
    { id: "facebook", name: "Facebook", color: "text-blue-600", bgColor: "hover:bg-blue-600/10" },
    { id: "instagram", name: "Instagram", color: "text-purple-500", bgColor: "hover:bg-purple-500/10" },
    { id: "dailymotion", name: "Dailymotion", color: "text-blue-400", bgColor: "hover:bg-blue-400/10" },
  ];

  const getDynamicHeading = () => {
    const platformNames: Record<string, string> = {
      youtube: "YouTube",
      tiktok: "TikTok",
      facebook: "Facebook",
      instagram: "Instagram",
      dailymotion: "Dailymotion",
    };
    return platformNames[selectedPlatform] || "YouTube";
  };

  const getSmartPlaceholder = () => {
    const placeholders: Record<string, string> = {
      youtube: "Paste YouTube Video URL...",
      tiktok: "Paste TikTok Video Link...",
      facebook: "Paste Facebook Video URL...",
      instagram: "Paste Instagram Reel/Video URL...",
      dailymotion: "Paste Dailymotion Video URL...",
    };
    return placeholders[selectedPlatform] || "Paste any supported video URL...";
  };

  const detectPlatform = (inputUrl: string): string => {
    if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) return 'youtube';
    if (inputUrl.includes('tiktok.com')) return 'tiktok';
    if (inputUrl.includes('instagram.com')) return 'instagram';
    if (inputUrl.includes('facebook.com') || inputUrl.includes('fb.watch')) return 'facebook';
    if (inputUrl.includes('dailymotion.com')) return 'dailymotion';
    return 'youtube'; // default
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      const platform = detectPlatform(url.trim());
      onScan(url.trim(), platform);
    }
  };

  const getPlatformIcon = (platform: string) => {
    // Use generic globe icon for all platforms since lucide doesn't have brand icons
    return <Globe className="h-4 w-4" />;
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            AI-Powered Monetization Shield • Multi-Platform
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
            Protect Your <span className="text-gradient">{getDynamicHeading()}</span> Revenue
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Scan videos from YouTube, TikTok, Instagram, Facebook & Dailymotion for policy violations.
          </p>

          {/* FREE Scan Badge */}
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.9, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="flex justify-center"
          >
            <Badge variant="outline" className="bg-blue-500/20 border-blue-400 text-blue-400 px-6 py-2.5 text-sm font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] gap-2">
              <Zap className="w-4 h-4 fill-current" />
              USE YOUR API KEY FOR FREE SCANS | OR USE COINS 🪙
            </Badge>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl mx-auto">
            {/* Success Message - Positive UX */}
            {!isScanning && (
              <div className="glass-card border border-green-500/30 bg-green-500/5 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-green-400 font-medium">Auditor System Ready</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6 text-left">
                  Apni API key use karein muft scan ke liye, ya hamari High-Speed Admin keys ke liye coins istemal karein.
                </p>
              </div>
            )}

            {/* Compact Platform Selector - Above URL Input */}
            <div className="glass-card border-border/30 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => onPlatformChange?.(platform.id)}
                    className={`flex-1 max-w-[100px] flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                      selectedPlatform === platform.id
                        ? `${platform.bgColor} border border-current ${platform.color}`
                        : "hover:bg-secondary/50 border border-transparent"
                    }`}
                  >
                    <div className={`text-lg ${selectedPlatform === platform.id ? platform.color : "text-muted-foreground"}`}>
                      {platform.id === "youtube" && "📺"}
                      {platform.id === "tiktok" && "🎵"}
                      {platform.id === "facebook" && "👥"}
                      {platform.id === "instagram" && "📸"}
                      {platform.id === "dailymotion" && "🎬"}
                    </div>
                    <span className={`text-xs font-medium ${
                      selectedPlatform === platform.id ? platform.color : "text-muted-foreground"
                    }`}>
                      {platform.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* URL Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder={getSmartPlaceholder()}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-12 h-14 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 text-base"
                />
              </div>
              <Button
                type="submit"
                variant="neon"
                size="lg"
                disabled={isScanning || !url.trim()}
                className="h-14 px-8 text-base"
              >
                {isScanning ? (
                  <Sparkles className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                {isScanning ? "Scanning..." : "Scan Now"}
              </Button>
            </div>

            {/* DYNAMIC SCANNING STATUS - The "Work Happening" indicator */}
            <AnimatePresence>
              {isScanning && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex flex-col items-center gap-3"
                >
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <motion.p 
                    key={scanStepIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium text-primary animate-pulse"
                  >
                    {scanSteps[scanStepIndex]}
                  </motion.p>
                  <div className="w-full bg-secondary/50 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-primary h-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 12, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* API Key Toggle */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-xs gap-1"
              >
                <Key className="h-3 w-3" />
                {showApiKeyInput ? "Hide" : "Use Your API Key"} (FREE)
              </Button>
            </div>

            {/* API Key Input (Conditional) */}
            {showApiKeyInput && (
              <div className="glass-card p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Key className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold">Enter Your API Key for FREE Scans</span>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedEngine}
                    onChange={(e) => setSelectedEngine(e.target.value as any)}
                    className="h-10 px-3 rounded-md bg-secondary/50 border border-border/50 text-sm"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq</option>
                    <option value="grok">Grok (xAI)</option>
                  </select>
                  <Input
                    type="password"
                    placeholder={`Enter your ${selectedEngine.toUpperCase()} API key...`}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 h-10 bg-secondary/50 border-border/50 text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  ✅ Your key is stored locally and NEVER sent to our servers. Using your own key makes scans 100% FREE!
                </p>
              </div>
            )}
          </form>

          <p className="text-xs text-muted-foreground">
            🎁 All Scans Are Completely Free - No Coins Required!
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroScan;

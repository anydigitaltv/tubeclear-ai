import { useState } from "react";
import { Search, Youtube, Globe, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HeroScanProps {
  onScan: (url: string, platformId: string) => void;
  isScanning: boolean;
}

const HeroScan = ({ onScan, isScanning }: HeroScanProps) => {
  const [url, setUrl] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedEngine, setSelectedEngine] = useState<"gemini" | "groq" | "grok">("gemini");

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
            Protect Your <span className="text-gradient">YouTube</span> Revenue
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Scan videos from YouTube, TikTok, Instagram, Facebook & Dailymotion for policy violations.
          </p>

          {/* FREE Scan Badge */}
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-400 px-4 py-2">
              🎁 ALL SCANS ARE FREE!
            </Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl mx-auto">
            {/* Platform Selection Indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {getPlatformIcon(detectPlatform(url || ''))}
              <span>Supports: YouTube • TikTok • Instagram • Facebook • Dailymotion</span>
            </div>

            {/* URL Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="Paste any supported video URL..."
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
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                {isScanning ? "Scanning..." : "Scan Now"}
              </Button>
            </div>

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

import { useState } from "react";
import { Search, Youtube, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeroScanProps {
  onScan: (url: string) => void;
  isScanning: boolean;
}

const HeroScan = ({ onScan, isScanning }: HeroScanProps) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onScan(url.trim());
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
            AI-Powered Monetization Shield
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
            Protect Your <span className="text-gradient">YouTube</span> Revenue
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Scan any video or channel for demonetization risks. AI auditing powered by 2026 YouTube Policies.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="Paste a YouTube video or channel URL..."
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
          </form>

          <p className="text-xs text-muted-foreground">
            No login required for basic scan • BYOK for deep analysis
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroScan;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Coins, Shield, AlertTriangle, CheckCircle, Globe, Zap } from "lucide-react";
import { useState, useEffect } from "react";

interface ScanSummaryCardProps {
  videoUrl: string;
  videoTitle: string;
  durationSeconds: number;
  platform: string;
  hasUserApiKey: boolean;
  userCoinBalance: number;
  onScanWithOwnKey: () => void;
  onScanWithAdminAPI: () => void;
  onCancel: () => void;
}

interface PricingTier {
  name: string;
  multiplier: number;
  baseCost: number;
  finalCost: number;
  isVPN: boolean;
}

const ScanSummaryCard = ({
  videoUrl,
  videoTitle,
  durationSeconds,
  platform,
  hasUserApiKey,
  userCoinBalance,
  onScanWithOwnKey,
  onScanWithAdminAPI,
  onCancel,
}: ScanSummaryCardProps) => {
  const [pricing, setPricing] = useState<PricingTier>({
    name: "Standard",
    multiplier: 1,
    baseCost: 0,
    finalCost: 0,
    isVPN: false,
  });

  useEffect(() => {
    // Calculate pricing based on duration
    const durationMinutes = Math.ceil(durationSeconds / 60);
    let baseCost = 0;

    if (durationMinutes < 5) {
      baseCost = 15;
    } else if (durationMinutes <= 15) {
      baseCost = 35;
    } else if (durationMinutes <= 30) {
      baseCost = 80;
    } else if (durationMinutes <= 60) {
      baseCost = 150;
    } else {
      // Over 60 minutes - blocked for admin API
      baseCost = 999;
    }

    // Detect VPN/Location (simplified - in production use IP geolocation API)
    const isVPN = detectVPNOrTier1Location();
    const multiplier = isVPN ? 2.5 : 1;
    const finalCost = Math.ceil(baseCost * multiplier);

    setPricing({
      name: isVPN ? "Tier 1 / VPN" : "Standard",
      multiplier,
      baseCost,
      finalCost,
      isVPN,
    });
  }, [durationSeconds]);

  // Simplified VPN/Tier 1 detection
  const detectVPNOrTier1Location = (): boolean => {
    // In production, use IP geolocation API
    // For now, check timezone offset (US/UK timezones are tier 1)
    const timezoneOffset = new Date().getTimezoneOffset();
    // US: -300 to -600, UK: 0
    return timezoneOffset >= -600 && timezoneOffset <= 0;
  };

  const durationMinutes = Math.ceil(durationSeconds / 60);
  const isOverLimit = durationMinutes > 60;
  const isCached = checkIfCachedToday(videoUrl);

  function checkIfCachedToday(url: string): boolean {
    const cacheKey = `tubeclear_cache_${url}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return false;

    const { timestamp } = JSON.parse(cached);
    const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);
    return hoursSince < 24;
  }

  const getPlatformName = (platform: string) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  return (
    <Card className="glass-card border-primary/30 shadow-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2 text-gradient">
          <Shield className="w-5 h-5" />
          Scan Summary / Scan Khulasa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Info */}
        <div className="p-3 rounded-lg bg-slate-800/50 space-y-2">
          <h3 className="font-semibold text-sm text-white line-clamp-2">{videoTitle}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {getPlatformName(platform)}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {durationMinutes} min
            </span>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            Pricing Details / Price Ki Tafseel
          </h4>

          {/* Pricing Tier */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-muted-foreground mb-1">Video Length</p>
              <p className="text-white font-semibold">{durationMinutes} minutes</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <p className="text-muted-foreground mb-1">Pricing Tier</p>
              <p className="text-white font-semibold flex items-center gap-1">
                {pricing.isVPN ? <Globe className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {pricing.name}
                {pricing.multiplier > 1 && (
                  <Badge variant="destructive" className="text-xs ml-1">
                    {pricing.multiplier}x
                  </Badge>
                )}
              </p>
            </div>
          </div>

          {/* Cost Display */}
          {hasUserApiKey ? (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-400 mb-1">Using Your API Key</p>
                  <p className="text-2xl font-bold text-green-400">0 Coins</p>
                  <p className="text-xs text-green-300 mt-1">FREE SCAN - Apki key use hogi</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
          ) : isOverLimit ? (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-400">Video Too Long</p>
                  <p className="text-xs text-red-300">
                    Admin API limit: 60 minutes max. Add your own API key for longer videos.
                  </p>
                </div>
              </div>
            </div>
          ) : isCached ? (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-400 mb-1">Cached (24hr)</p>
                  <p className="text-2xl font-bold text-blue-400">0 Coins</p>
                  <p className="text-xs text-blue-300 mt-1">Recently scanned - No charge!</p>
                </div>
                <Zap className="w-12 h-12 text-blue-500" />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-400 mb-1">Using Our API</p>
                  <p className="text-2xl font-bold text-yellow-400">{pricing.finalCost} Coins</p>
                  <p className="text-xs text-yellow-300 mt-1">
                    {pricing.baseCost} × {pricing.multiplier} multiplier
                  </p>
                </div>
                <Coins className="w-12 h-12 text-yellow-500" />
              </div>
            </div>
          )}
        </div>

        {/* Warnings */}
        {isOverLimit && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <p className="text-xs text-orange-300">
              ⚠️ Videos over 60 minutes require your own API key. 360p optimization will be applied.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {hasUserApiKey && (
            <Button
              onClick={onScanWithOwnKey}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              size="lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Use My API Key (FREE)
            </Button>
          )}

          {!isOverLimit && !isCached && (
            <Button
              onClick={onScanWithAdminAPI}
              disabled={!hasUserApiKey && userCoinBalance < pricing.finalCost}
              variant={hasUserApiKey ? "outline" : "default"}
              className="w-full"
              size="lg"
            >
              <Coins className="w-4 h-4 mr-2" />
              Use Our API ({pricing.finalCost} Coins)
            </Button>
          )}

          {isCached && (
            <Button
              onClick={onScanWithAdminAPI}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              size="lg"
            >
              <Zap className="w-4 h-4 mr-2" />
              Re-scan (Cached - Free)
            </Button>
          )}

          <Button onClick={onCancel} variant="ghost" className="w-full">
            Cancel
          </Button>
        </div>

        {/* Privacy Notice */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-slate-700/50">
          <p>🔒 Your API keys stay in your browser. We never store them.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScanSummaryCard;

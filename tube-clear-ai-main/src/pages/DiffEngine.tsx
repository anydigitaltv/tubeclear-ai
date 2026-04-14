import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Scan, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Database,
  TrendingDown
} from "lucide-react";
import { diffEngine, type CachedScanData } from "@/utils/IntelligentDiffEngine";
import { toast } from "sonner";

const IntelligentDiffEngineUI = () => {
  const [cachedScans, setCachedScans] = useState<CachedScanData[]>([]);
  const [stats, setStats] = useState({ totalCached: 0, cacheSize: "0 KB" });
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    loadCachedScans();
  }, []);

  const loadCachedScans = () => {
    const cacheStats = diffEngine.getCacheStats();
    setStats(cacheStats);
    
    // Load all cached scans from localStorage
    try {
      const stored = localStorage.getItem('tubeclear_scan_cache');
      if (stored) {
        const data = JSON.parse(stored);
        const scans = Object.values(data) as CachedScanData[];
        setCachedScans(scans.sort((a, b) => 
          new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
        ));
      }
    } catch (error) {
      console.error('Failed to load cached scans:', error);
    }
  };

  const handleTestDiff = (videoId: string) => {
    const cachedScan = diffEngine.getCachedScan(videoId);
    if (!cachedScan) {
      toast.error("No cached scan found for this video");
      return;
    }

    // Simulate metadata change
    const newMetadata = {
      title: cachedScan.title + " (Updated)",
      description: cachedScan.description,
      tags: cachedScan.tags,
      thumbnail: cachedScan.thumbnail,
      durationSeconds: cachedScan.durationSeconds,
    };

    const result = diffEngine.analyzeAndRecommend(videoId, newMetadata);
    
    toast.success(result.message.title, {
      description: result.message.messageUrdu,
    });

    console.log('🔍 Diff Result:', result);
  };

  const handleClearCache = (videoId: string) => {
    diffEngine.clearCache(videoId);
    toast.success("Cache cleared for this video");
    loadCachedScans();
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all cached scans?")) {
      diffEngine.clearAllCache();
      toast.success("All cache cleared");
      loadCachedScans();
    }
  };

  const getRecommendationBadge = (cachedScan: CachedScanData) => {
    // Simulate analysis
    const newMetadata = {
      title: cachedScan.title,
      description: cachedScan.description,
      tags: cachedScan.tags,
      thumbnail: cachedScan.thumbnail,
      durationSeconds: cachedScan.durationSeconds,
    };

    const result = diffEngine.analyzeAndRecommend(cachedScan.videoId, newMetadata);
    
    if (result.diff.recommendation === 'skip') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          No Rescan Needed
        </Badge>
      );
    }
    
    if (result.diff.recommendation === 'metadata_only') {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Zap className="w-3 h-3 mr-1" />
          Metadata Only ({result.diff.estimatedTokenSavings}% Saved)
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
        <RefreshCw className="w-3 h-3 mr-1" />
        Full Rescan Needed
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">
          Intelligent Diff Engine
        </h1>
        <p className="text-muted-foreground">
          Smart change detection to save 90% tokens on re-scans
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="glass-card border border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Cached Scans</p>
                <p className="text-2xl font-bold text-white">{stats.totalCached}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Cache Size</p>
                <p className="text-2xl font-bold text-white">{stats.cacheSize}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Potential Savings</p>
                <p className="text-2xl font-bold text-green-400">Up to 90%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cached Scans List */}
      <Card className="glass-card border border-border/30">
        <CardHeader className="border-b border-border/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Scan className="w-5 h-5" />
              Cached Scans
            </CardTitle>
            {cachedScans.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {cachedScans.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No cached scans yet</p>
              <p className="text-sm text-muted-foreground/60 mt-2">
                Scan some videos to see them here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {cachedScans.map((scan) => (
                  <Card
                    key={scan.videoId}
                    className={`glass-card border transition-all cursor-pointer ${
                      selectedVideo === scan.videoId
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/20 hover:border-border/40"
                    }`}
                    onClick={() => setSelectedVideo(scan.videoId)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1 line-clamp-1">
                            {scan.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Badge variant="outline" className="text-xs">
                              {scan.platform}
                            </Badge>
                            <span>•</span>
                            <span>Risk: {scan.riskScore}%</span>
                            <span>•</span>
                            <span>{new Date(scan.scannedAt).toLocaleDateString()}</span>
                          </div>
                          {getRecommendationBadge(scan)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestDiff(scan.videoId);
                            }}
                            className="border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearCache(scan.videoId);
                            }}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="glass-card border border-border/30 mt-6">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <h4 className="font-semibold text-green-400 mb-2">No Changes</h4>
              <p className="text-muted-foreground">
                Content identical to previous scan. Skip re-scan entirely (100% savings).
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-semibold text-blue-400 mb-2">Metadata Only</h4>
              <p className="text-muted-foreground">
                Only title/description/tags changed. Re-scan metadata only (90% savings).
              </p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <h4 className="font-semibold text-orange-400 mb-2">Full Rescan</h4>
              <p className="text-muted-foreground">
                Major changes detected. Full re-scan recommended for accuracy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntelligentDiffEngineUI;

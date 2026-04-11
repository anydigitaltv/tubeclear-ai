import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, Shield, Smartphone, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VideoCard from "@/components/VideoCard";
import { useVideos } from "@/contexts/VideoContext";
import { usePlatforms, type PlatformId } from "@/contexts/PlatformContext";
import { toast } from "sonner";

const VideoDashboard = () => {
  const { videos, isLoading, lastSynced, refreshVideos } = useVideos();
  const { platforms, getConnectedCount } = usePlatforms();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"views" | "date" | "platform">("date");
  const [platformFilter, setPlatformFilter] = useState<PlatformId | "all">("all");
  const [showDeviceNotice, setShowDeviceNotice] = useState(false);

  // Low-end device check notification
  useEffect(() => {
    const hasSeenNotice = localStorage.getItem("tubeclear_device_notice");
    if (!hasSeenNotice) {
      // Check for low-end device indicators
      const isLowEnd = navigator.hardwareConcurrency <= 4 || 
                       (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined && 
                       (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4;
      
      if (isLowEnd) {
        setShowDeviceNotice(true);
        localStorage.setItem("tubeclear_device_notice", "true");
      }
    }
  }, []);

  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Platform filter
    if (platformFilter !== "all") {
      result = result.filter(v => v.platformId === platformFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => v.title.toLowerCase().includes(query));
    }

    // Sorting
    switch (sortBy) {
      case "views":
        result.sort((a, b) => b.views - a.views);
        break;
      case "date":
        result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        break;
      case "platform":
        result.sort((a, b) => a.platformId.localeCompare(b.platformId));
        break;
    }

    return result;
  }, [videos, searchQuery, sortBy, platformFilter]);

  const connectedPlatforms = platforms.filter(p => p.connected);
  const videoCount = filteredVideos.length;

  const handleRefresh = async () => {
    toast.info("Syncing your channel videos...", {
      description: "Fetching latest videos and running policy scans"
    });
    await refreshVideos();
    toast.success("Sync complete!", {
      description: `Synced ${videos.length} videos from your channels`
    });
  };

  const formatSyncTime = (date: Date | null) => {
    if (!date) return "Never";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Low-End Device Notification */}
      {showDeviceNotice && (
        <div className="glass-card border border-accent/30 p-4 rounded-xl animate-pulse-glow">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-gradient">Device Optimized</h3>
                <p className="text-sm text-muted-foreground">
                  Aapka device optimize kar diya gaya hai
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowDeviceNotice(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header with Search and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Video Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            {videoCount} videos • Last synced: {formatSyncTime(lastSynced)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/50"
          />
        </div>

        {/* Platform Filter */}
        <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformId | "all")}>
          <SelectTrigger className="w-[150px] bg-secondary/50">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {connectedPlatforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "views" | "date" | "platform")}>
          <SelectTrigger className="w-[140px] bg-secondary/50">
            <ArrowUpDown className="h-4 w-4 mr-1.5" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="views">Views</SelectItem>
            <SelectItem value="platform">Platform</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Platform Filter Tags */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={platformFilter === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setPlatformFilter("all")}
        >
          All ({videos.length})
        </Badge>
        {connectedPlatforms.map((p) => (
          <Badge
            key={p.id}
            variant={platformFilter === p.id ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setPlatformFilter(p.id)}
          >
            {p.name} ({videos.filter(v => v.platformId === p.id).length})
          </Badge>
        ))}
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : getConnectedCount() === 0 ? (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Platforms Connected</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Connect a platform to view your videos.
          </p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Videos Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {searchQuery ? "Try a different search term." : "No videos match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoDashboard;

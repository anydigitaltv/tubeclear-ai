import { useState } from "react";
import { Search, Youtube, Music2, Instagram, Facebook, PlayCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/contexts/PlatformContext";

interface TopBarProps {
  onSearch?: (query: string) => void;
  onPlatformFilter?: (platform: PlatformId | null) => void;
  activeFilter?: PlatformId | null;
}

const platforms: { id: PlatformId; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "youtube", icon: Youtube, color: "#FF0000" },
  { id: "tiktok", icon: Music2, color: "#000000" },
  { id: "instagram", icon: Instagram, color: "#E4405F" },
  { id: "facebook", icon: Facebook, color: "#1877F2" },
  { id: "dailymotion", icon: PlayCircle, color: "#00D2F3" },
];

const TopBar = ({ onSearch, onPlatformFilter, activeFilter }: TopBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handlePlatformClick = (platformId: PlatformId) => {
    if (activeFilter === platformId) {
      onPlatformFilter?.(null);
    } else {
      onPlatformFilter?.(platformId);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    onSearch?.("");
  };

  return (
    <div className="sticky top-0 z-40 glass-card border-b border-border/30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Universal Search */}
          <div className={cn(
            "relative flex-1 max-w-md transition-all duration-200",
            isFocused && "max-w-lg"
          )}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search videos, channels, or content..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="pl-10 pr-8 h-10 bg-secondary/50 border-border/50 text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={clearSearch}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Platform Filter Icons */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">Filter:</span>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/30">
              {platforms.map(({ id, icon: Icon, color }) => (
                <Button
                  key={id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 transition-all duration-200",
                    activeFilter === id 
                      ? "bg-primary/20 border border-primary/30" 
                      : "hover:bg-secondary/50"
                  )}
                  onClick={() => handlePlatformClick(id)}
                  title={`Filter by ${id}`}
                >
                  <Icon 
                    className={cn(
                      "h-4 w-4 transition-colors",
                      activeFilter === id && "text-primary"
                    )} 
                  />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;

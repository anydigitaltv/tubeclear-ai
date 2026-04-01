import { Eye, Heart, MessageCircle, Clock, Shield, Youtube, Music2, Instagram, Facebook, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Video } from "@/contexts/VideoContext";
import type { PlatformId } from "@/contexts/PlatformContext";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
}

const platformIcons: Record<PlatformId, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  tiktok: Music2,
  instagram: Instagram,
  facebook: Facebook,
  dailymotion: PlayCircle,
};

const platformColors: Record<PlatformId, string> = {
  youtube: "text-red-500",
  tiktok: "text-black dark:text-white",
  instagram: "text-pink-500",
  facebook: "text-blue-500",
  dailymotion: "text-cyan-500",
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const VideoCard = ({ video }: VideoCardProps) => {
  const PlatformIcon = platformIcons[video.platformId];
  const platformColor = platformColors[video.platformId];

  const getRiskColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score < 30) return "text-green-500";
    if (score < 70) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="glass-card overflow-hidden hover:border-primary/30 transition-all duration-300 group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-secondary/50 overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-black/80 text-white text-[10px] px-1.5 py-0.5">
            <Clock className="h-3 w-3 mr-0.5" />
            {video.duration}
          </Badge>
        </div>

        {/* Platform Badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-black/60 text-white text-[10px] px-1.5 py-0.5">
            <PlatformIcon className={cn("h-3 w-3 mr-0.5", platformColor)} />
            {video.platformId}
          </Badge>
        </div>

        {/* Risk Score */}
        {video.riskScore !== undefined && (
          <div className="absolute top-2 right-2">
            <Badge className={cn("text-[10px] px-1.5 py-0.5", getRiskColor(video.riskScore))}>
              <Shield className="h-3 w-3 mr-0.5" />
              {video.riskScore}%
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        {/* Title */}
        <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
          {video.title}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" />
            {formatNumber(video.views)}
          </span>
          <span className="flex items-center gap-0.5">
            <Heart className="h-3 w-3" />
            {formatNumber(video.likes)}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="h-3 w-3" />
            {formatNumber(video.comments)}
          </span>
        </div>

        {/* Published Date */}
        <p className="text-[10px] text-muted-foreground mt-2">
          {formatDate(video.publishedAt)}
        </p>
      </CardContent>
    </Card>
  );
};

export default VideoCard;

import { useState } from "react";
import { Eye, Heart, MessageCircle, Clock, Shield, Youtube, Music2, Instagram, Facebook, PlayCircle, ImageOff, ExternalLink } from "lucide-react";
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

const platformBgColors: Record<PlatformId, string> = {
  youtube: "bg-red-500/20 text-red-400",
  tiktok: "bg-gray-700/50 text-white",
  instagram: "bg-pink-500/20 text-pink-400",
  facebook: "bg-blue-500/20 text-blue-400",
  dailymotion: "bg-cyan-500/20 text-cyan-400",
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
  const platformBg = platformBgColors[video.platformId];
  const [imageError, setImageError] = useState(false);

  const getRiskColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score < 30) return "text-green-500";
    if (score < 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getRiskBadgeColor = (score?: number) => {
    if (!score) return "bg-gray-500/20 text-gray-400";
    if (score < 30) return "bg-green-500/20 text-green-400";
    if (score < 70) return "bg-yellow-500/20 text-yellow-400";
    return "bg-red-500/20 text-red-400";
  };

  // Platform-specific gradient backgrounds for fallback
  const platformGradients: Record<PlatformId, string> = {
    youtube: "from-red-900/40 to-red-600/20",
    tiktok: "from-pink-900/40 to-cyan-600/20",
    instagram: "from-purple-900/40 to-pink-600/20",
    facebook: "from-blue-900/40 to-blue-600/20",
    dailymotion: "from-cyan-900/40 to-blue-600/20",
  };

  return (
    <Card className="glass-card overflow-hidden hover:border-primary/30 transition-all duration-300 group relative">
      {/* Thumbnail */}
      <div className={cn(
        "relative aspect-video overflow-hidden bg-gradient-to-br",
        platformGradients[video.platformId]
      )}>
        {!imageError && (video.thumbnail || (video as any).thumbnailUrl) ? (
          <img
            src={video.thumbnail || (video as any).thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
            <ImageOff className="h-8 w-8 mb-2" />
            <PlatformIcon className={cn("h-12 w-12", platformColor)} />
          </div>
        )}
        
        {/* Platform Badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-md uppercase font-bold z-10">
          {video.platformId}
        </div>

        {/* Watch Original Link Button */}
        <a
          href={video.videoUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-primary/80 text-white rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-20"
          title="Watch Original Video"
        >
          <ExternalLink className="h-4 w-4" />
        </a>

        {/* Scanning Overlay */}
        {video.riskScore === undefined && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <span className="text-white text-sm animate-pulse">🤖 Scanning Video...</span>
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-black/80 text-white text-[10px] px-1.5 py-0.5">
            <Clock className="h-3 w-3 mr-0.5" />
            {video.duration}
          </Badge>
        </div>

        {/* Risk Score & AI Badges */}
        {video.riskScore !== undefined && (
          <div className="absolute top-12 right-2 flex flex-col gap-1">
            <Badge className={cn("text-[10px] px-1.5 py-0.5", getRiskBadgeColor(video.riskScore))}>
              <Shield className="h-3 w-3 mr-0.5" />
              Risk: {video.riskScore}%
            </Badge>
            {/* AI Engine Badge */}
            {(video as any).engineUsed && (
              <Badge className="bg-blue-500/80 text-white text-[9px] px-1.5 py-0.5">
                🤖 {(video as any).engineUsed === 'gemini' ? 'Gemini' : 
                    (video as any).engineUsed === 'groq' ? 'Groq' :
                    (video as any).engineUsed === 'openai' ? 'GPT-4' :
                    (video as any).engineUsed}
              </Badge>
            )}
            {/* Scan Type Badge */}
            {(video as any).scanType && (
              <Badge className="bg-purple-500/80 text-white text-[9px] px-1.5 py-0.5">
                🔍 {(video as any).scanType === 'deep' ? 'Deep' : 'Meta'}
              </Badge>
            )}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="text-white font-medium text-sm line-clamp-2 mb-2 min-h-[2.5rem]" title={video.title}>
          {video.title || 'Untitled Video'}
        </h3>

        {/* Scan Details Tooltip (on hover) */}
        {(video as any).scanDetails && (
          <div className="mb-2 p-2 bg-slate-800/50 rounded text-[10px] text-slate-400 hidden group-hover:block">
            <div className="font-semibold text-slate-300 mb-1">✓ Checked:</div>
            <div className="flex flex-wrap gap-1">
              {(video as any).scanDetails.title && <span>📝Title</span>}
              {(video as any).scanDetails.description && <span>📄Desc</span>}
              {(video as any).scanDetails.tags && <span>🏷️Tags</span>}
              {(video as any).scanDetails.video && <span>🎬Video</span>}
              {(video as any).scanDetails.audio && <span>🎵Audio</span>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          {/* Direct Video Link */}
          {video.videoUrl ? (
            <a 
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={14} />
              Watch Original
            </a>
          ) : (
            <span className="text-xs text-gray-500 italic">No link available</span>
          )}

          {/* Scan Status / Score */}
          {video.riskScore !== undefined ? (
            <span className={cn("px-2 py-1 rounded text-xs font-bold", getRiskBadgeColor(video.riskScore))}>
              Risk: {video.riskScore}%
            </span>
          ) : (
            <span className="text-gray-400 text-xs italic">
              Waiting to scan...
            </span>
          )}
        </div>

        {/* Stats (optional, shows if available) */}
        {video.views > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-gray-700/50">
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
        )}

        {/* Published Date */}
        <p className="text-[10px] text-muted-foreground mt-2">
          {formatDate(video.publishedAt)}
        </p>
      </CardContent>
    </Card>
  );
};

export default VideoCard;

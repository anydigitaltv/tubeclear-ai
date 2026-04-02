import React, { useState } from "react";
import { Youtube, Music, Camera, Facebook, Globe } from "lucide-react";

interface ThumbnailProps {
  src?: string | null;
  alt: string;
  platform: string;
  className?: string;
  fallbackSize?: "sm" | "md" | "lg";
}

const getPlatformIcon = (platform: string) => {
  const icons: Record<string, any> = {
    youtube: Youtube,
    tiktok: Music,
    instagram: Camera,
    facebook: Facebook,
    dailymotion: Globe,
  };
  const Icon = icons[platform.toLowerCase()] || Globe;
  return <Icon className="w-full h-full p-2" />;
};

export const ThumbnailWithFallback = ({
  src,
  alt,
  platform,
  className = "",
  fallbackSize = "md"
}: ThumbnailProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  if (!src || hasError) {
    return (
      <div className={`${sizeClasses[fallbackSize]} rounded-lg bg-slate-800/50 flex items-center justify-center overflow-hidden ${className}`}>
        <div className="text-slate-400">
          {getPlatformIcon(platform)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[fallbackSize]} rounded-lg bg-slate-800/50 flex items-center justify-center overflow-hidden relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          {getPlatformIcon(platform)}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
};

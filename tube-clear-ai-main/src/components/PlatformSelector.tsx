import { useState } from "react";
import { cn } from "@/lib/utils";

interface Platform {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const platforms: Platform[] = [
  {
    id: "youtube",
    name: "YouTube",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/50",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/50",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    borderColor: "border-blue-600/50",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/50",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    id: "dailymotion",
    name: "Dailymotion",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/50",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.675 1.325c-2.309 1.596-3.505 4.358-3.236 7.247.023.248.058.494.105.738.024.126.052.251.082.376.045.187.096.372.154.554.066.208.142.412.228.612.065.151.137.299.215.443.103.19.216.374.339.551.076.109.157.215.242.318.147.178.304.347.47.506.076.073.155.143.236.21.181.15.372.288.571.413.093.058.188.113.285.164.203.107.413.201.63.281.105.039.212.074.321.104.219.061.443.109.67.142.108.016.217.028.327.035.231.016.463.016.694 0 .11-.007.219-.019.327-.035.227-.033.451-.081.67-.142.109-.03.216-.065.321-.104.217-.08.427-.174.63-.281.097-.051.192-.106.285-.164.199-.125.39-.263.571-.413.081-.067.16-.137.236-.21.166-.159.323-.328.47-.506.085-.103.166-.209.242-.318.123-.177.236-.361.339-.551.078-.144.15-.292.215-.443.086-.2.162-.404.228-.612.058-.182.109-.367.154-.554.03-.125.058-.25.082-.376.047-.244.082-.49.105-.738.269-2.889-.927-5.651-3.236-7.247C19.796.065 16.252-.065 13.675 1.325z"/>
      </svg>
    ),
  },
];

interface PlatformSelectorProps {
  selectedPlatform: string;
  onSelect: (platformId: string) => void;
}

const PlatformSelector = ({ selectedPlatform, onSelect }: PlatformSelectorProps) => {
  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      <h3 className="text-lg font-semibold text-white mb-4 text-center">
        Select Platform / Platform Chunein
      </h3>
      <div className="grid grid-cols-5 gap-3">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => onSelect(platform.id)}
            className={cn(
              "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105",
              selectedPlatform === platform.id
                ? `${platform.bgColor} ${platform.borderColor} shadow-lg`
                : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
            )}
          >
            <div className={cn("mb-2 transition-all duration-300", platform.color)}>
              {platform.icon}
            </div>
            <span
              className={cn(
                "text-xs font-medium transition-all duration-300",
                selectedPlatform === platform.id ? "text-white" : "text-slate-400"
              )}
            >
              {platform.name}
            </span>
            {selectedPlatform === platform.id && (
              <div
                className={cn(
                  "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                  platform.color.replace("text-", "bg-")
                )}
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlatformSelector;

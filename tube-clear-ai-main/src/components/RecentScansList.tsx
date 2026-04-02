import { Clock, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlatformDisplayName } from "@/utils/urlHelper";
import { ThumbnailWithFallback } from "@/components/ThumbnailWithFallback";

export interface ScanHistoryItem {
  url: string;
  platform: string;
  title: string;
  riskScore: number;
  date: string;
  thumbnail?: string | null;
}

const RecentScansList = () => {
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);

  useEffect(() => {
    try {
      const scans = JSON.parse(localStorage.getItem("tubeclear_recent_scans") || "[]");
      setRecentScans(scans);
    } catch (error) {
      // Silently handle load errors
    }
  }, []);

  if (recentScans.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No recent scans yet</p>
        <p className="text-xs mt-1">Your last 5 scanned videos will appear here</p>
      </div>
    );
  }

  const getColor = (score: number) => {
    if (score <= 30) return "text-green-400";
    if (score <= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const handleRescan = (url: string, platform: string) => {
    // Navigate to scan page with URL
    window.location.href = `/?video=${encodeURIComponent(url)}&platform=${platform}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {recentScans.map((scan, index) => (
        <button
          key={index}
          onClick={() => handleRescan(scan.url, scan.platform)}
          className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600 transition-all group text-left w-full"
        >
          {/* Thumbnail with Error Boundary */}
          <ThumbnailWithFallback
            src={scan.thumbnail}
            alt={`${scan.title} thumbnail`}
            platform={scan.platform}
            fallbackSize="md"
            className="flex-shrink-0"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 flex-shrink-0">
                <ThumbnailWithFallback
                  src={null}
                  alt={`${scan.platform} icon`}
                  platform={scan.platform}
                  fallbackSize="sm"
                />
              </div>
              <p className="text-xs font-medium text-white truncate">
                {scan.title}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`${getColor(scan.riskScore)} font-bold tabular-nums`}>
                Risk: {scan.riskScore}/100
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-500">
                {new Date(scan.date).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      ))}
    </div>
  );
};

export default RecentScansList;

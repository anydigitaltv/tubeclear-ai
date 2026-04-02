import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ScanHistoryItem {
  url: string;
  title: string;
  risk: number;
  date: string;
}

interface RecentScansProps {
  history: ScanHistoryItem[];
  onRescan: (url: string, platformId: string) => void;
}

const RecentScans = ({ history, onRescan }: RecentScansProps) => {
  if (history.length === 0) return null;

  const getColor = (s: number) => {
    if (s <= 30) return "text-accent";
    if (s <= 60) return "text-yellow-400";
    return "text-destructive";
  };

  return (
    <section className="container mx-auto px-6 py-8">
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Recent Scans</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {history.slice(0, 6).map((item, i) => (
            <button
              key={i}
              onClick={() => {
                // Detect platform from URL
                const platform = item.url.includes('tiktok.com') ? 'tiktok' :
                                 item.url.includes('instagram.com') ? 'instagram' :
                                 item.url.includes('facebook.com') ? 'facebook' :
                                 item.url.includes('dailymotion.com') ? 'dailymotion' : 'youtube';
                onRescan(item.url, platform);
              }}
              className="glass p-3 rounded-lg text-left hover:border-primary/30 transition-colors group flex items-center gap-3"
            >
              <span className={`text-lg font-bold tabular-nums ${getColor(item.risk)}`}>
                {item.risk}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.date}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentScans;

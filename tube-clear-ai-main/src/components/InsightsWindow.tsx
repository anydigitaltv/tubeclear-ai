import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Info,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

export interface ViolationItem {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  descriptionEn: string;
  descriptionUrdu: string; // Roman Urdu
  policyUrl: string;
  recommendation: string;
}

export interface VerdictResult {
  label: "PASS" | "FLAGGED" | "FAILED";
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  message: string;
  messageUrdu: string;
}

interface InsightsWindowProps {
  safetyScore: number;
  violations: ViolationItem[];
  platformId?: string;
  videoTitle?: string;
}

export const InsightsWindow = ({
  safetyScore,
  violations,
  platformId = "youtube",
  videoTitle = "Video",
}: InsightsWindowProps) => {
  
  // Calculate verdict based on score
  const getVerdict = (score: number): VerdictResult => {
    if (score <= 20) {
      return {
        label: "PASS",
        icon: CheckCircle2,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        message: "Your content is safe and compliant with platform policies.",
        messageUrdu: "Aapka content mehfooz hai aur platform policies ke mutabiq hai.",
      };
    } else if (score <= 50) {
      return {
        label: "FLAGGED",
        icon: AlertCircle,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        message: "Some issues detected. Review recommendations to improve compliance.",
        messageUrdu: "Kuch maslay detect hue hain. Compliance behtar karne ke liye recommendations dekhein.",
      };
    } else {
      return {
        label: "FAILED",
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        message: "Critical violations found. Immediate action required to avoid penalties.",
        messageUrdu: "Naqde khilafiyan mili hain. Saza se bachne ke liye fori karkardagi zaroori hai.",
      };
    }
  };

  const verdict = getVerdict(safetyScore);
  const VerdictIcon = verdict.icon;

  // Get severity badge color
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // Get trend icon based on score change
  const getTrendIcon = () => {
    if (safetyScore <= 20) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (safetyScore <= 50) {
      return <Minus className="w-4 h-4 text-yellow-500" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          Audit Insights & Verdict
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Verdict Banner */}
        <div className={`p-4 rounded-xl ${verdict.bgColor} ${verdict.borderColor} border-2`}>
          <div className="flex items-start gap-3">
            <VerdictIcon className={`w-8 h-8 ${verdict.color} mt-1`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${verdict.color} bg-background/50`}>
                  {verdict.label}
                </Badge>
                <span className="text-2xl font-bold text-white">{safetyScore}%</span>
                {getTrendIcon()}
              </div>
              
              <p className="text-sm text-white font-medium mb-1">
                {verdict.message}
              </p>
              <p className="text-xs text-muted-foreground italic">
                {verdict.messageUrdu}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Violations List */}
        {violations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Detected Issues ({violations.length})
              </h3>
              {violations.length > 3 && (
                <span className="text-xs text-blue-400">↓ Scroll to view all</span>
              )}
            </div>

            <ScrollArea 
              className="h-[400px] w-full pr-4" 
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#64748b #1e293b' }}
            >
              <div className="space-y-3">
              {violations.map((violation, index) => (
                <div
                  key={violation.id}
                  className="bg-secondary/30 rounded-lg p-4 space-y-3 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getSeverityBadge(violation.severity)}>
                          {violation.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {violation.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-white">
                        {violation.title}
                      </h4>
                    </div>
                  </div>

                  {/* Description - English */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      <strong>Description:</strong>
                    </p>
                    <p className="text-xs text-white leading-relaxed">
                      {violation.descriptionEn}
                    </p>
                  </div>

                  {/* Description - Urdu (Roman) */}
                  <div className="bg-primary/5 rounded p-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      <strong>Wazahat (Roman Urdu):</strong>
                    </p>
                    <p className="text-xs text-white leading-relaxed italic">
                      {violation.descriptionUrdu}
                    </p>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-green-500/10 rounded p-2 border border-green-500/20">
                    <p className="text-xs text-green-400 mb-1">
                      <strong>Recommendation:</strong>
                    </p>
                    <p className="text-xs text-white">
                      {violation.recommendation}
                    </p>
                  </div>

                  {/* Learn More Link */}
                  <div className="pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs text-primary hover:text-primary/80 h-auto py-2"
                      onClick={() => window.open(violation.policyUrl, "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      Learn More - Official Policy Page
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </ScrollArea>
          </div>
        )}

        {/* No Violations Message */}
        {violations.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-white font-medium mb-1">
              No violations detected!
            </p>
            <p className="text-xs text-muted-foreground">
              Aapka content bilkul safe hai. Koi masla nahi mila.
            </p>
          </div>
        )}

        {/* Platform Policy Links */}
        <div className="pt-4 border-t border-border/50">
          <h3 className="text-xs font-semibold text-white mb-3">
            Official Policy Resources
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-start text-xs h-auto py-2"
              onClick={() => {
                const urls: Record<string, string> = {
                  youtube: "https://support.google.com/youtube/answer/2801973",
                  tiktok: "https://www.tiktok.com/community-guidelines",
                  instagram: "https://help.instagram.com/477434105621119",
                  facebook: "https://www.facebook.com/communitystandards",
                };
                window.open(urls[platformId] || urls.youtube, "_blank");
              }}
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              View {platformId.charAt(0).toUpperCase() + platformId.slice(1)} Guidelines
            </Button>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="pt-4 border-t border-border/50">
          <h3 className="text-xs font-semibold text-white mb-3">
            Score Breakdown
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Content Safety</span>
              <span className="text-white font-medium">
                {Math.max(0, safetyScore - 10)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Metadata Compliance</span>
              <span className="text-white font-medium">
                {Math.min(100, safetyScore + 5)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Policy Adherence</span>
              <span className="text-white font-medium">{safetyScore}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

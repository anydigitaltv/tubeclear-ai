import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Share2, CheckCircle, AlertTriangle, XCircle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AICheck {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail";
  description: string;
}

interface AIScanSummaryCardProps {
  checks: AICheck[];
  riskScore: number;
  platform: string;
  videoTitle?: string;
  fullReport?: any;
  videoUrl?: string;
}

const AIScanSummaryCard = ({
  checks,
  riskScore,
  platform,
  videoTitle,
  fullReport,
  videoUrl
}: AIScanSummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate summary
  const passedChecks = checks.filter(c => c.status === "pass").length;
  const warningChecks = checks.filter(c => c.status === "warning").length;
  const failedChecks = checks.filter(c => c.status === "fail").length;
  const totalChecks = checks.length;

  // Determine overall status
  const getOverallStatus = () => {
    if (failedChecks > 0) return { label: "HIGH RISK", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle };
    if (warningChecks > 0) return { label: "LOW RISK", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: AlertTriangle };
    return { label: "SAFE", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle };
  };

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon;

  // Get icon for check status
  const getCheckIcon = (status: AICheck["status"]) => {
    switch (status) {
      case "pass": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "fail": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Get background color for check
  const getCheckBg = (status: AICheck["status"]) => {
    switch (status) {
      case "pass": return "bg-green-500/5 border-green-500/20";
      case "warning": return "bg-yellow-500/5 border-yellow-500/20";
      case "fail": return "bg-red-500/5 border-red-500/20";
    }
  };

  // Copy report
  const handleCopy = () => {
    const reportText = `
AI Scan Summary - ${platform.toUpperCase()}
Video: ${videoTitle || "N/A"}
Risk Score: ${riskScore}/100 (${overallStatus.label})

Checks Performed:
${checks.map(c => `${c.status === "pass" ? "✅" : c.status === "warning" ? "⚠️" : "❌"} ${c.label} - ${c.description}`).join("\n")}

Overall: ${passedChecks}/${totalChecks} checks passed
${warningChecks > 0 ? `Warnings: ${warningChecks}` : ""}
${failedChecks > 0 ? `Failed: ${failedChecks}` : ""}

Full Report: ${JSON.stringify(fullReport, null, 2)}
    `.trim();

    navigator.clipboard.writeText(reportText);
    toast.success("✅ Report copied to clipboard!");
  };

  // Share result
  const handleShare = () => {
    const shareText = `${videoTitle || "Video"} - AI Scan Complete! Risk Score: ${riskScore}/100 (${overallStatus.label}). ${passedChecks}/${totalChecks} checks passed. #TubeClear #ContentSafety`;
    
    if (navigator.share) {
      navigator.share({
        title: "AI Scan Result",
        text: shareText,
        url: videoUrl || window.location.href
      }).catch(() => {
        navigator.clipboard.writeText(`${shareText}\n${videoUrl || window.location.href}`);
        toast.success("Link copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(`${shareText}\n${videoUrl || window.location.href}`);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="glass-card border border-border/50 rounded-xl overflow-hidden animate-fade-in">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", overallStatus.bg)}>
            <Shield className={cn("h-5 w-5", overallStatus.color)} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">AI Scan Summary</h3>
            <p className="text-xs text-muted-foreground">{totalChecks} checks performed</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Risk Score Badge */}
          <div className="text-right">
            <div className={cn("text-lg font-bold", overallStatus.color)}>
              {riskScore}/100
            </div>
            <div className={cn("text-xs font-medium", overallStatus.color)}>
              {overallStatus.label}
            </div>
          </div>

          {/* Dropdown Icon */}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Summary Stats - Always Visible */}
      <div className="px-4 pb-3 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-500 font-medium">{passedChecks} Passed</span>
        </div>
        {warningChecks > 0 && (
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-500 font-medium">{warningChecks} Warning{warningChecks > 1 ? "s" : ""}</span>
          </div>
        )}
        {failedChecks > 0 && (
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-500 font-medium">{failedChecks} Failed</span>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 animate-slide-down">
          {/* Divider */}
          <div className="h-px bg-border/50 mb-3" />

          {/* Check List */}
          <div className="space-y-2">
            {checks.map((check) => (
              <div
                key={check.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  getCheckBg(check.status)
                )}
              >
                <div className="flex items-start gap-2">
                  {getCheckIcon(check.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{check.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/50 my-3" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all text-sm font-medium"
            >
              <Copy className="h-4 w-4" />
              Copy Report
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all text-sm font-medium text-primary"
            >
              <Share2 className="h-4 w-4" />
              Share Result
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIScanSummaryCard;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, ExternalLink, RefreshCw } from "lucide-react";
import { usePolicySync } from "@/contexts/PolicySyncContext";
import { formatDistanceToNow } from "date-fns";

export const ViolationWarningsPanel = () => {
  const { violationWarnings, isScanning, lastScanTime, triggerPolicySync, dismissViolation, getViolationCount } = usePolicySync();

  const count = getViolationCount();

  if (count === 0 && !isScanning) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500 border-red-500";
      case "high":
        return "bg-orange-500 border-orange-500";
      case "medium":
        return "bg-yellow-500 border-yellow-500";
      case "low":
        return "bg-blue-500 border-blue-500";
      default:
        return "bg-gray-500 border-gray-500";
    }
  };

  return (
    <Card className="glass-card border-red-500/30 animate-pulse">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            VIOLATION WARNINGS ({count})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={triggerPolicySync}
            disabled={isScanning}
            className="text-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isScanning ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {violationWarnings.map((warning) => (
          <div
            key={warning.videoId}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getSeverityColor(warning.severity)}>
                    {warning.severity.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {warning.platformId}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-white mb-1">
                  {warning.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Detected {formatDistanceToNow(new Date(warning.detectedAt), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissViolation(warning.videoId)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Violation Details */}
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  <strong>Policy:</strong>
                </p>
                <p className="text-xs text-white">{warning.policyTitle}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  <strong>Description:</strong>
                </p>
                <p className="text-xs text-white">{warning.description}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-auto py-2"
                onClick={() => {
                  // Navigate to video
                  window.open(`https://${warning.platformId}.com/watch?v=${warning.videoId}`, "_blank");
                }}
              >
                View Video
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-auto py-2"
                onClick={() => {
                  // Open policy page
                  const urls: Record<string, string> = {
                    youtube: "https://support.google.com/youtube/answer/2801973",
                    tiktok: "https://www.tiktok.com/community-guidelines",
                    instagram: "https://help.instagram.com/477434105621119",
                    facebook: "https://www.facebook.com/communitystandards",
                  };
                  window.open(urls[warning.platformId] || urls.youtube, "_blank");
                }}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Policy
              </Button>
            </div>
          </div>
        ))}

        {/* Last Scan Info */}
        {lastScanTime && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
            Last synced: {formatDistanceToNow(lastScanTime, { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

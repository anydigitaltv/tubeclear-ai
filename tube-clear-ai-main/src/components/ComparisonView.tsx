import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, ExternalLink } from "lucide-react";

export interface ViolationComparison {
  id: string;
  timestamp: number;
  frameDescription: string;
  frameThumbnail?: string;
  violationText: string;
  policyReference: string;
  policyUrl: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface ComparisonViewProps {
  violations: ViolationComparison[];
  videoThumbnail?: string;
  videoTitle?: string;
}

export const ComparisonView = ({ violations, videoThumbnail, videoTitle }: ComparisonViewProps) => {
  if (violations.length === 0) return null;

  const getSeverityColor = (severity: ViolationComparison["severity"]) => {
    switch (severity) {
      case "low":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "medium":
        return "bg-orange-500/20 text-orange-300 border-orange-500/50";
      case "high":
        return "bg-red-500/20 text-red-300 border-red-500/50";
      case "critical":
        return "bg-red-600/30 text-red-200 border-red-500";
    }
  };

  const getSeverityIcon = (severity: ViolationComparison["severity"]) => {
    return <AlertTriangle className="w-4 h-4" />;
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="bg-black/40 border border-orange-500/20 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-red-500/10">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-orange-300">
            Policy Violation Comparison
          </h3>
          <Badge variant="outline" className="ml-auto border-orange-500/50 text-orange-300">
            {violations.length} Issue{violations.length > 1 ? "s" : ""} Found
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {violations.map((violation) => (
          <div
            key={violation.id}
            className="border border-white/10 rounded-lg overflow-hidden bg-white/5 animate-fade-in"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                {getSeverityIcon(violation.severity)}
                <span className="font-mono text-sm text-cyan-300">
                  ⏱️ {formatTimestamp(violation.timestamp)}
                </span>
                <Badge className={getSeverityColor(violation.severity)}>
                  {violation.severity.toUpperCase()}
                </Badge>
              </div>
              <a
                href={violation.policyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Policy <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: Video Frame */}
              <div className="p-4 border-b md:border-b-0 md:border-r border-white/10">
                <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                  📹 Video Frame Content
                </h4>
                {violation.frameThumbnail && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={violation.frameThumbnail}
                      alt="Video frame"
                      className="w-full h-auto"
                    />
                  </div>
                )}
                {!violation.frameThumbnail && videoThumbnail && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={videoThumbnail}
                      alt="Video thumbnail"
                      className="w-full h-auto"
                    />
                  </div>
                )}
                <p className="text-sm text-gray-300 leading-relaxed">
                  {violation.frameDescription}
                </p>
              </div>

              {/* Right: Policy Reference */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
                  📜 Platform Policy
                </h4>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-200 leading-relaxed font-medium">
                    {violation.policyReference}
                  </p>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-200 leading-relaxed">
                    <strong>Violation:</strong> {violation.violationText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ComparisonView;

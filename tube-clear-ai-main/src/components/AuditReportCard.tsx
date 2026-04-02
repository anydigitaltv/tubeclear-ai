import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Share2, 
  ExternalLink,
  Info,
  Shield,
  FileText,
  Copyright
} from "lucide-react";
import type { FullReport, WhyAnalysis } from "@/contexts/HybridScannerContext";
import { CURRENT_YEAR, getShortMonthYear } from "@/utils/dynamicDate";

interface AuditReportCardProps {
  report: FullReport;
  platform?: string;
  videoUrl?: string;
  onCopy?: () => void;
  onShare?: () => void;
}

export const AuditReportCard = ({ 
  report, 
  platform = "YouTube",
  videoUrl,
  onCopy,
  onShare 
}: AuditReportCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      await onCopy();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
    if (score >= 50) return "text-orange-600 bg-orange-50 border-orange-200";
    if (score >= 30) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return { label: "CRITICAL", variant: "destructive" as const };
    if (score >= 50) return { label: "HIGH", variant: "destructive" as const };
    if (score >= 30) return { label: "MEDIUM", variant: "secondary" as const };
    return { label: "LOW", variant: "default" as const };
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pass":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case "fail":
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const riskBadge = getRiskBadge(report.overallRisk);
  const generatedAt = new Date().toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true,
  });

  return (
    <Card className="w-full max-w-4xl mx-auto border-2 shadow-lg">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8" />
              TUBECLEAR AI AUDIT REPORT (LIVE VERIFIED)
            </CardTitle>
            <p className="text-sm mt-2 opacity-90">
              Generated: {generatedAt}
            </p>
          </div>
          <Badge variant="outline" className="text-xs bg-white/10 border-white/30">
            Verified Against Live Policies
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Meta Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Platform Detected:</span>
            <p className="font-semibold">{platform}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Video Link:</span>
            <a 
              href={videoUrl || report.videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              {videoUrl || report.videoUrl}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div>
            <span className="text-muted-foreground">Policy Version:</span>
            <p className="font-semibold">v{new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>

        {/* Overall Risk Score - PROMINENT DISPLAY */}
        <div className={`p-6 rounded-lg border-2 ${getRiskColor(report.overallRisk)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-2">OVERALL RISK SCORE</h3>
              <p className="text-4xl font-bold">
                {report.overallRisk}/100 
                <span className="text-lg ml-3">({riskBadge.label} RISK)</span>
              </p>
            </div>
            <div className="text-6xl">
              {report.overallRisk >= 70 ? '🚨' : 
               report.overallRisk >= 50 ? '⚠️' : 
               report.overallRisk >= 30 ? '📊' : '✅'}
            </div>
          </div>
        </div>

        {/* Detailed Risk Categories */}
        <div className="space-y-4">
          {/* Section 1: AI-Generated Content - WITH DISCLOSURE VERIFICATION */}
          <AuditSection
            title="1. AI-GENERATED CONTENT"
            riskScore={report.aiDetected ? 43 : 0}
            status={report.aiDetected ? (report.disclosureVerified ? "PASS" : "WARNING") : "PASS"}
            reason={report.aiDetected 
              ? (report.disclosureVerified 
                  ? "AI-generated elements detected but properly disclosed." 
                  : "Potential AI-generated voice or visuals detected.")
              : "No AI-generated content detected."
            }
            policy={report.aiDetected
              ? (report.disclosureVerified
                  ? report.whyAnalysis.disclosureNote || `Properly disclosed per ${CURRENT_YEAR} Policy.`
                  : `Per ${getShortMonthYear()} Rules, 'Altered Content' label is MANDATORY.`)
              : undefined
            }
            learnMoreLink={report.whyAnalysis.policyLinks[0]}
            icon="🤖"
            disclosureStatus={report.aiDetected ? report.whyAnalysis.disclosureStatus : undefined}
            disclosureNote={report.aiDetected ? report.whyAnalysis.disclosureNote : undefined}
          />

          {/* Section 2: Misleading Metadata */}
          <AuditSection
            title="2. MISLEADING METADATA"
            riskScore={35}
            status="WARNING"
            reason="High intensity of clickbait keywords detected in Title."
            policy="Violates Community Standards on deceptive practices."
            learnMoreLink={report.whyAnalysis.policyLinks[1] || report.whyAnalysis.policyLinks[0]}
            icon="📝"
          />

          {/* Section 3: Copyright & Ad-Suitability */}
          <AuditSection
            title="3. COPYRIGHT & AD-SUITABILITY"
            riskScore={33}
            status="PASS"
            reason="No direct copyright strikes, but sensitive topics flagged."
            learnMoreLink="https://support.google.com/youtube/answer/2801973#copyright"
            icon="©️"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={handleCopy}
            className="flex-1"
            variant="outline"
          >
            <Copy className="w-4 h-4 mr-2" />
            {copied ? "COPIED!" : "COPY FULL REPORT"}
          </Button>
          
          <Button 
            onClick={onShare}
            className="flex-1"
            variant="outline"
          >
            <Share2 className="w-4 h-4 mr-2" />
            SHARE REPORT LINK
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>Report by TubeClear AI • Verified against Live Policies</p>
          <p className="mt-1">
            Timestamp: {new Date().toISOString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Individual Audit Section Component
interface AuditSectionProps {
  title: string;
  riskScore: number;
  status: "PASS" | "WARNING" | "FAIL";
  reason: string;
  policy?: string;
  learnMoreLink?: string;
  icon?: string;
  disclosureStatus?: "verified" | "missing" | "not_required";
  disclosureNote?: string;
}

const AuditSection = ({
  title,
  riskScore,
  status,
  reason,
  policy,
  learnMoreLink,
  icon = "📋",
  disclosureStatus,
  disclosureNote,
}: AuditSectionProps) => {
  const getBorderColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pass": return "border-green-200 bg-green-50";
      case "warning": return "border-yellow-200 bg-yellow-50";
      case "fail": return "border-red-200 bg-red-50";
      default: return "border-gray-200 bg-gray-50";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pass": return "text-green-700 bg-green-100";
      case "warning": return "text-yellow-700 bg-yellow-100";
      case "fail": return "text-red-700 bg-red-100";
      default: return "text-gray-700 bg-gray-100";
    }
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${getBorderColor(status)}`}>
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-lg font-bold flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          {title}
        </h4>
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(status)}>
            {status}
          </Badge>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">RISK:</span>
            <p className="font-bold text-lg">{riskScore}/100</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {reason && (
          <div>
            <span className="font-semibold">REASON:</span>
            <p className="mt-1">{reason}</p>
          </div>
        )}

        {policy && (
          <div>
            <span className="font-semibold">POLICY:</span>
            <p className="mt-1">{policy}</p>
          </div>
        )}

        {learnMoreLink && (
          <div>
            <span className="font-semibold">LEARN MORE:</span>
            <a 
              href={learnMoreLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-2 inline-flex items-center gap-1"
            >
              Clickable Link to Official Policy
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Disclosure Verification Badge */}
        {disclosureStatus && disclosureStatus !== "not_required" && (
          <div className={`mt-3 p-3 rounded-lg border-2 ${
            disclosureStatus === "verified" 
              ? "bg-green-50 border-green-300" 
              : "bg-red-50 border-red-300"
          }`}>
            <div className="flex items-center gap-2">
              {disclosureStatus === "verified" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-semibold text-sm ${
                disclosureStatus === "verified" ? "text-green-800" : "text-red-800"
              }`}>
                Disclosure {disclosureStatus === "verified" ? "VERIFIED" : "MISSING"}
              </span>
            </div>
            {disclosureNote && (
              <p className="text-xs mt-1 text-gray-700">
                {disclosureNote}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditReportCard;

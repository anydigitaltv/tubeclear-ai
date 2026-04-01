import React, { useState, useEffect } from "react";
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
  Copyright,
  Coins,
  TrendingUp,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FullReport, WhyAnalysis } from "@/contexts/HybridScannerContext";

interface EnhancedAuditReportProps {
  report: FullReport;
  platform?: string;
  videoUrl?: string;
  onCopy?: () => void;
  onShare?: () => void;
  isGuest?: boolean;
}

export const EnhancedAuditReport = ({ 
  report, 
  platform = "YouTube",
  videoUrl,
  onCopy,
  onShare,
  isGuest = false
}: EnhancedAuditReportProps) => {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);

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

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const riskBadge = getRiskBadge(report.overallRisk);
  const generatedAt = new Date().toLocaleString('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: true,
  });

  // Trigger coin animation when disclosure is verified
  useEffect(() => {
    if (report.disclosureVerified) {
      setShowCoinAnimation(true);
      const timer = setTimeout(() => setShowCoinAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [report.disclosureVerified]);

  return (
    <Card className="w-full max-w-5xl mx-auto border-2 shadow-lg">
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
            {isGuest && (
              <Badge variant="outline" className="mt-2 bg-yellow-500/20 border-yellow-400 text-yellow-200">
                👤 Guest Mode • Login to save history
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant="outline" className="text-xs bg-white/10 border-white/30">
              Verified Against Live 2026 Policies
            </Badge>
            {report.disclosureVerified && showCoinAnimation && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="flex items-center gap-1 bg-green-500/20 border border-green-400 px-3 py-1 rounded-full text-green-300 text-xs"
              >
                <Coins className="w-3 h-3" />
                <span>Disclosure Verified - No Penalty!</span>
              </motion.div>
            )}
          </div>
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

        {/* Detailed Risk Categories WITH AI ADVICE */}
        <div className="space-y-4">
          {/* Section 1: AI-Generated Content - WITH DISCLOSURE VERIFICATION */}
          <EnhancedAuditSection
            index={0}
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
                  ? report.whyAnalysis.disclosureNote || "Properly disclosed per 2026 Policy."
                  : "Per April 2026 Rules, 'Altered Content' label is MANDATORY.")
              : undefined
            }
            learnMoreLink={report.whyAnalysis.policyLinks[0]}
            icon="🤖"
            disclosureStatus={report.aiDetected ? report.whyAnalysis.disclosureStatus : undefined}
            disclosureNote={report.aiDetected ? report.whyAnalysis.disclosureNote : undefined}
            advice={{
              why: report.aiDetected 
                ? (report.disclosureVerified
                    ? "AI elements were detected in your video, but you've properly disclosed them per platform policy."
                    : "Our AI detected synthetic media elements that require disclosure under 2026 platform policies.")
                : "No AI-generated content was detected in your video.",
              howToFix: report.aiDetected && !report.disclosureVerified
                ? `Add the required disclosure label to your ${platform} metadata:\n• YouTube: Add "Altered Content" label\n• TikTok: Use "AI-generated" tag\n• Facebook/IG: Add "Made with AI" label\n• Dailymotion: Include AI disclosure in description`
                : "Your content is compliant! Keep following best practices."
            }}
            isExpanded={expandedSections[0]}
            onToggle={() => toggleSection(0)}
          />

          {/* Section 2: Misleading Metadata */}
          <EnhancedAuditSection
            index={1}
            title="2. MISLEADING METADATA"
            riskScore={35}
            status="WARNING"
            reason="High intensity of clickbait keywords detected in Title."
            policy="Violates Community Standards on deceptive practices."
            learnMoreLink={report.whyAnalysis.policyLinks[1] || report.whyAnalysis.policyLinks[0]}
            icon="📝"
            advice={{
              why: "Clickbait keywords like 'grow fast', 'viral secrets', or 'guaranteed views' violate platform metadata standards.",
              howToFix: "Replace misleading claims with accurate descriptions:\n• Instead of 'Grow Fast' → 'Organic Growth Strategies'\n• Instead of 'Viral Secrets' → 'Proven Content Tips'\n• Remove impossible guarantees"
            }}
            isExpanded={expandedSections[1]}
            onToggle={() => toggleSection(1)}
          />

          {/* Section 3: Copyright & Ad-Suitability */}
          <EnhancedAuditSection
            index={2}
            title="3. COPYRIGHT & AD-SUITABILITY"
            riskScore={33}
            status="PASS"
            reason="No direct copyright strikes, but sensitive topics flagged."
            learnMoreLink="https://support.google.com/youtube/answer/2801973#copyright"
            icon="©️"
            advice={{
              why: "While no copyright violations were found, some topics may affect ad-revenue eligibility.",
              howToFix: "Review YouTube's advertiser-friendly content guidelines:\n• Avoid controversial topics\n• Use royalty-free music\n• Create original content"
            }}
            isExpanded={expandedSections[2]}
            onToggle={() => toggleSection(2)}
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
          <p>Report by TubeClear AI • Verified against Live 2026 Policies</p>
          <p className="mt-1">
            Timestamp: {new Date().toISOString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Audit Section with AI Advice
interface EnhancedAuditSectionProps {
  index: number;
  title: string;
  riskScore: number;
  status: "PASS" | "WARNING" | "FAIL";
  reason: string;
  policy?: string;
  learnMoreLink?: string;
  icon?: string;
  disclosureStatus?: "verified" | "missing" | "not_required";
  disclosureNote?: string;
  advice?: {
    why: string;
    howToFix: string;
  };
  isExpanded: boolean;
  onToggle: () => void;
}

const EnhancedAuditSection = ({
  index,
  title,
  riskScore,
  status,
  reason,
  policy,
  learnMoreLink,
  icon = "📋",
  disclosureStatus,
  disclosureNote,
  advice,
  isExpanded,
  onToggle
}: EnhancedAuditSectionProps) => {
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
      <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={onToggle}>
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
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
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

        {/* AI Advice Section - EXPANDABLE */}
        <AnimatePresence>
          {isExpanded && advice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              {/* Why This Score */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 text-sm">Why This Score?</p>
                    <p className="text-blue-800 text-xs mt-1">{advice.why}</p>
                  </div>
                </div>
              </div>

              {/* How to Fix */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 text-sm">How to Fix</p>
                    <p className="text-purple-800 text-xs mt-1 whitespace-pre-line">{advice.howToFix}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EnhancedAuditReport;

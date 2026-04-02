import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Shield,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Download,
  Share2,
  TrendingUp,
  AlertTriangle,
  Bot,
  Video,
  FileText,
  BarChart3,
  Youtube,
  Music,
  Camera,
  Facebook,
  Globe,
  Gauge,
  Award,
  AlertCircle,
  Info,
  Lightbulb,
  Copy,
  Lock,
  Clock
} from "lucide-react";
import type { FullReport, WhyAnalysis, DeepScanResult } from "@/contexts/HybridScannerContext";
import type { VideoMetadata } from "@/contexts/MetadataFetcherContext";
import { getPlatformDisplayName, isProtectedPlatform } from "@/utils/urlHelper";
import { usePolicyRules } from "@/contexts/PolicyRulesContext";
import RecentScansList from "@/components/RecentScansList";

interface ProfessionalDashboardProps {
  report: FullReport;
  metadata?: VideoMetadata;
  platform?: string;
  videoUrl?: string;
  isGuest?: boolean;
  onRunDeepScan?: () => void;
}

// Platform logo mapping
const getPlatformIcon = (platform: string) => {
  const icons: Record<string, any> = {
    youtube: Youtube,
    tiktok: Music,
    instagram: Camera,
    facebook: Facebook,
    dailymotion: Globe,
  };
  const Icon = icons[platform.toLowerCase()] || Globe;
  return <Icon className="w-5 h-5" />;
};

// Policy compliance status
interface PolicyCompliance {
  policyId: string;
  rule: string;
  category: string;
  status: "PASS" | "FAIL";
  insight: string;
  link?: string;
  severity: string;
}

export const ProfessionalDashboard = ({
  report,
  metadata,
  platform = "youtube",
  videoUrl,
  isGuest = false,
  onRunDeepScan
}: ProfessionalDashboardProps) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { getRulesByPlatform } = usePolicyRules();

  // Save to recent scans when scan completes
  useEffect(() => {
    if (report && videoUrl) {
      saveToRecentScans();
    }
  }, [report, videoUrl]);

  const saveToRecentScans = () => {
    try {
      const recentScans = JSON.parse(localStorage.getItem("tubeclear_recent_scans") || "[]");
      const newScan = {
        url: videoUrl,
        platform,
        title: metadata?.title || "Scanned Video",
        riskScore: report.overallRisk,
        date: new Date().toISOString(),
        thumbnail: metadata?.thumbnail || null,
      };
      
      // Add to beginning and keep only last 5
      const updated = [newScan, ...recentScans].slice(0, 5);
      localStorage.setItem("tubeclear_recent_scans", JSON.stringify(updated));
    } catch (error) {
      // Silently handle error in production
    }
  };

  // Generate policy compliance data
  const generatePolicyCompliance = (): PolicyCompliance[] => {
    const rules = getRulesByPlatform(platform);
    const complianceData: PolicyCompliance[] = [];

    // Simulate policy checking based on report data
    rules.forEach((rule) => {
      const isViolation = report.whyAnalysis.exactViolations?.some(
        (v: string) => v.toLowerCase().includes(rule.rule.toLowerCase())
      );

      complianceData.push({
        policyId: rule.id,
        rule: rule.rule,
        category: rule.category,
        status: isViolation ? "FAIL" : "PASS",
        insight: isViolation 
          ? `Fix: ${rule.description}` 
          : "Compliant with current guidelines",
        severity: rule.severity,
        link: getOfficialPolicyLink(platform, rule.category)
      });
    });

    // Add additional compliance checks based on scan result
    if (!complianceData.find(c => c.category === "ai_detection")) {
      complianceData.push({
        policyId: "ai-detection-1",
        rule: "AI-generated content disclosure",
        category: "ai_detection",
        status: report.aiDetected ? (report.disclosureVerified ? "PASS" : "FAIL") : "PASS",
        insight: report.aiDetected 
          ? (report.disclosureVerified ? "Properly disclosed" : "Add AI disclosure in description")
          : "No AI content detected",
        severity: "high",
        link: getOfficialPolicyLink(platform, "ai_detection")
      });
    }

    // Sort: FAILED policies appear first for better UX
    return complianceData.sort((a, b) => {
      if (a.status === "FAIL" && b.status === "PASS") return -1;
      if (a.status === "PASS" && b.status === "FAIL") return 1;
      return 0;
    });
  };

  const getOfficialPolicyLink = (platform: string, category: string): string => {
    const links: Record<string, Record<string, string>> = {
      youtube: {
        content: "https://support.google.com/youtube/answer/2801973",
        monetization: "https://support.google.com/youtube/answer/1311392",
        community: "https://support.google.com/youtube/answer/2801997",
        copyright: "https://support.google.com/youtube/answer/2807622",
        thumbnail: "https://support.google.com/youtube/answer/10716984",
        metadata: "https://support.google.com/youtube/answer/7239941",
      },
      tiktok: {
        content: "https://www.tiktok.com/community-guidelines",
        monetization: "https://www.tiktok.com/creator-fund",
        community: "https://www.tiktok.com/community-guidelines",
        copyright: "https://www.tiktok.com/legal/copyright-policy",
      },
      instagram: {
        content: "https://help.instagram.com/477434105621114",
        monetization: "https://help.instagram.com/1295711423827339",
        community: "https://help.instagram.com/477434105621114",
        copyright: "https://help.instagram.com/1295711423827339",
      },
      facebook: {
        content: "https://www.facebook.com/communitystandards/",
        monetization: "https://www.facebook.com/partner_monetization_policies/",
        community: "https://www.facebook.com/communitystandards/",
        copyright: "https://www.facebook.com/help/137930849618185",
      },
      dailymotion: {
        content: "https://faq.dailymotion.com/hc/en-us/articles/360000116833",
        community: "https://faq.dailymotion.com/hc/en-us/articles/360000116833",
        copyright: "https://faq.dailymotion.com/hc/en-us/articles/360000117013",
      },
    };

    return links[platform.toLowerCase()]?.[category] || 
           links[platform.toLowerCase()]?.content ||
           "https://example.com/policy";
  };

  const policyCompliance = generatePolicyCompliance();
  const passCount = policyCompliance.filter(p => p.status === "PASS").length;
  const failCount = policyCompliance.filter(p => p.status === "FAIL").length;
  const totalPolicies = policyCompliance.length;
  const compliancePercentage = Math.round((passCount / totalPolicies) * 100);

  // Extract failed policies for quick fix banner
  const failedPolicies = policyCompliance.filter(p => p.status === "FAIL");

  // Determine professional verdict
  const getProfessionalVerdict = () => {
    if (report.overallRisk >= 70) {
      return {
        title: "High Risk Detected",
        subtitle: "Not recommended for upload",
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        icon: AlertTriangle,
        gaugeValue: report.overallRisk
      };
    } else if (report.overallRisk >= 50) {
      return {
        title: "Moderate Risk - Review Required",
        subtitle: "Address flagged issues before publishing",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        icon: AlertCircle,
        gaugeValue: report.overallRisk
      };
    } else if (report.overallRisk >= 30) {
      return {
        title: "Low Risk - Minor Issues",
        subtitle: "Ready with small adjustments",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        icon: Info,
        gaugeValue: report.overallRisk
      };
    } else {
      return {
        title: "Ready for Monetization",
        subtitle: "Excellent compliance standing",
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        icon: Award,
        gaugeValue: report.overallRisk
      };
    }
  };

  const verdict = getProfessionalVerdict();
  const VerdictIcon = verdict.icon;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Create a canvas from the report
      const reportElement = document.getElementById('audit-report-content');
      if (!reportElement) {
        throw new Error('Report element not found');
      }
      
      // In production, use html2canvas and jsPDF libraries
      // For now, show success message
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert("PDF export feature - In production, this generates a professional PDF report with:\n\n• Monetization Readiness Score\n• Policy Compliance Summary\n• AI Analysis & Recommendations\n• Platform-Specific Insights");
    } catch (error) {
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const summary = `🔍 TubeClear AI Audit Report\n\nPlatform: ${getPlatformDisplayName(platform)}\nRisk Score: ${report.overallRisk}/100\nMonetization: ${100 - report.overallRisk}% Ready\nPolicies Passed: ${passCount}/${totalPolicies}\n\n#TubeClearAI #ContentSafety`;
      
      await navigator.clipboard.writeText(summary);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      
      // Show toast notification
      alert("Report summary copied to clipboard! Ready to share on WhatsApp/Twitter");
    } catch (error) {
      alert("Failed to copy. Please try again.");
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: `TubeClear AI Audit Report - ${getPlatformDisplayName(platform)}`,
        text: `Video Risk Score: ${report.overallRisk}/100\nCompliance: ${compliancePercentage}%\n${passCount}/${totalPolicies} policies passed`,
        url: window.location.href
      };
      
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
        alert("Report summary copied to clipboard!");
      }
    } catch (error) {
      // Silently handle share errors
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* QUICK FIX SUMMARY BANNER - Shows when policies fail */}
      {failedPolicies.length > 0 && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-xl border-2 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  ⚠️ Quick Fix Summary - {failCount} Issue{failCount > 1 ? 's' : ''} Found
                </h3>
                <div className="space-y-2">
                  {failedPolicies.slice(0, 3).map((policy, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-red-400 mt-0.5">•</span>
                      <div>
                        <span className="font-semibold text-white">{policy.rule}</span>
                        <p className="text-slate-300 text-xs mt-0.5">{policy.insight.replace('Fix: ', '')}</p>
                      </div>
                    </div>
                  ))}
                  {failedPolicies.length > 3 && (
                    <p className="text-slate-400 text-xs italic mt-2">
                      + {failedPolicies.length - 3} more issue{failedPolicies.length - 3 > 1 ? 's' : ''} in detailed grid below
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header - Glassmorphism Effect */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
        
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${verdict.bgColor} ${verdict.borderColor} border-2`}>
                <Shield className={`w-8 h-8 ${verdict.color}`} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  TubeClear AI Professional Audit
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-slate-700/50 border-slate-600 text-slate-300">
                    {getPlatformIcon(platform)}
                    <span className="ml-1">{getPlatformDisplayName(platform)}</span>
                  </Badge>
                  <Badge variant="outline" className="bg-slate-700/50 border-slate-600 text-slate-300 text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    v{new Date().toISOString().split('T')[0]}
                  </Badge>
                  {isGuest && (
                    <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400 text-xs">
                      👤 Guest Mode
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                disabled={copiedLink}
                className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white"
              >
                {copiedLink ? (
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copiedLink ? "Copied!" : "Copy Link"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Professional Verdict Card with Gauge */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Verdict Text */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <VerdictIcon className={`w-6 h-6 ${verdict.color}`} />
                  <h2 className="text-xl font-bold text-white">{verdict.title}</h2>
                </div>
                <p className="text-slate-400 mb-4">{verdict.subtitle}</p>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className={`${verdict.bgColor} ${verdict.borderColor} border rounded-lg p-3`}>
                    <div className="text-2xl font-bold text-white">{report.overallRisk}/100</div>
                    <div className="text-xs text-slate-400">Risk Score</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-400">{passCount}</div>
                    <div className="text-xs text-slate-400">Policies Passed</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-400">{failCount}</div>
                    <div className="text-xs text-slate-400">Issues Found</div>
                  </div>
                </div>
              </div>

              {/* Gauge Meter - MONETIZATION READINESS */}
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="10"
                    />
                    <motion.circle
                      initial={{ strokeDashoffset: 283 }}
                      animate={{ 
                        strokeDashoffset: 283 - (283 * (100 - report.overallRisk)) / 100 
                      }}
                      transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={100 - report.overallRisk >= 70 ? "#22c55e" : 
                              100 - report.overallRisk >= 50 ? "#eab308" : 
                              100 - report.overallRisk >= 30 ? "#f97316" : "#ef4444"}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={283}
                      style={{ willChange: 'stroke-dashoffset' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                      className={`text-3xl font-bold ${
                        100 - report.overallRisk >= 70 ? "text-green-400" : 
                        100 - report.overallRisk >= 50 ? "text-yellow-400" : 
                        100 - report.overallRisk >= 30 ? "text-orange-400" : "text-red-400"
                      }`}
                    >
                      {100 - report.overallRisk}%
                    </motion.div>
                    <div className="text-xs text-slate-400 mt-1 text-center leading-tight">
                      Monetization<br/>Ready
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Scans Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Scans
                </CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Your last 5 scanned videos
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <RecentScansList />
          </CardContent>
        </Card>
      </motion.div>

      {/* Policy Compliance Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Policy Compliance Grid
                </CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  {totalPolicies} policies checked • {compliancePercentage}% compliant
                </p>
              </div>
              <Badge variant="outline" className="bg-slate-700/50 border-slate-600 text-slate-300">
                <Shield className="w-3 h-3 mr-1" />
                Live 2026 Policies
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px] w-full">
              <div className="divide-y divide-slate-700/50">
                {policyCompliance.map((policy, index) => (
                  <motion.div
                    key={policy.policyId}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {policy.status === "PASS" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{policy.rule}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                policy.severity === 'critical' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                policy.severity === 'high' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' :
                                policy.severity === 'medium' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' :
                                'bg-blue-500/20 border-blue-500/50 text-blue-400'
                              }`}
                            >
                              {policy.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className={
                              policy.status === "PASS" 
                                ? "text-green-400" 
                                : "text-red-400"
                            }>
                              [{policy.status}]
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-300">{policy.insight}</span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={policy.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors group"
                        title="View official policy"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Additional Insights */}
      {report.whyAnalysis && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl">
            <CardHeader className="border-b border-slate-700/50">
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                AI Analysis & Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-400 mb-2">Why This Score?</h4>
                  <p className="text-sm text-slate-300">{report.whyAnalysis.riskReason}</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-400 mb-2">How To Fix</h4>
                  <p className="text-sm text-slate-300">Based on {report.whyAnalysis.exactViolations.length} policy violations detected. Review compliance grid above for specific fixes.</p>
                </div>
              </div>
              
              {report.disclosureVerified && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h4 className="font-semibold text-green-400">Disclosure Verified</h4>
                  </div>
                  <p className="text-sm text-slate-300 mt-2">
                    Proper disclosures detected - reduced penalty risk
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Deep Scan Prompt */}
      {report.overallRisk > 30 && onRunDeepScan && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 backdrop-blur-xl border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <div>
                    <h4 className="font-semibold text-yellow-400">Recommend Deep Scan</h4>
                    <p className="text-sm text-slate-300">
                      Risk score above 30% - Comprehensive analysis recommended
                    </p>
                  </div>
                </div>
                <Button
                  onClick={onRunDeepScan}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold border-2 border-black shadow-lg"
                >
                  🔍 Run Deep Scan
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Privacy Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-4 border-t border-slate-700/50"
      >
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Lock className="w-3 h-3" />
          <span>100% Secure & Private. Data is processed in real-time and not stored on our servers.</span>
        </div>
      </motion.div>
    </div>
  );
};

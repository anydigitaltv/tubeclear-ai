import { useEffect, useState } from "react";
import { useVideoScan } from "@/contexts/VideoScanContext";
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export const GlobalSafetyMeter = () => {
  const { getScanHistory } = useVideoScan();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScanHistory();
  }, []);

  const loadScanHistory = async () => {
    try {
      const history = await getScanHistory();
      setScans(history);
    } catch (error) {
      console.error("Failed to load scan history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate global safety score
  const totalScans = scans.length;
  const safeScans = scans.filter(s => s.scan_result?.finalVerdict === "PASS").length;
  const flaggedScans = scans.filter(s => s.scan_result?.finalVerdict === "FLAGGED").length;
  const failedScans = scans.filter(s => s.scan_result?.finalVerdict === "FAILED").length;
  
  const globalSafetyScore = totalScans > 0 
    ? Math.round((safeScans / totalScans) * 100) 
    : 100;

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getBgGradient = (score: number) => {
    if (score >= 80) return "from-green-500/20 to-green-600/10";
    if (score >= 50) return "from-yellow-500/20 to-yellow-600/10";
    return "from-red-500/20 to-red-600/10";
  };

  const getBorderColor = (score: number) => {
    if (score >= 80) return "border-green-500/30";
    if (score >= 50) return "border-yellow-500/30";
    return "border-red-500/30";
  };

  // Get reasoning text
  const getReasoning = () => {
    if (totalScans === 0) {
      return {
        en: "No scans yet. Start scanning to see your brand health score.",
        urdu: "Abhi tak koi scan nahi hua. Brand health score dekhne ke liye scan shuru karein."
      };
    }

    if (globalSafetyScore === 100) {
      return {
        en: `Perfect! All ${totalScans} scanned videos are compliant with platform policies.`,
        urdu: `Bilkul theek! Sab ${totalScans} scanned videos platform policies ke mutabiq hain.`
      };
    }

    // Find latest violation for detailed reasoning
    const latestViolation = scans
      .filter(s => s.scan_result?.finalVerdict !== "PASS")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (latestViolation) {
      const platform = latestViolation.platform_id?.toUpperCase() || "PLATFORM";
      const issueCount = latestViolation.scan_result?.issues?.length || 1;
      
      return {
        en: `${globalSafetyScore}% Safe: ${issueCount} violation(s) found in ${platform}. ${failedScans} video(s) need immediate attention.`,
        urdu: `${globalSafetyScore}% Mehfooz: ${platform} mein ${issueCount} khilafian mili hain. ${failedScans} video(s) ko fori tawajjo chahiye.`
      };
    }

    return {
      en: `${globalSafetyScore}% Safe: Most content is compliant. Keep monitoring for policy updates.`,
      urdu: `${globalSafetyScore}% Mehfooz: Zyadatar content compliant hai. Policy updates ke liye monitoring jari rakhein.`
    };
  };

  const reasoning = getReasoning();
  const scoreColor = getScoreColor(globalSafetyScore);
  const bgGradient = getBgGradient(globalSafetyScore);
  const borderColor = getBorderColor(globalSafetyScore);

  // Calculate gauge stroke
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (circumference * globalSafetyScore) / 100;

  if (loading) {
    return (
      <div className="glass-card border border-slate-700 p-6 rounded-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/2 mx-auto"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass-card border ${borderColor} bg-gradient-to-br ${bgGradient} p-6 rounded-xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-bold text-white">Brand Safety Score</h2>
        </div>
        {totalScans > 0 && (
          <div className="text-xs text-slate-400">
            Based on {totalScans} scan{totalScans !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Gauge and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Circular Gauge */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-700"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`${scoreColor} transition-all duration-1000 ease-out`}
              />
            </svg>
            
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-4xl font-bold ${scoreColor}`}>
                {globalSafetyScore}%
              </div>
              <div className="text-xs text-slate-400 mt-1">Safe</div>
            </div>
          </div>
        </div>

        {/* Stats Breakdown */}
        <div className="space-y-3">
          {/* Safe Videos */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-sm text-slate-300">Safe Videos</span>
            </div>
            <span className="text-lg font-bold text-green-400">{safeScans}</span>
          </div>

          {/* Flagged Videos */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-slate-300">Flagged</span>
            </div>
            <span className="text-lg font-bold text-yellow-400">{flaggedScans}</span>
          </div>

          {/* Failed Videos */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              <span className="text-sm text-slate-300">Needs Attention</span>
            </div>
            <span className="text-lg font-bold text-red-400">{failedScans}</span>
          </div>
        </div>
      </div>

      {/* Reasoning - Bilingual */}
      <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
          <p className="text-sm text-slate-300 leading-relaxed">
            {reasoning.en}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
          <p className="text-sm text-slate-400 italic leading-relaxed">
            {reasoning.urdu}
          </p>
        </div>
      </div>

      {/* Improvement Tip */}
      {globalSafetyScore < 100 && (
        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-xs text-blue-400">
            💡 <strong>Tip:</strong> Re-audit flagged videos after making changes to improve your score. 
            Smart scanning saves up to 90% tokens!
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default GlobalSafetyMeter;

// Token Saved Counter Widget
export const TokenSavedCounter = ({ tokensSaved }: { tokensSaved: number }) => (
  <div className="glass-card border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/5 p-4 rounded-xl">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-400 mb-1">Tokens Saved</div>
        <div className="text-2xl font-bold text-green-400">${tokensSaved.toFixed(2)}</div>
      </div>
      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
        <span className="text-2xl">💰</span>
      </div>
    </div>
    <div className="mt-2 text-xs text-green-400">
      Saved by intelligent re-scanning
    </div>
  </div>
);

// Videos in Vault Widget
export const VideosInVaultWidget = ({ 
  totalVideos, 
  platformsConnected 
}: { 
  totalVideos: number;
  platformsConnected: number;
}) => (
  <div className="glass-card border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4 rounded-xl">
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="text-xs text-slate-400 mb-1">Videos in Vault</div>
        <div className="text-2xl font-bold text-blue-400">{totalVideos}</div>
      </div>
      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
        <Shield className="w-6 h-6 text-blue-400" />
      </div>
    </div>
    <div className="text-xs text-slate-400">
      {platformsConnected} platform{platformsConnected !== 1 ? 's' : ''} connected
    </div>
  </div>
);

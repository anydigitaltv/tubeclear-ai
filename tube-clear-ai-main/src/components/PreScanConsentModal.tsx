import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Scan, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface PreScanConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToDeepScan: () => void;
  onSkipDeepScan: () => void;
  preScanResult: {
    riskScore: number;
    verdict: "PASS" | "FLAGGED" | "FAILED";
    issues: string[];
    requiresDeepScan: boolean;
  } | null;
}

export const PreScanConsentModal = ({
  isOpen,
  onClose,
  onProceedToDeepScan,
  onSkipDeepScan,
  preScanResult,
}: PreScanConsentModalProps) => {
  if (!preScanResult) return null;

  const getVerdictConfig = () => {
    switch (preScanResult.verdict) {
      case "PASS":
        return {
          icon: <CheckCircle2 className="w-8 h-8 text-green-500" />,
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          message: "Pre-Scan Safe - Metadata looks good!",
          urduMessage: "Pre-Scan mehfooz hai - Metadata theek lag raha hai!",
        };
      case "FLAGGED":
        return {
          icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          message: "Some Issues Detected in Metadata",
          urduMessage: "Metadata mein kuch maslay detect hue hain",
        };
      case "FAILED":
        return {
          icon: <XCircle className="w-8 h-8 text-red-500" />,
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          message: "Critical Violations Found",
          urduMessage: "Naqde khilafiyan mili hain",
        };
    }
  };

  const config = getVerdictConfig();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Pre-Scan Results
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Verdict Card */}
          <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-xl p-6`}>
            <div className="flex items-center gap-4 mb-4">
              {config.icon}
              <div>
                <h3 className={`text-lg font-bold ${config.color}`}>{config.message}</h3>
                <p className="text-sm text-slate-400">{config.urduMessage}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-white">{preScanResult.riskScore}/100</div>
                <div className="text-xs text-slate-400">Risk Score</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <Badge variant="outline" className={`${config.color} border-current`}>
                  {preScanResult.verdict}
                </Badge>
                <div className="text-xs text-slate-400 mt-1">Verdict</div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          {preScanResult.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white">Detected Issues:</h4>
              <ul className="space-y-1">
                {preScanResult.issues.map((issue, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-red-400">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deep Scan Options */}
          <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Next Steps
            </h4>

            {preScanResult.requiresDeepScan ? (
              <>
                <p className="text-sm text-slate-300">
                  We recommend a <strong>Deep Scan</strong> to analyze video frames and audio for complete compliance.
                </p>
                <p className="text-xs text-slate-400 italic">
                  Video aur audio ka mukammal jaiza lene ke liye Deep Scan ki tajweez ki jati hai.
                </p>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={onProceedToDeepScan}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    🔍 Proceed to Deep Scan (Video + Audio)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onSkipDeepScan}
                    className="flex-1 border-slate-600"
                  >
                    Skip - Use Pre-Scan Only
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-green-400">
                  ✓ Pre-Scan shows no issues. Deep scan is optional.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={onProceedToDeepScan}
                    className="flex-1 border-slate-600"
                  >
                    Optional: Run Deep Scan Anyway
                  </Button>
                  <Button
                    onClick={onSkipDeepScan}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    ✓ Complete - Pre-Scan is Sufficient
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Token Savings Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-blue-400">
              💡 <strong>Smart Scanning:</strong> If you skip deep scan, we save tokens by only analyzing metadata. 
              You can always re-audit later with targeted scanning.
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default PreScanConsentModal;

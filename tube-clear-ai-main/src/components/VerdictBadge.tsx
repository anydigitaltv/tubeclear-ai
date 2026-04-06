import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { FinalVerdict } from "@/contexts/VideoScanContext";

interface VerdictBadgeProps {
  verdict: FinalVerdict;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export const VerdictBadge = ({ 
  verdict, 
  size = "md",
  showIcon = true 
}: VerdictBadgeProps) => {
  const getConfig = () => {
    switch (verdict) {
      case "PASS":
        return {
          color: "bg-green-500/10 border-green-500 text-green-400",
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: "✅ PASS",
        };
      case "FLAGGED":
        return {
          color: "bg-yellow-500/10 border-yellow-500 text-yellow-400",
          icon: <AlertTriangle className="w-4 h-4" />,
          label: "⚠️ FLAGGED",
        };
      case "FAILED":
        return {
          color: "bg-red-500/10 border-red-500 text-red-400",
          icon: <XCircle className="w-4 h-4" />,
          label: "❌ FAILED",
        };
      default:
        return {
          color: "bg-gray-500/10 border-gray-500 text-gray-400",
          icon: null,
          label: verdict,
        };
    }
  };

  const config = getConfig();
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${sizeClasses[size]} font-semibold flex items-center gap-1.5`}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};

export default VerdictBadge;

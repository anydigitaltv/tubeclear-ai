import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface GlobalSafetyMeterProps {
  safetyScore: number;
  totalVideos: number;
  totalScans: number;
  isLoading?: boolean;
}

export const GlobalSafetyMeter = ({
  safetyScore,
  totalVideos,
  totalScans,
  isLoading = false,
}: GlobalSafetyMeterProps) => {
  // Determine safety status
  const getSafetyStatus = (score: number) => {
    if (score >= 90) return {
      label: "Excellent",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/50",
      icon: CheckCircle2,
      message: "Brand health is optimal",
    };
    if (score >= 70) return {
      label: "Good",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/50",
      icon: Shield,
      message: "Minor improvements needed",
    };
    if (score >= 50) return {
      label: "Fair",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/50",
      icon: AlertTriangle,
      message: "Attention required",
    };
    return {
      label: "Critical",
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/50",
      icon: AlertTriangle,
      message: "Immediate action needed",
    };
  };

  const status = getSafetyStatus(safetyScore);
  const StatusIcon = status.icon;

  // Calculate gauge rotation
  const rotation = (safetyScore / 100) * 180 - 90; // -90 to 90 degrees
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (safetyScore / 100) * circumference;

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Shield className="w-5 h-5 text-primary" />
          Global Safety Meter
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            Brand Health Monitor
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Gauge Chart */}
            <div className="relative flex items-center justify-center py-4">
              <svg width="200" height="120" viewBox="0 0 200 120" className="drop-shadow-lg">
                {/* Background arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                
                {/* Progress arc */}
                <motion.path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={
                    safetyScore >= 90 ? "#22c55e" :
                    safetyScore >= 70 ? "#3b82f6" :
                    safetyScore >= 50 ? "#eab308" : "#ef4444"
                  }
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />

                {/* Center text */}
                <text
                  x="100"
                  y="85"
                  textAnchor="middle"
                  className="fill-white text-4xl font-bold"
                  style={{ fontSize: "36px", fontWeight: "bold" }}
                >
                  {safetyScore}%
                </text>
                
                <text
                  x="100"
                  y="105"
                  textAnchor="middle"
                  className="fill-muted-foreground text-sm"
                  style={{ fontSize: "14px" }}
                >
                  {status.label}
                </text>
              </svg>

              {/* Glow effect */}
              <div
                className="absolute inset-0 blur-3xl opacity-20"
                style={{
                  background: `radial-gradient(circle, ${
                    safetyScore >= 90 ? '#22c55e' :
                    safetyScore >= 70 ? '#3b82f6' :
                    safetyScore >= 50 ? '#eab308' : '#ef4444'
                  } 0%, transparent 70%)`,
                }}
              />
            </div>

            {/* Status Message */}
            <div className={`rounded-lg p-4 border ${status.bgColor} ${status.borderColor}`}>
              <div className="flex items-start gap-3">
                <StatusIcon className={`w-5 h-5 mt-0.5 ${status.color}`} />
                <div>
                  <p className={`font-semibold ${status.color}`}>{status.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {totalVideos} videos and {totalScans} scans
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{totalVideos}</p>
                <p className="text-xs text-muted-foreground">Videos in Vault</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{totalScans}</p>
                <p className="text-xs text-muted-foreground">Total Scans</p>
              </div>
            </div>

            {/* Recommendation */}
            {safetyScore < 90 && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">Recommendation</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {safetyScore < 70
                        ? "Run deep scans on flagged videos to improve safety score"
                        : "Review recent policy changes and update content"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Token Saved Counter Widget
export const TokenSavedCounter = ({ tokensSaved }: { tokensSaved: number }) => {
  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tokens Saved</p>
            <p className="text-3xl font-bold text-white">
              {tokensSaved.toLocaleString()}
            </p>
            <Badge variant="outline" className="mt-2 text-xs border-purple-500/50 text-purple-400">
              Lifetime Savings
            </Badge>
          </div>
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Videos in Vault Widget
export const VideosInVaultWidget = ({ 
  totalVideos, 
  platformsConnected 
}: { 
  totalVideos: number;
  platformsConnected: number;
}) => {
  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Videos in Vault</p>
            <p className="text-3xl font-bold text-white">
              {totalVideos.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                {platformsConnected} Platform{platformsConnected !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

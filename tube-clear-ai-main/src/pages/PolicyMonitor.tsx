import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause,
  Trash2,
  RefreshCw,
  Clock
} from "lucide-react";
import { policyMonitor, type MonitorStats } from "@/utils/BackgroundPolicyMonitor";
import { toast } from "sonner";

const BackgroundPolicyMonitorUI = () => {
  const [stats, setStats] = useState<MonitorStats>({
    lastCheck: null,
    totalChecks: 0,
    updatesDetected: 0,
    alertsSent: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [nextCheck, setNextCheck] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    checkStatus();
  }, []);

  const loadStats = () => {
    const currentStats = policyMonitor.getStats();
    setStats(currentStats);
  };

  const checkStatus = () => {
    const status = policyMonitor.getStatus();
    setIsRunning(status.isRunning);
    setNextCheck(status.nextCheck);
  };

  const handleStart = () => {
    policyMonitor.startMonitoring();
    toast.success("Policy Monitor Started", {
      description: "Background monitoring activated. Checking every 24 hours.",
    });
    checkStatus();
  };

  const handleStop = () => {
    policyMonitor.stopMonitoring();
    toast.info("Policy Monitor Stopped", {
      description: "Background monitoring deactivated.",
    });
    checkStatus();
  };

  const handleManualCheck = async () => {
    toast.info("Checking for policy updates...", {
      description: "This may take a moment.",
    });
    await policyMonitor.manualCheck();
    loadStats();
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all monitor data?")) {
      policyMonitor.clearData();
      toast.success("Monitor data cleared");
      loadStats();
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getTimeUntilNextCheck = () => {
    if (!nextCheck) return "Not scheduled";
    const now = new Date().getTime();
    const next = new Date(nextCheck).getTime();
    const diff = next - now;
    
    if (diff <= 0) return "Due now";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gradient mb-2">
          Background Policy Monitor
        </h1>
        <p className="text-muted-foreground">
          Automatic policy change detection and violation alerts
        </p>
      </div>

      {/* Status Card */}
      <Card className={`glass-card border mb-6 ${
        isRunning ? "border-green-500/30" : "border-yellow-500/30"
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isRunning ? "bg-green-500/20" : "bg-yellow-500/20"
              }`}>
                {isRunning ? (
                  <Shield className="w-8 h-8 text-green-400" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isRunning ? "Monitoring Active" : "Monitoring Inactive"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRunning 
                    ? `Next check in: ${getTimeUntilNextCheck()}`
                    : "Start monitoring to receive policy alerts"
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Monitor
                </Button>
              ) : (
                <Button
                  onClick={handleStop}
                  variant="outline"
                  className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="glass-card border border-border/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Last Check</p>
                <p className="text-lg font-semibold text-white">
                  {formatDate(stats.lastCheck)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-border/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Total Checks</p>
                <p className="text-2xl font-bold text-white">{stats.totalChecks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-border/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-sm text-muted-foreground">Updates Found</p>
                <p className="text-2xl font-bold text-white">{stats.updatesDetected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-border/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm text-muted-foreground">Alerts Sent</p>
                <p className="text-2xl font-bold text-white">{stats.alertsSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="glass-card border border-border/30 mb-6">
        <CardHeader className="border-b border-border/20">
          <CardTitle className="text-white">Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleManualCheck}
              className="bg-primary hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Now
            </Button>
            <Button
              onClick={handleClearData}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="glass-card border border-border/30">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            How It Works
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Background Monitoring</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically checks for policy updates every 24 hours in the background.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Video Impact Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  When a policy changes, the system checks your scanned videos to see which ones might be affected.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Instant Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Receive notifications with [VIOLATION WARNING] for videos that need re-scan due to policy changes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="glass-card border border-blue-500/20 mt-6 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bell className="w-6 h-6 text-blue-400 shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-400 mb-1">Pro Tip</h4>
              <p className="text-sm text-muted-foreground">
                Keep the monitoring active to stay ahead of policy changes. When YouTube, TikTok, or other platforms update their rules, 
                you'll be instantly notified if any of your videos need re-scanning. This helps you fix issues before they become violations!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackgroundPolicyMonitorUI;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Play,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Key,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  loadPendingScans,
  removePendingScan,
  updatePendingScan,
  clearCompletedScans,
  type ScanState,
} from "@/utils/scanHelpers";

export const PendingScanQueue = () => {
  const navigate = useNavigate();
  const [pendingScans, setPendingScans] = useState<ScanState[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanState | null>(null);

  useEffect(() => {
    loadScans();
    const interval = setInterval(loadScans, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const loadScans = () => {
    const scans = loadPendingScans();
    setPendingScans(scans);
  };

  const getStatusBadge = (status: ScanState["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">
            <Play className="h-3 w-3 mr-1" />
            Running
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Paused
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
    }
  };

  const handleResume = (scan: ScanState) => {
    setSelectedScan(scan);
    // Navigate to scan page with resume data
    navigate("/", {
      state: {
        resumeScan: scan,
        videoUrl: scan.videoUrl,
        platformId: scan.platformId,
      },
    });
  };

  const handleRemove = (scanId: string) => {
    removePendingScan(scanId);
    loadScans();
  };

  const handleClearCompleted = () => {
    clearCompletedScans();
    loadScans();
  };

  const getProgressPercent = (scan: ScanState) => {
    if (scan.status === "completed") return 100;
    return Math.round((scan.phase / scan.totalPhases) * 100);
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (pendingScans.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No pending scans</p>
            <p className="text-sm mt-2">All scans are complete or no scans in queue</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Scan Queue
            <Badge variant="outline">{pendingScans.length}</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCompleted}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Completed
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API Key Warning */}
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <Key className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">API Key Required</AlertTitle>
          <AlertDescription className="text-yellow-500/90">
            Agar API keys ki limit khatam ho gayi hai to pehle new keys add karein.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => navigate("/license-keys")}
            >
              Add Keys <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>

        {/* Scan List */}
        <div className="space-y-3">
          {pendingScans.map((scan) => (
            <div
              key={scan.id}
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-sm truncate">
                      {scan.videoUrl}
                    </h3>
                    {getStatusBadge(scan.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Platform: {scan.platformId.toUpperCase()}</span>
                    <span>Phase: {scan.phase}/{scan.totalPhases}</span>
                    <span>{getTimeAgo(scan.lastUpdatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                    style={{ width: `${getProgressPercent(scan)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getProgressPercent(scan)}% Complete
                </p>
              </div>

              {/* Error Message */}
              {scan.error && (
                <Alert className="mb-3 border-red-500/50 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-500/90 text-sm">
                    {scan.error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {(scan.status === "failed" || scan.status === "paused" || scan.status === "pending") && (
                  <Button
                    size="sm"
                    onClick={() => handleResume(scan)}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Resume Scan
                  </Button>
                )}

                {scan.status === "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    View Results
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemove(scan.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-500">
                {pendingScans.filter(s => s.status === "running" || s.status === "pending").length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">
                {pendingScans.filter(s => s.status === "failed").length}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">
                {pendingScans.filter(s => s.status === "completed").length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

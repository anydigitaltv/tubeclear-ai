import { useState } from "react";
import { AlertTriangle, X, Shield, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useGhostGuard, type ViolationAlert } from "@/contexts/GhostGuardContext";
import { useContentChangeTracker, type ContentChange } from "@/contexts/ContentChangeTrackerContext";

const ViolationAlertPanel = () => {
  const {
    alerts,
    unacknowledgedCount,
    acknowledgeAlert,
    dismissAllAlerts,
    isScanning,
    scanOldData,
  } = useGhostGuard();
  
  const { changes, acknowledgeChange, unacknowledgedChanges } = useContentChangeTracker();
  
  const [isOpen, setIsOpen] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      default:
        return "bg-blue-500 text-white";
    }
  };

  const getTypeLabel = (type: ViolationAlert["type"]) => {
    switch (type) {
      case "new_policy_violation":
        return "Policy Violation";
      case "content_change":
        return "Content Changed";
      case "misleading_content":
        return "Misleading Content";
      default:
        return "Alert";
    }
  };

  const handleRescan = (videoId: string) => {
    // In production, this would trigger a rescan
    console.log(`Rescanning video: ${videoId}`);
    // Navigate to scan page with video ID
    window.location.href = `/?video=${videoId}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Shield className="h-5 w-5" />
          {(unacknowledgedCount > 0 || unacknowledgedChanges > 0) && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {unacknowledgedCount + unacknowledgedChanges}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Ghost Guard Alerts
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="destructive">{unacknowledgedCount} Violations</Badge>
              <Badge variant="secondary">{unacknowledgedChanges} Changes</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={scanOldData}
                disabled={isScanning}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isScanning ? "animate-spin" : ""}`} />
                Scan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissAllAlerts}
                disabled={unacknowledgedCount === 0}
              >
                Dismiss All
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            {/* Violation Alerts */}
            {alerts.filter((a) => !a.acknowledged).length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground">Policy Violations</h4>
                {alerts
                  .filter((a) => !a.acknowledged)
                  .map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="font-medium text-sm">{alert.videoTitle}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {alert.violatedRule.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(alert.violatedRule.severity)}>
                              {alert.violatedRule.severity}
                            </Badge>
                            <Badge variant="outline">{getTypeLabel(alert.type)}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleRescan(alert.videoId)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Rescan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Content Changes */}
            {changes.filter((c) => !c.acknowledged).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Content Changes</h4>
                {changes
                  .filter((c) => !c.acknowledged)
                  .map((change) => (
                    <div
                      key={change.id}
                      className={`p-3 rounded-lg border ${
                        change.isMisleading
                          ? "border-orange-500/30 bg-orange-500/10"
                          : "border-border bg-secondary/50"
                      } space-y-2`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{change.videoId}</span>
                            {change.isMisleading && (
                              <Badge variant="destructive">Misleading</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium capitalize">{change.field}</span> changed
                          </p>
                          <div className="mt-2 text-xs space-y-1">
                            <p className="text-muted-foreground">
                              <span className="line-through">{change.oldValue.slice(0, 50)}...</span>
                            </p>
                            <p className="text-foreground">
                              {change.newValue.slice(0, 50)}...
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => acknowledgeChange(change.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleRescan(change.videoId)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Rescan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeChange(change.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Empty state */}
            {unacknowledgedCount === 0 && unacknowledgedChanges === 0 && (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active alerts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All your content is compliant with current policies
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ViolationAlertPanel;

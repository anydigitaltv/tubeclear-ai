import { useState } from "react";
import { Shield, AlertTriangle, Check, X, RefreshCw, Bell, Smartphone, Ban, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIDoctor, type PolicyViolation, type AdminAlert } from "@/contexts/AIDoctorContext";
import { cn } from "@/lib/utils";

const AdminPanel = () => {
  const {
    violations,
    adminAlerts,
    disabledFeatures,
    reviewViolation,
    enableFeature,
    sendAdminAlert,
  } = useAIDoctor();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeViolations = violations.filter((v) => v.status === "active");
  const reviewedViolations = violations.filter((v) => v.status === "reviewed" || v.status === "dismissed");

  const handleReview = (violationId: string, action: "approve" | "dismiss") => {
    reviewViolation(violationId, action);
  };

  const handleEnableFeature = (feature: string) => {
    enableFeature(feature);
  };

  const handleTestAlert = async () => {
    setIsRefreshing(true);
    await sendAdminAlert({
      type: "critical_issue",
      message: "Test alert from Admin Panel",
      violationId: "",
    });
    setIsRefreshing(false);
  };

  const getSeverityColor = (severity: PolicyViolation["severity"]) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-500 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      default: return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gradient">AI Doctor Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Review and manage auto-disabled features</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleTestAlert} disabled={isRefreshing}>
          <Bell className="h-4 w-4 mr-2" />
          Test Alert
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeViolations.length}</p>
                <p className="text-xs text-muted-foreground">Active Violations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <X className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{disabledFeatures.length}</p>
                <p className="text-xs text-muted-foreground">Disabled Features</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviewedViolations.length}</p>
                <p className="text-xs text-muted-foreground">Reviewed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminAlerts.filter((a) => a.delivered).length}</p>
                <p className="text-xs text-muted-foreground">Alerts Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="violations" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="removed">Removed Features</TabsTrigger>
          <TabsTrigger value="features">Active Checks</TabsTrigger>
          <TabsTrigger value="alerts">Alert History</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className="text-lg">Active Violations</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {activeViolations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No active violations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeViolations.map((violation) => (
                      <ViolationCard
                        key={violation.id}
                        violation={violation}
                        onReview={handleReview}
                        getSeverityColor={getSeverityColor}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="removed" className="mt-4">
          <Card className="glass-card border-red-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                <Ban className="h-5 w-5" />
                Policy Removal Log (Store Compliance)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {violations.filter(v => v.status === "active" || v.status === "disabled").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>No features currently removed. All systems compliant.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {violations
                      .filter(v => v.status === "active" || v.status === "disabled")
                      .map((v) => (
                        <div key={v.id} className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-bold text-red-400 uppercase text-xs tracking-wider">{v.feature}</h4>
                              <p className="text-sm text-white font-medium">{v.rule}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-500/30 text-red-400">
                                  AUTO-REMOVED: {new Date(v.detectedAt).toLocaleDateString()}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Info className="h-3 w-3" /> Store Policy Enforcement
                                </span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="text-xs hover:bg-red-500/10 text-red-400" onClick={() => handleReview(v.id, "dismiss")}>
                              Re-Evaluate
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className="text-lg">Disabled Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {disabledFeatures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>All features are enabled</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {disabledFeatures.map((feature) => (
                      <div key={feature} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                        <div className="flex items-center gap-3">
                          <X className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{feature}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleEnableFeature(feature)}>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Enable
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Alert History (Admin: +923154414981)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {adminAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No alerts sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {adminAlerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ViolationCard = ({
  violation,
  onReview,
  getSeverityColor,
}: {
  violation: PolicyViolation;
  onReview: (id: string, action: "approve" | "dismiss") => void;
  getSeverityColor: (severity: PolicyViolation["severity"]) => string;
}) => (
  <div className="p-4 rounded-lg bg-secondary/30 border border-border/30 space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold">{violation.feature}</h4>
          <Badge className={cn("text-xs", getSeverityColor(violation.severity))}>
            {violation.severity}
          </Badge>
          <Badge variant="outline" className="text-xs">{violation.platform}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{violation.rule}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Detected: {new Date(violation.detectedAt).toLocaleString()}
        </p>
      </div>
      {violation.autoDisabled && (
        <Badge variant="destructive" className="text-xs">Auto-Disabled</Badge>
      )}
    </div>
    <div className="flex gap-2">
      <Button size="sm" variant="default" onClick={() => onReview(violation.id, "approve")}>
        <Check className="h-3 w-3 mr-1" />
        Keep Disabled
      </Button>
      <Button size="sm" variant="outline" onClick={() => onReview(violation.id, "dismiss")}>
        <RefreshCw className="h-3 w-3 mr-1" />
        Re-enable
      </Button>
    </div>
  </div>
);

const AlertCard = ({ alert }: { alert: AdminAlert }) => (
  <div className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant={alert.delivered ? "default" : "secondary"} className="text-xs">
          {alert.delivered ? "Delivered" : "Pending"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(alert.timestamp).toLocaleString()}
        </span>
      </div>
      <p className="text-sm">{alert.message}</p>
    </div>
  </div>
);

export default AdminPanel;

import { useState, useEffect } from "react";
import { Bug, Activity, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMasterAdmin } from "@/contexts/MasterAdminContext";
import { cn } from "@/lib/utils";

const DeveloperScreen = ({ onClose }: { onClose: () => void }) => {
  const { isMasterAdmin, sendTestSMS } = useMasterAdmin();
  const [ocrLogs, setOcrLogs] = useState<Array<{ timestamp: string; result: any }>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{ timestamp: string; event: string; action: string }>>([]);

  useEffect(() => {
    if (!isMasterAdmin) {
      onClose();
      return;
    }

    // Simulate real-time OCR logs (in production, this would come from actual OCR operations)
    const interval = setInterval(() => {
      const newLog = {
        timestamp: new Date().toISOString(),
        result: {
          confidence: (0.7 + Math.random() * 0.25).toFixed(3),
          amount: Math.floor(Math.random() * 1000) + 100,
          isEdited: Math.random() > 0.9,
        },
      };
      setOcrLogs(prev => [newLog, ...prev].slice(0, 50));
    }, 3000);

    return () => clearInterval(interval);
  }, [isMasterAdmin, onClose]);

  useEffect(() => {
    // Simulate audit logs
    const events = [
      { event: "Feature access", action: "Checked" },
      { event: "Coin deduction", action: "Verified" },
      { event: "API key validation", action: "Passed" },
      { event: "Time limit check", action: "Active" },
    ];

    const interval = setInterval(() => {
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      const newLog = {
        timestamp: new Date().toISOString(),
        event: randomEvent.event,
        action: randomEvent.action,
      };
      setAuditLogs(prev => [newLog, ...prev].slice(0, 50));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isMasterAdmin) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bug className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gradient">Developer Screen</h1>
              <p className="text-sm text-muted-foreground">Real-time AI Doctor monitoring</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OCR Results */}
          <Card className="glass-card border-border/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Live OCR Results</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {ocrLogs.map((log, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {log.result.isEdited && (
                          <Badge variant="destructive" className="text-xs">Edited</Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p>Amount: {log.result.amount}</p>
                        <p>Confidence: {log.result.confidence}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Audit Logs */}
          <Card className="glass-card border-border/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Audit Logs</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {auditLogs.map((log, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-secondary/30 border border-border/30 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{log.event}</span>
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Admin Controls */}
        <Card className="glass-card border-border/20 mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Admin Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={sendTestSMS}>
                Send Test SMS to Admin
              </Button>
              <Button variant="outline">
                Export All Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeveloperScreen;

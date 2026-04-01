import { useState, useEffect } from "react";
import { Key, Check, X, AlertTriangle, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useGuestMode, type GuestKey } from "@/contexts/GuestModeContext";
import { cn } from "@/lib/utils";

interface HandshakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  engineId: string;
}

const HandshakeModal = ({ isOpen, onClose, onProceed, engineId }: HandshakeModalProps) => {
  const { guestKeys, checkKeyValidity, getKeyQuotaStatus, getQuotaColor } = useGuestMode();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<GuestKey["status"] | null>(null);

  const guestKey = guestKeys.find((k) => k.engineId === engineId);
  const quotaStatus = getKeyQuotaStatus(engineId);

  useEffect(() => {
    if (isOpen && guestKey) {
      runValidation();
    }
  }, [isOpen, engineId]);

  const runValidation = async () => {
    setIsValidating(true);
    setValidationResult(null);
    
    const status = await checkKeyValidity(engineId);
    setValidationResult(status);
    setIsValidating(false);
  };

  const canProceed = validationResult === "valid" && quotaStatus !== "red";

  const getQuotaInfo = () => {
    switch (quotaStatus) {
      case "green":
        return { label: "Healthy", color: "bg-green-500/20 text-green-500", icon: Check };
      case "orange":
        return { label: "Limited", color: "bg-orange-500/20 text-orange-500", icon: AlertTriangle };
      case "red":
        return { label: "Exhausted", color: "bg-red-500/20 text-red-500", icon: X };
      default:
        return { label: "Unknown", color: "bg-muted text-muted-foreground", icon: Key };
    }
  };

  const quotaInfo = getQuotaInfo();
  const QuotaIcon = quotaInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-primary/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            API Key Handshake
          </DialogTitle>
          <DialogDescription>
            Verifying key validity and quota before scan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold capitalize">{engineId}</p>
                <p className="text-xs text-muted-foreground">AI Engine</p>
              </div>
            </div>
            {isValidating ? (
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : validationResult === "valid" ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : validationResult ? (
              <X className="h-5 w-5 text-red-500" />
            ) : null}
          </div>

          {isValidating ? (
            <div className="flex items-center justify-center gap-3 p-4">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Validating key...</span>
            </div>
          ) : validationResult && (
            <Card className={cn(
              "border",
              validationResult === "valid" 
                ? "border-green-500/30 bg-green-500/5" 
                : "border-red-500/30 bg-red-500/5"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {validationResult === "valid" ? (
                    <>
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-500">Key Valid</p>
                        <p className="text-sm text-muted-foreground">
                          Your API key is active and ready to use
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-500">Key Invalid</p>
                        <p className="text-sm text-muted-foreground">
                          Please check your API key and try again
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {validationResult === "valid" && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-3">
                <QuotaIcon className={cn("h-5 w-5", getQuotaColor(engineId))} />
                <div>
                  <p className="font-medium">API Quota</p>
                  <p className="text-xs text-muted-foreground">Usage status</p>
                </div>
              </div>
              <Badge className={quotaInfo.color}>{quotaInfo.label}</Badge>
            </div>
          )}

          {quotaStatus === "red" && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-500">
                  Your API quota is exhausted. The scan may fail. Consider using a different engine.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onProceed} disabled={!canProceed || isValidating}>
            {isValidating ? "Checking..." : canProceed ? "Proceed with Scan" : "Invalid Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HandshakeModal;

export const HandshakeStatusBadge = ({ engineId, className }: { engineId: string; className?: string }) => {
  const { guestKeys, getKeyQuotaStatus, getQuotaColor } = useGuestMode();
  const guestKey = guestKeys.find((k) => k.engineId === engineId);
  const quotaStatus = getKeyQuotaStatus(engineId);

  if (!guestKey) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <Key className="h-3 w-3 mr-1" />
        No Key
      </Badge>
    );
  }

  const getIcon = () => {
    switch (quotaStatus) {
      case "green": return <Check className="h-3 w-3" />;
      case "orange": return <AlertTriangle className="h-3 w-3" />;
      case "red": return <X className="h-3 w-3" />;
      default: return <Key className="h-3 w-3" />;
    }
  };

  return (
    <Badge variant="outline" className={cn("text-xs gap-1", getQuotaColor(engineId), className)}>
      {getIcon()}
      <span className="capitalize">{quotaStatus}</span>
    </Badge>
  );
};

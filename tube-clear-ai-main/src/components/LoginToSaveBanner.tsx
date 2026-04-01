import { useState } from "react";
import { LogIn, AlertTriangle, History, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGuestMode } from "@/contexts/GuestModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface LoginToSaveBannerProps {
  variant?: "banner" | "card" | "inline";
  onLoginClick?: () => void;
}

const LoginToSaveBanner = ({ variant = "banner", onLoginClick }: LoginToSaveBannerProps) => {
  const { scanCount, maxScans, remainingScans, canScan, showLimitMessage } = useGuestMode();
  const { signInWithGoogle, loading } = useAuth();

  const handleLogin = async () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      await signInWithGoogle();
    }
  };

  const progressPercent = (scanCount / maxScans) * 100;

  if (variant === "inline") {
    return (
      <Button variant="outline" size="sm" onClick={handleLogin} disabled={loading} className="gap-2">
        <LogIn className="h-4 w-4" />
        Login to Save History
      </Button>
    );
  }

  if (variant === "card") {
    return (
      <Card className="glass-card border-accent/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
              <History className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Guest Mode</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {canScan 
                  ? `${remainingScans} free scans remaining. Login to save history and unlock unlimited scans!`
                  : showLimitMessage()}
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Free scans used</span>
                  <span className="font-medium">{scanCount}/{maxScans}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </div>
          </div>
          <Button className="w-full mt-4" onClick={handleLogin} disabled={loading}>
            <LogIn className="h-4 w-4 mr-2" />
            Login to Save History
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg",
      canScan 
        ? "bg-accent/10 border border-accent/20" 
        : "bg-red-500/10 border border-red-500/20"
    )}>
      <div className="flex items-center gap-3">
        {canScan ? (
          <History className="h-5 w-5 text-accent" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        )}
        <div>
          <p className={cn("text-sm font-medium", !canScan && "text-red-500")}>
            {canScan 
              ? `Guest Mode: ${remainingScans} scans left`
              : "Scan Limit Reached"}
          </p>
          {!canScan && (
            <p className="text-xs text-muted-foreground">{showLimitMessage()}</p>
          )}
        </div>
      </div>
      <Button size="sm" onClick={handleLogin} disabled={loading} className="gap-2">
        <LogIn className="h-4 w-4" />
        Login
      </Button>
    </div>
  );
};

export default LoginToSaveBanner;

export const ScanLimitModal = ({ 
  isOpen, 
  onClose, 
  onLogin 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onLogin: () => void;
}) => {
  const { showLimitMessage } = useGuestMode();
  const { signInWithGoogle, loading } = useAuth();

  const handleLogin = async () => {
    await signInWithGoogle();
    onLogin();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="glass-card border-border/20 max-w-md w-full mx-4">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold">Scan Limit Reached</h2>
            <p className="text-muted-foreground">{showLimitMessage()}</p>
            
            <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-accent" />
                <span className="text-sm">Save scan history</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-accent" />
                <span className="text-sm">Unlock unlimited scans</span>
              </div>
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-accent" />
                <span className="text-sm">Sync across devices</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Maybe Later
              </Button>
              <Button onClick={handleLogin} disabled={loading} className="flex-1">
                <LogIn className="h-4 w-4 mr-2" />
                Login Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState } from "react";
import { motion } from "framer-motion";
import { Youtube, Music2, Instagram, Facebook, PlayCircle, Check, Unplug, Zap, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { validateSocialLink, normalizeUrl, extractUsername } from "@/utils/socialLinkValidator";
import type { Platform, PlatformId } from "@/contexts/PlatformContext";

interface PlatformCardProps {
  platform: Platform;
  onConnect: (accountName: string) => Promise<{ success: boolean; error?: string }>;
  onDisconnect: () => Promise<{ success: boolean; error?: string }>;
}

const iconMap: Record<PlatformId, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  tiktok: Music2,
  instagram: Instagram,
  facebook: Facebook,
  dailymotion: PlayCircle,
};

const PlatformCard = ({ platform, onConnect, onDisconnect }: PlatformCardProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();
  const Icon = iconMap[platform.id];

  // Map platform ID to display name for validation
  const getPlatformDisplayName = (id: PlatformId): string => {
    const map: Record<PlatformId, string> = {
      youtube: "YouTube",
      tiktok: "TikTok",
      instagram: "Instagram",
      facebook: "Facebook",
      dailymotion: "Dailymotion",
    };
    return map[id];
  };

  const handleConnect = async () => {
    if (!accountName.trim()) return;
    
    // Normalize URL (add https:// if missing)
    const normalizedUrl = normalizeUrl(accountName.trim());
    
    // Validate the social link
    const platformName = getPlatformDisplayName(platform.id);
    const validation = validateSocialLink(platformName, normalizedUrl);
    
    if (!validation.valid) {
      setValidationError(validation.msg);
      toast({
        title: "Invalid Link",
        description: validation.msg,
        variant: "destructive",
      });
      return;
    }
    
    // Clear validation error
    setValidationError(null);
    
    // Extract username from URL for display
    const username = extractUsername(platformName, normalizedUrl) || accountName.trim();
    
    setIsConnecting(true);
    const result = await onConnect(username);
    setIsConnecting(false);
    
    if (result.success) {
      setAccountName("");
      setValidationError(null);
      setShowDialog(false);
      toast({
        title: "Platform Connected",
        description: `${platform.name} has been successfully connected.`,
      });
    } else {
      toast({
        title: "Connection Failed",
        description: result.error || "Failed to connect platform. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    const result = await onDisconnect();
    setIsDisconnecting(false);
    
    if (result.success) {
      toast({
        title: "Platform Disconnected",
        description: `${platform.name} has been disconnected.`,
      });
    } else {
      toast({
        title: "Disconnect Failed",
        description: result.error || "Failed to disconnect platform. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={`
            relative overflow-hidden transition-all duration-300 cursor-pointer
            ${platform.connected 
              ? "glass-card border-primary/30 glow-blue hover:shadow-lg hover:shadow-primary/10" 
              : "glass-card hover:border-primary/20 hover:shadow-lg"
            }
          `}
        >
          {/* Primary badge */}
        {platform.isPrimary && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-accent/20 text-accent border border-accent/30 text-[10px] px-2 py-0.5">
              <Zap className="h-3 w-3 mr-1" />
              PRIMARY
            </Badge>
          </div>
        )}

        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Platform Icon */}
            <div
              className={`
                w-14 h-14 rounded-xl flex items-center justify-center shrink-0
                ${platform.connected 
                  ? "bg-primary/10 border border-primary/30 glow-blue" 
                  : "bg-secondary/50 border border-border/50"
                }
              `}
            >
              <Icon 
                className={`h-7 w-7 ${platform.connected ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>

            {/* Platform Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground">{platform.name}</h3>
              {platform.connected ? (
                <div className="space-y-2 mt-1">
                  <p className="text-sm text-muted-foreground truncate">
                    {platform.accountName}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-accent/50 text-accent">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Click to connect
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            {platform.connected ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            ) : (
              <Button
                variant="neon"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowDialog(true)}
              >
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Connect Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-gradient">Connect {platform.name}</DialogTitle>
            <DialogDescription>
              Enter your {platform.name} profile URL to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Input
              placeholder={`Example: ${platform.id}.com/@username`}
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value);
                setValidationError(null); // Clear error on input change
              }}
              className={`bg-secondary/50 ${validationError ? "border-red-500" : ""}`}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
            
            {/* Validation Error Message */}
            {validationError && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                {validationError}
              </div>
            )}
            
            {/* Help Text */}
            <div className="text-xs text-muted-foreground">
              <p>Supported formats:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {platform.id === "youtube" && (
                  <>
                    <li>youtube.com/@username</li>
                    <li>youtube.com/channel/xxx</li>
                    <li>youtu.be/xxx</li>
                  </>
                )}
                {platform.id === "tiktok" && <li>tiktok.com/@username</li>}
                {platform.id === "instagram" && <li>instagram.com/username</li>}
                {platform.id === "facebook" && (
                  <>
                    <li>facebook.com/username</li>
                    <li>facebook.com/pages/xxx</li>
                  </>
                )}
                {platform.id === "dailymotion" && <li>dailymotion.com/video/xxx</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)} disabled={isConnecting}>
              Cancel
            </Button>
            <Button 
              variant="neon" 
              onClick={handleConnect} 
              disabled={!accountName.trim() || isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlatformCard;

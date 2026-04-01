import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, CheckCircle, AlertTriangle, XCircle, Coins, Database, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusTooltipProps {
  type: "auth" | "wallet" | "api" | "database";
  status: "connected" | "disconnected" | "warning" | "error";
  message?: string;
  onClick?: () => void;
}

const StatusTooltip = ({ type, status, message, onClick }: StatusTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = () => {
    switch (type) {
      case "auth": return <Database className="h-4 w-4" />;
      case "wallet": return <Coins className="h-4 w-4" />;
      case "api": return <Key className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "connected": return "text-green-500 bg-green-500/10 border-green-500/30";
      case "disconnected": return "text-muted-foreground bg-muted border-border";
      case "warning": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
      case "error": return "text-red-500 bg-red-500/10 border-red-500/30";
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    
    switch (type) {
      case "auth":
        return status === "connected" ? "Supabase: Connected" : "Not authenticated";
      case "wallet":
        return status === "connected" ? "Wallet active" : "No coins available";
      case "api":
        return status === "connected" ? "API keys configured" : "No API keys set";
      default:
        return "Status unknown";
    }
  };

  const getActionLabel = () => {
    switch (type) {
      case "auth": return status === "connected" ? "View Profile" : "Sign In";
      case "wallet": return status === "connected" ? "Buy More" : "Add Coins";
      case "api": return status === "connected" ? "Manage Keys" : "Configure";
      default: return "Details";
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(!isOpen);
          onClick?.();
        }}
        className={cn(
          "p-1.5 rounded-full cursor-pointer transition-colors",
          getStatusColor()
        )}
      >
        {getIcon()}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Floating tooltip */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 p-3 glass-card border border-border/30 rounded-lg shadow-xl z-50"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {status === "connected" || status === "warning" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium text-sm capitalize">{type}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                {getStatusMessage()}
              </p>

              {status !== "connected" && (
                <Badge variant="outline" className="text-xs mb-3">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Action Required
                </Badge>
              )}

              <Button
                variant={status === "connected" ? "outline" : "default"}
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  onClick?.();
                  setIsOpen(false);
                }}
              >
                {getActionLabel()}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusTooltip;

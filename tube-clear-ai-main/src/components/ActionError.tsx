import { AlertTriangle, Settings, Zap, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface ActionErrorProps {
  title: string;
  message: string;
  type?: "api_key" | "coins" | "connection" | "scan_failed" | "permission";
  onFix?: () => void;
}

const ActionError = ({ title, message, type = "scan_failed", onFix }: ActionErrorProps) => {
  const navigate = useNavigate();

  const handleFix = () => {
    if (onFix) {
      onFix();
      return;
    }

    // Default navigation based on error type
    switch (type) {
      case "api_key":
        navigate("/security");
        break;
      case "coins":
        navigate("/payment");
        break;
      case "connection":
        navigate("/dashboard");
        break;
      default:
        navigate("/settings");
    }
  };

  const getActionLabel = () => {
    switch (type) {
      case "api_key": return "Configure API Key";
      case "coins": return "Buy Coins";
      case "connection": return "Check Connection";
      case "scan_failed": return "Try Again";
      case "permission": return "Update Permissions";
      default: return "Fix Now";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "api_key": return <Settings className="h-5 w-5" />;
      case "coins": return <Zap className="h-5 w-5" />;
      case "connection": return <XCircle className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <Card className="glass-card border-red-500/30 bg-red-500/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-500 mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
            
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs border-red-500/30 hover:bg-red-500/10"
              onClick={handleFix}
            >
              <Settings className="h-3 w-3 mr-1.5" />
              {getActionLabel()}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionError;

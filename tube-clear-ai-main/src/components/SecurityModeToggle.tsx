import { Shield, Cloud, Smartphone, Lock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEncryption, type SecurityMode } from "@/contexts/EncryptionContext";
import { cn } from "@/lib/utils";

const SecurityModeToggle = () => {
  const { securityMode, setSecurityMode, deviceId, getSecuritySMS } = useEncryption();

  const handleModeChange = (mode: SecurityMode) => {
    setSecurityMode(mode);
  };

  return (
    <Card className="glass-card border-border/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Security Mode</CardTitle>
            <CardDescription>Choose how your API keys are stored</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            className={cn(
              "p-4 rounded-lg border-2 cursor-pointer transition-all",
              securityMode === "ghost"
                ? "border-primary bg-primary/10"
                : "border-border/30 hover:border-primary/50"
            )}
            onClick={() => handleModeChange("ghost")}
          >
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">Ghost Storage</span>
                  {securityMode === "ghost" && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Key stays ONLY on this device. Maximum privacy.
                </p>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "p-4 rounded-lg border-2 cursor-pointer transition-all",
              securityMode === "cloud"
                ? "border-primary bg-primary/10"
                : "border-border/30 hover:border-primary/50"
            )}
            onClick={() => handleModeChange("cloud")}
          >
            <div className="flex items-start gap-3">
              <Cloud className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">Cloud Sync</span>
                  {securityMode === "cloud" && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Encrypted & synced to cloud for multi-device access.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Device ID */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Device ID</span>
            <code className="text-xs font-mono">{deviceId.slice(0, 20)}...</code>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-500">AES-256 Encryption Active</span>
        </div>

        {/* Security SMS */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground italic">
            "{getSecuritySMS("all")}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// API Key Help Guide Component
export const APIKeyHelpGuide = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          How to Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-primary/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            How to Create a View-Only API Key
          </DialogTitle>
          <DialogDescription>
            Follow these steps to create a safe, view-only API key
          </DialogDescription>
        </DialogHeader>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="gemini">
            <AccordionTrigger>Google Gemini</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a></li>
                <li>Click "Create API Key"</li>
                <li>Copy the key starting with "AIza"</li>
                <li>The key is read-only for your Google AI projects</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="openai">
            <AccordionTrigger>OpenAI</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenAI Platform</a></li>
                <li>Click "Create new secret key"</li>
                <li>Set permissions to "Read only" if available</li>
                <li>Copy the key starting with "sk-"</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="groq">
            <AccordionTrigger>Groq</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">Groq Console</a></li>
                <li>Click "Create API Key"</li>
                <li>Copy the key starting with "gsk_"</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="claude">
            <AccordionTrigger>Claude (Anthropic)</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Anthropic Console</a></li>
                <li>Navigate to API Keys section</li>
                <li>Click "Create Key"</li>
                <li>Copy the key starting with "sk-ant-"</li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 mt-4">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs text-green-500">
              <strong>Safety Tip:</strong> Your API keys are encrypted and stored only on your device. 
              TubeClear never sends your keys to our servers - they're used directly for AI analysis.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityModeToggle;

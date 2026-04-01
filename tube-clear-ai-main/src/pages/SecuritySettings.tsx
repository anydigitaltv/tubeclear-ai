import SecurityModeToggle, { APIKeyHelpGuide } from "@/components/SecurityModeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Key } from "lucide-react";

const SecuritySettings = () => {
  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gradient">Security Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your API key security</p>
        </div>
      </div>

      <SecurityModeToggle />

      <Card className="glass-card border-border/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">API Key Help</CardTitle>
              <CardDescription>Learn how to create safe API keys</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <APIKeyHelpGuide />
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;

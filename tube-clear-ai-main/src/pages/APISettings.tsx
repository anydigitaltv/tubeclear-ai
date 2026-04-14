import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import AIEngineSettings from "@/components/AIEngineSettings";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, Sparkles, Zap, Shield, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const APISettings = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("settings");

  const handleNavigate = (section: string) => {
    if (section === "dashboard") {
      navigate("/dashboard");
      return;
    }
    if (section === "history") {
      navigate("/history");
      return;
    }
    if (section === "license-keys") {
      navigate("/license-keys");
      return;
    }
    if (section === "settings") {
      return;
    }
    setActiveSection(section);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeSection={activeSection} onNavigate={handleNavigate} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center justify-between px-4 border-b border-border/30">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-3 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">AI Engine Settings</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8 max-w-5xl space-y-8">
              {/* Page Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Cpu className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gradient">AI Engine API Keys</h1>
                    <p className="text-muted-foreground">
                      Add your Gemini & Groq API keys for powerful video scanning
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gemini Card */}
                <Card className="glass-card border-border/20 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">Gemini 1.5 Flash</CardTitle>
                        <CardDescription>Visual & Audio Analysis</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">Video frame analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">Audio/music detection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">Thumbnail inspection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">AI content detection</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => window.open("https://ai.google.dev", "_blank")}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Get Free Gemini Key
                    </Button>
                  </CardContent>
                </Card>

                {/* Groq Card */}
                <Card className="glass-card border-border/20 hover:border-primary/30 transition-all">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">Groq Llama 3.1</CardTitle>
                        <CardDescription>Text & Policy Analysis</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">Title/description scan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">Tag analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">Policy compliance check</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-accent" />
                        <span className="text-muted-foreground">Metadata verification</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => window.open("https://console.groq.com", "_blank")}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Get Free Groq Key
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* AI Engine Settings Component */}
              <AIEngineSettings />

              {/* Privacy Notice */}
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Your Keys Are Safe & Private</h3>
                      <p className="text-sm text-muted-foreground">
                        All API keys are stored locally on your device (localStorage). They are NEVER transmitted to our servers. 
                        You have full control - add, remove, or disable keys anytime. Your keys are tied to your browser/device only.
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          100% Private & Secure • Local Storage Only
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default APISettings;

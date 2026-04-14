import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import LicenseKeyManager from "@/components/LicenseKeyManager";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const LicenseKeys = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("keys");

  const handleNavigate = (section: string) => {
    if (section === "dashboard") {
      navigate("/dashboard");
      return;
    }
    if (section === "history") {
      navigate("/history");
      return;
    }
    if (section === "keys") {
      return;
    }
    setActiveSection(section);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeSection={activeSection} onNavigate={handleNavigate} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center justify-between px-4 border-b border-border/30">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">License Keys</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8 max-w-4xl">
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">License Key Management</h1>
                <p className="text-muted-foreground">
                  Add and manage your API keys for advanced scanning features. All keys are stored locally on your device for maximum privacy.
                </p>
              </div>

              <LicenseKeyManager />

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-card border border-border rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-lg">🔑</span>
                    Supported API Keys
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Google Gemini API - AI analysis & vision</li>
                    <li>• OpenAI API - GPT-4 & DALL-E scanning</li>
                    <li>• Anthropic Claude API - Advanced reasoning</li>
                    <li>• Vision API - Frame-by-frame analysis</li>
                    <li>• Audio API - Music & voice detection</li>
                    <li>• Custom API - Your own endpoints</li>
                  </ul>
                </div>

                <div className="p-6 bg-card border border-border rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    Privacy & Security
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Keys stored in localStorage only</li>
                    <li>• Never transmitted to our servers</li>
                    <li>• Tied to your account or device</li>
                    <li>• Delete anytime with one click</li>
                    <li>• Enable/disable keys as needed</li>
                    <li>• Full control over your data</li>
                  </ul>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default LicenseKeys;

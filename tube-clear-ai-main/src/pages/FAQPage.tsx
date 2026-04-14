import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import FAQSection from "@/components/FAQSection";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle } from "lucide-react";

const FAQPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("faq");

  const handleNavigate = (section: string) => {
    if (section === "dashboard") {
      navigate("/dashboard");
      return;
    }
    if (section === "history") {
      navigate("/history");
      return;
    }
    if (section === "settings") {
      navigate("/settings");
      return;
    }
    if (section === "license-keys") {
      navigate("/license-keys");
      return;
    }
    if (section === "store") {
      navigate("/store");
      return;
    }
    if (section === "faq") {
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
                <HelpCircle className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">FAQ</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8 max-w-4xl">
              {/* Page Header */}
              <div className="mb-8 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">Frequently Asked Questions</h1>
                  <p className="text-muted-foreground">
                    Everything you need to know about TubeClear AI
                  </p>
                </div>
              </div>

              {/* FAQ Component */}
              <FAQSection />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default FAQPage;

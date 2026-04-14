import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import PolicyNewsroom from "@/components/PolicyNewsroom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Newspaper } from "lucide-react";

const PolicyNewsroomPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("newsroom");

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
      navigate("/faq");
      return;
    }
    if (section === "newsroom") {
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
                <Newspaper className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">Policy Newsroom</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8 max-w-6xl">
              {/* Page Header */}
              <div className="mb-8 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Newspaper className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gradient">Policy Newsroom</h1>
                  <p className="text-muted-foreground">
                    Live policy updates from all 5 platforms
                  </p>
                </div>
              </div>

              {/* Policy Newsroom Component */}
              <PolicyNewsroom />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PolicyNewsroomPage;

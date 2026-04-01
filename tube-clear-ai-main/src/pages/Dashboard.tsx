import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, isGuest, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = (section: string) => {
    if (section === "dashboard") return;
    if (section === "scan") {
      navigate("/");
      return;
    }
    navigate("/?section=" + section);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeSection="dashboard" onNavigate={handleNavigate} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar with sidebar trigger */}
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center px-4 border-b border-border/30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="ml-3 flex items-center gap-2">
              <span className="text-sm font-semibold text-gradient">TubeClear</span>
              <span className="text-xs text-muted-foreground">Multi-Platform Dashboard</span>
            </div>
            
            {/* Auth status in header */}
            <div className="ml-auto flex items-center gap-2">
              {isGuest ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signInWithGoogle}
                  className="text-xs gap-1.5"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* Dashboard Content */}
          <DashboardShell />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;

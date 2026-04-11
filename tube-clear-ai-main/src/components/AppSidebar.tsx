import { Shield, Newspaper, Settings, HelpCircle, LogIn, LogOut, User, Coins, Sparkles, LayoutGrid, Store, TrendingUp, History as HistoryIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/contexts/CoinContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CoinHistory from "@/components/CoinHistory";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const navItems = [
  { id: "scan", label: "Home", icon: Shield },
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "market", label: "Market Watcher", icon: TrendingUp },
  { id: "store", label: "Feature Store", icon: Store },
  { id: "newsroom", label: "Policy News", icon: Newspaper },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "settings", label: "API Keys", icon: Settings },
];

const AppSidebar = ({ activeSection, onNavigate }: AppSidebarProps) => {
  const { user, isGuest, signInWithGoogle, signOut, loading } = useAuth();
  const { balance, isLoading: coinsLoading } = useCoins();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="glass border-r border-border/20">
        {/* Logo */}
        <div className="px-4 pt-5 pb-3 flex items-center gap-2.5">
          <div className="relative">
            <Shield className="h-8 w-8 text-primary shrink-0 drop-shadow-[0_0_8px_hsl(var(--neon-blue)/0.5)]" />
            <div className="absolute inset-0 animate-pulse-glow rounded-full" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-gradient leading-tight">TubeClear</span>
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">AI Shield</span>
            </div>
          )}
        </div>

        <div className="mx-4 mb-3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Coin Balance - Prominent Display */}
        {!collapsed && (
          <div className="mx-4 mb-3">
            <div className="glass-card border border-accent/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Coins className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Coins</p>
                    <p className="text-lg font-bold text-accent">
                      {coinsLoading ? "..." : balance}
                    </p>
                  </div>
                </div>
                <CoinHistory />
              </div>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.1 }}
                    className="w-full"
                  >
                    <SidebarMenuButton
                      onClick={() => onNavigate(item.id)}
                      isActive={activeSection === item.id}
                      tooltip={item.label}
                      className={`
                        ${activeSection === item.id
                          ? "bg-primary/10 text-primary border-l-4 border-l-primary shadow-[inset_0_0_12px_hsl(var(--neon-blue)/0.08)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all duration-200 border-l-4 border-l-transparent"
                        }
                      `}
                    >
                      <item.icon className={`h-4 w-4 ${activeSection === item.id ? "drop-shadow-[0_0_4px_hsl(var(--neon-blue)/0.6)]" : ""}`} />
                      <span className="font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </motion.div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="glass border-r border-border/20 border-t border-t-border/10 p-3 space-y-2.5">
        {/* Guest/User badge at bottom */}
        <div className="flex items-center gap-2">
          {isGuest ? (
            <Badge className="w-full justify-center gap-2 py-1.5 bg-muted/60 text-muted-foreground border border-border/40 backdrop-blur-sm">
              <User className="h-3.5 w-3.5" />
              {!collapsed && (
                <>
                  <span className="font-medium">Guest Mode</span>
                  <Sparkles className="h-3 w-3 text-primary/60" />
                </>
              )}
            </Badge>
          ) : (
            <Badge className="w-full justify-center gap-2 py-1.5 bg-primary/10 text-primary border border-primary/25">
              <User className="h-3.5 w-3.5" />
              {!collapsed && (
                <>
                  <span className="font-medium truncate max-w-[100px]">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                  </span>
                </>
              )}
            </Badge>
          )}
        </div>

        {/* Auth button */}
        {isGuest ? (
          <motion.div whileTap={{ scale: 0.96 }} transition={{ duration: 0.1 }} className="w-full">
            <Button
              variant="neon"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={signInWithGoogle}
              disabled={loading}
            >
              <LogIn className="h-3.5 w-3.5" />
              {!collapsed && "Sign in with Google"}
            </Button>
          </motion.div>
        ) : (
          <motion.div whileTap={{ scale: 0.96 }} transition={{ duration: 0.1 }} className="w-full">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={signOut}
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed && "Sign Out"}
            </Button>
          </motion.div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;

import { useState, useEffect } from "react";
import AdminPanel from "@/components/AdminPanel";
import AuditConfigsAdmin from "@/components/AuditConfigsAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("configs");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem("tubeclear_admin_auth") === "true";
  });
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === "anydigital" && pass === "4414") {
      sessionStorage.setItem("tubeclear_admin_auth", "true");
      setIsAuthorized(true);
      toast.success("Welcome, Admin!");
    } else {
      toast.error("Ghalat username ya password!");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("tubeclear_admin_auth");
    setIsAuthorized(false);
    toast.info("Logged out from Admin Panel");
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <Card className="w-full max-w-md glass-card border-primary/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-gradient">Admin Login</CardTitle>
            <p className="text-sm text-muted-foreground">TubeClear Master Control</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Username</label>
                <input 
                  type="text"
                  autoComplete="off"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg h-12 px-4 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Password</label>
                <input 
                  type="password"
                  autoComplete="new-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg h-12 px-4 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Password"
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold gap-2">
                <LogIn className="h-5 w-5" /> Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gradient">Admin Dashboard</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="configs">Audit Configs</TabsTrigger>
          <TabsTrigger value="ai-doctor">AI Doctor</TabsTrigger>
        </TabsList>
        <TabsContent value="configs">
          <AuditConfigsAdmin />
        </TabsContent>
        <TabsContent value="ai-doctor">
          <AdminPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;

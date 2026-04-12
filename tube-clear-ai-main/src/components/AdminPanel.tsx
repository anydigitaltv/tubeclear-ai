import { useState } from "react";
import { Shield, AlertTriangle, Check, X, RefreshCw, Bell, Smartphone, Ban, Info, Undo2, UserSearch, Coins, History, ShieldAlert, Lock, LogIn, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIDoctor, type PolicyViolation, type AdminAlert } from "@/contexts/AIDoctorContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePayment } from "@/contexts/PaymentContext";

const AdminPanel = () => {
  const {
    violations,
    adminAlerts,
    disabledFeatures,
    reviewViolation,
    enableFeature,
    sendAdminAlert,
  } = useAIDoctor();
  const { paymentRecords } = usePayment();

  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refundTarget, setRefundTarget] = useState("");
  const [refundAmount, setRefundAmount] = useState(10);
  const [refundReason, setRefundReason] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // User Search State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const activeViolations = violations.filter((v) => v.status === "active");
  const reviewedViolations = violations.filter((v) => v.status === "reviewed" || v.status === "dismissed");

  const handleReview = (violationId: string, action: "approve" | "dismiss") => {
    reviewViolation(violationId, action);
  };

  const handleEnableFeature = (feature: string) => {
    enableFeature(feature);
  };

  const handleTestAlert = async () => {
    setIsRefreshing(true);
    await sendAdminAlert({
      type: "critical_issue",
      message: "Test alert from Admin Panel",
      violationId: "",
    });
    setIsRefreshing(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "anydigital" && password === "4414") {
      setIsLoggedIn(true);
      toast.success("Welcome back, Admin!");
    } else {
      toast.error("Ghalat username ya password!");
    }
  };

  const handleManualRefund = async () => {
    if (!refundTarget) {
      toast.error("Bhai, user ka email ya ID toh likho!");
      return;
    }
    
    setIsProcessingRefund(true);
    try {
      // Step 1: Find user and current balance
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, coins')
        .or(`email.eq.${refundTarget},id.eq.${refundTarget}`)
        .single();

      if (fetchError || !profile) throw new Error("User nahi mila!");

      // Step 2: Update balance via Supabase RPC or direct update
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: (profile.coins || 0) + refundAmount })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast.success(`${refundAmount} Coins refund kar diye gaye hain!`);
      setRefundTarget("");
      setRefundReason("");
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Refund fail ho gaya");
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getSeverityColor = (severity: PolicyViolation["severity"]) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-500 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      default: return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    }
  };

  const handleSearchUser = async () => {
    if (!userSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${userSearchQuery}%,full_name.ilike.%${userSearchQuery}%,id.eq.${userSearchQuery}`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
      if (data?.length === 0) toast.info("Bhai, is email ka koi user nahi mila.");
    } catch (err) {
      toast.error("Search fail ho gayi!");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateCoins = async (userId: string, currentCoins: number, amount: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ coins: currentCoins + amount })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`Mubarak! User ko ${amount} coins de diye gaye.`);
      
      // Local state update karein taake UI foran refresh ho
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, coins: (u.coins || 0) + amount } : u
      ));
      
    } catch (err) {
      toast.error("Coins update nahi ho saky.");
    }
  };

  // Render Login Screen if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <Card className="w-full max-w-md glass-card border-primary/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-gradient">Admin Access</CardTitle>
            <p className="text-sm text-muted-foreground">Pehly login karein agay barhne ke liye</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Username</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg h-12 px-4 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="anydigital"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg h-12 px-4 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••"
                />
              </div>
              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 font-bold gap-2">
                <LogIn className="h-5 w-5" /> Login Admin
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gradient">AI Doctor Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Review and manage auto-disabled features</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleTestAlert} disabled={isRefreshing}>
          <Bell className="h-4 w-4 mr-2" />
          Test Alert
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeViolations.length}</p>
                <p className="text-xs text-muted-foreground">Active Violations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <X className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{disabledFeatures.length}</p>
                <p className="text-xs text-muted-foreground">Disabled Features</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviewedViolations.length}</p>
                <p className="text-xs text-muted-foreground">Reviewed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminAlerts.filter((a) => a.delivered).length}</p>
                <p className="text-xs text-muted-foreground">Alerts Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="violations" className="w-full">
        <TabsList className="grid w-full max-w-5xl grid-cols-7">
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="removed">Removed Features</TabsTrigger>
          <TabsTrigger value="features">Active Checks</TabsTrigger>
          <TabsTrigger value="alerts">Alert History</TabsTrigger>
          <TabsTrigger value="payments">Payment Audit</TabsTrigger>
          <TabsTrigger value="users">User Profiles</TabsTrigger>
          <TabsTrigger value="refunds" className="text-yellow-500">Manual Refunds</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className="text-lg">Active Violations</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {activeViolations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No active violations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeViolations.map((violation) => (
                      <ViolationCard
                        key={violation.id}
                        violation={violation}
                        onReview={handleReview}
                        getSeverityColor={getSeverityColor}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="removed" className="mt-4">
          <Card className="glass-card border-red-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                <Ban className="h-5 w-5" />
                Policy Removal Log (Store Compliance)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {violations.filter(v => v.status === "active" || v.status === "disabled").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>No features currently removed. All systems compliant.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {violations
                      .filter(v => v.status === "active" || v.status === "disabled")
                      .map((v) => (
                        <div key={v.id} className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-bold text-red-400 uppercase text-xs tracking-wider">{v.feature}</h4>
                              <p className="text-sm text-white font-medium">{v.rule}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-500/30 text-red-400">
                                  AUTO-REMOVED: {new Date(v.detectedAt).toLocaleDateString()}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Info className="h-3 w-3" /> Store Policy Enforcement
                                </span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="text-xs hover:bg-red-500/10 text-red-400" onClick={() => handleReview(v.id, "dismiss")}>
                              Re-Evaluate
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card className="glass-card border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                <History className="h-5 w-5" />
                Automated Payment Verification Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {paymentRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>No recent payment transactions recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentRecords.map((record) => (
                      <div key={record.id} className="p-4 rounded-lg bg-secondary/30 border border-border/20 flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{record.transactionId}</span>
                            {record.autoVerified ? (
                              <Badge className="bg-green-500/20 text-green-400 text-[10px] h-4">AUTO-PASSED</Badge>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] h-4">MANUAL REVIEW</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Amount: {record.amount} | Coins: {record.coins} | Method: {record.method}</p>
                          <p className="text-[10px] text-muted-foreground italic">Detected: {new Date(record.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-500/10 text-red-400">
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserSearch className="h-5 w-5" />
                User & Coins Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search by Email, Name or User ID..."
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg h-10 pl-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                  />
                </div>
                <Button onClick={handleSearchUser} disabled={isSearching}>
                  {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {searchResults.map((u) => (
                    <div key={u.id} className="p-4 rounded-lg bg-secondary/30 border border-border/20">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-bold">{u.full_name || 'No Name'}</span>
                            <Badge variant="outline" className="text-[10px]">{u.id.slice(0, 8)}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Coins className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-bold text-yellow-500">{u.coins || 0} Current Coins</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold text-center">Add Coins</span>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-xs border-green-500/30 hover:bg-green-500/10 text-green-500"
                              onClick={() => handleUpdateCoins(u.id, u.coins || 0, 100)}
                            >
                              +100
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-xs border-green-500/30 hover:bg-green-500/10 text-green-500"
                              onClick={() => handleUpdateCoins(u.id, u.coins || 0, 500)}
                            >
                              +500
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-500">
                <Undo2 className="h-5 w-5" />
                Manual Refund Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-bold">User Email or ID</label>
                  <div className="relative">
                    <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="anydigitaltv@gmail.com"
                      className="w-full bg-secondary/50 border border-border/50 rounded-lg h-10 pl-10 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                      value={refundTarget}
                      onChange={(e) => setRefundTarget(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-bold">Amount (Coins)</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
                    <input 
                      type="number" 
                      className="w-full bg-secondary/50 border border-border/50 rounded-lg h-10 pl-10 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold">Reason for Refund</label>
                <textarea 
                  placeholder="e.g. Scan failed but coins deducted"
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg p-3 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleManualRefund} 
                disabled={isProcessingRefund}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold"
              >
                {isProcessingRefund ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Undo2 className="h-4 w-4 mr-2" />}
                Issue Refund Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className="text-lg">Disabled Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {disabledFeatures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>All features are enabled</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {disabledFeatures.map((feature) => (
                      <div key={feature} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                        <div className="flex items-center gap-3">
                          <X className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{feature}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleEnableFeature(feature)}>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Enable
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Alert History (Admin: +923154414981)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {adminAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No alerts sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {adminAlerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ViolationCard = ({
  violation,
  onReview,
  getSeverityColor,
}: {
  violation: PolicyViolation;
  onReview: (id: string, action: "approve" | "dismiss") => void;
  getSeverityColor: (severity: PolicyViolation["severity"]) => string;
}) => (
  <div className="p-4 rounded-lg bg-secondary/30 border border-border/30 space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold">{violation.feature}</h4>
          <Badge className={cn("text-xs", getSeverityColor(violation.severity))}>
            {violation.severity}
          </Badge>
          <Badge variant="outline" className="text-xs">{violation.platform}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{violation.rule}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Detected: {new Date(violation.detectedAt).toLocaleString()}
        </p>
      </div>
      {violation.autoDisabled && (
        <Badge variant="destructive" className="text-xs">Auto-Disabled</Badge>
      )}
    </div>
    <div className="flex gap-2">
      <Button size="sm" variant="default" onClick={() => onReview(violation.id, "approve")}>
        <Check className="h-3 w-3 mr-1" />
        Keep Disabled
      </Button>
      <Button size="sm" variant="outline" onClick={() => onReview(violation.id, "dismiss")}>
        <RefreshCw className="h-3 w-3 mr-1" />
        Re-enable
      </Button>
    </div>
  </div>
);

const AlertCard = ({ alert }: { alert: AdminAlert }) => (
  <div className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant={alert.delivered ? "default" : "secondary"} className="text-xs">
          {alert.delivered ? "Delivered" : "Pending"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(alert.timestamp).toLocaleString()}
        </span>
      </div>
      <p className="text-sm">{alert.message}</p>
    </div>
  </div>
);

export default AdminPanel;

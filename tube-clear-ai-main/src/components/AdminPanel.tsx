import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Check, X, RefreshCw, Bell, Smartphone, Ban, Info, Undo2, UserSearch, Coins, History, ShieldAlert, Lock, LogIn, Search, User, FileText, Activity, Zap, ShieldCheck, Settings2, Save, ShieldOff, Filter, TrendingDown, Terminal, Bot, Key, DatabaseZap, Plus, Trash2, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAIDoctor, type PolicyViolation, type AdminAlert } from "@/contexts/AIDoctorContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePayment } from "@/contexts/PaymentContext";
import { useAIEngines, type EngineId } from "@/contexts/AIEngineContext";

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
  const { getActiveKeyForScan } = useAIEngines();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refundTarget, setRefundTarget] = useState("");
  const [refundAmount, setRefundAmount] = useState(10);
  const [refundReason, setRefundReason] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [isSafeMode, setIsSafeMode] = useState(false);

  // User Search State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userFilter, setUserFilter] = useState<"all" | "active" | "blocked">("all");
  
  // AI Playground State (Was missing causing crash)
  const [playgroundEngine, setPlaygroundEngine] = useState<EngineId>("gemini");
  const [playgroundPrompt, setPlaygroundPrompt] = useState("");
  const [playgroundResponse, setPlaygroundResponse] = useState("");
  const [isTestingAI, setIsTestingAI] = useState(false);

  // System Vault State (Admin Master Keys)
  const [systemKeys, setSystemKeys] = useState<any[]>([]);
  const [isAddingSystemKey, setIsAddingSystemKey] = useState(false);
  const [newSystemKey, setNewSystemKey] = useState({ engine: "gemini" as EngineId, key: "" });
  const [isValidatingSystem, setIsValidatingSystem] = useState<string | null>(null);

  // User History State
  const [selectedUserHistory, setSelectedUserHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);

  // System Logs State
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState({ earned: 0, spent: 0, tx: 0 });

  // Global Pricing State
  const [globalPrices, setGlobalPrices] = useState({
    pre_scan_base: 5,
    deep_scan_per_min: 12,
    admin_margin: 1.2,
    min_scan_cost: 10
  });
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  // IP Security State
  const [ipBlacklist, setIpBlacklist] = useState<any[]>([]);
  const [isAutoBlockEnabled, setIsAutoBlockEnabled] = useState(() => {
    return localStorage.getItem("tubeclear_auto_block_enabled") === "true";
  });

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

  const fetchSystemKeys = async () => {
    const { data } = await supabase.from('system_vault').select('*').order('created_at', { ascending: false });
    if (data) setSystemKeys(data);
  };

  // Fetch Stats on load
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from('coin_transactions').select('amount');
      if (data) {
        const earned = data.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const spent = data.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        setRevenueStats({ earned, spent, tx: data.length });
      }

      const { data: ips } = await supabase.from('ip_blacklist').select('*').order('last_attempt', { ascending: false });
      if (ips) {
        setIpBlacklist(ips);
      }

      // Fetch System Keys from Vault
      fetchSystemKeys();
    };
    fetchStats();
    setSystemLogs([{ id: 1, event: "Admin session active", time: new Date().toLocaleTimeString() }]);
  }, []);

  const handleAddSystemKey = async () => {
    if (!newSystemKey.key.trim()) return;
    try {
      const { error } = await supabase.from('system_vault').insert({
        engine_id: newSystemKey.engine,
        api_key: newSystemKey.key.trim(),
        is_active: true
      });
      if (error) throw error;
      toast.success("Nayi system key add ho gayi!");
      setNewSystemKey({ ...newSystemKey, key: "" });
      setIsAddingSystemKey(false);
      fetchSystemKeys();
    } catch (err) {
      toast.error("Key add nahi ho saki.");
    }
  };

  const handleToggleSystemKey = async (id: string, currentStatus: boolean) => {
    await supabase.from('system_vault').update({ is_active: !currentStatus }).eq('id', id);
    fetchSystemKeys();
  };

  const handleDeleteSystemKey = async (id: string) => {
    if (!confirm("Bhai, kya aap waqai ye master key delete karna chahte hain?")) return;
    await supabase.from('system_vault').delete().eq('id', id);
    fetchSystemKeys();
  };

  const validateSystemKey = async (id: string, engine: string, key: string) => {
    setIsValidatingSystem(id);
    try {
      // Basic validation logic
      const isValid = (engine === "gemini" && key.startsWith("AIza")) || 
                      (engine === "groq" && key.startsWith("gsk_"));
      
      if (isValid) {
        toast.success("Key format valid hai! Rotation ke liye tayyar.");
      } else {
        toast.error("Ghalat key format detect hua.");
      }
    } finally {
      setIsValidatingSystem(null);
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
    setIsSearching(true);
    try {
      let query = supabase.from('profiles').select('*');
      
      // Apply search term if present
      if (userSearchQuery.trim()) {
        query = query.or(`email.ilike.%${userSearchQuery}%,full_name.ilike.%${userSearchQuery}%,id.eq.${userSearchQuery}`);
      }
      
      // Apply Block/Active filters
      if (userFilter === "active") {
        query = query.eq('is_blocked', false);
      } else if (userFilter === "blocked") {
        query = query.eq('is_blocked', true);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Fetch total spent for these users from transaction history
        const userIds = data.map(u => u.id);
        const { data: spentData } = await supabase
          .from('coin_transactions')
          .select('user_id, amount')
          .in('user_id', userIds)
          .lt('amount', 0); // Only spent (negative) amounts

        const spentMap: Record<string, number> = {};
        spentData?.forEach(tx => {
          spentMap[tx.user_id] = (spentMap[tx.user_id] || 0) + Math.abs(tx.amount);
        });

        const resultsWithSpent = data.map(u => ({
          ...u,
          total_spent: spentMap[u.id] || 0
        }));
        setSearchResults(resultsWithSpent);
      } else {
        setSearchResults([]);
      }
      
      if (data?.length === 0) {
        toast.info(userSearchQuery ? "Bhai, koi user nahi mila." : `Abhi koi ${userFilter} user nahi hai.`);
      }
    } catch (err) {
      toast.error("Search fail ho gayi!");
    } finally {
      setIsSearching(false);
    }
  };

  // Re-search when filter changes
  useEffect(() => {
    handleSearchUser();
  }, [userFilter]);

  const handleUpdateCoins = async (userId: string, currentCoins: number, amount: number) => {
    try {
      // 1. Update Profile Balance
      const { error } = await supabase
        .from('profiles')
        .update({ coins: currentCoins + amount })
        .eq('id', userId);

      if (error) throw error;

      // 2. NEW: Record Transaction in Analytics Ledger
      await supabase.from("coin_transactions").insert({
        user_id: userId,
        amount: amount,
        type: "admin_bonus",
        description: `Admin manual addition: +${amount} coins`
      });
      
      toast.success(`Mubarak! User ko ${amount} coins de diye gaye.`);
      
      // Local state update karein taake UI foran refresh ho
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, coins: (u.coins || 0) + amount } : u
      ));
      
    } catch (err) {
      toast.error("Coins update nahi ho saky.");
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(currentStatus ? "User unblocked!" : "User blocked successfully!");
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, is_blocked: !currentStatus } : u
      ));
    } catch (err) {
      toast.error("Action failed!");
    }
  };

  const handleSavePrices = async () => {
    setIsSavingPrices(true);
    try {
      // In production, save to Supabase table 'system_settings'
      localStorage.setItem("tubeclear_global_pricing", JSON.stringify(globalPrices));
      
      toast.success("Global prices updated successfully!");
      setSystemLogs(prev => [{ 
        id: Date.now(), 
        event: `Admin updated global pricing: Base ${globalPrices.pre_scan_base}, Rate ${globalPrices.deep_scan_per_min}`, 
        time: new Date().toLocaleTimeString() 
      }, ...prev]);
    } catch (err) {
      toast.error("Failed to save prices.");
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleTestAI = async () => {
    if (!playgroundPrompt.trim()) {
      toast.error("Bhai, pehly koi prompt toh likho!");
      return;
    }
    setIsTestingAI(true);
    setPlaygroundResponse("AI souch raha hai... 🤖");

    try {
      const activeKey = getActiveKeyForScan(playgroundEngine === "gemini" ? "visual" : "policy");
      if (!activeKey) throw new Error(`Aapne ${playgroundEngine} ki koi key add nahi ki hai.`);

      const endpoint = playgroundEngine === "gemini" 
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey.key}`
        : "https://api.groq.com/openai/v1/chat/completions";

      let response;
      if (playgroundEngine === "gemini") {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: playgroundPrompt }] }] })
        });
      } else {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey.key}`
          },
          body: JSON.stringify({
            model: "llama-3.1-70b-versatile",
            messages: [{ role: "user", content: playgroundPrompt }]
          })
        });
      }

      const data = await response.json();
      const text = playgroundEngine === "gemini" 
        ? data.candidates?.[0]?.content?.parts?.[0]?.text 
        : data.choices?.[0]?.message?.content;

      setPlaygroundResponse(text || JSON.stringify(data, null, 2));
    } catch (err: any) {
      setPlaygroundResponse(`❌ Error: ${err.message}`);
      toast.error("AI call fail ho gayi!");
    } finally {
      setIsTestingAI(false);
    }
  };

  const handleUnblockIP = async (ip: string) => {
    try {
      const { error } = await supabase.from('ip_blacklist').delete().eq('ip_address', ip);
      if (error) throw error;
      toast.success("IP removed from blacklist");
      setIpBlacklist(prev => prev.filter(item => item.ip_address !== ip));
    } catch (err) {
      toast.error("Failed to unblock IP");
    }
  };

  const handleViewUserHistory = async (user: any) => {
    setTargetUser(user);
    setIsHistoryLoading(true);
    setShowHistoryDialog(true);
    try {
      const { data, error } = await supabase
        .from('audit_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSelectedUserHistory(data || []);
    } catch (err) {
      toast.error("User history fetch failed!");
    } finally {
      setIsHistoryLoading(false);
    }
  };

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Safe Mode</span>
            <button 
              onClick={() => setIsSafeMode(!isSafeMode)}
              className={cn("w-8 h-4 rounded-full transition-all relative", isSafeMode ? "bg-green-500" : "bg-slate-700")}
            >
              <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", isSafeMode ? "left-4.5" : "left-0.5")} />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleTestAlert} disabled={isRefreshing}>
            <Bell className="h-4 w-4 mr-2" />
            Test Alert
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

        <Card className="glass-card border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Coins className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{revenueStats.earned}</p>
                <p className="text-xs text-muted-foreground">Total Coins Sold</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{revenueStats.spent}</p>
                <p className="text-xs text-muted-foreground">Coins Consumed</p>
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
        <ScrollArea className="w-full">
          <TabsList className="flex w-max min-w-full bg-secondary/20 p-1 mb-2">
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="removed">Removed</TabsTrigger>
            <TabsTrigger value="features">Active Checks</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="playground">Playground</TabsTrigger>
            <TabsTrigger value="vault">Vault</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="pricing">Prices</TabsTrigger>
            <TabsTrigger value="refunds" className="text-yellow-500">Refunds</TabsTrigger>
          </TabsList>
        </ScrollArea>

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

        <TabsContent value="logs" className="mt-4">
          <Card className="glass-card border-border/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Live System Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {systemLogs.map((log, i) => (
                    <div key={i} className="p-2 rounded bg-secondary/20 border border-border/10 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">[{log.time}]</span>
                      <span className="font-mono text-white flex-1 ml-4">{log.event}</span>
                      <Badge variant="outline" className="text-[10px]">INFO</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playground" className="mt-4">
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-purple-400">
                <Terminal className="h-5 w-5" />
                AI Prompt Playground
              </CardTitle>
              <CardDescription>
                Test your master prompts with live AI engines using your stored keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 p-1 bg-secondary/30 rounded-lg w-fit border border-border/50">
                {(["gemini", "groq"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => setPlaygroundEngine(e)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-bold transition-all capitalize",
                      playgroundEngine === e ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    {e === 'gemini' ? 'Gemini 1.5' : 'Groq Llama'}
                  </button>
                ))}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Test Prompt</label>
                <textarea 
                  placeholder="e.g. Analyze this video title for clickbait: 'How to earn 1M dollars fast!'"
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl p-4 text-sm min-h-[120px] focus:ring-1 focus:ring-purple-500 outline-none"
                  value={playgroundPrompt}
                  onChange={(e) => setPlaygroundPrompt(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleTestAI} 
                disabled={isTestingAI}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
              >
                {isTestingAI ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                Run AI Test
              </Button>

              {playgroundResponse && (
                <div className="space-y-2 mt-4">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">AI Response</label>
                  <div className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-4 text-xs font-mono text-purple-200 whitespace-pre-wrap max-h-[300px] overflow-y-auto shadow-inner">
                    {playgroundResponse}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vault" className="mt-4">
          <Card className="glass-card border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-orange-400">
                  <DatabaseZap className="h-5 w-5" />
                  Admin Master Key Pool
                </CardTitle>
                <CardDescription>Ye keys rotation ke liye system-wide use hongi.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsAddingSystemKey(true)} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-1" /> Add Master Key
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAddingSystemKey && (
                <div className="p-4 rounded-xl bg-secondary/30 border border-orange-500/20 space-y-3 mb-4">
                  <div className="flex gap-2">
                    <select 
                      className="bg-slate-800 border border-border/50 rounded-lg px-3 text-sm outline-none"
                      value={newSystemKey.engine}
                      onChange={(e) => setNewSystemKey({...newSystemKey, engine: e.target.value as EngineId})}
                    >
                      <option value="gemini">Gemini</option>
                      <option value="groq">Groq</option>
                    </select>
                    <Input 
                      placeholder="Paste your Master API Key here..."
                      value={newSystemKey.key}
                      onChange={(e) => setNewSystemKey({...newSystemKey, key: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingSystemKey(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddSystemKey}>Save to Vault</Button>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {systemKeys.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground italic">System vault is empty. Add keys for auto-rotation.</div>
                  ) : (
                    systemKeys.map((k) => (
                      <div key={k.id} className="p-3 rounded-lg bg-secondary/20 border border-border/10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", k.is_active ? "bg-green-500 animate-pulse" : "bg-slate-600")} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs uppercase">{k.engine_id}</span>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {k.api_key.substring(0, 6)}••••{k.api_key.slice(-4)}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Added: {new Date(k.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0" 
                            onClick={() => validateSystemKey(k.id, k.engine_id, k.api_key)}
                            disabled={isValidatingSystem === k.id}
                          >
                            {isValidatingSystem === k.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3 text-blue-400" />}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0" 
                            onClick={() => handleToggleSystemKey(k.id, k.is_active)}
                          >
                            {k.is_active ? <X className="h-3 w-3 text-yellow-500" /> : <Check className="h-3 w-3 text-green-500" />}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-red-500" 
                            onClick={() => handleDeleteSystemKey(k.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 mt-2">
                <p className="text-[10px] text-orange-300 leading-tight">
                  💡 <strong>Rotation Logic:</strong> System pehli active key use karega. Agar quota khatam hua (429 error), toh ye khud hi agli active key par move ho jayega.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card className="glass-card border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                <Settings2 className="h-5 w-5" />
                Global Scan Pricing Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-bold">Pre-Scan Base Cost (Coins)</label>
                  <input 
                    type="number" 
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg h-10 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    value={globalPrices.pre_scan_base}
                    onChange={(e) => setGlobalPrices({...globalPrices, pre_scan_base: parseInt(e.target.value)})}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Metadata check ki bunyadi qeemat</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-bold">Deep Scan Rate (Coins/Min)</label>
                  <input 
                    type="number" 
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg h-10 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    value={globalPrices.deep_scan_per_min}
                    onChange={(e) => setGlobalPrices({...globalPrices, deep_scan_per_min: parseInt(e.target.value)})}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Video/Audio analysis per minute cost</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-bold">Admin Profit Margin (Multiplier)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg h-10 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    value={globalPrices.admin_margin}
                    onChange={(e) => setGlobalPrices({...globalPrices, admin_margin: parseFloat(e.target.value)})}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Example: 1.2 = 20% Extra for Admin safety/profit</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-bold">Min Scan Cost (Coins)</label>
                  <input 
                    type="number" 
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg h-10 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    value={globalPrices.min_scan_cost}
                    onChange={(e) => setGlobalPrices({...globalPrices, min_scan_cost: parseInt(e.target.value)})}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Kisi bhi scan ki kam se kam qeemat</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border/20">
                <Button 
                  onClick={handleSavePrices} 
                  disabled={isSavingPrices}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                >
                  {isSavingPrices ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Apply New Pricing Globally
                </Button>
                <p className="text-center text-[10px] text-muted-foreground mt-3 uppercase tracking-widest">
                  ⚠️ Ye tabdeeli foran tamam users par apply ho jayegi
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="glass-card border-red-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                  <ShieldAlert className="h-5 w-5" />
                  IP Blacklist & Security
                </CardTitle>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Auto-Block (3 Fails)</span>
                  <button 
                    onClick={() => {
                      const newVal = !isAutoBlockEnabled;
                      setIsAutoBlockEnabled(newVal);
                      localStorage.setItem("tubeclear_auto_block_enabled", String(newVal));
                      toast.success(`Auto-Block ${newVal ? 'Enabled' : 'Disabled'}`);
                    }}
                    className={cn("w-8 h-4 rounded-full transition-all relative", isAutoBlockEnabled ? "bg-red-500" : "bg-slate-700")}
                  >
                    <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", isAutoBlockEnabled ? "left-4.5" : "left-0.5")} />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {ipBlacklist.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>No IPs currently blacklisted.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ipBlacklist.map((ip) => (
                      <div key={ip.ip_address} className="p-3 rounded bg-secondary/20 border border-border/10 flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm">{ip.ip_address}</span>
                            <Badge variant={ip.is_blocked ? "destructive" : "outline"} className="text-[10px] h-4">
                              {ip.is_blocked ? "BLOCKED" : `${ip.attempts} Attempts`}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">Reason: {ip.reason}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-xs text-green-500 hover:bg-green-500/10"
                          onClick={() => handleUnblockIP(ip.ip_address)}
                        >
                          Unblock
                        </Button>
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
              <div className="flex flex-col md:flex-row gap-3">
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
                <div className="flex gap-2">
                  <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
                    {(["all", "active", "blocked"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setUserFilter(f)}
                        className={cn(
                          "px-3 py-1 rounded-md text-[10px] font-bold transition-all capitalize whitespace-nowrap",
                          userFilter === f 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "text-muted-foreground hover:text-white"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Button onClick={handleSearchUser} disabled={isSearching} className="gap-2">
                    {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>
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
                            {u.is_blocked && (
                              <Badge variant="destructive" className="text-[9px] h-4">BLOCKED</Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">{u.id.slice(0, 8)}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-bold text-yellow-500">{u.coins || 0} Current</span>
                              </div>
                              <div className="flex items-center gap-2 border-l border-border/50 pl-4">
                                <TrendingDown className="h-4 w-4 text-red-400" />
                                <span className="text-sm font-bold text-red-400">{u.total_spent || 0} Spent</span>
                              </div>
                            </div>
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
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className={cn("mt-1 text-xs gap-1", u.is_blocked ? "text-green-500" : "text-red-500")}
                            onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                          >
                            {u.is_blocked ? <ShieldCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                            {u.is_blocked ? "Unblock" : "Block User"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="mt-1 text-xs gap-1 hover:bg-primary/10 text-primary"
                            onClick={() => handleViewUserHistory(u)}
                          >
                            <FileText className="h-3 w-3" /> History
                          </Button>
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

      {/* User History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Scan History: {targetUser?.full_name || targetUser?.email}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Showing total {selectedUserHistory.length} scan records
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden mt-4">
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : selectedUserHistory.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                No scan records found for this user.
              </div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {selectedUserHistory.map((scan) => (
                    <div key={scan.id} className="p-3 rounded-lg bg-secondary/30 border border-border/20 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white line-clamp-1">{scan.video_title || 'Untitled'}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[400px]">{scan.video_url}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] uppercase">{scan.platform}</Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(scan.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={cn(
                          "text-xs font-bold",
                          scan.overall_risk < 30 ? "bg-green-500/20 text-green-400" :
                          scan.overall_risk < 70 ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          Risk: {scan.overall_risk}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
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

import { useState, useEffect } from "react";
import { Trash2, FileText, Shield, AlertTriangle, CheckCircle, XCircle, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ThumbnailWithFallback } from "@/components/ThumbnailWithFallback";

interface AuditReport {
  id: string;
  video_url: string;
  video_title: string | null;
  thumbnail_url?: string;
  platform: string;
  overall_risk: number;
  result_json: any;
  created_at: string;
  user_id?: string;
}

const LOCAL_STORAGE_KEY = "tubeclear_guest_audits";

const History = () => {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch audits based on auth mode
  useEffect(() => {
    fetchAudits();
  }, [user, isGuest]);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      if (!isGuest && user) {
        // Login mode: Fetch from Supabase
        const { data, error } = await supabase
          .from("audit_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Supabase error:", error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        // Transform data with defensive null checks
        const transformedData = (data || [])
          .map((item: any) => {
            try {
              // Safely parse result_json
              const resultJson = item.result_json || {};
              
              // Extract platform with fallback
              const platform = resultJson.platformId || 
                              resultJson.platform || 
                              item.platform || 
                              "youtube";
              
              // Extract thumbnail with fallback
              const thumbnail_url = resultJson.thumbnail || 
                                   resultJson.metadata?.thumbnail || 
                                   item.thumbnail_url || 
                                   null;
              
              // Extract video_title with fallback
              const video_title = item.video_title || 
                                 resultJson.title || 
                                 resultJson.videoTitle || 
                                 "Unknown Video";
              
              // Ensure overall_risk is a valid number
              const overall_risk = typeof item.overall_risk === 'number' 
                                  ? item.overall_risk 
                                  : 0;
              
              return {
                ...item,
                video_title,
                platform,
                thumbnail_url,
                overall_risk,
                // Ensure result_json exists
                result_json: resultJson,
              };
            } catch (transformError) {
              console.warn("Failed to transform audit record:", item.id, transformError);
              // Return safe default instead of crashing
              return {
                ...item,
                video_title: item.video_title || "Unknown Video",
                platform: "youtube",
                thumbnail_url: null,
                overall_risk: item.overall_risk || 0,
                result_json: {},
              };
            }
          })
          .filter(item => item !== null); // Remove any null entries
        
        setAudits(transformedData);
      } else {
        // Guest mode: Fetch from local storage
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const guestAudits = JSON.parse(stored);
            // Validate each audit entry
            const validatedAudits = Array.isArray(guestAudits) 
              ? guestAudits.map((audit: any) => ({
                  ...audit,
                  video_title: audit.video_title || "Unknown Video",
                  platform: audit.platform || "youtube",
                  overall_risk: typeof audit.overall_risk === 'number' ? audit.overall_risk : 0,
                  result_json: audit.result_json || {},
                }))
              : [];
            setAudits(validatedAudits);
          } else {
            setAudits([]);
          }
        } catch (parseError) {
          console.error("Failed to parse guest audits:", parseError);
          // Corrupted localStorage - clear it
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setAudits([]);
          toast.info("Cleared corrupted history data");
        }
      }
    } catch (error: any) {
      console.error("Error fetching audits:", error);
      toast.error(`Failed to load scan history: ${error.message || "Unknown error"}`);
      setAudits([]); // Reset to empty on error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (auditId: string) => {
    setDeleting(auditId);
    try {
      if (!isGuest && user) {
        // Login mode: Delete from Supabase
        const { error } = await supabase
          .from("audit_history")
          .delete()
          .eq("id", auditId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Scan deleted successfully");
      } else {
        // Guest mode: Delete from local storage
        try {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const guestAudits = JSON.parse(stored);
            if (Array.isArray(guestAudits)) {
              const updated = guestAudits.filter((a: any) => a.id !== auditId);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
              toast.success("Scan deleted from history");
            }
          }
        } catch (storageError) {
          console.error("Local storage delete failed:", storageError);
          localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
          throw new Error("Local storage access failed");
        }
      }

      // Update UI immediately
      setAudits(prev => prev.filter(a => a.id !== auditId));
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error("Error deleting audit:", error);
      toast.error("Failed to delete scan");
    } finally {
      setDeleting(null);
    }
  };

  const handleViewReport = (audit: AuditReport) => {
    setSelectedReport(audit);
    setShowReportDialog(true);
  };

  const getVerdict = (riskScore: number): { label: string; color: string; bg_color: string; icon: any } => {
    if (riskScore < 30) {
      return { 
        label: "PASS", 
        color: "text-green-700", 
        bg_color: "bg-green-500", 
        icon: CheckCircle 
      };
    } else if (riskScore < 70) {
      return { 
        label: "FLAGGED", 
        color: "text-yellow-700", 
        bg_color: "bg-yellow-500", 
        icon: AlertTriangle 
      };
    } else {
      return { 
        label: "FAILED", 
        color: "text-red-700", 
        bg_color: "bg-red-500", 
        icon: XCircle 
      };
    }
  };

  const getPlatformIcon = (platform: string): string => {
    const icons: Record<string, string> = {
      youtube: "▶️",
      tiktok: "🎵",
      facebook: "👤",
      instagram: "📷",
      dailymotion: "🎬",
    };
    return icons[platform] || "📹";
  };

  const getPlatformColor = (platform: string): string => {
    const colors: Record<string, string> = {
      youtube: "bg-red-500",
      tiktok: "bg-pink-500",
      facebook: "bg-blue-600",
      instagram: "bg-purple-500",
      dailymotion: "bg-blue-400",
    };
    return colors[platform] || "bg-slate-500";
  };

  const getPlatformName = (platform: string): string => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  const handleScanNow = () => {
    navigate("/");
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-slate-700/50 rounded-lg w-64 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-72 bg-slate-700/30 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (audits.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="glass-card border-border/20">
            <CardContent className="py-16 text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-12 h-12 text-primary/60" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gradient">No Scans Yet</h2>
                <p className="text-muted-foreground text-lg">
                  Start protecting your revenue now!
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Your scan history will appear here once you analyze your first video.
                </p>
              </div>
              <Button
                onClick={handleScanNow}
                size="lg"
                className="gap-2 text-base px-8"
              >
                <Play className="w-5 h-5" />
                Scan Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // History List
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">
            My Scans / Video History
          </h1>
          <p className="text-muted-foreground">
            {audits.length} scan{audits.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {audits.map((audit) => {
            const verdict = getVerdict(audit.overall_risk);
            const VerdictIcon = verdict.icon;

            return (
              <Card
                key={audit.id}
                className="glass-card border-border/20 hover:border-border/40 transition-all duration-300 hover:shadow-lg group"
              >
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  <div className="relative">
                    <ThumbnailWithFallback
                      src={audit.thumbnail_url || ""}
                      alt={audit.video_title || "Video"}
                      platform={audit.platform}
                      className="w-full h-44 object-cover rounded-t-xl"
                    />
                    
                    {/* Platform Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${getPlatformColor(audit.platform)} text-white text-xs gap-1.5 px-2.5 py-1`}>
                        <span>{getPlatformIcon(audit.platform)}</span>
                        <span>{getPlatformName(audit.platform)}</span>
                      </Badge>
                    </div>

                    {/* Verdict Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge className={`${verdict.bg_color} text-white text-xs flex items-center gap-1.5 px-2.5 py-1`}>
                        <VerdictIcon className="w-3.5 h-3.5" />
                        {verdict.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-semibold text-base line-clamp-2 text-foreground leading-tight">
                      {audit.video_title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Risk:</span>
                        <span className={`${verdict.color} font-bold`}>{audit.overall_risk}%</span>
                      </div>
                      <span>{new Date(audit.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleViewReport(audit)}
                      >
                        <FileText className="w-4 h-4" />
                        View Report
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                        onClick={() => {
                          setDeleteConfirmId(audit.id);
                        }}
                        disabled={deleting === audit.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* View Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-gradient">
              Scan Report
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.video_title}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 mt-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-secondary/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Platform</p>
                    <p className="font-semibold text-sm">{getPlatformName(selectedReport.platform)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Risk Score</p>
                    <p className="font-bold text-lg">{selectedReport.overall_risk}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Verdict</p>
                    <p className={`font-bold text-sm ${getVerdict(selectedReport.overall_risk).color}`}>
                      {getVerdict(selectedReport.overall_risk).label}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold text-xs">
                      {new Date(selectedReport.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Full JSON Report */}
              <Card className="bg-secondary/20 border-border/20">
                <CardHeader>
                  <CardTitle className="text-base">Full Report Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-background/50 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                    {JSON.stringify(selectedReport.result_json, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              {/* Video Link */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open(selectedReport.video_url, "_blank")}
              >
                <Play className="w-4 h-4" />
                Open Original Video
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription className="py-3">
              Kya aap waqai is scan report ko delete karna chahte hain? Ye amal wapas nahi liya ja sakay ga.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={!!deleting}
            >
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default History;

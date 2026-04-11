import { useState, useEffect } from "react";
import { Trash2, ExternalLink, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ThumbnailWithFallback from "@/components/ThumbnailWithFallback";

interface AuditReport {
  id: string;
  video_url: string;
  video_title: string;
  thumbnail_url?: string;
  platform: string;
  overall_risk: number;
  result_json: any;
  created_at: string;
  user_id?: string;
}

interface MyAuditsSectionProps {
  refreshTrigger?: number;
}

const LOCAL_STORAGE_KEY = "tubeclear_guest_audits";

const MyAuditsSection = ({ refreshTrigger }: MyAuditsSectionProps) => {
  const { user, isGuest } = useAuth();
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch audits based on auth mode
  useEffect(() => {
    fetchAudits();
  }, [user, isGuest, refreshTrigger]);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      if (!isGuest && user) {
        // Login mode: Fetch from Supabase
        // @ts-ignore
        const { data, error } = await supabase
          .from("audit_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        setAudits(data || []);
      } else {
        // Guest mode: Fetch from local storage
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        const guestAudits = stored ? JSON.parse(stored) : [];
        setAudits(guestAudits);
      }
    } catch (error: any) {
      console.error("Error fetching audits:", error);
      toast.error("Failed to load audit history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (auditId: string) => {
    setDeleting(auditId);
    try {
      if (!isGuest && user) {
        // Login mode: Delete from Supabase
        // @ts-ignore
        const { error } = await supabase
          .from("audit_history")
          .delete()
          .eq("id", auditId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Audit deleted from database");
      } else {
        // Guest mode: Delete from local storage
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        const guestAudits = stored ? JSON.parse(stored) : [];
        const updated = guestAudits.filter((a: any) => a.id !== auditId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        toast.success("Audit deleted from local history");
      }

      // Update UI immediately
      setAudits(prev => prev.filter(a => a.id !== auditId));
    } catch (error: any) {
      console.error("Error deleting audit:", error);
      toast.error("Failed to delete audit");
    } finally {
      setDeleting(null);
    }
  };

  const getVerdict = (riskScore: number): { label: string; color: string; icon: any } => {
    if (riskScore < 30) {
      return { label: "PASS", color: "bg-green-500", icon: CheckCircle };
    } else if (riskScore < 70) {
      return { label: "FLAGGED", color: "bg-yellow-500", icon: AlertTriangle };
    } else {
      return { label: "FAILED", color: "bg-red-500", icon: XCircle };
    }
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

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12">
        <Card className="glass-card border-border/20">
          <CardContent className="py-12 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-700 rounded w-64 mx-auto"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-slate-700 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="container mx-auto px-6 py-12">
        <Card className="glass-card border-border/20">
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-semibold mb-2">No Audits Yet / Abhi Koi Scan Nahi Hui</p>
              <p className="text-sm">Your scan history will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <Card className="glass-card border-border/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gradient">
            My Audits / Meri Scans ({audits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {audits.map((audit) => {
              const verdict = getVerdict(audit.overall_risk);
              const VerdictIcon = verdict.icon;

              return (
                <Card
                  key={audit.id}
                  className="glass-card border-border/20 hover:border-border/40 transition-all duration-300 hover:scale-105"
                >
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="relative">
                      <ThumbnailWithFallback
                        src={audit.thumbnail_url || ""}
                        alt={audit.video_title}
                        className="w-full h-40 object-cover rounded-t-lg"
                      />
                      
                      {/* Platform Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className={`${getPlatformColor(audit.platform)} text-white text-xs`}>
                          {getPlatformName(audit.platform)}
                        </Badge>
                      </div>

                      {/* Verdict Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge className={`${verdict.color} text-white text-xs flex items-center gap-1`}>
                          <VerdictIcon className="w-3 h-3" />
                          {verdict.label}
                        </Badge>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute bottom-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(audit.id);
                        }}
                        disabled={deleting === audit.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2 text-white">
                        {audit.video_title}
                      </h3>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Risk: {audit.overall_risk}%</span>
                        <span>{new Date(audit.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* View Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(audit.video_url, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Video
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAuditsSection;

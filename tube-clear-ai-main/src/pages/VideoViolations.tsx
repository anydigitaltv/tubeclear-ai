import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  ExternalLink, 
  Filter,
  Youtube,
  Music2,
  Facebook,
  Instagram,
  PlayCircle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ViolationRecord {
  id: string;
  video_url: string;
  video_title: string;
  thumbnail_url: string | null;
  platform: string;
  overall_risk: number;
  result_json: any;
  created_at: string;
  status: 'violation' | 'safe' | 'warning';
}

const VideoViolations = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeSection, setActiveSection] = useState("violations");

  useEffect(() => {
    loadViolations();
  }, [activeFilter]);

  const handleNavigate = (section: string) => {
    if (section === "dashboard") { navigate("/dashboard"); return; }
    if (section === "history") { navigate("/history"); return; }
    if (section === "scan") { navigate("/"); return; }
    setActiveSection(section);
  };

  const loadViolations = async () => {
    if (isGuest || !user) {
      // For guests, load from localStorage
      loadFromLocalStorage();
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter violations (risk score > 50) and apply platform filter
      const violationReports: ViolationRecord[] = ((data || []) as any[])
        .filter((report: any) => {
          if (activeFilter !== 'all' && report.platform !== activeFilter) {
            return false;
          }
          return report.overall_risk > 50;
        })
        .map((report: any) => ({
          id: report.id,
          video_url: report.video_url,
          video_title: report.video_title,
          thumbnail_url: report.thumbnail_url || (report.result_json && report.result_json.thumbnail) || null,
          platform: report.platform || 'youtube',
          overall_risk: report.overall_risk,
          result_json: report.result_json,
          created_at: report.created_at,
          status: report.overall_risk > 70 ? 'violation' as const : 'warning' as const
        }));

      setViolations(violationReports);
    } catch (error) {
      console.error('Error loading violations:', error);
      toast.error('Violations load nahi ho sakin');
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('tubeclear_audit_reports');
      if (stored) {
        const reports = JSON.parse(stored);
        const violations = reports
          .filter((r: any) => r.overall_risk > 50)
          .map((r: any) => ({
            ...r,
            status: r.overall_risk > 70 ? 'violation' : 'warning'
          }));
        setViolations(violations);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <Youtube className="w-5 h-5 text-red-500" />;
      case 'tiktok': return <Music2 className="w-5 h-5 text-pink-500" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'instagram': return <Instagram className="w-5 h-5 text-purple-500" />;
      case 'dailymotion': return <PlayCircle className="w-5 h-5 text-blue-400" />;
      default: return <Shield className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, risk: number) => {
    if (status === 'violation' || risk > 70) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <AlertTriangle className="w-3 h-3 mr-1" />
          High Risk ({risk}%)
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Warning ({risk}%)
      </Badge>
    );
  };

  const getViolationIssues = (resultJson: any): string[] => {
    if (!resultJson) return [];
    
    // Extract issues from scan result
    if (resultJson.issues && Array.isArray(resultJson.issues)) {
      return resultJson.issues;
    }
    
    if (resultJson.violations && Array.isArray(resultJson.violations)) {
      return resultJson.violations;
    }
    
    return ['Risk score exceeds safe threshold'];
  };

  const handleRescan = (videoUrl: string, platform: string) => {
    navigate(`/scan/${platform}`);
    toast.info('Scan page pe jayein aur URL paste karein');
  };

  const handleViewReport = (report: ViolationRecord) => {
    // Navigate to dashboard or show detailed report
    navigate('/dashboard');
    toast.info('Report view karne ke liye dashboard pe jayein');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeSection={activeSection} onNavigate={handleNavigate} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center justify-between px-4 border-b border-border/30">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">Video Violations</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gradient mb-2">
                      Video Violations Tracker
                    </h1>
                    <p className="text-muted-foreground">
                      5 platforms ki violations - Jaise har platform ki team check karti hai
                    </p>
                  </div>
                  <Button
                    onClick={() => loadViolations()}
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {/* Platform Filters */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={activeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('all')}
                    className={activeFilter === 'all' ? 'bg-primary' : 'border-border/30'}
                  >
                    All Platforms
                  </Button>
                  {['youtube', 'tiktok', 'facebook', 'instagram', 'dailymotion'].map(platform => (
                    <Button
                      key={platform}
                      variant={activeFilter === platform ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveFilter(platform)}
                      className={activeFilter === platform ? 'bg-primary' : 'border-border/30'}
                    >
                      {getPlatformIcon(platform)}
                      <span className="ml-2 capitalize">{platform}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="glass-card border border-red-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                      <div>
                        <p className="text-sm text-muted-foreground">High Risk</p>
                        <p className="text-2xl font-bold text-red-400">
                          {violations.filter(v => v.status === 'violation').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border border-yellow-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Shield className="w-8 h-8 text-yellow-400" />
                      <div>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {violations.filter(v => v.status === 'warning').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border border-green-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                      <div>
                        <p className="text-sm text-muted-foreground">Safe Videos</p>
                        <p className="text-2xl font-bold text-green-400">
                          {violations.filter(v => v.status === 'safe').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Violations List */}
              <Card className="glass-card border border-border/30">
                <CardHeader className="border-b border-border/20">
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Detected Violations ({violations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading violations...</p>
                    </div>
                  ) : violations.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 mx-auto text-green-400/30 mb-4" />
                      <p className="text-muted-foreground">No violations found!</p>
                      <p className="text-sm text-muted-foreground/60 mt-2">
                        Aapki sab videos safe hain
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4">
                        {violations.map((violation) => {
                          const issues = getViolationIssues(violation.result_json);
                          
                          return (
                            <Card
                              key={violation.id}
                              className={`glass-card border transition-all ${
                                violation.status === 'violation'
                                  ? 'border-red-500/30 bg-red-500/5'
                                  : 'border-yellow-500/30 bg-yellow-500/5'
                              }`}
                            >
                              <CardContent className="pt-4">
                                <div className="flex items-start gap-4">
                                  {/* Thumbnail */}
                                  {violation.thumbnail_url && (
                                    <img
                                      src={violation.thumbnail_url}
                                      alt={violation.video_title}
                                      className="w-32 h-20 object-cover rounded-lg"
                                    />
                                  )}
                                  
                                  {/* Content */}
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <h3 className="font-semibold text-white mb-1 line-clamp-1">
                                          {violation.video_title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          {getPlatformIcon(violation.platform)}
                                          <span className="capitalize">{violation.platform}</span>
                                          <span>•</span>
                                          <span>{new Date(violation.created_at).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                      {getStatusBadge(violation.status, violation.overall_risk)}
                                    </div>

                                    {/* Issues */}
                                    {issues.length > 0 && (
                                      <div className="mt-3">
                                        <p className="text-sm font-medium text-white mb-2">Issues Detected:</p>
                                        <ul className="space-y-1">
                                          {issues.slice(0, 3).map((issue, idx) => (
                                            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                              <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                              <span>{issue}</span>
                                            </li>
                                          ))}
                                          {issues.length > 3 && (
                                            <li className="text-xs text-primary">
                                              +{issues.length - 3} more issues...
                                            </li>
                                          )}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-3">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRescan(violation.video_url, violation.platform)}
                                        className="border-primary/30 text-primary hover:bg-primary/10"
                                      >
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Re-Scan
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewReport(violation)}
                                        className="border-border/30"
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        View Report
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(violation.video_url, '_blank')}
                                        className="border-border/30"
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Watch Video
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Info Section */}
              <Card className="glass-card border border-blue-500/20 mt-6 bg-blue-500/5">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Shield className="w-6 h-6 text-blue-400 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-400 mb-1">Policy-Based Detection</h4>
                      <p className="text-sm text-muted-foreground">
                        Har platform ki official policies ke mutabiq scan hota hai. Jab violation detect hota hai toh yahan show hoga.
                        Jab aap video fix karke re-scan karenge aur safe ho jayegi, toh ye list se hat jayegi.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default VideoViolations;

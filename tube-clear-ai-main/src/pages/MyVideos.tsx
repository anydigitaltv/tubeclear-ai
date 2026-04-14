import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Trash2, 
  ExternalLink, 
  Youtube,
  Music2,
  Facebook,
  Instagram,
  PlayCircle,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Video
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UserVideo {
  id: string;
  video_url: string;
  video_title: string;
  thumbnail_url: string | null;
  platform: string;
  overall_risk: number;
  result_json: any;
  created_at: string;
  policies_passed?: string[];
  policies_failed?: string[];
}

const MyVideos = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [activeSection, setActiveSection] = useState("my-videos");

  useEffect(() => {
    loadVideos();
  }, [selectedPlatform]);

  const handleNavigate = (section: string) => {
    if (section === "dashboard") { navigate("/dashboard"); return; }
    if (section === "history") { navigate("/history"); return; }
    if (section === "scan") { navigate("/"); return; }
    if (section === "violations") { navigate("/violations"); return; }
    setActiveSection(section);
  };

  const loadVideos = async () => {
    if (isGuest || !user) {
      // For guests, load from localStorage
      loadFromLocalStorage();
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Apply platform filter
      let filteredData = data || [];
      if (selectedPlatform !== 'all') {
        filteredData = filteredData.filter(r => (r as any).platform === selectedPlatform);
      }

      // Map to UserVideo format with policy info
      const userVideos: UserVideo[] = (filteredData as any[]).map((report: any) => {
        const resultJson = report.result_json || {};
        const whyAnalysis = resultJson.whyAnalysis || {};
        
        // Extract policies from scan result
        const policiesPassed: string[] = [];
        const policiesFailed: string[] = [];
        
        if (whyAnalysis.policyLinks && Array.isArray(whyAnalysis.policyLinks)) {
          whyAnalysis.policyLinks.forEach((policy: any) => {
            if (policy.status === 'pass' || policy.compliant === true) {
              policiesPassed.push(policy.name || policy.title || 'Policy Check');
            } else {
              policiesFailed.push(policy.name || policy.title || 'Policy Check');
            }
          });
        }

        return {
          id: report.id,
          video_url: report.video_url,
          video_title: report.video_title,
          thumbnail_url: report.thumbnail_url || resultJson.thumbnail || null,
          platform: report.platform || 'youtube',
          overall_risk: report.overall_risk || 0,
          result_json: resultJson,
          created_at: report.created_at,
          policies_passed: policiesPassed,
          policies_failed: policiesFailed,
        };
      });

      setVideos(userVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Videos load nahi ho sakin');
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
        let filtered = reports;
        if (selectedPlatform !== 'all') {
          filtered = reports.filter((r: any) => r.platform === selectedPlatform);
        }
        setVideos(filtered);
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
      default: return <Video className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRiskBadge = (risk: number) => {
    if (risk > 70) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          High Risk ({risk}%)
        </Badge>
      );
    } else if (risk > 40) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Warning ({risk}%)
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Safe ({risk}%)
      </Badge>
    );
  };

  const handleDelete = async (videoId: string, videoTitle: string) => {
    const confirmed = window.confirm(
      `Kya aap "${videoTitle}" delete karna chahte hain?\n\nYe action irreversible hai - Supabase se bhi delete ho jayegi.`
    );

    if (!confirmed) return;

    try {
      if (!isGuest && user) {
        // Delete from Supabase
        const { error } = await supabase
          .from('audit_history')
          .delete()
          .eq('id', videoId);

        if (error) throw error;
        
        toast.success('Video Supabase se delete ho gayi');
      } else {
        // Delete from localStorage
        const stored = localStorage.getItem('tubeclear_audit_reports');
        if (stored) {
          const reports = JSON.parse(stored);
          const filtered = reports.filter((r: any) => r.id !== videoId);
          localStorage.setItem('tubeclear_audit_reports', JSON.stringify(filtered));
        }
        toast.success('Video local storage se delete ho gayi');
      }

      // Remove from UI
      setVideos(prev => prev.filter(v => v.id !== videoId));
      
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete karne mein masla aya');
    }
  };

  const handleReScan = (videoUrl: string, platform: string) => {
    navigate(`/scan/${platform}`);
    toast.info('Scan page pe jayein aur URL paste karein');
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
                <span className="text-xs text-muted-foreground">My Videos</span>
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
                      My Video Library
                    </h1>
                    <p className="text-muted-foreground">
                      Aapki sab scanned videos - Policy status ke saath
                    </p>
                  </div>
                  <Button
                    onClick={() => loadVideos()}
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {/* Platform Filter Dropdown */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Filter by Platform:</span>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="w-[250px] glass-card border border-border/30">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="youtube">
                        <div className="flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-red-500" />
                          <span>YouTube</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tiktok">
                        <div className="flex items-center gap-2">
                          <Music2 className="w-4 h-4 text-pink-500" />
                          <span>TikTok</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="facebook">
                        <div className="flex items-center gap-2">
                          <Facebook className="w-4 h-4 text-blue-600" />
                          <span>Facebook</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="instagram">
                        <div className="flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-purple-500" />
                          <span>Instagram</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dailymotion">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="w-4 h-4 text-blue-400" />
                          <span>Dailymotion</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="glass-card border border-border/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Video className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Videos</p>
                        <p className="text-2xl font-bold text-white">{videos.length}</p>
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
                          {videos.filter(v => v.overall_risk <= 40).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border border-yellow-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-yellow-400" />
                      <div>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {videos.filter(v => v.overall_risk > 40 && v.overall_risk <= 70).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border border-red-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-8 h-8 text-red-400" />
                      <div>
                        <p className="text-sm text-muted-foreground">High Risk</p>
                        <p className="text-2xl font-bold text-red-400">
                          {videos.filter(v => v.overall_risk > 70).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Videos List */}
              <Card className="glass-card border border-border/30">
                <CardHeader className="border-b border-border/20">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Scanned Videos ({videos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading videos...</p>
                    </div>
                  ) : videos.length === 0 ? (
                    <div className="text-center py-12">
                      <Video className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No videos scanned yet!</p>
                      <p className="text-sm text-muted-foreground/60 mt-2">
                        Pehle koi video scan karein
                      </p>
                      <Button
                        onClick={() => navigate('/')}
                        className="mt-4 bg-primary"
                      >
                        Scan a Video
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[700px]">
                      <div className="space-y-4">
                        {videos.map((video) => (
                          <Card
                            key={video.id}
                            className="glass-card border border-border/30 hover:border-primary/30 transition-all"
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-4">
                                {/* Thumbnail */}
                                {video.thumbnail_url && (
                                  <img
                                    src={video.thumbnail_url}
                                    alt={video.video_title}
                                    className="w-40 h-24 object-cover rounded-lg"
                                  />
                                )}
                                
                                {/* Content */}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-white mb-1 line-clamp-1">
                                        {video.video_title}
                                      </h3>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {getPlatformIcon(video.platform)}
                                        <span className="capitalize">{video.platform}</span>
                                        <span>•</span>
                                        <span>{new Date(video.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                    {getRiskBadge(video.overall_risk)}
                                  </div>

                                  {/* Policy Status */}
                                  <div className="mt-3 grid grid-cols-2 gap-3">
                                    {video.policies_passed && video.policies_passed.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-green-400 mb-1 flex items-center gap-1">
                                          <CheckCircle className="w-3 h-3" />
                                          Policies Passed ({video.policies_passed.length})
                                        </p>
                                        <div className="space-y-1">
                                          {video.policies_passed.slice(0, 2).map((policy, idx) => (
                                            <div key={idx} className="text-xs text-muted-foreground bg-green-500/5 px-2 py-1 rounded">
                                              ✓ {policy}
                                            </div>
                                          ))}
                                          {video.policies_passed.length > 2 && (
                                            <div className="text-xs text-green-400">
                                              +{video.policies_passed.length - 2} more...
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {video.policies_failed && video.policies_failed.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1">
                                          <XCircle className="w-3 h-3" />
                                          Policies Failed ({video.policies_failed.length})
                                        </p>
                                        <div className="space-y-1">
                                          {video.policies_failed.slice(0, 2).map((policy, idx) => (
                                            <div key={idx} className="text-xs text-muted-foreground bg-red-500/5 px-2 py-1 rounded">
                                              ✗ {policy}
                                            </div>
                                          ))}
                                          {video.policies_failed.length > 2 && (
                                            <div className="text-xs text-red-400">
                                              +{video.policies_failed.length - 2} more...
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {(!video.policies_passed || video.policies_passed.length === 0) && 
                                     (!video.policies_failed || video.policies_failed.length === 0) && (
                                      <div className="col-span-2 text-xs text-muted-foreground">
                                        Risk Score: {video.overall_risk}%
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReScan(video.video_url, video.platform)}
                                      className="border-primary/30 text-primary hover:bg-primary/10"
                                    >
                                      <RefreshCw className="w-3 h-3 mr-1" />
                                      Re-Scan
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(video.video_url, '_blank')}
                                      className="border-border/30"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Watch Video
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDelete(video.id, video.video_title)}
                                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
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
                      <h4 className="font-semibold text-blue-400 mb-1">Video Library Info</h4>
                      <p className="text-sm text-muted-foreground">
                        Yahan aapki sab scanned videos hain. Har video ke saath policy status dikhta hai ke kaunsi policies pass huin aur kaunsi fail.
                        Aap kisi bhi video ko delete kar sakte hain - ye UI aur Supabase dono se delete ho jayegi.
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

export default MyVideos;

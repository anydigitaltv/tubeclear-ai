import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Newspaper,
  RefreshCw,
  ExternalLink,
  Shield,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarketNews {
  id: string;
  title: string;
  summary: string;
  platform: string;
  risk_level: "low" | "medium" | "high";
  category: string;
  source_url?: string;
  created_at: string;
}

export const PolicyNewsFeed = () => {
  const [news, setNews] = useState<MarketNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("market_news")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setNews(data || []);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error("Error fetching market news:", error);
      toast.error("Failed to load policy updates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return (
          <Badge variant="destructive" className="gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            High Risk
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-500 text-black gap-1.5">
            <Info className="h-3 w-3" />
            Medium Risk
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-green-500 text-white gap-1.5">
            <CheckCircle className="h-3 w-3" />
            Low Risk
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPlatformBadge = (platform: string) => {
    const platformColors: Record<string, string> = {
      youtube: "bg-red-500/10 text-red-500 border-red-500/30",
      tiktok: "bg-pink-500/10 text-pink-500 border-pink-500/30",
      facebook: "bg-blue-600/10 text-blue-600 border-blue-600/30",
      instagram: "bg-purple-500/10 text-purple-500 border-purple-500/30",
      dailymotion: "bg-blue-400/10 text-blue-400 border-blue-400/30",
      all: "bg-primary/10 text-primary border-primary/30",
    };

    const colorClass = platformColors[platform.toLowerCase()] || "bg-secondary text-secondary-foreground";

    return (
      <Badge variant="outline" className={colorClass}>
        {platform.charAt(0).toUpperCase() + platform.slice(1)}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "policy_update":
        return <Shield className="h-4 w-4 text-primary" />;
      case "copyright":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "monetization":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "community_guidelines":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Newspaper className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskProgress = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return 85;
      case "medium":
        return 50;
      case "low":
        return 20;
      default:
        return 0;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary" />
            Policy News & Updates
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Latest platform policy changes and compliance alerts
          </p>
        </div>
        <Button
          onClick={fetchNews}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border animate-pulse">
              <CardHeader>
                <div className="h-6 bg-secondary rounded w-3/4"></div>
                <div className="h-4 bg-secondary rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-secondary rounded w-full mb-2"></div>
                <div className="h-4 bg-secondary rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : news.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No policy updates available</p>
            <p className="text-sm text-muted-foreground mt-2">Check back later for the latest updates</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <Card 
              key={item.id} 
              className="bg-card border-border hover:border-primary/50 transition-all duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPlatformBadge(item.platform)}
                      {getRiskBadge(item.risk_level)}
                      <Badge variant="outline" className="text-xs">
                        {getCategoryIcon(item.category)}
                        <span className="ml-1 capitalize">{item.category.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                    <CardTitle className="text-lg text-white">{item.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Published {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.summary}
                </p>

                {/* Risk Level Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Impact Level</span>
                    <span className={`font-medium ${getRiskColor(item.risk_level)} capitalize`}>
                      {item.risk_level} Risk
                    </span>
                  </div>
                  <Progress 
                    value={getRiskProgress(item.risk_level)} 
                    className={`h-2 ${
                      item.risk_level === 'high' ? 'bg-red-500/20' :
                      item.risk_level === 'medium' ? 'bg-yellow-500/20' :
                      'bg-green-500/20'
                    }`}
                  />
                </div>

                {/* Action Button */}
                {item.source_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => window.open(item.source_url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Read Full Policy
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Policy updates are monitored and updated regularly</p>
        <p>Last refresh: {lastUpdate.toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

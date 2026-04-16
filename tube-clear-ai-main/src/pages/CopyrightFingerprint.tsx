import { Fingerprint, ExternalLink, Shield, Copyright } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { useState } from "react";

const CopyrightFingerprint = () => {
  const [activeSection, setActiveSection] = useState("copyright-fingerprint");

  const handleNavigate = (section: string) => {
    if (section === "dashboard") { window.location.href = "/dashboard"; return; }
    if (section === "history") { window.location.href = "/history"; return; }
    if (section === "settings") { window.location.href = "/settings"; return; }
    if (section === "scan") { window.location.href = "/"; return; }
    setActiveSection(section);
  };

  const platforms = [
    {
      name: "YouTube Content ID",
      icon: "🎬",
      description: "Register your content for automatic copyright protection across YouTube. Content ID scans uploads and matches against your registered content.",
      url: "https://www.youtube.com/howyoutubeworks/our-commitments/content-id/",
      color: "from-red-500/20 to-red-600/20",
      borderColor: "border-red-500/30",
      features: ["Automatic detection", "Monetization claims", "Content blocking", "Revenue sharing"]
    },
    {
      name: "Meta Rights Manager",
      icon: "📸",
      description: "Protect your videos on Instagram & Facebook with Rights Manager. Automatically detect and manage unauthorized reuploads.",
      url: "https://www.facebook.com/business/help/11866535758694",
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/30",
      features: ["Cross-platform protection", "Automatic matching", "Custom rules", "Performance insights"]
    },
    {
      name: "TikTok IP Portal",
      icon: "🎵",
      description: "File copyright claims and protect your original content on TikTok. Manage intellectual property rights and takedown requests.",
      url: "https://www.tiktok.com/legal/ip-portal",
      color: "from-cyan-500/20 to-cyan-600/20",
      borderColor: "border-cyan-500/30",
      features: ["IP claims", "Takedown requests", "Music licensing", "Brand protection"]
    },
    {
      name: "Dailymotion Copyright",
      icon: "🎥",
      description: "Content protection and takedown requests for Dailymotion. Register your content and monitor for unauthorized use.",
      url: "https://help.dailymotion.com/hc/en-us/articles/360000117013",
      color: "from-blue-500/20 to-blue-600/20",
      borderColor: "border-blue-500/30",
      features: ["Content registry", "Automated scanning", "Takedown process", "Rights management"]
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeSection={activeSection} onNavigate={handleNavigate} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 glass-card h-14 flex items-center justify-between px-4 border-b border-border/30">
            <div className="flex items-center">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="ml-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-gradient">TubeClear</span>
                <span className="text-xs text-muted-foreground">Copyright Protection</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Fingerprint className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gradient">Copyright Fingerprint</h1>
                    <p className="text-muted-foreground">Protect your content across all platforms</p>
                  </div>
                </div>
                
                <div className="glass-card p-6 border border-cyan-500/20">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-cyan-400 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-cyan-300 mb-2">
                        Protect Your Original Content
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Register your videos with each platform's copyright system to automatically detect 
                        and manage unauthorized use. Each platform has its own Content ID or Rights Manager system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {platforms.map((platform) => (
                  <div 
                    key={platform.name}
                    className={`glass-card p-6 bg-gradient-to-br ${platform.color} ${platform.borderColor} border hover:scale-105 transition-transform`}
                  >
                    <div className="text-4xl mb-4">{platform.icon}</div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {platform.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {platform.description}
                    </p>
                    
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">KEY FEATURES:</h4>
                      <div className="flex flex-wrap gap-2">
                        {platform.features.map((feature) => (
                          <span key={feature} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      Visit Portal <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>

              {/* Pro Tips */}
              <div className="glass-card p-6 border border-yellow-500/20 mb-8">
                <h3 className="text-lg font-semibold text-yellow-300 mb-3 flex items-center gap-2">
                  💡 Pro Tips for Copyright Protection
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">✓</span>
                    <span>Register content BEFORE publishing for maximum protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">✓</span>
                    <span>Use TubeClear AI to scan your content before uploading</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">✓</span>
                    <span>Keep original project files as proof of ownership</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">✓</span>
                    <span>Monitor all platforms regularly for unauthorized reuploads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">✓</span>
                    <span>Set up automated Content ID matching for passive protection</span>
                  </li>
                </ul>
              </div>

              {/* How It Works */}
              <div className="glass-card p-6 border border-green-500/20">
                <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center gap-2">
                  <Copyright className="w-5 h-5" />
                  How Copyright Fingerprinting Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="text-2xl mb-2">1️⃣</div>
                    <h4 className="font-semibold text-white mb-1">Register Content</h4>
                    <p className="text-xs text-muted-foreground">Upload your original video to the platform's copyright system</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="text-2xl mb-2">2️⃣</div>
                    <h4 className="font-semibold text-white mb-1">Automatic Scanning</h4>
                    <p className="text-xs text-muted-foreground">Platform scans all uploads and matches against your registered content</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="text-2xl mb-2">3️⃣</div>
                    <h4 className="font-semibold text-white mb-1">Take Action</h4>
                    <p className="text-xs text-muted-foreground">Choose to block, monetize, or track matches automatically</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CopyrightFingerprint;

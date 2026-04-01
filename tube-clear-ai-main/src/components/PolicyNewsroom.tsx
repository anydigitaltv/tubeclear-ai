import { Newspaper, ExternalLink, Clock, MessageCircle, Repeat2, Heart } from "lucide-react";

const policies = [
  {
    date: "Mar 15, 2026",
    title: "YouTube Tightens AI-Generated Content Disclosure Rules",
    summary: "Creators must now label all synthetic media including AI voices, deepfakes, and generated visuals. Non-compliance triggers automatic demonetization.",
    isNew: true,
    replies: 142,
    reposts: 891,
    likes: "2.4K",
  },
  {
    date: "Feb 28, 2026",
    title: "Updated Repetitious Content Policy",
    summary: "Channels uploading substantially similar content across multiple videos may lose monetization eligibility. Templated or mass-produced content faces stricter review.",
    isNew: true,
    replies: 89,
    reposts: 534,
    likes: "1.8K",
  },
  {
    date: "Jan 10, 2026",
    title: "Misleading Metadata Enforcement Expansion",
    summary: "YouTube now uses AI to detect clickbait titles, misleading thumbnails, and keyword-stuffed descriptions. Violations result in limited ads.",
    isNew: false,
    replies: 67,
    reposts: 312,
    likes: "1.1K",
  },
  {
    date: "Dec 5, 2025",
    title: "Copyright Strike System Overhaul",
    summary: "Three-strike system replaced with a graduated penalty model. Minor infractions receive warnings; repeated violations lead to channel termination.",
    isNew: false,
    replies: 203,
    reposts: 1024,
    likes: "3.7K",
  },
  {
    date: "Nov 1, 2025",
    title: "Ad-Suitability Guidelines v4.0 Released",
    summary: "Expanded list of advertiser-friendly content categories. New 'sensitive topics' tier allows limited monetization for borderline content.",
    isNew: false,
    replies: 45,
    reposts: 198,
    likes: "892",
  },
];

const PolicyNewsroom = () => {
  return (
    <section className="container mx-auto px-6 py-16 space-y-8" id="newsroom">
      <div className="text-center space-y-3">
        <h2 className="text-3xl md:text-4xl font-bold">
          Policy <span className="text-gradient">Newsroom</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Live feed of YouTube policy changes. Our AI auditor auto-adapts to every update.
        </p>
      </div>

      <div className="max-w-2xl mx-auto divide-y divide-border">
        {policies.map((policy, i) => (
          <article
            key={i}
            className="px-4 py-4 hover:bg-secondary/30 transition-colors cursor-pointer group"
          >
            {/* Top row: avatar + header */}
            <div className="flex gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Newspaper className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">TubeClear Policy</span>
                  <span className="text-muted-foreground text-xs">@tubeclear</span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-muted-foreground text-xs">{policy.date}</span>
                  {policy.isNew && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent uppercase tracking-wider">
                      New
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm leading-snug">{policy.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{policy.summary}</p>

                {/* Engagement row */}
                <div className="flex items-center gap-6 pt-2">
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-xs group/btn">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{policy.replies}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors text-xs group/btn">
                    <Repeat2 className="h-3.5 w-3.5" />
                    <span>{policy.reposts}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors text-xs group/btn">
                    <Heart className="h-3.5 w-3.5" />
                    <span>{policy.likes}</span>
                  </button>
                  <button className="ml-auto text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="text-center">
        <div className="glass-card inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
          <Newspaper className="h-4 w-4 text-primary" />
          AI Auditor auto-updates scanning criteria with every new policy
        </div>
      </div>
    </section>
  );
};

export default PolicyNewsroom;

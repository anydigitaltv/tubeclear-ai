import { useState, useEffect } from "react";
import { Lock, Unlock, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

interface Engine {
  id: string;
  name: string;
  icon: string;
  adminEnabled: boolean;
}

const engines: Engine[] = [
  { id: "gemini", name: "Gemini", icon: "💎", adminEnabled: true },
  { id: "groq", name: "Groq", icon: "🚀", adminEnabled: true },
];

const LS_STATUS_PREFIX = "tubeclear_status_";

const EngineGrid = () => {
  const { isGuest } = useAuth();
  const isPremium = false;

  const [statuses, setStatuses] = useState<Record<string, string>>({});

  // Load verified statuses from localStorage
  useEffect(() => {
    const loaded: Record<string, string> = {};
    engines.forEach((e) => {
      const s = localStorage.getItem(`${LS_STATUS_PREFIX}${e.id}`);
      if (s === "active" || s === "quota") loaded[e.id] = s;
    });
    setStatuses(loaded);
  }, []);

  const getStatus = (engine: Engine): "active" | "quota" | "inactive" | "admin" => {
    if (isPremium && engine.adminEnabled) return "admin";
    const s = statuses[engine.id];
    if (s === "active") return "active";
    if (s === "quota") return "quota";
    return "inactive";
  };

  return (
    <section className="container mx-auto px-4 py-8" id="engines">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">AI Engine Cluster</h2>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
            {isPremium ? "Premium" : "BYOK"}
          </Badge>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help underline decoration-dotted">
                How it works?
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-xs">
              <p>
                <strong>Free:</strong> Add keys in API Settings and test them.
                <br />
                <strong>Premium:</strong> Optimized Admin Cluster (Gemini/Groq/Claude/DeepSeek).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {engines.map((engine) => {
          const status = getStatus(engine);
          const isUp = status === "admin" || status === "active";
          const isQuota = status === "quota";

          return (
            <div
              key={engine.id}
              className={`glass-card p-3 rounded-xl flex flex-col items-center gap-2 transition-all duration-300 relative ${
                isUp
                  ? "border-accent/40 shadow-[var(--glow-green)]"
                  : isQuota
                  ? "border-yellow-400/30 shadow-[0_0_20px_hsl(45_100%_50%/0.15)]"
                  : "border-border/30 opacity-80"
              }`}
            >
              <div className="absolute top-2 right-2">
                <span
                  className={`block h-2 w-2 rounded-full ${
                    isUp ? "bg-accent animate-pulse" : isQuota ? "bg-yellow-400 animate-pulse" : "bg-destructive"
                  }`}
                />
              </div>

              <span className={`text-2xl transition-all ${isUp ? "" : "grayscale opacity-60"}`}>
                {engine.icon}
              </span>

              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold truncate">{engine.name}</span>
                {isUp ? (
                  <Unlock className="h-3 w-3 text-accent" />
                ) : (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>

              {isPremium && engine.adminEnabled && (
                <span className="text-[9px] text-accent font-medium">Admin ✓</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default EngineGrid;

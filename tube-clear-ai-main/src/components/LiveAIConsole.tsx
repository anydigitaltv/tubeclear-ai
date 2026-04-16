import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, CheckCircle, AlertTriangle, Zap } from "lucide-react";

export interface AIThought {
  id: string;
  timestamp: string;
  message: string;
  type: "thinking" | "analyzing" | "warning" | "success" | "info";
  stage?: string;
}

interface LiveAIConsoleProps {
  thoughts: AIThought[];
  isScanning: boolean;
  currentStage?: string;
}

export const LiveAIConsole = ({ thoughts, isScanning, currentStage }: LiveAIConsoleProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [displayedThoughts, setDisplayedThoughts] = useState<AIThought[]>([]);

  // Auto-scroll to bottom when new thoughts arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  // Animate thoughts appearing one by one
  useEffect(() => {
    if (thoughts.length > displayedThoughts.length) {
      const nextThought = thoughts[displayedThoughts.length];
      const timeout = setTimeout(() => {
        setDisplayedThoughts(prev => [...prev, nextThought]);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [thoughts, displayedThoughts]);

  const getThoughtIcon = (type: AIThought["type"]) => {
    switch (type) {
      case "thinking":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case "analyzing":
        return <Brain className="w-4 h-4 text-purple-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "info":
        return <Zap className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getThoughtColor = (type: AIThought["type"]) => {
    switch (type) {
      case "thinking":
        return "text-blue-300";
      case "analyzing":
        return "text-purple-300";
      case "warning":
        return "text-yellow-300";
      case "success":
        return "text-green-300";
      case "info":
        return "text-cyan-300";
    }
  };

  return (
    <Card className="bg-black/40 border border-cyan-500/20 backdrop-blur-sm overflow-hidden">
      <div className="p-3 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-cyan-300">Live AI Thinking Console</h3>
          </div>
          {isScanning && (
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 bg-cyan-500/10">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {currentStage || "Processing"}
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="h-64 p-3" ref={scrollRef}>
        <div className="space-y-2">
          {displayedThoughts.length === 0 && isScanning && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI is starting analysis...
            </div>
          )}

          {displayedThoughts.map((thought) => (
            <div
              key={thought.id}
              className="flex items-start gap-2 p-2 rounded-md bg-white/5 border border-white/10 animate-fade-in"
            >
              <div className="mt-0.5 flex-shrink-0">
                {getThoughtIcon(thought.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${getThoughtColor(thought.type)} font-mono`}>
                  {thought.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {thought.timestamp}
                  {thought.stage && ` • ${thought.stage}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default LiveAIConsole;

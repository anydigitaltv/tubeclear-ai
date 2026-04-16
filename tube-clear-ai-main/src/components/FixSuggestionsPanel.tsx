import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Copy, Check, Lightbulb, Zap } from "lucide-react";
import { toast } from "sonner";

export interface FixSuggestion {
  id: string;
  violationId: string;
  title: string;
  description: string;
  action: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: string;
  impact: "high" | "medium" | "low";
}

interface FixSuggestionsPanelProps {
  suggestions: FixSuggestion[];
  onApplyFix?: (suggestion: FixSuggestion) => void;
}

export const FixSuggestionsPanel = ({ suggestions, onApplyFix }: FixSuggestionsPanelProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (suggestions.length === 0) return null;

  const getDifficultyColor = (difficulty: FixSuggestion["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/20 text-green-300 border-green-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "hard":
        return "bg-red-500/20 text-red-300 border-red-500/50";
    }
  };

  const getImpactColor = (impact: FixSuggestion["impact"]) => {
    switch (impact) {
      case "high":
        return "bg-green-500/20 text-green-300 border-green-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "low":
        return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  const handleCopy = (suggestion: FixSuggestion) => {
    const text = `${suggestion.title}\n\n${suggestion.description}\n\nAction: ${suggestion.action}`;
    navigator.clipboard.writeText(text);
    setCopiedId(suggestion.id);
    toast.success("Fix suggestion copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyFix = (suggestion: FixSuggestion) => {
    onApplyFix?.(suggestion);
    toast.success(`Applying fix: ${suggestion.title}`);
  };

  return (
    <Card className="bg-black/40 border border-green-500/20 backdrop-blur-sm overflow-hidden">
      <div className="p-4 border-b border-green-500/20 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-green-300">
            One-Click Fix Suggestions
          </h3>
          <Badge variant="outline" className="ml-auto border-green-500/50 text-green-300">
            <Lightbulb className="w-3 h-3 mr-1" />
            {suggestions.length} Fix{suggestions.length > 1 ? "es" : ""} Available
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          AI-generated actionable fixes to make your video compliant
        </p>
      </div>

      <div className="p-4 space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="border border-white/10 rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors animate-fade-in"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-green-300 mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  {suggestion.title}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getDifficultyColor(suggestion.difficulty)}>
                    {suggestion.difficulty.toUpperCase()}
                  </Badge>
                  <Badge className={getImpactColor(suggestion.impact)}>
                    {suggestion.impact.toUpperCase()} IMPACT
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ⏱️ {suggestion.estimatedTime}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-300 mb-3 leading-relaxed">
              {suggestion.description}
            </p>

            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-3">
              <p className="text-sm text-green-200 font-medium">
                💡 <strong>Action:</strong> {suggestion.action}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleApplyFix(suggestion)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Apply This Fix
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(suggestion)}
                className="border-white/20 hover:bg-white/10"
              >
                {copiedId === suggestion.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default FixSuggestionsPanel;

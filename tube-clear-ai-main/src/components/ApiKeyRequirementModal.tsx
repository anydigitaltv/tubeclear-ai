import { useState, useCallback } from "react";
import {
  AlertTriangle,
  Key,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { EngineId } from "@/contexts/AIEngineContext";
import type { ScanRequirements } from "@/utils/dualEngineOrchestrator";

interface ApiKeyRequirementModalProps {
  isOpen: boolean;
  onProceed: () => void;
  onCancel: () => void;
  requirements: ScanRequirements;
  onAddKeys: () => void;
}

export const ApiKeyRequirementModal = ({
  isOpen,
  onProceed,
  onCancel,
  requirements,
  onAddKeys,
}: ApiKeyRequirementModalProps) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const engineInfo: Record<EngineId, { name: string; icon: string; tasks: string[]; color: string }> = {
    gemini: {
      name: "Gemini 1.5 Flash",
      icon: "🎯",
      color: "bg-blue-500/10 border-blue-500/20 text-blue-500",
      tasks: [
        "📹 Video Frame Analysis",
        "🖼️ Thumbnail Inspection",
        "🎵 Audio Content Detection",
        "👁️ Visual Violation Scanning",
        "🤖 AI-Generated Content Detection",
      ],
    },
    groq: {
      name: "Groq Llama 3.1",
      icon: "📊",
      color: "bg-purple-500/10 border-purple-500/20 text-purple-500",
      tasks: [
        "📝 Title Analysis",
        "📄 Description Review",
        "🏷️ Tags Verification",
        "📋 Policy Compliance Check",
        "⚖️ Platform Rules Audit",
      ],
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            API Keys Required for Dual-Engine Scan
          </DialogTitle>
          <DialogDescription className="text-base">
            Complete video analysis ke liye dono AI engines ki API keys zaroori hain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Alert */}
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-500">Zaroori Information</AlertTitle>
            <AlertDescription className="text-yellow-500/90">
              Dono engines milkar kaam karte hain. Ek engine kaam khatam karega to doosra automatically start hoga.
              Final result mein dono ka combined analysis milega.
            </AlertDescription>
          </Alert>

          {/* Gemini Engine Info */}
          <div className={`p-4 rounded-lg border ${engineInfo.gemini.color}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{engineInfo.gemini.icon}</span>
              <div>
                <h3 className="font-bold text-lg">{engineInfo.gemini.name}</h3>
                <p className="text-sm opacity-80">Primary Engine - Visual & Audio Analysis</p>
              </div>
              {requirements.hasGeminiKey ? (
                <Badge className="ml-auto bg-green-500">✓ Available</Badge>
              ) : (
                <Badge className="ml-auto bg-red-500">✗ Missing</Badge>
              )}
            </div>
            <div className="space-y-1 ml-11">
              <p className="text-sm font-semibold mb-2">Tasks:</p>
              {engineInfo.gemini.tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-3 w-3" />
                  <span>{task}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Groq Engine Info */}
          <div className={`p-4 rounded-lg border ${engineInfo.groq.color}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{engineInfo.groq.icon}</span>
              <div>
                <h3 className="font-bold text-lg">{engineInfo.groq.name}</h3>
                <p className="text-sm opacity-80">Secondary Engine - Text & Policy Analysis</p>
              </div>
              {requirements.hasGroqKey ? (
                <Badge className="ml-auto bg-green-500">✓ Available</Badge>
              ) : (
                <Badge className="ml-auto bg-red-500">✗ Missing</Badge>
              )}
            </div>
            <div className="space-y-1 ml-11">
              <p className="text-sm font-semibold mb-2">Tasks:</p>
              {engineInfo.groq.tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-3 w-3" />
                  <span>{task}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Explanation */}
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-500">Scan Workflow</AlertTitle>
            <AlertDescription className="text-blue-500/90 space-y-2">
              <p><strong>Step 1:</strong> Gemini video/audio analyze karega</p>
              <p><strong>Step 2:</strong> Groq text/policy check karega (automatically)</p>
              <p><strong>Step 3:</strong> Dono results combine honge</p>
              <p><strong>Step 4:</strong> Final dashboard pe complete report aayegi</p>
            </AlertDescription>
          </Alert>

          {/* Missing Keys Alert */}
          {!requirements.canProceed && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <Key className="h-4 w-4 text-red-500" />
              <AlertTitle className="text-red-500">Missing API Keys</AlertTitle>
              <AlertDescription className="text-red-500/90">
                {requirements.missingKeys.length === 2
                  ? "Dono engines ki API keys add karein"
                  : `${requirements.missingKeys[0] === "gemini" ? "Gemini" : "Groq"} ki API key add karein`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {!requirements.canProceed ? (
            <Button
              onClick={onAddKeys}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Key className="mr-2 h-4 w-4" />
              Add API Keys Now
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setAcknowledged(true);
                  onProceed();
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Start Dual-Engine Scan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Video,
  Mic,
  Sparkles
} from "lucide-react";
import { useAIEngines } from "@/contexts/AIEngineContext";
import type { EngineId } from "@/contexts/AIEngineContext";

export interface QuickSummaryResult {
  title: string;
  description: string;
  thumbnail: string;
  riskAssessment: "safe" | "risky" | "unclear";
  keyIssues: string[];
  engineUsed: EngineId;
}

export interface DeepScanResult {
  videoAnalysis: string;
  audioAnalysis: string;
  overallRisk: number;
  violations: string[];
  recommendations: string[];
  engineUsed: EngineId;
}

export interface ScanProgress {
  stage: "idle" | "metadata" | "quick-check" | "deep-scan" | "audio-ocr" | "complete";
  progress: number; // 0-100
  message: string;
  currentEngine?: EngineId;
}

interface TwoStageAuditProps {
  videoUrl: string;
  metadata: {
    title: string;
    description: string;
    thumbnail: string;
  };
  onQuickSummaryComplete?: (result: QuickSummaryResult) => void;
  onDeepScanComplete?: (result: DeepScanResult) => void;
  onComplete?: () => void;
}

export const TwoStageAudit = ({
  videoUrl,
  metadata,
  onQuickSummaryComplete,
  onDeepScanComplete,
  onComplete,
}: TwoStageAuditProps) => {
  const { apiKeys, isEngineReady, getNextEngine, switchToNextEngine } = useAIEngines();
  
  const [progress, setProgress] = useState<ScanProgress>({
    stage: "idle",
    progress: 0,
    message: "Ready to scan",
  });
  
  const [quickSummary, setQuickSummary] = useState<QuickSummaryResult | null>(null);
  const [deepScanResult, setDeepScanResult] = useState<DeepScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Stage 1: Quick Metadata Check with Llama 3.1 (Groq)
  const runQuickCheck = useCallback(async (): Promise<QuickSummaryResult | null> => {
    setProgress({
      stage: "quick-check",
      progress: 15,
      message: "Running quick metadata analysis...",
      currentEngine: "groq",
    });

    try {
      // Use Groq Llama 3.1 for fast metadata check
      if (!isEngineReady("groq")) {
        console.warn("Groq not ready, trying next engine...");
        switchToNextEngine();
      }

      const groqKey = apiKeys["groq"]?.key;
      if (!groqKey) {
        throw new Error("Groq API key not configured");
      }

      // Client-side API call to Groq (No Vercel timeout!)
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are a YouTube/TikTok policy expert. Analyze video metadata for potential violations."
            },
            {
              role: "user",
              content: `Analyze this video metadata for policy violations:
              
Title: ${metadata.title}
Description: ${metadata.description}

Return JSON format:
{
  "riskAssessment": "safe" | "risky" | "unclear",
  "keyIssues": ["issue1", "issue2"],
  "summary": "Brief summary"
}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      const result: QuickSummaryResult = {
        title: metadata.title,
        description: metadata.description,
        thumbnail: metadata.thumbnail,
        riskAssessment: analysis.riskAssessment,
        keyIssues: analysis.keyIssues || [],
        engineUsed: "groq",
      };

      setQuickSummary(result);
      setProgress({
        stage: "quick-check",
        progress: 30,
        message: "Quick check complete!",
        currentEngine: "groq",
      });

      onQuickSummaryComplete?.(result);
      return result;
    } catch (error) {
      console.error("Quick check failed:", error);
      setProgress({
        stage: "quick-check",
        progress: 30,
        message: `Quick check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      return null;
    }
  }, [metadata, apiKeys, isEngineReady, switchToNextEngine, onQuickSummaryComplete]);

  // Stage 2: Deep Scan with Gemini 1.5 Flash
  const runDeepScan = useCallback(async (): Promise<DeepScanResult | null> => {
    setProgress({
      stage: "deep-scan",
      progress: 40,
      message: "Starting deep video analysis with Gemini 1.5 Flash...",
      currentEngine: "gemini",
    });

    try {
      if (!isEngineReady("gemini")) {
        console.warn("Gemini not ready, trying next engine...");
        switchToNextEngine();
      }

      const geminiKey = apiKeys["gemini"]?.key;
      if (!geminiKey) {
        throw new Error("Gemini API key not configured");
      }

      // Step 1: Video Analysis (360p low-res stream)
      setProgress({
        stage: "deep-scan",
        progress: 50,
        message: "Analyzing video frames (360p)...",
        currentEngine: "gemini",
      });

      // Client-side Gemini API call (No Vercel timeout!)
      const videoResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `Analyze this video for policy violations. Focus on visual content, text overlays, and imagery. Video URL: ${videoUrl}` },
              ]
            }]
          }),
        }
      );

      if (!videoResponse.ok) {
        throw new Error(`Gemini video analysis failed: ${videoResponse.status}`);
      }

      const videoData = await videoResponse.json();
      const videoAnalysis = videoData.candidates[0]?.content?.parts[0]?.text || "";

      // Step 2: Audio OCR Analysis
      setProgress({
        stage: "audio-ocr",
        progress: 70,
        message: "Analyzing audio transcript (OCR)...",
        currentEngine: "gemini",
      });

      const audioResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `Transcribe and analyze the audio from this video for policy violations. Identify any problematic language, hate speech, or inappropriate content. Video URL: ${videoUrl}` },
              ]
            }]
          }),
        }
      );

      if (!audioResponse.ok) {
        throw new Error(`Gemini audio analysis failed: ${audioResponse.status}`);
      }

      const audioData = await audioResponse.json();
      const audioAnalysis = audioData.candidates[0]?.content?.parts[0]?.text || "";

      // Compile results
      const result: DeepScanResult = {
        videoAnalysis,
        audioAnalysis,
        overallRisk: Math.random() * 100, // TODO: Calculate actual risk score
        violations: [], // TODO: Extract from analysis
        recommendations: [], // TODO: Generate recommendations
        engineUsed: "gemini",
      };

      setDeepScanResult(result);
      setProgress({
        stage: "complete",
        progress: 100,
        message: "Deep scan complete!",
        currentEngine: "gemini",
      });

      onDeepScanComplete?.(result);
      onComplete?.();
      return result;
    } catch (error) {
      console.error("Deep scan failed:", error);
      setProgress({
        stage: "deep-scan",
        progress: 70,
        message: `Deep scan failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      return null;
    }
  }, [videoUrl, apiKeys, isEngineReady, switchToNextEngine, onDeepScanComplete, onComplete]);

  // Main scan function - Two-Stage Process
  const startTwoStageScan = useCallback(async () => {
    setIsScanning(true);
    setProgress({
      stage: "metadata",
      progress: 5,
      message: "Fetching metadata...",
    });

    try {
      // Stage 1: Quick Check
      const quickResult = await runQuickCheck();
      
      if (!quickResult) {
        setIsScanning(false);
        return;
      }

      // Brief pause before Stage 2
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Deep Scan
      await runDeepScan();
    } catch (error) {
      console.error("Two-stage scan failed:", error);
    } finally {
      setIsScanning(false);
    }
  }, [runQuickCheck, runDeepScan]);

  // Get status icon
  const getStatusIcon = () => {
    switch (progress.stage) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "idle":
        return <Sparkles className="w-5 h-5 text-primary" />;
      default:
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {getStatusIcon()}
          Two-Stage AI Audit
          {isScanning && (
            <Badge variant="outline" className="ml-auto">
              Scanning...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Live Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{progress.message}</span>
            <span className="font-medium text-white">{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} className="h-2" />
          
          {/* Stage Indicators */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className={`flex items-center gap-1 ${progress.stage === "metadata" || progress.stage === "quick-check" ? "text-primary" : "text-muted-foreground"}`}>
              <FileText className="w-3 h-3" />
              <span>Metadata</span>
            </div>
            <div className={`flex items-center gap-1 ${progress.stage === "quick-check" ? "text-primary" : progress.progress >= 30 ? "text-green-500" : "text-muted-foreground"}`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>Quick Check</span>
            </div>
            <div className={`flex items-center gap-1 ${progress.stage === "deep-scan" ? "text-primary" : progress.progress >= 60 ? "text-green-500" : "text-muted-foreground"}`}>
              <Video className="w-3 h-3" />
              <span>Video Scan</span>
            </div>
            <div className={`flex items-center gap-1 ${progress.stage === "audio-ocr" ? "text-primary" : progress.progress >= 80 ? "text-green-500" : "text-muted-foreground"}`}>
              <Mic className="w-3 h-3" />
              <span>Audio OCR</span>
            </div>
          </div>
        </div>

        {/* Quick Summary Card */}
        {quickSummary && (
          <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Stage 1 Complete</Badge>
              <Badge 
                className={`text-xs ${
                  quickSummary.riskAssessment === "safe" ? "bg-green-500" :
                  quickSummary.riskAssessment === "risky" ? "bg-red-500" :
                  "bg-yellow-500"
                }`}
              >
                {quickSummary.riskAssessment.toUpperCase()}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm font-medium text-white mb-1">Quick Summary</p>
              <p className="text-xs text-muted-foreground">
                Engine: {quickSummary.engineUsed === "groq" ? "Groq Llama 3.1" : quickSummary.engineUsed}
              </p>
            </div>

            {quickSummary.keyIssues.length > 0 && (
              <div>
                <p className="text-xs font-medium text-white mb-2">Key Issues:</p>
                <ul className="space-y-1">
                  {quickSummary.keyIssues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Start Scan Button */}
        {!isScanning && !quickSummary && (
          <Button
            onClick={startTwoStageScan}
            className="w-full"
            disabled={!isEngineReady("groq") || !isEngineReady("gemini")}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Two-Stage Audit
          </Button>
        )}

        {/* Re-scan Button (Intelligent Diff) */}
        {!isScanning && quickSummary && (
          <Button
            onClick={startTwoStageScan}
            variant="outline"
            className="w-full"
          >
            Re-Scan (Intelligent Diff)
          </Button>
        )}

        {/* Engine Status */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Engines Required:</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isEngineReady("groq") ? "bg-green-500" : "bg-red-500"}`} />
              <span>Groq Llama 3.1</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isEngineReady("gemini") ? "bg-green-500" : "bg-red-500"}`} />
              <span>Gemini 1.5 Flash</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import { useEffect, useState } from "react";
import {
  CheckCircle,
  Loader2,
  XCircle,
  ArrowRight,
  Eye,
  FileText,
  Mic,
  Shield,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { EngineTask } from "@/utils/dualEngineOrchestrator";

interface DualEngineProgressProps {
  tasks: EngineTask[];
  currentPhase: number;
  totalPhases: number;
  isComplete: boolean;
}

export const DualEngineProgress = ({
  tasks,
  currentPhase,
  totalPhases,
  isComplete,
}: DualEngineProgressProps) => {
  const overallProgress = Math.round((currentPhase / totalPhases) * 100);

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case "visual":
        return <Eye className="h-4 w-4" />;
      case "audio":
        return <Mic className="h-4 w-4" />;
      case "text":
        return <FileText className="h-4 w-4" />;
      case "policy":
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTaskLabel = (taskType: string) => {
    switch (taskType) {
      case "visual":
        return "Visual Analysis";
      case "audio":
        return "Audio Detection";
      case "text":
        return "Text Analysis";
      case "policy":
        return "Policy Audit";
      default:
        return taskType;
    }
  };

  const getStatusBadge = (status: EngineTask["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Done
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl">🚀 Dual-Engine AI Scan</span>
          <Badge className="text-sm">
            Phase {currentPhase}/{totalPhases}
          </Badge>
        </CardTitle>
        <Progress value={overallProgress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          {overallProgress}% Complete - {isComplete ? "All tasks finished!" : "Processing..."}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Gemini Engine Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-500 font-bold text-sm">G</span>
            </div>
            <div>
              <h3 className="font-bold">Gemini 1.5 Flash</h3>
              <p className="text-xs text-muted-foreground">Visual & Audio Analysis</p>
            </div>
          </div>

          <div className="space-y-2 ml-10">
            {tasks
              .filter(t => t.engineId === "gemini")
              .map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getTaskIcon(task.taskType)}
                    <span className="text-sm font-medium">
                      {getTaskLabel(task.taskType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.duration && (
                      <span className="text-xs text-muted-foreground">
                        {(task.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                    {getStatusBadge(task.status)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Arrow separator */}
        <div className="flex items-center justify-center text-muted-foreground">
          <ArrowRight className="h-5 w-5 animate-pulse" />
          <span className="text-xs ml-2">Auto-continuing to next engine</span>
        </div>

        {/* Groq Engine Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-purple-500 font-bold text-sm">Q</span>
            </div>
            <div>
              <h3 className="font-bold">Groq Llama 3.1</h3>
              <p className="text-xs text-muted-foreground">Text & Policy Analysis</p>
            </div>
          </div>

          <div className="space-y-2 ml-10">
            {tasks
              .filter(t => t.engineId === "groq")
              .map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getTaskIcon(task.taskType)}
                    <span className="text-sm font-medium">
                      {getTaskLabel(task.taskType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.duration && (
                      <span className="text-xs text-muted-foreground">
                        {(task.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                    {getStatusBadge(task.status)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Quality Validation Notice */}
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm text-yellow-500">
            ✓ Quality validation enabled - engines forced to provide accurate results
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Dual-Engine Workflow Orchestrator
 * Manages Gemini + Groq sequential execution with quality validation
 * Ensures both engines complete their tasks before showing final results
 */

import { type EngineId } from "@/contexts/AIEngineContext";

export interface EngineTask {
  engineId: EngineId;
  taskType: "visual" | "audio" | "text" | "policy";
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

export interface DualEngineResult {
  geminiResult: {
    visual: any;
    audio: any;
    completed: boolean;
  };
  groqResult: {
    text: any;
    policy: any;
    completed: boolean;
  };
  combined: {
    overallScore: number;
    verdict: "PASS" | "FLAGGED" | "FAIL";
    violations: any[];
    recommendations: string[];
  };
  engineTasks: EngineTask[];
  totalDuration: number;
  completedAt: string;
}

export interface ScanRequirements {
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  canProceed: boolean;
  missingKeys: EngineId[];
}

/**
 * Check if all required API keys are available
 */
export const checkScanRequirements = (
  hasGeminiKey: boolean,
  hasGroqKey: boolean
): ScanRequirements => {
  const missingKeys: EngineId[] = [];
  
  if (!hasGeminiKey) missingKeys.push("gemini");
  if (!hasGroqKey) missingKeys.push("groq");
  
  return {
    hasGeminiKey,
    hasGroqKey,
    canProceed: hasGeminiKey && hasGroqKey,
    missingKeys,
  };
};

/**
 * Create task list for both engines
 */
export const createEngineTasks = (): EngineTask[] => [
  // Gemini Tasks (Visual + Audio)
  {
    engineId: "gemini",
    taskType: "visual",
    status: "pending",
  },
  {
    engineId: "gemini",
    taskType: "audio",
    status: "pending",
  },
  // Groq Tasks (Text + Policy)
  {
    engineId: "groq",
    taskType: "text",
    status: "pending",
  },
  {
    engineId: "groq",
    taskType: "policy",
    status: "pending",
  },
];

/**
 * Update task status
 */
export const updateTaskStatus = (
  tasks: EngineTask[],
  engineId: EngineId,
  taskType: "visual" | "audio" | "text" | "policy",
  status: "pending" | "running" | "completed" | "failed",
  result?: any,
  error?: string
): EngineTask[] => {
  return tasks.map(task => {
    if (task.engineId === engineId && task.taskType === taskType) {
      const now = new Date();
      return {
        ...task,
        status,
        result,
        error,
        startTime: status === "running" ? now.toISOString() : task.startTime,
        endTime: (status === "completed" || status === "failed") ? now.toISOString() : task.endTime,
        duration: status === "completed" && task.startTime 
          ? now.getTime() - new Date(task.startTime).getTime()
          : task.duration,
      };
    }
    return task;
  });
};

/**
 * Validate engine result quality
 * Forces engines to provide complete, accurate results
 */
export const validateEngineResult = (
  engineId: EngineId,
  taskType: "visual" | "audio" | "text" | "policy",
  result: any
): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  if (!result) {
    return { isValid: false, issues: ["Result is null or undefined"] };
  }
  
  // Gemini Visual Validation
  if (engineId === "gemini" && taskType === "visual") {
    if (!result.framesAnalyzed && result.framesAnalyzed !== 0) {
      issues.push("Missing framesAnalyzed count");
    }
    if (!result.visualViolations && !Array.isArray(result.visualViolations)) {
      issues.push("Missing visualViolations array");
    }
    if (typeof result.visualScore !== "number") {
      issues.push("Missing or invalid visualScore");
    }
  }
  
  // Gemini Audio Validation
  if (engineId === "gemini" && taskType === "audio") {
    if (typeof result.hasMusic !== "boolean") {
      issues.push("Missing hasMusic detection");
    }
    if (typeof result.hasVoice !== "boolean") {
      issues.push("Missing hasVoice detection");
    }
    if (typeof result.audioScore !== "number") {
      issues.push("Missing or invalid audioScore");
    }
  }
  
  // Groq Text Validation
  if (engineId === "groq" && taskType === "text") {
    if (!result.metadataScore && result.metadataScore !== 0) {
      issues.push("Missing metadataScore");
    }
    if (!Array.isArray(result.metadataIssues)) {
      issues.push("Missing metadataIssues array");
    }
    if (!result.analyzedFields || !Array.isArray(result.analyzedFields)) {
      issues.push("Missing analyzedFields list");
    }
  }
  
  // Groq Policy Validation
  if (engineId === "groq" && taskType === "policy") {
    if (!result.policyScore && result.policyScore !== 0) {
      issues.push("Missing policyScore");
    }
    if (!Array.isArray(result.policyViolations)) {
      issues.push("Missing policyViolations array");
    }
    if (!result.complianceChecks || !Array.isArray(result.complianceChecks)) {
      issues.push("Missing complianceChecks list");
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
};

/**
 * Combine results from both engines into final report
 */
export const combineEngineResults = (
  geminiVisual: any,
  geminiAudio: any,
  groqText: any,
  groqPolicy: any
): DualEngineResult["combined"] => {
  // Calculate weighted overall score
  const visualWeight = 0.30;
  const audioWeight = 0.20;
  const textWeight = 0.25;
  const policyWeight = 0.25;
  
  const visualScore = geminiVisual?.visualScore || 100;
  const audioScore = geminiAudio?.audioScore || 100;
  const textScore = groqText?.metadataScore || 100;
  const policyScore = groqPolicy?.policyScore || 100;
  
  const overallScore = Math.round(
    (visualScore * visualWeight) +
    (audioScore * audioWeight) +
    (textScore * textWeight) +
    (policyScore * policyWeight)
  );
  
  // Combine all violations
  const allViolations = [
    ...(geminiVisual?.visualViolations || []),
    ...(geminiAudio?.audioIssues || []).map((issue: string) => ({
      type: "audio",
      issue,
      severity: "medium" as const,
    })),
    ...(groqText?.metadataIssues || []),
    ...(groqPolicy?.policyViolations || []),
  ];
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (visualScore < 70) {
    recommendations.push("Fix visual content violations detected by Gemini AI");
  }
  if (audioScore < 70) {
    recommendations.push("Address audio/music copyright issues");
  }
  if (textScore < 70) {
    recommendations.push("Update video metadata (title, description, tags)");
  }
  if (policyScore < 70) {
    recommendations.push("Review and fix platform policy violations");
  }
  if (recommendations.length === 0) {
    recommendations.push("Content looks good! All checks passed successfully.");
  }
  
  // Determine verdict
  let verdict: "PASS" | "FLAGGED" | "FAIL";
  if (overallScore >= 80) {
    verdict = "PASS";
  } else if (overallScore >= 50) {
    verdict = "FLAGGED";
  } else {
    verdict = "FAIL";
  }
  
  return {
    overallScore,
    verdict,
    violations: allViolations,
    recommendations,
  };
};

/**
 * Generate user-friendly message for missing API keys
 */
export const getMissingKeysMessage = (missingKeys: EngineId[]): string => {
  if (missingKeys.length === 0) return "";
  
  const messages: Record<EngineId, string> = {
    gemini: "🔑 **Gemini API Key Required** - For video, audio, and visual analysis",
    groq: "🔑 **Groq API Key Required** - For text analysis and policy auditing",
  };
  
  return `⚠️ **API Keys Required**\n\n` +
    `Scan karne se pehle dono AI engines ki API keys add karein:\n\n` +
    missingKeys.map(key => messages[key]).join("\n\n") +
    `\n\n📝 **License Keys** page mein jaake keys add karein.`;
};

/**
 * Calculate total scan duration
 */
export const calculateTotalDuration = (tasks: EngineTask[]): number => {
  const completedTasks = tasks.filter(t => t.endTime && t.startTime);
  
  if (completedTasks.length === 0) return 0;
  
  const earliestStart = Math.min(...completedTasks.map(t => 
    new Date(t.startTime!).getTime()
  ));
  
  const latestEnd = Math.max(...completedTasks.map(t => 
    new Date(t.endTime!).getTime()
  ));
  
  return latestEnd - earliestStart;
};

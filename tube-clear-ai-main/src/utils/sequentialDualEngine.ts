/**
 * Sequential Dual-Engine Execution
 * Gemini finishes → Groq starts automatically
 * Quality validation at each step
 */

import { type EngineId } from "@/contexts/AIEngineContext";
import {
  type EngineTask,
  type DualEngineResult,
  createEngineTasks,
  updateTaskStatus,
  validateEngineResult,
  combineEngineResults,
  calculateTotalDuration,
} from "./dualEngineOrchestrator";

interface ScanInput {
  videoUrl: string;
  title: string;
  description: string;
  tags: string[];
  thumbnailUrl?: string;
  platformId: string;
}

interface ExecutionCallbacks {
  onTaskStart?: (task: EngineTask) => void;
  onTaskComplete?: (task: EngineTask) => void;
  onTaskFailed?: (task: EngineTask) => void;
  onAllComplete?: (result: DualEngineResult) => void;
}

/**
 * Execute dual-engine scan sequentially
 */
export const executeDualEngineScan = async (
  input: ScanInput,
  callbacks: ExecutionCallbacks = {}
): Promise<DualEngineResult> => {
  let tasks = createEngineTasks();
  const startTime = Date.now();

  console.log("🚀 Starting Dual-Engine Sequential Scan...");
  console.log("📋 Tasks:", tasks.map(t => `${t.engineId}:${t.taskType}`).join(", "));

  // ====================
  // PHASE 1: GEMINI (Visual + Audio)
  // ====================
  console.log("\n🎯 PHASE 1: Gemini AI - Visual & Audio Analysis");

  // Task 1: Gemini Visual Analysis
  tasks = updateTaskStatus(tasks, "gemini", "visual", "running");
  callbacks.onTaskStart?.(tasks.find(t => t.engineId === "gemini" && t.taskType === "visual")!);

  try {
    console.log("  👁️ Running visual analysis...");
    const geminiVisualResult = await runGeminiVisual(input);
    
    // Quality validation
    const validation = validateEngineResult("gemini", "visual", geminiVisualResult);
    if (!validation.isValid) {
      console.warn("  ⚠️ Gemini visual validation failed:", validation.issues);
      // Force re-run or use fallback
      throw new Error(`Visual validation failed: ${validation.issues.join(", ")}`);
    }

    tasks = updateTaskStatus(tasks, "gemini", "visual", "completed", geminiVisualResult);
    callbacks.onTaskComplete?.(tasks.find(t => t.engineId === "gemini" && t.taskType === "visual")!);
    console.log("  ✅ Visual analysis complete!");
  } catch (error: any) {
    console.error("  ❌ Visual analysis failed:", error.message);
    tasks = updateTaskStatus(tasks, "gemini", "visual", "failed", undefined, error.message);
    callbacks.onTaskFailed?.(tasks.find(t => t.engineId === "gemini" && t.taskType === "visual")!);
  }

  // Task 2: Gemini Audio Analysis
  tasks = updateTaskStatus(tasks, "gemini", "audio", "running");
  callbacks.onTaskStart?.(tasks.find(t => t.engineId === "gemini" && t.taskType === "audio")!);

  try {
    console.log("  🎵 Running audio analysis...");
    const geminiAudioResult = await runGeminiAudio(input);
    
    // Quality validation
    const validation = validateEngineResult("gemini", "audio", geminiAudioResult);
    if (!validation.isValid) {
      console.warn("  ⚠️ Gemini audio validation failed:", validation.issues);
      throw new Error(`Audio validation failed: ${validation.issues.join(", ")}`);
    }

    tasks = updateTaskStatus(tasks, "gemini", "audio", "completed", geminiAudioResult);
    callbacks.onTaskComplete?.(tasks.find(t => t.engineId === "gemini" && t.taskType === "audio")!);
    console.log("  ✅ Audio analysis complete!");
  } catch (error: any) {
    console.error("  ❌ Audio analysis failed:", error.message);
    tasks = updateTaskStatus(tasks, "gemini", "audio", "failed", undefined, error.message);
    callbacks.onTaskFailed?.(tasks.find(t => t.engineId === "gemini" && t.taskType === "audio")!);
  }

  // ====================
  // PHASE 2: GROQ (Text + Policy) - AUTOMATIC START
  // ====================
  console.log("\n📊 PHASE 2: Groq AI - Text & Policy Analysis (Auto-starting...)");

  // Task 3: Groq Text Analysis
  tasks = updateTaskStatus(tasks, "groq", "text", "running");
  callbacks.onTaskStart?.(tasks.find(t => t.engineId === "groq" && t.taskType === "text")!);

  try {
    console.log("  📝 Running text analysis...");
    const groqTextResult = await runGroqText(input);
    
    // Quality validation
    const validation = validateEngineResult("groq", "text", groqTextResult);
    if (!validation.isValid) {
      console.warn("  ⚠️ Groq text validation failed:", validation.issues);
      throw new Error(`Text validation failed: ${validation.issues.join(", ")}`);
    }

    tasks = updateTaskStatus(tasks, "groq", "text", "completed", groqTextResult);
    callbacks.onTaskComplete?.(tasks.find(t => t.engineId === "groq" && t.taskType === "text")!);
    console.log("  ✅ Text analysis complete!");
  } catch (error: any) {
    console.error("  ❌ Text analysis failed:", error.message);
    tasks = updateTaskStatus(tasks, "groq", "text", "failed", undefined, error.message);
    callbacks.onTaskFailed?.(tasks.find(t => t.engineId === "groq" && t.taskType === "text")!);
  }

  // Task 4: Groq Policy Analysis
  tasks = updateTaskStatus(tasks, "groq", "policy", "running");
  callbacks.onTaskStart?.(tasks.find(t => t.engineId === "groq" && t.taskType === "policy")!);

  try {
    console.log("  📋 Running policy analysis...");
    const groqPolicyResult = await runGroqPolicy(input);
    
    // Quality validation
    const validation = validateEngineResult("groq", "policy", groqPolicyResult);
    if (!validation.isValid) {
      console.warn("  ⚠️ Groq policy validation failed:", validation.issues);
      throw new Error(`Policy validation failed: ${validation.issues.join(", ")}`);
    }

    tasks = updateTaskStatus(tasks, "groq", "policy", "completed", groqPolicyResult);
    callbacks.onTaskComplete?.(tasks.find(t => t.engineId === "groq" && t.taskType === "policy")!);
    console.log("  ✅ Policy analysis complete!");
  } catch (error: any) {
    console.error("  ❌ Policy analysis failed:", error.message);
    tasks = updateTaskStatus(tasks, "groq", "policy", "failed", undefined, error.message);
    callbacks.onTaskFailed?.(tasks.find(t => t.engineId === "groq" && t.taskType === "policy")!);
  }

  // ====================
  // PHASE 3: COMBINE RESULTS
  // ====================
  console.log("\n🔀 PHASE 3: Combining results from both engines...");

  const geminiVisual = tasks.find(t => t.engineId === "gemini" && t.taskType === "visual")?.result;
  const geminiAudio = tasks.find(t => t.engineId === "gemini" && t.taskType === "audio")?.result;
  const groqText = tasks.find(t => t.engineId === "groq" && t.taskType === "text")?.result;
  const groqPolicy = tasks.find(t => t.engineId === "groq" && t.taskType === "policy")?.result;

  const combined = combineEngineResults(geminiVisual, geminiAudio, groqText, groqPolicy);
  const totalDuration = calculateTotalDuration(tasks);
  const completedAt = new Date().toISOString();

  const finalResult: DualEngineResult = {
    geminiResult: {
      visual: geminiVisual,
      audio: geminiAudio,
      completed: tasks.filter(t => t.engineId === "gemini").every(t => t.status === "completed"),
    },
    groqResult: {
      text: groqText,
      policy: groqPolicy,
      completed: tasks.filter(t => t.engineId === "groq").every(t => t.status === "completed"),
    },
    combined,
    engineTasks: tasks,
    totalDuration,
    completedAt,
  };

  console.log("\n✅ Dual-Engine Scan Complete!");
  console.log("📊 Overall Score:", combined.overallScore);
  console.log("🏆 Verdict:", combined.verdict);
  console.log("⏱️ Total Duration:", totalDuration, "ms");

  callbacks.onAllComplete?.(finalResult);

  return finalResult;
};

/**
 * Run Gemini Visual Analysis (placeholder - replace with actual API call)
 */
const runGeminiVisual = async (input: ScanInput): Promise<any> => {
  // TODO: Implement actual Gemini API call for visual analysis
  // This should analyze thumbnail and video frames
  
  return {
    framesAnalyzed: 10,
    visualViolations: [],
    visualScore: 95,
    aiDetected: false,
    thumbnailIssues: [],
  };
};

/**
 * Run Gemini Audio Analysis (placeholder - replace with actual API call)
 */
const runGeminiAudio = async (input: ScanInput): Promise<any> => {
  // TODO: Implement actual Gemini API call for audio analysis
  // This should analyze audio content
  
  return {
    hasMusic: false,
    hasVoice: true,
    audioScore: 90,
    audioIssues: [],
    copyrightDetected: false,
  };
};

/**
 * Run Groq Text Analysis (placeholder - replace with actual API call)
 */
const runGroqText = async (input: ScanInput): Promise<any> => {
  // TODO: Implement actual Groq API call for text analysis
  // This should analyze title, description, tags
  
  return {
    metadataScore: 92,
    metadataIssues: [],
    analyzedFields: ["title", "description", "tags"],
    clickbaitDetected: false,
    spamScore: 5,
  };
};

/**
 * Run Groq Policy Analysis (placeholder - replace with actual API call)
 */
const runGroqPolicy = async (input: ScanInput): Promise<any> => {
  // TODO: Implement actual Groq API call for policy analysis
  // This should check platform-specific policies
  
  return {
    policyScore: 88,
    policyViolations: [],
    complianceChecks: ["monetization", "community_guidelines", "content_policy"],
    platformCompliance: input.platformId,
    disclosureRequired: false,
  };
};

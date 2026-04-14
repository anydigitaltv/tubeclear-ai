/**
 * Sequential Dual-Engine Execution
 * Gemini finishes → Groq starts automatically
 * Quality validation at each step
 * Real API calls with timeout, retry, and caching
 */

import { useAIEngines, type EngineId } from "@/contexts/AIEngineContext";
import {
  type EngineTask,
  type DualEngineResult,
  createEngineTasks,
  updateTaskStatus,
  validateEngineResult,
  combineEngineResults,
  calculateTotalDuration,
} from "./dualEngineOrchestrator";
import {
  safeAPICall,
  scanCache,
  ScanCache,
  withFallback,
} from "./scanHelpers";

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
 * Run Gemini Visual Analysis (REAL API CALL)
 */
const runGeminiVisual = async (input: ScanInput): Promise<any> => {
  console.log("  📡 Calling Gemini API for visual analysis...");

  const cacheKey = ScanCache.generateKey(input.videoUrl + ":visual", input.platformId);

  return safeAPICall(
    async () => {
      // Get active Gemini key
      const { useAIEngines } = await import("@/contexts/AIEngineContext");
      const { getActiveKeyForScan } = useAIEngines();
      const activeKey = getActiveKeyForScan("visual");

      if (!activeKey) {
        throw new Error("No Gemini API key available");
      }

      // Build Gemini API request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey.key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a video content moderation expert. Analyze this video thumbnail and metadata for policy violations.

VIDEO TITLE: ${input.title}
PLATFORM: ${input.platformId}

Check for:
1. Misleading or clickbait imagery
2. Inappropriate/violent content
3. Copyright watermarks
4. AI-generated content markers
5. QR codes or external links
6. Brand safety issues

Return JSON format:
{
  "framesAnalyzed": 1,
  "visualViolations": ["violation1" or empty array],
  "visualScore": 0-100,
  "aiDetected": boolean,
  "thumbnailIssues": ["issue1" or empty array]
}`,
                  },
                  ...(input.thumbnailUrl
                    ? [
                        {
                          inline_data: {
                            mime_type: "image/jpeg",
                            data: input.thumbnailUrl,
                          },
                        },
                      ]
                    : []),
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Parse Gemini response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      console.log("  ✅ Gemini visual analysis complete");
      return {
        framesAnalyzed: result.framesAnalyzed || 1,
        visualViolations: result.visualViolations || [],
        visualScore: result.visualScore || 100,
        aiDetected: result.aiDetected || false,
        thumbnailIssues: result.thumbnailIssues || [],
      };
    },
    {
      timeout: 30000,
      retries: 3,
      rateLimitDelay: 1000,
      useCache: true,
      cacheKey,
      cacheTTL: 3600000, // 1 hour
    }
  );
};

/**
 * Run Gemini Audio Analysis (REAL API CALL)
 */
const runGeminiAudio = async (input: ScanInput): Promise<any> => {
  console.log("  📡 Calling Gemini API for audio analysis...");

  const cacheKey = ScanCache.generateKey(input.videoUrl + ":audio", input.platformId);

  return safeAPICall(
    async () => {
      const { useAIEngines } = await import("@/contexts/AIEngineContext");
      const { getActiveKeyForScan } = useAIEngines();
      const activeKey = getActiveKeyForScan("visual");

      if (!activeKey) {
        throw new Error("No Gemini API key available");
      }

      // For now, analyze audio from metadata
      // In future: extract audio and send to Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey.key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an audio content analysis expert. Based on this video metadata, determine if the video likely contains music, voice, or potential copyright issues.

VIDEO TITLE: ${input.title}
VIDEO DESCRIPTION: ${input.description}
TAGS: ${input.tags.join(", ")}

Analyze for:
1. Music indicators (music, song, beat, track keywords)
2. Voice/speech content (podcast, interview, talk)
3. Copyright risks (official, cover, remix keywords)
4. Audio policy violations

Return JSON format:
{
  "hasMusic": boolean,
  "hasVoice": boolean,
  "audioScore": 0-100,
  "audioIssues": ["issue1" or empty array],
  "copyrightDetected": boolean
}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      console.log("  ✅ Gemini audio analysis complete");
      return {
        hasMusic: result.hasMusic || false,
        hasVoice: result.hasVoice || true,
        audioScore: result.audioScore || 90,
        audioIssues: result.audioIssues || [],
        copyrightDetected: result.copyrightDetected || false,
      };
    },
    {
      timeout: 30000,
      retries: 3,
      rateLimitDelay: 1000,
      useCache: true,
      cacheKey,
      cacheTTL: 3600000,
    }
  );
};

/**
 * Run Groq Text Analysis (REAL API CALL)
 */
const runGroqText = async (input: ScanInput): Promise<any> => {
  console.log("  📡 Calling Groq API for text analysis...");

  const cacheKey = ScanCache.generateKey(input.videoUrl + ":text", input.platformId);

  return safeAPICall(
    async () => {
      const { useAIEngines } = await import("@/contexts/AIEngineContext");
      const { getActiveKeyForScan } = useAIEngines();
      const activeKey = getActiveKeyForScan("policy");

      if (!activeKey) {
        throw new Error("No Groq API key available");
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeKey.key}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a metadata analysis expert. Analyze video title, description, and tags for quality and compliance issues.`,
            },
            {
              role: "user",
              content: `Analyze this video metadata:

TITLE: ${input.title}
DESCRIPTION: ${input.description}
TAGS: ${input.tags.join(", ")}

Check for:
1. Clickbait or misleading titles
2. Spam indicators in tags
3. Missing or poor description
4. Keyword stuffing
5. Policy violations in text

Return JSON format:
{
  "metadataScore": 0-100,
  "metadataIssues": ["issue1" or empty array],
  "analyzedFields": ["title", "description", "tags"],
  "clickbaitDetected": boolean,
  "spamScore": 0-100
}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      console.log("  ✅ Groq text analysis complete");
      return {
        metadataScore: result.metadataScore || 90,
        metadataIssues: result.metadataIssues || [],
        analyzedFields: result.analyzedFields || ["title", "description", "tags"],
        clickbaitDetected: result.clickbaitDetected || false,
        spamScore: result.spamScore || 0,
      };
    },
    {
      timeout: 30000,
      retries: 3,
      rateLimitDelay: 1000,
      useCache: true,
      cacheKey,
      cacheTTL: 3600000,
    }
  );
};

/**
 * Run Groq Policy Analysis (REAL API CALL)
 */
const runGroqPolicy = async (input: ScanInput): Promise<any> => {
  console.log("  📡 Calling Groq API for policy analysis...");

  const cacheKey = ScanCache.generateKey(input.videoUrl + ":policy", input.platformId);

  return safeAPICall(
    async () => {
      const { useAIEngines } = await import("@/contexts/AIEngineContext");
      const { getActiveKeyForScan } = useAIEngines();
      const activeKey = getActiveKeyForScan("policy");

      if (!activeKey) {
        throw new Error("No Groq API key available");
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeKey.key}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a platform policy expert for ${input.platformId}. Check content compliance against platform-specific policies.`,
            },
            {
              role: "user",
              content: `Check policy compliance for ${input.platformId}:

TITLE: ${input.title}
DESCRIPTION: ${input.description}
TAGS: ${input.tags.join(", ")}

Platform-specific checks for ${input.platformId}:
1. Monetization eligibility
2. Community guidelines compliance
3. Content policy violations
4. Disclosure requirements
5. Copyright indicators

Return JSON format:
{
  "policyScore": 0-100,
  "policyViolations": ["violation1" or empty array],
  "complianceChecks": ["check1", "check2"],
  "platformCompliance": "${input.platformId}",
  "disclosureRequired": boolean
}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      console.log("  ✅ Groq policy analysis complete");
      return {
        policyScore: result.policyScore || 85,
        policyViolations: result.policyViolations || [],
        complianceChecks: result.complianceChecks || ["monetization", "community_guidelines"],
        platformCompliance: result.platformCompliance || input.platformId,
        disclosureRequired: result.disclosureRequired || false,
      };
    },
    {
      timeout: 30000,
      retries: 3,
      rateLimitDelay: 1000,
      useCache: true,
      cacheKey,
      cacheTTL: 3600000,
    }
  );
};

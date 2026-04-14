/**
 * Dual-Engine Scan Context
 * Manages complete dual-engine workflow with auto-navigation to dashboard
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAIEngines, type EngineId } from "./AIEngineContext";
import { useLicenseKeys } from "./LicenseKeyContext";
import {
  executeDualEngineScan,
} from "@/utils/sequentialDualEngine";
import type {
  DualEngineResult,
  EngineTask,
} from "@/utils/dualEngineOrchestrator";
import {
  checkScanRequirements,
} from "@/utils/dualEngineOrchestrator";

interface DualEngineScanContextType {
  isScanning: boolean;
  scanProgress: number;
  currentPhase: number;
  totalPhases: number;
  engineTasks: EngineTask[];
  lastResult: DualEngineResult | null;
  showApiModal: boolean;
  startDualEngineScan: (input: any, platformId: string) => Promise<void>;
  dismissApiModal: () => void;
  resetScan: () => void;
}

const DualEngineScanContext = createContext<DualEngineScanContextType | undefined>(undefined);

export const DualEngineScanProvider = ({ children }: { children: ReactNode }) => {
  const { pools, isAnyKeyAvailable } = useAIEngines();
  const { hasActiveKey } = useLicenseKeys();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const totalPhases = 4; // Gemini Visual, Gemini Audio, Groq Text, Groq Policy
  
  const [engineTasks, setEngineTasks] = useState<EngineTask[]>([]);
  const [lastResult, setLastResult] = useState<DualEngineResult | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);

  const checkApiKeys = useCallback(() => {
    const hasGeminiKey = isAnyKeyAvailable("gemini") || hasActiveKey("gemini_api");
    const hasGroqKey = isAnyKeyAvailable("groq") || hasActiveKey("gemini_api"); // Gemini can handle both
    
    return checkScanRequirements(
      hasGeminiKey,
      hasGroqKey
    );
  }, [isAnyKeyAvailable, hasActiveKey]);

  const startDualEngineScan = useCallback(async (
    input: any,
    platformId: string
  ) => {
    // Check API keys first
    const requirements = checkApiKeys();
    
    if (!requirements.canProceed) {
      // Show modal asking for API keys
      setShowApiModal(true);
      return;
    }

    // Start scan
    setIsScanning(true);
    setScanProgress(0);
    setCurrentPhase(0);

    try {
      console.log("🚀 Starting Dual-Engine Scan...");
      console.log("📊 Video URL:", input.videoUrl);
      console.log("🎯 Platform:", platformId);

      const result = await executeDualEngineScan(
        {
          videoUrl: input.videoUrl,
          title: input.title || "",
          description: input.description || "",
          tags: input.tags || [],
          thumbnailUrl: input.thumbnailUrl,
          platformId,
        },
        {
          onTaskStart: (task) => {
            console.log(`▶️ Task started: ${task.engineId}:${task.taskType}`);
            setEngineTasks(prev => prev.map(t => 
              t.engineId === task.engineId && t.taskType === task.taskType ? task : t
            ));
          },
          onTaskComplete: (task) => {
            console.log(`✅ Task complete: ${task.engineId}:${task.taskType}`);
            setCurrentPhase(prev => prev + 1);
            setScanProgress(prev => prev + 25);
            setEngineTasks(prev => prev.map(t => 
              t.engineId === task.engineId && t.taskType === task.taskType ? task : t
            ));
          },
          onTaskFailed: (task) => {
            console.error(`❌ Task failed: ${task.engineId}:${task.taskType}`);
            setEngineTasks(prev => prev.map(t => 
              t.engineId === task.engineId && t.taskType === task.taskType ? task : t
            ));
          },
          onAllComplete: (result) => {
            console.log("🎉 All tasks complete!");
            setLastResult(result);
            setIsScanning(false);
            setScanProgress(100);
            setCurrentPhase(totalPhases);
            
            // Auto-navigate to dashboard with results
            // This will be handled by the component using this context
            console.log("📊 Final Results:", result.combined);
          },
        }
      );

      setLastResult(result);
    } catch (error: any) {
      console.error("❌ Dual-engine scan failed:", error);
      setIsScanning(false);
    }
  }, [checkApiKeys]);

  const dismissApiModal = useCallback(() => {
    setShowApiModal(false);
  }, []);

  const resetScan = useCallback(() => {
    setIsScanning(false);
    setScanProgress(0);
    setCurrentPhase(0);
    setEngineTasks([]);
    setLastResult(null);
    setShowApiModal(false);
  }, []);

  return (
    <DualEngineScanContext.Provider
      value={{
        isScanning,
        scanProgress,
        currentPhase,
        totalPhases,
        engineTasks,
        lastResult,
        showApiModal,
        startDualEngineScan,
        dismissApiModal,
        resetScan,
      }}
    >
      {children}
    </DualEngineScanContext.Provider>
  );
};

export const useDualEngineScan = () => {
  const context = useContext(DualEngineScanContext);
  if (!context) {
    throw new Error("useDualEngineScan must be used within DualEngineScanProvider");
  }
  return context;
};

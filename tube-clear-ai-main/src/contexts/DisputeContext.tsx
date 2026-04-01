import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/contexts/CoinContext";
import { useNotifications } from "@/contexts/NotificationContext";
import Tesseract from 'tesseract.js';

export type DisputeType = "missing_coins" | "wrong_amount" | "tid_not_found" | "screenshot_rejected" | "other";
export type DisputeStatus = "pending" | "ai_reviewing" | "approved" | "rejected" | "escalated";

export interface Dispute {
  id: string;
  userId: string;
  type: DisputeType;
  tid: string;
  description: string;
  screenshotUrl?: string;
  status: DisputeStatus;
  aiDecision?: {
    verdict: "approved" | "rejected";
    reason: string;
    confidence: number;
    matchedRecord?: boolean;
    ocrAnalysis?: OCRAnalysisResult;
  };
  coinsAwarded?: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface OCRAnalysisResult {
  date: string;
  time: string;
  amount: number;
  tid: string;
  isEdited: boolean;
  isOldDate: boolean;
  confidence: number;
}

interface DisputeContextType {
  disputes: Dispute[];
  createDispute: (dispute: Omit<Dispute, "id" | "createdAt" | "status">) => Promise<Dispute>;
  resolveDispute: (disputeId: string) => Promise<Dispute | null>;
  getUserDisputes: () => Dispute[];
  getDisputeHistory: () => Dispute[];
  performOCRAnalysis: (screenshot: File) => Promise<OCRAnalysisResult>;
  checkDatabaseForTID: (tid: string) => Promise<{ found: boolean; record?: any }>;
  analyzeScreenshotAuthenticity: (ocrResult: OCRAnalysisResult) => Promise<{ isAuthentic: boolean; reasons: string[] }>;
}

// Multi-language dispute messages
const DISPUTE_MESSAGES = {
  approved: {
    en: "Hamari galti thi, coins add kar diye gaye hain. Shukriya!",
    hi: "Hamari galti thi, coins add kar diye gaye hain. Shukriya!",
    ur: "Hamari galti thi, coins add kar diye gaye hain. Shukriya!",
    es: "Nuestro error, las monedas han sido añadidas. ¡Gracias!",
    ar: "خطأنا، تمت إضافة العملات. شكراً!",
  },
  rejected: {
    en: "Invalid Detail. Aapka screenshot/TID match nahi kar raha. Sahi detail dein warna account block ho sakta hai.",
    hi: "Invalid Detail. Aapka screenshot/TID match nahi kar raha. Sahi detail dein warna account block ho sakta hai.",
    ur: "Invalid Detail. Aapka screenshot/TID match nahi kar raha. Sahi detail dein warna account block ho sakta hai.",
    es: "Detalle inválido. Tu captura/TID no coincide. Proporciona detalles correctos o la cuenta puede ser bloqueada.",
    ar: "تفاصيل غير صالحة. لقطة الشاشة/TID الخاص بك لا يتطابق. قدم تفاصيل صحيحة وإلا قد يتم حظر الحساب.",
  },
};

const DISPUTES_KEY = "tubeclear_disputes";

const DisputeContext = createContext<DisputeContextType | undefined>(undefined);

export const DisputeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { addCoins } = useCoins();
  const { addNotification } = useNotifications();

  const [disputes, setDisputes] = useState<Dispute[]>(() => {
    try {
      const stored = localStorage.getItem(DISPUTES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveDisputes = useCallback((d: Dispute[]) => {
    localStorage.setItem(DISPUTES_KEY, JSON.stringify(d));
    setDisputes(d);
  }, []);

  const getBrowserLanguage = () => navigator.language.split("-")[0];

  const createDispute = useCallback(async (
    dispute: Omit<Dispute, "id" | "createdAt" | "status">
  ): Promise<Dispute> => {
    const newDispute: Dispute = {
      ...dispute,
      id: `dispute-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    saveDisputes([newDispute, ...disputes]);

    // Auto-trigger AI resolution
    setTimeout(() => resolveDispute(newDispute.id), 2000);

    return newDispute;
  }, [disputes, saveDisputes]);

  const performOCRAnalysis = useCallback(async (screenshot: File): Promise<OCRAnalysisResult> => {
    try {
      // Real OCR processing with Tesseract.js
      const result = await Tesseract.recognize(
        screenshot,
        'eng',
        {
          logger: (m) => console.log(`Dispute OCR Progress: ${(m.progress * 100).toFixed(0)}%`)
        }
      );
      
      const text = result.data.text;
      console.log('Dispute OCR Result:', text);
      
      // Extract TID patterns
      const tidPatterns = [
        /TID[:\s]*([A-Z0-9-]+)/i,
        /Transaction ID[:\s]*([A-Z0-9-]+)/i,
        /Ref No[:\s]*([A-Z0-9-]+)/i,
        /\b([A-Z]{2,}\d{4,})\b/, // Generic pattern
      ];
      
      let extractedTID = '';
      for (const pattern of tidPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedTID = match[1];
          break;
        }
      }
      
      // Extract amount
      const amountPatterns = [
        /(?:Rs\.?|PKR|₨|\$)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /\b(\d+(?:,\d{3})*(?:\.\d{2})?)\b/,
      ];
      
      let extractedAmount = 0;
      for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedAmount = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
      
      // Extract date
      const datePattern = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/;
      const dateMatch = text.match(datePattern);
      const extractedDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString();
      
      // Check if date is old (more than 7 days)
      const isOldDate = (() => {
        try {
          const parsedDate = new Date(extractedDate);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return parsedDate < sevenDaysAgo;
        } catch {
          return false;
        }
      })();
      
      // Detect signs of editing (low confidence in certain areas)
      const isEdited = result.data.confidence < 60; // Low confidence threshold
      
      return {
        date: extractedDate,
        time: new Date().toLocaleTimeString(),
        amount: extractedAmount,
        tid: extractedTID || `UNKNOWN-${Date.now()}`,
        isEdited,
        isOldDate,
        confidence: result.data.confidence / 100,
      };
    } catch (error) {
      console.error('Dispute OCR Error:', error);
      throw new Error('Failed to analyze screenshot');
    }
  }, []);

  const checkDatabaseForTID = useCallback(async (tid: string): Promise<{ found: boolean; record?: any }> => {
    if (!user) return { found: false };

    try {
      const { data, error } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("description", tid)
        .eq("user_id", user.id)
        .limit(1);

      if (error || !data || data.length === 0) {
        return { found: false };
      }

      return { found: true, record: data[0] };
    } catch {
      return { found: false };
    }
  }, [user]);

  const analyzeScreenshotAuthenticity = useCallback(async (
    ocrResult: OCRAnalysisResult
  ): Promise<{ isAuthentic: boolean; reasons: string[] }> => {
    const reasons: string[] = [];
    let isAuthentic = true;

    if (ocrResult.isEdited) {
      isAuthentic = false;
      reasons.push("Screenshot shows signs of editing");
    }

    if (ocrResult.isOldDate) {
      isAuthentic = false;
      reasons.push("Screenshot date is too old");
    }

    if (ocrResult.confidence < 0.8) {
      isAuthentic = false;
      reasons.push("OCR confidence is low");
    }

    return { isAuthentic, reasons };
  }, []);

  const resolveDispute = useCallback(async (disputeId: string): Promise<Dispute | null> => {
    const dispute = disputes.find(d => d.id === disputeId);
    if (!dispute) return null;
  
    // Update status to AI Reviewing
    let updatedDispute: Dispute = { ...dispute, status: "ai_reviewing" };
    saveDisputes(disputes.map(d => d.id === disputeId ? updatedDispute : d));
  
    // AI Doctor Logic - Real Database Check
    const dbCheck = await checkDatabaseForTID(dispute.tid);
      
    let ocrResult: OCRAnalysisResult | undefined;
    let authenticityCheck: { isAuthentic: boolean; reasons: string[] } | undefined;
  
    // If screenshot provided, perform real OCR analysis
    // Note: In production, fetch the actual file from storage URL
    if (dispute.screenshotUrl) {
      try {
        // Fetch screenshot from URL
        const response = await fetch(dispute.screenshotUrl);
        const blob = await response.blob();
        const file = new File([blob], "screenshot.png", { type: blob.type });
          
        ocrResult = await performOCRAnalysis(file);
        authenticityCheck = await analyzeScreenshotAuthenticity(ocrResult);
      } catch (error) {
        console.error('Failed to fetch dispute screenshot:', error);
      }
    }
  
    // Decision logic based on REAL data
    let isUserCorrect = false;
    const lang = getBrowserLanguage();
  
    if (!dbCheck.found && authenticityCheck?.isAuthentic) {
      // TID not in database AND screenshot is authentic = USER IS CORRECT
      isUserCorrect = true;
    } else if (dbCheck.found) {
      // TID exists in database - check if it belongs to this user
      if (dbCheck.record?.user_id === dispute.userId) {
        // User already received coins - REJECT
        isUserCorrect = false;
      } else {
        // TID belongs to different user - INVESTIGATE
        isUserCorrect = false;
      }
    } else if (!authenticityCheck?.isAuthentic) {
      // Screenshot appears fake/edited - REJECT
      isUserCorrect = false;
    }
  
    if (isUserCorrect) {
      // User is correct - award coins automatically
      const coinsToAward = 100; // Default compensation amount
      await addCoins(coinsToAward, "admin_bonus", `Dispute resolution: ${dispute.tid} - AI verified`);
  
      updatedDispute = {
        ...updatedDispute,
        status: "approved",
        resolvedAt: new Date().toISOString(),
        coinsAwarded: coinsToAward,
        aiDecision: {
          verdict: "approved",
          reason: "TID not found in database, screenshot authentic. Verified via OCR.",
          confidence: ocrResult?.confidence || 0.9,
          matchedRecord: dbCheck.found,
          ocrAnalysis: ocrResult,
        },
      };
  
      // Send success message in user's language
      const message = DISPUTE_MESSAGES.approved[lang] || DISPUTE_MESSAGES.approved.en;
      addNotification({
        type: "success",
        title: "Dispute Resolved in Your Favor",
        message: `${message} ${coinsToAward} coins added to your account.`,
      });
    } else {
      // User is wrong - reject with detailed reason
      const rejectionReasons = [];
        
      if (dbCheck.found) {
        rejectionReasons.push("Transaction ID already exists in our records");
      }
        
      if (authenticityCheck && !authenticityCheck.isAuthentic) {
        rejectionReasons.push(...authenticityCheck.reasons);
      }
        
      if (ocrResult?.isOldDate) {
        rejectionReasons.push("Screenshot date is older than 7 days");
      }
        
      if (ocrResult?.isEdited) {
        rejectionReasons.push("Screenshot shows signs of editing/manipulation");
      }
  
      updatedDispute = {
        ...updatedDispute,
        status: "rejected",
        resolvedAt: new Date().toISOString(),
        aiDecision: {
          verdict: "rejected",
          reason: rejectionReasons.join(". ") || "Could not verify claim",
          confidence: ocrResult?.confidence || 0.5,
          matchedRecord: dbCheck.found,
          ocrAnalysis: ocrResult,
        },
      };
  
      // Send strict rejection message
      const message = DISPUTE_MESSAGES.rejected[lang] || DISPUTE_MESSAGES.rejected.en;
      addNotification({
        type: "error",
        title: "Dispute Rejected",
        message: `${message} Reason: ${rejectionReasons[0] || "Verification failed"}`,
      });
    }
  
    saveDisputes(disputes.map(d => d.id === disputeId ? updatedDispute : d));
    return updatedDispute;
  }, [disputes, checkDatabaseForTID, performOCRAnalysis, analyzeScreenshotAuthenticity, addCoins, addNotification, saveDisputes]);

  const getUserDisputes = useCallback(() => {
    if (!user) return [];
    return disputes.filter(d => d.userId === user.id);
  }, [disputes, user]);

  const getDisputeHistory = useCallback(() => {
    return disputes;
  }, [disputes]);

  return (
    <DisputeContext.Provider
      value={{
        disputes,
        createDispute,
        resolveDispute,
        getUserDisputes,
        getDisputeHistory,
        performOCRAnalysis,
        checkDatabaseForTID,
        analyzeScreenshotAuthenticity,
      }}
    >
      {children}
    </DisputeContext.Provider>
  );
};

export const useDispute = () => {
  const ctx = useContext(DisputeContext);
  if (!ctx) throw new Error("useDispute must be used within DisputeProvider");
  return ctx;
};

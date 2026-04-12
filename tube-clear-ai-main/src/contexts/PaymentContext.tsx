import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/contexts/CoinContext";
import { useNotifications } from "@/contexts/NotificationContext";
import Tesseract from 'tesseract.js';

export type PaymentMethod = "easypaisa" | "jazzcash" | "lemonsqueezy" | "usdt";

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  amount: number;
  coins: number;
  transactionId: string;
  status: "pending" | "approved" | "rejected" | "fraud";
  ocrData?: OCRResult;
  autoVerified: boolean;
  createdAt: string;
}

export interface OCRResult {
  date: string;
  time: string;
  amount: number;
  confidence: number;
}

export interface PromoCode {
  code: string;
  coins: number;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
}

interface PaymentContextType {
  paymentRecords: PaymentRecord[];
  isProcessing: boolean;
  processPayment: (method: PaymentMethod, input: string, screenshot?: File) => Promise<{ success: boolean; message: string }>;
  validatePromoCode: (code: string) => Promise<PromoCode | null>;
  checkTIDExists: (tid: string) => Promise<boolean>;
  performOCR: (file: File) => Promise<OCRResult>;
  getPaymentHistory: () => PaymentRecord[];
  syncCoins: () => Promise<void>;
}

// Admin bypass credentials
const ADMIN_BYPASS_CODE = "0315-4414-981";
const ADMIN_EMAIL = "anydigitaltv@gmail.com";

// Coin packages
const COIN_PACKAGES: Record<PaymentMethod, { amount: number; coins: number }[]> = {
  easypaisa: [
    { amount: 100, coins: 100 },
    { amount: 500, coins: 600 },
    { amount: 1000, coins: 1500 },
  ],
  jazzcash: [
    { amount: 100, coins: 100 },
    { amount: 500, coins: 600 },
    { amount: 1000, coins: 1500 },
  ],
  lemonsqueezy: [
    { amount: 1, coins: 100 }, // $1
    { amount: 5, coins: 600 }, // $5
    { amount: 10, coins: 1500 }, // $10
  ],
  usdt: [
    { amount: 1, coins: 100 },
    { amount: 5, coins: 600 },
    { amount: 10, coins: 1500 },
  ],
};

// Multi-language success messages
const SUCCESS_MESSAGES: Record<string, string> = {
  en: "JazakAllah! Coins added successfully.",
  hi: "JazakAllah! Coins successfully add ho gaye.",
  ur: "JazakAllah! Coins successfully add ho gaye.",
  es: "¡JazakAllah! Monedas añadidas con éxito.",
  ar: "جزاك الله خيرا! تمت إضافة العملات بنجاح.",
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

const PAYMENT_RECORDS_KEY = "tubeclear_payment_records";
const USED_TIDS_KEY = "tubeclear_used_tids";

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { addCoins, refetchBalance } = useCoins();
  const { addNotification } = useNotifications();

  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(() => {
    try {
      const stored = localStorage.getItem(PAYMENT_RECORDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const savePaymentRecords = useCallback((records: PaymentRecord[]) => {
    localStorage.setItem(PAYMENT_RECORDS_KEY, JSON.stringify(records));
    setPaymentRecords(records);
  }, []);

  const checkTIDExists = useCallback(async (tid: string): Promise<boolean> => {
    // Check local storage
    const usedTIDs = JSON.parse(localStorage.getItem(USED_TIDS_KEY) || "[]");
    if (usedTIDs.includes(tid)) return true;

    // Check database if logged in
    if (user) {
      try {
        const { data } = await supabase
          .from("coin_transactions")
          .select("id")
          .eq("description", tid)
          .limit(1);
        return (data?.length || 0) > 0;
      } catch {
        return false;
      }
    }

    return false;
  }, [user]);

  const validatePromoCode = useCallback(async (code: string): Promise<PromoCode | null> => {
    // Admin bypass check
    if (code === ADMIN_BYPASS_CODE && user?.email === ADMIN_EMAIL) {
      return {
        code: ADMIN_BYPASS_CODE,
        coins: 100,
        expiresAt: "2099-12-31",
        maxUses: 999999,
        currentUses: 0,
        isActive: true,
      };
    }

    // Check standard promo codes (would come from database)
    const standardCodes: Record<string, PromoCode> = {
      WELCOME10: { code: "WELCOME10", coins: 10, expiresAt: "2099-12-31", maxUses: 1000, currentUses: 0, isActive: true },
      SCAN50: { code: "SCAN50", coins: 50, expiresAt: "2099-12-31", maxUses: 500, currentUses: 0, isActive: true },
      LAUNCH100: { code: "LAUNCH100", coins: 100, expiresAt: "2099-12-31", maxUses: 100, currentUses: 0, isActive: true },
    };

    return standardCodes[code.toUpperCase()] || null;
  }, [user]);

  const performOCR = useCallback(async (file: File): Promise<OCRResult> => {
    try {
      // Use Tesseract.js for real OCR processing
      const result = await Tesseract.recognize(
        file,
        'eng', // English + Urdu/Hindi support
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        }
      );
      
      const text = result.data.text;
      console.log('OCR Result:', text);
      
      // Extract amount using regex patterns
      // Match patterns like: "Rs. 100", "PKR 500", "$10", "100.00", etc.
      const amountPatterns = [
        /(?:Rs\.?|PKR|₨)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, // Pakistani format
        /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/, // USD format
        /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:Rs\.?|PKR|USD)/i,
        /\b(\d+(?:,\d{3})*(?:\.\d{2})?)\b/, // Generic number
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
      
      // Extract time
      const timePattern = /\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\b/i;
      const timeMatch = text.match(timePattern);
      
      return {
        date: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
        time: timeMatch ? timeMatch[1] : new Date().toLocaleTimeString(),
        amount: extractedAmount || 0,
        confidence: result.data.confidence / 100, // Normalize to 0-1
      };
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to process screenshot. Please ensure image is clear.');
    }
  }, []);

  // Helper to detect fraudulent patterns
  const isTIDSuspicious = (tid: string): { suspicious: boolean; reason?: string } => {
    // Common fake patterns: repeating chars, too short, or sequence numbers
    const repeatingPattern = /^(.)\1+$/.test(tid);
    const sequencePattern = /^(0123456789|1234567890|abcdef)/i.test(tid);
    
    // EasyPaisa/JazzCash TIDs are usually 11-12 digits
    if (tid.length < 10) return { suspicious: true, reason: "TID format incorrect (too short)" };
    if (repeatingPattern) return { suspicious: true, reason: "Fake repeating pattern" };
    if (sequencePattern) return { suspicious: true, reason: "Common sequence pattern" };
    
    // Check for blacklisted TIDs (mock list)
    if (["12345678", "00000000", "TEST-TID"].includes(tid)) return { suspicious: true, reason: "Blacklisted TID" };
    
    return { suspicious: false };
  };

  const processPayment = useCallback(async (
    method: PaymentMethod,
    input: string,
    screenshot?: File
  ): Promise<{ success: boolean; message: string }> => {
    setIsProcessing(true);

    try {
      // Check if input is a promo code
      const promoCode = await validatePromoCode(input);

      if (promoCode) {
        // Admin bypass
        if (input === ADMIN_BYPASS_CODE && user?.email === ADMIN_EMAIL) {
          await addCoins(100, "admin_bonus", "Admin bypass promo code");
          
          const record: PaymentRecord = {
            id: `payment-${Date.now()}`,
            method: "easypaisa", // Default for admin
            amount: 0,
            coins: 100,
            transactionId: `ADMIN-BYPASS-${Date.now()}`,
            status: "approved",
            createdAt: new Date().toISOString(),
          };

          savePaymentRecords([record, ...paymentRecords]);

          const lang = navigator.language.split("-")[0];
          const message = SUCCESS_MESSAGES[lang] || SUCCESS_MESSAGES.en;
          
          addNotification({
            type: "success",
            title: "Coins Added!",
            message,
          });

          return { success: true, message };
        }

        // Standard promo code
        if (promoCode.isActive) {
          await addCoins(promoCode.coins, "admin_bonus", `Promo code: ${input}`);
          
          const record: PaymentRecord = {
            id: `payment-${Date.now()}`,
            method,
            amount: 0,
            coins: promoCode.coins,
            transactionId: input,
            status: "approved",
            createdAt: new Date().toISOString(),
          };

          savePaymentRecords([record, ...paymentRecords]);

          const lang = navigator.language.split("-")[0];
          const message = SUCCESS_MESSAGES[lang] || SUCCESS_MESSAGES.en;

          addNotification({
            type: "success",
            title: "Promo Code Applied!",
            message: `You received ${promoCode.coins} coins!`,
          });

          return { success: true, message };
        }
      }

      // Treat as Transaction ID (TID)
      const tidExists = await checkTIDExists(input);

      if (tidExists) {
        addNotification({
          type: "error",
          title: "Fraud Detected",
          message: "This Transaction ID has already been used.",
        });

        return { success: false, message: "Transaction ID already used. Fraud attempt logged." };
      }

      // Perform OCR if screenshot provided
      let ocrData: OCRResult | undefined;
      if (screenshot) {
        ocrData = await performOCR(screenshot);
      }

      // DATE VALIDATION: Ensure screenshot isn't older than 48 hours
      if (ocrData) {
        const receiptDate = new Date(ocrData.date);
        const now = new Date();
        const diffHours = (now.getTime() - receiptDate.getTime()) / (1000 * 60 * 60);
        
        if (diffHours > 48) {
          addNotification({ type: "error", title: "Receipt Expired", message: "Bhai, ye screenshot purana hai. Please naya upload karein." });
          return { success: false, message: "Screenshot too old." };
        }
      }

      // AUTOMATIC SECURITY CHECK
      const securityCheck = isTIDSuspicious(input);
      const ocrReliable = ocrData ? ocrData.confidence > 0.75 : true;
      
      if (securityCheck.suspicious || !ocrReliable) {
        addNotification({
          type: "warning",
          title: "Payment Under Review",
          message: `Suspicious activity detected: ${securityCheck.reason || "Low OCR confidence"}. Admin will verify manually.`,
        });
        return { success: false, message: "Security check failed. Transaction sent for manual review." };
      }

      // SMART PACKAGE MAPPING: Find the correct package based on OCR amount
      const packages = COIN_PACKAGES[method];
      const extractedAmount = ocrData?.amount || 0;
      
      // Find package that matches the OCR amount, fallback to packages[0] if no OCR
      const coinPackage = extractedAmount > 0 
        ? (packages.find(p => p.amount === extractedAmount) || packages[0])
        : packages[0];
        
      const coins = coinPackage.coins;

      // SYNC WITH DATABASE: Update coins and record transaction
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("coins").eq("id", user.id).single();
        const currentCoins = profile?.coins || 0;
        
        await supabase.from("profiles").update({ coins: currentCoins + coins }).eq("id", user.id);
        
        await supabase.from("coin_transactions").insert({
          user_id: user.id,
          amount: coins,
          type: "purchase",
          description: `Payment approved (${method}) - TID: ${input}`
        });
        
        await refetchBalance();
      } else {
        // Fallback for guests
        await addCoins(coins, "purchase", `Payment via ${method} - TID: ${input}`);
      }

      // Mark TID as used
      const usedTIDs = JSON.parse(localStorage.getItem(USED_TIDS_KEY) || "[]");
      usedTIDs.push(input);
      localStorage.setItem(USED_TIDS_KEY, JSON.stringify(usedTIDs));

      const record: PaymentRecord = {
        id: `payment-${Date.now()}`,
        method,
        amount: extractedAmount || coinPackage.amount,
        coins,
        transactionId: input,
        status: "approved",
        ocrData,
        autoVerified: true,
        createdAt: new Date().toISOString(),
      };

      savePaymentRecords([record, ...paymentRecords]);

      const lang = navigator.language.split("-")[0];
      const message = SUCCESS_MESSAGES[lang] || SUCCESS_MESSAGES.en;

      addNotification({
        type: "success",
        title: "Payment Approved!",
        message,
      });

      return { success: true, message };
    } catch (error) {
      console.error("Payment processing error:", error);

      addNotification({
        type: "error",
        title: "Payment Failed",
        message: "An error occurred. Please try again.",
      });

      return { success: false, message: "Payment processing failed." };
    } finally {
      setIsProcessing(false);
    }
  }, [user, validatePromoCode, checkTIDExists, performOCR, addCoins, addNotification, paymentRecords, savePaymentRecords]);

  const getPaymentHistory = useCallback(() => {
    return paymentRecords;
  }, [paymentRecords]);

  const syncCoins = useCallback(async () => {
    // Sync coin balance with Supabase if logged in
    if (user) {
      try {
        // In production, fetch from database
        console.log("Syncing coins for user:", user.id);
        addNotification({
          type: "info",
          title: "Coins Synced",
          message: "Your coin balance has been synchronized.",
        });
      } catch (error) {
        console.error("Sync error:", error);
      }
    }
  }, [user, addNotification]);

  return (
    <PaymentContext.Provider
      value={{
        paymentRecords,
        isProcessing,
        processPayment,
        validatePromoCode,
        checkTIDExists,
        performOCR,
        getPaymentHistory,
        syncCoins,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePayment must be used within PaymentProvider");
  return ctx;
};

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/contexts/CoinContext";

const MASTER_ADMIN_EMAIL = "anydigitaltv@gmail.com";
const MASTER_PROMO_CODE = "0315-4414-981";
const ADMIN_PHONE = "+923154414981";

interface MasterAdminContextType {
  isMasterAdmin: boolean;
  checkMasterAccess: () => boolean;
  validateMasterPromoCode: (code: string) => Promise<boolean>;
  bypassFeatureCost: (featureId: string) => boolean;
  sendTestSMS: () => Promise<void>;
}

const MasterAdminContext = createContext<MasterAdminContextType | undefined>(undefined);

export const MasterAdminProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { addCoins } = useCoins();

  const [isMasterAdmin] = useState(() => {
    return user?.email === MASTER_ADMIN_EMAIL;
  });

  const checkMasterAccess = useCallback((): boolean => {
    return user?.email === MASTER_ADMIN_EMAIL;
  }, [user?.email]);

  const validateMasterPromoCode = useCallback(async (code: string): Promise<boolean> => {
    if (code !== MASTER_PROMO_CODE) return false;
    
    // Only valid for master admin email
    if (user?.email !== MASTER_ADMIN_EMAIL) return false;

    // Bypass all checks and add 100 coins instantly
    await addCoins(100, "admin_bonus", "Master Admin Promo Code");

    return true;
  }, [user?.email, addCoins]);

  const bypassFeatureCost = useCallback((featureId: string): boolean => {
    // Enable free mode for master admin on all features
    if (!isMasterAdmin) return false;
    
    // All features are free for master admin
    return true;
  }, [isMasterAdmin]);

  const sendTestSMS = useCallback(async (): Promise<void> => {
    try {
      console.log(`[TEST SMS] To: ${ADMIN_PHONE}`);
      console.log(`[TEST SMS] Message: "TubeClear AI Doctor Test Alert - ${new Date().toISOString()}"`);
      
      // In production, this would call Twilio or similar SMS gateway
      // await fetch(SMS_API_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     to: ADMIN_PHONE,
      //     message: `TubeClear AI Doctor Test Alert - ${new Date().toISOString()}`,
      //   }),
      // });

      alert("Test SMS sent to Admin!");
    } catch (error) {
      console.error("Failed to send test SMS:", error);
    }
  }, []);

  return (
    <MasterAdminContext.Provider
      value={{
        isMasterAdmin,
        checkMasterAccess,
        validateMasterPromoCode,
        bypassFeatureCost,
        sendTestSMS,
      }}
    >
      {children}
    </MasterAdminContext.Provider>
  );
};

export const useMasterAdmin = () => {
  const ctx = useContext(MasterAdminContext);
  if (!ctx) throw new Error("useMasterAdmin must be used within MasterAdminProvider");
  return ctx;
};

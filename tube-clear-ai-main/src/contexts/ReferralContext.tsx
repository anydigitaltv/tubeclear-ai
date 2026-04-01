import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/contexts/CoinContext";
import { useNotifications } from "@/contexts/NotificationContext";
import QRCode from 'qrcode';

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredEmail: string;
  code: string;
  status: "pending" | "completed" | "expired";
  coinsAwarded: number;
  createdAt: string;
  completedAt?: string;
}

export interface ShareableCard {
  videoId: string;
  scanResult: any;
  qrCodeUrl: string;
  shareUrl: string;
}

interface ReferralContextType {
  referralCode: string;
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  referralHistory: ReferralRecord[];
  generateReferralCode: () => string;
  applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;
  createShareableCard: (videoId: string, scanResult: any) => Promise<ShareableCard>;
  getReferralLink: () => string;
  shareToWhatsApp: () => void;
  shareToTikTok: () => void;
}

const REFERRAL_BONUS = 50; // Coins for both users
const REFERRAL_STORAGE_KEY = "tubeclear_referral_codes";
const ADMIN_PHONE = "+923154414981";

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

export const ReferralProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { addCoins } = useCoins();
  const { addNotification } = useNotifications();

  const [referralHistory, setReferralHistory] = useState<ReferralRecord[]>(() => {
    try {
      const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [referralCode, setReferralCode] = useState<string>("");

  // Generate unique referral code
  const generateReferralCode = useCallback((): string => {
    if (!user) return "";
    
    // Use first 6 chars of email + random string
    const emailPrefix = user.email?.split('@')[0].substring(0, 6).toUpperCase() || "USER";
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${emailPrefix}-${randomSuffix}`;
    
    setReferralCode(code);
    return code;
  }, [user]);

  // Get referral link
  const getReferralLink = useCallback((): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/signup?ref=${referralCode}`;
  }, [referralCode]);

  // Apply referral code on signup
  const applyReferralCode = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !code) {
      return { success: false, message: "Invalid referral code" };
    }

    try {
      // Check if code exists in database/localStorage
      const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
      const allReferrals: ReferralRecord[] = stored ? JSON.parse(stored) : [];
      
      const matchingReferral = allReferrals.find(r => r.code === code && r.status === "pending");
      
      if (!matchingReferral) {
        return { success: false, message: "Invalid or expired referral code" };
      }

      // Award coins to referrer
      await addCoins(REFERRAL_BONUS, "referral", `Referral bonus: ${user.email}`);
      
      // Award coins to new user (would need different context access in production)
      // For now, we'll log it
      console.log(`Awarding ${REFERRAL_BONUS} coins to new user: ${user.email}`);

      // Update referral record
      const updatedReferrals: ReferralRecord[] = allReferrals.map(r => 
        r.id === matchingReferral.id 
          ? { ...r, status: "completed" as const, completedAt: new Date().toISOString(), referredEmail: user.email }
          : r
      );
      
      localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(updatedReferrals));
      setReferralHistory(updatedReferrals.filter(r => r.referrerId === user.id));

      // Send notifications
      addNotification({
        type: "success",
        title: "Referral Bonus Applied!",
        message: `You and your friend each received ${REFERRAL_BONUS} coins!`,
      });

      // Notify admin
      console.log(`[ADMIN SMS] New referral completed: ${matchingReferral.referredEmail} referred by ${user.email}`);

      return { success: true, message: `Successfully applied referral code! ${REFERRAL_BONUS} coins added.` };
    } catch (error) {
      console.error('Referral application failed:', error);
      return { success: false, message: "Failed to apply referral code" };
    }
  }, [user, addCoins, addNotification]);

  // Create shareable scan card with QR code
  const createShareableCard = useCallback(async (videoId: string, scanResult: any): Promise<ShareableCard> => {
    try {
      // Generate share URL
      const shareUrl = `${window.location.origin}/scan/${videoId}?shared=true`;
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      return {
        videoId,
        scanResult,
        qrCodeUrl: qrCodeDataUrl,
        shareUrl,
      };
    } catch (error) {
      console.error('Failed to create shareable card:', error);
      throw new Error('Failed to generate shareable card');
    }
  }, []);

  // Share to WhatsApp
  const shareToWhatsApp = useCallback(() => {
    const text = encodeURIComponent(
      `🚀 Check out my Tubeclear AI scan results!\n\n` +
      `Protect your channel from strikes with AI-powered analysis.\n\n` +
      `Use my referral code: ${referralCode}\n` +
      `Get ${REFERRAL_BONUS} FREE coins on signup!\n\n` +
      `👉 ${getReferralLink()}`
    );
    
    window.open(`https://wa.me/?text=${text}`, '_blank');
    
    addNotification({
      type: "info",
      title: "Shared to WhatsApp",
      message: "Your referral link has been shared!",
    });
  }, [referralCode, getReferralLink, addNotification]);

  // Share to TikTok (via bio link or DM)
  const shareToTikTok = useCallback(() => {
    const text = encodeURIComponent(
      `🎬 Tubeclear AI - Your Content Shield!\n\n` +
      `Scan videos before uploading to avoid strikes.\n` +
      `Sign up with code: ${referralCode}\n` +
      `Get ${REFERRAL_BONUS} coins FREE! 🎁\n\n` +
      `${getReferralLink()}`
    );
    
    // TikTok doesn't have direct share URL, open app
    window.open('https://www.tiktok.com/', '_blank');
    
    addNotification({
      type: "info",
      title: "Copy for TikTok",
      message: "Paste this in your TikTok bio or DM: " + decodeURIComponent(text),
    });
  }, [referralCode, getReferralLink, addNotification]);

  // Load referral history on mount
  useEffect(() => {
    if (!user) return;
    
    const loadReferrals = async () => {
      // Generate code if doesn't exist
      if (!referralCode) {
        generateReferralCode();
      }
      
      // Load history from Supabase (in production)
      if (user.id) {
        try {
          // Note: referrals table needs to be created in Supabase
          // For now, fallback to localStorage
          throw new Error('Table not created yet');
        } catch (supabaseError) {
          // Fallback to localStorage
          const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
          if (stored) {
            const all = JSON.parse(stored) as ReferralRecord[];
            setReferralHistory(all.filter(r => r.referrerId === user.id));
          }
        }
      }
    };
    
    loadReferrals();
  }, [user, referralCode, generateReferralCode]);

  // Calculate stats
  const totalReferrals = referralHistory.length;
  const pendingReferrals = referralHistory.filter(r => r.status === "pending").length;
  const completedReferrals = referralHistory.filter(r => r.status === "completed").length;

  return (
    <ReferralContext.Provider
      value={{
        referralCode,
        totalReferrals,
        pendingReferrals,
        completedReferrals,
        referralHistory,
        generateReferralCode,
        applyReferralCode,
        createShareableCard,
        getReferralLink,
        shareToWhatsApp,
        shareToTikTok,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};

export const useReferral = () => {
  const ctx = useContext(ReferralContext);
  if (!ctx) throw new Error("useReferral must be used within ReferralProvider");
  return ctx;
};

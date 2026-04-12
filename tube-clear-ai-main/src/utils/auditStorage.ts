import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LOCAL_STORAGE_KEY = "tubeclear_guest_audits";

export interface AuditSaveData {
  video_url: string;
  video_title: string;
  thumbnail_url?: string;
  platform: string;
  overall_risk: number;
  result_json?: any;
  user_id?: string;
  fix_roadmap?: string[];
}

/**
 * Save audit report to database (login mode) or local storage (guest mode)
 */
export const saveAuditReport = async (
  auditData: AuditSaveData,
  isGuest: boolean,
  userId?: string
): Promise<boolean> => {
  try {
    if (!isGuest && userId) {
      // Login mode: Save to Supabase
      // @ts-ignore
      const { error } = await supabase.from("audit_history").insert({
        user_id: userId,
        video_url: auditData.video_url,
        video_title: auditData.video_title,
        thumbnail_url: auditData.thumbnail_url || null,
        platform: auditData.platform,
        overall_risk: auditData.overall_risk,
        result_json: auditData.result_json || {},
      });

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("✅ Audit saved to Supabase database");
      return true;
    } else {
      // Guest mode: Save to local storage
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const guestAudits = stored ? JSON.parse(stored) : [];

      const newAudit = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: null,
        video_url: auditData.video_url,
        video_title: auditData.video_title,
        thumbnail_url: auditData.thumbnail_url || null,
        platform: auditData.platform,
        overall_risk: auditData.overall_risk,
        result_json: auditData.result_json || {},
        created_at: new Date().toISOString(),
      };

      // Add to beginning and limit to 20
      guestAudits.unshift(newAudit);
      const limited = guestAudits.slice(0, 20);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(limited));

      console.log("✅ Audit saved to local storage (guest mode)");
      return true;
    }
  } catch (error: any) {
    console.error("Error saving audit report:", error);
    toast.error(`Failed to save audit: ${error.message}`);
    return false;
  }
};

/**
 * Get guest audits from local storage
 */
export const getGuestAudits = (): any[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Clear all guest audits
 */
export const clearGuestAudits = (): void => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  toast.success("Guest audit history cleared");
};

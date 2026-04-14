/**
 * Policy Monitor - Cross-Match Logic for Policy Updates
 * 
 * Monitors latest policies and notifies users when their videos need re-scanning.
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PolicyUpdate {
  id: string;
  platform: string;
  policy_title: string;
  policy_description: string;
  policy_url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  effective_date: string;
  created_at: string;
  is_active: boolean;
}

export interface AffectedVideo {
  scan_id: string;
  video_title: string;
  video_url: string;
  platform: string;
  original_scan_date: string;
  needs_rescan: boolean;
}

export class PolicyMonitor {
  private userId: string | null;

  constructor(userId?: string) {
    this.userId = userId || null;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Fetch latest policy updates for a specific platform
   */
  async getLatestPolicies(platform?: string): Promise<PolicyUpdate[]> {
    try {
      let query = supabase
        .from('policy_updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Failed to fetch policy updates:', error);
        return [];
      }

      return data as PolicyUpdate[];
    } catch (error) {
      console.error('Policy fetch error:', error);
      return [];
    }
  }

  /**
   * Cross-match: Find user's videos affected by new policies
   */
  async findAffectedVideos(platform?: string): Promise<AffectedVideo[]> {
    if (!this.userId) {
      console.warn('No user ID set for policy monitoring');
      return [];
    }

    try {
      let query = supabase
        .from('scan_history')
        .select('id, video_title, video_url, platform, created_at')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data: scans, error } = await query.limit(100);

      if (error) {
        console.error('Failed to fetch scan history:', error);
        return [];
      }

      // Get recent policy updates (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: policies } = await supabase
        .from('policy_updates')
        .select('*')
        .eq('is_active', true)
        .gte('effective_date', thirtyDaysAgo.toISOString());

      if (!policies || policies.length === 0) {
        return [];
      }

      // Cross-match scans with policies
      const affectedVideos: AffectedVideo[] = [];

      scans?.forEach(scan => {
        const matchingPolicy = policies.find(
          policy => policy.platform === scan.platform
        );

        if (matchingPolicy) {
          affectedVideos.push({
            scan_id: scan.id,
            video_title: scan.video_title || 'Untitled Video',
            video_url: scan.video_url,
            platform: scan.platform,
            original_scan_date: scan.created_at,
            needs_rescan: true,
          });
        }
      });

      return affectedVideos;
    } catch (error) {
      console.error('Cross-match error:', error);
      return [];
    }
  }

  /**
   * Notify user about policy updates affecting their videos
   */
  async notifyPolicyUpdates(): Promise<void> {
    const affectedVideos = await this.findAffectedVideos();

    if (affectedVideos.length === 0) {
      return;
    }

    const uniquePlatforms = [...new Set(affectedVideos.map(v => v.platform))];

    uniquePlatforms.forEach(platform => {
      const platformVideos = affectedVideos.filter(v => v.platform === platform);
      const count = platformVideos.length;

      toast.info(
        `📢 ${platform.charAt(0).toUpperCase() + platform.slice(1)} Policy Update: ${count} video${count > 1 ? 's' : ''} need re-scan`,
        {
          duration: 8000,
          action: {
            label: 'Re-Scan Now',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('trigger-rescan', {
                detail: { videos: platformVideos }
              }));
            }
          }
        }
      );
    });

    // Save notifications to database
    if (this.userId) {
      await this.saveNotifications(affectedVideos);
    }
  }

  /**
   * Save notifications to database
   */
  private async saveNotifications(affectedVideos: AffectedVideo[]): Promise<void> {
    if (!this.userId) return;

    const notifications = affectedVideos.map(video => ({
      user_id: this.userId,
      notification_type: 'policy_update',
      title: `Policy Update: ${video.platform}`,
      message: `Your video "${video.video_title}" may need re-scan due to new policy updates.`,
      metadata: {
        scan_id: video.scan_id,
        video_url: video.video_url,
        platform: video.platform,
      },
    }));

    const { error } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  /**
   * Request re-scan for affected video
   */
  async requestRescan(scanId: string, reason: string): Promise<boolean> {
    if (!this.userId) return false;

    try {
      const { error } = await supabase
        .from('rescan_queue')
        .insert({
          user_id: this.userId,
          scan_id: scanId,
          reason: reason,
          priority: 1,
          status: 'pending',
        });

      if (error) {
        console.error('Failed to queue re-scan:', error);
        return false;
      }

      toast.success('✅ Re-scan request queued successfully!');
      return true;
    } catch (error) {
      console.error('Re-scan request error:', error);
      return false;
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    if (!this.userId) return 0;

    try {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId)
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }
}

// Export singleton
export const policyMonitor = new PolicyMonitor();

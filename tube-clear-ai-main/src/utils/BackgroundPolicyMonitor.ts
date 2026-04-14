/**
 * BackgroundPolicyMonitor - Automatic Policy Change Detection
 * 
 * Monitors policy updates in background and alerts users when their videos need re-scan.
 * Runs periodic checks and sends notifications for affected videos.
 */

import { toast } from "sonner";
import { vault, type VideoRecord } from "@/utils/historicalVault";

export interface PolicyUpdate {
  id: string;
  platform: string;
  policyName: string;
  changedAt: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedVideos: string[]; // videoIds
}

export interface MonitorStats {
  lastCheck: string | null;
  totalChecks: number;
  updatesDetected: number;
  alertsSent: number;
}

const MONITOR_STORAGE_KEY = 'tubeclear_policy_monitor';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class BackgroundPolicyMonitor {
  private stats: MonitorStats;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.stats = this.loadStats();
  }

  /**
   * Load monitor stats from localStorage
   */
  private loadStats(): MonitorStats {
    try {
      const stored = localStorage.getItem(MONITOR_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load monitor stats:', error);
    }

    return {
      lastCheck: null,
      totalChecks: 0,
      updatesDetected: 0,
      alertsSent: 0,
    };
  }

  /**
   * Save stats to localStorage
   */
  private saveStats(): void {
    try {
      localStorage.setItem(MONITOR_STORAGE_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('Failed to save monitor stats:', error);
    }
  }

  /**
   * Start background monitoring
   */
  startMonitoring(): void {
    if (this.isRunning) {
      console.log('🔔 PolicyMonitor: Already running');
      return;
    }

    this.isRunning = true;
    console.log('🔔 PolicyMonitor: Started background monitoring');

    // Check immediately on start
    this.checkForPolicyUpdates();

    // Then check every 24 hours
    this.intervalId = setInterval(() => {
      this.checkForPolicyUpdates();
    }, CHECK_INTERVAL);
  }

  /**
   * Stop background monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🔔 PolicyMonitor: Stopped');
  }

  /**
   * Check for policy updates (simulated - in production, fetch from API)
   */
  async checkForPolicyUpdates(): Promise<void> {
    console.log('🔍 PolicyMonitor: Checking for policy updates...');
    
    this.stats.lastCheck = new Date().toISOString();
    this.stats.totalChecks++;
    this.saveStats();

    try {
      // In production, this would fetch latest policies from your API
      // For now, we'll simulate checking against known policy changes
      
      const updates = await this.fetchPolicyUpdates();
      
      if (updates.length > 0) {
        console.log(`⚠️ PolicyMonitor: Found ${updates.length} policy updates`);
        this.stats.updatesDetected += updates.length;
        
        // Check which videos are affected
        for (const update of updates) {
          await this.processPolicyUpdate(update);
        }
        
        this.saveStats();
      } else {
        console.log('✅ PolicyMonitor: No new policy updates');
      }
    } catch (error) {
      console.error('PolicyMonitor: Error checking for updates:', error);
    }
  }

  /**
   * Fetch latest policy updates (simulated)
   * In production, replace with actual API call
   */
  private async fetchPolicyUpdates(): Promise<PolicyUpdate[]> {
    // TODO: Replace with actual API call to your policy endpoint
    // Example: const response = await fetch('https://api.tubeclear.ai/policies/updates');
    
    // Simulated updates for demonstration
    const simulatedUpdates: PolicyUpdate[] = [
      {
        id: 'yt-2024-001',
        platform: 'youtube',
        policyName: 'YouTube Monetization Policy Update',
        changedAt: new Date().toISOString(),
        description: 'New restrictions on AI-generated content disclosure',
        severity: 'high',
        affectedVideos: [],
      },
      {
        id: 'tt-2024-001',
        platform: 'tiktok',
        policyName: 'TikTok Community Guidelines Update',
        changedAt: new Date().toISOString(),
        description: 'Updated rules for sponsored content tagging',
        severity: 'medium',
        affectedVideos: [],
      },
    ];

    return simulatedUpdates;
  }

  /**
   * Process a policy update and find affected videos
   */
  private async processPolicyUpdate(update: PolicyUpdate): Promise<void> {
    console.log(`📋 Processing policy update: ${update.policyName}`);

    try {
      // Get all scanned videos from vault
      const allVideos = await vault.getAllVideos();
      
      // Filter videos from the affected platform
      const platformVideos = allVideos.filter(v => v.platform === update.platform);
      
      if (platformVideos.length === 0) {
        console.log(`No videos found for platform: ${update.platform}`);
        return;
      }

      // Mark videos as needing re-scan
      update.affectedVideos = platformVideos.map(v => v.videoId);
      
      // Send notification
      this.sendNotification(update, platformVideos.length);
      
    } catch (error) {
      console.error('Error processing policy update:', error);
    }
  }

  /**
   * Send notification to user about policy update
   */
  private sendNotification(update: PolicyUpdate, affectedCount: number): void {
    const severityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴',
    };

    const title = `${severityEmoji[update.severity]} Policy Update Detected`;
    const description = `${update.policyName}\n${affectedCount} video(s) may need re-scan.\n${update.description}`;

    toast(title, {
      description,
      duration: 10000,
      action: {
        label: 'View Details',
        onClick: () => {
          // Navigate to policy newsroom or affected videos
          window.location.href = '/newsroom';
        },
      },
    });

    this.stats.alertsSent++;
    this.saveStats();

    console.log(`🔔 Notification sent: ${update.policyName} (${affectedCount} videos affected)`);
  }

  /**
   * Get monitor statistics
   */
  getStats(): MonitorStats {
    return { ...this.stats };
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isRunning: boolean; nextCheck: string | null } {
    let nextCheck: string | null = null;
    
    if (this.stats.lastCheck) {
      const lastCheckTime = new Date(this.stats.lastCheck).getTime();
      const nextCheckTime = lastCheckTime + CHECK_INTERVAL;
      nextCheck = new Date(nextCheckTime).toISOString();
    }

    return {
      isRunning: this.isRunning,
      nextCheck,
    };
  }

  /**
   * Manually trigger a check
   */
  async manualCheck(): Promise<void> {
    console.log('🔍 PolicyMonitor: Manual check triggered');
    await this.checkForPolicyUpdates();
    toast.success('Policy check completed', {
      description: 'Check console for details',
    });
  }

  /**
   * Clear all monitor data
   */
  clearData(): void {
    localStorage.removeItem(MONITOR_STORAGE_KEY);
    this.stats = {
      lastCheck: null,
      totalChecks: 0,
      updatesDetected: 0,
      alertsSent: 0,
    };
    console.log('🗑️ PolicyMonitor: All data cleared');
  }
}

// Export singleton instance
export const policyMonitor = new BackgroundPolicyMonitor();

// IndexedDB wrapper for Historical Data Vault
const DB_NAME = "TubeClearVault";
const DB_VERSION = 1;
const STORES = {
  VIDEOS: "videos",
  SCANS: "scans",
  METADATA: "metadata",
  PENDING: "pending_scans",
};

interface VideoRecord {
  id: string;
  videoId: string;
  platform: string;
  title: string;
  thumbnail?: string;
  uploadedAt: string;
  scannedAt: string;
  safetyScore: number;
  violations: number;
}

interface ScanRecord {
  id: string;
  videoId: string;
  platform: string;
  scanDate: string;
  reportData: any;
  tokensUsed: number;
  engine: string;
}

class HistoricalDataVault {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Videos store
        if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
          const videoStore = db.createObjectStore(STORES.VIDEOS, { keyPath: "id" });
          videoStore.createIndex("videoId", "videoId", { unique: false });
          videoStore.createIndex("platform", "platform", { unique: false });
          videoStore.createIndex("scannedAt", "scannedAt", { unique: false });
        }

        // Scans store
        if (!db.objectStoreNames.contains(STORES.SCANS)) {
          const scanStore = db.createObjectStore(STORES.SCANS, { keyPath: "id" });
          scanStore.createIndex("videoId", "videoId", { unique: false });
          scanStore.createIndex("scanDate", "scanDate", { unique: false });
          scanStore.createIndex("platform", "platform", { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: "id" });
        }

        // Pending scans for resuming
        if (!db.objectStoreNames.contains(STORES.PENDING)) {
          const pendingStore = db.createObjectStore(STORES.PENDING, { keyPath: "videoId" });
          pendingStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
    });
  }

  // Save video metadata
  async saveVideo(video: VideoRecord): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.VIDEOS], "readwrite");
      const store = transaction.objectStore(STORES.VIDEOS);
      const request = store.put(video);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save scan result
  async saveScan(scan: ScanRecord): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SCANS], "readwrite");
      const store = transaction.objectStore(STORES.SCANS);
      const request = store.put(scan);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Save pending scan progress
  async savePendingScan(data: any): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PENDING], "readwrite");
      const store = transaction.objectStore(STORES.PENDING);
      const request = store.put({
        ...data,
        updatedAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending scans
  async getPendingScans(): Promise<any[]> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PENDING], "readonly");
      const store = transaction.objectStore(STORES.PENDING);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear a pending scan once completed
  async clearPendingScan(videoId: string): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PENDING], "readwrite");
      const store = transaction.objectStore(STORES.PENDING);
      const request = store.delete(videoId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get all videos
  async getAllVideos(): Promise<VideoRecord[]> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.VIDEOS], "readonly");
      const store = transaction.objectStore(STORES.VIDEOS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all scans
  async getAllScans(): Promise<ScanRecord[]> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SCANS], "readonly");
      const store = transaction.objectStore(STORES.SCANS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get videos by platform
  async getVideosByPlatform(platform: string): Promise<VideoRecord[]> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.VIDEOS], "readonly");
      const store = transaction.objectStore(STORES.VIDEOS);
      const index = store.index("platform");
      const request = index.getAll(platform);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get scan history for a video
  async getVideoScanHistory(videoId: string): Promise<ScanRecord[]> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SCANS], "readonly");
      const store = transaction.objectStore(STORES.SCANS);
      const index = store.index("videoId");
      const request = index.getAll(videoId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get vault statistics
  async getVaultStats(): Promise<{
    totalVideos: number;
    totalScans: number;
    totalTokensSaved: number;
    platformsConnected: number;
  }> {
    const videos = await this.getAllVideos();
    const scans = await this.getAllScans();

    const uniquePlatforms = new Set(videos.map(v => v.platform));
    const totalTokensSaved = scans.reduce((sum, scan) => sum + (scan.tokensUsed || 0), 0);

    return {
      totalVideos: videos.length,
      totalScans: scans.length,
      totalTokensSaved,
      platformsConnected: uniquePlatforms.size,
    };
  }

  // Calculate global safety meter (average across all videos)
  async calculateGlobalSafetyMeter(): Promise<number> {
    const videos = await this.getAllVideos();
    
    if (videos.length === 0) return 100;

    const totalScore = videos.reduce((sum, video) => sum + video.safetyScore, 0);
    return Math.round(totalScore / videos.length);
  }

  // Delete old scans (cleanup)
  async deleteOldScans(daysOld: number = 90): Promise<number> {
    await this.ensureDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const scans = await this.getAllScans();
    const oldScans = scans.filter(scan => new Date(scan.scanDate) < cutoffDate);

    let deletedCount = 0;
    for (const scan of oldScans) {
      await this.deleteScan(scan.id);
      deletedCount++;
    }

    return deletedCount;
  }

  // Delete a specific scan
  private async deleteScan(scanId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.SCANS], "readwrite");
      const store = transaction.objectStore(STORES.SCANS);
      const request = store.delete(scanId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Ensure DB is initialized
  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  // Clear all data (for testing/reset)
  async clearAll(): Promise<void> {
    await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.VIDEOS, STORES.SCANS, STORES.METADATA],
        "readwrite"
      );

      transaction.objectStore(STORES.VIDEOS).clear();
      transaction.objectStore(STORES.SCANS).clear();
      transaction.objectStore(STORES.METADATA).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
export const vault = new HistoricalDataVault();

// React hook for easy access
import { useState, useEffect } from "react";

export const useHistoricalVault = () => {
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalScans: 0,
    totalTokensSaved: 0,
    platformsConnected: 0,
  });
  const [safetyMeter, setSafetyMeter] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const vaultStats = await vault.getVaultStats();
      const meter = await vault.calculateGlobalSafetyMeter();
      
      setStats(vaultStats);
      setSafetyMeter(meter);
    } catch (error) {
      console.error("Failed to load vault stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStats = () => loadStats();

  return {
    stats,
    safetyMeter,
    isLoading,
    refreshStats,
    vault,
  };
};

export type { VideoRecord, ScanRecord };

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { usePolicyRules, type PolicyRule } from "./PolicyRulesContext";
import { useGhostGuard, type ViolationAlert } from "./GhostGuardContext";

export interface VideoSnapshot {
  videoId: string;
  platformId: string;
  title: string;
  description: string;
  tags: string[];
  thumbnailUrl: string;
  capturedAt: string;
}

export interface ContentChange {
  id: string;
  videoId: string;
  platformId: string;
  field: "title" | "description" | "tags" | "thumbnail";
  oldValue: string;
  newValue: string;
  detectedAt: string;
  smsSent: boolean;
  userLanguage: string;
  acknowledged: boolean;
  isMisleading: boolean;
  violatedRules: PolicyRule[];
}

interface ContentChangeTrackerContextType {
  changes: ContentChange[];
  unacknowledgedChanges: number;
  captureSnapshot: (video: {
    videoId: string;
    platformId: string;
    title: string;
    description: string;
    tags: string[];
    thumbnailUrl: string;
  }) => void;
  detectChanges: (video: {
    videoId: string;
    platformId: string;
    title: string;
    description: string;
    tags: string[];
    thumbnailUrl: string;
  }) => ContentChange | null;
  acknowledgeChange: (changeId: string) => void;
  getSnapshotsByVideo: (videoId: string) => VideoSnapshot[];
  sendChangeSMS: (change: ContentChange) => void;
}

const SNAPSHOTS_KEY = "tubeclear_video_snapshots";
const CHANGES_KEY = "tubeclear_content_changes";

// User language detection (would come from user profile in production)
const getUserLanguage = (): string => {
  try {
    return localStorage.getItem("tubeclear_user_language") || "en";
  } catch {
    return "en";
  }
};

// SMS messages in different languages
const SMS_MESSAGES: Record<string, string> = {
  en: "Content change detected. Would you like to rescan?",
  hi: "Content change hua hai, kya rescan karwana chahte hain?",
  es: "Cambio de contenido detectado. ¿Desea volver a escanear?",
  fr: "Changement de contenu détecté. Voulez-vous réanalyser?",
  de: "Inhaltsänderung erkannt. Möchten Sie erneut scannen?",
  pt: "Mudança de conteúdo detectada. Deseja escanear novamente?",
};

const ContentChangeTrackerContext = createContext<ContentChangeTrackerContextType | undefined>(undefined);

export const ContentChangeTrackerProvider = ({ children }: { children: ReactNode }) => {
  const { checkViolation } = usePolicyRules();
  const { addAlert } = useGhostGuard();

  const [snapshots, setSnapshots] = useState<VideoSnapshot[]>(() => {
    try {
      const stored = localStorage.getItem(SNAPSHOTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [changes, setChanges] = useState<ContentChange[]>(() => {
    try {
      const stored = localStorage.getItem(CHANGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveSnapshots = useCallback((newSnapshots: VideoSnapshot[]) => {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(newSnapshots));
    setSnapshots(newSnapshots);
  }, []);

  const saveChanges = useCallback((newChanges: ContentChange[]) => {
    localStorage.setItem(CHANGES_KEY, JSON.stringify(newChanges));
    setChanges(newChanges);
  }, []);

  const unacknowledgedChanges = changes.filter((c) => !c.acknowledged).length;

  const captureSnapshot = useCallback((video: {
    videoId: string;
    platformId: string;
    title: string;
    description: string;
    tags: string[];
    thumbnailUrl: string;
  }) => {
    const snapshot: VideoSnapshot = {
      ...video,
      capturedAt: new Date().toISOString(),
    };

    // Remove old snapshots for same video, keep last 5
    const existing = snapshots.filter((s) => s.videoId !== video.videoId);
    const videoSnapshots = snapshots.filter((s) => s.videoId === video.videoId).slice(-4);
    
    saveSnapshots([...existing, ...videoSnapshots, snapshot]);
  }, [snapshots, saveSnapshots]);

  const detectChanges = useCallback((video: {
    videoId: string;
    platformId: string;
    title: string;
    description: string;
    tags: string[];
    thumbnailUrl: string;
  }): ContentChange | null => {
    const lastSnapshot = snapshots.find((s) => s.videoId === video.videoId);
    
    if (!lastSnapshot) {
      // First scan, just capture snapshot
      captureSnapshot(video);
      return null;
    }

    const userLanguage = getUserLanguage();
    let detectedChange: ContentChange | null = null;

    // Check title change
    if (lastSnapshot.title !== video.title) {
      const violatedRules = checkViolation(video.title, video.platformId, "content");
      
      detectedChange = {
        id: `change-${video.videoId}-title-${Date.now()}`,
        videoId: video.videoId,
        platformId: video.platformId,
        field: "title",
        oldValue: lastSnapshot.title,
        newValue: video.title,
        detectedAt: new Date().toISOString(),
        smsSent: false,
        userLanguage,
        acknowledged: false,
        isMisleading: violatedRules.length > 0,
        violatedRules,
      };
    }

    // Check description change
    if (lastSnapshot.description !== video.description) {
      const violatedRules = checkViolation(video.description, video.platformId, "content");
      
      const change: ContentChange = {
        id: `change-${video.videoId}-desc-${Date.now()}`,
        videoId: video.videoId,
        platformId: video.platformId,
        field: "description",
        oldValue: lastSnapshot.description,
        newValue: video.description,
        detectedAt: new Date().toISOString(),
        smsSent: false,
        userLanguage,
        acknowledged: false,
        isMisleading: violatedRules.length > 0,
        violatedRules,
      };

      if (!detectedChange) {
        detectedChange = change;
      }
    }

    // Check tags change
    const oldTags = lastSnapshot.tags.sort().join(",");
    const newTags = video.tags.sort().join(",");
    if (oldTags !== newTags) {
      const violatedRules = checkViolation(newTags, video.platformId, "metadata");
      
      const change: ContentChange = {
        id: `change-${video.videoId}-tags-${Date.now()}`,
        videoId: video.videoId,
        platformId: video.platformId,
        field: "tags",
        oldValue: lastSnapshot.tags.join(", "),
        newValue: video.tags.join(", "),
        detectedAt: new Date().toISOString(),
        smsSent: false,
        userLanguage,
        acknowledged: false,
        isMisleading: violatedRules.length > 0,
        violatedRules,
      };

      if (!detectedChange) {
        detectedChange = change;
      }
    }

    // Check thumbnail change
    if (lastSnapshot.thumbnailUrl !== video.thumbnailUrl) {
      const change: ContentChange = {
        id: `change-${video.videoId}-thumb-${Date.now()}`,
        videoId: video.videoId,
        platformId: video.platformId,
        field: "thumbnail",
        oldValue: lastSnapshot.thumbnailUrl,
        newValue: video.thumbnailUrl,
        detectedAt: new Date().toISOString(),
        smsSent: false,
        userLanguage,
        acknowledged: false,
        isMisleading: false,
        violatedRules: [],
      };

      if (!detectedChange) {
        detectedChange = change;
      }
    }

    if (detectedChange) {
      // Save change and send SMS
      saveChanges([...changes, detectedChange]);
      sendChangeSMS(detectedChange);

      // If misleading, add to violation alerts
      if (detectedChange.isMisleading) {
        const alert: ViolationAlert = {
          id: `alert-${detectedChange.id}`,
          videoId: video.videoId,
          platformId: video.platformId,
          videoTitle: video.title,
          violatedRule: detectedChange.violatedRules[0],
          detectedAt: detectedChange.detectedAt,
          acknowledged: false,
          type: "misleading_content",
        };
        addAlert(alert);
      }
    }

    // Always capture new snapshot
    captureSnapshot(video);

    return detectedChange;
  }, [snapshots, changes, checkViolation, captureSnapshot, saveChanges, addAlert]);

  const acknowledgeChange = useCallback((changeId: string) => {
    const updated = changes.map((c) =>
      c.id === changeId ? { ...c, acknowledged: true } : c
    );
    saveChanges(updated);
  }, [changes, saveChanges]);

  const getSnapshotsByVideo = useCallback((videoId: string) => {
    return snapshots.filter((s) => s.videoId === videoId);
  }, [snapshots]);

  const sendChangeSMS = useCallback((change: ContentChange) => {
    // In production, this would send via Twilio/SMS API
    // For now, we log and show toast notification
    const message = SMS_MESSAGES[change.userLanguage] || SMS_MESSAGES.en;
    console.log(`[SMS] ${message} (Video: ${change.videoId}, Field: ${change.field})`);
    
    // Mark as sent
    const updated = changes.map((c) =>
      c.id === change.id ? { ...c, smsSent: true } : c
    );
    saveChanges(updated);

    // Show browser notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("TubeClear - Content Change Detected", {
        body: message,
        icon: "/favicon.ico",
      });
    }
  }, [changes, saveChanges]);

  return (
    <ContentChangeTrackerContext.Provider
      value={{
        changes,
        unacknowledgedChanges,
        captureSnapshot,
        detectChanges,
        acknowledgeChange,
        getSnapshotsByVideo,
        sendChangeSMS,
      }}
    >
      {children}
    </ContentChangeTrackerContext.Provider>
  );
};

export const useContentChangeTracker = () => {
  const ctx = useContext(ContentChangeTrackerContext);
  if (!ctx) throw new Error("useContentChangeTracker must be used within ContentChangeTrackerProvider");
  return ctx;
};

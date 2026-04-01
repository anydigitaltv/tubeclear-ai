import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType = "info" | "warning" | "success" | "error" | "maintenance" | "feature_update";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  featureId?: string;
  actionUrl?: string;
  isGlobal?: boolean;
  language?: string;
}

export interface FeatureStatus {
  id: string;
  name: string;
  status: "active" | "removed" | "new" | "maintenance";
  lastUpdated: string;
  message?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  featureStatuses: FeatureStatus[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  sendGlobalNotification: (notification: Omit<Notification, "id" | "timestamp" | "read" | "isGlobal">) => Promise<void>;
  updateFeatureStatus: (featureId: string, status: FeatureStatus["status"], message?: string) => void;
  getNotificationsByType: (type: NotificationType) => Notification[];
  getLocalizedNotification: (notification: Notification) => string;
}

// Multi-language notification templates
const NOTIFICATION_TEMPLATES: Record<string, Record<string, string>> = {
  en: {
    feature_update: "Hey, {feature} is being updated, check back in a bit!",
    maintenance: "{feature} is under maintenance. We'll notify you when it's back.",
    feature_removed: "{feature} has been temporarily removed for policy compliance.",
    new_feature: "New feature available: {feature}! Check it out.",
    success: "Great! {message}",
    warning: "Heads up: {message}",
    error: "Oops! {message}",
  },
  hi: {
    feature_update: "Bhai, {feature} update ho raha hai, thori dair baad check karein.",
    maintenance: "{feature} maintenance mein hai. Wapas aane par batayenge.",
    feature_removed: "Policy compliance ke liye {feature} temporarily hataya gaya hai.",
    new_feature: "Naya feature: {feature}! Check karein.",
    success: "Shabash! {message}",
    warning: "Dhyan dein: {message}",
    error: "Arey! {message}",
  },
  ur: {
    feature_update: "Bhai, {feature} update ho raha hai, thori dair baad check karein.",
    maintenance: "{feature} maintenance mein hai. Wapas aane par batayenge.",
    feature_removed: "Policy compliance ke liye {feature} temporarily hataya gaya hai.",
    new_feature: "Naya feature: {feature}! Check karein.",
    success: "Shabash! {message}",
    warning: "Dhyan dein: {message}",
    error: "Arey! {message}",
  },
  es: {
    feature_update: "Hola, {feature} se está actualizando, revisa más tarde.",
    maintenance: "{feature} está en mantenimiento. Te avisaremos cuando vuelva.",
    feature_removed: "{feature} ha sido removido temporalmente por cumplimiento de políticas.",
    new_feature: "Nueva función: {feature}. ¡Échale un vistazo!",
    success: "¡Genial! {message}",
    warning: "Atención: {message}",
    error: "¡Ups! {message}",
  },
  ar: {
    feature_update: "مرحبًا، يتم تحديث {feature}، تحقق لاحقًا.",
    maintenance: "{feature} تحت الصيانة. سنعلمك عند عودته.",
    feature_removed: "تمت إزالة {feature} مؤقتًا للامتثال للسياسات.",
    new_feature: "ميزة جديدة: {feature}! تحقق منها.",
    success: "رائع! {message}",
    warning: "تنبيه: {message}",
    error: "عذرًا! {message}",
  },
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_KEY = "tubeclear_notifications";
const FEATURE_STATUSES_KEY = "tubeclear_feature_statuses";

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [featureStatuses, setFeatureStatuses] = useState<FeatureStatus[]>(() => {
    try {
      const stored = localStorage.getItem(FEATURE_STATUSES_KEY);
      return stored ? JSON.parse(stored) : [
        { id: "scan", name: "Video Scanner", status: "active", lastUpdated: new Date().toISOString() },
        { id: "ghost_guard", name: "Ghost Guard", status: "active", lastUpdated: new Date().toISOString() },
        { id: "content_tracker", name: "Content Change Tracker", status: "active", lastUpdated: new Date().toISOString() },
        { id: "thumbnail_scan", name: "Thumbnail Scanner", status: "active", lastUpdated: new Date().toISOString() },
        { id: "ai_doctor", name: "AI Doctor", status: "active", lastUpdated: new Date().toISOString() },
      ];
    } catch {
      return [];
    }
  });

  const saveNotifications = useCallback((n: Notification[]) => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(n));
    setNotifications(n);
  }, []);

  const saveFeatureStatuses = useCallback((f: FeatureStatus[]) => {
    localStorage.setItem(FEATURE_STATUSES_KEY, JSON.stringify(f));
    setFeatureStatuses(f);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
      language: navigator.language.split("-")[0],
    };

    saveNotifications([newNotification, ...notifications].slice(0, 100)); // Keep last 100
  }, [notifications, saveNotifications]);

  const markAsRead = useCallback((id: string) => {
    saveNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  }, [notifications, saveNotifications]);

  const markAllAsRead = useCallback(() => {
    saveNotifications(notifications.map(n => ({ ...n, read: true })));
  }, [notifications, saveNotifications]);

  const clearNotification = useCallback((id: string) => {
    saveNotifications(notifications.filter(n => n.id !== id));
  }, [notifications, saveNotifications]);

  const clearAllNotifications = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  const sendGlobalNotification = useCallback(async (
    notification: Omit<Notification, "id" | "timestamp" | "read" | "isGlobal">
  ) => {
    // In production, this would push to all users via Supabase Realtime
    const globalNotif: Notification = {
      ...notification,
      id: `global-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      isGlobal: true,
      language: navigator.language.split("-")[0],
    };

    saveNotifications([globalNotif, ...notifications].slice(0, 100));

    // Try to sync to Supabase for persistence (table would need to be created)
    if (user) {
      console.log("Global notification for sync:", globalNotif);
      // Table: global_notifications needs to be created in Supabase
      // await supabase.from("global_notifications").insert({
      //   type: notification.type,
      //   title: notification.title,
      //   message: notification.message,
      //   created_at: new Date().toISOString(),
      // });
    }
  }, [notifications, saveNotifications, user]);

  const updateFeatureStatus = useCallback((featureId: string, status: FeatureStatus["status"], message?: string) => {
    const existingIndex = featureStatuses.findIndex(f => f.id === featureId);
    const now = new Date().toISOString();

    let updated: FeatureStatus[];

    if (existingIndex >= 0) {
      updated = featureStatuses.map(f =>
        f.id === featureId
          ? { ...f, status, lastUpdated: now, message }
          : f
      );
    } else {
      updated = [...featureStatuses, {
        id: featureId,
        name: featureId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        status,
        lastUpdated: now,
        message,
      }];
    }

    saveFeatureStatuses(updated);

    // Add notification for status change
    const typeMap: Record<FeatureStatus["status"], NotificationType> = {
      active: "success",
      removed: "warning",
      new: "info",
      maintenance: "maintenance",
    };

    addNotification({
      type: typeMap[status],
      title: `Feature ${status}`,
      message: message || `${featureId} is now ${status}`,
      featureId,
    });
  }, [featureStatuses, saveFeatureStatuses, addNotification]);

  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const getLocalizedNotification = useCallback((notification: Notification): string => {
    const lang = notification.language || navigator.language.split("-")[0];
    const templates = NOTIFICATION_TEMPLATES[lang] || NOTIFICATION_TEMPLATES.en;
    const template = templates[notification.type] || templates.info || "{message}";

    return template
      .replace("{feature}", notification.featureId || "Feature")
      .replace("{message}", notification.message);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        featureStatuses,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        sendGlobalNotification,
        updateFeatureStatus,
        getNotificationsByType,
        getLocalizedNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

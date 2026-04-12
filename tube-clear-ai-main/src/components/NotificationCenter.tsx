import { useState } from "react";
import { Bell, X, Check, Trash2, Info, AlertTriangle, CheckCircle, XCircle, Wrench, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, type Notification, type NotificationType } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    featureStatuses,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    getLocalizedNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "maintenance": return <Wrench className="h-4 w-4 text-orange-500" />;
      case "feature_update": return <Sparkles className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-500";
      case "removed": return "bg-red-500/20 text-red-500";
      case "new": return "bg-blue-500/20 text-blue-500";
      case "maintenance": return "bg-orange-500/20 text-orange-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-card border-border/20" align="end">
        <div className="p-4 border-b border-border/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-border/20">
            <TabsTrigger value="all" className="rounded-none">All</TabsTrigger>
            <TabsTrigger value="features" className="rounded-none">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => markAsRead(notification.id)}
                      onClear={() => clearNotification(notification.id)}
                      getIcon={getNotificationIcon}
                      getLocalized={getLocalizedNotification}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="features" className="mt-0">
            <ScrollArea className="h-[300px]">
              <div className="p-4 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Feature Status</h4>
                {featureStatuses.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex flex-col gap-1 p-3 rounded-lg bg-secondary/30 border border-border/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{feature.name}</span>
                      <Badge className={cn("text-[10px] h-5 capitalize", getStatusColor(feature.status))}>
                        {feature.status}
                      </Badge>
                    </div>
                    {feature.message && (
                      <p className="text-[11px] text-muted-foreground leading-tight italic">
                        Reason: {feature.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {notifications.length > 0 && (
          <div className="p-2 border-t border-border/20">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={clearAllNotifications}
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const NotificationItem = ({
  notification,
  onMarkRead,
  onClear,
  getIcon,
  getLocalized,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onClear: () => void;
  getIcon: (type: NotificationType) => React.ReactNode;
  getLocalized: (n: Notification) => string;
}) => (
  <div
    className={cn(
      "p-3 hover:bg-secondary/30 transition-colors",
      !notification.read && "bg-primary/5"
    )}
  >
    <div className="flex items-start gap-3">
      {getIcon(notification.type)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{notification.title}</span>
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {getLocalized(notification)}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">
            {new Date(notification.timestamp).toLocaleTimeString()}
          </span>
          {!notification.read && (
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onMarkRead}>
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onClear}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export default NotificationCenter;

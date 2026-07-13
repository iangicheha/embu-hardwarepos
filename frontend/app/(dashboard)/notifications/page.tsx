"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  XCircle,
  PackagePlus,
  ShieldAlert,
  ShoppingCart,
  Bell,
  Loader2,
  Check,
} from "lucide-react";
import { getNotifications, markNotificationAsRead } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

// The backend Notification model has no `type` field — only `title`, `message`,
// `isRead`, `createdAt`. We derive a kind from the title text so the UI still
// gets a sensible icon and colour for the categories the system actually emits.
type NotificationKind = "low-stock" | "out-of-stock" | "restock" | "order" | "auth" | "info";

function classifyNotification(title: string): NotificationKind {
  const t = title.toLowerCase();
  if (t.includes("low stock")) return "low-stock";
  if (t.includes("out of stock")) return "out-of-stock";
  if (t.includes("restock")) return "restock";
  if (t.includes("large order") || t.includes("order")) return "order";
  if (t.includes("login") || t.includes("auth")) return "auth";
  return "info";
}

const notificationConfig: Record<
  NotificationKind,
  { icon: React.ElementType; color: string; badgeVariant: "warning" | "danger" | "success" | "default" | "secondary" }
> = {
  "low-stock": { icon: AlertTriangle, color: "text-warning", badgeVariant: "warning" },
  "out-of-stock": { icon: XCircle, color: "text-danger", badgeVariant: "danger" },
  restock: { icon: PackagePlus, color: "text-success", badgeVariant: "success" },
  auth: { icon: ShieldAlert, color: "text-danger", badgeVariant: "danger" },
  order: { icon: ShoppingCart, color: "text-primary", badgeVariant: "default" },
  info: { icon: Bell, color: "text-muted-foreground", badgeVariant: "secondary" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true);
        const res = await getNotifications();
        setNotifications(res.data?.notifications ?? res.data ?? []);
      } catch (err) {
        setError("Failed to load notifications");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  async function handleMarkAsRead(id: string) {
    try {
      await markNotificationAsRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (err: any) {
      setError(err.message || "Failed to mark as read");
    }
  }

  // Backend uses `isRead`; some legacy rows might use `read`. Coalesce.
  const isRead = (n: any) => Boolean(n.isRead ?? n.read);

  const unread = notifications.filter((n) => !isRead(n));
  const read = notifications.filter((n) => isRead(n));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">
            Notification center — {unread.length} unread
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Bell className="mr-1 h-3 w-3" />
          {notifications.length} total
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No notifications found.
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Unread
              </h3>
              {unread.map((notification) => {
                const kind = classifyNotification(notification.title ?? "");
                const config = notificationConfig[kind];
                const Icon = config.icon;
                return (
                  <Card
                    key={notification.id}
                    className="border-l-4 border-l-primary transition-shadow hover:shadow-md"
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted",
                          config.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{notification.title}</p>
                          <Badge variant={config.badgeVariant} className="text-[10px]">
                            {kind.replace("-", " ")}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(notification.createdAt)}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {read.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Earlier
              </h3>
              {read.map((notification) => {
                const kind = classifyNotification(notification.title ?? "");
                const config = notificationConfig[kind];
                const Icon = config.icon;
                return (
                  <Card key={notification.id} className="opacity-75">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{notification.title}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {kind.replace("-", " ")}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

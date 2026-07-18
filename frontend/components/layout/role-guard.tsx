"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isRouteAllowedForRole } from "@/lib/rbac";

/**
 * Client-side route guard for the dashboard. If the logged-in user is a
 * cashier (server role "worker") and the current pathname is not in their
 * allowed set, redirect to /pos. Admin users are never blocked.
 *
 * This is a UX guard, not a security boundary. The backend must still
 * enforce permissions on every API call (see backend/src/middleware).
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user) return; // not hydrated yet — let the layout render, no redirect
    if (!isRouteAllowedForRole(user.role, pathname)) {
      router.replace("/pos");
    }
  }, [user, pathname, router]);

  return <>{children}</>;
}

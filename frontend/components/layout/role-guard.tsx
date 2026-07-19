"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { isRouteAllowedForRole } from "@/lib/rbac";

/**
 * Client-side route guard for the dashboard.
 *
 * Two separate checks happen here:
 *  1. AUTHENTICATION — is there a token at all? If not, redirect to /login
 *     immediately. This used to be missing entirely: `!user` was treated as
 *     "still loading", so an unauthenticated visitor typing the dashboard
 *     URL directly rendered the dashboard with no redirect.
 *  2. AUTHORIZATION — if there IS a token and the user has loaded, is a
 *     cashier trying to access an admin-only route? Redirect to /pos.
 *
 * This is a UX guard, not a security boundary. The backend must still
 * enforce permissions on every API call (see backend/src/middleware).
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null); // null = not checked yet

  // Check for a token synchronously on mount. This runs before we know
  // whether `user` has hydrated, so it's the only thing we can trust to
  // tell "logged out" apart from "still loading".
  useEffect(() => {
    const token =
      window.localStorage.getItem("accessToken") ||
      window.sessionStorage.getItem("accessToken");

    if (!token) {
      router.replace("/login");
      setHasToken(false);
      return;
    }
    setHasToken(true);
  }, [router]);

  // Role check — only runs once we know there's a token AND the user object
  // has hydrated. Cashiers get bounced away from admin-only routes.
  useEffect(() => {
    if (!hasToken || !user) return;
    if (!isRouteAllowedForRole(user.role, pathname)) {
      router.replace("/pos");
    }
  }, [hasToken, user, pathname, router]);

  // While we haven't confirmed a token exists yet, don't render the
  // protected dashboard content at all — avoids a flash of real data
  // before the redirect kicks in.
  if (hasToken === null || hasToken === false) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return <>{children}</>;
}
/**
 * rbac.ts
 *
 * Single source of truth for what each role can see. The backend enum only
 * has "admin" and "worker" (see backend/prisma/schema.prisma), so the
 * frontend maps "worker" -> "cashier" for display. The actual `role` value
 * stored on the user is still the server's value.
 *
 * Add new routes to ALLOWED_ROUTES_BY_ROLE so the sidebar and the route
 * guard stay in sync.
 */

export type AppRole = "admin" | "worker";

export const CASHIER_ALLOWED_ROUTES = new Set<string>([
  "/pos",
  "/products",
  "/restocks",
]);

/**
 * Returns true if the given role is allowed to visit the given pathname.
 * Matching is prefix-based so that detail pages (e.g. /suppliers/123) follow
 * the same rules as their parent (e.g. /suppliers).
 */
export function isRouteAllowedForRole(role: AppRole | undefined | null, pathname: string): boolean {
  if (!role) return true; // unknown role -> don't lock anyone out before login hydration
  if (role === "admin") return true;
  // worker (cashier)
  if (CASHIER_ALLOWED_ROUTES.has(pathname)) return true;
  for (const allowed of CASHIER_ALLOWED_ROUTES) {
    if (pathname.startsWith(`${allowed}/`)) return true;
  }
  return false;
}

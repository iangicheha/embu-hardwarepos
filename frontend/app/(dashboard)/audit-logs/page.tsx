"use client";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { getAuditLogs } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

// AuditLog `action` values are the constants the service writes (USER_CREATED,
// ORDER_CREATED, etc.). Map the prefix to a colour so the badge isn't always
// the fallback "secondary" variant.
const actionVariant: Record<string, "default" | "success" | "warning" | "danger" | "secondary"> = {
  USER_CREATED: "success",
  CATEGORY_CREATED: "success",
  SUPPLIER_CREATED: "success",
  PRODUCT_CREATED: "success",
  RESTOCK_CREATED: "success",
  ORDER_CREATED: "default",
  USER_UPDATED: "default",
  CATEGORY_UPDATED: "default",
  SUPPLIER_UPDATED: "default",
  PRODUCT_UPDATED: "default",
  SETTINGS_UPDATED: "default",
  USER_DEACTIVATED: "warning",
  USER_ACTIVATED: "success",
  PASSWORD_CHANGED: "warning",
  ORDER_REFUNDED: "danger",
  ORDER_CANCELLED: "danger",
  CATEGORY_DELETED: "danger",
  SUPPLIER_DELETED: "danger",
  PRODUCT_DELETED: "danger",
};

const ITEMS_PER_PAGE = 8;

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        const res = await getAuditLogs(1, 100);
        setLogs(res.data?.logs ?? []);
      } catch (err) {
        setError("Failed to load audit logs");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  // Use the `action` enum (e.g. "USER_CREATED") as the filter axis since
  // AuditLog has no `module` column.
  const actionTypes = [...new Set(logs.map((log) => log.action).filter(Boolean))];

  const filtered = logs.filter((log) => {
    const userName = log.user?.fullName ?? "";
    const actionText = log.action ?? "";
    const detailsText = log.details ?? "";
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      userName.toLowerCase().includes(q) ||
      actionText.toLowerCase().includes(q) ||
      detailsText.toLowerCase().includes(q);
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          Enterprise activity logs and system audit trail
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-56"
            >
              <option value="all">All Actions</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {paginated.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found matching your filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.user?.fullName ?? (log.userId ? "User" : "System")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionVariant[log.action] ?? "secondary"}>
                          {(log.action ?? "UNKNOWN").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filtered.length === 0
                    ? "Showing 0 of 0"
                    : `Showing ${(page - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
                        page * ITEMS_PER_PAGE,
                        filtered.length
                      )} of ${filtered.length}`}
                </p>
                <div className="flex gap-2">
                  <button
                    className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium disabled:opacity-50"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

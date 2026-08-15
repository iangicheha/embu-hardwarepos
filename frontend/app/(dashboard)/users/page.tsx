"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, UserX, Trash2, Loader2 } from "lucide-react";
import { getUsers, createUser, updateUser, deleteUser, deactivateUser, activateUser } from "@/lib/api";
import type { UserRole, UserStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    fullName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role: "admin" | "worker";
  }>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "worker"
  });

  // Edit dialog — separate from the create dialog above since editing only
  // touches fullName/phone/role (username, email, and password aren't
  // editable here; matches what users.validation.ts's updateUserSchema
  // actually accepts).
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", role: "worker" as "admin" | "worker" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        const res = await getUsers(1, 100);
        setUsers(res.data.users || []);
      } catch (err) {
        setError("Failed to load users");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  async function handleCreateUser() {
    try {
      setSubmitting(true);
      setError(null);
      await createUser(formData);
      const res = await getUsers(1, 100);
      setUsers(res.data.users || []);
      setDialogOpen(false);
      setFormData({ fullName: "", username: "", email: "", phone: "", password: "", role: "worker" });
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditUser(user: any) {
    setEditError(null);
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName ?? "",
      phone: user.phone ?? "",
      role: user.role === "admin" ? "admin" : "worker"
    });
  }

  async function handleSaveEditUser() {
    if (!editingUser) return;
    try {
      setEditSubmitting(true);
      setEditError(null);
      await updateUser(editingUser.id, editForm);
      const res = await getUsers(1, 100);
      setUsers(res.data.users || []);
      setEditingUser(null);
    } catch (err: any) {
      setEditError(err.message || "Failed to update user");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      setError(null);
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      // Most likely cause: the backend refuses to delete a user with order/
      // restock history (preserves that history) — the error message from
      // the service explains this directly, so just surface it as-is.
      setError(err.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeactivateUser(id: string) {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    try {
      await deactivateUser(id);
      setUsers(users.map(u => u.id === id ? { ...u, isActive: false } : u));
    } catch (err: any) {
      setError(err.message || "Failed to deactivate user");
    }
  }

  async function handleActivateUser(id: string) {
    try {
      await activateUser(id);
      setUsers(users.map(u => u.id === id ? { ...u, isActive: true } : u));
    } catch (err: any) {
      setError(err.message || "Failed to activate user");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage system users and access roles (Admin only)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input 
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Username</Label>
                <Input
                  placeholder="Used to log in"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="user@buildmart.co.ke"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input 
                  placeholder="+254 7XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <Input 
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v as "admin" | "worker"})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="worker">Worker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog — separate from Create above. Username/email/password
          aren't editable here, matching the backend's updateUserSchema. */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
                {editError}
              </div>
            )}
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v as "admin" | "worker" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditUser} disabled={editSubmitting}>
              {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {user.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "Admin" : "Worker"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isActive ? "success" : "danger"}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.createdAt ? formatDate(user.createdAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditUser(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>
                        {user.isActive ? (
                          <DropdownMenuItem 
                            className="text-danger"
                            onClick={() => handleDeactivateUser(user.id)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleActivateUser(user.id)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Activate User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-danger"
                          disabled={deletingId === user.id}
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
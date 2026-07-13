"use client";

import { useState, useEffect } from "react";
import { Package, TrendingUp, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { getCategories, getProducts, createCategory, updateCategory, deleteCategory } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatNumber, toNumber } from "@/lib/utils";

const CATEGORY_COLOR_PALETTE = [
  "stone",
  "slate",
  "blue",
  "yellow",
  "cyan",
  "orange",
  "amber",
  "red",
  "green",
  "rose",
  "violet",
  "teal",
  "indigo",
  "pink",
];

const colorClasses: Record<string, string> = {
  stone: "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

function pickColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CATEGORY_COLOR_PALETTE.length;
  return CATEGORY_COLOR_PALETTE[index];
}

function colorClassFor(color?: string | null): string {
  if (color && colorClasses[color]) return colorClasses[color];
  return colorClasses.gray;
}

type CategoryFormState = {
  name: string;
  description: string;
  color: string;
};

const EMPTY_FORM: CategoryFormState = { name: "", description: "", color: "" };

function CategoryFormFields({
  form,
  onChange,
  idPrefix
}: {
  form: CategoryFormState;
  onChange: (next: CategoryFormState) => void;
  idPrefix: string;
}) {
  const previewColor = form.color || pickColor(form.name);
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Category Name</Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="Enter category name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-desc`}>Description</Label>
        <Input
          id={`${idPrefix}-desc`}
          placeholder="Category description"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Select color ${c}`}
              onClick={() => onChange({ ...form, color: c })}
              className={`h-7 w-7 rounded-full ${colorClasses[c]} border-2 transition-transform hover:scale-110 ${
                previewColor === c
                  ? "border-foreground ring-2 ring-offset-2 ring-foreground/40"
                  : "border-transparent"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Leave unselected to auto-pick based on the name.
        </p>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<CategoryFormState>(EMPTY_FORM);

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<CategoryFormState>(EMPTY_FORM);

  async function refreshCategories() {
    const categoriesRes = await getCategories(1, 100);
    setCategories(categoriesRes.data.categories || []);
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [categoriesRes, productsRes] = await Promise.all([
          getCategories(1, 100),
          getProducts(1, 100)
        ]);

        setCategories(categoriesRes.data.categories || []);
        setProducts(productsRes.data.products || []);
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleCreateCategory() {
    try {
      setSubmitting(true);
      setError(null);
      const color = addForm.color || pickColor(addForm.name);
      await createCategory({ ...addForm, color });
      await refreshCategories();
      setAddOpen(false);
      setAddForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err.message || "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditDialog(cat: any) {
    setEditTarget(cat);
    setEditForm({
      name: cat.name ?? "",
      description: cat.description ?? "",
      color: cat.color ?? ""
    });
  }

  function closeEditDialog() {
    setEditTarget(null);
    setEditForm(EMPTY_FORM);
  }

  async function handleUpdateCategory() {
    if (!editTarget) return;
    try {
      setSavingId(editTarget.id);
      setError(null);
      const payload = {
        name: editForm.name,
        description: editForm.description,
        color: editForm.color || pickColor(editForm.name)
      };
      await updateCategory(editTarget.id, payload);
      await refreshCategories();
      closeEditDialog();
    } catch (err: any) {
      setError(err.message || "Failed to update category");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteCategory(cat: any) {
    if (!confirm(`Are you sure you want to delete "${cat.name}"?`)) return;
    try {
      setError(null);
      await deleteCategory(cat.id);
      setCategories(categories.filter(c => c.id !== cat.id));
    } catch (err: any) {
      setError(err.message || "Failed to delete category");
    }
  }

  const categoryStats = categories.map((cat) => {
    const catProducts = products.filter((p) => {
      const catName = typeof p.category === 'string' ? p.category : p.category?.name;
      return catName === cat.name;
    });
    const totalStock = catProducts.reduce(
      (sum: number, p: any) => sum + toNumber(p.quantity),
      0
    );
    const totalValue = catProducts.reduce(
      (sum: number, p: any) => sum + toNumber(p.quantity) * toNumber(p.sellingPrice),
      0
    );
    const lowStock = catProducts.filter((p: any) => {
      const stock = toNumber(p.quantity);
      const reorderLevel = toNumber(p.reorderLevel) || 10;
      return stock <= reorderLevel;
    }).length;
    return {
      ...cat,
      productCount: catProducts.length,
      totalStock,
      totalValue,
      lowStock,
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">
            Overview of product categories and inventory distribution
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <CategoryFormFields
              form={addForm}
              onChange={setAddForm}
              idPrefix="add"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      {categoryStats.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No categories found. Add your first category to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoryStats.map((cat) => (
            <Card key={cat.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClassFor(cat.color)}`}
                  >
                    <Package className="h-5 w-5" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEditDialog(cat)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-danger"
                        onSelect={() => handleDeleteCategory(cat)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {cat.lowStock > 0 && (
                  <Badge variant="warning">{cat.lowStock} alerts</Badge>
                )}
                <CardTitle className="text-base mt-3">{cat.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{cat.productCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Stock</span>
                  <span className="font-medium">{formatNumber(cat.totalStock)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock Value</span>
                  <span className="font-medium">{formatCurrency(cat.totalValue)}</span>
                </div>
                <div className="flex items-center gap-1 pt-1 text-success">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs">Active category</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <CategoryFormFields
            form={editForm}
            onChange={setEditForm}
            idPrefix={`edit-${editTarget?.id ?? ""}`}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={savingId !== null}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={savingId !== null || !editForm.name.trim()}
            >
              {savingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

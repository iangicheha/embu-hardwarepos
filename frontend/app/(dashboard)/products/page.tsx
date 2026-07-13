"use client";

import { useEffect, useState } from "react";
import { Plus, Search, FileSpreadsheet, FileText, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, getSuppliers } from "@/lib/api";
import type { Product, ProductStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const statusVariant: Record<ProductStatus, "success" | "warning" | "danger"> = {
  "In Stock": "success",
  "Low Stock": "warning",
  "Out of Stock": "danger",
};

const ITEMS_PER_PAGE = 8;

// Backend Prisma `Product` has no `image`/`stock`/`status`/`code`/`supplierName`
// fields — those are derived or renamed in the UI. This shape mirrors what
// `getProducts` actually returns from the inventory module.
interface ApiProduct {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  buyingPrice: string | number;   // Prisma Decimal serialises as a string
  sellingPrice: string | number;
  quantity: number;
  reorderLevel: number;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  supplierId: string | null;
  supplier?: { id: string; supplierName: string } | null;
}

function toNumber(value: string | number): number {
  if (typeof value === "number") return value;
  // Prisma Decimal serialises as a string (e.g. "12.50") to preserve precision.
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function deriveStatus(quantity: number, reorderLevel: number): ProductStatus {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= reorderLevel) return "Low Stock";
  return "In Stock";
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; supplierName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    productCode: "",
    description: "",
    categoryId: "",
    supplierId: "",
    buyingPrice: "",
    sellingPrice: "",
    quantity: "",
    reorderLevel: ""
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
          getProducts(1, 100),
          getCategories(1, 100),
          getSuppliers(1, 100)
        ]);

        setProducts((productsRes.data?.products ?? []) as ApiProduct[]);
        setCategories((categoriesRes.data?.categories ?? []) as Array<{ id: string; name: string }>);
        setSuppliers((suppliersRes.data?.suppliers ?? []) as Array<{ id: string; supplierName: string }>);
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleCreateProduct() {
    try {
      setSubmitting(true);
      setError(null);

      const productData = {
        name: formData.name,
        productCode: formData.productCode,
        description: formData.description,
        categoryId: formData.categoryId || null,
        supplierId: formData.supplierId || null,
        buyingPrice: Number(formData.buyingPrice),
        sellingPrice: Number(formData.sellingPrice),
        quantity: Number(formData.quantity),
        reorderLevel: Number(formData.reorderLevel)
      };

      await createProduct(productData);

      // Reload products
      const productsRes = await getProducts(1, 100);
      setProducts((productsRes.data?.products ?? []) as ApiProduct[]);

      setDialogOpen(false);
      setFormData({
        name: "",
        productCode: "",
        description: "",
        categoryId: "",
        supplierId: "",
        buyingPrice: "",
        sellingPrice: "",
        quantity: "",
        reorderLevel: ""
      });
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.productCode.toLowerCase().includes(q);

    // category can be an included object from the API; fall back to the id
    const categoryName = p.category?.name ?? "Uncategorized";
    const matchesCategory = categoryFilter === "all" || categoryName === categoryFilter;

    const status = deriveStatus(p.quantity, p.reorderLevel);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
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
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            Manage your product catalog and inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="mr-1 h-4 w-4" />
            Export PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Product Name</Label>
                  <Input
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Product Code</Label>
                    <Input
                      placeholder="e.g. CEM-001"
                      value={formData.productCode}
                      onChange={(e) => setFormData({...formData, productCode: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Product description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Supplier</Label>
                  <Select value={formData.supplierId} onValueChange={(v) => setFormData({...formData, supplierId: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.supplierName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Buying Price (KES)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.buyingPrice}
                      onChange={(e) => setFormData({...formData, buyingPrice: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Selling Price (KES)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Reorder Level</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({...formData, reorderLevel: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProduct} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="In Stock">In Stock</SelectItem>
                <SelectItem value="Low Stock">Low Stock</SelectItem>
                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Buying</TableHead>
                <TableHead className="text-right">Selling</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((product) => {
                const status = deriveStatus(product.quantity, product.reorderLevel);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <span className="font-medium">{product.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.productCode}</TableCell>
                    <TableCell>{product.category?.name ?? "Uncategorized"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.supplier?.supplierName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(toNumber(product.buyingPrice))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(toNumber(product.sellingPrice))}
                    </TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[status]}>{status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-danger">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
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
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

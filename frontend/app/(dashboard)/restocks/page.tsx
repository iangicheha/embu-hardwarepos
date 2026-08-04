"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  PackagePlus,
  Loader2,
  Search,
  Plus,
  X,
  MoreVertical,
  Pencil,
  Trash2
} from "lucide-react";
import {
  getProducts,
  getSuppliers,
  getRestocks,
  createRestock,
  updateRestock,
  deleteRestock,
  createProduct,
  getCategories,
  type CreateProductInput
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, toNumber } from "@/lib/utils";

export default function RestocksPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [restocks, setRestocks] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    productId: "",
    supplierId: "",
    quantityAdded: "",
    cost: "",
    notes: ""
  });

  // --- Product search / combobox state ---
  const [productQuery, setProductQuery] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productBoxRef = useRef<HTMLDivElement | null>(null);

  // --- Restock row edit/delete state ---
  const [editingRestockId, setEditingRestockId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    quantityAdded: "",
    cost: "",
    notes: ""
  });
  const [rowActionError, setRowActionError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEditRestock(restock: any) {
    setRowActionError(null);
    setEditingRestockId(restock.id);
    setEditForm({
      quantityAdded: String(restock.quantityAdded ?? ""),
      cost: String(toNumber(restock.cost) ?? ""),
      notes: restock.notes ?? ""
    });
  }

  function cancelEditRestock() {
    setEditingRestockId(null);
    setRowActionError(null);
  }

  async function saveEditRestock(id: string) {
    try {
      setSavingEdit(true);
      setRowActionError(null);
      await updateRestock(id, {
        quantityAdded: editForm.quantityAdded ? Number(editForm.quantityAdded) : undefined,
        cost: editForm.cost !== "" ? Number(editForm.cost) : undefined,
        notes: editForm.notes
      });
      const [restocksRes, productsRes] = await Promise.all([
        getRestocks(1, 100),
        loadAllProducts()
      ]);
      setRestocks(restocksRes.data.restocks || []);
      setProducts(productsRes);
      setEditingRestockId(null);
    } catch (err: any) {
      setRowActionError(err.message || "Failed to update restock");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteRestock(id: string) {
    if (!confirm("Delete this restock? This will also remove the stock it added.")) {
      return;
    }
    try {
      setDeletingId(id);
      setRowActionError(null);
      await deleteRestock(id);
      const [restocksRes, productsRes] = await Promise.all([
        getRestocks(1, 100),
        loadAllProducts()
      ]);
      setRestocks(restocksRes.data.restocks || []);
      setProducts(productsRes);
    } catch (err: any) {
      setRowActionError(err.message || "Failed to delete restock");
    } finally {
      setDeletingId(null);
    }
  }

  // Groups restock history by calendar day so a day's restocks sit
  // together under one date heading, most recent day first.
  const restocksByDate = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const r of restocks) {
      const dateKey = new Date(r.createdAt).toDateString();
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(r);
    }
    return Array.from(groups.entries());
  }, [restocks]);

  // --- Add new product (inline) state ---
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProductError, setNewProductError] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    productCode: "",
    name: "",
    buyingPrice: "",
    quantity: "",
    reorderLevel: "",
    baseUnit: "pcs",
    sellingPrice: "",
    categoryId: "",
  });

  // simple auto-generated product code from the name, editable by the user
  function generateProductCode(name: string) {
    const slug = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const suffix = Date.now().toString().slice(-4);
    return slug ? `${slug}-${suffix}` : `PROD-${suffix}`;
  }

  // Fetches every page of products, not just the first, so the search
  // dropdown always has the full catalogue to filter against.
  async function loadAllProducts() {
    const first = await getProducts(1, 100);
    const products = [...(first.data.products || [])];
    const totalPages = first.data.pagination?.totalPages ?? 1;

    if (totalPages > 1) {
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => getProducts(i + 2, 100))
      );
      for (const res of rest) {
        products.push(...(res.data.products || []));
      }
    }

    return products;
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [allProducts, suppliersRes, restocksRes, categoriesRes] = await Promise.all([
          loadAllProducts(),
          getSuppliers(1, 100),
          getRestocks(1, 100),
          getCategories(1, 100)
        ]);

        setProducts(allProducts);
        setSuppliers(suppliersRes.data.suppliers || []);
        setRestocks(restocksRes.data.restocks || []);
        setCategories(categoriesRes.data.categories || []);
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // close the product dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        productBoxRef.current &&
        !productBoxRef.current.contains(e.target as Node)
      ) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groupedProductsForSelection = useMemo(() => {
    const groups = new Map<string, any[]>();
    const seen = new Set<string>();

    const addProduct = (product: any, label: string) => {
      if (!product?.id || seen.has(product.id)) return;
      seen.add(product.id);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(product);
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const sortedRestocks = [...restocks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const restock of sortedRestocks) {
      const product = restock.product || products.find((p) => p.id === restock.productId);
      if (!product) continue;

      const createdAt = restock.createdAt ? new Date(restock.createdAt) : null;
      let label = "Earlier";
      if (createdAt && createdAt >= todayStart) label = "Today";
      else if (createdAt && createdAt >= yesterdayStart) label = "Yesterday";

      addProduct(product, label);
    }

    const unlistedProducts = products.filter((product) => !seen.has(product.id));
    if (unlistedProducts.length > 0) {
      addProduct(unlistedProducts[0], "Other products");
      unlistedProducts.slice(1).forEach((product) => addProduct(product, "Other products"));
    }

    return Array.from(groups.entries()).filter(([, items]) => items.length > 0);
  }, [products, restocks]);

  const filteredProductGroups = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return groupedProductsForSelection;

    return groupedProductsForSelection
      .map(([label, items]) => [label, items.filter((p) => p.name?.toLowerCase().includes(q))])
      .filter(([, items]) => items.length > 0) as Array<[string, any[]]>;
  }, [groupedProductsForSelection, productQuery]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === formData.productId) || null,
    [products, formData.productId]
  );

  function selectProduct(p: any) {
    if (!p) return;
    setFormData((prev) => ({ ...prev, productId: p.id }));
    setProductQuery(p.name);
  }

  function clearProductSelection() {
    setFormData((prev) => ({ ...prev, productId: "" }));
    setProductQuery("");
  }

  async function handleCreateProduct() {
    if (!newProduct.name.trim()) {
      setNewProductError("Product name is required");
      return;
    }
    try {
      setCreatingProduct(true);
      setNewProductError(null);

      const baseUnit = newProduct.baseUnit.trim() || "pcs";
      const sellingPrice = newProduct.sellingPrice ? Number(newProduct.sellingPrice) : 0;

      const payload: CreateProductInput = {
        productCode: newProduct.productCode.trim() || generateProductCode(newProduct.name),
        name: newProduct.name.trim(),
        buyingPrice: newProduct.buyingPrice ? Number(newProduct.buyingPrice) : 0,
        quantity: newProduct.quantity ? Number(newProduct.quantity) : 0,
        reorderLevel: newProduct.reorderLevel ? Number(newProduct.reorderLevel) : 0,
        baseUnit,
        categoryId: newProduct.categoryId || undefined,
        sellingUnits: [
          {
            unit: baseUnit,
            conversionToBase: 1,
            sellingPrice
          }
        ]
      };

      const res = await createProduct(payload);
      const created = res.data;

      // add the new product to the local list so it shows up immediately
      setProducts((prev) => [created, ...prev]);
      selectProduct(created);

      setShowNewProductForm(false);
      setNewProduct({
        productCode: "",
        name: "",
        buyingPrice: "",
        quantity: "",
        reorderLevel: "",
        baseUnit: "pcs",
        sellingPrice: "",
        categoryId: ""
      });
    } catch (err: any) {
      setNewProductError(err.message || "Failed to create product");
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const restockData = {
        productId: formData.productId,
        supplierId: formData.supplierId,
        quantityAdded: Number(formData.quantityAdded),
        cost: Number(formData.cost),
        notes: formData.notes
      };

      await createRestock(restockData);

      const restocksRes = await getRestocks(1, 100);
      setRestocks(restocksRes.data.restocks || []);

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);

      setFormData({ productId: "", supplierId: "", quantityAdded: "", cost: "", notes: "" });
      setProductQuery("");
    } catch (err: any) {
      setError(err.message || "Failed to create restock");
    } finally {
      setSubmitting(false);
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Restocks</h2>
        <p className="text-muted-foreground">
          Record inventory restocks and track supply history
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PackagePlus className="h-4 w-4" />
              New Restock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label>Product</Label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 pr-8"
                    placeholder="Filter products"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                  />
                  {(productQuery || formData.productId) && (
                    <button
                      type="button"
                      onClick={clearProductSelection}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Select
                  value={formData.productId || undefined}
                  onValueChange={(value) => {
                    const selected = products.find((p) => p.id === value);
                    if (selected) selectProduct(selected);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProductGroups.length > 0 ? (
                      filteredProductGroups.map(([label, items]) => (
                        <SelectGroup key={label}>
                          <SelectLabel>{label}</SelectLabel>
                          {items.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No products match &quot;{productQuery}&quot;
                      </div>
                    )}
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => {
                    setNewProduct((prev) => ({ ...prev, name: productQuery }));
                    setShowNewProductForm(true);
                  }}
                  className="flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-primary hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                  Add new product{productQuery ? ` "${productQuery}"` : ""}
                </button>

                {selectedProduct && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedProduct.name}
                  </p>
                )}
              </div>

              {showNewProductForm && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">New product</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewProductForm(false);
                        setNewProductError(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {newProductError && (
                    <p className="text-xs text-destructive">{newProductError}</p>
                  )}

                  <div className="grid gap-2">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                      placeholder="Product name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Product code</Label>
                    <Input
                      value={newProduct.productCode}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, productCode: e.target.value })
                      }
                      placeholder={
                        newProduct.name
                          ? generateProductCode(newProduct.name)
                          : "Auto-generated if left blank"
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label className="text-xs">Buying price</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newProduct.buyingPrice}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, buyingPrice: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Selling price</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newProduct.sellingPrice}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, sellingPrice: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label className="text-xs">Starting quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newProduct.quantity}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, quantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Reorder level</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newProduct.reorderLevel}
                        onChange={(e) =>
                          setNewProduct({ ...newProduct, reorderLevel: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Base / selling unit</Label>
                    <Input
                      value={newProduct.baseUnit}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, baseUnit: e.target.value })
                      }
                      placeholder="e.g. pcs, kg, roll"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={newProduct.categoryId}
                      onValueChange={(v) =>
                        setNewProduct({ ...newProduct, categoryId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={creatingProduct}
                    onClick={handleCreateProduct}
                  >
                    {creatingProduct ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create &amp; select product
                  </Button>
                </div>
              )}

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
              <div className="grid gap-2">
                <Label>Quantity Added</Label>
                <Input 
                  type="number" 
                  placeholder="Enter quantity" 
                  min={1}
                  value={formData.quantityAdded}
                  onChange={(e) => setFormData({...formData, quantityAdded: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Cost (KES)</Label>
                <Input 
                  type="number" 
                  placeholder="Total cost" 
                  min={0}
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input 
                  placeholder="Optional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !formData.productId}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Record Restock
              </Button>
              {submitted && (
                <p className="text-sm text-success text-center">
                  Restock recorded successfully!
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Restock History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {rowActionError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
                  {rowActionError}
                </div>
              )}

              {restocksByDate.length === 0 ? (
                <p className="text-sm text-muted-foreground">No restocks recorded yet.</p>
              ) : (
                restocksByDate.map(([dateKey, dayRestocks]) => (
                  <div key={dateKey} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {new Date(dateKey).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>By</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayRestocks.map((restock) =>
                          editingRestockId === restock.id ? (
                            <TableRow key={restock.id}>
                              <TableCell className="font-medium">
                                {restock.product?.name || restock.productName}
                              </TableCell>
                              <TableCell>
                                {restock.supplier?.supplierName || restock.supplierName}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1}
                                  className="h-8 w-20"
                                  value={editForm.quantityAdded}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, quantityAdded: e.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-8 w-24"
                                  value={editForm.cost}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, cost: e.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell>{restock.receivedBy?.fullName ?? "—"}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2"
                                    disabled={savingEdit}
                                    onClick={() => saveEditRestock(restock.id)}
                                  >
                                    {savingEdit ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      "Save"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2"
                                    onClick={cancelEditRestock}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow key={restock.id}>
                              <TableCell className="font-medium">
                                {restock.product?.name || restock.productName}
                              </TableCell>
                              <TableCell>
                                {restock.supplier?.supplierName || restock.supplierName}
                              </TableCell>
                              <TableCell>+{restock.quantityAdded}</TableCell>
                              <TableCell>{formatCurrency(toNumber(restock.cost))}</TableCell>
                              <TableCell>{restock.receivedBy?.fullName ?? "—"}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      disabled={deletingId === restock.id}
                                    >
                                      {deletingId === restock.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <MoreVertical className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => startEditRestock(restock)}>
                                      <Pencil className="mr-2 h-3.5 w-3.5" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteRestock(restock.id)}
                                    >
                                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
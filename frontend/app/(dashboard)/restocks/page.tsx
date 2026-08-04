"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { PackagePlus, Loader2, Search, Plus, X } from "lucide-react";
import {
  getProducts,
  getSuppliers,
  getRestocks,
  createRestock,
  createProduct,
  type CreateProductInput
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export default function RestocksPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
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

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productsRes, suppliersRes, restocksRes] = await Promise.all([
          getProducts(1, 100),
          getSuppliers(1, 100),
          getRestocks(1, 100)
        ]);

        setProducts(productsRes.data.products || []);
        setSuppliers(suppliersRes.data.suppliers || []);
        setRestocks(restocksRes.data.restocks || []);
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

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name?.toLowerCase().includes(q));
  }, [products, productQuery]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === formData.productId) || null,
    [products, formData.productId]
  );

  function selectProduct(p: any) {
    setFormData({ ...formData, productId: p.id });
    setProductQuery(p.name);
    setProductDropdownOpen(false);
  }

  function clearProductSelection() {
    setFormData({ ...formData, productId: "" });
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
        sellingPrice: ""
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

                <div className="relative" ref={productBoxRef}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-8 pr-8"
                      placeholder="Search product..."
                      value={productQuery}
                      onFocus={() => setProductDropdownOpen(true)}
                      onChange={(e) => {
                        setProductQuery(e.target.value);
                        setProductDropdownOpen(true);
                        // typing invalidates any previous exact selection
                        if (formData.productId) {
                          setFormData({ ...formData, productId: "" });
                        }
                      }}
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

                  {productDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
                      <div className="max-h-60 overflow-y-auto py-1">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => selectProduct(p)}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${
                                p.id === formData.productId ? "bg-accent" : ""
                              }`}
                            >
                              <span>{p.name}</span>
                              {typeof p.quantity === "number" && (
                                <span className="text-xs text-muted-foreground">
                                  {p.quantity} in stock
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-muted-foreground">
                            No products match &quot;{productQuery}&quot;
                          </p>
                        )}
                      </div>
                      <div className="border-t p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNewProduct((prev) => ({ ...prev, name: productQuery }));
                            setShowNewProductForm(true);
                            setProductDropdownOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-primary hover:bg-accent"
                        >
                          <Plus className="h-4 w-4" />
                          Add new product{productQuery ? ` "${productQuery}"` : ""}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restocks.map((restock) => (
                    <TableRow key={restock.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(restock.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{restock.product?.name || restock.productName}</TableCell>
                      <TableCell>{restock.supplier?.supplierName || restock.supplierName}</TableCell>
                      <TableCell>+{restock.quantityAdded}</TableCell>
                      <TableCell>{formatCurrency(toNumber(restock.cost))}</TableCell>
                      <TableCell>{restock.receivedBy?.fullName ?? restock.createdBy ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
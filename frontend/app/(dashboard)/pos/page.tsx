"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Minus,
  Plus,
  Trash2,
  Printer,
  Download,
  CheckCircle,
  Banknote,
  Smartphone,
  Building2,
  CreditCard,
  Loader2,
} from "lucide-react";
import { getProducts, createOrder, downloadReceipt, getSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, toNumber } from "@/lib/utils";

interface ApiProductUnit {
  id: string;
  unit: string;               // e.g. "bag", "kg", "pcs"
  conversionToBase: string | number; // how many baseUnit one of this equals
  sellingPrice: string | number;     // price per ONE of this unit
}

interface ApiProduct {
  id: string;
  productCode: string;
  name: string;
  quantity: string | number; // in baseUnit
  baseUnit: string;
  sellingUnits: ApiProductUnit[];
  buyingPrice: string | number;
  imageUrl?: string | null;
  category?: { id: string; name: string } | null;
}

interface CartItem {
  product: ApiProduct;
  unit: ApiProductUnit; // which selling unit this cart line is in
  quantity: number;     // count of `unit`, not of baseUnit
}

type PaymentMethod = "CASH" | "MPESA" | "BANK_TRANSFER" | "CREDIT";

const paymentMethods: { method: PaymentMethod; icon: React.ElementType; label: string }[] = [
  { method: "CASH", icon: Banknote, label: "Cash" },
  { method: "MPESA", icon: Smartphone, label: "M-Pesa" },
  { method: "BANK_TRANSFER", icon: Building2, label: "Bank" },
  { method: "CREDIT", icon: CreditCard, label: "Credit" },
];

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="#e5e7eb">' +
      '<rect width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#9ca3af">No Image</text></svg>'
  );

function normalizeImageUrl(raw: string | null | undefined): string {
  if (!raw) return PLACEHOLDER_IMAGE;
  const url = raw.trim();
  if (!url) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return url;
  return `/products/${url}`;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

async function fetchAllProducts(): Promise<ApiProduct[]> {
  const all: ApiProduct[] = [];
  let page = 1;
  const limit = 100;
  while (true) {
    const res = await getProducts(page, limit);
    const items = (res.data?.products ?? []) as ApiProduct[];
    all.push(...items);
    const pagination = res.data?.pagination;
    if (!pagination || page >= pagination.totalPages) break;
    page++;
  }
  return all;
}

export default function POSPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState(0);
  const [saleComplete, setSaleComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [taxRate, setTaxRate] = useState(16);
  const [error, setError] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  // Order date — defaults to today, but the cashier can back-date an order
  // (e.g. entering a paper sale from earlier in the week). Stored as the
  // yyyy-mm-dd string an <input type="date"> works with natively.
  const [orderDate, setOrderDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productsData, settingsRes] = await Promise.all([
          fetchAllProducts(),
          getSettings()
        ]);

        setProducts(productsData);

        const uniqueCategories = Array.from(
          new Set(
            productsData
              .map((p) => p.category?.name)
              .filter((n): n is string => Boolean(n))
          )
        );
        setCategories(uniqueCategories);

        if (settingsRes.data?.taxRate !== undefined && settingsRes.data?.taxRate !== null) {
          setTaxRate(toNumber(settingsRes.data.taxRate));
        }
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q);
      const categoryName = p.category?.name;
      const matchesCategory =
        activeCategory === "All" || categoryName === activeCategory;
      return matchesSearch && matchesCategory && toNumber(p.quantity) > 0;
    });
  }, [debouncedSearch, activeCategory, products]);

  const subtotal = cart.reduce(
    (sum, item) => sum + toNumber(item.unit.sellingPrice) * item.quantity,
    0
  );
  const grandTotal = subtotal - discount; // tax included

  // Total baseUnit stock already committed to the cart for a product,
  // across all its selling units (e.g. some cement already added as bags
  // AND some as loose kg in the same sale).
  function baseUnitsInCart(productId: string, excludingUnitId?: string): number {
    return cart
      .filter((item) => item.product.id === productId && item.unit.id !== excludingUnitId)
      .reduce((sum, item) => sum + item.quantity * toNumber(item.unit.conversionToBase), 0);
  }

  function addToCart(product: ApiProduct, unit: ApiProductUnit) {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.unit.id === unit.id
      );
      const alreadyCommittedBase = baseUnitsInCart(product.id, unit.id) +
        (existing ? existing.quantity * toNumber(unit.conversionToBase) : 0);
      const wouldBeBase = alreadyCommittedBase + toNumber(unit.conversionToBase);
      if (wouldBeBase > toNumber(product.quantity)) return prev; // not enough stock left

      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.unit.id === unit.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, unit, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, unitId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId || item.unit.id !== unitId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          const otherUnitsBase = baseUnitsInCart(productId, unitId);
          const wouldBeBase = otherUnitsBase + newQty * toNumber(item.unit.conversionToBase);
          if (wouldBeBase > toNumber(item.product.quantity)) return item; // not enough stock
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  }

  // For typing an exact amount directly (e.g. "13" kg) instead of clicking
  // +/- repeatedly. newQty is the absolute count of `unit`, not a delta.
  // Clamps to available stock rather than rejecting outright, since a
  // cashier retyping a number mid-edit will pass through invalid
  // intermediate values (e.g. typing "13" briefly shows "1").
  function setQuantity(productId: string, unitId: string, newQty: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId || item.unit.id !== unitId) return item;
          if (!Number.isFinite(newQty) || newQty <= 0) return null;
          const otherUnitsBase = baseUnitsInCart(productId, unitId);
          const maxQtyForThisUnit =
            (toNumber(item.product.quantity) - otherUnitsBase) / toNumber(item.unit.conversionToBase);
          const clamped = Math.min(newQty, Math.max(maxQtyForThisUnit, 0));
          return clamped <= 0 ? null : { ...item, quantity: clamped };
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function removeFromCart(productId: string, unitId: string) {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.unit.id === unitId)));
  }

  async function completeSale() {
    if (cart.length === 0) return;

    try {
      setSubmitting(true);
      setError(null);

      const orderData = {
        items: cart.map((item) => ({
          productId: item.product.id,
          productUnitId: item.unit.id,
          quantity: item.quantity, // count of item.unit, e.g. "3 bags"
          unitPrice: toNumber(item.unit.sellingPrice),
        })),
        paymentMethod,
        discount,
        customerName: "Walk-in Customer",
        // Cashier-entered order date (not "now") — sent as an ISO string
        // so the backend can store it as this order's createdAt.
        orderDate: new Date(`${orderDate}T00:00:00`).toISOString()
      };

      const result = await createOrder(orderData);
      setCompletedOrderId(result.data.id);

      setSaleComplete(true);
      setProducts((prev) =>
        prev.map((p) => {
          const soldBase = baseUnitsInCart(p.id);
          return soldBase > 0 ? { ...p, quantity: toNumber(p.quantity) - soldBase } : p;
        })
      );

      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      setTimeout(() => {
        setCart([]);
        setDiscount(0);
        setSaleComplete(false);
        setCompletedOrderId(null);
        const d = new Date();
        setOrderDate(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        );
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Failed to complete sale");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePrintReceipt() {
    if (!completedOrderId) {
      setError("Complete a sale first to print receipt");
      return;
    }
    try {
      const blob = await downloadReceipt(completedOrderId);
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(url);
        };
      }
    } catch (err: any) {
      setError(err.message || "Failed to print receipt");
    }
  }

  async function handleDownloadPdf() {
    if (!completedOrderId) {
      setError("Complete a sale first to download PDF");
      return;
    }
    try {
      const blob = await downloadReceipt(completedOrderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${completedOrderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
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
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">Process sales and manage transactions</p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Product list – left 3 columns */}
        <div className="space-y-4 lg:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger value="All" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                All
              </TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No products found</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const units = product.sellingUnits ?? [];
                const singleUnit = units.length === 1 ? units[0] : null;
                return (
                  <motion.div
                    key={product.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`overflow-hidden transition-shadow hover:shadow-md ${singleUnit ? "cursor-pointer" : ""}`}
                      onClick={singleUnit ? () => addToCart(product, singleUnit) : undefined}
                    >
                      <div className="relative h-32 w-full bg-muted">
                        <img
                          src={normalizeImageUrl(product.imageUrl)}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <CardContent className="p-3">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        {singleUnit ? (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm font-bold text-primary">
                              {formatCurrency(singleUnit.sellingPrice)} / {singleUnit.unit}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {toNumber(product.quantity)} {product.baseUnit} left
                            </Badge>
                          </div>
                        ) : (
                          <div className="mt-1 space-y-1">
                            <Badge variant="secondary" className="text-xs">
                              {toNumber(product.quantity)} {product.baseUnit} left
                            </Badge>
                            <div className="flex flex-wrap gap-1">
                              {units.map((u) => (
                                <Button
                                  key={u.id}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(product, u);
                                  }}
                                >
                                  {u.unit} · {formatCurrency(u.sellingPrice)}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart – right 2 columns – increased height */}
        <div className="lg:col-span-2">
          <Card className="sticky top-16 flex h-[calc(100vh-5rem)] flex-col overflow-hidden">
            <CardHeader className="py-2 px-4 shrink-0">
              <CardTitle className="text-base">Current Cart</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col overflow-hidden p-4 pt-0">
              {/* Sale success notification */}
              <AnimatePresence>
                {saleComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-lg bg-success/10 p-2 text-success shrink-0 mb-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Sale completed!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cart items – scrollable, takes all remaining space */}
              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Cart is empty. Click a product to add.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {cart.map((item) => (
                    <div
                      key={`${item.product.id}:${item.unit.id}`}
                      className="flex items-center gap-2 rounded-lg border p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unit.sellingPrice)} / {item.unit.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.product.id, item.unit.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setQuantity(item.product.id, item.unit.id, Number(e.target.value))}
                          className="h-6 w-14 text-center text-sm px-1"
                          min={0}
                          step={item.unit.unit === "pcs" ? 1 : 0.1}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.product.id, item.unit.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeFromCart(item.product.id, item.unit.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {formatCurrency(toNumber(item.unit.sellingPrice) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-2 shrink-0" />

              {/* Totals and payment – compact, at bottom */}
              <div className="shrink-0 space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="h-6 w-20 text-right text-sm"
                      min={0}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({taxRate}% included)</span>
                    <span>{formatCurrency(0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Grand Total</span>
                    <span className="text-primary">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium">Order Date</p>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    max={(() => {
                      const d = new Date();
                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    })()}
                    className="h-8 text-sm"
                  />
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium">Payment Method</p>
                  <div className="grid grid-cols-2 gap-1">
                    {paymentMethods.map(({ method, icon: Icon, label }) => (
                      <Button
                        key={method}
                        variant={paymentMethod === method ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaymentMethod(method)}
                        className="justify-start gap-1 text-xs h-7"
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-1">
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={completeSale}
                    disabled={cart.length === 0 || submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Complete Sale
                  </Button>
                  <div className="grid grid-cols-2 gap-1">
                    <Button variant="outline" size="sm" disabled={!completedOrderId} onClick={handlePrintReceipt}>
                      <Printer className="mr-1 h-3 w-3" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" disabled={!completedOrderId} onClick={handleDownloadPdf}>
                      <Download className="mr-1 h-3 w-3" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
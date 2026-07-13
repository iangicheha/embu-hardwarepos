"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { cn } from "@/lib/utils";

// Backend Product shape — no `image`/`stock`/`status` fields, prices are Decimal
// strings. `quantity` is the real stock count.
interface ApiProduct {
  id: string;
  productCode: string;
  name: string;
  quantity: number;
  sellingPrice: string | number;
  buyingPrice: string | number;
  category?: { id: string; name: string } | null;
}

interface CartItem {
  product: ApiProduct;
  quantity: number;
}

// Backend enum values for PaymentMethod (must match Prisma + Zod schema)
type PaymentMethod = "CASH" | "MPESA" | "BANK_TRANSFER" | "CREDIT";

const paymentMethods: { method: PaymentMethod; icon: React.ElementType; label: string }[] = [
  { method: "CASH", icon: Banknote, label: "Cash" },
  { method: "MPESA", icon: Smartphone, label: "M-Pesa" },
  { method: "BANK_TRANSFER", icon: Building2, label: "Bank" },
  { method: "CREDIT", icon: CreditCard, label: "Credit" },
];

// Neutral placeholder image (data URI) — avoids Next.js `src=undefined` warnings
// and removes the dependency on a hard-coded Unsplash URL.
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="#e5e7eb">' +
      '<rect width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#9ca3af">No Image</text></svg>'
  );

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
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

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productsRes, settingsRes] = await Promise.all([
          getProducts(1, 100),
          getSettings()
        ]);

        const productsData = (productsRes.data?.products ?? []) as ApiProduct[];
        setProducts(productsData);

        const uniqueCategories = Array.from(
          new Set(
            productsData
              .map((p) => p.category?.name)
              .filter((n): n is string => Boolean(n))
          )
        );
        setCategories(uniqueCategories);

        // Settings.taxRate is a Decimal string
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
      return matchesSearch && matchesCategory && p.quantity > 0;
    });
  }, [debouncedSearch, activeCategory, products]);

  const subtotal = cart.reduce(
    (sum, item) => sum + toNumber(item.product.sellingPrice) * item.quantity,
    0
  );
  const tax = (subtotal - discount) * (taxRate / 100);
  const grandTotal = subtotal - discount + tax;

  function addToCart(product: ApiProduct) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev; // don't oversell
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.quantity) return item; // cap at real stock
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  async function completeSale() {
    if (cart.length === 0) return;

    try {
      setSubmitting(true);
      setError(null);

      const orderData = {
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        paymentMethod,
        discount,
        customerName: "Walk-in Customer"
      };

      await createOrder(orderData);

      setSaleComplete(true);
      // Optimistically decrement local stock so the UI reflects reality
      setProducts((prev) =>
        prev.map((p) => {
          const cartItem = cart.find((c) => c.product.id === p.id);
          return cartItem ? { ...p, quantity: p.quantity - cartItem.quantity } : p;
        })
      );
      setTimeout(() => {
        setCart([]);
        setDiscount(0);
        setSaleComplete(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to complete sale");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrintReceipt() {
    if (cart.length === 0) return;
    setError("Complete a sale first to print receipt");
  }

  function handleDownloadPdf() {
    if (cart.length === 0) return;
    setError("Complete a sale first to download PDF");
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

          <Tabs
            value={activeCategory}
            onValueChange={setActiveCategory}
          >
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
            <div className="text-center py-8 text-muted-foreground">
              No products found
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                    onClick={() => addToCart(product)}
                  >
                    <div className="relative h-32 w-full bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={PLACEHOLDER_IMAGE}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="p-3">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(product.sellingPrice)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {product.quantity} in stock
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Cart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {saleComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-success"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Sale completed successfully!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Cart is empty. Click a product to add.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2 rounded-lg border p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.product.sellingPrice)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-danger"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-medium w-20 text-right">
                        {formatCurrency(toNumber(item.product.sellingPrice) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-2 text-sm">
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
                    className="h-7 w-24 text-right"
                    min={0}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({taxRate}%)
                  </span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map(({ method, icon: Icon, label }) => (
                    <Button
                      key={method}
                      variant={paymentMethod === method ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentMethod(method)}
                      className="justify-start gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={completeSale}
                  disabled={cart.length === 0 || submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Complete Sale
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" disabled={cart.length === 0} onClick={handlePrintReceipt}>
                    <Printer className="mr-1 h-4 w-4" />
                    Print Receipt
                  </Button>
                  <Button variant="outline" size="sm" disabled={cart.length === 0} onClick={handleDownloadPdf}>
                    <Download className="mr-1 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { PackagePlus, Loader2 } from "lucide-react";
import { getProducts, getSuppliers, getRestocks, createRestock } from "@/lib/api";
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
                <Select value={formData.productId} onValueChange={(v) => setFormData({...formData, productId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button type="submit" className="w-full" disabled={submitting}>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, Package } from "lucide-react";
import { getSupplier, getProducts, getRestocks } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch supplier, their products, and the restock history in parallel.
  // The supplier endpoint doesn't include products, so we filter the
  // full product list by `supplierId`.
  const [supplierRes, productsRes, restocksRes] = await Promise.all([
    getSupplier(id).catch(() => null),
    getProducts(1, 100).catch(() => ({ data: { products: [] } })),
    getRestocks(1, 100).catch(() => ({ data: { restocks: [] } }))
  ]);

  const supplier = supplierRes?.data;
  if (!supplier) notFound();

  const allProducts = productsRes.data?.products ?? [];
  const supplierProducts = allProducts.filter((p: any) => p.supplierId === id);

  const allRestocks = restocksRes.data?.restocks ?? [];
  const purchaseHistory = allRestocks.filter((r: any) => r.supplierId === id);

  const totalPurchases = purchaseHistory.reduce(
    (sum: number, r: any) => sum + toNumber(r.cost),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{supplier.supplierName}</h2>
          <p className="text-muted-foreground">Supplier details and purchase history</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium">{supplier.contactPerson ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{supplier.phone ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{supplier.email ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{supplier.address ?? "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{supplierProducts.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-xl font-bold">
                  {formatCurrency(totalPurchases)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products Supplied
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplierProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No products linked to this supplier yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierProducts.map((product: any) => {
                    const q = toNumber(product.quantity);
                    const r = toNumber(product.reorderLevel);
                    const status = q <= 0 ? "Out of Stock" : q <= r ? "Low Stock" : "In Stock";
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.productCode}</TableCell>
                        <TableCell>{product.category?.name ?? "Uncategorized"}</TableCell>
                        <TableCell className="text-right">{q}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              status === "In Stock" ? "success" : status === "Low Stock" ? "warning" : "danger"
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No purchase history for this supplier yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseHistory.map((restock: any) => (
                  <TableRow key={restock.id}>
                    <TableCell>{formatDate(restock.createdAt)}</TableCell>
                    <TableCell className="font-medium">{restock.product?.name ?? "—"}</TableCell>
                    <TableCell>+{restock.quantityAdded}</TableCell>
                    <TableCell>{formatCurrency(restock.cost)}</TableCell>
                    <TableCell className="text-muted-foreground">{restock.notes ?? "—"}</TableCell>
                    <TableCell>{restock.receivedBy?.fullName ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

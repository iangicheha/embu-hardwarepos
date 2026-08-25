"use client";

import { useEffect, useState } from "react";
import { Plus, Search, FileSpreadsheet, FileText, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, getSuppliers, uploadImage } from "@/lib/api";
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

// A blank row for the "selling units" list in the product form — free text,
// since new products may be sold by units we haven't seen yet (bag, kg,
// litre, roll, metre, pcs, ...). Nothing here is hardcoded to a fixed list.
function emptySellingUnit() {
  return { unit: "", conversionToBase: "1", sellingPrice: "" };
}

// Backend Prisma `Product` has no `image`/`stock`/`status`/`code`/`supplierName`
// fields — those are derived or renamed in the UI. This shape mirrors what
// `getProducts` actually returns from the inventory module.
interface ApiProductUnit {
  id?: string;
  unit: string;             // e.g. "bag", "kg", "pcs" — free text, not hardcoded
  conversionToBase: string | number; // how many baseUnit this equals
  sellingPrice: string | number;
}

interface ApiProduct {
  id: string;
  productCode: string;
  name: string;
  description: string | null;
  buyingPrice: string | number;   // Prisma Decimal serialises as a string
  quantity: string | number;      // in baseUnit
  baseUnit: string;                // what `quantity`/`reorderLevel` are counted in
  reorderLevel: string | number;
  sellingUnits: ApiProductUnit[]; // the ways this product can be sold
  imageUrl?: string | null;
  category?: { id: string; name: string } | null;
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

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
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
    imageUrl: "",
    categoryId: "",
    supplierId: "",
    buyingPrice: "",
    quantity: "",
    baseUnit: "pcs",
    reorderLevel: "",
    sellingUnits: [emptySellingUnit()]
  });

  const EMPTY_FORM = {
    name: "",
    productCode: "",
    description: "",
    imageUrl: "",
    categoryId: "",
    supplierId: "",
    buyingPrice: "",
    quantity: "",
    baseUnit: "pcs",
    reorderLevel: "",
    sellingUnits: [emptySellingUnit()]
  };

  function addSellingUnitRow() {
    setFormData((f) => ({ ...f, sellingUnits: [...f.sellingUnits, emptySellingUnit()] }));
  }
  function removeSellingUnitRow(index: number) {
    setFormData((f) => ({ ...f, sellingUnits: f.sellingUnits.filter((_, i) => i !== index) }));
  }
  function updateSellingUnitRow(index: number, field: "unit" | "conversionToBase" | "sellingPrice", value: string) {
    setFormData((f) => ({
      ...f,
      sellingUnits: f.sellingUnits.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  }

  // First configured selling unit's price — used for the products table and
  // exports where we just need "a" price to show, not the full unit list.
  function primaryPrice(p: ApiProduct): number {
    return p.sellingUnits?.length ? toNumber(p.sellingUnits[0].sellingPrice) : 0;
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productsData, categoriesRes, suppliersRes] = await Promise.all([
          fetchAllProducts(),
          getCategories(1, 100),
          getSuppliers(1, 100)
        ]);

        setProducts(productsData);
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
        imageUrl: formData.imageUrl || undefined,
        categoryId: formData.categoryId || undefined,
        supplierId: formData.supplierId || undefined,
        buyingPrice: Number(formData.buyingPrice),
        quantity: Number(formData.quantity),
        baseUnit: formData.baseUnit,
        reorderLevel: Number(formData.reorderLevel),
        sellingUnits: formData.sellingUnits
          .filter((u) => u.unit.trim() && u.sellingPrice !== "")
          .map((u) => ({
            unit: u.unit.trim(),
            conversionToBase: Number(u.conversionToBase) || 1,
            sellingPrice: Number(u.sellingPrice),
          })),
      };

      await createProduct(productData);
      setProducts(await fetchAllProducts());

      setDialogOpen(false);
      setFormData(EMPTY_FORM);
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditDialog(product: ApiProduct) {
    setEditTarget(product);
    setFormData({
      name: product.name,
      productCode: product.productCode,
      description: product.description ?? "",
      imageUrl: product.imageUrl ?? "",
      categoryId: product.category?.id ?? "",
      supplierId: product.supplier?.id ?? "",
      buyingPrice: String(toNumber(product.buyingPrice)),
      quantity: String(toNumber(product.quantity)),
      baseUnit: product.baseUnit || "pcs",
      reorderLevel: String(toNumber(product.reorderLevel)),
      sellingUnits: product.sellingUnits?.length
        ? product.sellingUnits.map((u) => ({
            unit: u.unit,
            conversionToBase: String(toNumber(u.conversionToBase)),
            sellingPrice: String(toNumber(u.sellingPrice)),
          }))
        : [emptySellingUnit()],
    });
  }

  function closeEditDialog() {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
  }

  async function handleUpdateProduct() {
    if (!editTarget) return;
    try {
      setSubmitting(true);
      setError(null);

      const productData = {
        name: formData.name,
        productCode: formData.productCode,
        description: formData.description,
        imageUrl: formData.imageUrl || undefined,
        categoryId: formData.categoryId || undefined,
        supplierId: formData.supplierId || undefined,
        buyingPrice: Number(formData.buyingPrice),
        quantity: Number(formData.quantity),
        baseUnit: formData.baseUnit,
        reorderLevel: Number(formData.reorderLevel),
        sellingUnits: formData.sellingUnits
          .filter((u) => u.unit.trim() && u.sellingPrice !== "")
          .map((u) => ({
            unit: u.unit.trim(),
            conversionToBase: Number(u.conversionToBase) || 1,
            sellingPrice: Number(u.sellingPrice),
          })),
      };

      await updateProduct(editTarget.id, productData);
      setProducts(await fetchAllProducts());
      closeEditDialog();
    } catch (err: any) {
      setError(err.message || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  }

  // FIXED: Improved error handling for delete
  async function handleDeleteProduct() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError(null);
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      // Use the server's message if available, otherwise a generic fallback
      const message = err.message || "Failed to delete product";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleExportExcel() {
    try {
      setExporting("excel");
      setError(null);
      const ExcelJS = (await import("exceljs")).default;
      const { getSettings, getOrders, getRestocks } = await import("@/lib/api");

      const [settingsRes, ordersRes, restocksRes] = await Promise.all([
        getSettings().catch(() => null),
        // All-time — this page has no date-range picker, so "Sold"/"Added"
        // here mean lifetime totals, not a period. A high limit stands in
        // for a dedicated aggregate endpoint; fine for a single hardware
        // store's order volume, but will need real pagination if this
        // catalog's order history grows into the tens of thousands.
        getOrders(1, 5000).catch(() => null),
        getRestocks(1, 5000).catch(() => null),
      ]);

      const businessName = settingsRes?.data?.businessName || "Hardware Store";
      const generatedAt = new Date();
      const allOrders = ordersRes?.data?.orders ?? [];
      const allRestocks = restocksRes?.data?.restocks ?? [];

      const workbook = new ExcelJS.Workbook();
      workbook.creator = businessName;
      workbook.created = generatedAt;

      const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const HEADER_FILL: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
      const TITLE_FONT = { bold: true, size: 16, color: { argb: "FFDC2626" } };
      const SUBTITLE_FONT = { italic: true, size: 10, color: { argb: "FF64748B" } };

      const sheet = workbook.addWorksheet("Master Stock Report");
      const columns = [
        { header: "Product", key: "name", width: 30 },
        { header: "Selling Price (VALUE)", key: "value", width: 18 },
        { header: "Buying Price (COST)", key: "cost", width: 18 },
        { header: "Added (Restocked, all-time)", key: "added", width: 20 },
        { header: "Sold (all-time)", key: "sold", width: 14 },
        { header: "Balance (Current Stock)", key: "balance", width: 18 },
        { header: "Sold Value", key: "soldValue", width: 16 },
        { header: "Sold Cost Value (COGS)", key: "soldCost", width: 18 },
        { header: "Profit/Unit", key: "profitUnit", width: 14 },
        { header: "Total Profit", key: "totalProfit", width: 16 },
        { header: "Profit Margin %", key: "margin", width: 15 },
      ];
      sheet.columns = columns;

      sheet.mergeCells(1, 1, 1, columns.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = businessName;
      titleCell.font = TITLE_FONT;

      sheet.mergeCells(2, 1, 2, columns.length);
      const subtitleCell = sheet.getCell(2, 1);
      subtitleCell.value = `Master Stock Report (all products, all-time) — Generated ${generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`;
      subtitleCell.font = SUBTITLE_FONT;
      sheet.getRow(1).height = 24;

      const headerRowNum = 4;
      sheet.getRow(headerRowNum).values = columns.map((c) => c.header);
      const headerRow = sheet.getRow(headerRowNum);
      headerRow.eachCell((cell) => {
        cell.font = HEADER_FONT;
        cell.fill = HEADER_FILL;
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      headerRow.height = 20;

      // Sold per product, all-time, in base units.
      const soldByProduct = new Map<string, number>();
      const soldValueByProduct = new Map<string, number>();
      for (const o of allOrders) {
        for (const it of o.items ?? []) {
          const pid = it.productId ?? it.product?.id;
          if (!pid) continue;
          const conv = it.productUnit?.conversionToBase != null ? toNumber(it.productUnit.conversionToBase) : 1;
          const baseQty = toNumber(it.quantity) * conv;
          soldByProduct.set(pid, (soldByProduct.get(pid) ?? 0) + baseQty);
          soldValueByProduct.set(pid, (soldValueByProduct.get(pid) ?? 0) + toNumber(it.unitPrice) * toNumber(it.quantity));
        }
      }

      // Added per product, all-time. NOTE: assumes Restock.quantityAdded is
      // already in base units — will under/overstate this for products
      // restocked by a non-base unit (e.g. cement by the bag) until restocks
      // get the same productUnitId/conversionToBase treatment orders have.
      const addedByProduct = new Map<string, number>();
      for (const r of allRestocks) {
        const pid = r.productId ?? r.product?.id;
        if (!pid) continue;
        addedByProduct.set(pid, (addedByProduct.get(pid) ?? 0) + toNumber(r.quantityAdded));
      }

      // Every product in the catalog — not filtered to ones with activity,
      // per "the master file should showcase everything, all stocks."
      let rowNum = headerRowNum + 1;
      for (const p of filtered) {
        const sold = soldByProduct.get(p.id) ?? 0;
        const added = addedByProduct.get(p.id) ?? 0;
        const value = primaryPrice(p);
        const cost = toNumber(p.buyingPrice);
        const balance = toNumber(p.quantity);
        const soldValue = soldValueByProduct.get(p.id) ?? sold * value;
        const soldCost = sold * cost;
        const profitUnit = value - cost;
        const totalProfit = profitUnit * sold;
        const margin = value > 0 ? (profitUnit / value) * 100 : 0;

        const row = sheet.getRow(rowNum);
        row.values = [p.name, value, cost, added, sold, balance, soldValue, soldCost, profitUnit, totalProfit, margin];
        row.getCell(2).numFmt = '"KES" #,##0';
        row.getCell(3).numFmt = '"KES" #,##0';
        row.getCell(7).numFmt = '"KES" #,##0';
        row.getCell(8).numFmt = '"KES" #,##0';
        row.getCell(9).numFmt = '"KES" #,##0';
        row.getCell(10).numFmt = '"KES" #,##0';
        row.getCell(11).numFmt = '0.0"%"';
        if (totalProfit < 0) row.getCell(10).font = { color: { argb: "FFDC2626" } };
        rowNum += 1;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = generatedAt.toISOString().slice(0, 10);
      a.download = `master-stock-report-${dateStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to export Excel file");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPdf() {
    try {
      setExporting("pdf");
      setError(null);
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const generatedOn = new Date().toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      // Header band
      doc.setFillColor(220, 38, 38); // matches the `danger`/brand red used elsewhere in the UI
      doc.rect(0, 0, pageWidth, 56, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("HomeDepot ERP — Product Inventory Report", 32, 32);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated ${generatedOn}  •  ${filtered.length} products`, 32, 46);

      const totalStockValue = filtered.reduce(
        (sum, p) => sum + toNumber(p.quantity) * primaryPrice(p),
        0
      );

      autoTable(doc, {
        startY: 72,
        head: [["Code", "Name", "Category", "Supplier", "Buying", "Selling", "Stock", "Status"]],
        body: filtered.map((p) => [
          p.productCode,
          p.name,
          p.category?.name ?? "Uncategorized",
          p.supplier?.supplierName ?? "—",
          formatCurrency(toNumber(p.buyingPrice)),
          formatCurrency(primaryPrice(p)),
          `${toNumber(p.quantity)} ${p.baseUnit}`,
          deriveStatus(toNumber(p.quantity), toNumber(p.reorderLevel)),
        ]),
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        columnStyles: {
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
        },
        margin: { left: 32, right: 32 },
        didParseCell: (data) => {
          // Colour the Status column like the on-screen badges.
          if (data.section === "body" && data.column.index === 7) {
            const status = String(data.cell.raw);
            if (status === "Out of Stock") data.cell.styles.textColor = [220, 38, 38];
            else if (status === "Low Stock") data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY ?? 72;
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Total stock value: ${formatCurrency(totalStockValue)}`, 32, finalY + 24);

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 80,
          doc.internal.pageSize.getHeight() - 16
        );
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`products-${dateStr}.pdf`);
    } catch (err: any) {
      setError(err.message || "Failed to export PDF file");
    } finally {
      setExporting(null);
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

    const status = deriveStatus(toNumber(p.quantity), toNumber(p.reorderLevel));
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
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting !== null}>
            {exporting === "excel" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-1 h-4 w-4" />
            )}
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting !== null}>
            {exporting === "pdf" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-1 h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <Label>Product Image</Label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  />
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          try {
                            const { url } = await uploadImage(file);
                            setFormData({...formData, imageUrl: url});
                          } catch (err) {
                            console.error("Upload failed", err);
                          }
                        };
                        input.click();
                      }}
                    >
                      Upload from computer
                    </Button>
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-2 w-[200px] h-[200px] flex items-center justify-center border rounded bg-muted/30 overflow-hidden">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
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
                    <Label>Base Unit (stock is counted in this)</Label>
                    <Input
                      placeholder="e.g. pcs, kg, litre"
                      value={formData.baseUnit}
                      onChange={(e) => setFormData({...formData, baseUnit: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Quantity in stock (in base unit)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Reorder Level (in base unit)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({...formData, reorderLevel: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Ways this is sold</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addSellingUnitRow}>
                      <Plus className="mr-1 h-3 w-3" /> Add unit
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    e.g. cement: &ldquo;bag&rdquo; = 50 {formData.baseUnit || "base units"} at 850, and &ldquo;kg&rdquo; = 1 at 25 —
                    both sell from the same stock.
                  </p>
                  {formData.sellingUnits.map((row, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1.5fr_1.5fr_auto] gap-2 items-end">
                      <div className="grid gap-1">
                        {i === 0 && <Label className="text-xs">Unit name</Label>}
                        <Input
                          placeholder="e.g. bag"
                          value={row.unit}
                          onChange={(e) => updateSellingUnitRow(i, "unit", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        {i === 0 && <Label className="text-xs">= how many base units</Label>}
                        <Input
                          type="number"
                          placeholder="1"
                          value={row.conversionToBase}
                          onChange={(e) => updateSellingUnitRow(i, "conversionToBase", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        {i === 0 && <Label className="text-xs">Price (KES)</Label>}
                        <Input
                          type="number"
                          placeholder="0"
                          value={row.sellingPrice}
                          onChange={(e) => updateSellingUnitRow(i, "sellingPrice", e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={formData.sellingUnits.length <= 1}
                        onClick={() => removeSellingUnitRow(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
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
                <TableHead className="w-14"></TableHead>
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
                const status = deriveStatus(toNumber(product.quantity), toNumber(product.reorderLevel));
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-10 h-10 flex items-center justify-center border rounded bg-muted/30 overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </TableCell>
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
                      {formatCurrency(primaryPrice(product))}
                    </TableCell>
                    <TableCell className="text-right">
                      {toNumber(product.quantity)} {product.baseUnit}
                    </TableCell>
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
                          <DropdownMenuItem onSelect={() => openEditDialog(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-danger"
                            onSelect={() => setDeleteTarget(product)}
                          >
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

      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Product Name</Label>
              <Input
                placeholder="Enter product name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Product Code</Label>
                <Input
                  placeholder="e.g. CEM-001"
                  value={formData.productCode}
                  onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Product Image</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      try {
                        const { url } = await uploadImage(file);
                        setFormData({ ...formData, imageUrl: url });
                      } catch (err) {
                        console.error("Upload failed", err);
                      }
                    };
                    input.click();
                  }}
                >
                  Upload from computer
                </Button>
              </div>
              {formData.imageUrl && (
                <div className="mt-2 w-[200px] h-[200px] flex items-center justify-center border rounded bg-muted/30 overflow-hidden">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Supplier</Label>
              <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
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
                  onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Base Unit (stock is counted in this)</Label>
                <Input
                  placeholder="e.g. pcs, kg, litre"
                  value={formData.baseUnit}
                  onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity in stock (in base unit)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Reorder Level (in base unit)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Ways this is sold</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSellingUnitRow}>
                  <Plus className="mr-1 h-3 w-3" /> Add unit
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                e.g. cement: &ldquo;bag&rdquo; = 50 {formData.baseUnit || "base units"} at 850, and &ldquo;kg&rdquo; = 1 at 25 —
                both sell from the same stock.
              </p>
              {formData.sellingUnits.map((row, i) => (
                <div key={i} className="grid grid-cols-[2fr_1.5fr_1.5fr_auto] gap-2 items-end">
                  <div className="grid gap-1">
                    {i === 0 && <Label className="text-xs">Unit name</Label>}
                    <Input
                      placeholder="e.g. bag"
                      value={row.unit}
                      onChange={(e) => updateSellingUnitRow(i, "unit", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    {i === 0 && <Label className="text-xs">= how many base units</Label>}
                    <Input
                      type="number"
                      placeholder="1"
                      value={row.conversionToBase}
                      onChange={(e) => updateSellingUnitRow(i, "conversionToBase", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    {i === 0 && <Label className="text-xs">Price (KES)</Label>}
                    <Input
                      type="number"
                      placeholder="0"
                      value={row.sellingPrice}
                      onChange={(e) => updateSellingUnitRow(i, "sellingPrice", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={formData.sellingUnits.length <= 1}
                    onClick={() => removeSellingUnitRow(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProduct} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
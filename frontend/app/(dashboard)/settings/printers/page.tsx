"use client";

import { useEffect, useState } from "react";
import { Plus, Printer as PrinterIcon, Wifi, Usb, Bluetooth, Building2, Monitor, Trash2, CheckCircle, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { getPrinters, createPrinter, updatePrinter, deletePrinter, setDefaultPrinter, testPrinter, type Printer } from "@/lib/api";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const connectionTypeIcons: Record<string, any> = {
  USB: Usb,
  NETWORK: Building2,
  WIFI: Wifi,
  BLUETOOTH: Bluetooth,
  WINDOWS: Monitor,
};

const printerTypeLabels: Record<string, string> = {
  THERMAL: "Thermal",
  INKJET: "Inkjet",
  LASER: "Laser",
};

const connectionTypeLabels: Record<string, string> = {
  USB: "USB",
  NETWORK: "Network",
  WIFI: "Wi-Fi",
  BLUETOOTH: "Bluetooth",
  WINDOWS: "Windows",
};

const paperSizeLabels: Record<string, string> = {
  "58MM": "58mm (Thermal)",
  "80MM": "80mm (Thermal)",
  A4: "A4 (Standard)",
};

export default function PrintersPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    printerType: "THERMAL" | "INKJET" | "LASER";
    connectionType: "USB" | "NETWORK" | "WIFI" | "BLUETOOTH" | "WINDOWS";
    ipAddress: string;
    port: string;
    isDefault: boolean;
    paperSize: "58MM" | "80MM" | "A4";
    autoPrint: boolean;
  }>({
    name: "",
    printerType: "THERMAL",
    connectionType: "USB",
    ipAddress: "",
    port: "",
    isDefault: false,
    paperSize: "80MM",
    autoPrint: false,
  });

  useEffect(() => {
    loadPrinters();
  }, []);

  async function loadPrinters() {
    try {
      setLoading(true);
      const res = await getPrinters(1, 50);
      setPrinters(res.data?.printers ?? []);
    } catch (err) {
      console.error("Failed to load printers:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePrinter() {
    try {
      setSubmitting(true);
      setError(null);

      await createPrinter(formData);
      setDialogOpen(false);
      resetForm();
      loadPrinters();
    } catch (err: any) {
      setError(err.message || "Failed to create printer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdatePrinter() {
    if (!editingPrinter) return;

    try {
      setSubmitting(true);
      setError(null);

      await updatePrinter(editingPrinter.id, formData);
      setDialogOpen(false);
      setEditingPrinter(null);
      resetForm();
      loadPrinters();
    } catch (err: any) {
      setError(err.message || "Failed to update printer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePrinter(id: string) {
    if (!confirm("Are you sure you want to delete this printer?")) return;

    try {
      await deletePrinter(id);
      loadPrinters();
    } catch (err: any) {
      setError(err.message || "Failed to delete printer");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await setDefaultPrinter(id);
      loadPrinters();
    } catch (err: any) {
      setError(err.message || "Failed to set default printer");
    }
  }

  async function handleTestPrinter(id: string) {
    try {
      const res = await testPrinter(id);
      alert(res.data.message);
    } catch (err: any) {
      setError(err.message || "Failed to test printer");
    }
  }

  function openEditDialog(printer: Printer) {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      printerType: printer.printerType,
      connectionType: printer.connectionType,
      ipAddress: printer.ipAddress || "",
      port: printer.port || "",
      isDefault: printer.isDefault,
      paperSize: printer.paperSize,
      autoPrint: printer.autoPrint,
    });
    setDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      name: "",
      printerType: "THERMAL",
      connectionType: "USB",
      ipAddress: "",
      port: "",
      isDefault: false,
      paperSize: "80MM",
      autoPrint: false,
    });
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
        <h2 className="text-2xl font-bold tracking-tight">Printer Settings</h2>
        <p className="text-muted-foreground">
          Configure and manage your printers for receipts and labels
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Configured Printers</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingPrinter(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Printer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingPrinter ? "Edit Printer" : "Add New Printer"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Printer Name</Label>
                    <Input
                      placeholder="e.g. Receipt Printer 1"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Printer Type</Label>
                      <Select
                        value={formData.printerType}
                        onValueChange={(value: any) => setFormData({ ...formData, printerType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="THERMAL">Thermal</SelectItem>
                          <SelectItem value="INKJET">Inkjet</SelectItem>
                          <SelectItem value="LASER">Laser</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Paper Size</Label>
                      <Select
                        value={formData.paperSize}
                        onValueChange={(value: any) => setFormData({ ...formData, paperSize: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58MM">58mm</SelectItem>
                          <SelectItem value="80MM">80mm</SelectItem>
                          <SelectItem value="A4">A4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Connection Type</Label>
                    <Select
                      value={formData.connectionType}
                      onValueChange={(value: any) => setFormData({ ...formData, connectionType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USB">USB</SelectItem>
                        <SelectItem value="NETWORK">Network</SelectItem>
                        <SelectItem value="WIFI">Wi-Fi</SelectItem>
                        <SelectItem value="BLUETOOTH">Bluetooth</SelectItem>
                        <SelectItem value="WINDOWS">Windows</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.connectionType === "NETWORK" || formData.connectionType === "WIFI") && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>IP Address</Label>
                        <Input
                          placeholder="192.168.1.100"
                          value={formData.ipAddress}
                          onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Port</Label>
                        <Input
                          placeholder="9100"
                          value={formData.port}
                          onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isDefault">Set as Default Printer</Label>
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoPrint">Auto-print Receipts</Label>
                    <Switch
                      id="autoPrint"
                      checked={formData.autoPrint}
                      onCheckedChange={(checked) => setFormData({ ...formData, autoPrint: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={editingPrinter ? handleUpdatePrinter : handleCreatePrinter} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingPrinter ? "Update Printer" : "Add Printer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {printers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No printers configured. Click &quot;Add Printer&quot; to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Paper Size</TableHead>
                  <TableHead>Auto Print</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((printer) => {
                  const Icon = connectionTypeIcons[printer.connectionType] || PrinterIcon;
                  return (
                    <TableRow key={printer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {printer.name}
                        </div>
                      </TableCell>
                      <TableCell>{printerTypeLabels[printer.printerType]}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {connectionTypeLabels[printer.connectionType]}
                          {(printer.connectionType === "NETWORK" || printer.connectionType === "WIFI") && (
                            <span className="text-xs text-muted-foreground">
                              {printer.ipAddress}:{printer.port}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{paperSizeLabels[printer.paperSize]}</TableCell>
                      <TableCell>
                        <Badge variant={printer.autoPrint ? "success" : "secondary"}>
                          {printer.autoPrint ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {printer.isDefault ? (
                          <Badge variant="success">Default</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(printer.id)}
                          >
                            Set Default
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestPrinter(printer.id)}
                          >
                            <SettingsIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(printer)}
                          >
                            <SettingsIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePrinter(printer.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
  );
}
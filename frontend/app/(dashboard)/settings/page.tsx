"use client";

import { useState, useEffect } from "react";
import { Save, Upload, Building2, Loader2 } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toNumber } from "@/lib/utils";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    businessName: "",
    logoUrl: "",
    phone: "",
    email: "",
    address: "",
    taxRate: 16,
    currency: "KES",
    receiptFooter: ""
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await getSettings();
        const data = (res.data ?? {}) as {
          businessName?: string;
          logoUrl?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          taxRate?: number | string | null;
          currency?: string | null;
          receiptFooter?: string | null;
        };
        setSettings({
          businessName: data.businessName || "",
          logoUrl: data.logoUrl || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          // taxRate is a Decimal string from Prisma — coerce to number for the input
          taxRate: toNumber(data.taxRate) || 16,
          currency: data.currency || "KES",
          receiptFooter: data.receiptFooter || ""
        });
      } catch (err) {
        setError("Failed to load settings");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
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
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure business information and system preferences
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Information
            </CardTitle>
            <CardDescription>
              Update your store details used on receipts and reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Business Name</Label>
              <Input 
                value={settings.businessName}
                onChange={(e) => setSettings({...settings, businessName: e.target.value})}
              />
            </div>

            <div className="grid gap-2">
              <Label>Logo Upload</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <Button type="button" variant="outline" size="sm">
                  <Upload className="mr-1 h-4 w-4" />
                  Upload Logo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input 
                  value={settings.phone}
                  onChange={(e) => setSettings({...settings, phone: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({...settings, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Address</Label>
              <Input 
                value={settings.address}
                onChange={(e) => setSettings({...settings, address: e.target.value})}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({...settings, taxRate: Number(e.target.value)})}
                  min={0}
                  max={100}
                />
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Select 
                  value={settings.currency}
                  onValueChange={(v) => setSettings({...settings, currency: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                    <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Receipt Footer</Label>
              <Input 
                value={settings.receiptFooter}
                onChange={(e) => setSettings({...settings, receiptFooter: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-1 h-4 w-4" />}
            Save Settings
          </Button>
          {saved && (
            <span className="text-sm text-success font-medium">
              Settings saved successfully!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

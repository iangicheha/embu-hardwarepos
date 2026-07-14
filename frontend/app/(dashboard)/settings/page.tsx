"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Save, Upload, Building2, Loader2, Image as ImageIcon, Check } from "lucide-react";
import Image from "next/image";
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

type SettingsState = {
  businessName: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  taxRate: number;
  currency: string;
  receiptFooter: string;
};

const AUTOSAVE_DEBOUNCE_MS = 600;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    businessName: "",
    logoUrl: "",
    phone: "",
    email: "",
    address: "",
    taxRate: 16,
    currency: "KES",
    receiptFooter: ""
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Refs for debounced auto-save
  const initialLoadDone = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);

  // Keep the ref pointed at the latest settings so the debounced save uses them
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Initial load
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
          taxRate: toNumber(data.taxRate) || 16,
          currency: data.currency || "KES",
          receiptFooter: data.receiptFooter || ""
        });
      } catch (err) {
        setError("Failed to load settings");
        console.error(err);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    }
    loadSettings();
  }, []);

  // Debounced auto-save: whenever settings change (after the initial load), save
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      performSave(settingsRef.current);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  async function performSave(payload: SettingsState) {
    try {
      setSaving(true);
      setError(null);
      await updateSettings(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the logo.");
      return;
    }
    // Cap logo size at 2MB to keep the request payload reasonable for auto-save
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo file is too large (max 2MB).");
      return;
    }
    setUploadingLogo(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string") {
        setSettings((prev) => ({ ...prev, logoUrl: dataUrl }));
      }
      setUploadingLogo(false);
    };
    reader.onerror = () => {
      setError("Failed to read logo file.");
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
    // Allow re-selecting the same file
    event.target.value = "";
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
          Configure business information and system preferences — changes are saved automatically
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (saveTimer.current) clearTimeout(saveTimer.current);
          performSave(settingsRef.current);
        }}
        className="max-w-2xl space-y-6"
      >
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
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                placeholder="Home Depot Store"
              />
            </div>

            <div className="grid gap-2">
              <Label>Logo / Icon</Label>
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted">
                  {settings.logoUrl ? (
                    <Image
                      src={settings.logoUrl}
                      alt="Store logo"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("logo-input")?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-4 w-4" />
                    )}
                    {settings.logoUrl ? "Replace Logo" : "Upload Logo"}
                  </Button>
                  {settings.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSettings({ ...settings, logoUrl: "" })}
                    >
                      Remove
                    </Button>
                  )}
                  <input
                    id="logo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Address</Label>
              <Input
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(v) => setSettings({ ...settings, currency: v })}
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
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving} variant="outline">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-1 h-4 w-4" />}
            Save Now
          </Button>
          <span className="text-sm flex items-center gap-1 text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            ) : saved ? (
              <>
                <Check className="h-3 w-3 text-success" />
                <span className="text-success font-medium">All changes saved</span>
              </>
            ) : (
              <>Changes are saved automatically</>
            )}
          </span>
        </div>
      </form>
    </div>
  );
}

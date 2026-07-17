"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { loginUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await loginUser(username, password);

      const { accessToken, refreshToken, user } = response.data;

      window.localStorage.setItem("accessToken", accessToken);
      window.localStorage.setItem("refreshToken", refreshToken);
      window.localStorage.setItem("user", JSON.stringify(user));

      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        {/* LEFT PANEL */}
        <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden">
          <Image
            src="/mitchell-luo-G5i9LQ7sPOw-unsplash.jpg"
            alt="Hardware Store"
            fill
            priority
            className="object-cover"
          />

          <div className="absolute inset-0 bg-black/75" />

          <div className="relative z-10 flex flex-col justify-between w-full p-12 text-white">
            <div>
              <Image
                src="/logo.png"
                alt="Tripple 5 Suppliers"
                width={220}
                height={120}
                className="mb-8"
                priority
              />

              <h1 className="text-5xl font-extrabold tracking-tight">
                TRIPPLE 5 SUPPLIERS
              </h1>

              <p className="mt-3 text-xl text-red-400 font-medium">
                Peace of Mind for Builders...
              </p>

              <div className="mt-12 max-w-xl">
                <h2 className="text-3xl font-bold mb-4">
                  HARDWARE POS SYSTEM
                </h2>

                <p className="text-lg text-slate-300 leading-relaxed">
                  Manage sales, inventory, suppliers, purchases,
                  customers and stock levels from one powerful
                  business platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-5">
                <h3 className="font-semibold text-lg">
                  Sales Management
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Fast billing and order processing.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-5">
                <h3 className="font-semibold text-lg">
                  Inventory Control
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Real-time stock tracking.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-5">
                <h3 className="font-semibold text-lg">
                  Customer Management
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Build strong customer relationships.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-5">
                <h3 className="font-semibold text-lg">
                  Reports & Analytics
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Data-driven business decisions.
                </p>
              </div>
            </div>

            <div className="flex gap-8 text-sm text-slate-300">
              <span>🔒 Secure & Reliable</span>
              <span>☁️ Cloud Backup</span>
              <span>🛠 24/7 Support</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-1 items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="rounded-3xl bg-white p-8 shadow-2xl border border-slate-200">
              {/* MOBILE LOGO */}
              <div className="lg:hidden text-center mb-8">
                <Image
                  src="/logo.png"
                  alt="Tripple 5 Suppliers"
                  width={180}
                  height={80}
                  className="mx-auto mb-4"
                />

                <h1 className="font-bold text-2xl">
                  TRIPPLE 5 SUPPLIERS
                </h1>

                <p className="text-slate-500 text-sm mt-2">
                  Hardware POS System
                </p>
              </div>

              {/* HEADER */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900">
                  Welcome Back
                </h2>

                <p className="text-slate-500 mt-2">
                  Sign in to continue to your dashboard
                </p>
              </div>

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div>
                  <Label htmlFor="username">
                    Username
                  </Label>

                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="mt-2 h-11"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="password">
                      Password
                    </Label>

                    <a
                      href="/forgot-password"
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Forgot Password?
                    </a>
                  </div>

                  <div className="relative">
                    <Input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      required
                      className="h-11 pr-10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((v) => !v)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
                >
                  {loading
                    ? "Signing In..."
                    : "Sign In"}
                </Button>

                {/* ROLE CARDS */}
                <div className="pt-4">
                  <p className="text-sm text-slate-500 mb-3 text-center">
                    System Roles
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3 text-center text-sm font-medium hover:border-red-500 hover:bg-red-50 transition cursor-pointer">
                      Admin
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 text-center text-sm font-medium hover:border-red-500 hover:bg-red-50 transition cursor-pointer">
                      Manager
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 text-center text-sm font-medium hover:border-red-500 hover:bg-red-50 transition cursor-pointer">
                      Cashier
                    </div>
                  </div>
                </div>

                <div className="pt-6 text-center">
                  <p className="text-xs text-slate-500">
                    🔒 Authorized Access Only
                  </p>

                  <p className="text-xs text-slate-400 mt-4">
                    Tripple 5 Suppliers ERP v1.0
                  </p>

                  <p className="text-xs text-slate-400">
                    © 2026 All Rights Reserved
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
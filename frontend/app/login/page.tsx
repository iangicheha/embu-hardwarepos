"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  User,
  Lock,
  LogIn,
  ShieldCheck,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Cloud,
  Headphones,
} from "lucide-react";

import { loginUser } from "@/lib/api";

// Display labels only. The real role comes from the server's login response
// (backend enum: "admin" | "worker"). The picker below is purely cosmetic.
type Role = "ADMIN" | "CASHIER";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [role, setRole] = useState<Role>("ADMIN");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await loginUser(username, password);
      const { accessToken, refreshToken, user } = response.data;

      const storage = rememberMe ? window.localStorage : window.sessionStorage;
      storage.setItem("accessToken", accessToken);
      storage.setItem("refreshToken", refreshToken);
      storage.setItem("user", JSON.stringify(user));

      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const roles: { key: Role; label: string }[] = [
    { key: "ADMIN", label: "Admin" },
    { key: "CASHIER", label: "Cashier" },
  ];

  const features = [
    {
      icon: ShoppingCart,
      title: "Sales Management",
      desc: "Fast and seamless billing",
    },
    {
      icon: Package,
      title: "Inventory Control",
      desc: "Track stock in real-time",
    },
    {
      icon: Users,
      title: "Customer Management",
      desc: "Build strong customer relationships",
    },
    {
      icon: BarChart3,
      title: "Reports & Analytics",
      desc: "Make data-driven decisions",
    },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <div className="flex flex-1 min-h-0">
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

          <div className="relative z-10 flex flex-col justify-between w-full p-8 text-white">
            <div>
              <Image
                src="/logo.png"
                alt="Tripple 5 Suppliers"
                width={200}
                height={120}
                className="mb-4"
                priority
              />

              <h1 className="text-4xl font-extrabold tracking-tight text-red-500">
                TRIPPLE 5 SUPPLIERS
              </h1>

              <p className="mt-2 text-base italic text-white/90">
                Peace of Mind for Builders...
              </p>

              <div className="mt-8 max-w-xl">
                <h2 className="text-xl font-bold tracking-wide">
                  HARDWARE POS SYSTEM
                </h2>
                <div className="mt-2 h-0.5 w-16 bg-red-600" />

                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Manage sales, inventory, customers and grow your business
                  with ease.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600">
                    <f.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{f.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-400 leading-snug">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
          <div
            className="absolute inset-0 lg:hidden"
            style={{
              background:
                "linear-gradient(115deg, #0a0a0a 0%, #0a0a0a 55%, #b91c1c 55%, #dc2626 100%)",
            }}
          />
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              background:
                "linear-gradient(115deg, #0a0a0a 0%, #0a0a0a 12%, #b91c1c 12%, #dc2626 100%)",
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-full opacity-[0.06] hidden lg:block"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, #fff 0px, #fff 2px, transparent 2px, transparent 40px)",
            }}
          />

          <div className="relative z-10 w-full max-w-md max-h-full overflow-y-auto">
            <div className="rounded-3xl bg-white p-5 md:p-6 shadow-2xl">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                  <User className="h-5 w-5 text-red-600" strokeWidth={1.75} />
                </div>
              </div>

              {/* Heading */}
              <div className="mt-2 text-center">
                <h1 className="text-xl font-bold text-slate-900">
                  Welcome Back!
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Sign in to your account to continue
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-0.5 block text-xs font-semibold text-slate-700"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-0.5 block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    Remember me
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Forgot Password?
                  </a>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <LogIn className="h-4 w-4" />
                  {loading ? "Signing In..." : "Login"}
                </button>

                {/* Divider */}
                <div className="relative pt-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[11px] font-medium text-slate-400">
                      OR
                    </span>
                  </div>
                </div>

                <p className="text-center text-xs text-slate-500">Login as</p>

                {/* Role selector */}
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 text-xs font-medium transition ${
                        role === r.key
                          ? "border-red-500 bg-red-50 text-red-600"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <User
                        className={`h-3.5 w-3.5 ${
                          role === r.key ? "text-red-600" : "text-slate-400"
                        }`}
                      />
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="pt-0.5 text-center">
                  <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                    <ShieldCheck className="h-3 w-3" />
                    Authorized access only
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="bg-black shrink-0">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium leading-tight">
                  Secure &amp; Reliable
                </p>
                <p className="text-xs text-slate-400 leading-tight">
                  Your data is safe with us
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium leading-tight">
                  Cloud Backup
                </p>
                <p className="text-xs text-slate-400 leading-tight">
                  Automatic daily backup
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium leading-tight">
                  24/7 Support
                </p>
                <p className="text-xs text-slate-400 leading-tight">
                  We are here to help
                </p>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-sm font-medium">Tripple 5 Suppliers ERP v1.0</p>
            <p className="text-xs text-slate-400">© 2026 All Rights Reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
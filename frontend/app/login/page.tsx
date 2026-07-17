"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Lock, LogIn, ShieldCheck } from "lucide-react";

import { loginUser } from "@/lib/api";

type Role = "ADMIN" | "MANAGER" | "CASHIER";

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
    { key: "MANAGER", label: "Manager" },
    { key: "CASHIER", label: "Cashier" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Diagonal red split background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, #0a0a0a 0%, #0a0a0a 55%, #b91c1c 55%, #dc2626 100%)",
        }}
      />

      {/* subtle diagonal stripes on the red side */}
      <div
        className="absolute inset-y-0 right-0 w-[46%] opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #fff 0px, #fff 2px, transparent 2px, transparent 40px)",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-2xl">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <User className="h-9 w-9 text-red-600" strokeWidth={1.75} />
            </div>
          </div>

          {/* Heading */}
          <div className="mt-5 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Welcome Back!</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                Remember me
              </label>
              <a
                href="/forgot-password"
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Forgot Password?
              </a>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogIn className="h-4.5 w-4.5" />
              {loading ? "Signing In..." : "Login"}
            </button>

            {/* Divider */}
            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium text-slate-400">
                  OR
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-slate-500">Login as</p>

            {/* Role selector */}
            <div className="grid grid-cols-3 gap-3">
              {roles.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${
                    role === r.key
                      ? "border-red-500 bg-red-50 text-red-600"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <User
                    className={`h-5 w-5 ${
                      role === r.key ? "text-red-600" : "text-slate-400"
                    }`}
                  />
                  {r.label}
                </button>
              ))}
            </div>

            <div className="pt-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Authorized access only
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
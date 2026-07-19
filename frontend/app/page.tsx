"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token =
      window.localStorage.getItem("accessToken") ||
      window.sessionStorage.getItem("accessToken");

    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}
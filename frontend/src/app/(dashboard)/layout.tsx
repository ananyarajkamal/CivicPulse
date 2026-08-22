"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { logoutApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } finally {
      clearAuth();
      router.push("/auth/login");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <p className="text-slate-600 text-sm">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            CivicPulse Municipal Dashboard
          </h2>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {user.full_name} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-red-600 hover:text-red-800 px-3 py-1.5 border border-red-200 rounded-md bg-red-50 hover:bg-red-100 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

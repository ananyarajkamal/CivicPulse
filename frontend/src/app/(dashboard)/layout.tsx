"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { logoutApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8] p-6">
        <p className="font-sans text-[#5D5A55] text-sm">Redirecting to login...</p>
      </div>
    );
  }

  const sidebarLinks = [
    { name: "Overview", href: "/dashboard" },
    { name: "Complaints Queue", href: "/dashboard/complaints" },
    { name: "City Intelligence", href: "/dashboard/intelligence" },
    { name: "Public Portal", href: "/" },
  ];

  const checkIsActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/") return false;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-[#F5F1E8] text-[#161616]">
      {/* Desktop Sidebar (Fixed / Sticky) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#292724] text-[#FBFAF7] border-r border-[#161616] min-h-screen sticky top-0 h-screen justify-between p-6">
        <div className="space-y-8">
          {/* Logo Header */}
          <Logo variant="darkFooter" size="md" showTagline={false} />

          {/* Section Navigation */}
          <div className="space-y-3">
            <span className="font-sans text-[10px] font-semibold tracking-widest text-[#B7A58A] uppercase block px-3">
              MUNICIPAL OPERATIONS
            </span>
            <nav className="space-y-1">
              {sidebarLinks.map((item) => {
                const isActive = checkIsActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-3 py-2 rounded-sm font-sans text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#B7A58A]/20 text-[#FBFAF7] border-l-2 border-[#B7A58A]"
                        : "text-[#D6CFC3] hover:text-[#FBFAF7] hover:bg-[#161616]/40"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Staff User Footer */}
        {user && (
          <div className="pt-6 border-t border-[#5D5A55]/40 space-y-3">
            <div className="space-y-0.5 px-1">
              <p className="font-serif-civic font-bold text-sm text-[#FBFAF7] truncate">
                {user.full_name}
              </p>
              <p className="font-sans text-[11px] text-[#B7A58A] capitalize tracking-wide">
                {user.role.replace("_", " ")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full text-[#D6CFC3] border-[#5D5A55] hover:bg-[#161616] text-xs justify-center"
            >
              Sign Out
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-[#292724] text-[#FBFAF7] px-4 py-4 flex items-center justify-between border-b border-[#161616]">
          <Logo variant="darkFooter" size="sm" />
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 text-[#D6CFC3] hover:text-[#FBFAF7]"
            aria-label="Toggle Navigation Drawer"
          >
            ☰
          </button>
        </header>

        {/* Mobile Drawer Overlay */}
        {mobileDrawerOpen && (
          <div className="lg:hidden bg-[#292724] text-[#FBFAF7] p-6 space-y-6 border-b border-[#161616]">
            <nav className="space-y-2">
              {sidebarLinks.map((item) => {
                const isActive = checkIsActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`block px-3 py-2 text-sm rounded-sm ${
                      isActive
                        ? "bg-[#B7A58A]/20 text-[#FBFAF7] font-semibold"
                        : "text-[#D6CFC3] hover:text-[#FBFAF7]"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            {user && (
              <div className="pt-4 border-t border-[#5D5A55]/40 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-[#FBFAF7]">{user.full_name}</p>
                  <p className="text-[10px] text-[#B7A58A]">{user.role}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Main Content View */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

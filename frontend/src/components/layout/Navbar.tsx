"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Track Complaint", href: "/#track" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Analytics", href: "/dashboard#intelligence" },
    { name: "About Us", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F5F1E8]/95 backdrop-blur-xs border-b border-[#D6CFC3] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Logo variant="compact" size="md" />

        {/* Right: Desktop Navigation Links & Staff Login CTA */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-5">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`font-sans text-xs font-medium tracking-wider uppercase transition-colors relative py-1 ${
                    active
                      ? "text-[#161616] font-semibold"
                      : "text-[#5D5A55] hover:text-[#161616]"
                  }`}
                >
                  {link.name}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B7A58A] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="h-4 w-px bg-[#D6CFC3]" />

          <Link href="/auth/login">
            <Button variant="dark" size="sm" className="font-sans text-xs uppercase tracking-wider font-semibold">
              Staff Login
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-sm text-[#161616] hover:bg-[#EAE4DA] focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
          aria-label="Toggle Navigation Menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Slide-down Sheet Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FBFAF7] border-b border-[#D6CFC3] px-6 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-sans text-sm font-medium text-[#161616] hover:text-[#5D5A55] py-2 border-b border-[#EAE4DA] last:border-none"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-2">
            <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="dark" size="md" className="w-full justify-center">
                Staff Login →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#292724] text-[#FBFAF7] pt-16 pb-12 border-t border-[#161616]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-[#5D5A55]/40">
          {/* Left Column: Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <Logo variant="darkFooter" size="lg" showTagline />
            <p className="font-sans text-sm text-[#D6CFC3] leading-relaxed max-w-sm pt-2">
              Building transparent, accountable, and smarter city operations through technology and trust. CivicPulse connects citizens directly to municipal governance.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="font-sans text-xs font-semibold tracking-widest text-[#B7A58A] uppercase">
              Quick Links
            </h4>
            <ul className="space-y-2.5 font-sans text-sm text-[#D6CFC3]">
              <li>
                <Link href="/" className="hover:text-[#FBFAF7] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#track" className="hover:text-[#FBFAF7] transition-colors">
                  Track Complaint
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#FBFAF7] transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#FBFAF7] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#FBFAF7] transition-colors">
                  Contact &amp; Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="font-sans text-xs font-semibold tracking-widest text-[#B7A58A] uppercase">
              Resources &amp; Legal
            </h4>
            <ul className="space-y-2.5 font-sans text-sm text-[#D6CFC3]">
              <li>
                <Link href="/#how-it-works" className="hover:text-[#FBFAF7] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#FBFAF7] transition-colors">
                  System Architecture
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/ananyarajkamal/CivicPulse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FBFAF7] transition-colors inline-flex items-center gap-1"
                >
                  GitHub Repository ↗
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Platform */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="font-sans text-xs font-semibold tracking-widest text-[#B7A58A] uppercase">
              Platform
            </h4>
            <ul className="space-y-2.5 font-sans text-sm text-[#D6CFC3]">
              <li>
                <Link href="/" className="hover:text-[#FBFAF7] transition-colors">
                  Citizen Portal
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#FBFAF7] transition-colors">
                  Municipal Officers
                </Link>
              </li>
              <li>
                <Link href="/dashboard#intelligence" className="hover:text-[#FBFAF7] transition-colors">
                  City Intelligence
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between font-sans text-xs text-[#5D5A55] gap-4">
          <p>© 2026 CivicPulse. All rights reserved.</p>
          <p className="text-[#D6CFC3]/80">
            Open Civic Governance &amp; AI Intelligence Infrastructure
          </p>
        </div>
      </div>
    </footer>
  );
};

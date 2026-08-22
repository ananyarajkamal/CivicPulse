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
              Building transparent, accountable, and responsive city operations through municipal coordination and citizen trust.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="font-sans text-xs font-semibold tracking-widest text-[#B7A58A] uppercase">
              Navigation
            </h4>
            <ul className="space-y-2.5 font-sans text-sm text-[#D6CFC3]">
              <li>
                <Link href="/about" className="hover:text-[#FBFAF7] transition-colors">
                  About CivicPulse
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#FBFAF7] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#FBFAF7] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:text-[#FBFAF7] transition-colors">
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Citizen Services */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-sans text-xs font-semibold tracking-widest text-[#B7A58A] uppercase">
              Citizen Services
            </h4>
            <ul className="space-y-2.5 font-sans text-sm text-[#D6CFC3]">
              <li>
                <Link href="/#submit-complaint" className="hover:text-[#FBFAF7] transition-colors">
                  Report an Issue
                </Link>
              </li>
              <li>
                <Link href="/#track" className="hover:text-[#FBFAF7] transition-colors">
                  Track Complaint
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#FBFAF7] transition-colors">
                  Contact &amp; Support
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#FBFAF7] transition-colors">
                  Staff Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between font-sans text-xs text-[#5D5A55] gap-4">
          <p>© 2026 CivicPulse Platform. All rights reserved.</p>
          <p className="text-[#D6CFC3]/80">
            Accountable Public Administration &amp; Resolution Infrastructure
          </p>
        </div>
      </div>
    </footer>
  );
};

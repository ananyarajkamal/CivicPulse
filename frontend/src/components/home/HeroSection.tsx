import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-[#F5F1E8] border-b border-[#D6CFC3] py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center min-h-[580px] lg:min-h-[640px]">
          {/* Left Content (approx 45% width on desktop) */}
          <div className="lg:col-span-6 space-y-6 z-10">
            <span className="inline-block font-sans text-xs font-semibold tracking-widest uppercase text-[#5D5A55] bg-[#EAE4DA] px-3 py-1 rounded-xs border border-[#D6CFC3]">
              CIVIC RESOLUTION, REIMAGINED
            </span>

            <h1 className="font-serif-civic text-4xl sm:text-5xl lg:text-6xl font-bold text-[#161616] tracking-tight leading-[1.1]">
              Your Voice.<br />
              Our Responsibility.<br />
              <span className="text-[#5D5A55] italic font-normal">Stronger Cities.</span>
            </h1>

            <p className="font-sans text-base sm:text-lg text-[#5D5A55] leading-relaxed max-w-xl">
              CivicPulse connects citizens and municipalities through intelligent complaint management, transparent tracking, and data-driven city operations.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a href="#submit-complaint">
                <Button variant="primary" size="lg" className="shadow-civic">
                  Submit a Complaint
                </Button>
              </a>

              <a href="#track">
                <Button variant="outline" size="lg">
                  Track Complaint
                </Button>
              </a>
            </div>
          </div>

          {/* Right Architectural Imagery (approx 55% width on desktop) */}
          <div className="lg:col-span-6 relative w-full h-[380px] sm:h-[480px] lg:h-[580px] rounded-sm overflow-hidden border border-[#D6CFC3] shadow-civic">
            <Image
              src="/images/hero-civic.png"
              alt="Civic Architecture & City Hall Facade"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-center"
            />
            {/* Subtle Gradient Blend into Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#F5F1E8]/30 via-transparent to-transparent hidden lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
};

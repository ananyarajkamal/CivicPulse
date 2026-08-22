import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const IntelligenceSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-[#292724] text-[#FBFAF7] py-20 sm:py-28 border-b border-[#161616]">
      {/* Background Architectural Image with Overlay */}
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/images/dark-architecture.png"
          alt="Dark Architectural Background"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <span className="inline-block font-sans text-xs font-semibold tracking-widest uppercase text-[#B7A58A] bg-[#161616]/60 px-3 py-1 rounded-xs border border-[#5D5A55]/50">
          CITY INTELLIGENCE
        </span>

        <h2 className="font-serif-civic text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
          Empowering Cities With Data
        </h2>

        <p className="font-sans text-base sm:text-lg text-[#D6CFC3] leading-relaxed max-w-2xl mx-auto">
          From real-time complaint queues to recurring issue patterns, CivicPulse helps municipalities focus attention where it matters most.
        </p>

        <div className="pt-4">
          <Link href="/dashboard">
            <Button variant="primary" size="lg" className="bg-[#B7A58A] text-[#161616] hover:bg-[#A89477]">
              Explore Analytics →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

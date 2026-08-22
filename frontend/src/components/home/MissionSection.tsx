import React from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";

export const MissionSection: React.FC = () => {
  return (
    <section id="mission" className="py-16 sm:py-24 bg-[#FBFAF7] border-b border-[#D6CFC3]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Block */}
          <div className="lg:col-span-6 space-y-6">
            <span className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5D5A55]">
              BUILT FOR BETTER CITIES
            </span>

            <h2 className="font-serif-civic text-3xl sm:text-4xl lg:text-5xl font-bold text-[#161616] leading-tight">
              From Complaints to Coordinated Action.
            </h2>

            <p className="font-sans text-base sm:text-lg text-[#5D5A55] leading-relaxed">
              CivicPulse turns fragmented civic reports into structured, accountable workflows. Citizens gain visibility. Municipal teams gain clarity. City leaders gain intelligence.
            </p>

            <div className="pt-2">
              <a
                href="#how-it-works"
                className="font-sans text-sm font-semibold text-[#161616] hover:text-[#5D5A55] inline-flex items-center gap-1 group"
              >
                Learn About CivicPulse{" "}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>

          {/* Right Image */}
          <div className="lg:col-span-6 relative w-full h-[360px] sm:h-[440px] rounded-sm overflow-hidden border border-[#D6CFC3] shadow-civic">
            <Image
              src="/images/mission-civic.png"
              alt="Civic Building Architecture"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </Container>
    </section>
  );
};

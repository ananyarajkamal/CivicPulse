import React from "react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const FinalCTA: React.FC = () => {
  return (
    <section className="py-20 sm:py-28 bg-[#FBFAF7] border-b border-[#D6CFC3] text-center">
      <Container size="narrow">
        <div className="space-y-6">
          <span className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5D5A55]">
            JOIN CIVIC GOVERNANCE
          </span>

          <h2 className="font-serif-civic text-4xl sm:text-5xl lg:text-6xl font-bold text-[#161616] tracking-tight leading-tight">
            Be the Change.<br />
            <span className="italic text-[#5D5A55] font-normal">Report. Track. Transform.</span>
          </h2>

          <p className="font-sans text-base sm:text-lg text-[#5D5A55] leading-relaxed max-w-xl mx-auto">
            Every civic issue reported is a signal that can help build a more responsive, accountable city.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
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
      </Container>
    </section>
  );
};

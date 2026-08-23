import React from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: "Ingestion Agent",
      description: "Monitors and ingests citizen reports from social media, WhatsApp, and municipal portals.",
    },
    {
      num: "02",
      title: "Classification Agent",
      description: "Categorizes issues, extracts geotagged locations, and detects safety hazards using LLMs.",
    },
    {
      num: "03",
      title: "Routing Agent",
      description: "Assigns complaints to target municipal departments with priority scoring and SLA deadlines.",
    },
    {
      num: "04",
      title: "Tracking Agent",
      description: "Issues 128-bit tracking IDs and updates citizens automatically throughout resolution.",
    },
    {
      num: "05",
      title: "Analytics Agent",
      description: "Identifies recurring geographic problem areas and SLA metrics for city planners.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-[#F5F1E8] border-b border-[#D6CFC3]">
      <Container>
        <SectionHeading
          eyebrow="MULTI-AGENT AI ARCHITECTURE"
          title="Autonomous Resolution Pipeline"
          subtitle="Five specialized AI agents working together from multi-channel intake to city intelligence."
          align="center"
        />

        <div className="relative pt-8">
          {/* Connecting Line for Desktop */}
          <div className="hidden lg:block absolute top-16 left-[10%] right-[10%] h-0.5 bg-[#D6CFC3] -z-0" />

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center space-y-3 group">
                <div className="w-12 h-12 rounded-full bg-[#FBFAF7] border-2 border-[#B7A58A] flex items-center justify-center font-serif-civic font-bold text-lg text-[#161616] shadow-sm transition-transform group-hover:scale-105">
                  {step.num}
                </div>
                <h3 className="font-serif-civic text-xl font-bold text-[#161616] pt-1">
                  {step.title}
                </h3>
                <p className="font-sans text-xs text-[#5D5A55] leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

import React from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: "Submit",
      description: "Submit your complaint anonymously with issue details and location.",
    },
    {
      num: "02",
      title: "Understand",
      description: "CivicPulse AI analyzes, categorizes, and scores urgency automatically.",
    },
    {
      num: "03",
      title: "Route",
      description: "The issue is sent to the appropriate municipal department with SLA deadline.",
    },
    {
      num: "04",
      title: "Act",
      description: "Municipal officers review, assign team members, and execute repairs.",
    },
    {
      num: "05",
      title: "Resolve",
      description: "Citizens track real-time progress until the issue is verified and closed.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-[#F5F1E8] border-b border-[#D6CFC3]">
      <Container>
        <SectionHeading
          eyebrow="TRANSPARENT PROCESS"
          title="How It Works"
          subtitle="Simple steps to raise and resolve issues in your city."
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

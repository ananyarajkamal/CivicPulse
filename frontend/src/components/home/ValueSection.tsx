import React from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnonymousIcon, TrackingIcon, AIIcon, AnalyticsIcon } from "@/components/ui/Icons";

export const ValueSection: React.FC = () => {
  const values = [
    {
      icon: <AnonymousIcon className="w-6 h-6 text-[#292724]" />,
      title: "Anonymous & Secure",
      description: "Report civic issues without creating an account or exposing personal information.",
    },
    {
      icon: <TrackingIcon className="w-6 h-6 text-[#292724]" />,
      title: "Real-Time Tracking",
      description: "Follow complaint status from submission to resolution via 128-bit tracking IDs.",
    },
    {
      icon: <AIIcon className="w-6 h-6 text-[#292724]" />,
      title: "AI-Powered Triage",
      description: "Complaints are understood, classified, prioritized, and prepared for action.",
    },
    {
      icon: <AnalyticsIcon className="w-6 h-6 text-[#292724]" />,
      title: "Data-Driven Insights",
      description: "City teams identify recurring patterns, geographic hotspots, and service gaps.",
    },
  ];

  return (
    <section id="value" className="py-16 sm:py-24 bg-[#FBFAF7] border-b border-[#D6CFC3]">
      <Container>
        <SectionHeading
          title="Intelligent. Transparent. Accountable."
          subtitle="CivicPulse ensures every complaint is heard, tracked, and resolved."
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-6">
          {values.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col space-y-3 p-6 rounded-sm bg-[#FBFAF7] border border-[#D6CFC3] shadow-civic ${
                idx < values.length - 1 ? "lg:border-r-[#D6CFC3]" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-sm bg-[#EAE4DA] flex items-center justify-center mb-1">
                {item.icon}
              </div>
              <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
                {item.title}
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

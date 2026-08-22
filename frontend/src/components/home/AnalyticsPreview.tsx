import React from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";

export const AnalyticsPreview: React.FC = () => {
  const insights = [
    {
      num: "01",
      title: "Faster Triage",
      description: "AI-assisted classification reduces manual complaint sorting and accelerates routing.",
    },
    {
      num: "02",
      title: "SLA Visibility",
      description: "Officers can immediately identify overdue and high-priority cases before deadlines breach.",
    },
    {
      num: "03",
      title: "Recurring Issue Detection",
      description: "Clusters reveal repeated infrastructure problems across neighborhoods for systemic action.",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-[#F5F1E8] border-b border-[#D6CFC3]">
      <Container>
        <SectionHeading
          eyebrow="SYSTEMIC INSIGHTS"
          title="See What Your City Is Telling You."
          subtitle="Operational signals become visible before recurring issues become larger problems."
          align="left"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* 3 Insight Cards */}
          <div className="lg:col-span-7 space-y-6">
            {insights.map((item, idx) => (
              <Card key={idx} variant="primary" padding="md" className="flex items-start gap-5">
                <span className="font-serif-civic font-bold text-2xl text-[#B7A58A] shrink-0 pt-0.5">
                  {item.num}
                </span>
                <div>
                  <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
                    {item.title}
                  </h3>
                  <p className="font-sans text-sm text-[#5D5A55] leading-relaxed mt-1">
                    {item.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Side Architectural City Grid Crop */}
          <div className="lg:col-span-5 relative w-full h-[380px] rounded-sm overflow-hidden border border-[#D6CFC3] shadow-civic">
            <Image
              src="/images/analytics-city.png"
              alt="Urban Grid & City Infrastructure Pattern"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </Container>
    </section>
  );
};

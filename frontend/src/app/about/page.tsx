import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function AboutPage() {
  const steps = [
    { num: "01", title: "Citizen Signal", desc: "Issues are reported anonymously without barriers." },
    { num: "02", title: "Understand", desc: "Structured parsing and language classification." },
    { num: "03", title: "Prioritize", desc: "Deterministic priority scoring and safety audit." },
    { num: "04", title: "Route", desc: "Automated department assignment and SLA timer start." },
    { num: "05", title: "Resolve", desc: "Staff inspection, repair execution, and tracking." },
    { num: "06", title: "Learn", desc: "Aggregated spatial hotspot detection and city insights." },
  ];

  const agents = [
    {
      name: "Intake Agent",
      type: "Deterministic System",
      desc: "Generates 128-bit tracking IDs, validates coordinates, and sanitizes input data.",
      isAI: false,
    },
    {
      name: "Intelligence Agent",
      type: "AI-Powered",
      desc: "Parses freeform text, classifies categories, identifies safety risks, and provides summaries.",
      isAI: true,
    },
    {
      name: "Priority Agent",
      type: "Deterministic Math Formula",
      desc: "Calculates priority score (0-100) based on category base weight, keyword severity, and location density.",
      isAI: false,
    },
    {
      name: "Routing Agent",
      type: "Deterministic Matrix",
      desc: "Routes complaints to responsible municipal departments and calculates SLA deadlines.",
      isAI: false,
    },
    {
      name: "Resolution Agent",
      type: "Staff Workflow Engine",
      desc: "Tracks status lifecycle transitions, staff officer assignments, and internal communication logs.",
      isAI: false,
    },
    {
      name: "City Intelligence Agent",
      type: "Analytics Engine",
      desc: "Computes spatial DBSCAN hotspot clusters, SLA compliance rates, and operational trends.",
      isAI: false,
    },
  ];

  const principles = [
    { title: "Accountability", text: "Every civic report has a tracked lifecycle and clear municipal ownership." },
    { title: "Transparency", text: "Citizens can inspect real-time progress without exposing sensitive internal notes." },
    { title: "Privacy", text: "Personal information is strictly confidential and never displayed on public trackers." },
    { title: "Explainability", text: "All automated classifications and priority scores are fully auditable." },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#161616]">
      <Navbar />

      <main className="flex-1">
        {/* About Hero */}
        <section className="py-16 sm:py-24 bg-[#F5F1E8] border-b border-[#D6CFC3]">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5D5A55]">
                  ABOUT CIVICPULSE
                </span>
                <h1 className="font-serif-civic text-4xl sm:text-5xl lg:text-6xl font-bold text-[#161616] leading-tight">
                  Better Civic Systems Begin With Better Visibility.
                </h1>
                <p className="font-sans text-base sm:text-lg text-[#5D5A55] leading-relaxed">
                  CivicPulse connects citizen reports, municipal operations, and city-level intelligence within one accountable resolution workflow.
                </p>
              </div>

              <div className="lg:col-span-6 relative w-full h-[360px] sm:h-[440px] rounded-sm overflow-hidden border border-[#D6CFC3] shadow-civic">
                <Image
                  src="/images/mission-civic.png"
                  alt="Civic Architecture & City Hall"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
              </div>
            </div>
          </Container>
        </section>

        {/* The Problem Section */}
        <section className="py-16 sm:py-24 bg-[#FBFAF7] border-b border-[#D6CFC3]">
          <Container size="narrow">
            <SectionHeading
              eyebrow="THE CHALLENGE"
              title="The Problem Isn't Reporting. It's What Happens Next."
              subtitle="Modern cities process thousands of citizen inquiries, but operational bottlenecks often stall resolution."
              align="center"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <Card variant="primary" padding="md" className="border-[#D6CFC3] space-y-2">
                <h3 className="font-serif-civic text-xl font-bold text-[#161616]">Fragmented Ingestion</h3>
                <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                  Citizen complaints arrive through disparate call centers, emails, and forms without standardized categorization.
                </p>
              </Card>

              <Card variant="primary" padding="md" className="border-[#D6CFC3] space-y-2">
                <h3 className="font-serif-civic text-xl font-bold text-[#161616]">Manual Triage Delays</h3>
                <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                  Staff teams spend hundreds of hours manually sorting, tagging, and assigning incoming reports.
                </p>
              </Card>

              <Card variant="primary" padding="md" className="border-[#D6CFC3] space-y-2">
                <h3 className="font-serif-civic text-xl font-bold text-[#161616]">Hidden Duplicates</h3>
                <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                  Multiple reports for the same infrastructure hazard mask systemic root causes across neighborhoods.
                </p>
              </Card>

              <Card variant="primary" padding="md" className="border-[#D6CFC3] space-y-2">
                <h3 className="font-serif-civic text-xl font-bold text-[#161616]">Information Blackout</h3>
                <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                  Citizens lack visibility after submitting a report, leading to repeated inquiries and eroded trust.
                </p>
              </Card>
            </div>
          </Container>
        </section>

        {/* The CivicPulse Approach (6-Step Workflow) */}
        <section className="py-16 sm:py-24 bg-[#F5F1E8] border-b border-[#D6CFC3]">
          <Container>
            <SectionHeading
              eyebrow="SYSTEM ARCHITECTURE"
              title="The CivicPulse Approach"
              subtitle="Structured end-to-end resolution pipeline built for modern public administration."
              align="center"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-6">
              {steps.map((s) => (
                <div key={s.num} className="p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-2">
                  <span className="font-serif-civic text-xl font-bold text-[#B7A58A] block">
                    {s.num}
                  </span>
                  <h4 className="font-serif-civic text-lg font-bold text-[#161616]">{s.title}</h4>
                  <p className="font-sans text-xs text-[#5D5A55] leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Six Logical Agents Section */}
        <section className="py-16 sm:py-24 bg-[#FBFAF7] border-b border-[#D6CFC3]">
          <Container>
            <SectionHeading
              eyebrow="ENGINEERING DESIGN"
              title="Six Logical Architecture Agents"
              subtitle="CivicPulse combines deterministic rules with targeted AI parsing to maximize accuracy and eliminate hallucination."
              align="left"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {agents.map((ag) => (
                <Card key={ag.name} variant="primary" padding="md" className="border-[#D6CFC3] space-y-3 shadow-civic">
                  <div className="flex justify-between items-start">
                    <h3 className="font-serif-civic text-xl font-bold text-[#161616]">{ag.name}</h3>
                    <Badge variant={ag.isAI ? "assigned" : "neutral"}>
                      {ag.type}
                    </Badge>
                  </div>
                  <p className="font-sans text-xs text-[#5D5A55] leading-relaxed">{ag.desc}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Principles */}
        <section className="py-16 sm:py-24 bg-[#F5F1E8] border-b border-[#D6CFC3]">
          <Container size="default">
            <SectionHeading
              eyebrow="GOVERNANCE ETHOS"
              title="Institutional Principles"
              align="center"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
              {principles.map((p) => (
                <div key={p.title} className="p-6 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-2 text-center">
                  <h4 className="font-serif-civic text-xl font-bold text-[#161616]">{p.title}</h4>
                  <p className="font-sans text-xs text-[#5D5A55] leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Final About CTA */}
        <section className="py-20 bg-[#FBFAF7] text-center border-b border-[#D6CFC3]">
          <Container size="narrow">
            <div className="space-y-6">
              <h2 className="font-serif-civic text-4xl sm:text-5xl font-bold text-[#161616]">
                Stronger Cities Start With Clearer Signals.
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link href="/#submit-complaint">
                  <Button variant="primary" size="lg" className="shadow-civic">
                    Submit a Complaint
                  </Button>
                </Link>
                <Link href="/#track">
                  <Button variant="outline" size="lg">
                    Track Complaint
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}

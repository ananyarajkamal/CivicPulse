import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AboutPage() {
  const steps = [
    { num: "01", title: "Citizen Report", desc: "Submit an anonymous issue with optional location details." },
    { num: "02", title: "Automated Triage", desc: "Instant text analysis categorizes and checks for duplicates." },
    { num: "03", title: "Priority Assignment", desc: "Safety risks and severity scores dictate urgency." },
    { num: "04", title: "Department Routing", desc: "Dispatched directly to the responsible municipal team." },
    { num: "05", title: "Field Resolution", desc: "Municipal officers inspect, repair, and log progress." },
    { num: "06", title: "City Insights", desc: "Aggregated patterns inform long-term infrastructure planning." },
  ];

  const pillars = [
    {
      title: "Intelligent Triage",
      desc: "Automatically extracts location details, assesses severity, and routes complaints to the right department without manual sorting delays.",
    },
    {
      title: "Priority Scoring",
      desc: "Calculates resolution urgency based on safety hazards, category impact, and neighborhood report frequency.",
    },
    {
      title: "Department Routing",
      desc: "Directs issues straight to specialized field teams: whether Roads, Water, Sanitation, or Public Lighting.",
    },
    {
      title: "Transparent Tracking",
      desc: "Provides every citizen with an unguessable tracking code for real-time status visibility.",
    },
    {
      title: "Staff Workflow Engine",
      desc: "Equips city staff with workspace tools to update status, coordinate responses, and meet resolution target deadlines.",
    },
    {
      title: "City Pattern Analytics",
      desc: "Aggregates geographic issue clusters to help city leadership proactively fix recurring hazards.",
    },
  ];

  const principles = [
    { title: "Accountability", text: "Every civic report has a tracked lifecycle and clear municipal ownership." },
    { title: "Transparency", text: "Citizens can inspect real-time progress without exposing sensitive internal notes." },
    { title: "Privacy Protection", text: "Personal information is strictly confidential and never displayed publicly." },
    { title: "Service Quality", text: "Target resolution windows ensure timely municipal response across all wards." },
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
                  CivicPulse connects citizen reports, municipal field teams, and city-level intelligence within one accountable resolution workflow.
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
                  Citizen complaints arrive through disparate channels without standardized categorization or tracking.
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

        {/* The CivicPulse Resolution Pipeline */}
        <section className="py-16 sm:py-24 bg-[#F5F1E8] border-b border-[#D6CFC3]">
          <Container>
            <SectionHeading
              eyebrow="RESOLUTION PIPELINE"
              title="How Complaints Move Through CivicPulse"
              subtitle="Structured end-to-end resolution process built for responsive municipal service delivery."
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

        {/* Operational Pillars */}
        <section className="py-16 sm:py-24 bg-[#FBFAF7] border-b border-[#D6CFC3]">
          <Container>
            <SectionHeading
              eyebrow="PLATFORM CAPABILITIES"
              title="Core System Features"
              subtitle="CivicPulse combines smart automated sorting with clear staff workflow tools for maximum resolution efficiency."
              align="left"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {pillars.map((p) => (
                <Card key={p.title} variant="primary" padding="md" className="border-[#D6CFC3] space-y-3 shadow-civic">
                  <h3 className="font-serif-civic text-xl font-bold text-[#161616]">{p.title}</h3>
                  <p className="font-sans text-xs text-[#5D5A55] leading-relaxed">{p.desc}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Principles */}
        <section className="py-16 sm:py-24 bg-[#F5F1E8] border-b border-[#D6CFC3]">
          <Container size="default">
            <SectionHeading
              eyebrow="INSTITUTIONAL ETHOS"
              title="Core Guiding Principles"
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
                    Report an Issue
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

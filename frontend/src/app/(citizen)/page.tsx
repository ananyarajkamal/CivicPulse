import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { ValueSection } from "@/components/home/ValueSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { MissionSection } from "@/components/home/MissionSection";
import { IntelligenceSection } from "@/components/home/IntelligenceSection";
import { AnalyticsPreview } from "@/components/home/AnalyticsPreview";
import { IntakeFormSection } from "@/components/home/IntakeFormSection";
import { FinalCTA } from "@/components/home/FinalCTA";

export default function CitizenLandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#161616]">
      {/* Editorial Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* Editorial Hero */}
        <HeroSection />

        {/* Value Props & Trust */}
        <ValueSection />

        {/* 5-Step Process */}
        <HowItWorks />

        {/* Editorial Mission */}
        <MissionSection />

        {/* Dark City Intelligence Feature */}
        <IntelligenceSection />

        {/* Analytics Preview */}
        <AnalyticsPreview />

        {/* Preserved Citizen Complaint Intake & Tracking Form */}
        <IntakeFormSection />

        {/* Final CTA */}
        <FinalCTA />
      </main>

      {/* Editorial Dark Charcoal Footer */}
      <Footer />
    </div>
  );
}

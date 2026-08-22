import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#161616]">
      <Navbar />

      <main className="flex-1 py-16 sm:py-24">
        <Container size="narrow">
          <SectionHeading
            eyebrow="ACCESSIBILITY STATEMENT"
            title="Inclusive Civic Access"
            subtitle="CivicPulse is designed to ensure equitable access to municipal services for all community members."
            align="center"
          />

          <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                1. High-Contrast Editorial Styling
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                The platform utilizes a high-contrast neutral palette to maintain readability across diverse lighting conditions and screen types.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#D6CFC3] pt-6">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                2. Keyboard & Screen Reader Friendly
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                All forms, buttons, and navigation elements feature semantic HTML5 structure, explicit label associations, and keyboard focus states.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#D6CFC3] pt-6">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                3. Low-Bandwidth Responsive Architecture
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                Optimized layouts ensure fast loading speeds on mobile devices and variable cellular networks.
              </p>
            </div>

            <div className="pt-4 text-center">
              <Link href="/#track">
                <Button variant="dark" size="md">
                  Track Your Complaint →
                </Button>
              </Link>
            </div>
          </Card>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

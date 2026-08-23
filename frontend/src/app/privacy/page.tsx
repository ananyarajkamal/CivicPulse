import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#161616]">
      <Navbar />

      <main className="flex-1 py-16 sm:py-24">
        <Container size="narrow">
          <SectionHeading
            eyebrow="CITIZEN PRIVACY"
            title="Privacy Policy & Safeguards"
            subtitle="CivicPulse is built around citizen anonymity, minimal data collection, and strict confidentiality."
            align="center"
          />

          <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-6">
            <div className="space-y-3">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                1. Anonymous Issue Reporting
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                Citizens are never required to create an account or provide personal identification to submit a civic report. All reports generate an unguessable 25-character Tracking ID for public status verification.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#D6CFC3] pt-6">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                2. Confidential Voluntary Contact Information
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                If you voluntarily provide a name, email address, or telephone number, this information is stored strictly for municipal officer follow-up. It is never displayed on the public tracking portal, never shared with third parties, and never indexed publicly.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#D6CFC3] pt-6">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                3. Location Data Usage
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                Geographic coordinates and street locations are used solely to dispatch field inspection crews, calculate service areas, and aggregate municipal issue hotspots.
              </p>
            </div>

            <div className="space-y-3 border-t border-[#D6CFC3] pt-6">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                4. Data Protection Standards
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                Internal staff notes, officer communications, and administrative records remain restricted to authorized department personnel.
              </p>
            </div>

            <div className="pt-4 text-center">
              <Link href="/#submit-complaint">
                <Button variant="dark" size="md">
                  Report an Issue
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

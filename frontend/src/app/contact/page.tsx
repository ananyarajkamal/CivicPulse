import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#161616]">
      <Navbar />

      <main className="flex-1 py-16 sm:py-24">
        <Container size="narrow">
          <SectionHeading
            eyebrow="CITIZEN SUPPORT"
            title="Contact &amp; Assistance"
            subtitle="Access public portal services, report infrastructure issues, or log into the municipal staff portal below."
            align="center"
          />

          <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-8 max-w-2xl mx-auto">
            <div className="space-y-3">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                Civic Services Access
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                CivicPulse provides automated complaint triage and transparent status tracking for municipal infrastructure services. Select an action below to access services.
              </p>
            </div>

            <div className="space-y-4 pt-2 border-t border-[#D6CFC3]">
              <div className="p-4 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="font-serif-civic font-bold text-lg text-[#161616]">
                    Report an Issue
                  </h4>
                  <p className="font-sans text-xs text-[#5D5A55]">
                    Submit anonymous complaints with optional location details
                  </p>
                </div>
                <Link href="/#submit-complaint">
                  <Button variant="dark" size="sm">
                    Report Now
                  </Button>
                </Link>
              </div>

              <div className="p-4 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="font-serif-civic font-bold text-lg text-[#161616]">
                    Track Existing Complaint
                  </h4>
                  <p className="font-sans text-xs text-[#5D5A55]">
                    View real-time status using your 25-character Tracking ID
                  </p>
                </div>
                <Link href="/#track">
                  <Button variant="outline" size="sm">
                    Track Status
                  </Button>
                </Link>
              </div>

              <div className="p-4 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="font-serif-civic font-bold text-lg text-[#161616]">
                    Municipal Staff Portal
                  </h4>
                  <p className="font-sans text-xs text-[#5D5A55]">
                    Authorized staff sign-in for complaint triage &amp; resolution
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button variant="outline" size="sm">
                    Staff Login
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

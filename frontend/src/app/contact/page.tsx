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
            eyebrow="GET IN TOUCH"
            title="Questions About CivicPulse?"
            subtitle="For project information, technical documentation, or deployment inquiries, use the verified repository resources below."
            align="center"
          />

          <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                Verified Open Resources
              </h3>
              <p className="font-sans text-sm text-[#5D5A55] leading-relaxed">
                CivicPulse is an open-source civic intelligence platform codebase. Technical specifications, API documentation, and security verification suites are publicly accessible in the repository.
              </p>
            </div>

            <div className="space-y-4 pt-2 border-t border-[#D6CFC3]">
              <div className="p-4 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="font-serif-civic font-bold text-lg text-[#161616]">
                    GitHub Repository
                  </h4>
                  <p className="font-sans text-xs text-[#5D5A55]">
                    Source code, commit history, and release documentation
                  </p>
                </div>
                <a
                  href="https://github.com/ananyarajkamal/CivicPulse"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="dark" size="sm">
                    Open GitHub ↗
                  </Button>
                </a>
              </div>

              <div className="p-4 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="font-serif-civic font-bold text-lg text-[#161616]">
                    Citizen Portal
                  </h4>
                  <p className="font-sans text-xs text-[#5D5A55]">
                    Submit anonymous complaints or track existing status
                  </p>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm">
                    Go to Portal →
                  </Button>
                </Link>
              </div>

              <div className="p-4 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm flex items-center justify-between">
                <div>
                  <h4 className="font-serif-civic font-bold text-lg text-[#161616]">
                    Municipal Operations Sign In
                  </h4>
                  <p className="font-sans text-xs text-[#5D5A55]">
                    Authorized staff sign-in for triage &amp; resolution
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button variant="outline" size="sm">
                    Staff Login →
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

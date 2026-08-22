import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RoutingIcon } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#161616]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-16 sm:py-24">
        <Container size="narrow">
          <Card variant="primary" padding="lg" className="text-center space-y-6 shadow-civic border-[#D6CFC3] max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-[#EAE4DA] text-[#292724] flex items-center justify-center mx-auto border border-[#D6CFC3]">
              <RoutingIcon className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="font-serif-civic text-6xl font-bold text-[#B7A58A] block">
                404
              </span>
              <h1 className="font-serif-civic text-3xl font-bold text-[#161616]">
                This Route Doesn&apos;t Lead Anywhere.
              </h1>
              <p className="font-sans text-sm text-[#5D5A55] max-w-md mx-auto">
                The page you are looking for may have moved, been renamed, or may no longer exist on this platform.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/">
                <Button variant="dark" size="md">
                  Return Home →
                </Button>
              </Link>
              <Link href="/#track">
                <Button variant="outline" size="md">
                  Track Complaint
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

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LockIcon, ClockIcon } from "@/components/ui/Icons";
import { trackComplaintApi } from "@/lib/api/public";
import type { CitizenComplaintResponse } from "@/types/complaint";

type BadgeVariantType =
  | "reported"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "neutral";

export default function TrackingPage({
  params,
}: {
  params: Promise<{ trackingId: string }>;
}) {
  const { trackingId } = use(params);
  const router = useRouter();

  const [complaint, setComplaint] = useState<CitizenComplaintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(trackingId);

  useEffect(() => {
    let isMounted = true;

    trackComplaintApi(trackingId)
      .then((data) => {
        if (isMounted) {
          setComplaint(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          if (err instanceof Error && err.message.includes("not found")) {
            setError("We couldn't find a complaint with this tracking ID. Please check the ID and try again.");
          } else {
            setError("We're unable to access complaint tracking right now. Please try again shortly.");
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [trackingId]);

  const lifecycleStatuses = ["reported", "assigned", "in_progress", "resolved"];

  const getStatusIndex = (currentStatus: string) => {
    const s = currentStatus.toLowerCase();
    const idx = lifecycleStatuses.indexOf(s);
    return idx >= 0 ? idx : 0;
  };

  const getBadgeVariant = (val: string): BadgeVariantType => {
    const s = val.toLowerCase();
    if (["reported", "assigned", "in_progress", "resolved", "critical", "high", "medium", "low"].includes(s)) {
      return s as BadgeVariantType;
    }
    return "neutral";
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#161616]">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16">
        <Container size="narrow">
          {/* Header & Search */}
          <SectionHeading
            eyebrow="COMPLAINT TRACKING"
            title="Track Your Complaint"
            subtitle="Follow your civic complaint in real-time from submission to resolution."
            align="center"
          />

          {/* Search Bar */}
          <Card variant="primary" padding="md" className="mb-10 shadow-civic border-[#D6CFC3]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchInput.trim()) {
                  router.push(`/track/${encodeURIComponent(searchInput.trim())}`);
                }
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter 25-character Tracking ID (e.g. CP-...)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
                />
              </div>
              <Button variant="dark" size="md" type="submit" disabled={!searchInput.trim()}>
                Track Complaint
              </Button>
            </form>
          </Card>

          {/* Loading Skeleton */}
          {loading && (
            <Card variant="primary" padding="lg" className="text-center py-16 space-y-4 shadow-civic">
              <div className="w-8 h-8 border-2 border-[#B7A58A] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-sans text-sm font-medium text-[#161616]">Looking up your complaint...</p>
            </Card>
          )}

          {/* Error / Not Found State */}
          {error && !loading && (
            <Card variant="primary" padding="lg" className="text-center space-y-6 shadow-civic border-[#D6CFC3]">
              <div className="w-12 h-12 rounded-full bg-[#EAE4DA] text-[#292724] flex items-center justify-center mx-auto text-xl font-bold">
                !
              </div>
              <div className="space-y-2">
                <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                  Unable to Retrieve Complaint
                </h3>
                <p className="font-sans text-sm text-[#5D5A55] max-w-md mx-auto leading-relaxed">
                  {error}
                </p>
                <div className="bg-[#F5F1E8] p-2 rounded border border-[#D6CFC3] inline-block font-mono text-xs text-[#5D5A55]">
                  ID: {trackingId}
                </div>
              </div>
              <div>
                <Link href="/">
                  <Button variant="dark" size="md">
                    Return Home →
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Complaint Details View */}
          {complaint && !loading && (
            <div className="space-y-8">
              {/* Summary Header Card */}
              <Card variant="primary" padding="lg" className="shadow-civic border-[#D6CFC3] space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D6CFC3] pb-6">
                  <div>
                    <span className="font-sans text-xs font-semibold tracking-wider text-[#5D5A55] uppercase">
                      Tracking ID
                    </span>
                    <h2 className="font-mono text-xl sm:text-2xl font-bold text-[#161616] tracking-wide select-all mt-1">
                      {complaint.tracking_id}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={getBadgeVariant(complaint.status)}>
                      Status: {complaint.status.replace("_", " ")}
                    </Badge>
                    <Badge variant={getBadgeVariant(complaint.priority)}>
                      {complaint.priority} Priority
                    </Badge>
                  </div>
                </div>

                {/* 2-4 Information Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                  <div>
                    <span className="font-sans text-xs text-[#5D5A55] uppercase tracking-wider block mb-1">
                      Category
                    </span>
                    <span className="font-serif-civic font-bold text-lg text-[#161616]">
                      {complaint.category || "General"}
                    </span>
                  </div>

                  <div>
                    <span className="font-sans text-xs text-[#5D5A55] uppercase tracking-wider block mb-1">
                      Department
                    </span>
                    <span className="font-serif-civic font-bold text-lg text-[#161616]">
                      {complaint.department || "Unassigned"}
                    </span>
                  </div>

                  <div>
                    <span className="font-sans text-xs text-[#5D5A55] uppercase tracking-wider block mb-1">
                      Submitted On
                    </span>
                    <span className="font-sans text-sm font-medium text-[#161616]">
                      {new Date(complaint.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="font-sans text-xs text-[#5D5A55] uppercase tracking-wider block mb-1">
                      SLA Target
                    </span>
                    <span className="font-sans text-sm font-medium text-[#161616]">
                      {complaint.sla_deadline
                        ? new Date(complaint.sla_deadline).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "Standard"}
                    </span>
                  </div>
                </div>

                {complaint.location_address && (
                  <div className="p-3 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] flex items-center gap-2">
                    <span className="font-semibold shrink-0">📍 Verified Location:</span>
                    <span className="truncate">{complaint.location_address}</span>
                  </div>
                )}
              </Card>

              {/* Status Lifecycle Timeline */}
              <Card variant="primary" padding="lg" className="shadow-civic border-[#D6CFC3] space-y-6">
                <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
                  Resolution Lifecycle Timeline
                </h3>

                <div className="relative pt-4 pb-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {lifecycleStatuses.map((st, idx) => {
                      const currentIdx = getStatusIndex(complaint.status);
                      const isCompleted = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div
                          key={st}
                          className={`p-4 rounded-sm border transition-all ${
                            isCurrent
                              ? "bg-[#EAE4DA] border-[#292724] shadow-sm"
                              : isCompleted
                              ? "bg-[#FBFAF7] border-[#D6CFC3]"
                              : "bg-[#FBFAF7]/50 border-[#D6CFC3]/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                                isCurrent
                                  ? "bg-[#292724] text-[#FBFAF7]"
                                  : isCompleted
                                  ? "bg-[#B7A58A] text-[#161616]"
                                  : "bg-[#D6CFC3] text-[#5D5A55]"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            {isCurrent && <Badge variant="assigned">Current</Badge>}
                          </div>
                          <h4 className="font-serif-civic text-lg font-bold text-[#161616] capitalize">
                            {st.replace("_", " ")}
                          </h4>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Resolution Progress / SLA Panel */}
              <Card variant="secondary" padding="md" className="border-[#D6CFC3]">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded bg-[#FBFAF7] border border-[#D6CFC3]">
                    <ClockIcon className="w-5 h-5 text-[#292724]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif-civic text-lg font-bold text-[#161616]">
                      Resolution Progress
                    </h4>
                    <p className="font-sans text-xs text-[#5D5A55] leading-relaxed">
                      Assigned to the <strong>{complaint.department || "Municipal Operations"}</strong> department.
                      {complaint.sla_breached
                        ? " SLA deadline extension applied due to operational complexity."
                        : " Work is progressing within target resolution timeframe."}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Privacy Notice */}
              <div className="p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm flex items-center gap-3 text-xs text-[#5D5A55]">
                <LockIcon className="w-4 h-4 shrink-0 text-[#292724]" />
                <span>
                  <strong>Privacy Assurance:</strong> Your tracking view contains only citizen-safe complaint information. Internal municipal notes, personal details, and staff assignments are never displayed here.
                </span>
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}

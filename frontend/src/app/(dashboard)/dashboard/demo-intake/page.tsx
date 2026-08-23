"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { submitDemoComplaintApi, type DemoComplaintPayload } from "@/lib/api/staff";
import type { StaffComplaintDetailResponse } from "@/types/staff_complaint";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type DemoSource = "whatsapp_demo" | "social_demo" | "municipal_demo";

interface PresetItem {
  name: string;
  source: DemoSource;
  text: string;
  location: string;
  submitter?: string;
}

const DEMO_PRESETS: PresetItem[] = [
  {
    name: "Pothole Hazard (WhatsApp)",
    source: "whatsapp_demo",
    text: "Large pothole near Bailey Road is forcing vehicles to swerve suddenly and creating a safety risk.",
    location: "Bailey Road, Patna",
    submitter: "Resident (WhatsApp)",
  },
  {
    name: "Pothole Report (Social)",
    source: "social_demo",
    text: "Several vehicles are slowing down suddenly because of a deep hazardous pothole near Bailey Road.",
    location: "Bailey Road, Patna",
    submitter: "@patna_commuter",
  },
  {
    name: "Waste Overflow (Social)",
    source: "social_demo",
    text: "Garbage has been overflowing near the main market for three days and is blocking part of the pedestrian walkway.",
    location: "Main Market Road, Patna",
    submitter: "Market Association",
  },
  {
    name: "Streetlight Outage (Municipal)",
    source: "municipal_demo",
    text: "Three streetlights near Central Park have not been functioning for two nights, leaving the road poorly illuminated.",
    location: "Central Park, Patna",
    submitter: "Ward Patrol",
  },
];

export default function DemoIntakePage() {
  const { user, accessToken } = useAuthStore();
  const [selectedSource, setSelectedSource] = useState<DemoSource>("whatsapp_demo");
  const [rawText, setRawText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StaffComplaintDetailResponse | null>(null);

  // Role guard: Only Administrators may use the Channel Integration Simulator
  if (user && user.role !== "admin") {
    return (
      <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-4 text-center py-16">
        <h2 className="font-serif-civic text-2xl font-bold text-[#161616]">
          Access Restricted
        </h2>
        <p className="font-sans text-sm text-[#5D5A55] max-w-md mx-auto">
          The Channel Integration Simulator is restricted to System Administrators. Municipal officers manage active complaints within their assigned department queue.
        </p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button variant="dark" size="sm">
              Return to Dashboard Overview
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const handleApplyPreset = (preset: PresetItem) => {
    setSelectedSource(preset.source);
    setRawText(preset.text);
    setLocationText(preset.location);
    if (preset.submitter) {
      setSubmitterName(preset.submitter);
    }
    setError(null);
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setError("Authenticated staff session required.");
      return;
    }
    if (!rawText.trim() || rawText.trim().length < 10) {
      setError("Please enter a detailed description of at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const payload: DemoComplaintPayload = {
      source: selectedSource,
      raw_text: rawText.trim(),
      location_text: locationText.trim() || undefined,
      submitter_name: submitterName.trim() || undefined,
    };

    try {
      const created = await submitDemoComplaintApi(payload, accessToken);
      setResult(created);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to process simulated channel intake.");
      } else {
        setError("Failed to process simulated channel intake.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceDisplayTitle = (src: string) => {
    switch (src) {
      case "whatsapp_demo":
        return "WhatsApp";
      case "social_demo":
        return "Social Media";
      case "municipal_demo":
        return "Municipal System";
      default:
        return "Simulated Channel";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Page Description */}
      <div className="border-b border-[#D6CFC3] pb-6 space-y-2">
        <span className="font-sans text-xs font-semibold tracking-widest text-[#B7A58A] uppercase">
          SYSTEM TOOLS
        </span>
        <h1 className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616]">
          Channel Integration Simulator
        </h1>
        <p className="font-sans text-sm text-[#5D5A55] max-w-3xl leading-relaxed">
          Test how complaints from external civic channels are normalized and processed through CivicPulse&apos;s unified resolution pipeline.
        </p>

        {/* Simulation Environment Notice */}
        <div className="mt-3 p-3.5 bg-[#EAE4DA]/60 border border-[#B7A58A]/50 rounded-sm flex items-start gap-3 text-xs font-sans text-[#161616]">
          <span className="shrink-0 text-base">ℹ️</span>
          <p className="leading-relaxed">
            <strong>Simulation Environment:</strong> WhatsApp, Social Media, and Municipal System are simulated integration adapters. The Web Portal is the live citizen intake channel in this deployment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Presets (~60%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Scenarios Bar */}
          <Card variant="secondary" padding="md" className="border-[#D6CFC3] space-y-3">
            <span className="font-sans text-xs font-semibold tracking-wider text-[#5D5A55] uppercase block">
              Quick Scenarios &amp; Duplicate Test Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-3.5 py-2 bg-[#FBFAF7] hover:bg-[#EAE4DA] border border-[#D6CFC3] rounded-sm font-sans text-xs font-medium text-[#161616] transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </Card>

          {/* Intake Simulator Form */}
          <Card variant="primary" padding="lg" className="border-[#D6CFC3] space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Channel Selector */}
              <div className="space-y-2">
                <label className="font-sans text-xs font-semibold text-[#161616] uppercase tracking-wider block">
                  1. Select Source Channel
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSource("whatsapp_demo")}
                    className={`p-3 text-left border rounded-sm transition-all font-sans text-xs ${
                      selectedSource === "whatsapp_demo"
                        ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                        : "bg-[#FBFAF7] text-[#161616] border-[#D6CFC3] hover:bg-[#EAE4DA]"
                    }`}
                  >
                    <span className="font-bold block text-sm">WhatsApp</span>
                    <span className="text-[11px] opacity-80 block mt-0.5">
                      Simulated message
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSource("social_demo")}
                    className={`p-3 text-left border rounded-sm transition-all font-sans text-xs ${
                      selectedSource === "social_demo"
                        ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                        : "bg-[#FBFAF7] text-[#161616] border-[#D6CFC3] hover:bg-[#EAE4DA]"
                    }`}
                  >
                    <span className="font-bold block text-sm">Social Media</span>
                    <span className="text-[11px] opacity-80 block mt-0.5">
                      Simulated public report
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSource("municipal_demo")}
                    className={`p-3 text-left border rounded-sm transition-all font-sans text-xs ${
                      selectedSource === "municipal_demo"
                        ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                        : "bg-[#FBFAF7] text-[#161616] border-[#D6CFC3] hover:bg-[#EAE4DA]"
                    }`}
                  >
                    <span className="font-bold block text-sm">Municipal System</span>
                    <span className="text-[11px] opacity-80 block mt-0.5">
                      Simulated external complaint
                    </span>
                  </button>
                </div>
              </div>

              {/* Complaint Text */}
              <div className="space-y-1.5">
                <label className="font-sans text-xs font-semibold text-[#161616] uppercase tracking-wider block">
                  2. Complaint Content
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Describe the civic issue in detail..."
                  rows={4}
                  required
                  minLength={10}
                  maxLength={2000}
                  className="w-full p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-sm text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                />
                <span className="text-[11px] text-[#5D5A55] font-sans block text-right">
                  {rawText.length} / 2000 characters
                </span>
              </div>

              {/* Location Input */}
              <div className="space-y-1.5">
                <label className="font-sans text-xs font-semibold text-[#161616] uppercase tracking-wider block">
                  3. Location Description
                </label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g. Bailey Road, Patna"
                  className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-sm text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                />
              </div>

              {/* Voluntary Submitter Name */}
              <div className="space-y-1.5">
                <label className="font-sans text-xs font-semibold text-[#161616] uppercase tracking-wider block">
                  4. Submitter Identity (Optional)
                </label>
                <input
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="e.g. Resident / Citizen Reporter"
                  className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-sm text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                />
              </div>

              {error && (
                <div className="p-3 bg-[#EAE4DA] border border-[#292724] text-[#161616] text-xs font-semibold rounded-sm">
                  ⚠️ Unable to Process Complaint: {error}
                </div>
              )}

              <Button
                type="submit"
                variant="dark"
                size="lg"
                disabled={isSubmitting || rawText.trim().length < 10}
                className="w-full justify-center text-sm font-semibold tracking-wider uppercase"
              >
                {isSubmitting ? "Processing Pipeline..." : "Simulate Incoming Complaint"}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: 6-Agent Processing Pipeline & Result Output (~40%) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 6-Agent Pipeline Visualization */}
          <Card variant="secondary" padding="md" className="border-[#D6CFC3] space-y-3">
            <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
              6-Agent Resolution Pipeline Execution
            </h3>
            <div className="space-y-2 text-xs font-sans">
              {/* 01 Intake Normalization */}
              <div className={`p-2.5 rounded-sm border transition-colors ${
                isSubmitting
                  ? "bg-[#EAE4DA] border-[#B7A58A] text-[#161616]"
                  : result
                  ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                  : "bg-[#FBFAF7] border-[#D6CFC3] text-[#5D5A55]"
              }`}>
                <div className="font-bold">01 Intake Normalizer</div>
                <div className="text-[11px] opacity-90">
                  {isSubmitting
                    ? "Sanitizing input & stamping source..."
                    : result
                    ? `Normalized — Channel: ${getSourceDisplayTitle(result.source || selectedSource)}`
                    : "Waiting for signal"}
                </div>
              </div>

              {/* 02 Intelligence Agent */}
              <div className={`p-2.5 rounded-sm border transition-colors ${
                isSubmitting
                  ? "bg-[#EAE4DA] border-[#B7A58A] text-[#161616]"
                  : result
                  ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                  : "bg-[#FBFAF7] border-[#D6CFC3] text-[#5D5A55]"
              }`}>
                <div className="font-bold">02 Intelligence Classification</div>
                <div className="text-[11px] opacity-90">
                  {isSubmitting
                    ? "Running LLM classification..."
                    : result
                    ? `Classified — ${result.category_name || "Uncategorized"} (${result.is_safety_risk ? "Safety Hazard Flagged" : "Standard Risk"})`
                    : "Waiting"}
                </div>
              </div>

              {/* 03 Priority Agent */}
              <div className={`p-2.5 rounded-sm border transition-colors ${
                isSubmitting
                  ? "bg-[#EAE4DA] border-[#B7A58A] text-[#161616]"
                  : result
                  ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                  : "bg-[#FBFAF7] border-[#D6CFC3] text-[#5D5A55]"
              }`}>
                <div className="font-bold">03 Priority Calculator</div>
                <div className="text-[11px] opacity-90">
                  {isSubmitting
                    ? "Evaluating score formula..."
                    : result
                    ? `Scored — Priority ${result.priority.toUpperCase()} (${result.priority_score ?? 0}/100)`
                    : "Waiting"}
                </div>
              </div>

              {/* 04 Routing Agent */}
              <div className={`p-2.5 rounded-sm border transition-colors ${
                isSubmitting
                  ? "bg-[#EAE4DA] border-[#B7A58A] text-[#161616]"
                  : result
                  ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                  : "bg-[#FBFAF7] border-[#D6CFC3] text-[#5D5A55]"
              }`}>
                <div className="font-bold">04 Department Router</div>
                <div className="text-[11px] opacity-90">
                  {isSubmitting
                    ? "Matching department rules..."
                    : result
                    ? `Routed — ${result.department_name || "Unassigned"}`
                    : "Waiting"}
                </div>
              </div>

              {/* 05 Resolution & SLA Agent */}
              <div className={`p-2.5 rounded-sm border transition-colors ${
                isSubmitting
                  ? "bg-[#EAE4DA] border-[#B7A58A] text-[#161616]"
                  : result
                  ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                  : "bg-[#FBFAF7] border-[#D6CFC3] text-[#5D5A55]"
              }`}>
                <div className="font-bold">05 SLA &amp; Lifecycle Agent</div>
                <div className="text-[11px] opacity-90">
                  {isSubmitting
                    ? "Establishing SLA target..."
                    : result
                    ? `Registered — Tracking ID ${result.tracking_id}`
                    : "Waiting"}
                </div>
              </div>

              {/* 06 City Intelligence Agent */}
              <div className={`p-2.5 rounded-sm border transition-colors ${
                isSubmitting
                  ? "bg-[#EAE4DA] border-[#B7A58A] text-[#161616]"
                  : result
                  ? "bg-[#292724] text-[#FBFAF7] border-[#161616]"
                  : "bg-[#FBFAF7] border-[#D6CFC3] text-[#5D5A55]"
              }`}>
                <div className="font-bold">06 City Intelligence Indexer</div>
                <div className="text-[11px] opacity-90">
                  {isSubmitting
                    ? "Updating city metrics..."
                    : result
                    ? "Indexed into spatial hotspot analytics"
                    : "Waiting"}
                </div>
              </div>
            </div>
          </Card>

          {/* Structured Ingestion Result Summary */}
          {result && (
            <Card variant="primary" padding="lg" className="border-[#292724] space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-3">
                <span className="font-sans text-xs font-bold tracking-widest text-[#B7A58A] uppercase">
                  Processing Complete
                </span>
                <Badge variant="assigned">
                  {getSourceDisplayTitle(result.source || selectedSource)}
                </Badge>
              </div>

              <div className="space-y-2 font-sans text-xs">
                <div className="flex justify-between py-1 border-b border-[#D6CFC3]/60">
                  <span className="text-[#5D5A55]">Tracking ID</span>
                  <span className="font-mono font-bold text-[#161616] text-sm">
                    {result.tracking_id}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#D6CFC3]/60">
                  <span className="text-[#5D5A55]">AI Classification</span>
                  <span className="font-semibold text-[#161616] text-right max-w-[200px]">
                    {result.category_name || "Uncategorized"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#D6CFC3]/60">
                  <span className="text-[#5D5A55]">Severity &amp; Risk</span>
                  <span className="font-semibold text-[#161616]">
                    {result.is_safety_risk ? "High Severity (Safety Risk)" : "Standard Severity"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#D6CFC3]/60">
                  <span className="text-[#5D5A55]">Priority Level</span>
                  <span className="font-bold text-[#161616] uppercase">
                    {result.priority} ({result.priority_score ?? 0}/100)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#D6CFC3]/60">
                  <span className="text-[#5D5A55]">Responsible Department</span>
                  <span className="font-medium text-[#161616]">
                    {result.department_name || "Unassigned"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5D5A55]">SLA Resolution Target</span>
                  <span className="font-medium text-[#161616]">
                    {result.sla_deadline
                      ? new Date(result.sla_deadline).toLocaleString()
                      : "Standard SLA Target"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#D6CFC3] flex flex-col sm:flex-row gap-2">
                <Link href={`/dashboard/complaints/${result.id}`} className="flex-1">
                  <Button variant="dark" size="sm" className="w-full text-xs justify-center">
                    Open Complaint →
                  </Button>
                </Link>
                <Link href="/dashboard/complaints" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs justify-center">
                    View in Queue →
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

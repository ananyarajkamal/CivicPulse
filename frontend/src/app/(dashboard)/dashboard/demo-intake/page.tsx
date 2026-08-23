"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import {
  submitDemoComplaintApi,
  fetchRedditCivicFeedApi,
  triggerDeepScanApi,
  getAgentStatusApi,
  type DemoComplaintPayload,
  type IngestedSocialItem,
  type AgentStatusResponse,
} from "@/lib/api/staff";
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
    name: "Pothole Report (Social / Reddit)",
    source: "social_demo",
    text: "Several vehicles are slowing down suddenly because of a deep hazardous pothole near Bailey Road.",
    location: "Bailey Road, Patna",
    submitter: "u/patna_commuter",
  },
  {
    name: "Waste Overflow (Reddit / Social)",
    source: "social_demo",
    text: "Garbage has been overflowing near the main market for three days and is blocking part of the pedestrian walkway.",
    location: "Main Market Road, Patna",
    submitter: "u/CleanCityPatna",
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

  // Reddit & Autonomous Ingestion state
  const [isFetchingReddit, setIsFetchingReddit] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [redditSubreddit, setRedditSubreddit] = useState("patna");
  const [redditIngestedItems, setRedditIngestedItems] = useState<IngestedSocialItem[]>([]);
  const [redditSuccessMsg, setRedditSuccessMsg] = useState<string | null>(null);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);

  const handleFetchReddit = useCallback(async () => {
    setIsFetchingReddit(true);
    setRedditSuccessMsg(null);
    setError(null);
    try {
      const res = await fetchRedditCivicFeedApi(redditSubreddit.trim() || "patna");
      setRedditIngestedItems(res.items);
      setLastScanTime(new Date().toLocaleTimeString());
      setRedditSuccessMsg(
        `Ingestion Agent scanned r/${redditSubreddit.trim() || "patna"} and synced ${res.ingested_count} civic items.`
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch from Reddit.");
      } else {
        setError("Failed to fetch from Reddit.");
      }
    } finally {
      setIsFetchingReddit(false);
    }
  }, [redditSubreddit]);

  const handleDeepScan = async () => {
    setIsDeepScanning(true);
    setRedditSuccessMsg(null);
    setError(null);
    try {
      const res = await triggerDeepScanApi();
      setRedditIngestedItems(res.items);
      setLastScanTime(new Date().toLocaleTimeString());
      setRedditSuccessMsg(
        `Deep Multi-City Sweep Complete: Scanned 5 major Indian metros (Delhi, Bengaluru, Mumbai, Hyderabad, Patna) and synced ${res.total_ingested} civic complaints.`
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Deep scan failed.");
      } else {
        setError("Deep scan failed.");
      }
    } finally {
      setIsDeepScanning(false);
    }
  };

  useEffect(() => {
    getAgentStatusApi().then(setAgentStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (!autoScanEnabled) return;
    const interval = setInterval(() => {
      handleFetchReddit();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoScanEnabled, handleFetchReddit]);



  // Role guard: Social Ingestion Agent is an administrative tool
  if (user && user.role !== "admin") {
    return (
      <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-4 text-center py-16">
        <h2 className="font-serif-civic text-2xl font-bold text-[#161616]">
          Admin Access Required
        </h2>
        <p className="font-sans text-sm text-[#5D5A55] max-w-md mx-auto">
          The Social &amp; Ingestion Control Center is managed by Municipal Administrators. Department officers manage active complaints in their queue.
        </p>
        <div className="pt-2">
          <Link href="/dashboard">
            <Button variant="dark" size="sm">
              Return to Operations Dashboard
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
        <div className="mt-3 p-3.5 bg-[#EAE4DA]/60 border border-[#B7A58A]/50 rounded-sm text-xs font-sans text-[#161616]">
          <p className="leading-relaxed">
            <strong>Simulation Environment:</strong> WhatsApp, Social Media, and Municipal System are simulated integration adapters. The Web Portal is the live citizen intake channel in this deployment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Presets (~60%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Reddit & Social Feed Ingestion Agent Card */}
          <Card variant="primary" padding="md" className="border-[#B7A58A] shadow-civic space-y-4 bg-[#FBFAF7]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D6CFC3] pb-3">
              <div>
                <span className="font-sans text-[10px] font-bold tracking-widest text-[#B7A58A] uppercase">
                  AGENT 1: AUTONOMOUS CIVIC SENTINEL
                </span>
                <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                  Live Reddit &amp; Social Ingestion Agent
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  Auto-Agent: Active (60s Cycle)
                </span>
              </div>
            </div>

            <p className="font-sans text-xs text-[#5D5A55] leading-relaxed">
              Continuously monitors Indian civic communities on Reddit (e.g. <code>r/delhi</code>, <code>r/bangalore</code>, <code>r/mumbai</code>, <code>r/hyderabad</code>, <code>r/patna</code>). Every 60 seconds, the agent scans for civic distress posts, extracts locations, and runs them through AI Classification &amp; Priority Scoring.
            </p>

            {agentStatus && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans text-[#5D5A55] bg-[#F5F1E8] px-3 py-1.5 rounded-sm border border-[#D6CFC3]">
                <span className="font-semibold text-[#161616]">Monitored Regions:</span>
                {agentStatus.monitored_regions.map((reg) => (
                  <span key={reg} className="bg-[#EAE4DA] px-1.5 py-0.5 rounded text-[10px] text-[#292724] font-mono">
                    {reg}
                  </span>
                ))}
              </div>
            )}

            {/* Instant Multi-City Deep Sweep Button */}
            <div className="p-3.5 bg-[#F5F1E8] border border-[#D6CFC3] rounded-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-sans text-xs font-bold text-[#161616]">
                      Autonomous Multi-Stream AI Sweep (All India)
                    </h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                      0 API Keys Needed
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-[#5D5A55] mt-0.5">
                    Simultaneously sweeps <strong>Reddit</strong>, <strong>Google News India Civic RSS</strong>, and <strong>OpenStreetMap Infrastructure Notes</strong> across Delhi, Bengaluru, Mumbai, Hyderabad, and Patna.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="dark"
                  size="sm"
                  onClick={handleDeepScan}
                  disabled={isDeepScanning || isFetchingReddit}
                  className="whitespace-nowrap font-medium text-xs bg-[#161616] text-[#FBFAF7] hover:bg-[#292724]"
                >
                  {isDeepScanning ? "Aggregating Open Civic Streams..." : "Run Multi-Stream Deep Sweep"}
                </Button>
              </div>
            </div>

            {/* Single Subreddit Selector */}
            <div className="space-y-1.5 pt-1">
              <span className="font-sans text-[10px] font-semibold text-[#5D5A55] uppercase tracking-wider block">
                Target Specific City Subreddit:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "r/delhi (NCR)", value: "delhi" },
                  { label: "r/bangalore (Karnataka)", value: "bangalore" },
                  { label: "r/mumbai (Maharashtra)", value: "mumbai" },
                  { label: "r/hyderabad (Telangana)", value: "hyderabad" },
                  { label: "r/patna (Bihar)", value: "patna" },
                  { label: "r/bihar (State)", value: "bihar" },
                  { label: "r/india (National)", value: "india" },
                ].map((sub) => (
                  <button
                    key={sub.value}
                    type="button"
                    onClick={() => setRedditSubreddit(sub.value)}
                    className={`px-2.5 py-1 rounded-xs font-sans text-xs transition-colors border ${
                      redditSubreddit.toLowerCase() === sub.value
                        ? "bg-[#292724] text-[#FBFAF7] border-[#161616] font-semibold"
                        : "bg-[#FBFAF7] text-[#5D5A55] border-[#D6CFC3] hover:bg-[#EAE4DA]"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center bg-[#F5F1E8] border border-[#D6CFC3] rounded-sm px-3 py-1.5 flex-1">
                <span className="font-sans text-xs text-[#5D5A55] mr-1">reddit.com/r/</span>
                <input
                  type="text"
                  value={redditSubreddit}
                  onChange={(e) => setRedditSubreddit(e.target.value)}
                  placeholder="delhi"
                  className="bg-transparent font-sans text-xs font-semibold text-[#161616] focus:outline-none w-full"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchReddit}
                disabled={isFetchingReddit || isDeepScanning}
                className="whitespace-nowrap font-medium text-xs border-[#5D5A55]"
              >
                {isFetchingReddit ? `Scanning r/${redditSubreddit}...` : `Poll r/${redditSubreddit}`}
              </Button>
            </div>

            {/* Continuous Background Polling Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#F5F1E8] border border-[#D6CFC3] rounded-sm text-xs font-sans">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    autoScanEnabled ? "bg-[#2E7D32] animate-ping" : "bg-[#7D7871]"
                  }`}
                />
                <span className="font-semibold text-[#161616]">
                  {autoScanEnabled ? "Continuous Auto-Scanner Active" : "Auto-Scanner Standby"}
                </span>
                {lastScanTime && (
                  <span className="text-[#5D5A55] text-[11px]">
                    (Last scanned: {lastScanTime})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setAutoScanEnabled(!autoScanEnabled)}
                className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors ${
                  autoScanEnabled
                    ? "bg-[#292724] text-[#FBFAF7]"
                    : "bg-[#EAE4DA] text-[#161616] hover:bg-[#D6CFC3]"
                }`}
              >
                {autoScanEnabled ? "Stop Auto-Scan" : "Enable Auto-Scan (30s)"}
              </button>
            </div>

            {redditSuccessMsg && (
              <div className="p-3 bg-[#EAE4DA] border border-[#B7A58A] rounded-sm text-xs font-sans text-[#161616]">
                <p className="font-semibold">{redditSuccessMsg}</p>
              </div>
            )}

            {redditIngestedItems.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="font-sans text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider block">
                  Recently Ingested Live Reports ({redditIngestedItems.length})
                </span>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {redditIngestedItems.map((item, idx) => {
                    const isNews = item.platform.toLowerCase().includes("google news") || item.platform.toLowerCase().includes("news");
                    const isOsm = item.platform.toLowerCase().includes("openstreetmap") || item.platform.toLowerCase().includes("osm");
                    const isReddit = item.platform.toLowerCase().includes("reddit");

                    const linkText = isNews
                      ? "Read on Google News ↗"
                      : isOsm
                      ? "View on OpenStreetMap ↗"
                      : isReddit
                      ? "View Original Reddit Post ↗"
                      : "View Source Report ↗";

                    const badgeColor = isNews
                      ? "bg-sky-100 text-sky-800 border-sky-300"
                      : isOsm
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-amber-100 text-amber-800 border-amber-300";

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-[#F5F1E8] border border-[#D6CFC3] rounded-sm space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                              {item.platform}
                            </span>
                            <span className="font-sans text-[11px] font-bold text-[#161616]">
                              {item.handle}
                            </span>
                          </div>
                          <Badge variant="neutral">
                            {item.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="font-sans text-xs text-[#161616] leading-relaxed">
                          {item.title}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans text-[#5D5A55] pt-1 border-t border-[#D6CFC3]/60">
                          <span>Assigned Dept: <strong>{item.department}</strong></span>
                          <div className="flex items-center gap-3">
                            {item.post_url && (
                              <a
                                href={item.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-[#292724] underline hover:text-[#9E524D]"
                              >
                                {linkText}
                              </a>
                            )}
                            <Link
                              href={`/track/${item.tracking_id}`}
                              target="_blank"
                              className="font-mono text-[#B7A58A] hover:underline"
                            >
                              {item.tracking_id} &rarr;
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

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
                  Unable to Process Complaint: {error}
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
                    ? `Normalized: Channel: ${getSourceDisplayTitle(result.source || selectedSource)}`
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
                    ? `Classified: ${result.category_name || "Uncategorized"} (${result.is_safety_risk ? "Safety Hazard Flagged" : "Standard Risk"})`
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
                    ? `Scored: Priority ${result.priority.toUpperCase()} (${result.priority_score ?? 0}/100)`
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
                    ? `Routed: ${result.department_name || "Unassigned"}`
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
                    ? `Registered: Tracking ID ${result.tracking_id}`
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
                    Open Complaint
                  </Button>
                </Link>
                <Link href="/dashboard/complaints" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs justify-center">
                    View in Queue
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

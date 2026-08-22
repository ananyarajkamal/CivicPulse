"use client";

import React, { useEffect, useState } from "react";
import AIDetailPanel from "@/components/dashboard/AIDetailPanel";
import AnalyticsPanel from "@/components/dashboard/AnalyticsPanel";
import InternalCommentsPanel from "@/components/dashboard/InternalCommentsPanel";
import KPICards from "@/components/dashboard/KPICards";
import RelatedComplaintsPanel from "@/components/dashboard/RelatedComplaintsPanel";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LockIcon, TrackingIcon } from "@/components/ui/Icons";
import {
  fetchAnalyticsHotspotsApi,
  fetchAnalyticsSummaryApi,
  fetchAnalyticsTrendsApi,
} from "@/lib/api/analytics";
import {
  addInternalCommentApi,
  assignComplaintOfficerApi,
  fetchInternalCommentsApi,
  fetchKpisApi,
  fetchRelatedComplaintsApi,
  fetchStaffComplaintDetailApi,
  updateComplaintStatusApi,
} from "@/lib/api/staff";
import { useAuthStore } from "@/store/authStore";
import type {
  AnalyticsSummaryResponse,
  HotspotClusterItem,
  TrendDataPoint,
} from "@/types/analytics";
import type {
  CommentResponse,
  KPIResponse,
  RelatedComplaintResponse,
  StaffComplaintDetailResponse,
} from "@/types/staff_complaint";

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

export default function DashboardHome() {
  const { user, accessToken } = useAuthStore();
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [analyticsTrends, setAnalyticsTrends] = useState<TrendDataPoint[]>([]);
  const [analyticsHotspots, setAnalyticsHotspots] = useState<HotspotClusterItem[]>([]);
  const [complaintIdInput, setComplaintIdInput] = useState("");
  const [complaint, setComplaint] = useState<StaffComplaintDetailResponse | null>(null);
  const [relatedComplaints, setRelatedComplaints] = useState<RelatedComplaintResponse[]>([]);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [officerIdInput, setOfficerIdInput] = useState("");

  useEffect(() => {
    if (accessToken) {
      fetchKpisApi(accessToken).then(setKpis).catch(() => null);
      fetchAnalyticsSummaryApi(accessToken).then(setAnalyticsSummary).catch(() => null);
      fetchAnalyticsTrendsApi(30, accessToken).then(setAnalyticsTrends).catch(() => []);
      fetchAnalyticsHotspotsApi(accessToken).then(setAnalyticsHotspots).catch(() => []);
    }
  }, [accessToken]);

  const handleSearchDetail = async (e?: React.FormEvent, targetId?: string) => {
    if (e) e.preventDefault();
    const idToFetch = targetId || complaintIdInput.trim();
    if (!idToFetch || !accessToken) return;

    setLoading(true);
    setError(null);
    setActionSuccess(null);
    try {
      const data = await fetchStaffComplaintDetailApi(idToFetch, accessToken);
      setComplaint(data);

      const relatedData = await fetchRelatedComplaintsApi(idToFetch, accessToken).catch(() => []);
      setRelatedComplaints(relatedData);

      const commentsData = await fetchInternalCommentsApi(idToFetch, accessToken).catch(() => []);
      setComments(commentsData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch complaint detail.");
      }
      setComplaint(null);
      setRelatedComplaints([]);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (toStatus: string) => {
    if (!complaint || !accessToken) return;
    try {
      const updated = await updateComplaintStatusApi(complaint.id, toStatus, undefined, accessToken);
      setComplaint(updated);
      setActionSuccess(`Status successfully updated to ${toStatus.replace("_", " ")}`);
      if (accessToken) fetchKpisApi(accessToken).then(setKpis).catch(() => null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !officerIdInput.trim() || !accessToken) return;
    try {
      const updated = await assignComplaintOfficerApi(complaint.id, officerIdInput.trim(), accessToken);
      setComplaint(updated);
      setOfficerIdInput("");
      setActionSuccess("Officer assigned successfully");
      if (accessToken) fetchKpisApi(accessToken).then(setKpis).catch(() => null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!complaint || !accessToken) return;
    const newComment = await addInternalCommentApi(complaint.id, content, accessToken);
    setComments((prev) => [...prev, newComment]);
  };

  const getBadgeVariant = (val: string): BadgeVariantType => {
    const s = val.toLowerCase();
    if (["reported", "assigned", "in_progress", "resolved", "critical", "high", "medium", "low"].includes(s)) {
      return s as BadgeVariantType;
    }
    return "neutral";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-10">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6CFC3] pb-6">
        <div>
          <span className="font-sans text-xs font-semibold tracking-widest text-[#5D5A55] uppercase block">
            MUNICIPAL OPERATIONS
          </span>
          <h1 className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616] tracking-tight mt-1">
            Dashboard
          </h1>
          <p className="font-sans text-sm text-[#5D5A55] mt-1">
            Monitor complaints, service performance, and resolution progress across municipal departments.
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="font-serif-civic text-lg font-bold text-[#161616]">
            {user?.full_name}
          </div>
          <div className="font-sans text-xs text-[#5D5A55]">{formattedDate}</div>
        </div>
      </div>

      {/* KPI Cards Section */}
      <section className="space-y-3">
        <h2 className="font-serif-civic text-xl font-bold text-[#161616]">
          Operational Overview
        </h2>
        <KPICards kpis={kpis} />
      </section>

      {/* Complaint Inspection Workspace */}
      <section id="queue" className="space-y-6">
        <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-4">
          <div className="flex items-center gap-2">
            <TrackingIcon className="w-5 h-5 text-[#292724]" />
            <h2 className="font-serif-civic text-2xl font-bold text-[#161616]">
              Inspect Complaint &amp; Workflow Workspace
            </h2>
          </div>
          <p className="font-sans text-xs text-[#5D5A55]">
            Enter internal Complaint UUID (e.g.{" "}
            <code className="bg-[#EAE4DA] px-1.5 py-0.5 rounded font-mono text-xs text-[#161616]">
              550e8400-e29b-41d4-a716-446655440000
            </code>
            ) or search tracking queue to load staff workspace.
          </p>

          <form onSubmit={handleSearchDetail} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Complaint UUID..."
              value={complaintIdInput}
              onChange={(e) => setComplaintIdInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
            />
            <Button
              type="submit"
              variant="dark"
              size="md"
              disabled={loading || !complaintIdInput.trim()}
            >
              {loading ? "Loading Workspace..." : "Inspect Workspace →"}
            </Button>
          </form>

          {error && (
            <div className="p-3 bg-[#EAE4DA] border border-[#292724] text-[#161616] text-xs rounded-sm font-semibold">
              {error}
            </div>
          )}
          {actionSuccess && (
            <div className="p-3 bg-[#FBFAF7] border border-[#B7A58A] text-[#161616] text-xs rounded-sm font-semibold">
              ✓ {actionSuccess}
            </div>
          )}
        </Card>

        {/* Detailed Workspace Layout (~65% Left / ~35% Right) */}
        {complaint && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left / Main Workspace Column (~65%) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Complaint Overview Card */}
              <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D6CFC3] pb-4">
                  <div>
                    <span className="font-mono text-xs text-[#5D5A55] block">
                      UUID: {complaint.id}
                    </span>
                    <h3 className="font-serif-civic text-2xl font-bold text-[#161616] mt-1">
                      {complaint.title || "Citizen Complaint Record"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getBadgeVariant(complaint.status)}>
                      {complaint.status.replace("_", " ")}
                    </Badge>
                    <Badge variant={getBadgeVariant(complaint.priority)}>
                      {complaint.priority} Priority
                    </Badge>
                  </div>
                </div>

                {/* Submitter Raw Text & Staff-Only Contact Info */}
                <div className="p-4 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-3 font-sans text-xs text-[#161616]">
                  <div>
                    <span className="font-semibold text-[#5D5A55] block uppercase tracking-wider mb-1">
                      Raw Citizen Report Text:
                    </span>
                    <p className="leading-relaxed text-sm bg-[#FBFAF7] p-3 rounded border border-[#D6CFC3]">
                      &quot;{complaint.raw_text}&quot;
                    </p>
                  </div>

                  {(complaint.submitter_name || complaint.submitter_contact) && (
                    <div className="pt-2 border-t border-[#D6CFC3] space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider">
                        <LockIcon className="w-3.5 h-3.5 text-[#292724]" />
                        <span>Confidential Submitter Info (Staff Only)</span>
                      </div>
                      {complaint.submitter_name && (
                        <p>Name: <strong>{complaint.submitter_name}</strong></p>
                      )}
                      {complaint.submitter_contact && (
                        <p>Contact: <strong>{complaint.submitter_contact}</strong></p>
                      )}
                    </div>
                  )}
                </div>

                {/* Resolution Workflow & Status Transition Controls */}
                <div className="pt-4 border-t border-[#D6CFC3] space-y-4">
                  <h4 className="font-serif-civic text-lg font-bold text-[#161616]">
                    Resolution Workflow Controls
                  </h4>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-xs font-semibold text-[#5D5A55] uppercase tracking-wider mr-2">
                      Update Status:
                    </span>
                    {["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((st) => (
                      <Button
                        key={st}
                        variant={complaint.status === st ? "dark" : "outline"}
                        size="sm"
                        onClick={() => handleStatusUpdate(st)}
                        disabled={complaint.status === st}
                        className="text-xs"
                      >
                        Set {st.replace("_", " ")}
                      </Button>
                    ))}
                  </div>

                  {/* Officer Assignment Form */}
                  <form onSubmit={handleAssignOfficer} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                    <span className="font-sans text-xs font-semibold text-[#5D5A55] uppercase tracking-wider shrink-0">
                      Officer Assignment:
                    </span>
                    <input
                      type="text"
                      placeholder="Officer User UUID..."
                      value={officerIdInput}
                      onChange={(e) => setOfficerIdInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-mono text-xs text-[#161616]"
                    />
                    <Button
                      type="submit"
                      variant="dark"
                      size="sm"
                      disabled={!officerIdInput.trim()}
                    >
                      Assign Officer
                    </Button>
                  </form>
                </div>
              </Card>

              {/* Internal Comments Panel */}
              <InternalCommentsPanel comments={comments} onAddComment={handleAddComment} />
            </div>

            {/* Right Sidebar Column (~35%) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Priority & SLA Summary Card */}
              <Card variant="secondary" padding="md" className="border-[#D6CFC3] space-y-3">
                <h4 className="font-serif-civic text-lg font-bold text-[#161616]">
                  Priority &amp; SLA Status
                </h4>
                <div className="space-y-2 font-sans text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-[#D6CFC3]/60">
                    <span className="text-[#5D5A55]">Priority Tier</span>
                    <Badge variant={getBadgeVariant(complaint.priority)}>
                      {complaint.priority}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#D6CFC3]/60">
                    <span className="text-[#5D5A55]">Priority Score</span>
                    <span className="font-serif-civic font-bold text-base text-[#161616]">
                      {complaint.priority_score ?? "N/A"} / 100
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#D6CFC3]/60">
                    <span className="text-[#5D5A55]">SLA Deadline</span>
                    <span className="font-medium text-[#161616]">
                      {complaint.sla_deadline
                        ? new Date(complaint.sla_deadline).toLocaleDateString()
                        : "Standard"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#5D5A55]">SLA Breach State</span>
                    {complaint.sla_breached ? (
                      <Badge variant="critical">Breached</Badge>
                    ) : (
                      <Badge variant="resolved">On Track</Badge>
                    )}
                  </div>
                </div>
              </Card>

              {/* AI Detail Intelligence Panel */}
              <AIDetailPanel complaint={complaint} />

              {/* Related Complaints Cluster Panel */}
              <RelatedComplaintsPanel relatedComplaints={relatedComplaints} />
            </div>
          </div>
        )}
      </section>

      {/* City Operational Intelligence Section */}
      <section id="intelligence" className="pt-4">
        <AnalyticsPanel summary={analyticsSummary} trends={analyticsTrends} hotspots={analyticsHotspots} />
      </section>
    </div>
  );
}

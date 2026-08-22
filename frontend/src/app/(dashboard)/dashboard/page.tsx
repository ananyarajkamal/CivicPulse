"use client";

import { useEffect, useState } from "react";
import AIDetailPanel from "@/components/dashboard/AIDetailPanel";
import AnalyticsPanel from "@/components/dashboard/AnalyticsPanel";
import InternalCommentsPanel from "@/components/dashboard/InternalCommentsPanel";
import KPICards from "@/components/dashboard/KPICards";
import RelatedComplaintsPanel from "@/components/dashboard/RelatedComplaintsPanel";
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
      setActionSuccess(`Status updated to ${toStatus}`);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Municipal Operations Dashboard
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Welcome, {user?.full_name} ({user?.role?.replace("_", " ")})
        </p>
      </div>

      {/* KPI Cards */}
      <KPICards kpis={kpis} />

      {/* City Intelligence & Analytics Panel */}
      <AnalyticsPanel summary={analyticsSummary} trends={analyticsTrends} hotspots={analyticsHotspots} />

      {/* Staff ID Lookup Form */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Inspect Complaint & Operational Lifecycle
        </h2>
        <p className="text-xs text-slate-500">
          Enter internal Complaint UUID (e.g. <code>550e8400-e29b-41d4-a716-446655440000</code>)
        </p>

        <form onSubmit={handleSearchDetail} className="flex gap-2">
          <input
            type="text"
            placeholder="Complaint UUID..."
            value={complaintIdInput}
            onChange={(e) => setComplaintIdInput(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            type="submit"
            disabled={loading || !complaintIdInput.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Inspect Detail"}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md font-semibold">
            {error}
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-md font-semibold">
            {actionSuccess}
          </div>
        )}
      </section>

      {/* Complaint Detail & Workflow Actions */}
      {complaint && (
        <section className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-slate-400">UUID: {complaint.id}</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {complaint.title || "Complaint Record"}
                </h2>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase">
                {complaint.status}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-800 space-y-1">
              <div>
                <span className="font-semibold text-slate-700">Raw Text:</span> {complaint.raw_text}
              </div>
              {complaint.submitter_name && (
                <div>
                  <span className="font-semibold text-slate-700">Submitter Name (Staff Only):</span>{" "}
                  {complaint.submitter_name}
                </div>
              )}
              {complaint.submitter_contact && (
                <div>
                  <span className="font-semibold text-slate-700">Submitter Contact (Staff Only):</span>{" "}
                  {complaint.submitter_contact}
                </div>
              )}
            </div>

            {/* Workflow Action Controls */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-700">Update Status:</span>
                {["ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusUpdate(st)}
                    disabled={complaint.status === st}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded border border-slate-300 disabled:opacity-40"
                  >
                    Set {st}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAssignOfficer} className="flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-700">Assign Officer:</span>
                <input
                  type="text"
                  placeholder="Officer User UUID..."
                  value={officerIdInput}
                  onChange={(e) => setOfficerIdInput(e.target.value)}
                  className="px-3 py-1 text-xs border border-slate-300 rounded font-mono text-slate-900 w-64"
                />
                <button
                  type="submit"
                  disabled={!officerIdInput.trim()}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  Assign
                </button>
              </form>
            </div>
          </div>

          <AIDetailPanel complaint={complaint} />
          <RelatedComplaintsPanel relatedComplaints={relatedComplaints} />
          <InternalCommentsPanel comments={comments} onAddComment={handleAddComment} />
        </section>
      )}
    </div>
  );
}

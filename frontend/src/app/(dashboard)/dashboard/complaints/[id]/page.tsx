"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import AIDetailPanel from "@/components/dashboard/AIDetailPanel";
import InternalCommentsPanel from "@/components/dashboard/InternalCommentsPanel";
import RelatedComplaintsPanel from "@/components/dashboard/RelatedComplaintsPanel";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LockIcon } from "@/components/ui/Icons";
import {
  addInternalCommentApi,
  assignComplaintOfficerApi,
  fetchInternalCommentsApi,
  fetchRelatedComplaintsApi,
  fetchStaffComplaintDetailApi,
  updateComplaintStatusApi,
} from "@/lib/api/staff";
import { useAuthStore } from "@/store/authStore";
import type {
  CommentResponse,
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

export default function ComplaintWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { accessToken } = useAuthStore();

  const [complaint, setComplaint] = useState<StaffComplaintDetailResponse | null>(null);
  const [relatedComplaints, setRelatedComplaints] = useState<RelatedComplaintResponse[]>([]);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [officerIdInput, setOfficerIdInput] = useState("");

  useEffect(() => {
    if (!id || !accessToken) return;

    fetchStaffComplaintDetailApi(id, accessToken)
      .then((data) => {
        setComplaint(data);

        fetchRelatedComplaintsApi(id, accessToken).then(setRelatedComplaints).catch(() => []);
        fetchInternalCommentsApi(id, accessToken).then(setComments).catch(() => []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to fetch complaint workspace record.");
        }
        setComplaint(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, accessToken]);

  const handleStatusUpdate = async (toStatus: string) => {
    if (!complaint || !accessToken) return;
    setError(null);
    setActionSuccess(null);

    try {
      const updated = await updateComplaintStatusApi(complaint.id, toStatus, undefined, accessToken);
      setComplaint(updated);
      setActionSuccess(`Status successfully updated to ${toStatus.replace("_", " ")}`);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !officerIdInput.trim() || !accessToken) return;
    setError(null);
    setActionSuccess(null);

    try {
      const updated = await assignComplaintOfficerApi(complaint.id, officerIdInput.trim(), accessToken);
      setComplaint(updated);
      setOfficerIdInput("");
      setActionSuccess("Officer assigned successfully");
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

  return (
    <div className="space-y-8">
      {/* Workspace Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-4">
        <Link
          href="/dashboard/complaints"
          className="font-sans text-xs font-semibold text-[#5D5A55] hover:text-[#161616] flex items-center gap-1"
        >
          ← Back to Complaints Queue
        </Link>
        <span className="font-mono text-xs text-[#5D5A55]">
          Case Reference: {complaint?.tracking_id || id}
        </span>
      </div>

      {loading && (
        <Card variant="primary" padding="lg" className="text-center py-16 space-y-4 shadow-civic">
          <div className="w-8 h-8 border-2 border-[#B7A58A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-sans text-xs font-medium text-[#161616]">
            Loading complaint workspace...
          </p>
        </Card>
      )}

      {error && !loading && (
        <Card variant="primary" padding="lg" className="text-center space-y-4 shadow-civic border-[#D6CFC3]">
          <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
            Unable to Load Workspace
          </h3>
          <p className="font-sans text-sm text-[#5D5A55] max-w-md mx-auto">
            {error}
          </p>
          <Link href="/dashboard/complaints">
            <Button variant="dark" size="sm">
              Return to Complaints Queue
            </Button>
          </Link>
        </Card>
      )}

      {complaint && !loading && (
        <div className="space-y-6">
          {/* Action Success / Error Feedback */}
          {actionSuccess && (
            <div className="p-3.5 bg-[#FBFAF7] border border-[#B7A58A] text-[#161616] text-xs font-semibold rounded-sm">
              ✓ {actionSuccess}
            </div>
          )}

          {/* Main 2-Column Inspection Workspace Layout (~65% Left / ~35% Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left / Main Workspace Column (~65%) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Complaint Overview Card */}
              <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D6CFC3] pb-4">
                  <div>
                    <span className="font-mono text-xs text-[#5D5A55] block">
                      Public Tracking ID: {complaint.tracking_id}
                    </span>
                    <h1 className="font-serif-civic text-2xl sm:text-3xl font-bold text-[#161616] mt-1">
                      {complaint.title || "Citizen Infrastructure Report"}
                    </h1>
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

                  {complaint.location_address && (
                    <div className="pt-2 border-t border-[#D6CFC3]">
                      <span className="font-semibold text-[#5D5A55] block uppercase tracking-wider mb-0.5">
                        Location:
                      </span>
                      <p className="font-medium text-[#161616]">
                        📍 {complaint.location_address}
                      </p>
                    </div>
                  )}

                  {(complaint.submitter_name || complaint.submitter_contact) && (
                    <div className="pt-2 border-t border-[#D6CFC3] space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider">
                        <LockIcon className="w-3.5 h-3.5 text-[#292724]" />
                        <span>Confidential Submitter Info (Authorized Staff Only)</span>
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
                  <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                    Resolution Workflow Controls
                  </h3>

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
                      placeholder="Enter assigned officer ID or email..."
                      value={officerIdInput}
                      onChange={(e) => setOfficerIdInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616]"
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
                <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                  Priority &amp; SLA Status
                </h3>
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
        </div>
      )}
    </div>
  );
}

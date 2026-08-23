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
  fetchOfficersApi,
  fetchRelatedComplaintsApi,
  fetchStaffComplaintDetailApi,
  updateComplaintStatusApi,
  type StaffUserResponse,
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
  const [officers, setOfficers] = useState<StaffUserResponse[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [targetUpdatingStatus, setTargetUpdatingStatus] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    REPORTED: ["ASSIGNED", "IN_PROGRESS", "REJECTED", "CLOSED"],
    ASSIGNED: ["IN_PROGRESS", "RESOLVED", "REJECTED", "CLOSED"],
    IN_PROGRESS: ["RESOLVED", "REJECTED", "CLOSED"],
    RESOLVED: ["CLOSED"],
    REJECTED: [],
    CLOSED: [],
  };

  const getAllowedTransitions = (currentStatus: string): string[] => {
    const norm = currentStatus.toUpperCase();
    return ALLOWED_TRANSITIONS[norm] || [];
  };

  const loadWorkspaceData = () => {
    if (!id || !accessToken) return;

    setLoading(true);
    setError(null);

    fetchStaffComplaintDetailApi(id, accessToken)
      .then((data) => {
        setError(null);
        setComplaint(data);

        fetchRelatedComplaintsApi(id, accessToken).then(setRelatedComplaints).catch(() => []);
        fetchInternalCommentsApi(id, accessToken).then(setComments).catch(() => []);
        fetchOfficersApi(accessToken, data.department_id || undefined)
          .then((officerList) => {
            setOfficers(officerList);
            if (data.assigned_to) {
              setSelectedOfficerId(data.assigned_to);
            }
          })
          .catch(() => []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load complaint details.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!id || !accessToken) return;

    fetchStaffComplaintDetailApi(id, accessToken)
      .then((data) => {
        setError(null);
        setComplaint(data);

        fetchRelatedComplaintsApi(id, accessToken).then(setRelatedComplaints).catch(() => []);
        fetchInternalCommentsApi(id, accessToken).then(setComments).catch(() => []);
        fetchOfficersApi(accessToken, data.department_id || undefined)
          .then((officerList) => {
            setOfficers(officerList);
            if (data.assigned_to) {
              setSelectedOfficerId(data.assigned_to);
            }
          })
          .catch(() => []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load complaint details.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, accessToken]);

  const handleStatusUpdate = async (toStatus: string) => {
    if (!complaint || !accessToken || updatingStatus) return;

    if ((toStatus === "RESOLVED" || toStatus === "CLOSED") && !statusNotes.trim()) {
      setStatusError("A resolution action summary note is required before resolving or closing a complaint.");
      return;
    }

    setUpdatingStatus(true);
    setTargetUpdatingStatus(toStatus);
    setStatusError(null);
    setActionSuccess(null);

    try {
      const updated = await updateComplaintStatusApi(
        complaint.id,
        toStatus,
        statusNotes.trim() || undefined,
        accessToken
      );
      setComplaint(updated);
      setStatusNotes("");
      setActionSuccess(`Complaint status updated to ${toStatus.replace("_", " ")}.`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStatusError(err.message || "Failed to update complaint status.");
      } else {
        setStatusError("Failed to update complaint status. Please try again.");
      }
    } finally {
      setUpdatingStatus(false);
      setTargetUpdatingStatus(null);
    }
  };

  const handleAssignOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !selectedOfficerId.trim() || !accessToken || assigning) return;
    setAssigning(true);
    setAssignError(null);
    setActionSuccess(null);

    try {
      const updated = await assignComplaintOfficerApi(complaint.id, selectedOfficerId.trim(), accessToken);
      setComplaint(updated);
      const assignedOfficerName = officers.find((o) => o.id === selectedOfficerId)?.full_name || "Officer";
      setActionSuccess(`Complaint assigned successfully to ${assignedOfficerName}.`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAssignError(err.message || "Unable to assign this complaint. Please try again.");
      } else {
        setAssignError("Unable to assign this complaint. Please try again.");
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!complaint || !accessToken) return;
    const newComment = await addInternalCommentApi(complaint.id, content, accessToken);
    setComments((prev) => [...prev, newComment]);
  };

  const formatStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case "REPORTED":
        return "Reported";
      case "ASSIGNED":
        return "Assigned";
      case "IN_PROGRESS":
        return "In Progress";
      case "RESOLVED":
        return "Resolved";
      case "CLOSED":
        return "Closed";
      case "REJECTED":
        return "Rejected";
      default:
        return status;
    }
  };

  const formatPriorityLabel = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "Critical Priority";
      case "high":
        return "High Priority";
      case "medium":
        return "Medium Priority";
      case "low":
        return "Low Priority";
      default:
        return `${priority} Priority`;
    }
  };

  const formatActionButtonLabel = (toStatus: string) => {
    switch (toStatus.toUpperCase()) {
      case "ASSIGNED":
        return "Assign Officer";
      case "IN_PROGRESS":
        return "Set In Progress";
      case "RESOLVED":
        return "Mark Resolved";
      case "CLOSED":
        return "Close Complaint";
      case "REJECTED":
        return "Reject Complaint";
      default:
        return `Set ${toStatus.replace("_", " ")}`;
    }
  };

  const getBadgeVariant = (val: string): BadgeVariantType => {
    const s = val.toLowerCase();
    if (["reported", "assigned", "in_progress", "resolved", "critical", "high", "medium", "low"].includes(s)) {
      return s as BadgeVariantType;
    }
    return "neutral";
  };

  const assignedOfficerObj = officers.find((o) => o.id === complaint?.assigned_to);

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
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="dark" size="sm" onClick={loadWorkspaceData}>
              ↻ Retry Connection
            </Button>
            <Link href="/dashboard/complaints">
              <Button variant="outline" size="sm">
                Return to Complaints Queue
              </Button>
            </Link>
          </div>
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

          {assignError && (
            <div className="p-3.5 bg-[#FBFAF7] border border-[#292724] text-[#161616] text-xs font-semibold rounded-sm">
              ⚠️ {assignError}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">
                      {complaint.source === "whatsapp_demo"
                        ? "WhatsApp"
                        : complaint.source === "social_demo"
                        ? "Social Media"
                        : complaint.source === "municipal_demo"
                        ? "Municipal Portal"
                        : "Web Portal"}
                    </Badge>
                    <Badge variant={getBadgeVariant(complaint.status)}>
                      {formatStatusLabel(complaint.status)}
                    </Badge>
                    <Badge variant={getBadgeVariant(complaint.priority)}>
                      {formatPriorityLabel(complaint.priority)}
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

                  {statusError && (
                    <div className="p-3.5 bg-[#EAE4DA] border border-[#292724] text-[#161616] text-xs font-semibold rounded-sm">
                      ⚠️ {statusError}
                    </div>
                  )}

                  {getAllowedTransitions(complaint.status).length > 0 ? (
                    <div className="space-y-4">
                      {/* Officer Assignment Tip */}
                      {!complaint.assigned_to && (
                        <div className="p-2.5 bg-[#EAE4DA]/60 border border-[#B7A58A]/60 text-xs font-sans text-[#161616] rounded-sm">
                          💡 <strong>Officer Assignment Tip:</strong> Select an active officer below to establish clear departmental ownership before advancing case to In Progress.
                        </div>
                      )}

                      {/* Status Notes Input (Placed ABOVE transition buttons) */}
                      <div className="space-y-1">
                        <label className="block font-sans text-xs font-semibold text-[#5D5A55] uppercase tracking-wider">
                          Resolution / Action Summary Note <span className="font-normal text-[#5D5A55] text-[11px]">(Required when setting to Resolved or Closed)</span>
                        </label>
                        <input
                          type="text"
                          value={statusNotes}
                          onChange={(e) => setStatusNotes(e.target.value)}
                          placeholder="e.g. Dispatched maintenance crew to repair pothole and completed final site inspection."
                          disabled={updatingStatus}
                          className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                        />
                      </div>

                      {/* Allowed Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="font-sans text-xs font-semibold text-[#5D5A55] uppercase tracking-wider mr-1">
                          Action:
                        </span>
                        {getAllowedTransitions(complaint.status).map((st) => (
                          <Button
                            key={st}
                            variant={st === "RESOLVED" || st === "CLOSED" ? "dark" : "outline"}
                            size="sm"
                            onClick={() => handleStatusUpdate(st)}
                            disabled={updatingStatus}
                            className="text-xs"
                          >
                            {updatingStatus && targetUpdatingStatus === st
                              ? "Updating..."
                              : formatActionButtonLabel(st)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#EAE4DA]/80 border border-[#D6CFC3] rounded-sm space-y-3 font-sans text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#161616] text-sm uppercase tracking-wider">
                          Workflow Complete
                        </span>
                        <Badge
                          variant={
                            complaint.status.toUpperCase() === "REJECTED"
                              ? "critical"
                              : "resolved"
                          }
                        >
                          {formatStatusLabel(complaint.status)}
                        </Badge>
                      </div>
                      <p className="text-[#5D5A55] leading-relaxed">
                        This complaint is in terminal status and no further workflow actions are available.
                      </p>
                      {complaint.resolution_notes && (
                        <div className="border-t border-[#D6CFC3] pt-2">
                          <span className="font-semibold text-[#5D5A55] block mb-0.5">
                            {complaint.status.toUpperCase() === "REJECTED"
                              ? "Rejection Reason:"
                              : "Resolution Action Summary:"}
                          </span>
                          <p className="text-[#161616] font-medium italic bg-[#FBFAF7] p-2 rounded-xs border border-[#D6CFC3]">
                            &quot;{complaint.resolution_notes}&quot;
                          </p>
                        </div>
                      )}
                      {complaint.resolved_at && (
                        <div className="flex flex-wrap justify-between items-center text-[11px] text-[#5D5A55] border-t border-[#D6CFC3] pt-1.5 gap-1">
                          <span>
                            {complaint.status.toUpperCase() === "REJECTED"
                              ? "Rejected By:"
                              : "Completed By:"}{" "}
                            <strong>
                              {assignedOfficerObj?.full_name || "Municipal Officer"}
                            </strong>
                          </span>
                          <span>
                            Completed At:{" "}
                            <strong>
                              {new Date(complaint.resolved_at).toLocaleString()}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Officer Assignment Form — Available only for active complaints */}
                  {getAllowedTransitions(complaint.status).length > 0 && (
                    <form
                      onSubmit={handleAssignOfficer}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2"
                    >
                      <span className="font-sans text-xs font-semibold text-[#5D5A55] uppercase tracking-wider shrink-0">
                        Officer Assignment:
                      </span>
                      <select
                        value={selectedOfficerId}
                        onChange={(e) => setSelectedOfficerId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                      >
                        <option value="">Select Municipal Officer...</option>
                        {(complaint?.department_id
                          ? officers.filter(
                              (off) =>
                                !off.department_id ||
                                off.department_id === complaint.department_id
                            )
                          : officers
                        ).map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.full_name} ({off.email})
                          </option>
                        ))}
                      </select>
                      <Button
                        type="submit"
                        variant="dark"
                        size="sm"
                        disabled={!selectedOfficerId.trim() || assigning}
                      >
                        {assigning ? "Assigning..." : "Assign Officer"}
                      </Button>
                    </form>
                  )}
                </div>
              </Card>

              {/* Internal Comments Panel */}
              <InternalCommentsPanel comments={comments} onAddComment={handleAddComment} />
            </div>

            {/* Right Sidebar Column (~35%) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Officer Assignment Card */}
              <Card variant="secondary" padding="md" className="border-[#D6CFC3] space-y-3">
                <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                  Assigned Municipal Officer
                </h3>
                {complaint.assigned_to ? (
                  <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1.5 text-xs font-sans">
                    <span className="font-semibold text-[#161616] block text-sm">
                      {assignedOfficerObj?.full_name || "Assigned Officer"}
                    </span>
                    {assignedOfficerObj?.email && (
                      <p className="text-[#5D5A55]">{assignedOfficerObj.email}</p>
                    )}
                    {complaint.department_name && (
                      <p className="text-[#5D5A55] font-medium">
                        Dept: {complaint.department_name}
                      </p>
                    )}
                    {complaint.timeline.find((t) => t.status.toLowerCase() === "assigned") && (
                      <p className="text-[#5D5A55] text-[11px] border-t border-[#D6CFC3] pt-1">
                        Assigned on: {new Date(complaint.timeline.find((t) => t.status.toLowerCase() === "assigned")!.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="font-sans text-xs text-[#5D5A55] italic">
                    Unassigned. Use the assignment control to select an active municipal officer.
                  </p>
                )}
              </Card>

              {/* Citizen Communication Card */}
              <Card variant="secondary" padding="md" className="border-[#D6CFC3] space-y-3">
                <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                  Citizen Communication
                </h3>
                <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-2 text-xs font-sans">
                  {complaint.submitter_contact && /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(complaint.submitter_contact.trim()) ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#161616]">Email Updates:</span>
                        <span className="bg-[#EAE4DA] text-[#292724] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#B7A58A]">
                          Enabled
                        </span>
                      </div>
                      <p className="font-mono text-xs text-[#161616] truncate">
                        {complaint.submitter_contact}
                      </p>
                      <p className="text-[#5D5A55] text-[11px] pt-1">
                        Automatic status notifications dispatched upon workflow transitions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#161616]">Email Updates:</span>
                        <span className="bg-[#EAE4DA] text-[#5D5A55] text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#D6CFC3]">
                          Unavailable
                        </span>
                      </div>
                      <p className="text-[#5D5A55] text-[11px] pt-1">
                        Reason: {complaint.source && complaint.source !== "web" ? "Channel notifications unavailable for simulated source" : "No citizen email address supplied"}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Resolution Accountability Card (Visible when resolved/closed or resolution notes exist) */}
              {(complaint.resolved_at || complaint.resolution_notes) && (
                <Card variant="secondary" padding="md" className="border-[#D6CFC3] space-y-3">
                  <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                    Officer-Reported Resolution Summary
                  </h3>
                  <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-2 text-xs font-sans">
                    <div className="flex justify-between items-center border-b border-[#D6CFC3] pb-1.5">
                      <span className="text-[#5D5A55] font-semibold">Lifecycle Status:</span>
                      <Badge variant={getBadgeVariant(complaint.status)}>
                        {formatStatusLabel(complaint.status)}
                      </Badge>
                    </div>

                    {complaint.resolved_at && (
                      <div>
                        <span className="text-[#5D5A55] font-semibold block">Resolved At:</span>
                        <p className="font-serif-civic font-bold text-sm text-[#161616]">
                          {new Date(complaint.resolved_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {complaint.resolution_notes && (
                      <div className="border-t border-[#D6CFC3] pt-1.5">
                        <span className="text-[#5D5A55] font-semibold block mb-0.5">
                          {complaint.status.toUpperCase() === "REJECTED" ? "Rejection Reason:" : "Resolution Action Summary (Officer-Reported):"}
                        </span>
                        <p className="text-[#161616] leading-relaxed italic bg-[#EAE4DA]/40 p-2 rounded-xs border border-[#D6CFC3]">
                          &quot;{complaint.resolution_notes}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Staff Audit Timeline Card */}
              {complaint.timeline && complaint.timeline.length > 0 && (
                <Card variant="secondary" padding="md" className="border-[#D6CFC3] space-y-3">
                  <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                    Status Audit History ({complaint.timeline.length})
                  </h3>
                  <div className="space-y-2 text-xs font-sans">
                    {complaint.timeline.map((entry, idx) => (
                      <div
                        key={`${entry.status}-${entry.timestamp}-${idx}`}
                        className="p-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <Badge variant={getBadgeVariant(entry.status)}>
                            {entry.status.replace("_", " ")}
                          </Badge>
                          <span className="text-[10px] text-[#5D5A55] font-mono">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5D5A55]">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

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

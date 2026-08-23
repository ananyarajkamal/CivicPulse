"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AIDetailPanel from "@/components/dashboard/AIDetailPanel";
import InternalCommentsPanel from "@/components/dashboard/InternalCommentsPanel";
import RelatedComplaintsPanel from "@/components/dashboard/RelatedComplaintsPanel";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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

type WorkflowActionType =
  | null
  | "assign"
  | "in_progress"
  | "resolve"
  | "reject"
  | "close"
  | "reopen";

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
  const [loading, setLoading] = useState(Boolean(id && accessToken));
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Workflow Contextual Form State
  const [selectedAction, setSelectedAction] = useState<WorkflowActionType>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("Duplicate Complaint");
  const [actionNotes, setActionNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingAction, setUpdatingAction] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleCopyLocation = () => {
    if (!complaint) return;
    const locText = complaint.location_address || complaint.location_text || "Municipal Jurisdiction";
    navigator.clipboard.writeText(locText);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  const handleShareLocation = () => {
    if (!complaint) return;
    const locText = complaint.location_address || complaint.location_text || "Municipal Jurisdiction";
    const lat = complaint.location_lat;
    const lng = complaint.location_lng;
    const mapUrl = (typeof lat === "number" && typeof lng === "number")
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(locText)}`;

    const shareData = {
      title: `Civic Issue: ${complaint.title || "Citizen Report"}`,
      text: `Case Reference: ${complaint.tracking_id}\nLocation: ${locText}`,
      url: mapUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\nMap Link: ${shareData.url}`);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const fetchWorkspaceData = useCallback(() => {
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
          setError(err.message || "Failed to load complaint details.");
        } else {
          setError("Failed to load complaint details.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, accessToken]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // Action Submit Handlers
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !selectedOfficerId.trim() || !accessToken || updatingAction) return;

    setUpdatingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await assignComplaintOfficerApi(complaint.id, selectedOfficerId.trim(), accessToken);
      setComplaint(updated);
      const assignedOfficerName = officers.find((o) => o.id === selectedOfficerId)?.full_name || "Officer";
      setActionSuccess(`Complaint assigned successfully to ${assignedOfficerName}.`);
      setSelectedAction(null);
      setActionNotes("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message || "Unable to assign officer. Please try again.");
      } else {
        setActionError("Unable to assign officer. Please try again.");
      }
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleInProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !accessToken || updatingAction) return;

    setUpdatingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await updateComplaintStatusApi(
        complaint.id,
        "IN_PROGRESS",
        actionNotes.trim() || undefined,
        accessToken
      );
      setComplaint(updated);
      setActionSuccess("Complaint moved to In Progress.");
      setSelectedAction(null);
      setActionNotes("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message || "Unable to update status. Please try again.");
      } else {
        setActionError("Unable to update status. Please try again.");
      }
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !accessToken || updatingAction || !actionNotes.trim()) return;

    setUpdatingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await updateComplaintStatusApi(
        complaint.id,
        "RESOLVED",
        actionNotes.trim(),
        accessToken
      );
      setComplaint(updated);
      setActionSuccess("Complaint marked as Resolved.");
      setSelectedAction(null);
      setActionNotes("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message || "Unable to mark complaint as resolved. Please try again.");
      } else {
        setActionError("Unable to mark complaint as resolved. Please try again.");
      }
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !accessToken || updatingAction) return;

    if (selectedRejectionReason === "Other" && !actionNotes.trim()) {
      setActionError("A custom explanation note is required when selecting 'Other'.");
      return;
    }

    setUpdatingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await updateComplaintStatusApi(
        complaint.id,
        "REJECTED",
        actionNotes.trim() || undefined,
        accessToken,
        selectedRejectionReason
      );
      setComplaint(updated);
      setActionSuccess("Complaint rejected.");
      setSelectedAction(null);
      setActionNotes("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message || "Unable to reject complaint. Please try again.");
      } else {
        setActionError("Unable to reject complaint. Please try again.");
      }
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !accessToken || updatingAction) return;

    setUpdatingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await updateComplaintStatusApi(
        complaint.id,
        "CLOSED",
        actionNotes.trim() || undefined,
        accessToken
      );
      setComplaint(updated);
      setActionSuccess("Complaint closed.");
      setSelectedAction(null);
      setActionNotes("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message || "Unable to close complaint. Please try again.");
      } else {
        setActionError("Unable to close complaint. Please try again.");
      }
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !accessToken || updatingAction || !actionNotes.trim()) return;

    setUpdatingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const updated = await updateComplaintStatusApi(
        complaint.id,
        "REPORTED",
        actionNotes.trim(),
        accessToken
      );
      setComplaint(updated);
      setActionSuccess("Complaint reopened for review.");
      setSelectedAction(null);
      setActionNotes("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message || "Unable to reopen complaint. Please try again.");
      } else {
        setActionError("Unable to reopen complaint. Please try again.");
      }
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!complaint || !accessToken) return;
    const newComment = await addInternalCommentApi(complaint.id, content, accessToken);
    setComments((prev) => [newComment, ...prev]);
  };

  const formatStatusLabel = (status: string): string => {
    switch (status.toUpperCase()) {
      case "REPORTED":
        return "Reported";
      case "ASSIGNED":
        return "Assigned";
      case "IN_PROGRESS":
        return "In Progress";
      case "RESOLVED":
        return "Resolved";
      case "REJECTED":
        return "Rejected";
      case "CLOSED":
        return "Closed";
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

  const getAvailableActions = (currentStatus: string): WorkflowActionType[] => {
    switch (currentStatus.toUpperCase()) {
      case "REPORTED":
        return ["assign", "in_progress", "reject", "close"];
      case "ASSIGNED":
        return ["assign", "in_progress", "resolve", "reject", "close"];
      case "IN_PROGRESS":
        return ["assign", "resolve", "reject", "close"];
      case "RESOLVED":
        return ["close"];
      case "REJECTED":
        return ["reopen"];
      case "CLOSED":
        return [];
      default:
        return [];
    }
  };

  const formatActionName = (action: WorkflowActionType): string => {
    switch (action) {
      case "assign":
        return "Assign Officer";
      case "in_progress":
        return "Set In Progress";
      case "resolve":
        return "Mark Resolved";
      case "reject":
        return "Reject Complaint";
      case "close":
        return "Close Complaint";
      case "reopen":
        return "Reopen Complaint";
      default:
        return "";
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
    <div className="text-[#161616] space-y-8">
      {/* Workspace Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-4">
        <Link
          href="/dashboard/complaints"
          className="font-sans text-xs font-semibold text-[#5D5A55] hover:text-[#161616] flex items-center gap-1"
        >
          Back to Complaints Queue
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
            <Button variant="dark" size="sm" onClick={fetchWorkspaceData}>
              Retry Connection
            </Button>
            <Link href="/dashboard/complaints">
              <Button variant="outline" size="sm">
                Return to Complaints Queue
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {!loading && !error && complaint && (
        <>
          {/* Header Card */}
          <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getBadgeVariant(complaint.status)}>
                  {formatStatusLabel(complaint.status)}
                </Badge>
                <Badge variant={getBadgeVariant(complaint.priority)}>
                  {formatPriorityLabel(complaint.priority)}
                </Badge>
                {complaint.is_safety_risk && (
                  <Badge variant="critical">
                    Safety Risk Flagged
                  </Badge>
                )}
                {complaint.department_name && (
                  <Badge variant="neutral">
                    {complaint.department_name}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-sans text-xs font-semibold text-[#5D5A55]">
                  Priority Score:
                </span>
                <span className="font-mono text-sm font-bold text-[#161616] bg-[#EAE4DA] px-2 py-0.5 rounded border border-[#D6CFC3]">
                  {complaint.priority_score ?? "N/A"}/100
                </span>
              </div>
            </div>

            <h1 className="font-serif-civic text-2xl sm:text-3xl font-bold text-[#161616] tracking-tight">
              {complaint.title || complaint.raw_text}
            </h1>

            {/* Timestamps & Tracking Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs font-sans text-[#5D5A55] pt-2 border-t border-[#D6CFC3] gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <span>Submitted: <strong>{new Date(complaint.created_at).toLocaleString()}</strong></span>
                <span>Category: <strong>{complaint.category_name || "General Civic Issue"}</strong></span>
                <span>Channel: <strong className="uppercase">{complaint.source || "Web"}</strong></span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span>SLA Deadline:</span>
                <strong className={complaint.sla_breached ? "text-[#8B0000]" : "text-[#161616]"}>
                  {complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleString() : "Unspecified"}
                </strong>
                {complaint.sla_breached && (
                  <span className="bg-[#8B0000] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    SLA BREACHED
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Source Provenance Card (Reddit, Google News, OpenStreetMap, WhatsApp) */}
          {(complaint.source === "social_demo" || complaint.source === "whatsapp_demo" || complaint.submitter_name?.startsWith("u/") || complaint.submitter_name?.includes("News") || complaint.submitter_name?.includes("OSM")) && (
            <div className="p-3.5 bg-[#FBFAF7] border border-[#B7A58A] rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-[#161616]">
              <div className="flex items-center gap-2">
                {complaint.submitter_name?.includes("News") ? (
                  <span className="px-2 py-0.5 bg-sky-800 text-white font-semibold text-[10px] uppercase tracking-wider rounded-xs">
                    Google News India
                  </span>
                ) : complaint.submitter_name?.includes("OSM") ? (
                  <span className="px-2 py-0.5 bg-emerald-800 text-white font-semibold text-[10px] uppercase tracking-wider rounded-xs">
                    OpenStreetMap Notes
                  </span>
                ) : complaint.source === "whatsapp_demo" ? (
                  <span className="px-2 py-0.5 bg-emerald-700 text-white font-semibold text-[10px] uppercase tracking-wider rounded-xs">
                    WhatsApp Cloud API
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-[#292724] text-[#FBFAF7] font-semibold text-[10px] uppercase tracking-wider rounded-xs">
                    Reddit Sentinel
                  </span>
                )}
                <span>
                  Source: <strong>{complaint.submitter_name || "Civic Stream"}</strong> ({complaint.location_address || complaint.location_text || "India"})
                </span>
              </div>
              {complaint.submitter_name?.includes("News") ? (
                <a
                  href={`https://news.google.com/search?q=${encodeURIComponent(complaint.title || "civic issue india")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sky-800 underline hover:text-sky-950 flex items-center gap-1"
                >
                  Read Source Article on Google News &nearr;
                </a>
              ) : complaint.submitter_name?.includes("OSM") ? (
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(complaint.location_address || complaint.location_text || "India")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-800 underline hover:text-emerald-950 flex items-center gap-1"
                >
                  View Coordinates on OpenStreetMap &nearr;
                </a>
              ) : complaint.source === "whatsapp_demo" ? (
                <span className="text-[11px] text-[#5D5A55] font-mono">
                  Verified Meta Webhook Intake
                </span>
              ) : (
                <a
                  href={`https://www.reddit.com/search/?q=${encodeURIComponent(complaint.title || complaint.location_text || "civic issue")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#292724] underline hover:text-[#9E524D] flex items-center gap-1"
                >
                  Search &amp; Verify Source on Reddit &nearr;
                </a>
              )}
            </div>
          )}

          {/* Action Success Notification */}
          {actionSuccess && (
            <div className="p-3.5 bg-[#EAE4DA] border border-[#292724] text-[#161616] text-xs font-semibold rounded-sm">
              {actionSuccess}
            </div>
          )}

          {/* Main 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Main Column (~65%) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Raw Citizen Complaint Content */}
              <Card variant="primary" padding="md" className="border-[#D6CFC3] space-y-3 shadow-civic">
                <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                  Citizen Report Details
                </h3>
                <div className="p-3.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-xs font-sans text-[#161616] space-y-2">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {complaint.raw_text}
                  </p>
                </div>
              </Card>

              {/* Issue Location Card & Actions */}
              <Card variant="primary" padding="md" className="border-[#D6CFC3] space-y-3 shadow-civic">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6CFC3] pb-2">
                  <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                    Issue Location
                  </h3>
                  {complaint.ward && (
                    <span className="font-sans text-xs text-[#5D5A55] font-semibold">
                      Ward: <strong className="text-[#161616]">{complaint.ward}</strong>
                    </span>
                  )}
                </div>

                <div className="space-y-2 font-sans text-xs">
                  <p className="font-semibold text-sm text-[#161616]">
                    {complaint.location_address || complaint.location_text || "General Municipal Area"}
                  </p>

                  {typeof complaint.location_lat === "number" && typeof complaint.location_lng === "number" && (
                    <p className="text-[#5D5A55]">
                      Coordinates: <code className="bg-[#EAE4DA] px-1.5 py-0.5 rounded text-[11px] font-mono text-[#161616]">
                        {complaint.location_lat.toFixed(4)}, {complaint.location_lng.toFixed(4)}
                      </code>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#D6CFC3]/60">
                    <button
                      type="button"
                      onClick={handleCopyLocation}
                      className="py-1 px-2.5 bg-[#EAE4DA] text-[#161616] hover:bg-[#D6CFC3] rounded-xs font-medium text-xs transition-colors"
                    >
                      {copiedLocation ? "Location Copied!" : "Copy Location"}
                    </button>

                    <button
                      type="button"
                      onClick={handleShareLocation}
                      className="py-1 px-2.5 bg-[#292724] text-[#FBFAF7] hover:bg-[#161616] rounded-xs font-medium text-xs transition-colors"
                    >
                      {copiedShare ? "Link Copied!" : "Share Issue Location"}
                    </button>

                    <a
                      href={
                        typeof complaint.location_lat === "number" && typeof complaint.location_lng === "number"
                          ? `https://www.openstreetmap.org/?mlat=${complaint.location_lat}&mlon=${complaint.location_lng}#map=16/${complaint.location_lat}/${complaint.location_lng}`
                          : `https://www.openstreetmap.org/search?query=${encodeURIComponent(complaint.location_address || complaint.location_text || "patna")}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1 px-2.5 bg-[#EAE4DA] text-[#161616] hover:bg-[#D6CFC3] rounded-xs font-medium text-xs transition-colors"
                    >
                      View Map Link
                    </a>
                  </div>
                </div>
              </Card>

              {/* Resolution Workflow Section */}
              <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-4">
                <div className="space-y-4 font-sans text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6CFC3] pb-3">
                    <div>
                      <span className="font-semibold text-[#5D5A55] uppercase tracking-wider block text-[10px]">
                        Current Status
                      </span>
                      <span className="font-serif-civic font-bold text-xl text-[#161616]">
                        {formatStatusLabel(complaint.status)}
                      </span>
                    </div>

                    {selectedAction && (
                      <div className="text-right">
                        <span className="font-semibold text-[#5D5A55] uppercase tracking-wider block text-[10px]">
                          Selected Action
                        </span>
                        <span className="font-serif-civic font-bold text-base text-[#161616]">
                          {formatActionName(selectedAction)}
                        </span>
                      </div>
                    )}
                  </div>

                  {actionError && (
                    <div className="p-3 bg-[#EAE4DA] border border-[#292724] text-[#161616] font-semibold rounded-sm">
                      {actionError}
                    </div>
                  )}

                  {/* CLOSED STATUS CARD */}
                  {complaint.status.toUpperCase() === "CLOSED" ? (
                    <div className="p-4 bg-[#EAE4DA]/60 border border-[#D6CFC3] rounded-sm space-y-2">
                      <h4 className="font-serif-civic font-bold text-base text-[#161616]">
                        Workflow Complete
                      </h4>
                      <p className="text-[#5D5A55]">
                        This complaint is closed and no further workflow actions are available.
                      </p>
                      {complaint.resolution_notes && (
                        <div className="pt-2 border-t border-[#D6CFC3]">
                          <span className="font-semibold text-[#5D5A55] block text-[11px] mb-1">
                            Closure / Resolution Notes:
                          </span>
                          <p className="text-[#161616] italic bg-[#FBFAF7] p-2 rounded-xs border border-[#D6CFC3]">
                            &quot;{complaint.resolution_notes}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* AVAILABLE ACTION BUTTONS BAR */}
                      <div className="space-y-2">
                        <span className="font-semibold text-[#5D5A55] uppercase tracking-wider block text-[10px]">
                          Available Workflow Actions
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {getAvailableActions(complaint.status).map((action) => {
                            const isSelected = selectedAction === action;
                            return (
                              <Button
                                key={action}
                                variant={isSelected ? "dark" : "outline"}
                                size="sm"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAction(null);
                                  } else {
                                    setSelectedAction(action);
                                    setActionError(null);
                                    setActionSuccess(null);
                                    setActionNotes("");
                                  }
                                }}
                                className={`text-xs ${
                                  isSelected ? "ring-2 ring-[#B7A58A] font-bold" : ""
                                }`}
                              >
                                {formatActionName(action)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      {/* CONTEXTUAL ACTION FORM PANEL (Renders ONLY for the single selectedAction) */}
                      {selectedAction === "assign" && (
                        <form onSubmit={handleAssignSubmit} className="mt-4 p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-2">
                            <h4 className="font-serif-civic font-bold text-sm text-[#161616]">
                              Assign Officer
                            </h4>
                            <span className="text-[11px] text-[#5D5A55]">
                              Assign departmental ownership
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#161616] uppercase tracking-wider">
                              Select Municipal Officer *
                            </label>
                            <select
                              value={selectedOfficerId}
                              onChange={(e) => setSelectedOfficerId(e.target.value)}
                              disabled={updatingAction}
                              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
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
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[#D6CFC3]">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAction(null)}
                              disabled={updatingAction}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              variant="dark"
                              size="sm"
                              disabled={!selectedOfficerId.trim() || updatingAction}
                            >
                              {updatingAction ? "Updating..." : "Assign Officer"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {selectedAction === "in_progress" && (
                        <form onSubmit={handleInProgressSubmit} className="mt-4 p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-2">
                            <h4 className="font-serif-civic font-bold text-sm text-[#161616]">
                              Set In Progress
                            </h4>
                            <span className="text-[11px] text-[#5D5A55]">
                              Advance complaint to active work state
                            </span>
                          </div>

                          <p className="text-[#5D5A55] text-xs">
                            Move this complaint to In Progress?
                          </p>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider">
                              Progress Note (Optional)
                            </label>
                            <input
                              type="text"
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              placeholder="e.g. Field crew dispatched to site."
                              disabled={updatingAction}
                              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[#D6CFC3]">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAction(null)}
                              disabled={updatingAction}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              variant="dark"
                              size="sm"
                              disabled={updatingAction}
                            >
                              {updatingAction ? "Updating..." : "Confirm In Progress"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {selectedAction === "resolve" && (
                        <form onSubmit={handleResolveSubmit} className="mt-4 p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-2">
                            <h4 className="font-serif-civic font-bold text-sm text-[#161616]">
                              Mark Resolved
                            </h4>
                            <span className="text-[11px] text-[#5D5A55]">
                              Record resolution action summary
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#161616] uppercase tracking-wider">
                              Resolution / Action Summary *
                            </label>
                            <textarea
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              placeholder="Describe the action taken to resolve this complaint."
                              rows={3}
                              disabled={updatingAction}
                              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                            />
                            <span className="text-[10px] text-[#5D5A55] block">
                              Describe the action taken to resolve this complaint.
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[#D6CFC3]">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAction(null)}
                              disabled={updatingAction}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              variant="dark"
                              size="sm"
                              disabled={!actionNotes.trim() || updatingAction}
                            >
                              {updatingAction ? "Updating..." : "Mark Resolved"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {selectedAction === "reject" && (
                        <form onSubmit={handleRejectSubmit} className="mt-4 p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-2">
                            <h4 className="font-serif-civic font-bold text-sm text-[#161616]">
                              Reject Complaint
                            </h4>
                            <span className="text-[11px] text-[#5D5A55]">
                              Specify valid rejection reason
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#161616] uppercase tracking-wider">
                              Rejection Reason *
                            </label>
                            <select
                              value={selectedRejectionReason}
                              onChange={(e) => setSelectedRejectionReason(e.target.value)}
                              disabled={updatingAction}
                              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                            >
                              <option value="Duplicate Complaint">Duplicate Complaint</option>
                              <option value="Outside Municipal Jurisdiction">Outside Municipal Jurisdiction</option>
                              <option value="Insufficient Information">Insufficient Information</option>
                              <option value="Invalid / Spam Report">Invalid / Spam Report</option>
                              <option value="Issue Already Resolved">Issue Already Resolved</option>
                              <option value="Unable to Verify">Unable to Verify</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider">
                              Additional Details {selectedRejectionReason === "Other" ? "*" : "(Optional)"}
                            </label>
                            <textarea
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              placeholder="Provide additional details or context..."
                              rows={3}
                              disabled={updatingAction}
                              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[#D6CFC3]">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAction(null)}
                              disabled={updatingAction}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              variant="dark"
                              size="sm"
                              disabled={
                                (selectedRejectionReason === "Other" && !actionNotes.trim()) ||
                                updatingAction
                              }
                            >
                              {updatingAction ? "Updating..." : "Reject Complaint"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {selectedAction === "close" && (
                        <form onSubmit={handleCloseSubmit} className="mt-4 p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-2">
                            <h4 className="font-serif-civic font-bold text-sm text-[#161616]">
                              Close Complaint
                            </h4>
                            <span className="text-[11px] text-[#5D5A55]">
                              Finalize case completion
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#161616] uppercase tracking-wider">
                              Closure Summary *
                            </label>
                            <textarea
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              placeholder="Provide final closure summary or inspection verification details..."
                              rows={3}
                              disabled={updatingAction}
                              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[#D6CFC3]">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAction(null)}
                              disabled={updatingAction}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              variant="dark"
                              size="sm"
                              disabled={updatingAction}
                            >
                              {updatingAction ? "Updating..." : "Close Complaint"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {selectedAction === "reopen" && (
                        <form onSubmit={handleReopenSubmit} className="mt-4 p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-2">
                            <h4 className="font-serif-civic font-bold text-sm text-[#161616]">
                              Reopen Complaint
                            </h4>
                            <span className="text-[11px] text-[#5D5A55]">
                              Return complaint to active review queue
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#161616] uppercase tracking-wider">
                              Reason for Reopening *
                            </label>
                            <textarea
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              placeholder="Explain why this complaint should return to active review."
                              rows={3}
                              disabled={updatingAction}
                              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] focus:outline-none focus:border-[#B7A58A]"
                            />
                            <span className="text-[10px] text-[#5D5A55] block">
                              Explain why this complaint should return to active review.
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[#D6CFC3]">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAction(null)}
                              disabled={updatingAction}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              variant="dark"
                              size="sm"
                              disabled={!actionNotes.trim() || updatingAction}
                            >
                              {updatingAction ? "Updating..." : "Reopen Complaint"}
                            </Button>
                          </div>
                        </form>
                      )}
                    </>
                  )}
                </div>
              </Card>

              {/* Internal Comments Panel */}
              <InternalCommentsPanel comments={comments} onAddComment={handleAddComment} />
            </div>

            {/* Right Sidebar Column (~35%) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Assigned Officer Information Card */}
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
                    Unassigned. Use the Assign Officer action to select an active municipal officer.
                  </p>
                )}
              </Card>

              {/* AI Detail Panel */}
              <AIDetailPanel complaint={complaint} />

              {/* Related Complaints */}
              <RelatedComplaintsPanel relatedComplaints={relatedComplaints} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { trackComplaintApi } from "@/lib/api/public";
import type { CitizenComplaintResponse } from "@/types/complaint";

export default function TrackingPage({
  params,
}: {
  params: Promise<{ trackingId: string }>;
}) {
  const { trackingId } = use(params);

  const [complaint, setComplaint] = useState<CitizenComplaintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load complaint status.");
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

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "reported":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "assigned":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "in_progress":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "closed":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "bg-red-50 text-red-700 border-red-200";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-slate-50 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-90">
            <h1 className="text-2xl font-bold tracking-tight">CivicPulse</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Public Complaint Tracker
            </p>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md border border-slate-700 transition-colors"
          >
            ← Submit New Complaint
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        {loading && (
          <div className="bg-white p-12 rounded-xl text-center text-slate-500 shadow-sm">
            Loading complaint status...
          </div>
        )}

        {error && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 text-center space-y-4">
            <div className="text-red-500 text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-slate-900">Complaint Not Found</h2>
            <p className="text-slate-600 text-sm">{error}</p>
            <p className="text-slate-400 text-xs font-mono">ID: {trackingId}</p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
            >
              Back to Home
            </Link>
          </div>
        )}

        {complaint && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-wide">
                    Tracking ID
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 select-all">
                    {complaint.tracking_id}
                  </div>
                </div>

                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider ${getStatusBadgeClass(
                      complaint.status
                    )}`}
                  >
                    {complaint.status}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider ${getPriorityBadgeClass(
                      complaint.priority
                    )}`}
                  >
                    {complaint.priority} Priority
                  </span>
                </div>
              </div>

              {/* Title / Summary */}
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {complaint.title || "Citizen Reported Complaint"}
                </h2>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-2">
                  {complaint.category && (
                    <div>
                      <span className="font-semibold text-slate-700">Category:</span>{" "}
                      {complaint.category}
                    </div>
                  )}
                  {complaint.department && (
                    <div>
                      <span className="font-semibold text-slate-700">Department:</span>{" "}
                      {complaint.department}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-slate-700">Submitted:</span>{" "}
                    {new Date(complaint.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Location Address */}
              {complaint.location_address && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                  <span className="font-semibold">📍 Location:</span>{" "}
                  {complaint.location_address}
                </div>
              )}
            </div>

            {/* Timeline Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Resolution Timeline
              </h3>

              {complaint.timeline.length === 0 ? (
                <p className="text-xs text-slate-500">No status updates yet.</p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {complaint.timeline.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                      <div className="text-sm font-semibold text-slate-900 capitalize">
                        {event.status.replace("_", " ")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Assurance Box */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-800">
              🔒 <strong>Privacy Assurance:</strong> Voluntary contact details and raw complaint texts are strictly confidential and are never exposed in public tracking responses.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

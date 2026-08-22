"use client";

import type { RelatedComplaintResponse } from "@/types/staff_complaint";

export default function RelatedComplaintsPanel({
  relatedComplaints,
}: {
  relatedComplaints: RelatedComplaintResponse[];
}) {
  if (!relatedComplaints || relatedComplaints.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          🔗 Duplicate & Related Complaints Intelligence
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          No related or duplicate complaints detected within 7-day clustering window.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            🔗 Duplicate & Related Complaints ({relatedComplaints.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Clustered by spatial proximity, category, and 7-day timeframe
          </p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="p-2.5 font-semibold">Tracking ID</th>
              <th className="p-2.5 font-semibold">Title</th>
              <th className="p-2.5 font-semibold">Similarity</th>
              <th className="p-2.5 font-semibold">Detection Method</th>
              <th className="p-2.5 font-semibold">Status</th>
              <th className="p-2.5 font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {relatedComplaints.map((item) => {
              const simPercent = Math.round(item.similarity_score * 100);
              return (
                <tr key={item.related_id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono font-bold text-blue-700">
                    {item.related_tracking_id}
                  </td>
                  <td className="p-2.5 font-medium max-w-xs truncate">
                    {item.related_title || "Untitled Complaint"}
                  </td>
                  <td className="p-2.5 font-semibold text-slate-900">
                    {simPercent}%
                  </td>
                  <td className="p-2.5 font-mono text-slate-600">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px]">
                      {item.detection_method}
                    </span>
                  </td>
                  <td className="p-2.5 font-semibold uppercase">
                    {item.related_status}
                  </td>
                  <td className="p-2.5 font-semibold uppercase">
                    {item.related_priority}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import type { RelatedComplaintResponse } from "@/types/staff_complaint";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function RelatedComplaintsPanel({
  relatedComplaints,
}: {
  relatedComplaints: RelatedComplaintResponse[];
}) {
  if (!relatedComplaints || relatedComplaints.length === 0) {
    return (
      <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-1">
        <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
          Duplicate &amp; Related Complaints Cluster
        </h3>
        <p className="font-sans text-xs text-[#5D5A55]">
          No related or duplicate complaints detected within 7-day clustering window.
        </p>
      </Card>
    );
  }

  return (
    <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-4">
      <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-3">
        <div>
          <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
            Duplicate &amp; Related Complaints ({relatedComplaints.length})
          </h3>
          <p className="font-sans text-xs text-[#5D5A55]">
            Clustered by spatial proximity, category, and 7-day timeframe
          </p>
        </div>
      </div>

      <div className="border border-[#D6CFC3] rounded-sm overflow-hidden bg-[#FBFAF7]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#EAE4DA] text-[#161616] border-b border-[#D6CFC3]">
            <tr>
              <th className="p-2.5 font-semibold">Tracking ID</th>
              <th className="p-2.5 font-semibold">Title</th>
              <th className="p-2.5 font-semibold">Similarity</th>
              <th className="p-2.5 font-semibold">Detection Method</th>
              <th className="p-2.5 font-semibold">Status</th>
              <th className="p-2.5 font-semibold">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6CFC3] text-[#161616]">
            {relatedComplaints.map((item) => {
              const simPercent = Math.round(item.similarity_score * 100);
              return (
                <tr key={item.related_id} className="hover:bg-[#EAE4DA]/40">
                  <td className="p-2.5 font-mono font-bold text-[#161616]">
                    {item.related_tracking_id}
                  </td>
                  <td className="p-2.5 font-medium max-w-xs truncate">
                    {item.related_title || "Untitled Complaint"}
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-semibold text-[#161616] shrink-0">
                        {simPercent}%
                      </span>
                      <div className="w-16 h-1.5 bg-[#D6CFC3] rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-[#B7A58A] rounded-full"
                          style={{ width: `${simPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5 font-mono text-[#5D5A55]">
                    <span className="px-2 py-0.5 bg-[#EAE4DA] border border-[#D6CFC3] rounded text-[10px]">
                      {item.detection_method}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <Badge variant="neutral">
                      {item.related_status}
                    </Badge>
                  </td>
                  <td className="p-2.5">
                    <Badge variant="neutral">
                      {item.related_priority}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

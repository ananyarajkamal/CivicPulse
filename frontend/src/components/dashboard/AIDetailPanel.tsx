"use client";

import React, { useState } from "react";
import type { StaffComplaintDetailResponse } from "@/types/staff_complaint";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AIIcon } from "@/components/ui/Icons";
import { useAuthStore } from "@/store/authStore";

export default function AIDetailPanel({
  complaint,
}: {
  complaint: StaffComplaintDetailResponse;
}) {
  const { user } = useAuthStore();
  const [showRawJson, setShowRawJson] = useState(false);

  const confidencePercent = complaint.ai_confidence
    ? Math.round(complaint.ai_confidence * 100)
    : null;

  // Safe extraction of raw classification payload fields
  const rawPayload = complaint.ai_classification_raw as Record<string, unknown> | null;
  const summaryTitle =
    (typeof rawPayload?.summary_title === "string" && rawPayload.summary_title.trim()) ||
    complaint.title ||
    null;
  const category = complaint.category_name || (typeof rawPayload?.category === "string" ? rawPayload.category : "Uncategorized");
  const subcategory = typeof rawPayload?.subcategory === "string" ? rawPayload.subcategory.trim() : null;
  const suggestedDept = complaint.department_name || (typeof rawPayload?.suggested_department === "string" ? rawPayload.suggested_department : null);
  const locationMentions = Array.isArray(rawPayload?.location_mentions)
    ? (rawPayload.location_mentions as string[]).filter((item) => typeof item === "string" && item.trim())
    : [];

  const showSubcategory =
    subcategory &&
    subcategory.toLowerCase() !== category.toLowerCase();

  const capitalize = (str: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "N/A";

  const isAdmin = user?.role === "admin";

  return (
    <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#EAE4DA] text-[#292724]">
            <AIIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
              AI Assessment
            </h3>
            <p className="font-sans text-xs text-[#5D5A55]">
              Automated complaint analysis, department routing, and risk audit
            </p>
          </div>
        </div>

        {complaint.is_safety_risk && (
          <Badge variant="critical">⚠️ Safety Risk Flagged</Badge>
        )}
      </div>

      {/* Structured Human-Readable AI Assessment Grid */}
      <div className="space-y-4 font-sans text-xs">
        {summaryTitle && (
          <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1">
            <span className="font-semibold text-[#5D5A55] uppercase tracking-wider text-[10px] block">
              Summary
            </span>
            <p className="font-serif-civic font-bold text-sm text-[#161616]">
              {summaryTitle}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
            <span className="font-semibold text-[#5D5A55] uppercase tracking-wider text-[10px] block">
              Issue Category
            </span>
            <div className="font-serif-civic font-bold text-base text-[#161616]">
              {category}
            </div>
            {showSubcategory && (
              <span className="text-[11px] text-[#5D5A55] block font-medium">
                Subcategory: {subcategory}
              </span>
            )}
          </div>

          <div className="p-3 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
            <span className="font-semibold text-[#5D5A55] uppercase tracking-wider text-[10px] block">
              Severity &amp; Priority
            </span>
            <div className="flex items-center justify-between">
              <span className="font-serif-civic font-bold text-base text-[#161616]">
                {capitalize(complaint.priority)}
              </span>
              <Badge
                variant={
                  ["critical", "high", "medium", "low"].includes(complaint.priority.toLowerCase())
                    ? (complaint.priority.toLowerCase() as "critical" | "high" | "medium" | "low")
                    : "neutral"
                }
              >
                {complaint.priority_score ?? 0} / 100
              </Badge>
            </div>
          </div>

          <div className="p-3 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
            <span className="font-semibold text-[#5D5A55] uppercase tracking-wider text-[10px] block">
              Confidence
            </span>
            <div className="font-serif-civic font-bold text-base text-[#161616]">
              {confidencePercent !== null ? `${confidencePercent}%` : "N/A"}
            </div>
            {confidencePercent !== null && (
              <div className="w-full h-1 bg-[#D6CFC3] rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#B7A58A] rounded-full"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestedDept && (
            <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1">
              <span className="font-semibold text-[#5D5A55] uppercase tracking-wider text-[10px] block">
                Suggested Department
              </span>
              <span className="font-bold text-[#161616] text-sm block">
                {suggestedDept}
              </span>
            </div>
          )}

          <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1">
            <span className="font-semibold text-[#5D5A55] uppercase tracking-wider text-[10px] block">
              Safety Risk
            </span>
            <span className="font-bold text-[#161616] text-sm block">
              {complaint.is_safety_risk ? "Yes — Immediate Risk Flagged" : "No"}
            </span>
          </div>
        </div>

        {/* Location Mentions (Rendered ONLY if non-empty) */}
        {locationMentions.length > 0 && (
          <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1">
            <span className="font-semibold text-[#5D5A55] uppercase tracking-wider text-[10px] block">
              Location Mentions
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {locationMentions.map((loc, i) => (
                <Badge key={i} variant="neutral" className="text-[10px]">
                  📍 {loc}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced AI Output Expandable Section (Restricted to Admin Users, Collapsed by Default) */}
      {isAdmin && complaint.ai_classification_raw && (
        <div className="pt-2 border-t border-[#D6CFC3]">
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="font-sans text-xs font-semibold text-[#161616] hover:text-[#5D5A55] flex items-center gap-1.5 cursor-pointer"
          >
            <span>{showRawJson ? "▼ Hide" : "▶ View"} Advanced AI Output (Admin Debug)</span>
          </button>

          {showRawJson && (
            <pre className="mt-3 p-4 bg-[#292724] text-[#FBFAF7] rounded-sm text-xs font-mono overflow-x-auto max-h-56 border border-[#161616]">
              {JSON.stringify(complaint.ai_classification_raw, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* AI Execution Logs Table */}
      {complaint.ai_logs.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-[#D6CFC3]">
          <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#161616]">
            AI Agent Execution Logs ({complaint.ai_logs.length})
          </h4>
          <div className="border border-[#D6CFC3] rounded-sm overflow-hidden bg-[#FBFAF7]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#EAE4DA] text-[#161616] border-b border-[#D6CFC3]">
                <tr>
                  <th className="p-2.5 font-semibold">Agent</th>
                  <th className="p-2.5 font-semibold">Provider</th>
                  <th className="p-2.5 font-semibold">Tokens (In/Out)</th>
                  <th className="p-2.5 font-semibold">Latency</th>
                  <th className="p-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6CFC3] text-[#161616]">
                {complaint.ai_logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#EAE4DA]/40">
                    <td className="p-2.5 font-mono">{log.agent_name}</td>
                    <td className="p-2.5">{log.provider || "N/A"}</td>
                    <td className="p-2.5 font-mono">
                      {log.prompt_tokens ?? "-"} / {log.completion_tokens ?? "-"}
                    </td>
                    <td className="p-2.5">{log.latency_ms ? `${log.latency_ms}ms` : "-"}</td>
                    <td className="p-2.5">
                      {log.success ? (
                        <Badge variant="resolved">Success</Badge>
                      ) : (
                        <Badge variant="critical">Failed</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

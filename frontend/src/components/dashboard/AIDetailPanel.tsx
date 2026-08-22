"use client";

import React, { useState } from "react";
import type { StaffComplaintDetailResponse } from "@/types/staff_complaint";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AIIcon } from "@/components/ui/Icons";

export default function AIDetailPanel({
  complaint,
}: {
  complaint: StaffComplaintDetailResponse;
}) {
  const [showRawJson, setShowRawJson] = useState(false);
  const confidencePercent = complaint.ai_confidence
    ? Math.round(complaint.ai_confidence * 100)
    : null;

  return (
    <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-6">
      <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#EAE4DA] text-[#292724]">
            <AIIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
              AI Triage &amp; Classification Intelligence
            </h3>
            <p className="font-sans text-xs text-[#5D5A55]">
              Automated complaint understanding, priority calculation, and risk audit
            </p>
          </div>
        </div>

        {complaint.is_safety_risk && (
          <Badge variant="critical">⚠️ Safety Risk Flagged</Badge>
        )}
      </div>

      {/* Grid of Key AI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#5D5A55]">
            Priority Score
          </span>
          <div className="flex items-center justify-between">
            <span className="font-serif-civic text-2xl font-bold text-[#161616]">
              {complaint.priority_score ?? "N/A"}{" "}
              <span className="text-xs font-sans text-[#5D5A55] font-normal">/ 100</span>
            </span>
            <Badge
              variant={
                ["critical", "high", "medium", "low"].includes(complaint.priority.toLowerCase())
                  ? (complaint.priority.toLowerCase() as "critical" | "high" | "medium" | "low")
                  : "neutral"
              }
            >
              {complaint.priority}
            </Badge>
          </div>
        </div>

        <div className="p-3.5 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#5D5A55]">
            AI Confidence
          </span>
          <div className="space-y-1.5 pt-1">
            <div className="font-serif-civic text-2xl font-bold text-[#161616]">
              {confidencePercent !== null ? `${confidencePercent}%` : "N/A"}
            </div>
            {confidencePercent !== null && (
              <div className="w-full h-1.5 bg-[#D6CFC3] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B7A58A] rounded-full"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#5D5A55]">
            SLA Target Status
          </span>
          <div className="pt-1">
            {complaint.sla_breached ? (
              <Badge variant="critical">SLA Breached</Badge>
            ) : (
              <Badge variant="resolved">Within SLA</Badge>
            )}
            {complaint.sla_deadline && (
              <p className="font-sans text-[11px] text-[#5D5A55] mt-1">
                Target: {new Date(complaint.sla_deadline).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Raw AI Classification Drawer */}
      {complaint.ai_classification_raw && (
        <div className="pt-2 border-t border-[#D6CFC3]">
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="font-sans text-xs font-semibold text-[#161616] hover:text-[#5D5A55] flex items-center gap-1.5 cursor-pointer"
          >
            <span>{showRawJson ? "▼ Hide" : "▶ View"} Classification Data Payload</span>
          </button>

          {showRawJson && (
            <pre className="mt-3 p-4 bg-[#292724] text-[#FBFAF7] rounded-sm text-xs font-mono overflow-x-auto max-h-56 border border-[#161616]">
              {JSON.stringify(complaint.ai_classification_raw, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* AI Processing Logs Table */}
      {complaint.ai_logs.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-[#D6CFC3]">
          <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#161616]">
            AI Execution Logs ({complaint.ai_logs.length})
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

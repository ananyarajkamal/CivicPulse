"use client";

import type { StaffComplaintDetailResponse } from "@/types/staff_complaint";

export default function AIDetailPanel({
  complaint,
}: {
  complaint: StaffComplaintDetailResponse;
}) {
  const confidencePercent = complaint.ai_confidence
    ? Math.round(complaint.ai_confidence * 100)
    : null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            🤖 AI Intelligence Analysis
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated complaint understanding, risk flag, and classification audit
          </p>
        </div>

        {complaint.is_safety_risk && (
          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-300 animate-pulse">
            ⚠️ Safety Risk Flagged
          </span>
        )}
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            AI Summary Title
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {complaint.title || "No summary title generated"}
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            Priority Score
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1 flex items-center justify-between">
            <span>{complaint.priority_score ?? "N/A"} / 100</span>
            <span className="text-xs font-mono uppercase bg-slate-200 px-2 py-0.5 rounded">
              {complaint.priority}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            AI Confidence
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {confidencePercent !== null ? `${confidencePercent}%` : "N/A"}
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            SLA Resolution Status
          </div>
          <div className="text-sm font-bold mt-1">
            {complaint.sla_breached ? (
              <span className="text-red-700 font-semibold">⚠️ SLA Breached</span>
            ) : (
              <span className="text-emerald-700 font-semibold">Within SLA</span>
            )}
            {complaint.sla_deadline && (
              <div className="text-xs font-normal text-slate-500 mt-0.5">
                Deadline: {new Date(complaint.sla_deadline).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw AI Classification JSON Drawer */}
      {complaint.ai_classification_raw && (
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Raw AI Classification Payload
          </div>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-48 border border-slate-800">
            {JSON.stringify(complaint.ai_classification_raw, null, 2)}
          </pre>
        </div>
      )}

      {/* AI Processing Logs Table */}
      {complaint.ai_logs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            AI Execution Logs ({complaint.ai_logs.length})
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-2 font-semibold">Agent</th>
                  <th className="p-2 font-semibold">Provider</th>
                  <th className="p-2 font-semibold">Tokens (In/Out)</th>
                  <th className="p-2 font-semibold">Latency</th>
                  <th className="p-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {complaint.ai_logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-2 font-mono">{log.agent_name}</td>
                    <td className="p-2">{log.provider || "N/A"}</td>
                    <td className="p-2 font-mono">
                      {log.prompt_tokens ?? "-"} / {log.completion_tokens ?? "-"}
                    </td>
                    <td className="p-2">{log.latency_ms ? `${log.latency_ms}ms` : "-"}</td>
                    <td className="p-2">
                      {log.success ? (
                        <span className="text-emerald-700 font-semibold">Success</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

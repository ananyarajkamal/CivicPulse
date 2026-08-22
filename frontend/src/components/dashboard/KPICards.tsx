"use client";

import type { KPIResponse } from "@/types/staff_complaint";

export default function KPICards({ kpis }: { kpis: KPIResponse | null }) {
  if (!kpis) return null;

  const cards = [
    { label: "Total Complaints", value: kpis.total_complaints, color: "text-slate-900", bg: "bg-slate-50" },
    { label: "Unassigned", value: kpis.unassigned_complaints, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "In Progress", value: kpis.in_progress_complaints, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Resolved", value: kpis.resolved_complaints, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "SLA Breached", value: kpis.sla_breached_complaints, color: "text-red-700", bg: "bg-red-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`p-4 rounded-xl border border-slate-200 ${c.bg}`}>
          <div className="text-xs font-semibold text-slate-500 uppercase">{c.label}</div>
          <div className={`text-2xl font-extrabold mt-1 ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

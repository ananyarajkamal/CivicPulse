"use client";

import React from "react";
import type { KPIResponse } from "@/types/staff_complaint";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function KPICards({ kpis }: { kpis: KPIResponse | null }) {
  if (!kpis) return null;

  const cards = [
    { label: "Total Complaints", value: kpis.total_complaints, isBreach: false },
    { label: "Unassigned", value: kpis.unassigned_complaints, isBreach: false },
    { label: "In Progress", value: kpis.in_progress_complaints, isBreach: false },
    { label: "Resolved", value: kpis.resolved_complaints, isBreach: false },
    { label: "SLA Breaches", value: kpis.sla_breached_complaints, isBreach: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((c) => (
        <Card
          key={c.label}
          variant="primary"
          padding="sm"
          className="border-[#D6CFC3] shadow-civic space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider">
              {c.label}
            </span>
            {c.isBreach && c.value > 0 && (
              <Badge variant="critical">Critical</Badge>
            )}
          </div>
          <div className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616]">
            {c.value}
          </div>
        </Card>
      ))}
    </div>
  );
}

"use client";

import React from "react";
import type {
  AnalyticsSummaryResponse,
  HotspotClusterItem,
  TrendDataPoint,
} from "@/types/analytics";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AnalyticsIcon, HotspotIcon, CityIcon } from "@/components/ui/Icons";

export default function AnalyticsPanel({
  summary,
  trends,
  hotspots,
}: {
  summary: AnalyticsSummaryResponse | null;
  trends: TrendDataPoint[];
  hotspots: HotspotClusterItem[];
}) {
  if (!summary) return null;

  const totalClosed = summary.statuses.find((s) => s.status.toLowerCase() === "resolved")?.count || 0;
  const totalOpen = summary.total_complaints - totalClosed;

  return (
    <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-6">
      <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#EAE4DA] text-[#292724]">
            <AnalyticsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
              City Operational Intelligence
            </h3>
            <p className="font-sans text-xs text-[#5D5A55]">
              Real-time complaint metrics, SLA compliance, and geographical hotspot clusters
            </p>
          </div>
        </div>

        <Badge variant="neutral">System Snapshot ({trends.length} trend days)</Badge>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3.5 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
          <span className="font-sans text-[11px] font-semibold text-[#5D5A55] uppercase">
            Total Complaints
          </span>
          <div className="font-serif-civic text-2xl font-bold text-[#161616]">
            {summary.total_complaints}
          </div>
        </div>

        <div className="p-3.5 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
          <span className="font-sans text-[11px] font-semibold text-[#5D5A55] uppercase">
            SLA Compliance Rate
          </span>
          <div className="font-serif-civic text-2xl font-bold text-[#161616]">
            {Math.round(summary.sla_compliance_rate * 100)}%
          </div>
        </div>

        <div className="p-3.5 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
          <span className="font-sans text-[11px] font-semibold text-[#5D5A55] uppercase">
            Active Open Cases
          </span>
          <div className="font-serif-civic text-2xl font-bold text-[#161616]">
            {totalOpen}
          </div>
        </div>

        <div className="p-3.5 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm space-y-1">
          <span className="font-sans text-[11px] font-semibold text-[#5D5A55] uppercase">
            Active Hotspots
          </span>
          <div className="font-serif-civic text-2xl font-bold text-[#161616]">
            {hotspots.length}
          </div>
        </div>
      </div>

      {/* Hotspots & Category Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Hotspots List */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#161616]">
            <HotspotIcon className="w-4 h-4 text-[#292724]" />
            <span>Geographic Hotspots ({hotspots.length})</span>
          </div>

          {hotspots.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {hotspots.map((hs) => (
                <div
                  key={hs.id}
                  className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-serif-civic font-bold text-[#161616]">
                      {hs.primary_category || "General"} ({hs.complaint_count} issues)
                    </div>
                    <div className="font-sans text-[#5D5A55] text-[11px]">
                      {hs.location_name || `GPS: (${hs.latitude.toFixed(3)}, ${hs.longitude.toFixed(3)})`}
                    </div>
                  </div>
                  <Badge variant="critical">Hotspot</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs text-[#5D5A55] italic">No active hotspots detected.</p>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#161616]">
            <CityIcon className="w-4 h-4 text-[#292724]" />
            <span>Category Volume Breakdown</span>
          </div>

          {summary.categories && summary.categories.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {summary.categories.map((cat) => (
                <div
                  key={cat.category_name}
                  className="p-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm flex items-center justify-between text-xs"
                >
                  <span className="font-sans font-medium text-[#161616] truncate max-w-[200px]">
                    {cat.category_name}
                  </span>
                  <span className="font-serif-civic font-bold text-[#161616]">{cat.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs text-[#5D5A55] italic">No category data available.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

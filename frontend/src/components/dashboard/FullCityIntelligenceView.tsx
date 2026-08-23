"use client";

import React from "react";
import type {
  AnalyticsSummaryResponse,
  HotspotClusterItem,
  TrendDataPoint,
} from "@/types/analytics";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SimpleLineChart } from "@/components/ui/Chart";
import { AnalyticsIcon, HotspotIcon, CityIcon, ClockIcon } from "@/components/ui/Icons";
import { HotspotMap } from "@/components/dashboard/HotspotMap";

interface FullCityIntelligenceViewProps {
  summary: AnalyticsSummaryResponse | null;
  trends: TrendDataPoint[];
  hotspots: HotspotClusterItem[];
}

export const FullCityIntelligenceView: React.FC<FullCityIntelligenceViewProps> = ({
  summary,
  trends,
  hotspots,
}) => {
  if (!summary) {
    return (
      <Card variant="primary" padding="lg" className="text-center py-12 shadow-civic border-[#D6CFC3]">
        <p className="font-sans text-sm text-[#5D5A55]">Unable to display operational intelligence data.</p>
      </Card>
    );
  }

  const formatSlaRate = (val: number): number => {
    const rate = val <= 1.0 && val > 0 ? val * 100 : val;
    return Math.min(100, Math.max(0, Math.round(rate)));
  };

  const formatPlural = (count: number, singular: string, plural: string): string => {
    return `${count} ${count === 1 ? singular : plural}`;
  };

  const topCategory = summary.categories && summary.categories.length > 0 ? summary.categories[0].category_name : "Uncategorized";
  const topCategoryCount = summary.categories && summary.categories.length > 0 ? summary.categories[0].count : 0;
  const slaPercentage = formatSlaRate(summary.sla_compliance_rate);
  const totalCategoryComplaints = summary.categories.reduce((acc, cat) => acc + cat.count, 0);

  const recurringHotspots = hotspots.filter((h) => h.complaint_count >= 2);
  const activeCasesCount = summary.statuses
    .filter((s) => !["resolved", "closed", "rejected"].includes(s.status.toLowerCase()))
    .reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b border-[#D6CFC3] pb-6 space-y-2">
        <span className="font-sans text-xs font-semibold tracking-widest uppercase text-[#5D5A55]">
          CITY OPERATIONAL INTELLIGENCE
        </span>
        <h1 className="font-serif-civic text-3xl sm:text-4xl lg:text-5xl font-bold text-[#161616] tracking-tight">
          Understand the City Behind the Complaints.
        </h1>
        <p className="font-sans text-base text-[#5D5A55] max-w-3xl leading-relaxed">
          Identify recurring issues, service patterns, SLA performance, and geographic concentrations across municipal operations.
        </p>
      </div>

      {/* Top Intelligence KPI Summary Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-1">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#5D5A55]">
            Total Complaints
          </span>
          <div className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616]">
            {summary.total_complaints}
          </div>
        </Card>

        <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-1">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#5D5A55]">
            Active Cases
          </span>
          <div className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616]">
            {activeCasesCount}
          </div>
        </Card>

        <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-1">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#5D5A55]">
            SLA Compliance
          </span>
          <div className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616]">
            {slaPercentage}%
          </div>
        </Card>

        <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-1">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-[#5D5A55]">
            Recurring Hotspots
          </span>
          <div className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616]">
            {recurringHotspots.length}
          </div>
        </Card>
      </div>

      {/* Geographic Complaint Hotspots Map Section */}
      <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-4">
        <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-3">
          <div className="flex items-center gap-2">
            <HotspotIcon className="w-5 h-5 text-[#292724]" />
            <div>
              <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
                Geographic Complaint Hotspots
              </h3>
              <p className="font-sans text-xs text-[#5D5A55]">
                Spatial distribution and recurring complaint concentrations across Patna
              </p>
            </div>
          </div>
          <Badge variant={recurringHotspots.length > 0 ? "critical" : "neutral"}>
            {recurringHotspots.length > 0
              ? `${recurringHotspots.length} Active Hotspot Clusters`
              : "No Active Clusters"}
          </Badge>
        </div>

        {/* Interactive Leaflet Map */}
        <HotspotMap hotspots={hotspots} />
      </Card>

      {/* Complaint Volume Trend */}
      <Card variant="primary" padding="lg" className="border-[#D6CFC3] shadow-civic space-y-4">
        <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-3">
          <div className="flex items-center gap-2">
            <AnalyticsIcon className="w-5 h-5 text-[#292724]" />
            <div>
              <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
                Complaint Activity Trend
              </h3>
              <p className="font-sans text-xs text-[#5D5A55]">
                Reported civic issues over the recent observation period
              </p>
            </div>
          </div>
          <Badge variant="neutral">
            {trends.length === 1 ? "Last 1 Day Timeline" : `Last ${trends.length} Days Timeline`}
          </Badge>
        </div>

        <SimpleLineChart data={trends} height={260} />
      </Card>

      {/* Category & SLA Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Category Distribution */}
        <Card variant="primary" padding="lg" className="lg:col-span-7 border-[#D6CFC3] shadow-civic space-y-4">
          <div className="flex items-center gap-2 border-b border-[#D6CFC3] pb-3">
            <CityIcon className="w-5 h-5 text-[#292724]" />
            <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
              Category Distribution
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            {summary.categories.map((cat) => {
              const pct = totalCategoryComplaints > 0 ? Math.round((cat.count / totalCategoryComplaints) * 100) : 0;
              return (
                <div key={cat.category_name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-sans">
                    <span className="font-medium text-[#161616] truncate max-w-xs">{cat.category_name}</span>
                    <span className="font-serif-civic font-bold text-[#161616]">{cat.count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#EAE4DA] rounded-xs overflow-hidden">
                    <div className="h-full bg-[#292724] rounded-xs" style={{ width: `${Math.max(pct, 4)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* SLA Performance Card */}
        <Card variant="primary" padding="lg" className="lg:col-span-5 border-[#D6CFC3] shadow-civic space-y-6">
          <div className="flex items-center gap-2 border-b border-[#D6CFC3] pb-3">
            <ClockIcon className="w-5 h-5 text-[#292724]" />
            <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
              Service-Level Performance
            </h3>
          </div>

          <div className="text-center space-y-2 py-4">
            <span className="font-serif-civic text-6xl font-bold text-[#161616]">
              {slaPercentage}%
            </span>
            <p className="font-sans text-sm text-[#5D5A55] font-medium">
              Within Target Resolution Response Window
            </p>
            <div className="w-full h-2.5 bg-[#EAE4DA] rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
              <div className="h-full bg-[#B7A58A] rounded-full" style={{ width: `${slaPercentage}%` }} />
            </div>
          </div>

          <div className="p-4 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm text-xs font-sans space-y-2">
            <div className="flex justify-between">
              <span className="text-[#5D5A55]">Total Resolved Cases:</span>
              <span className="font-bold text-[#161616]">
                {summary.statuses.find((s) => s.status.toLowerCase() === "resolved")?.count || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5D5A55]">Operational Compliance Target:</span>
              <span className="font-bold text-[#161616]">85.0%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Hotspots & What The Data Shows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Hotspots List */}
        <Card variant="primary" padding="lg" className="lg:col-span-7 border-[#D6CFC3] shadow-civic space-y-4">
          <div className="flex items-center gap-2 border-b border-[#D6CFC3] pb-3">
            <HotspotIcon className="w-5 h-5 text-[#292724]" />
            <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
              Geographic Activity &amp; Hotspots ({formatPlural(hotspots.length, "location", "locations")})
            </h3>
          </div>

          {hotspots.length > 0 ? (
            <div className="space-y-3">
              {hotspots.map((hs) => (
                <div
                  key={hs.id}
                  className="p-4 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <h4 className="font-serif-civic text-base font-bold text-[#161616]">
                      {hs.primary_category || "Uncategorized"}{" "}
                      {hs.complaint_count >= 2 ? "Cluster" : "Reported Location"}
                    </h4>
                    <p className="font-sans text-[#5D5A55]">
                      Location: {hs.location_name || `Coordinates (${hs.latitude.toFixed(3)}, ${hs.longitude.toFixed(3)})`}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={hs.complaint_count >= 2 ? "critical" : "neutral"}>
                      {formatPlural(hs.complaint_count, "Complaint", "Complaints")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs text-[#5D5A55] italic py-4">
              No recurring geographic hotspots detected yet.
            </p>
          )}
        </Card>

        {/* Derived Insight Callout: What the Data Shows */}
        <Card variant="secondary" padding="lg" className="lg:col-span-5 border-[#D6CFC3] space-y-4">
          <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
            What the Data Shows
          </h3>
          <p className="font-sans text-xs text-[#5D5A55] leading-relaxed">
            Deterministic insight callouts calculated from active complaint records:
          </p>

          <div className="space-y-3 font-sans text-xs">
            <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1">
              <span className="font-semibold text-[#161616] block">Category Concentration</span>
              <p className="text-[#5D5A55]">
                &quot;{topCategory}&quot; represents the highest volume category with {formatPlural(topCategoryCount, "reported issue", "reported issues")}.
              </p>
            </div>

            <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1">
              <span className="font-semibold text-[#161616] block">Spatial Clustering</span>
              <p className="text-[#5D5A55]">
                {recurringHotspots.length > 0
                  ? `${formatPlural(recurringHotspots.length, "active geographic hotspot cluster is", "active geographic hotspot clusters are")} currently detected.`
                  : "No high-density complaint clusters detected in current timeframe."}
              </p>
            </div>

            <div className="p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm space-y-1">
              <span className="font-semibold text-[#161616] block">SLA Target Alignment</span>
              <p className="text-[#5D5A55]">
                Overall SLA resolution compliance is calculated at {slaPercentage}%.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

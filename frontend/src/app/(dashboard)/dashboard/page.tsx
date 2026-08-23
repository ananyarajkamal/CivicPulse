"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AnalyticsPanel from "@/components/dashboard/AnalyticsPanel";
import KPICards from "@/components/dashboard/KPICards";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  fetchAnalyticsHotspotsApi,
  fetchAnalyticsSummaryApi,
  fetchAnalyticsTrendsApi,
} from "@/lib/api/analytics";
import { fetchKpisApi, fetchStaffComplaintsQueueApi } from "@/lib/api/staff";
import { useAuthStore } from "@/store/authStore";
import type {
  AnalyticsSummaryResponse,
  HotspotClusterItem,
  TrendDataPoint,
} from "@/types/analytics";
import type {
  KPIResponse,
  StaffComplaintDetailResponse,
} from "@/types/staff_complaint";

type BadgeVariantType =
  | "reported"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "neutral";

export default function DashboardOverviewPage() {
  const { user, accessToken } = useAuthStore();
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<StaffComplaintDetailResponse[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [analyticsTrends, setAnalyticsTrends] = useState<TrendDataPoint[]>([]);
  const [analyticsHotspots, setAnalyticsHotspots] = useState<HotspotClusterItem[]>([]);
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetchKpisApi(accessToken).catch(() => null),
      fetchStaffComplaintsQueueApi({}, accessToken).catch(() => []),
      fetchAnalyticsSummaryApi(accessToken).catch(() => null),
      fetchAnalyticsTrendsApi(30, accessToken).catch(() => []),
      fetchAnalyticsHotspotsApi(accessToken).catch(() => []),
    ])
      .then(([kpiRes, queueRes, summaryRes, trendsRes, hotspotsRes]) => {
        if (!kpiRes && queueRes.length === 0 && !summaryRes) {
          setError("Unable to connect to CivicPulse services. Please check network connection.");
        } else {
          setError(null);
          setKpis(kpiRes);
          setRecentComplaints(queueRes.slice(0, 5));
          setAnalyticsSummary(summaryRes);
          setAnalyticsTrends(trendsRes);
          setAnalyticsHotspots(hotspotsRes);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to connect to CivicPulse services. Please try again.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!accessToken) return;

    Promise.all([
      fetchKpisApi(accessToken).catch(() => null),
      fetchStaffComplaintsQueueApi({}, accessToken).catch(() => []),
      fetchAnalyticsSummaryApi(accessToken).catch(() => null),
      fetchAnalyticsTrendsApi(30, accessToken).catch(() => []),
      fetchAnalyticsHotspotsApi(accessToken).catch(() => []),
    ])
      .then(([kpiRes, queueRes, summaryRes, trendsRes, hotspotsRes]) => {
        if (!kpiRes && queueRes.length === 0 && !summaryRes) {
          setError("Unable to connect to CivicPulse services. Please check network connection.");
        } else {
          setError(null);
          setKpis(kpiRes);
          setRecentComplaints(queueRes.slice(0, 5));
          setAnalyticsSummary(summaryRes);
          setAnalyticsTrends(trendsRes);
          setAnalyticsHotspots(hotspotsRes);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to connect to CivicPulse services. Please try again.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accessToken]);

  const getBadgeVariant = (val: string): BadgeVariantType => {
    const s = val.toLowerCase();
    if (["reported", "assigned", "in_progress", "resolved", "critical", "high", "medium", "low"].includes(s)) {
      return s as BadgeVariantType;
    }
    return "neutral";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-10">
      {/* Dashboard Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6CFC3] pb-6">
        <div>
          <span className="font-sans text-xs font-semibold tracking-widest text-[#5D5A55] uppercase block">
            {user?.role === "admin" ? "CITY-WIDE MUNICIPAL OPERATIONS OVERVIEW" : "DEPARTMENT OPERATIONS OVERVIEW"}
          </span>
          <h1 className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616] tracking-tight mt-1">
            Operational Dashboard
          </h1>
          <p className="font-sans text-sm text-[#5D5A55] mt-1">
            Real-time complaint triage, department workflow monitoring, and resolution progress.
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="font-serif-civic text-lg font-bold text-[#161616]">
            {user?.full_name}
          </div>
          <div className="font-sans text-xs text-[#5D5A55]">{formattedDate}</div>
        </div>
      </div>

      {/* Error State Banner */}
      {error && !loading && (
        <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
                Unable to Load Dashboard Data
              </h3>
              <p className="font-sans text-xs text-[#5D5A55] mt-0.5">
                {error}
              </p>
            </div>
            <Button variant="dark" size="sm" onClick={loadDashboardData} className="shrink-0">
              Retry Connection
            </Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic flex items-center justify-between">
          <div>
            <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
              Complaints Queue
            </h3>
            <p className="font-sans text-xs text-[#5D5A55] mt-0.5">
              Inspect and process incoming citizen reports
            </p>
          </div>
          <Link href="/dashboard/complaints">
            <Button variant="dark" size="sm">
              View Complaints Queue
            </Button>
          </Link>
        </Card>

        <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic flex items-center justify-between">
          <div>
            <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
              {user?.role === "admin" ? "City Intelligence" : "Department Intelligence"}
            </h3>
            <p className="font-sans text-xs text-[#5D5A55] mt-0.5">
              {user?.role === "admin"
                ? "Analyze city-wide trends and hotspot clusters"
                : "Analyze department trends and hotspot clusters"}
            </p>
          </div>
          <Link href="/dashboard/intelligence">
            <Button variant="outline" size="sm">
              {user?.role === "admin" ? "Open City Intelligence" : "Open Department Intelligence"}
            </Button>
          </Link>
        </Card>
      </div>

      {/* Operational KPI Summary */}
      <section className="space-y-3">
        <h2 className="font-serif-civic text-xl font-bold text-[#161616]">
          Key Operational Metrics
        </h2>
        <KPICards kpis={kpis} />
      </section>

      {/* Recent / Priority Complaints Preview Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-civic text-xl font-bold text-[#161616]">
            Recent &amp; Priority Complaints
          </h2>
          <Link href="/dashboard/complaints" className="font-sans text-xs font-semibold text-[#5D5A55] hover:text-[#161616] underline">
            View All ({kpis?.total_complaints ?? 0})
          </Link>
        </div>

        <Card variant="primary" padding="none" className="border-[#D6CFC3] shadow-civic overflow-hidden">
          {loading ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-[#B7A58A] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-sans text-xs text-[#5D5A55]">Loading complaints preview...</p>
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className="p-8 text-center font-sans text-sm text-[#5D5A55]">
              No complaints currently in the operational queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-[#EAE4DA] text-[#161616] uppercase tracking-wider font-semibold border-b border-[#D6CFC3]">
                  <tr>
                    <th className="p-3.5">Tracking ID</th>
                    <th className="p-3.5">Issue Title</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6CFC3]">
                  {recentComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-[#EAE4DA]/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#161616]">
                        {c.tracking_id}
                      </td>
                      <td className="p-3.5 font-medium text-[#161616] max-w-xs truncate">
                        {c.title || c.raw_text}
                      </td>
                      <td className="p-3.5 text-[#5D5A55]">
                        {c.department_name || "Unassigned"}
                      </td>
                      <td className="p-3.5">
                        <Badge variant={getBadgeVariant(c.priority)}>
                          {c.priority}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <Badge variant={getBadgeVariant(c.status)}>
                          {c.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <Link href={`/dashboard/complaints/${c.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* Compact City Intelligence Snapshot */}
      <section className="space-y-4 pt-4 border-t border-[#D6CFC3]">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-civic text-xl font-bold text-[#161616]">
            City Intelligence Overview
          </h2>
          <Link href="/dashboard/intelligence" className="font-sans text-xs font-semibold text-[#5D5A55] hover:text-[#161616] underline">
            Full Analytics View
          </Link>
        </div>

        <AnalyticsPanel summary={analyticsSummary} trends={analyticsTrends} hotspots={analyticsHotspots} />
      </section>
    </div>
  );
}

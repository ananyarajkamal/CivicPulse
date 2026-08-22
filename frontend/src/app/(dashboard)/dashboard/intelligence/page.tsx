"use client";

import React, { useEffect, useState } from "react";
import { FullCityIntelligenceView } from "@/components/dashboard/FullCityIntelligenceView";
import { Card } from "@/components/ui/Card";
import {
  fetchAnalyticsHotspotsApi,
  fetchAnalyticsSummaryApi,
  fetchAnalyticsTrendsApi,
} from "@/lib/api/analytics";
import { useAuthStore } from "@/store/authStore";
import type {
  AnalyticsSummaryResponse,
  HotspotClusterItem,
  TrendDataPoint,
} from "@/types/analytics";

export default function CityIntelligencePage() {
  const { accessToken } = useAuthStore();

  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [hotspots, setHotspots] = useState<HotspotClusterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      Promise.all([
        fetchAnalyticsSummaryApi(accessToken),
        fetchAnalyticsTrendsApi(30, accessToken),
        fetchAnalyticsHotspotsApi(accessToken),
      ])
        .then(([summaryRes, trendsRes, hotspotsRes]) => {
          setSummary(summaryRes);
          setTrends(trendsRes);
          setHotspots(hotspotsRes);
        })
        .catch((err: unknown) => {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load city intelligence data.");
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [accessToken]);

  return (
    <div className="space-y-8">
      {/* Intelligence Header */}
      <div className="border-b border-[#D6CFC3] pb-6">
        <span className="font-sans text-xs font-semibold tracking-widest text-[#5D5A55] uppercase block">
          MUNICIPAL INTELLIGENCE &amp; ANALYTICS
        </span>
        <h1 className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616] tracking-tight mt-1">
          City Intelligence
        </h1>
        <p className="font-sans text-sm text-[#5D5A55] mt-1">
          Aggregated complaint volume trends, department SLAs, and geographic hazard clusters.
        </p>
      </div>

      {loading && (
        <Card variant="primary" padding="lg" className="text-center py-16 space-y-4 shadow-civic">
          <div className="w-8 h-8 border-2 border-[#B7A58A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-sans text-xs font-medium text-[#161616]">
            Computing city-wide operational intelligence...
          </p>
        </Card>
      )}

      {error && !loading && (
        <Card variant="primary" padding="lg" className="text-center space-y-4 shadow-civic border-[#D6CFC3]">
          <h3 className="font-serif-civic text-2xl font-bold text-[#161616]">
            Unable to Load Intelligence Data
          </h3>
          <p className="font-sans text-sm text-[#5D5A55] max-w-md mx-auto">
            {error}
          </p>
        </Card>
      )}

      {!loading && !error && (
        <FullCityIntelligenceView summary={summary} trends={trends} hotspots={hotspots} />
      )}
    </div>
  );
}

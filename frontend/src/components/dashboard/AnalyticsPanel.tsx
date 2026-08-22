"use client";

import type { AnalyticsSummaryResponse, HotspotClusterItem, TrendDataPoint } from "@/types/analytics";

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

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            📊 City Intelligence & Analytics Breakdown
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational metrics, department performance, and SLA compliance analytics
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
          SLA Compliance: {summary.sla_compliance_rate}%
        </div>
      </div>

      {/* Grid Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trend Volume */}
        {trends.length > 0 && (
          <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-600">
              30-Day Complaint Volume Trend ({trends.length} active dates)
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {trends.slice(-10).map((t) => (
                <span key={t.date} className="px-2.5 py-1 bg-white border border-slate-200 rounded font-mono text-slate-800">
                  {t.date}: <strong className="text-blue-700">{t.count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold uppercase text-slate-600">
            Complaints by Category ({summary.categories.length})
          </h4>
          {summary.categories.length > 0 ? (
            <div className="space-y-2">
              {summary.categories.map((cat) => (
                <div key={cat.category_name} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{cat.category_name}</span>
                  <span className="font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-900">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No category data recorded.</p>
          )}
        </div>

        {/* Priority & Status Distribution */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-600 mb-2">
              Priority Distribution
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.priorities.map((p) => (
                <span
                  key={p.priority}
                  className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-300 rounded shadow-xs text-slate-900"
                >
                  <span className="uppercase text-slate-500 mr-1">{p.priority}:</span>
                  <span className="font-mono font-bold">{p.count}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase text-slate-600 mb-2">
              Status Distribution
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.statuses.map((st) => (
                <span
                  key={st.status}
                  className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-300 rounded shadow-xs text-slate-900"
                >
                  <span className="uppercase text-slate-500 mr-1">{st.status}:</span>
                  <span className="font-mono font-bold">{st.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hotspots Section */}
      {hotspots.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
            📍 Geographic Hotspot Concentration ({hotspots.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hotspots.slice(0, 6).map((h) => (
              <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="font-bold text-slate-900 truncate">{h.location_name}</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Lat: {h.latitude.toFixed(4)}, Lng: {h.longitude.toFixed(4)}
                </div>
                <div className="text-xs font-semibold text-blue-700 mt-1">
                  {h.complaint_count} Complaints Clustered
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

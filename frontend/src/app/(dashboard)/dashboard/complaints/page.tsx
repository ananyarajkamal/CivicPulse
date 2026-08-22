"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchDepartmentsApi, type DepartmentItem } from "@/lib/api/public";
import { fetchStaffComplaintsQueueApi } from "@/lib/api/staff";
import { useAuthStore } from "@/store/authStore";
import type { StaffComplaintDetailResponse } from "@/types/staff_complaint";

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

export default function ComplaintsQueuePage() {
  const { accessToken } = useAuthStore();

  const [complaints, setComplaints] = useState<StaffComplaintDetailResponse[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [slaFilter, setSlaFilter] = useState(""); // "" | "breached" | "ontrack"
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDepartmentsApi()
      .then(setDepartments)
      .catch(() => []);
  }, []);

  const loadQueue = () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    const filters: {
      status?: string;
      priority?: string;
      department_id?: string;
      sla_breached?: boolean;
    } = {};

    if (statusFilter) filters.status = statusFilter;
    if (priorityFilter) filters.priority = priorityFilter;
    if (departmentFilter) filters.department_id = departmentFilter;
    if (slaFilter === "breached") filters.sla_breached = true;
    if (slaFilter === "ontrack") filters.sla_breached = false;

    fetchStaffComplaintsQueueApi(filters, accessToken)
      .then(setComplaints)
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to load complaints queue.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!accessToken) return;
    const filters: {
      status?: string;
      priority?: string;
      department_id?: string;
      sla_breached?: boolean;
    } = {};

    if (statusFilter) filters.status = statusFilter;
    if (priorityFilter) filters.priority = priorityFilter;
    if (departmentFilter) filters.department_id = departmentFilter;
    if (slaFilter === "breached") filters.sla_breached = true;
    if (slaFilter === "ontrack") filters.sla_breached = false;

    fetchStaffComplaintsQueueApi(filters, accessToken)
      .then(setComplaints)
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to load complaints queue.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accessToken, statusFilter, priorityFilter, departmentFilter, slaFilter]);

  // Client-side search filtering by Tracking ID or Title/Description
  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.tracking_id.toLowerCase().includes(q) ||
      (c.title && c.title.toLowerCase().includes(q)) ||
      c.raw_text.toLowerCase().includes(q)
    );
  });

  const getBadgeVariant = (val: string): BadgeVariantType => {
    const s = val.toLowerCase();
    if (["reported", "assigned", "in_progress", "resolved", "critical", "high", "medium", "low"].includes(s)) {
      return s as BadgeVariantType;
    }
    return "neutral";
  };

  return (
    <div className="space-y-8">
      {/* Queue Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D6CFC3] pb-6">
        <div>
          <span className="font-sans text-xs font-semibold tracking-widest text-[#5D5A55] uppercase block">
            MUNICIPAL OPERATIONS WORKFLOW
          </span>
          <h1 className="font-serif-civic text-3xl sm:text-4xl font-bold text-[#161616] tracking-tight mt-1">
            Complaints Queue
          </h1>
          <p className="font-sans text-sm text-[#5D5A55] mt-1">
            Filter, inspect, and transition citizen complaint records across municipal departments.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadQueue} disabled={loading}>
          {loading ? "Refreshing..." : "↻ Refresh Queue"}
        </Button>
      </div>

      {/* Staff Filters Bar */}
      <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block font-sans text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-xs font-sans text-[#161616] focus:outline-none focus:ring-1 focus:ring-[#B7A58A]"
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block font-sans text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-xs font-sans text-[#161616] focus:outline-none focus:ring-1 focus:ring-[#B7A58A]"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block font-sans text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-xs font-sans text-[#161616] focus:outline-none focus:ring-1 focus:ring-[#B7A58A]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* SLA Filter */}
          <div>
            <label className="block font-sans text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider mb-1">
              SLA Status
            </label>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-xs font-sans text-[#161616] focus:outline-none focus:ring-1 focus:ring-[#B7A58A]"
            >
              <option value="">All SLA States</option>
              <option value="breached">SLA Breached Only</option>
              <option value="ontrack">On Track Only</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block font-sans text-[11px] font-semibold text-[#5D5A55] uppercase tracking-wider mb-1">
              Search Queue
            </label>
            <input
              type="text"
              placeholder="Search ID or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-xs font-sans text-[#161616] focus:outline-none focus:ring-1 focus:ring-[#B7A58A]"
            />
          </div>
        </div>
      </Card>

      {/* Error Message Banner */}
      {error && (
        <div className="p-4 bg-[#EAE4DA] border border-[#292724] text-[#161616] text-xs font-semibold rounded-sm">
          {error}
        </div>
      )}

      {/* Complaints Queue Table */}
      <Card variant="primary" padding="none" className="border-[#D6CFC3] shadow-civic overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#B7A58A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-sans text-xs text-[#5D5A55]">Loading complaints queue...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
              No Complaints Found
            </h3>
            <p className="font-sans text-xs text-[#5D5A55]">
              No complaints match the selected filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-[#EAE4DA] text-[#161616] uppercase tracking-wider font-semibold border-b border-[#D6CFC3]">
                <tr>
                  <th className="p-3.5">Tracking ID</th>
                  <th className="p-3.5">Issue Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">SLA Target</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6CFC3]">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-[#EAE4DA]/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#161616]">
                      {c.tracking_id}
                    </td>
                    <td className="p-3.5 font-medium text-[#161616] max-w-xs truncate">
                      {c.title || c.raw_text}
                    </td>
                    <td className="p-3.5 text-[#5D5A55]">
                      {c.category_name || "General"}
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
                    <td className="p-3.5 text-[#5D5A55]">
                      {c.sla_breached ? (
                        <Badge variant="critical">Breached</Badge>
                      ) : c.sla_deadline ? (
                        new Date(c.sla_deadline).toLocaleDateString()
                      ) : (
                        "Standard"
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link href={`/dashboard/complaints/${c.id}`}>
                        <Button variant="dark" size="sm" className="text-xs">
                          Inspect →
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
    </div>
  );
}

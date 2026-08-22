"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchCategoriesApi,
  fetchDepartmentsApi,
  geocodeAddressApi,
  submitComplaintApi,
  type CategoryItem,
  type DepartmentItem,
  type GeocodeItem,
} from "@/lib/api/public";

export default function CitizenLandingPage() {
  // Form fields
  const [rawText, setRawText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterContact, setSubmitterContact] = useState("");

  // Location state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [displayAddress, setDisplayAddress] = useState("");
  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<GeocodeItem[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Lists state
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Submission & UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [trackSearchId, setTrackSearchId] = useState("");
  const [copied, setCopied] = useState(false);

  // Load departments and categories on mount
  useEffect(() => {
    fetchDepartmentsApi().then(setDepartments);
    fetchCategoriesApi().then(setCategories);
  }, []);

  // Geocode address search handler
  const handleSearchAddress = async (query: string) => {
    setGeocodeQuery(query);
    if (query.trim().length < 3) {
      setGeocodeSuggestions([]);
      return;
    }

    try {
      const results = await geocodeAddressApi(query);
      setGeocodeSuggestions(results);
    } catch {
      setGeocodeSuggestions([]);
    }
  };

  const selectSuggestion = (item: GeocodeItem) => {
    setLat(item.lat);
    setLng(item.lng);
    setDisplayAddress(item.display_name);
    setLocationText(item.display_name);
    setGeocodeSuggestions([]);
  };

  // GPS Geolocation handler
  const handleGPSLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setDisplayAddress(`GPS: (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`);
      },
      (err) => {
        setGeoError(`Unable to retrieve location: ${err.message}`);
      }
    );
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rawText.trim().length < 10) {
      setError("Please describe the issue in at least 10 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await submitComplaintApi({
        raw_text: rawText,
        location_text: locationText || displayAddress || undefined,
        location_lat: lat ?? undefined,
        location_lng: lng ?? undefined,
        location_address: displayAddress || undefined,
        category_id: categoryId || undefined,
        department_id: departmentId || undefined,
        submitter_name: submitterName || undefined,
        submitter_contact: submitterContact || undefined,
      });

      setSubmittedId(response.tracking_id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to submit complaint. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (submittedId) {
      navigator.clipboard.writeText(submittedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CivicPulse</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              The Agentic Civic Resolution Platform — Citizen Portal
            </p>
          </div>
          <Link
            href="/auth/login"
            className="text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md border border-slate-700 transition-colors"
          >
            Staff Login →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Track Complaint Bar */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Track Existing Complaint
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Enter your 25-character Tracking ID (e.g. <code>CP-X7k2mN4qVpRsLwYzJb8nDg</code>)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="CP-..."
              value={trackSearchId}
              onChange={(e) => setTrackSearchId(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Link
              href={trackSearchId.trim() ? `/track/${encodeURIComponent(trackSearchId.trim())}` : "#"}
              className={`px-5 py-2 text-white font-medium text-sm rounded-md transition-colors ${
                trackSearchId.trim()
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              Track Status
            </Link>
          </div>
        </section>

        {/* Success Modal / Banner */}
        {submittedId ? (
          <section className="bg-emerald-50 border border-emerald-300 p-8 rounded-xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-emerald-900">
              Complaint Successfully Submitted
            </h2>
            <p className="text-slate-700 text-sm max-w-lg mx-auto">
              Your issue has been registered. Please save your public tracking ID to check resolution progress.
            </p>

            <div className="bg-white border border-emerald-200 p-4 rounded-lg inline-block font-mono text-lg font-bold text-slate-900 tracking-wide select-all">
              {submittedId}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                {copied ? "Copied to Clipboard!" : "Copy Tracking ID"}
              </button>
              <Link
                href={`/track/${submittedId}`}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md transition-colors"
              >
                Go to Tracker →
              </Link>
            </div>
          </section>
        ) : (
          /* Intake Form */
          <section className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Report a Municipal Issue
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                No account required. Your complaint will be structured and routed to the appropriate department.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Complaint Text */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Describe the Issue <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Describe the problem in detail (e.g. deep pothole on Main St near 5th Ave causing traffic hazard)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-slate-600 text-right mt-1">
                  {rawText.length}/2000 chars
                </div>
              </div>

              {/* Location Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-800">
                  Location Details
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search address or street location..."
                      value={geocodeQuery || locationText}
                      onChange={(e) => {
                        setLocationText(e.target.value);
                        handleSearchAddress(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Geocoding Suggestions */}
                    {geocodeSuggestions.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {geocodeSuggestions.map((item, idx) => (
                          <li
                            key={idx}
                            onClick={() => selectSuggestion(item)}
                            className="p-2 hover:bg-blue-50 text-xs text-slate-800 cursor-pointer border-b border-slate-100 last:border-0"
                          >
                            {item.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleGPSLocation}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-medium text-xs rounded-md transition-colors"
                  >
                    📍 Use My GPS
                  </button>
                </div>

                {geoError && (
                  <p className="text-xs text-red-600">{geoError}</p>
                )}

                {displayAddress && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                    Selected Location: {displayAddress}
                  </p>
                )}
              </div>

              {/* Category & Department Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Category (Optional)
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Department (Optional)
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a department...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Contact Info */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Voluntary Contact Info (Optional & Strictly Confidential)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your contact info is never shared publicly or exposed on tracking links.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email or Phone
                    </label>
                    <input
                      type="text"
                      placeholder="jane@example.com / +1234567890"
                      value={submitterContact}
                      onChange={(e) => setSubmitterContact(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Submitting Complaint..." : "Submit Anonymous Complaint"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

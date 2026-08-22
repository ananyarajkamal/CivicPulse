"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TrackingIcon, AnonymousIcon } from "@/components/ui/Icons";
import {
  fetchCategoriesApi,
  fetchDepartmentsApi,
  geocodeAddressApi,
  submitComplaintApi,
  type CategoryItem,
  type DepartmentItem,
  type GeocodeItem,
} from "@/lib/api/public";

export const IntakeFormSection: React.FC = () => {
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
        setDisplayAddress(
          `GPS: (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`
        );
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
    <section className="py-16 sm:py-24 bg-[#FBFAF7] border-b border-[#D6CFC3]">
      <Container size="default">
        {/* Track Complaint Bar */}
        <div id="track" className="scroll-mt-24 mb-16">
          <Card variant="secondary" padding="lg" className="border-[#D6CFC3]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <TrackingIcon className="w-5 h-5 text-[#292724]" />
                  <h3 className="font-serif-civic text-xl font-bold text-[#161616]">
                    Track Existing Complaint
                  </h3>
                </div>
                <p className="font-sans text-xs text-[#5D5A55]">
                  Enter your 25-character Tracking ID (e.g.{" "}
                  <code className="bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#D6CFC3] font-mono text-xs">
                    CP-X7k2mN4qVpRsLwYzJb8nDg
                  </code>
                  ) to view real-time status.
                </p>
              </div>

              <div className="flex w-full md:w-auto gap-2">
                <input
                  type="text"
                  placeholder="CP-..."
                  value={trackSearchId}
                  onChange={(e) => setTrackSearchId(e.target.value)}
                  className="flex-1 md:w-64 px-3.5 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
                />
                <Link
                  href={
                    trackSearchId.trim()
                      ? `/track/${encodeURIComponent(trackSearchId.trim())}`
                      : "#"
                  }
                >
                  <Button
                    variant="dark"
                    size="md"
                    disabled={!trackSearchId.trim()}
                    className="whitespace-nowrap"
                  >
                    Track Status
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Complaint Intake Form / Success Banner */}
        <div id="submit-complaint" className="scroll-mt-24">
          <SectionHeading
            eyebrow="CITIZEN PORTAL"
            title="Report a Civic Issue"
            subtitle="No account required. Your complaint will be structured, prioritized, and routed to the appropriate department."
            align="center"
          />

          {submittedId ? (
            <Card variant="primary" padding="lg" className="border-[#B7A58A] bg-[#FBFAF7] text-center space-y-6 max-w-2xl mx-auto shadow-civic">
              <div className="w-14 h-14 rounded-full bg-[#EAE4DA] text-[#292724] flex items-center justify-center mx-auto font-serif-civic text-2xl font-bold border border-[#B7A58A]">
                ✓
              </div>

              <div className="space-y-2">
                <h3 className="font-serif-civic text-3xl font-bold text-[#161616]">
                  Complaint Successfully Registered
                </h3>
                <p className="font-sans text-sm text-[#5D5A55] max-w-md mx-auto">
                  Your civic report has been submitted and queued for AI triage and department routing. Please save your public tracking ID:
                </p>
              </div>

              <div className="bg-[#F5F1E8] border border-[#D6CFC3] p-4 rounded-sm font-mono text-lg font-bold text-[#161616] tracking-wide select-all inline-block">
                {submittedId}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button variant="secondary" size="md" onClick={copyToClipboard}>
                  {copied ? "Copied to Clipboard!" : "Copy Tracking ID"}
                </Button>

                <Link href={`/track/${submittedId}`}>
                  <Button variant="dark" size="md">
                    Go to Tracking Page →
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card variant="primary" padding="lg" className="max-w-3xl mx-auto border-[#D6CFC3] shadow-civic">
              {error && (
                <div className="p-4 mb-6 bg-[#EAE4DA] border border-[#292724] text-[#161616] text-sm rounded-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Issue Description */}
                <div>
                  <label className="block font-sans text-xs font-semibold tracking-wider uppercase text-[#161616] mb-2">
                    Describe the Issue <span className="text-[#9E524D]">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Describe the civic issue in detail (e.g. deep pothole on Main St near 5th Ave causing traffic hazard)..."
                    className="w-full px-4 py-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
                  />
                  <div className="font-sans text-xs text-[#5D5A55] text-right mt-1">
                    {rawText.length}/2000 chars
                  </div>
                </div>

                {/* Location Details */}
                <div className="space-y-2">
                  <label className="block font-sans text-xs font-semibold tracking-wider uppercase text-[#161616]">
                    Location Details
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search address or street location..."
                        value={geocodeQuery || locationText}
                        onChange={(e) => {
                          setLocationText(e.target.value);
                          handleSearchAddress(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
                      />

                      {/* Geocoding Suggestions */}
                      {geocodeSuggestions.length > 0 && (
                        <ul className="absolute z-20 w-full bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm shadow-civic mt-1 max-h-48 overflow-y-auto">
                          {geocodeSuggestions.map((item, idx) => (
                            <li
                              key={idx}
                              onClick={() => selectSuggestion(item)}
                              className="p-3 hover:bg-[#EAE4DA] text-xs text-[#161616] cursor-pointer border-b border-[#D6CFC3] last:border-0"
                            >
                              {item.display_name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={handleGPSLocation}
                      className="shrink-0"
                    >
                      📍 Use My GPS
                    </Button>
                  </div>

                  {geoError && (
                    <p className="font-sans text-xs text-[#9E524D]">{geoError}</p>
                  )}

                  {displayAddress && (
                    <div className="p-2.5 bg-[#EAE4DA]/60 border border-[#D6CFC3] rounded-sm font-sans text-xs text-[#161616] flex items-center justify-between">
                      <span>Selected: {displayAddress}</span>
                      <Badge variant="neutral">Verified Location</Badge>
                    </div>
                  )}
                </div>

                {/* Category & Department Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-sans text-xs font-semibold tracking-wider uppercase text-[#161616] mb-1.5">
                      Category (Optional)
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
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
                    <label className="block font-sans text-xs font-semibold tracking-wider uppercase text-[#161616] mb-1.5">
                      Department (Optional)
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
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

                {/* Voluntary Contact Info */}
                <div className="border-t border-[#D6CFC3] pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <AnonymousIcon className="w-4 h-4 text-[#5D5A55]" />
                    <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#161616]">
                      Voluntary Contact Info (Optional &amp; Strictly Confidential)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-sans text-xs text-[#5D5A55] mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={submitterName}
                        onChange={(e) => setSubmitterName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-xs text-[#5D5A55] mb-1">
                        Email or Phone
                      </label>
                      <input
                        type="text"
                        placeholder="jane@example.com / +1234567890"
                        value={submitterContact}
                        onChange={(e) => setSubmitterContact(e.target.value)}
                        className="w-full px-3.5 py-2 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-[#161616] text-sm focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="dark"
                  size="lg"
                  disabled={loading}
                  className="w-full justify-center shadow-civic"
                >
                  {loading ? "Submitting Complaint..." : "Submit Anonymous Complaint →"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </Container>
    </section>
  );
};

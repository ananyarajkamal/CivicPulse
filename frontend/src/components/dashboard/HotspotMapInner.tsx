"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HotspotClusterItem } from "@/types/analytics";
import Link from "next/link";

interface HotspotMapInnerProps {
  hotspots: HotspotClusterItem[];
  onSelectHotspot?: (hotspot: HotspotClusterItem | null) => void;
}

function FitBounds({ hotspots }: { hotspots: HotspotClusterItem[] }) {
  const map = useMap();

  useEffect(() => {
    const valid = hotspots.filter(
      (h) =>
        typeof h.latitude === "number" &&
        typeof h.longitude === "number" &&
        !isNaN(h.latitude) &&
        !isNaN(h.longitude)
    );

    if (valid.length > 0) {
      const bounds = L.latLngBounds(
        valid.map((h) => [h.latitude, h.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [hotspots, map]);

  return null;
}

function createCustomIcon(count: number, isRecurring: boolean, isSelected: boolean) {
  const bg = isSelected ? "#161616" : isRecurring ? "#9E524D" : "#292724";
  const border = isSelected ? "#B7A58A" : "#FBFAF7";
  const scale = isSelected ? "scale(1.08)" : "scale(1)";

  const html = `
    <div style="
      background-color: ${bg};
      color: #FBFAF7;
      border: 2px solid ${border};
      border-radius: 9999px;
      padding: 4px 10px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 700;
      box-shadow: ${isSelected ? '0 0 0 3px rgba(183, 165, 138, 0.4), 0 6px 12px rgba(0,0,0,0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.25)'};
      transform: ${scale};
      transition: transform 0.15s ease-in-out;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    ">
      <span>${count} ${count === 1 ? "report" : "reports"}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "civic-custom-marker",
    iconSize: [88, 30],
    iconAnchor: [44, 15],
  });
}

export default function HotspotMapInner({ hotspots, onSelectHotspot }: HotspotMapInnerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const validHotspots = hotspots.filter(
    (h) =>
      typeof h.latitude === "number" &&
      typeof h.longitude === "number" &&
      !isNaN(h.latitude) &&
      !isNaN(h.longitude)
  );

  const defaultCenter: [number, number] =
    validHotspots.length > 0
      ? [validHotspots[0].latitude, validHotspots[0].longitude]
      : [40.7128, -74.0060];

  const handleMarkerClick = (item: HotspotClusterItem) => {
    setSelectedId(item.id);
    if (onSelectHotspot) {
      onSelectHotspot(item);
    }
  };

  return (
    <div className="w-full h-[380px] sm:h-[450px] rounded-sm overflow-hidden border border-[#D6CFC3] relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds hotspots={validHotspots} />

        {validHotspots.map((item) => {
          const isRecurring = item.complaint_count >= 2;
          const isSelected = selectedId === item.id;
          const icon = createCustomIcon(item.complaint_count, isRecurring, isSelected);

          return (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => handleMarkerClick(item),
              }}
            >
              <Popup className="civic-map-popup">
                <div className="font-sans text-xs space-y-2 p-1 min-w-[220px]">
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-[#D6CFC3] pb-1.5">
                    <strong className="font-serif-civic text-sm text-[#161616] leading-tight block">
                      {item.location_name}
                    </strong>
                    {isRecurring ? (
                      <span className="bg-[#9E524D] text-[#FBFAF7] text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                        Hotspot
                      </span>
                    ) : (
                      <span className="bg-[#292724] text-[#FBFAF7] text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                        Single Issue
                      </span>
                    )}
                  </div>

                  {/* Grid Details */}
                  <div className="space-y-1 text-[#5D5A55] text-xs">
                    <div className="flex justify-between">
                      <span>{isRecurring ? "Recurring Complaints:" : "Complaints:"}</span>
                      <strong className="text-[#161616] font-bold">{item.complaint_count}</strong>
                    </div>

                    {item.primary_category && (
                      <div className="flex justify-between">
                        <span>Primary Issue:</span>
                        <strong className="text-[#161616] truncate max-w-[130px]">{item.primary_category}</strong>
                      </div>
                    )}

                    {item.department_name && (
                      <div className="flex justify-between">
                        <span>Department:</span>
                        <strong className="text-[#161616] truncate max-w-[130px]">{item.department_name}</strong>
                      </div>
                    )}

                    {typeof item.open_cases === "number" && (
                      <div className="flex justify-between">
                        <span>Open / Resolved:</span>
                        <strong className="text-[#161616]">{item.open_cases} Open / {item.resolved_cases || 0} Done</strong>
                      </div>
                    )}

                    {item.highest_priority && (
                      <div className="flex justify-between">
                        <span>Highest Priority:</span>
                        <strong className="text-[#161616]">{item.highest_priority}</strong>
                      </div>
                    )}
                  </div>

                  {/* View Complaints Action */}
                  <div className="pt-2 border-t border-[#D6CFC3]">
                    <Link
                      href={`/dashboard/complaints?q=${encodeURIComponent(item.location_name)}`}
                      className="block text-center w-full py-1 px-2 bg-[#292724] text-[#FBFAF7] font-sans text-xs font-semibold rounded-xs hover:bg-[#161616] transition-colors"
                    >
                      View Related Complaints
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

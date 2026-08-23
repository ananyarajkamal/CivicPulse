"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HotspotClusterItem } from "@/types/analytics";

interface HotspotMapInnerProps {
  hotspots: HotspotClusterItem[];
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

function createCustomIcon(count: number, isRecurring: boolean) {
  const bg = isRecurring ? "#9E524D" : "#292724";

  const html = `
    <div style="
      background-color: ${bg};
      color: #FBFAF7;
      border: 2px solid #FBFAF7;
      border-radius: 9999px;
      padding: 4px 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    ">
      <span>📍</span>
      <span>${count} ${count === 1 ? "report" : "reports"}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "civic-custom-marker",
    iconSize: [80, 28],
    iconAnchor: [40, 14],
  });
}

export default function HotspotMapInner({ hotspots }: HotspotMapInnerProps) {
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
      : [25.61, 85.14];

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
          const icon = createCustomIcon(item.complaint_count, isRecurring);

          return (
            <Marker
              key={item.id}
              position={[item.latitude, item.longitude]}
              icon={icon}
            >
              <Popup>
                <div className="font-sans text-xs space-y-1.5 p-0.5">
                  <div className="flex items-center justify-between gap-2 border-b border-[#D6CFC3] pb-1">
                    <strong className="font-serif-civic text-sm text-[#161616]">
                      {item.location_name}
                    </strong>
                    {isRecurring && (
                      <span className="bg-[#9E524D] text-[#FBFAF7] text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Hotspot
                      </span>
                    )}
                  </div>
                  <div className="text-[#5D5A55]">
                    <span className="font-semibold text-[#161616]">
                      {item.complaint_count}
                    </span>{" "}
                    {item.complaint_count === 1
                      ? "complaint"
                      : "related complaints"}
                  </div>
                  {item.primary_category && (
                    <div className="text-[#5D5A55]">
                      Category:{" "}
                      <strong className="text-[#161616]">
                        {item.primary_category}
                      </strong>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

"use client";

import React, { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { HotspotClusterItem } from "@/types/analytics";
import { Card } from "@/components/ui/Card";

interface HotspotMapProps {
  hotspots: HotspotClusterItem[];
  onSelectHotspot?: (hotspot: HotspotClusterItem | null) => void;
}

const HotspotMapInner = dynamic(() => import("./HotspotMapInner"), {
  ssr: false,
  loading: () => (
    <Card
      variant="primary"
      padding="lg"
      className="w-full h-[380px] sm:h-[450px] flex flex-col items-center justify-center space-y-3 border-[#D6CFC3]"
    >
      <div className="w-8 h-8 border-2 border-[#B7A58A] border-t-transparent rounded-full animate-spin" />
      <p className="font-sans text-xs text-[#5D5A55]">
        Loading geographic hotspot map...
      </p>
    </Card>
  ),
});

interface ErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card
          variant="primary"
          padding="md"
          className="p-6 text-center space-y-2 border-[#D6CFC3]"
        >
          <h4 className="font-serif-civic font-bold text-base text-[#161616]">
            Map View Unavailable
          </h4>
          <p className="font-sans text-xs text-[#5D5A55]">
            Interactive map visualization encountered a display issue. Geographic
            hotspot clusters remain available in the summary view below.
          </p>
        </Card>
      );
    }
    return this.props.children;
  }
}

export const HotspotMap: React.FC<HotspotMapProps> = ({ hotspots, onSelectHotspot }) => {
  const validHotspots = hotspots.filter(
    (h) =>
      typeof h.latitude === "number" &&
      typeof h.longitude === "number" &&
      !isNaN(h.latitude) &&
      !isNaN(h.longitude)
  );

  if (validHotspots.length === 0) {
    return (
      <Card
        variant="primary"
        padding="lg"
        className="text-center py-12 space-y-2 border-[#D6CFC3] shadow-civic"
      >
        <h4 className="font-serif-civic text-lg font-bold text-[#161616]">
          No Recurring Geographic Hotspots Detected Yet
        </h4>
        <p className="font-sans text-xs text-[#5D5A55] max-w-md mx-auto leading-relaxed">
          Hotspots appear automatically on the city map when multiple civic
          complaints are reported in close proximity around the same area.
        </p>
      </Card>
    );
  }

  return (
    <MapErrorBoundary>
      <HotspotMapInner hotspots={validHotspots} onSelectHotspot={onSelectHotspot} />
    </MapErrorBoundary>
  );
};

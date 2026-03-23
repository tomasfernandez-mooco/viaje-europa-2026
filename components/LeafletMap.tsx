"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MarkerData = {
  id: string;
  city: string;
  lat: number;
  lng: number;
  description?: string | null;
  dateRange?: string | null;
  selected?: boolean;
  variant?: "location" | "itinerary";
};

type Props = {
  markers: MarkerData[];
  selectedId: string | null;
  onMarkerClick: (id: string) => void;
  className?: string;
};

export default function LeafletMap({ markers, selectedId, onMarkerClick, className }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
    }).setView([43.0, 12.0], 5);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Attribution in bottom-right (minimal)
    L.control.attribution({ position: "bottomright", prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>')
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const validMarkers = markers.filter((m) => m.lat && m.lng);
    if (validMarkers.length === 0) return;

    // Draw polyline connecting locations in order
    const coords = validMarkers.map((m) => [m.lat, m.lng] as L.LatLngTuple);
    const polyline = L.polyline(coords, {
      color: "#8B6F4E",
      weight: 2,
      opacity: 0.4,
      dashArray: "6, 8",
    }).addTo(map);

    // Add markers
    validMarkers.forEach((m, i) => {
      const isSelected = m.id === selectedId;
      const isItinerary = m.variant === "itinerary";
      const fillColor = isSelected ? (isItinerary ? "#6366f1" : "#8B6F4E") : (isItinerary ? "#818cf8" : "#1C1917");
      const borderColor = isSelected ? (isItinerary ? "#a5b4fc" : "#C4A97D") : (isItinerary ? "#6366f1" : "#8B6F4E");
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: isSelected ? 10 : (isItinerary ? 5 : 6),
        fillColor,
        color: borderColor,
        weight: isSelected ? 3 : 1.5,
        fillOpacity: isSelected ? 1 : (isItinerary ? 0.7 : 0.8),
      }).addTo(map);

      // Tooltip
      marker.bindTooltip(
        `<div style="font-size:11px;font-weight:600;">${i + 1}. ${m.city}</div>${m.dateRange ? `<div style="font-size:10px;opacity:0.7;">${m.dateRange}</div>` : ""}`,
        { direction: "top", offset: [0, -8], className: "leaflet-tooltip-custom" }
      );

      marker.on("click", () => onMarkerClick(m.id));
      markersRef.current.set(m.id, marker);
    });

    // Fit bounds
    if (validMarkers.length > 1) {
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    }

    return () => {
      polyline.remove();
    };
  }, [markers, selectedId, onMarkerClick]);

  // Pan to selected
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const m = markers.find((m) => m.id === selectedId);
    if (m?.lat && m?.lng) {
      mapRef.current.flyTo([m.lat, m.lng], 8, { duration: 0.8 });
    }
  }, [selectedId, markers]);

  return (
    <>
      <style jsx global>{`
        .leaflet-tooltip-custom {
          background: #1C1917;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 6px 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .leaflet-tooltip-custom::before {
          border-top-color: #1C1917;
        }
      `}</style>
      <div ref={containerRef} className={className} style={{ minHeight: 400 }} />
    </>
  );
}

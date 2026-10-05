'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { ItineraryStop } from '@/lib/api';

function pinIcon(affinity: number): L.DivIcon {
  const pct = Math.round(affinity * 100);
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:34px;border-radius:9999px;
      background:#9333ea;color:#fff;font-size:11px;font-weight:800;
      display:flex;align-items:center;justify-content:center;
      border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);
    ">${pct}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function FitBounds({ stops }: { stops: ItineraryStop[] }) {
  const map = useMap();
  const pts = useMemo(
    () => stops.filter((s) => s.lat != null && s.lng != null).map((s) => [s.lat!, s.lng!] as [number, number]),
    [stops],
  );
  useEffect(() => {
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts).pad(0.25));
  }, [map, pts]);
  return null;
}

export default function PlanMap({ stops }: { stops: ItineraryStop[] }) {
  const geo = stops.filter((s) => s.lat != null && s.lng != null);
  if (geo.length === 0) return null;
  const center: [number, number] = [geo[0]!.lat!, geo[0]!.lng!];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        className="h-64 w-full sm:h-80"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds stops={stops} />
        {geo.map((s, i) => (
          <Marker key={s.qlooId ?? i} position={[s.lat!, s.lng!]} icon={pinIcon(s.affinity)}>
            <Popup>
              <strong>{i + 1}. {s.name}</strong>
              <br />
              <span style={{ fontSize: 12 }}>{s.rationale}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

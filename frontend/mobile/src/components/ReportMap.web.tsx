import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  coords: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
};

const DEFAULT_CENTER: L.LatLngExpression = [20.95, 85.1];

export default function ReportMap({ coords, onChange }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!element.current || map.current) return undefined;

    const initial = coords ? [coords.lat, coords.lng] as L.LatLngExpression : DEFAULT_CENTER;
    const instance = L.map(element.current, { zoomControl: true }).setView(initial, coords ? 15 : 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(instance);
    instance.on('click', (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }));
    map.current = instance;

    return () => {
      instance.remove();
      map.current = null;
    };
  }, [onChange]);

  useEffect(() => {
    if (!map.current) return;
    window.setTimeout(() => map.current?.invalidateSize(), 0);
    if (!coords) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const position: L.LatLngExpression = [coords.lat, coords.lng];
    if (!marker.current) {
      marker.current = L.marker(position).addTo(map.current);
    } else {
      marker.current.setLatLng(position);
    }
    map.current.setView(position, Math.max(map.current.getZoom(), 15));
  }, [coords]);

  return <div ref={element} style={{ width: '100%', height: 190, borderRadius: 16, overflow: 'hidden' }} aria-label="Interactive grievance location map" />;
}

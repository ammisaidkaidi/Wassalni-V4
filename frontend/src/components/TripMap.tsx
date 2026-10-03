import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';
import { useMemo } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';

export interface MapStop {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export interface MapPin {
  id: string;
  label: string;
  lat: number;
  lon: number;
  color: string;
}

interface TripMapProps {
  /** Ordered trajectory stops — drawn as a dashed route line + blue dots. */
  stops: MapStop[];
  /** Extra markers (e.g. passenger pickup positions), colored by status. */
  pins?: MapPin[];
  /** Marker(s) the user is actively placing (customer map-picker mode). */
  pickedMarkers?: MapPin[];
  /** When set, clicking the map reports the clicked lat/lon (picker mode). */
  onPick?: (lat: number, lon: number) => void;
  height?: number;
}

const ALGERIA_CENTER: LatLngExpression = [28.0339, 1.6596];

function ClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Small Leaflet/OpenStreetMap wrapper shared by the driver trip map and the customer pickup-point picker. */
export default function TripMap({ stops, pins = [], pickedMarkers = [], onPick, height = 360 }: TripMapProps) {
  const allPoints = useMemo(() => [...stops, ...pins, ...pickedMarkers], [stops, pins, pickedMarkers]);
  const center = useMemo<LatLngExpression>(() => {
    if (allPoints.length === 0) return ALGERIA_CENTER;
    const lat = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
    const lon = allPoints.reduce((s, p) => s + p.lon, 0) / allPoints.length;
    return [lat, lon];
  }, [allPoints]);
  const zoom = allPoints.length > 0 ? 7 : 5;
  const line: LatLngExpression[] = stops.map((s) => [s.lat, s.lon]);

  return (
    <div style={{ height, borderRadius: 8, overflow: 'hidden' }}>
      {/* key forces a clean remount when the route changes, avoiding stale Leaflet center/zoom */}
      <MapContainer key={`${stops.map((s) => s.id).join(',')}`} center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPick && <ClickHandler onPick={onPick} />}
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#2563eb', weight: 3, dashArray: '6 8' }} />}
        {stops.map((s) => (
          <CircleMarker key={s.id} center={[s.lat, s.lon]} radius={7} pathOptions={{ color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.9, weight: 2 }}>
            <Tooltip direction="top" offset={[0, -6]}>{s.label}</Tooltip>
          </CircleMarker>
        ))}
        {pins.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={8} pathOptions={{ color: p.color, fillColor: p.color, fillOpacity: 0.85, weight: 2 }}>
            <Tooltip direction="top" offset={[0, -8]}>{p.label}</Tooltip>
          </CircleMarker>
        ))}
        {pickedMarkers.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={9} pathOptions={{ color: '#111827', fillColor: p.color, fillOpacity: 0.95, weight: 3 }}>
            <Tooltip direction="top" offset={[0, -8]} permanent>
              {p.label}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

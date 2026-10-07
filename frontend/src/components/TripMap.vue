<script setup lang="ts">
/**
 * Small Leaflet/OpenStreetMap wrapper shared by the driver trip map and the
 * customer pickup-point picker.
 *
 * Ported per the locked decision to call Leaflet directly (no Vue-Leaflet
 * wrapper library) — the map/layers are built imperatively in onMounted and
 * kept in sync with props via a single watcher, mirroring exactly what
 * react-leaflet did declaratively under the hood (including the original's
 * "remount on route change" trick, replicated here as "tear down + rebuild
 * the polyline/markers layer group on every stops/pins/pickedMarkers change").
 */
import 'leaflet/dist/leaflet.css';
import L, { type LatLngExpression } from 'leaflet';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { MapPin, MapStop } from './TripMap.types';

const props = withDefaults(
  defineProps<{
    /** Ordered trajectory stops — drawn as a dashed route line + blue dots. */
    stops: MapStop[];
    /** Extra markers (e.g. passenger pickup positions), colored by status. */
    pins?: MapPin[];
    /** Marker(s) the user is actively placing (customer map-picker mode). */
    pickedMarkers?: MapPin[];
    height?: number;
  }>(),
  { pins: () => [], pickedMarkers: () => [], height: 360 },
);

const emit = defineEmits<{
  /** When listened to, clicking the map reports the clicked lat/lon (picker mode). */
  pick: [lat: number, lon: number];
}>();

const ALGERIA_CENTER: LatLngExpression = [28.0339, 1.6596];

const container = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let layerGroup: L.LayerGroup | null = null;
let clickHandler: ((e: L.LeafletMouseEvent) => void) | null = null;

function computeCenterZoom(): { center: LatLngExpression; zoom: number } {
  const allPoints = [...props.stops, ...props.pins, ...props.pickedMarkers];
  if (allPoints.length === 0) return { center: ALGERIA_CENTER, zoom: 5 };
  const lat = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
  const lon = allPoints.reduce((s, p) => s + p.lon, 0) / allPoints.length;
  return { center: [lat, lon], zoom: 7 };
}

function redraw(): void {
  if (!map) return;
  layerGroup?.remove();
  layerGroup = L.layerGroup().addTo(map);

  const line: LatLngExpression[] = props.stops.map((s) => [s.lat, s.lon]);
  if (line.length > 1) {
    L.polyline(line, { color: '#2563eb', weight: 3, dashArray: '6 8' }).addTo(layerGroup);
  }

  for (const s of props.stops) {
    L.circleMarker([s.lat, s.lon], { radius: 7, color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.9, weight: 2 })
      .bindTooltip(s.label, { direction: 'top', offset: [0, -6] })
      .addTo(layerGroup);
  }
  for (const p of props.pins) {
    L.circleMarker([p.lat, p.lon], { radius: 8, color: p.color, fillColor: p.color, fillOpacity: 0.85, weight: 2 })
      .bindTooltip(p.label, { direction: 'top', offset: [0, -8] })
      .addTo(layerGroup);
  }
  for (const p of props.pickedMarkers) {
    L.circleMarker([p.lat, p.lon], { radius: 9, color: '#111827', fillColor: p.color, fillOpacity: 0.95, weight: 3 })
      .bindTooltip(p.label, { direction: 'top', offset: [0, -8], permanent: true })
      .addTo(layerGroup);
  }

  const { center, zoom } = computeCenterZoom();
  map.setView(center, zoom);
}

onMounted(() => {
  if (!container.value) return;
  const { center, zoom } = computeCenterZoom();
  map = L.map(container.value, { scrollWheelZoom: true }).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  redraw();
});

onUnmounted(() => {
  if (clickHandler && map) map.off('click', clickHandler);
  map?.remove();
  map = null;
  layerGroup = null;
});

// Click-to-pick: always wired (replaces the original's conditional `onPick &&
// <ClickHandler onPick={onPick}/>`) — emitting 'pick' is a no-op if the
// parent isn't listening for it, so this is behaviorally identical.
onMounted(() => {
  if (!map) return;
  clickHandler = (e: L.LeafletMouseEvent) => emit('pick', e.latlng.lat, e.latlng.lng);
  map.on('click', clickHandler);
});

watch(
  () => [props.stops, props.pins, props.pickedMarkers],
  () => redraw(),
  { deep: true },
);
</script>

<template>
  <div ref="container" :style="{ height: `${height}px`, borderRadius: '8px', overflow: 'hidden' }" />
</template>

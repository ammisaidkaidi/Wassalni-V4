// Shared prop/marker types for TripMap.vue, pulled out of the component
// into their own module: Vue's `<script setup>` SFCs cannot have extra named
// exports alongside the implicit component export, so sibling files that
// need these types (TripDetailPage.vue, DriverPage.vue) import them from
// here instead of from the .vue file directly.
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

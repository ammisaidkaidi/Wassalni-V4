<script setup lang="ts">
/**
 * Task 10.1 — visual capacity selector.
 *
 * The domain model has no notion of individual, numbered physical seats —
 * a trip only tracks a total `capacity` and a running `seats_available`
 * count (see `trip`/`reservation.seats` in sql.txt). Rendering a seat *map*
 * with specific seat identities (1A, 1B, …) would therefore misrepresent
 * what the backend actually guarantees: which exact seat you get is never
 * promised, only how many. So instead of fake seat numbers, this shows one
 * icon per unit of capacity — greyed out for the portion already
 * occupied/held, highlighted for however many of the remaining ones the
 * customer currently has selected — which keeps every visual claim
 * (occupied vs free vs your pick) strictly honest.
 */
import { computed } from 'vue';
import { useI18n } from '../composables/useI18n';

const props = defineProps<{
  capacity: number;
  available: number;
  selected: number;
  /** Task 10.7 — surfaced here so the accessibility need is visible right where seats are picked. */
  accessible?: boolean;
}>();
const emit = defineEmits<{ change: [n: number] }>();

const { t } = useI18n();
const occupied = computed(() => Math.max(0, props.capacity - props.available));
const seatsDisplay = computed(() => Math.min(props.capacity, 60)); // cap the icon grid so a 200-seat bus doesn't render 200 spans
const scale = computed(() => (props.capacity > 0 ? seatsDisplay.value / props.capacity : 1));

interface SeatCell {
  i: number;
  isOccupied: boolean;
  isSelected: boolean;
  seatNumberAmongFree: number;
  title: string;
}

const seats = computed<SeatCell[]>(() =>
  Array.from({ length: seatsDisplay.value }, (_, i) => {
    const unitIndex = Math.floor(i / scale.value);
    const isOccupied = unitIndex < occupied.value;
    const seatNumberAmongFree = unitIndex - occupied.value + 1;
    const isSelected = !isOccupied && seatNumberAmongFree <= props.selected;
    const title = isOccupied
      ? t('seatPicker.occupiedTitle')
      : isSelected
        ? t('seatPicker.selectedTitle')
        : t('seatPicker.availableTitle');
    return { i, isOccupied, isSelected, seatNumberAmongFree, title };
  }),
);

function pick(seat: SeatCell): void {
  if (!seat.isOccupied) emit('change', seat.seatNumberAmongFree);
}
</script>

<template>
  <div class="seat-picker">
    <div class="seat-picker-grid" role="group" :aria-label="t('seatPicker.groupLabel')">
      <button
        v-for="seat in seats"
        :key="seat.i"
        type="button"
        :disabled="seat.isOccupied"
        :title="seat.title"
        :aria-label="seat.title"
        :aria-pressed="seat.isSelected"
        :class="`seat-icon${seat.isOccupied ? ' occupied' : seat.isSelected ? ' selected' : ' available'}`"
        @click="pick(seat)"
      >
        {{ accessible ? '♿' : '🪑' }}
      </button>
    </div>
    <div class="seat-picker-legend">
      <span><span class="seat-icon available" style="pointer-events: none" aria-hidden="true" /> {{ t('seatPicker.legendAvailable') }}</span>
      <span><span class="seat-icon selected" style="pointer-events: none" aria-hidden="true" /> {{ t('seatPicker.legendSelected', { count: selected }) }}</span>
      <span><span class="seat-icon occupied" style="pointer-events: none" aria-hidden="true" /> {{ t('seatPicker.legendOccupied') }}</span>
    </div>
    <p class="muted small">{{ t('seatPicker.summary', { available, capacity }) }}{{ accessible ? t('seatPicker.wheelchairNote') : '' }}</p>
  </div>
</template>

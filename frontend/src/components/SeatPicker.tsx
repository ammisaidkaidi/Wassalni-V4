import { useI18n } from '../i18n';

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
export default function SeatPicker({
  capacity,
  available,
  selected,
  onChange,
  accessible,
}: {
  capacity: number;
  available: number;
  selected: number;
  onChange: (n: number) => void;
  /** Task 10.7 — surfaced here so the accessibility need is visible right where seats are picked. */
  accessible?: boolean;
}) {
  const { t } = useI18n();
  const occupied = Math.max(0, capacity - available);
  const seatsDisplay = Math.min(capacity, 60); // cap the icon grid so a 200-seat bus doesn't render 200 spans
  const scale = capacity > 0 ? seatsDisplay / capacity : 1;

  return (
    <div className="seat-picker">
      <div className="seat-picker-grid" role="group" aria-label={t('seatPicker.groupLabel')}>
        {Array.from({ length: seatsDisplay }, (_, i) => {
          const unitIndex = Math.floor(i / scale);
          const isOccupied = unitIndex < occupied;
          const seatNumberAmongFree = unitIndex - occupied + 1;
          const isSelected = !isOccupied && seatNumberAmongFree <= selected;
          const title = isOccupied
            ? t('seatPicker.occupiedTitle')
            : isSelected
              ? t('seatPicker.selectedTitle')
              : t('seatPicker.availableTitle');
          return (
            <button
              key={i}
              type="button"
              disabled={isOccupied}
              title={title}
              aria-label={title}
              aria-pressed={isSelected}
              className={`seat-icon${isOccupied ? ' occupied' : isSelected ? ' selected' : ' available'}`}
              onClick={() => !isOccupied && onChange(seatNumberAmongFree)}
            >
              {accessible ? '♿' : '🪑'}
            </button>
          );
        })}
      </div>
      <div className="seat-picker-legend">
        <span>
          <span className="seat-icon available" style={{ pointerEvents: 'none' }} aria-hidden="true" />{' '}
          {t('seatPicker.legendAvailable')}
        </span>
        <span>
          <span className="seat-icon selected" style={{ pointerEvents: 'none' }} aria-hidden="true" />{' '}
          {t('seatPicker.legendSelected', { count: selected })}
        </span>
        <span>
          <span className="seat-icon occupied" style={{ pointerEvents: 'none' }} aria-hidden="true" />{' '}
          {t('seatPicker.legendOccupied')}
        </span>
      </div>
      <p className="muted small">
        {t('seatPicker.summary', { available, capacity })}
        {accessible && t('seatPicker.wheelchairNote')}
      </p>
    </div>
  );
}

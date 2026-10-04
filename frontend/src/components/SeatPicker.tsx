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
  const occupied = Math.max(0, capacity - available);
  const seatsDisplay = Math.min(capacity, 60); // cap the icon grid so a 200-seat bus doesn't render 200 spans
  const scale = capacity > 0 ? seatsDisplay / capacity : 1;

  return (
    <div className="seat-picker">
      <div className="seat-picker-grid" role="group" aria-label="Places disponibles">
        {Array.from({ length: seatsDisplay }, (_, i) => {
          const unitIndex = Math.floor(i / scale);
          const isOccupied = unitIndex < occupied;
          const seatNumberAmongFree = unitIndex - occupied + 1;
          const isSelected = !isOccupied && seatNumberAmongFree <= selected;
          return (
            <button
              key={i}
              type="button"
              disabled={isOccupied}
              title={isOccupied ? 'Place déjà occupée/retenue' : isSelected ? 'Place sélectionnée' : 'Place disponible'}
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
          <span className="seat-icon available" style={{ pointerEvents: 'none' }} /> Disponible
        </span>
        <span>
          <span className="seat-icon selected" style={{ pointerEvents: 'none' }} /> Votre sélection ({selected})
        </span>
        <span>
          <span className="seat-icon occupied" style={{ pointerEvents: 'none' }} /> Occupée/retenue
        </span>
      </div>
      <p className="muted small">
        {available} place(s) libre(s) sur {capacity}. Le modèle ne réserve pas un siège précis — uniquement le nombre de places.
        {accessible && ' Véhicule accessible en fauteuil roulant.'}
      </p>
    </div>
  );
}

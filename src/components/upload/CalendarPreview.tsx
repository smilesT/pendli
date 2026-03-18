import type { Appointment } from '../../types/index.ts';
import { formatTimeHHMM } from '../../lib/planner/time-utils.ts';

interface CalendarPreviewProps {
  appointments: Appointment[];
  onRemove: (id: string) => void;
}

export function CalendarPreview({ appointments, onRemove }: CalendarPreviewProps) {
  if (appointments.length === 0) return null;

  const sorted = [...appointments].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-anthracite">
        {appointments.length} Termin{appointments.length !== 1 ? 'e' : ''} erkannt
      </h3>
      <div className="space-y-2">
        {sorted.map((apt) => (
          <div
            key={apt.id}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-sbb-red font-bold">
                  {formatTimeHHMM(apt.startTime)}
                </span>
                <span className="text-slate text-xs">–</span>
                <span className="font-mono text-sm text-slate">
                  {formatTimeHHMM(apt.endTime)}
                </span>
              </div>
              <p className="text-sm font-medium text-anthracite truncate">
                {apt.title}
              </p>
              <p className="text-xs text-slate truncate">{apt.location}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(apt.id)}
              className="text-slate hover:text-danger transition-colors p-1 flex-shrink-0"
              aria-label={`${apt.title} entfernen`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

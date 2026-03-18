import type { Appointment } from '../../types/index.ts';
import { formatTimeHHMM } from '../../lib/planner/time-utils.ts';

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  return (
    <div className="relative pl-10">
      {/* Timeline connector */}
      <div className="absolute left-[1.2rem] top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-dark-border" />

      {/* Appointment dot */}
      <div className="absolute left-[0.65rem] top-4 w-3.5 h-3.5 rounded-full bg-sbb-red border-2 border-white dark:border-dark-card shadow-sm" />

      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg px-4 py-3 my-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-sbb-red">
            {formatTimeHHMM(appointment.startTime)}
          </span>
          <span className="text-slate dark:text-dark-muted text-xs">–</span>
          <span className="font-mono text-sm text-slate dark:text-dark-muted">
            {formatTimeHHMM(appointment.endTime)}
          </span>
        </div>
        <p className="text-sm font-semibold text-anthracite dark:text-dark-text mt-1">
          {appointment.title}
        </p>
        <p className="text-xs text-slate dark:text-dark-muted mt-0.5">{appointment.location}</p>
      </div>
    </div>
  );
}

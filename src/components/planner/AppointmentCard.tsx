import type { Appointment } from '../../types/index.ts';
import { formatTimeHHMM } from '../../lib/planner/time-utils.ts';

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  return (
    <div className="relative pl-10">
      {/* Timeline connector */}
      <div className="absolute left-[1.2rem] top-0 bottom-0 w-0.5 bg-gray-300" />

      {/* Appointment dot */}
      <div className="absolute left-[0.65rem] top-4 w-3.5 h-3.5 rounded-full bg-sbb-red border-2 border-white shadow-sm" />

      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 my-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-sbb-red">
            {formatTimeHHMM(appointment.startTime)}
          </span>
          <span className="text-slate text-xs">–</span>
          <span className="font-mono text-sm text-slate">
            {formatTimeHHMM(appointment.endTime)}
          </span>
        </div>
        <p className="text-sm font-semibold text-anthracite mt-1">
          {appointment.title}
        </p>
        <p className="text-xs text-slate mt-0.5">{appointment.location}</p>
      </div>
    </div>
  );
}

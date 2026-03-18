import type { DayPlan } from '../../types/index.ts';
import { formatDate } from '../../lib/planner/time-utils.ts';
import { RouteSegmentCard } from './RouteSegment.tsx';
import { AppointmentCard } from './AppointmentCard.tsx';

interface DayTimelineProps {
  plan: DayPlan;
}

export function DayTimeline({ plan }: DayTimelineProps) {
  const { segments, appointments, warnings } = plan;

  // Sort appointments chronologically
  const sortedAppointments = [...appointments]
    .filter((a) => a.resolvedLocation)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Interleave segments and appointments
  // Pattern: segment[0], appointment[0], segment[1], appointment[1], ...
  // But segments can include return-to-base segments, so we match by timing
  const timelineItems: Array<
    { type: 'segment'; data: (typeof segments)[0]; isReturn?: boolean } |
    { type: 'appointment'; data: (typeof appointments)[0] }
  > = [];

  let segIdx = 0;

  // First segment: home -> first appointment
  if (segments.length > 0) {
    timelineItems.push({ type: 'segment', data: segments[segIdx] });
    segIdx++;
  }

  for (let i = 0; i < sortedAppointments.length; i++) {
    timelineItems.push({ type: 'appointment', data: sortedAppointments[i] });

    // After each appointment (except last), add the connecting segment(s)
    if (i < sortedAppointments.length - 1) {
      // There might be 1 or 2 segments (direct or return-to-base + go-to-next)
      while (segIdx < segments.length - 1) {
        const seg = segments[segIdx];
        const nextApt = sortedAppointments[i + 1];

        // Check if this segment ends at the next appointment's location
        const isDirectToNext =
          seg.to.name === nextApt.resolvedLocation?.name ||
          seg.to.station === nextApt.resolvedLocation?.station;

        if (isDirectToNext) {
          timelineItems.push({ type: 'segment', data: seg });
          segIdx++;
          break;
        } else {
          // Return-to-base segment
          timelineItems.push({ type: 'segment', data: seg, isReturn: true });
          segIdx++;
        }
      }
    }
  }

  // Last segment: last appointment -> home
  if (segIdx < segments.length) {
    timelineItems.push({ type: 'segment', data: segments[segIdx] });
  }

  return (
    <div className="space-y-4">
      {/* Date header */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-anthracite">
          {formatDate(plan.date)}
        </h2>
        <p className="text-xs text-slate font-mono mt-0.5">
          {sortedAppointments.length} Termine &middot; {segments.length} Verbindungen
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-warning flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">!</span>
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Home start marker */}
        <div className="relative pl-10 pb-1">
          <div className="absolute left-[0.75rem] top-1 w-3 h-3 rounded-sm bg-anthracite" />
          <p className="text-xs font-medium text-anthracite font-mono">Start: Zuhause</p>
        </div>

        {timelineItems.map((item, i) => {
          if (item.type === 'segment') {
            return (
              <RouteSegmentCard
                key={`seg-${i}`}
                segment={item.data}
                isReturn={item.isReturn}
              />
            );
          }
          return (
            <AppointmentCard key={`apt-${item.data.id}`} appointment={item.data} />
          );
        })}

        {/* Home end marker */}
        <div className="relative pl-10 pt-2">
          <div className="absolute left-[0.75rem] top-3 w-3 h-3 rounded-sm bg-anthracite" />
          <p className="text-xs font-medium text-anthracite font-mono">Ende: Zuhause</p>
        </div>
      </div>
    </div>
  );
}

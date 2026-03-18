import type { DayPlan } from '../../types/index.ts';
import { formatDate } from '../../lib/planner/time-utils.ts';
import { RouteSegmentCard } from './RouteSegment.tsx';
import { AppointmentCard } from './AppointmentCard.tsx';

interface DayTimelineProps {
  plan: DayPlan;
}

export function DayTimeline({ plan }: DayTimelineProps) {
  const { segments, appointments, warnings } = plan;

  const sortedAppointments = [...appointments]
    .filter((a) => a.resolvedLocation)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Build timeline: interleave segments and appointments by consuming segments sequentially
  const timelineItems: Array<
    { type: 'segment'; data: (typeof segments)[0] } |
    { type: 'appointment'; data: (typeof appointments)[0] }
  > = [];

  let segIdx = 0;

  // First segment(s): home -> first appointment
  if (segments.length > 0 && sortedAppointments.length > 0) {
    timelineItems.push({ type: 'segment', data: segments[segIdx] });
    segIdx++;
  }

  for (let i = 0; i < sortedAppointments.length; i++) {
    timelineItems.push({ type: 'appointment', data: sortedAppointments[i] });

    // After each appointment, add all segments until we reach the next appointment's arrival
    if (i < sortedAppointments.length - 1) {
      while (segIdx < segments.length - 1) {
        timelineItems.push({ type: 'segment', data: segments[segIdx] });
        segIdx++;
        // If this segment arrives at the next appointment location, stop
        const lastSeg = segments[segIdx - 1];
        const nextApt = sortedAppointments[i + 1];
        if (
          lastSeg.to.name === nextApt.resolvedLocation?.name ||
          lastSeg.to.station === nextApt.resolvedLocation?.station ||
          lastSeg.to.stationId === nextApt.resolvedLocation?.stationId
        ) {
          break;
        }
      }
    }
  }

  // Last segment: last appointment -> home
  while (segIdx < segments.length) {
    timelineItems.push({ type: 'segment', data: segments[segIdx] });
    segIdx++;
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-anthracite">
          {formatDate(plan.date)}
        </h2>
        <p className="text-xs text-slate font-mono mt-0.5">
          {sortedAppointments.length} Termine &middot; {segments.length} Verbindungen
        </p>
      </div>

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

      <div className="relative">
        <div className="relative pl-10 pb-1">
          <div className="absolute left-[0.75rem] top-1 w-3 h-3 rounded-sm bg-anthracite" />
          <p className="text-xs font-medium text-anthracite font-mono">Start: Zuhause</p>
        </div>

        {timelineItems.map((item, i) => {
          if (item.type === 'segment') {
            if (item.data.segmentType === 'wait') return null;
            return (
              <RouteSegmentCard
                key={`seg-${i}`}
                segment={item.data}
                isReturn={item.data.segmentType === 'return-to-base'}
              />
            );
          }
          return (
            <AppointmentCard key={`apt-${item.data.id}`} appointment={item.data} />
          );
        })}

        <div className="relative pl-10 pt-2">
          <div className="absolute left-[0.75rem] top-3 w-3 h-3 rounded-sm bg-anthracite" />
          <p className="text-xs font-medium text-anthracite font-mono">Ende: Zuhause</p>
        </div>
      </div>
    </div>
  );
}

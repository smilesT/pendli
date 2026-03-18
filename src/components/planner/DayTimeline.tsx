import type { DayPlan } from '../../types/index.ts';
import { formatDate } from '../../lib/planner/time-utils.ts';
import { RouteSegmentCard } from './RouteSegment.tsx';
import { AppointmentCard } from './AppointmentCard.tsx';
import { t } from '../../lib/i18n/index.ts';

interface DayTimelineProps {
  plan: DayPlan;
}

export function DayTimeline({ plan }: DayTimelineProps) {
  const { segments, appointments, warnings } = plan;

  const sortedAppointments = [...appointments]
    .filter((a) => a.resolvedLocation)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Build timeline: interleave segments and appointments using segmentGaps
  const timelineItems: Array<
    { type: 'segment'; data: (typeof segments)[0] } |
    { type: 'appointment'; data: (typeof appointments)[0] }
  > = [];

  const gaps = plan.segmentGaps;
  let segIdx = 0;

  // First gap: home -> first appointment
  const firstGap = gaps[0] || 0;
  for (let s = 0; s < firstGap; s++) {
    if (segIdx < segments.length) {
      timelineItems.push({ type: 'segment', data: segments[segIdx] });
      segIdx++;
    }
  }

  for (let i = 0; i < sortedAppointments.length; i++) {
    timelineItems.push({ type: 'appointment', data: sortedAppointments[i] });

    // Gap after this appointment (gap index = i + 1)
    const gapCount = gaps[i + 1] || 0;
    for (let s = 0; s < gapCount; s++) {
      if (segIdx < segments.length) {
        timelineItems.push({ type: 'segment', data: segments[segIdx] });
        segIdx++;
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-anthracite dark:text-dark-text">
          {formatDate(plan.date)}
        </h2>
        <p className="text-xs text-slate dark:text-dark-muted font-mono mt-0.5">
          {sortedAppointments.length} {t.timeline.appointments} &middot; {segments.length} {t.timeline.connections}
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
          <div className="absolute left-[0.75rem] top-1 w-3 h-3 rounded-sm bg-anthracite dark:bg-dark-text" />
          <p className="text-xs font-medium text-anthracite dark:text-dark-text font-mono">{t.timeline.startHome}</p>
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
          <div className="absolute left-[0.75rem] top-3 w-3 h-3 rounded-sm bg-anthracite dark:bg-dark-text" />
          <p className="text-xs font-medium text-anthracite dark:text-dark-text font-mono">{t.timeline.endHome}</p>
        </div>
      </div>
    </div>
  );
}

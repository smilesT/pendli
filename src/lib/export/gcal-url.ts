import type { DayPlan, RouteSegment } from '../../types/index.ts';
import { formatTimeHHMM } from '../planner/time-utils.ts';

function fmtGcalDate(d: Date): string {
  const Y = String(d.getFullYear());
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${Y}${M}${D}T${h}${m}${s}`;
}

function transportEmoji(line: string): string {
  const l = line.toLowerCase();
  if (l.startsWith('s')) return '🚆';
  if (l.startsWith('ir') || l.startsWith('ic') || l.startsWith('ec')) return '🚄';
  if (l.startsWith('bus') || l.startsWith('nfb')) return '🚌';
  if (l.startsWith('tram')) return '🚋';
  return '🚆';
}

function buildGcalUrl(
  title: string,
  start: Date,
  end: Date,
  location: string,
  details: string
): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmtGcalDate(start)}/${fmtGcalDate(end)}`,
    location,
    details,
    ctz: 'Europe/Zurich',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function segmentDetails(seg: RouteSegment): string {
  return seg.connections
    .map(
      (c) =>
        `${c.line}: ${c.departure} ab ${formatTimeHHMM(c.departureTime)}` +
        (c.platform ? ` Gl. ${c.platform}` : '') +
        ` → ${c.arrival} an ${formatTimeHHMM(c.arrivalTime)}`
    )
    .join('\n');
}

export interface GcalEvent {
  title: string;
  url: string;
  start: Date;
  end: Date;
  type: 'appointment' | 'travel';
}

export function generateGcalEvents(plan: DayPlan): GcalEvent[] {
  const events: GcalEvent[] = [];

  for (const apt of plan.appointments) {
    events.push({
      title: apt.title,
      url: buildGcalUrl(apt.title, apt.startTime, apt.endTime, apt.location, ''),
      start: apt.startTime,
      end: apt.endTime,
      type: 'appointment',
    });
  }

  for (const seg of plan.segments) {
    if (seg.segmentType === 'wait' || seg.connections.length === 0) continue;

    const emoji = transportEmoji(seg.connections[0]?.line || '');
    const title = `${emoji} ${seg.from.name} → ${seg.to.name}`;
    const details = segmentDetails(seg);

    events.push({
      title,
      url: buildGcalUrl(title, seg.departureTime, seg.arrivalTime, seg.from.name, details),
      start: seg.departureTime,
      end: seg.arrivalTime,
      type: 'travel',
    });
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return events;
}

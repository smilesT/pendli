import type { DayPlan, RouteSegment, Appointment } from '../../types/index.ts';
import { formatTimeHHMM } from '../planner/time-utils.ts';

/**
 * Generate a human-readable text representation of a DayPlan,
 * suitable for sharing via WhatsApp / Telegram / SMS.
 *
 * Framework-agnostic, pure function.
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Short German weekday abbreviation. */
function shortWeekday(date: Date): string {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return days[date.getDay()];
}

/** Format date as DD.MM.YYYY */
function fmtDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/** Transport emoji based on line name. */
function transportEmoji(lineName: string): string {
  const upper = lineName.toUpperCase();
  if (upper.startsWith('BUS') || upper.startsWith('NFB')) return '\u{1F68C}';
  if (upper.startsWith('TRAM') || upper.startsWith('T ')) return '\u{1F68B}';
  if (
    upper.startsWith('IC') ||
    upper.startsWith('IR') ||
    upper.startsWith('EC') ||
    upper.startsWith('TGV')
  )
    return '\u{1F684}';
  // S-Bahn, regional, default
  return '\u{1F686}';
}

/** Duration in human-readable format. */
function durationText(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}

// ── Timeline entry ───────────────────────────────────────────────────

interface TimelineEntry {
  /** Sort key (milliseconds since epoch) */
  time: number;
  /** Rendered line(s) for this entry */
  lines: string[];
}

function segmentEntries(seg: RouteSegment): TimelineEntry[] {
  if (seg.segmentType === 'wait') return [];
  if (seg.connections.length === 0) return [];

  const fromName = seg.from.station || seg.from.name;
  const toName = seg.to.station || seg.to.name;
  const firstConn = seg.connections[0];
  const emoji = transportEmoji(firstConn.line);
  const timeStr = formatTimeHHMM(seg.departureTime);
  const dur = durationText(seg.duration);

  const main = `${timeStr}  ${emoji} ${fromName} \u2192 ${toName} (${dur})`;

  // Detail lines for each connection
  const details: string[] = seg.connections.map((c) => {
    const platform = c.platform ? ` ab Gl. ${c.platform}` : '';
    const arrTime = formatTimeHHMM(c.arrivalTime);
    return `       ${c.line}${platform}, Ankunft ${arrTime}`;
  });

  return [{ time: seg.departureTime.getTime(), lines: [main, ...details] }];
}

function appointmentEntry(apt: Appointment): TimelineEntry {
  const timeStr = formatTimeHHMM(apt.startTime);
  const loc = apt.location ? ` (${apt.location})` : '';
  return {
    time: apt.startTime.getTime(),
    lines: [`${timeStr}  \u{1F4C5} ${apt.title}${loc}`],
  };
}

// ── Public API ───────────────────────────────────────────────────────

export function generateText(plan: DayPlan): string {
  const entries: TimelineEntry[] = [];

  for (const seg of plan.segments) {
    entries.push(...segmentEntries(seg));
  }
  for (const apt of plan.appointments) {
    entries.push(appointmentEntry(apt));
  }

  // Sort chronologically; appointments appear before segments at equal times
  entries.sort((a, b) => a.time - b.time);

  const wd = shortWeekday(plan.date);
  const dateStr = fmtDate(plan.date);
  const header = `\u{1F686} pendli \u2014 ${wd}, ${dateStr}`;
  const footer = 'Erstellt mit pendli \u2014 smilest.github.io/pendli';

  const body = entries.map((e) => e.lines.join('\n')).join('\n');

  return `${header}\n\n${body}\n\n${footer}\n`;
}

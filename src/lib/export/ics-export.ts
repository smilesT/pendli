import type { DayPlan, Connection } from '../../types/index.ts';

/**
 * Generate a .ics (iCalendar) file string from a DayPlan.
 *
 * Framework-agnostic, pure function.
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Format a Date as iCal local datetime: YYYYMMDDTHHMMSS */
function fmtIcalDate(d: Date): string {
  const Y = String(d.getFullYear());
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${Y}${M}${D}T${h}${m}${s}`;
}

/** UTC timestamp for DTSTAMP */
function fmtIcalUtc(d: Date): string {
  const Y = String(d.getUTCFullYear());
  const M = String(d.getUTCMonth() + 1).padStart(2, '0');
  const D = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${Y}${M}${D}T${h}${m}${s}Z`;
}

/** Escape a string for iCal TEXT values (RFC 5545 §3.3.11). */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold lines to max 75 octets per RFC 5545 section 3.1.
 * Continuation lines start with a single SPACE.
 */
function foldLine(line: string): string {
  const MAX = 75;
  if (line.length <= MAX) return line;

  const parts: string[] = [];
  parts.push(line.slice(0, MAX));
  let pos = MAX;
  while (pos < line.length) {
    // Continuation line: SPACE + up to 74 chars (SPACE counts as 1 octet)
    parts.push(' ' + line.slice(pos, pos + MAX - 1));
    pos += MAX - 1;
  }
  return parts.join('\r\n');
}

/** Emit a single content-line, folded. */
function line(content: string): string {
  return foldLine(content) + '\r\n';
}

/** Transport emoji based on line name or category. */
function transportEmoji(lineName: string): string {
  const upper = lineName.toUpperCase();
  if (upper.startsWith('BUS') || upper.startsWith('NFB')) return '\u{1F68C}'; // bus
  if (upper.startsWith('TRAM') || upper.startsWith('T ')) return '\u{1F68B}'; // tram
  if (upper.startsWith('IC') || upper.startsWith('IR') || upper.startsWith('EC') || upper.startsWith('TGV'))
    return '\u{1F684}'; // high-speed
  // S-Bahn, regional, default
  return '\u{1F686}'; // train
}

/** Build a simple UID from a seed string. */
function uid(seed: string): string {
  // Deterministic UID so re-exports produce stable identifiers
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex}-pendli@smilest.github.io`;
}

// ── VTIMEZONE for Europe/Zurich ──────────────────────────────────────

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Zurich',
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
]
  .map((l) => l + '\r\n')
  .join('');

// ── Connection description ───────────────────────────────────────────

function connectionDescription(connections: Connection[]): string {
  return connections
    .map((c, i) => {
      const dep = c.departureTime;
      const arr = c.arrivalTime;
      const depStr = `${String(dep.getHours()).padStart(2, '0')}:${String(dep.getMinutes()).padStart(2, '0')}`;
      const arrStr = `${String(arr.getHours()).padStart(2, '0')}:${String(arr.getMinutes()).padStart(2, '0')}`;
      const platform = c.platform ? ` Gl. ${c.platform}` : '';
      return `${i + 1}. ${c.line} ${c.departure}${platform} ab ${depStr} → ${c.arrival} an ${arrStr}`;
    })
    .join('\n');
}

// ── Public API ───────────────────────────────────────────────────────

export function generateICS(plan: DayPlan): string {
  const now = new Date();
  const stamp = fmtIcalUtc(now);

  let ics = '';

  // Calendar header block
  ics += line('BEGIN:VCALENDAR');
  ics += line('VERSION:2.0');
  ics += line('PRODID:-//pendli//pendli//DE');
  ics += line('CALSCALE:GREGORIAN');
  ics += line('METHOD:PUBLISH');
  ics += line('X-WR-CALNAME:pendli Tagesplan');
  ics += line('X-WR-TIMEZONE:Europe/Zurich');
  ics += VTIMEZONE;

  // Appointments as VEVENT blocks
  for (const apt of plan.appointments) {
    ics += line('BEGIN:VEVENT');
    ics += line(`DTSTAMP:${stamp}`);
    ics += line(`UID:${uid(`apt-${apt.id}`)}`);
    ics += line(`DTSTART;TZID=Europe/Zurich:${fmtIcalDate(apt.startTime)}`);
    ics += line(`DTEND;TZID=Europe/Zurich:${fmtIcalDate(apt.endTime)}`);
    ics += line(`SUMMARY:${escapeText(apt.title)}`);
    if (apt.location) {
      ics += line(`LOCATION:${escapeText(apt.location)}`);
    }
    ics += line('END:VEVENT');
  }

  // Route segments as travel VEVENT blocks
  for (const seg of plan.segments) {
    if (seg.segmentType === 'wait') continue;
    if (seg.connections.length === 0) continue;

    const fromName = seg.from.station || seg.from.name;
    const toName = seg.to.station || seg.to.name;
    const firstLine = seg.connections[0].line;
    const emoji = transportEmoji(firstLine);
    const summary = `${emoji} ${fromName} \u2192 ${toName}`;
    const description = connectionDescription(seg.connections);

    ics += line('BEGIN:VEVENT');
    ics += line(`DTSTAMP:${stamp}`);
    ics += line(`UID:${uid(`seg-${fmtIcalDate(seg.departureTime)}-${fromName}-${toName}`)}`);
    ics += line(`DTSTART;TZID=Europe/Zurich:${fmtIcalDate(seg.departureTime)}`);
    ics += line(`DTEND;TZID=Europe/Zurich:${fmtIcalDate(seg.arrivalTime)}`);
    ics += line(`SUMMARY:${escapeText(summary)}`);
    ics += line(`DESCRIPTION:${escapeText(description)}`);
    ics += line(`LOCATION:${escapeText(fromName)}`);
    ics += line('CATEGORIES:Reise');

    // Alarm: 5 minutes before departure
    ics += line('BEGIN:VALARM');
    ics += line('TRIGGER:-PT5M');
    ics += line('ACTION:DISPLAY');
    ics += line(`DESCRIPTION:${escapeText(`Abfahrt in 5 Min.: ${summary}`)}`);
    ics += line('END:VALARM');

    ics += line('END:VEVENT');
  }

  ics += line('END:VCALENDAR');

  return ics;
}

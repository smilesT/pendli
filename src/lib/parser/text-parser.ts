import type { Appointment } from '../../types/index.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse free-form German text into an Appointment.
 *
 * Tolerant: extracts what it can from the input.
 * Returns null when no time can be determined (time is mandatory).
 *
 * Framework-agnostic, pure function.
 */

// ── Date helpers ─────────────────────────────────────────────────────

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrow(): Date {
  const d = today();
  d.setDate(d.getDate() + 1);
  return d;
}

function dayAfterTomorrow(): Date {
  const d = today();
  d.setDate(d.getDate() + 2);
  return d;
}

// ── Pattern definitions ──────────────────────────────────────────────

// Date patterns (order matters: longer/more specific first)
// DD.MM.YYYY or DD.MM.YY
const RE_DATE_FULL = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/;
// DD.MM. (without year) — note the trailing dot
const RE_DATE_SHORT = /\b(\d{1,2})\.(\d{1,2})\./;
// "am DD.MM." or "am DD.MM.YYYY"
const RE_DATE_AM_FULL = /\bam\s+(\d{1,2})\.(\d{1,2})\.(\d{2,4})?\s*/;

// Relative dates (check "übermorgen" before "morgen" to avoid partial match)
const RE_UEBERMORGEN = /\b[üu]bermorgen\b/i;
const RE_MORGEN = /\bmorgen\b/i;
const RE_HEUTE = /\bheute\b/i;

// Time patterns
// "um HH:MM" / "HH:MM" / "H:MM"
const RE_TIME_COLON = /\b(?:um\s+)?(\d{1,2}):(\d{2})\b/;
// "HH Uhr"
const RE_TIME_UHR = /\b(\d{1,2})\s*Uhr\b/i;

// Location patterns
// "in <location>" / "bei <location>" — greedy up to comma or end of string
const RE_LOC_IN_BEI = /\b(?:in|bei)\s+([^,]+)/i;
// Street + number (e.g. "Marktgasse 12")
const RE_STREET =
  /\b([A-ZÄÖÜ][a-zäöüéèê]+(?:strasse|str\.|gasse|weg|platz|allee)\s+\d+[a-z]?)\b/i;

// ── Extraction ───────────────────────────────────────────────────────

interface ExtractedDate {
  date: Date;
  /** Start and end index in the original string for stripping. */
  matchStart: number;
  matchEnd: number;
}

function extractDate(text: string): ExtractedDate | null {
  // "am DD.MM.YYYY" / "am DD.MM."
  let m = RE_DATE_AM_FULL.exec(text);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const yearRaw = m[3];
    let year = yearRaw ? parseInt(yearRaw, 10) : today().getFullYear();
    if (year < 100) year += 2000;
    return {
      date: new Date(year, month, day),
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
    };
  }

  // DD.MM.YYYY
  m = RE_DATE_FULL.exec(text);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    return {
      date: new Date(year, month, day),
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
    };
  }

  // DD.MM. (without year)
  m = RE_DATE_SHORT.exec(text);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = today().getFullYear();
    return {
      date: new Date(year, month, day),
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
    };
  }

  // Relative dates — check "übermorgen" before "morgen"
  m = RE_UEBERMORGEN.exec(text);
  if (m) {
    return {
      date: dayAfterTomorrow(),
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
    };
  }

  m = RE_MORGEN.exec(text);
  if (m) {
    return {
      date: tomorrow(),
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
    };
  }

  m = RE_HEUTE.exec(text);
  if (m) {
    return {
      date: today(),
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
    };
  }

  return null;
}

interface ExtractedTime {
  hours: number;
  minutes: number;
  matchStart: number;
  matchEnd: number;
}

function extractTime(text: string): ExtractedTime | null {
  let m = RE_TIME_COLON.exec(text);
  if (m) {
    const hours = parseInt(m[1], 10);
    const minutes = parseInt(m[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return {
        hours,
        minutes,
        matchStart: m.index,
        matchEnd: m.index + m[0].length,
      };
    }
  }

  m = RE_TIME_UHR.exec(text);
  if (m) {
    const hours = parseInt(m[1], 10);
    if (hours >= 0 && hours <= 23) {
      return {
        hours,
        minutes: 0,
        matchStart: m.index,
        matchEnd: m.index + m[0].length,
      };
    }
  }

  return null;
}

function extractLocation(text: string): string {
  // Try street pattern first (most specific match)
  let m = RE_STREET.exec(text);
  if (m) {
    // If followed by ", CityName", include the city
    const afterStreet = text.slice(m.index + m[0].length);
    const commaCity = /^,\s*([A-ZÄÖÜ][a-zäöüéèê]+)/.exec(afterStreet);
    if (commaCity) {
      return `${m[1]}, ${commaCity[1]}`.trim();
    }
    return m[1].trim();
  }

  // "in ..." / "bei ..."
  m = RE_LOC_IN_BEI.exec(text);
  if (m) {
    return m[1].trim();
  }

  // After last comma (if meaningful content precedes it)
  const lastComma = text.lastIndexOf(',');
  if (lastComma > 0) {
    const candidate = text.slice(lastComma + 1).trim();
    // Only if it looks like a location name (starts with uppercase)
    if (candidate.length > 1 && /[A-ZÄÖÜ]/.test(candidate[0])) {
      return candidate;
    }
  }

  return '';
}

/**
 * Extract a title by stripping date, time, and location patterns
 * from the text, then returning the remaining meaningful phrase.
 */
function extractTitle(
  text: string,
  dateMatch: ExtractedDate | null,
  timeMatch: ExtractedTime | null,
  location: string
): string {
  let remaining = text;

  // Build ranges to remove (sorted descending so indices stay valid)
  const ranges: [number, number][] = [];
  if (dateMatch) ranges.push([dateMatch.matchStart, dateMatch.matchEnd]);
  if (timeMatch) ranges.push([timeMatch.matchStart, timeMatch.matchEnd]);

  // Sort descending by start so earlier removals don't shift indices
  ranges.sort((a, b) => b[0] - a[0]);
  for (const [start, end] of ranges) {
    remaining = remaining.slice(0, start) + remaining.slice(end);
  }

  // Strip "in <location>" / "bei <location>" clause
  if (location) {
    remaining = remaining.replace(/\b(?:in|bei)\s+[^,]+/i, '');
    // Also strip raw location text if it appears elsewhere (e.g. after comma)
    const locIdx = remaining.indexOf(location);
    if (locIdx !== -1) {
      remaining =
        remaining.slice(0, locIdx) + remaining.slice(locIdx + location.length);
    }
  }

  // Clean up: trim punctuation, commas, and whitespace
  remaining = remaining
    .replace(/[,;.\s]+$/, '')
    .replace(/^[,;.\s]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return remaining || 'Termin';
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Parse free-form German text into an Appointment.
 *
 * Returns `null` if no time can be extracted (time is mandatory).
 *
 * Examples:
 * - "Zahnarzt am 18.3. um 14:00, Marktgasse 12, Bern" -> full appointment
 * - "Meeting 15:30 ETH Zürich" -> appointment with time and location
 * - "Lunch" -> null (no time found)
 */
export function parseTextToAppointment(text: string): Appointment | null {
  if (!text || !text.trim()) return null;

  const trimmed = text.trim();

  // Time is required — no time means no appointment
  const timeMatch = extractTime(trimmed);
  if (!timeMatch) return null;

  const dateMatch = extractDate(trimmed);
  const baseDate = dateMatch ? dateMatch.date : today();

  const startTime = new Date(baseDate);
  startTime.setHours(timeMatch.hours, timeMatch.minutes, 0, 0);

  // Default duration: 1 hour from start
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  const location = extractLocation(trimmed);
  const title = extractTitle(trimmed, dateMatch, timeMatch, location);

  return {
    id: uuidv4(),
    title,
    startTime,
    endTime,
    location,
  };
}

import type { Appointment } from '../../types/index.ts';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

export interface ParseResult {
  appointments: Appointment[];
  warnings: string[];
}

// Flexible header mapping (case-insensitive, multi-language)
const HEADER_MAP: Record<string, string[]> = {
  date: ['datum', 'date', 'tag', 'day'],
  startTime: ['startzeit', 'start', 'starttime', 'von', 'from', 'begin', 'beginn'],
  endTime: ['endzeit', 'end', 'endtime', 'bis', 'to', 'ende'],
  title: ['titel', 'title', 'name', 'betreff', 'subject', 'summary'],
  location: ['ort', 'location', 'adresse', 'address', 'standort', 'place'],
};

function findColumn(
  headers: string[],
  candidates: string[]
): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(
      (h) => h.toLowerCase().trim() === candidate
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDate(dateStr: string, timeStr: string): Date {
  // Support formats: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY
  let year: number, month: number, day: number;

  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    year = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1;
    day = parseInt(parts[2]);
  } else if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    day = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1;
    year = parseInt(parts[2]);
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    day = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1;
    year = parseInt(parts[2]);
  } else {
    throw new Error(`Unbekanntes Datumsformat: ${dateStr}`);
  }

  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month, day, hours, minutes);
}

export function parseCSVFile(content: string): ParseResult {
  content = content.replace(/^\uFEFF/, '');
  const warnings: string[] = [];
  const appointments: Appointment[] = [];

  const result = Papa.parse(content, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.data.length < 2) {
    warnings.push('CSV-Datei enthält keine Daten.');
    return { appointments, warnings };
  }

  const headers = (result.data[0] as string[]).map((h) => h.trim());
  const dateIdx = findColumn(headers, HEADER_MAP.date);
  const startIdx = findColumn(headers, HEADER_MAP.startTime);
  const endIdx = findColumn(headers, HEADER_MAP.endTime);
  const titleIdx = findColumn(headers, HEADER_MAP.title);
  const locationIdx = findColumn(headers, HEADER_MAP.location);

  if (dateIdx === -1 || startIdx === -1 || titleIdx === -1) {
    warnings.push(
      'CSV-Header nicht erkannt. Benötigt: Datum, Startzeit, Titel (und optional Endzeit, Ort).'
    );
    return { appointments, warnings };
  }

  for (let i = 1; i < result.data.length; i++) {
    const row = result.data[i] as string[];
    try {
      const dateStr = row[dateIdx]?.trim();
      const startStr = row[startIdx]?.trim();
      const endStr = endIdx !== -1 ? row[endIdx]?.trim() : '';
      const title = titleIdx !== -1 ? row[titleIdx]?.trim() : 'Ohne Titel';
      const location = locationIdx !== -1 ? row[locationIdx]?.trim() : '';

      if (!dateStr || !startStr) {
        warnings.push(`Zeile ${i + 1}: Datum oder Startzeit fehlt.`);
        continue;
      }

      if (!location) {
        warnings.push(
          `Zeile ${i + 1}: Termin "${title}" hat keinen Ort und wird übersprungen.`
        );
        continue;
      }

      const startTime = parseDate(dateStr, startStr);
      const endTime = endStr
        ? parseDate(dateStr, endStr)
        : new Date(startTime.getTime() + 60 * 60 * 1000); // default 1h

      appointments.push({
        id: uuidv4(),
        title,
        startTime,
        endTime,
        location,
      });
    } catch (error) {
      warnings.push(
        `Zeile ${i + 1}: ${error instanceof Error ? error.message : 'Fehler beim Parsen.'}`
      );
    }
  }

  return { appointments, warnings };
}

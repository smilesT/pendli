import type { Appointment } from '../../types/index.ts';
import ICAL from 'ical.js';
import { v4 as uuidv4 } from 'uuid';

export interface ParseResult {
  appointments: Appointment[];
  warnings: string[];
}

export function parseICalFile(content: string): ParseResult {
  const warnings: string[] = [];
  const appointments: Appointment[] = [];

  try {
    const jcal = ICAL.parse(content);
    const comp = new ICAL.Component(jcal);
    const events = comp.getAllSubcomponents('vevent');

    for (const event of events) {
      const vevent = new ICAL.Event(event);
      const summary = vevent.summary || 'Ohne Titel';
      const location = vevent.location;
      const startDate = vevent.startDate;
      const endDate = vevent.endDate;

      if (!location || location.trim() === '') {
        warnings.push(
          `Termin "${summary}" hat keinen Ort und wird übersprungen.`
        );
        continue;
      }

      if (!startDate || !endDate) {
        warnings.push(
          `Termin "${summary}" hat keine gültige Zeitangabe und wird übersprungen.`
        );
        continue;
      }

      appointments.push({
        id: uuidv4(),
        title: summary,
        startTime: startDate.toJSDate(),
        endTime: endDate.toJSDate(),
        location: location.trim(),
      });
    }
  } catch (error) {
    warnings.push(
      `Fehler beim Parsen der iCal-Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
    );
  }

  return { appointments, warnings };
}

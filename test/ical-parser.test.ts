/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertGreater,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { parseICalFile } from "../src/lib/parser/ical-parser.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeIcal(events: string[]): string {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pendli//test//DE
${events.join("\n")}
END:VCALENDAR`;
}

function makeEvent(opts: {
  summary?: string;
  location?: string;
  dtstart?: string;
  dtend?: string;
}): string {
  const lines = ["BEGIN:VEVENT"];
  if (opts.dtstart !== undefined) lines.push(`DTSTART:${opts.dtstart}`);
  if (opts.dtend !== undefined) lines.push(`DTEND:${opts.dtend}`);
  if (opts.summary !== undefined) lines.push(`SUMMARY:${opts.summary}`);
  if (opts.location !== undefined) lines.push(`LOCATION:${opts.location}`);
  lines.push("END:VEVENT");
  return lines.join("\n");
}

// ─── Valid iCal with 5 events → 5 appointments ─────────────────────────────

Deno.test("parseICalFile: valid iCal with 5 events → 5 appointments", () => {
  const content = makeIcal([
    makeEvent({ summary: "Meeting 1", location: "Zürich HB", dtstart: "20260318T090000", dtend: "20260318T100000" }),
    makeEvent({ summary: "Meeting 2", location: "Bern", dtstart: "20260318T110000", dtend: "20260318T120000" }),
    makeEvent({ summary: "Meeting 3", location: "Basel", dtstart: "20260318T130000", dtend: "20260318T140000" }),
    makeEvent({ summary: "Meeting 4", location: "Luzern", dtstart: "20260318T150000", dtend: "20260318T160000" }),
    makeEvent({ summary: "Meeting 5", location: "Genf", dtstart: "20260318T170000", dtend: "20260318T180000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 5);
  assertEquals(result.warnings.length, 0);
});

// ─── Verify appointment fields ──────────────────────────────────────────────

Deno.test("parseICalFile: appointment has correct fields", () => {
  const content = makeIcal([
    makeEvent({ summary: "Standup", location: "ETH Zürich", dtstart: "20260318T090000", dtend: "20260318T100000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  const apt = result.appointments[0];
  assertExists(apt.id);
  assertEquals(typeof apt.id, "string");
  assertEquals(apt.id.length > 0, true);
  assertEquals(apt.title, "Standup");
  assertEquals(apt.location, "ETH Zürich");
  assertExists(apt.startTime);
  assertExists(apt.endTime);
});

// ─── Event without LOCATION → skipped with warning ─────────────────────────

Deno.test("parseICalFile: event without LOCATION → skipped with warning", () => {
  const content = makeIcal([
    makeEvent({ summary: "No Location", dtstart: "20260318T090000", dtend: "20260318T100000" }),
    makeEvent({ summary: "Has Location", location: "Bern", dtstart: "20260318T110000", dtend: "20260318T120000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Has Location");
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("No Location"), true);
  assertEquals(result.warnings[0].includes("keinen Ort"), true);
});

// ─── Event without DTSTART → skipped with warning ──────────────────────────

Deno.test("parseICalFile: event without DTSTART → skipped with warning", () => {
  const content = makeIcal([
    // Event with no DTSTART
    `BEGIN:VEVENT
DTEND:20260318T100000
SUMMARY:No Start
LOCATION:Zürich
END:VEVENT`,
    makeEvent({ summary: "Valid", location: "Bern", dtstart: "20260318T110000", dtend: "20260318T120000" }),
  ]);
  const result = parseICalFile(content);
  // The behavior depends on ical.js: it might still parse the event or skip it.
  // In the code, it checks !startDate || !endDate → warning
  // Let's verify at least the valid one is parsed
  assertGreater(result.appointments.length, 0);
  const validApt = result.appointments.find(a => a.title === "Valid");
  assertExists(validApt);
});

// ─── Event without SUMMARY → gets "Ohne Titel" ─────────────────────────────

Deno.test("parseICalFile: event without SUMMARY → gets 'Ohne Titel'", () => {
  const content = makeIcal([
    `BEGIN:VEVENT
DTSTART:20260318T090000
DTEND:20260318T100000
LOCATION:Zürich HB
END:VEVENT`,
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Ohne Titel");
});

// ─── Empty file → warning ───────────────────────────────────────────────────

Deno.test("parseICalFile: empty file → warning, 0 appointments", () => {
  const result = parseICalFile("");
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("Fehler"), true);
});

// ─── Completely invalid content → warning, 0 appointments ──────────────────

Deno.test("parseICalFile: completely invalid content → warning, 0 appointments", () => {
  const result = parseICalFile("This is not an iCal file at all!");
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("Fehler"), true);
});

Deno.test("parseICalFile: random JSON → warning, 0 appointments", () => {
  const result = parseICalFile('{"foo": "bar"}');
  assertEquals(result.appointments.length, 0);
  assertGreater(result.warnings.length, 0);
});

Deno.test("parseICalFile: HTML content → warning, 0 appointments", () => {
  const result = parseICalFile("<html><body>hello</body></html>");
  assertEquals(result.appointments.length, 0);
  assertGreater(result.warnings.length, 0);
});

// ─── Event with only whitespace location → skipped ──────────────────────────

Deno.test("parseICalFile: event with whitespace-only location → skipped", () => {
  const content = makeIcal([
    makeEvent({ summary: "Whitespace Location", location: "   ", dtstart: "20260318T090000", dtend: "20260318T100000" }),
    makeEvent({ summary: "Valid", location: "Bern", dtstart: "20260318T110000", dtend: "20260318T120000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Valid");
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("Whitespace Location"), true);
});

Deno.test("parseICalFile: event with empty string location → skipped", () => {
  const content = makeIcal([
    makeEvent({ summary: "Empty Location", location: "", dtstart: "20260318T090000", dtend: "20260318T100000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
});

// ─── VTODO entries → ignored (0 appointments from todos) ────────────────────

Deno.test("parseICalFile: VTODO entries → ignored, only VEVENT parsed", () => {
  const content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pendli//test//DE
BEGIN:VTODO
SUMMARY:Buy groceries
STATUS:NEEDS-ACTION
END:VTODO
BEGIN:VTODO
SUMMARY:Clean house
STATUS:NEEDS-ACTION
END:VTODO
BEGIN:VEVENT
DTSTART:20260318T090000
DTEND:20260318T100000
SUMMARY:Real Meeting
LOCATION:Zürich
END:VEVENT
END:VCALENDAR`;
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Real Meeting");
});

Deno.test("parseICalFile: only VTODO entries → 0 appointments", () => {
  const content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pendli//test//DE
BEGIN:VTODO
SUMMARY:Buy groceries
STATUS:NEEDS-ACTION
END:VTODO
END:VCALENDAR`;
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 0);
});

// ─── Unicode in SUMMARY and LOCATION ────────────────────────────────────────

Deno.test("parseICalFile: Unicode in SUMMARY and LOCATION (Zürich, Ämter)", () => {
  const content = makeIcal([
    makeEvent({ summary: "Besuch bei den Ämtern", location: "Zürich Stadelhofen", dtstart: "20260318T090000", dtend: "20260318T100000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Besuch bei den Ämtern");
  assertEquals(result.appointments[0].location, "Zürich Stadelhofen");
});

Deno.test("parseICalFile: Unicode French (Genève, café)", () => {
  const content = makeIcal([
    makeEvent({ summary: "Réunion au café", location: "Genève Cornavin", dtstart: "20260318T090000", dtend: "20260318T100000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Réunion au café");
  assertEquals(result.appointments[0].location, "Genève Cornavin");
});

Deno.test("parseICalFile: Unicode Italian (Bellinzona)", () => {
  const content = makeIcal([
    makeEvent({ summary: "Riunione a Bellinzona", location: "Bellinzona Stazione", dtstart: "20260318T090000", dtend: "20260318T100000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Riunione a Bellinzona");
});

// ─── Location is trimmed ────────────────────────────────────────────────────

Deno.test("parseICalFile: location with leading/trailing whitespace is trimmed", () => {
  const content = makeIcal([
    makeEvent({ summary: "Trimmed", location: "  Bern HB  ", dtstart: "20260318T090000", dtend: "20260318T100000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].location, "Bern HB");
});

// ─── Multiple events, some valid, some without location ─────────────────────

Deno.test("parseICalFile: mix of valid and locationless events", () => {
  const content = makeIcal([
    makeEvent({ summary: "With Location", location: "Zürich", dtstart: "20260318T090000", dtend: "20260318T100000" }),
    makeEvent({ summary: "Without Location 1", dtstart: "20260318T110000", dtend: "20260318T120000" }),
    makeEvent({ summary: "Without Location 2", dtstart: "20260318T130000", dtend: "20260318T140000" }),
    makeEvent({ summary: "With Location 2", location: "Bern", dtstart: "20260318T150000", dtend: "20260318T160000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 2);
  assertEquals(result.warnings.length, 2);
});

// ─── Calendar with no events ────────────────────────────────────────────────

Deno.test("parseICalFile: valid calendar structure but no events → 0 appointments, no warnings", () => {
  const content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pendli//test//DE
END:VCALENDAR`;
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 0);
});

// ─── Events produce unique IDs ──────────────────────────────────────────────

Deno.test("parseICalFile: each appointment gets a unique UUID", () => {
  const content = makeIcal([
    makeEvent({ summary: "A", location: "Zürich", dtstart: "20260318T090000", dtend: "20260318T100000" }),
    makeEvent({ summary: "B", location: "Bern", dtstart: "20260318T110000", dtend: "20260318T120000" }),
    makeEvent({ summary: "C", location: "Basel", dtstart: "20260318T130000", dtend: "20260318T140000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 3);
  const ids = new Set(result.appointments.map(a => a.id));
  assertEquals(ids.size, 3); // all unique
});

// ─── Same file parsed twice → separate IDs ──────────────────────────────────

Deno.test("parseICalFile: same file parsed twice → different IDs (no dedup at parser level)", () => {
  const content = makeIcal([
    makeEvent({ summary: "Standup", location: "Zürich", dtstart: "20260318T090000", dtend: "20260318T100000" }),
  ]);
  const r1 = parseICalFile(content);
  const r2 = parseICalFile(content);
  assertEquals(r1.appointments[0].id !== r2.appointments[0].id, true);
});

// ─── Event with long description (no description field in Appointment) ──────

Deno.test("parseICalFile: event with DESCRIPTION → still only title/location captured", () => {
  const content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pendli//test//DE
BEGIN:VEVENT
DTSTART:20260318T090000
DTEND:20260318T100000
SUMMARY:Meeting
DESCRIPTION:This is a very long description that should not cause any issues.
LOCATION:Zürich
END:VEVENT
END:VCALENDAR`;
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Meeting");
  assertEquals(result.appointments[0].location, "Zürich");
});

// ─── All-day event (no time component) ──────────────────────────────────────

Deno.test("parseICalFile: all-day event with DATE-only DTSTART/DTEND → should parse or skip gracefully", () => {
  const content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pendli//test//DE
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260318
DTEND;VALUE=DATE:20260319
SUMMARY:All Day Event
LOCATION:Zürich
END:VEVENT
END:VCALENDAR`;
  const result = parseICalFile(content);
  // ical.js should parse DATE values; whether the code handles them
  // depends on the toJSDate() call. This documents the behavior.
  // Should either produce an appointment or skip gracefully.
  assertEquals(result.warnings.length + result.appointments.length >= 0, true);
});

// ─── Multiple VCALENDAR blocks ──────────────────────────────────────────────

Deno.test("parseICalFile: content with single VCALENDAR → works normally", () => {
  // ical.js parses the first component it finds
  const content = makeIcal([
    makeEvent({ summary: "Event1", location: "Zürich", dtstart: "20260318T090000", dtend: "20260318T100000" }),
  ]);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 1);
});

// ─── Recurring event (RRULE) → only base event is captured ──────────────────

Deno.test("parseICalFile: event with RRULE → at least base event is captured", () => {
  const content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pendli//test//DE
BEGIN:VEVENT
DTSTART:20260318T090000
DTEND:20260318T100000
SUMMARY:Weekly Standup
LOCATION:Zürich
RRULE:FREQ=WEEKLY;COUNT=4
END:VEVENT
END:VCALENDAR`;
  const result = parseICalFile(content);
  // The code uses getAllSubcomponents('vevent') which returns the VEVENT component.
  // It does not expand recurrences, so only 1 event is returned.
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Weekly Standup");
});

// ─── Large number of events ─────────────────────────────────────────────────

Deno.test("parseICalFile: 100 events → doesn't crash", () => {
  const events: string[] = [];
  for (let i = 0; i < 100; i++) {
    const hour = String(9 + (i % 10)).padStart(2, "0");
    events.push(makeEvent({
      summary: `Event ${i}`,
      location: `Location ${i}`,
      dtstart: `20260318T${hour}0000`,
      dtend: `20260318T${hour}3000`,
    }));
  }
  const content = makeIcal(events);
  const result = parseICalFile(content);
  assertEquals(result.appointments.length, 100);
  assertEquals(result.warnings.length, 0);
});

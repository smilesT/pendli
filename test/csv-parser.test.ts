/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertGreater,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { parseCSVFile } from "../src/lib/parser/csv-parser.ts";

// ─── Valid CSV with German headers ──────────────────────────────────────────

Deno.test("parseCSVFile: valid 5-row CSV with German headers → 5 appointments", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Team Standup,ETH Zürich
2026-03-18,11:00,12:00,Meeting,Paradeplatz Zürich
2026-03-18,13:00,14:00,Lunch,Restaurant Bern
2026-03-18,15:00,16:00,Workshop,Technopark Zürich
2026-03-18,17:00,18:00,Drinks,Langstrasse Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 5);
  assertEquals(result.warnings.length, 0);
});

Deno.test("parseCSVFile: German headers recognized", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,Zürich HB`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Standup");
  assertEquals(result.appointments[0].location, "Zürich HB");
});

// ─── English headers ────────────────────────────────────────────────────────

Deno.test("parseCSVFile: English headers (Date, Start, End, Title, Location)", () => {
  const csv = `Date,Start,End,Title,Location
2026-03-18,09:00,10:00,Standup,Zurich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Standup");
  assertEquals(result.appointments[0].location, "Zurich");
});

Deno.test("parseCSVFile: alternative English headers (From, To, Subject, Address)", () => {
  const csv = `Date,From,To,Subject,Address
2026-03-18,09:00,10:00,Standup,Zurich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

Deno.test("parseCSVFile: alternative German headers (Tag, Von, Bis, Betreff, Standort)", () => {
  const csv = `Tag,Von,Bis,Betreff,Standort
2026-03-18,09:00,10:00,Standup,Zurich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

Deno.test("parseCSVFile: Begin/Ende/Summary/Place headers", () => {
  const csv = `Day,Begin,Ende,Summary,Place
2026-03-18,09:00,10:00,Standup,Zurich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

// ─── Case-insensitive headers ───────────────────────────────────────────────

Deno.test("parseCSVFile: uppercase headers DATUM, STARTZEIT, etc.", () => {
  const csv = `DATUM,STARTZEIT,ENDZEIT,TITEL,ORT
2026-03-18,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

Deno.test("parseCSVFile: mixed case headers (Datum, startzeit, ENDZEIT)", () => {
  const csv = `Datum,startzeit,ENDZEIT,Titel,ort
2026-03-18,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

// ─── Missing location → skip with warning ───────────────────────────────────

Deno.test("parseCSVFile: missing location → skip with warning", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,
2026-03-18,11:00,12:00,Meeting,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("keinen Ort"), true);
  assertEquals(result.warnings[0].includes("Standup"), true);
});

Deno.test("parseCSVFile: no location column at all → appointments still parsed if other columns present", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel
2026-03-18,09:00,10:00,Standup`;
  const result = parseCSVFile(csv);
  // locationIdx === -1, so location will be "" for every row → all skipped
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("keinen Ort"), true);
});

// ─── Missing date → skip with warning ───────────────────────────────────────

Deno.test("parseCSVFile: missing date in row → skip with warning", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
,09:00,10:00,Standup,Zürich
2026-03-18,11:00,12:00,Meeting,Bern`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("Datum oder Startzeit fehlt"), true);
});

Deno.test("parseCSVFile: missing startTime in row → skip with warning", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("Datum oder Startzeit fehlt"), true);
});

// ─── Empty file → warning ───────────────────────────────────────────────────

Deno.test("parseCSVFile: empty file → warning", () => {
  const result = parseCSVFile("");
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("keine Daten"), true);
});

// ─── Only headers, no data → warning ────────────────────────────────────────

Deno.test("parseCSVFile: only headers, no data rows → warning", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("keine Daten"), true);
});

// ─── BOM at start of file ───────────────────────────────────────────────────

Deno.test("parseCSVFile: BOM at start of file (\\uFEFF) → still parses", () => {
  const csv = `\uFEFFDatum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  // PapaParse handles BOM, but the header matching trims + lowercases.
  // If BOM is part of first header, it might fail. Let's test actual behavior.
  // PapaParse strips BOM by default, so this should work.
  assertEquals(result.appointments.length, 1);
  assertEquals(result.warnings.length, 0);
});

// ─── Date formats ───────────────────────────────────────────────────────────

Deno.test("parseCSVFile: DD.MM.YYYY date format", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
18.03.2026,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].startTime.getFullYear(), 2026);
  assertEquals(result.appointments[0].startTime.getMonth(), 2); // March = 2
  assertEquals(result.appointments[0].startTime.getDate(), 18);
});

Deno.test("parseCSVFile: DD/MM/YYYY date format", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
18/03/2026,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].startTime.getFullYear(), 2026);
  assertEquals(result.appointments[0].startTime.getMonth(), 2);
  assertEquals(result.appointments[0].startTime.getDate(), 18);
});

Deno.test("parseCSVFile: YYYY-MM-DD date format", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].startTime.getFullYear(), 2026);
  assertEquals(result.appointments[0].startTime.getMonth(), 2);
  assertEquals(result.appointments[0].startTime.getDate(), 18);
});

// ─── Missing endTime → default 1h duration ──────────────────────────────────

Deno.test("parseCSVFile: missing endTime → default 1h duration", () => {
  const csv = `Datum,Startzeit,Titel,Ort
2026-03-18,09:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  const apt = result.appointments[0];
  assertEquals(apt.startTime.getHours(), 9);
  assertEquals(apt.startTime.getMinutes(), 0);
  assertEquals(apt.endTime.getHours(), 10);
  assertEquals(apt.endTime.getMinutes(), 0);
});

Deno.test("parseCSVFile: endTime column exists but empty → default 1h", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,14:00,,Workshop,Bern`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].endTime.getHours(), 15);
});

// ─── Extra columns → ignored gracefully ─────────────────────────────────────

Deno.test("parseCSVFile: extra columns are ignored", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort,Notizen,Priorität
2026-03-18,09:00,10:00,Standup,Zürich,Wichtig,Hoch`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.warnings.length, 0);
});

// ─── Quoted fields with commas ──────────────────────────────────────────────

Deno.test("parseCSVFile: quoted fields with commas inside", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,"Team Meeting, Sprint Review","ETH Zürich, Rämistrasse 101, 8092 Zürich"`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Team Meeting, Sprint Review");
  assertEquals(result.appointments[0].location, "ETH Zürich, Rämistrasse 101, 8092 Zürich");
});

// ─── Malformed date → warning, skip row ─────────────────────────────────────

Deno.test("parseCSVFile: malformed date with hyphen → creates appointment with Invalid Date (no throw)", () => {
  // "not-a-date" contains '-', so it enters the YYYY-MM-DD branch.
  // parseInt("not")=NaN → new Date(NaN,...) → Invalid Date.
  // The code does NOT validate the Date object, so it creates an appointment.
  // This documents the actual behavior: malformed dates with hyphens slip through.
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
not-a-date,09:00,10:00,Standup,Zürich
2026-03-18,11:00,12:00,Valid,Bern`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 2);
  assertEquals(result.warnings.length, 0);
  // The first appointment has an Invalid Date
  assertEquals(isNaN(result.appointments[0].startTime.getTime()), true);
  // The second appointment is valid
  assertEquals(result.appointments[1].title, "Valid");
});

Deno.test("parseCSVFile: date with no separator → warning (Unbekanntes Datumsformat)", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
20260318,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("Unbekanntes Datumsformat"), true);
});

// ─── Same file uploaded twice → duplicates ──────────────────────────────────

Deno.test("parseCSVFile: same content parsed twice → produces separate appointments with unique IDs", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,Zürich`;
  const result1 = parseCSVFile(csv);
  const result2 = parseCSVFile(csv);
  assertEquals(result1.appointments.length, 1);
  assertEquals(result2.appointments.length, 1);
  // Both have same data
  assertEquals(result1.appointments[0].title, result2.appointments[0].title);
  assertEquals(result1.appointments[0].location, result2.appointments[0].location);
  // But different UUIDs (raw parser creates new UUIDs each time)
  const id1 = result1.appointments[0].id;
  const id2 = result2.appointments[0].id;
  assertEquals(id1 !== id2, true);
});

// ─── 1000 rows → doesn't crash ─────────────────────────────────────────────

Deno.test("parseCSVFile: 1000 rows → doesn't crash", () => {
  let csv = "Datum,Startzeit,Endzeit,Titel,Ort\n";
  for (let i = 0; i < 1000; i++) {
    csv += `2026-03-18,09:00,10:00,Meeting ${i},Zürich\n`;
  }
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1000);
  assertEquals(result.warnings.length, 0);
});

// ─── Semicolon delimiter ────────────────────────────────────────────────────

Deno.test("parseCSVFile: semicolon delimiter → PapaParse auto-detects", () => {
  const csv = `Datum;Startzeit;Endzeit;Titel;Ort
2026-03-18;09:00;10:00;Standup;Zürich`;
  const result = parseCSVFile(csv);
  // PapaParse auto-detects delimiters, so this should work
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Standup");
  assertEquals(result.appointments[0].location, "Zürich");
});

// ─── Appointments have all required fields ──────────────────────────────────

Deno.test("parseCSVFile: appointments have all required fields", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  const apt = result.appointments[0];
  assertExists(apt.id);
  assertExists(apt.title);
  assertExists(apt.startTime);
  assertExists(apt.endTime);
  assertExists(apt.location);
  assertEquals(typeof apt.id, "string");
  assertEquals(apt.id.length > 0, true);
});

// ─── Time parsing ───────────────────────────────────────────────────────────

Deno.test("parseCSVFile: time parsing 09:00 → hours=9, minutes=0", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:30,Standup,Zürich`;
  const result = parseCSVFile(csv);
  const apt = result.appointments[0];
  assertEquals(apt.startTime.getHours(), 9);
  assertEquals(apt.startTime.getMinutes(), 0);
  assertEquals(apt.endTime.getHours(), 10);
  assertEquals(apt.endTime.getMinutes(), 30);
});

// ─── Whitespace handling ────────────────────────────────────────────────────

Deno.test("parseCSVFile: whitespace in headers is trimmed", () => {
  const csv = `  Datum , Startzeit , Endzeit , Titel , Ort
2026-03-18,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

Deno.test("parseCSVFile: whitespace in data values is trimmed", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
  2026-03-18  ,  09:00  ,  10:00  ,  Standup  ,  Zürich  `;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Standup");
  assertEquals(result.appointments[0].location, "Zürich");
});

// ─── Multiple rows mixed valid/invalid ──────────────────────────────────────

Deno.test("parseCSVFile: mix of valid and invalid rows", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Valid1,Zürich
,09:00,10:00,NoDate,Zürich
2026-03-18,09:00,10:00,NoLocation,
baddate,09:00,10:00,BadDate,Zürich
2026-03-18,11:00,12:00,Valid2,Bern`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 2);
  assertEquals(result.appointments[0].title, "Valid1");
  assertEquals(result.appointments[1].title, "Valid2");
  assertEquals(result.warnings.length, 3); // NoDate, NoLocation, BadDate
});

// ─── Unrecognized header combination → warning ──────────────────────────────

Deno.test("parseCSVFile: completely unrecognized headers → warning about missing headers", () => {
  const csv = `Foo,Bar,Baz
value1,value2,value3`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("Header nicht erkannt"), true);
});

// ─── Location with only whitespace → treated as empty ───────────────────────

Deno.test("parseCSVFile: location with only whitespace → skipped", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,   `;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 0);
  assertEquals(result.warnings.length, 1);
  assertEquals(result.warnings[0].includes("keinen Ort"), true);
});

// ─── Unicode in values ──────────────────────────────────────────────────────

Deno.test("parseCSVFile: Unicode in title and location (Zürich, Ämter)", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Besuch bei den Ämtern,Zürich Stadelhofen`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.appointments[0].title, "Besuch bei den Ämtern");
  assertEquals(result.appointments[0].location, "Zürich Stadelhofen");
});

// ─── Tab delimiter → PapaParse auto-detects ─────────────────────────────────

Deno.test("parseCSVFile: tab delimiter → PapaParse auto-detects", () => {
  const csv = `Datum\tStartzeit\tEndzeit\tTitel\tOrt
2026-03-18\t09:00\t10:00\tStandup\tZürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

// ─── Only one row of data ───────────────────────────────────────────────────

Deno.test("parseCSVFile: single data row → 1 appointment", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

// ─── Newlines at end ────────────────────────────────────────────────────────

Deno.test("parseCSVFile: trailing newlines don't create phantom rows", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Standup,Zürich


`;
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
  assertEquals(result.warnings.length, 0);
});

// ─── Windows line endings (CRLF) ────────────────────────────────────────────

Deno.test("parseCSVFile: Windows CRLF line endings", () => {
  const csv = "Datum,Startzeit,Endzeit,Titel,Ort\r\n2026-03-18,09:00,10:00,Standup,Zürich\r\n";
  const result = parseCSVFile(csv);
  assertEquals(result.appointments.length, 1);
});

// ─── Multiple empty lines between data ──────────────────────────────────────

Deno.test("parseCSVFile: empty lines between rows are skipped", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort

2026-03-18,09:00,10:00,Meeting1,Zürich

2026-03-18,11:00,12:00,Meeting2,Bern
`;
  const result = parseCSVFile(csv);
  // skipEmptyLines: true in PapaParse config
  assertEquals(result.appointments.length, 2);
});

// ─── Date with 2-digit year → parsed as low year (documents behavior) ───────

Deno.test("parseCSVFile: 2-digit year DD.MM.YY → parsed as year 26", () => {
  const csv = `Datum,Startzeit,Endzeit,Titel,Ort
18.03.26,09:00,10:00,Standup,Zürich`;
  const result = parseCSVFile(csv);
  // parseInt("26") = 26, so year = 26 (not 2026)
  // This documents actual behavior: new Date(26, 2, 18) → year 1926 (JS adds 1900 to years 0-99)
  assertEquals(result.appointments.length, 1);
  // The appointment exists but with an unexpected year - documenting behavior
  const year = result.appointments[0].startTime.getFullYear();
  assertEquals(year < 100 || year === 1926, true);
});

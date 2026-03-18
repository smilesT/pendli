/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  formatDateISO,
  formatDateDDMMYYYY,
  formatTimeHHMM,
  differenceInMinutes,
  addMinutes,
  durationString,
  timeStringToMinutes,
  getTimeString,
  formatTime,
  formatDate,
} from "../src/lib/planner/time-utils.ts";

// ─── formatDateISO ──────────────────────────────────────────────────────────

Deno.test("formatDateISO: normal date 2026-03-18", () => {
  const d = new Date(2026, 2, 18); // March = 2
  assertEquals(formatDateISO(d), "2026-03-18");
});

Deno.test("formatDateISO: single-digit month (January)", () => {
  const d = new Date(2026, 0, 5);
  assertEquals(formatDateISO(d), "2026-01-05");
});

Deno.test("formatDateISO: single-digit day", () => {
  const d = new Date(2026, 8, 3); // September 3
  assertEquals(formatDateISO(d), "2026-09-03");
});

Deno.test("formatDateISO: December 31 (year boundary)", () => {
  const d = new Date(2025, 11, 31);
  assertEquals(formatDateISO(d), "2025-12-31");
});

Deno.test("formatDateISO: January 1 (year boundary)", () => {
  const d = new Date(2026, 0, 1);
  assertEquals(formatDateISO(d), "2026-01-01");
});

Deno.test("formatDateISO: leap year Feb 29", () => {
  const d = new Date(2024, 1, 29);
  assertEquals(formatDateISO(d), "2024-02-29");
});

Deno.test("formatDateISO: double-digit month and day", () => {
  const d = new Date(2026, 10, 25); // November 25
  assertEquals(formatDateISO(d), "2026-11-25");
});

// ─── formatDateDDMMYYYY ─────────────────────────────────────────────────────

Deno.test("formatDateDDMMYYYY: normal date", () => {
  const d = new Date(2026, 2, 18);
  assertEquals(formatDateDDMMYYYY(d), "18.03.2026");
});

Deno.test("formatDateDDMMYYYY: single-digit month and day", () => {
  const d = new Date(2026, 0, 5);
  assertEquals(formatDateDDMMYYYY(d), "05.01.2026");
});

Deno.test("formatDateDDMMYYYY: December 31", () => {
  const d = new Date(2025, 11, 31);
  assertEquals(formatDateDDMMYYYY(d), "31.12.2025");
});

Deno.test("formatDateDDMMYYYY: January 1", () => {
  const d = new Date(2026, 0, 1);
  assertEquals(formatDateDDMMYYYY(d), "01.01.2026");
});

Deno.test("formatDateDDMMYYYY: leap year Feb 29", () => {
  const d = new Date(2024, 1, 29);
  assertEquals(formatDateDDMMYYYY(d), "29.02.2024");
});

// ─── formatTimeHHMM ─────────────────────────────────────────────────────────

Deno.test("formatTimeHHMM: midnight 00:00", () => {
  const d = new Date(2026, 2, 18, 0, 0);
  assertEquals(formatTimeHHMM(d), "00:00");
});

Deno.test("formatTimeHHMM: noon 12:00", () => {
  const d = new Date(2026, 2, 18, 12, 0);
  assertEquals(formatTimeHHMM(d), "12:00");
});

Deno.test("formatTimeHHMM: 23:59 end of day", () => {
  const d = new Date(2026, 2, 18, 23, 59);
  assertEquals(formatTimeHHMM(d), "23:59");
});

Deno.test("formatTimeHHMM: single-digit hour 09:05", () => {
  const d = new Date(2026, 2, 18, 9, 5);
  assertEquals(formatTimeHHMM(d), "09:05");
});

Deno.test("formatTimeHHMM: single-digit minute 10:03", () => {
  const d = new Date(2026, 2, 18, 10, 3);
  assertEquals(formatTimeHHMM(d), "10:03");
});

Deno.test("formatTimeHHMM: 01:01 both single digits", () => {
  const d = new Date(2026, 2, 18, 1, 1);
  assertEquals(formatTimeHHMM(d), "01:01");
});

// ─── getTimeString (alias for formatTimeHHMM) ──────────────────────────────

Deno.test("getTimeString: returns same as formatTimeHHMM", () => {
  const d = new Date(2026, 2, 18, 14, 35);
  assertEquals(getTimeString(d), formatTimeHHMM(d));
  assertEquals(getTimeString(d), "14:35");
});

// ─── differenceInMinutes ────────────────────────────────────────────────────

Deno.test("differenceInMinutes: positive difference (a > b)", () => {
  const a = new Date(2026, 2, 18, 10, 30);
  const b = new Date(2026, 2, 18, 10, 0);
  assertEquals(differenceInMinutes(a, b), 30);
});

Deno.test("differenceInMinutes: negative difference (a < b)", () => {
  const a = new Date(2026, 2, 18, 10, 0);
  const b = new Date(2026, 2, 18, 10, 30);
  assertEquals(differenceInMinutes(a, b), -30);
});

Deno.test("differenceInMinutes: zero difference (same time)", () => {
  const a = new Date(2026, 2, 18, 10, 0);
  const b = new Date(2026, 2, 18, 10, 0);
  assertEquals(differenceInMinutes(a, b), 0);
});

Deno.test("differenceInMinutes: very large (multi-day)", () => {
  const a = new Date(2026, 2, 20, 10, 0); // 2 days later
  const b = new Date(2026, 2, 18, 10, 0);
  assertEquals(differenceInMinutes(a, b), 2 * 24 * 60);
});

Deno.test("differenceInMinutes: crossing midnight", () => {
  const a = new Date(2026, 2, 19, 1, 0); // 1:00 next day
  const b = new Date(2026, 2, 18, 23, 0); // 23:00 prev day
  assertEquals(differenceInMinutes(a, b), 120);
});

Deno.test("differenceInMinutes: exactly 1 minute", () => {
  const a = new Date(2026, 2, 18, 10, 1);
  const b = new Date(2026, 2, 18, 10, 0);
  assertEquals(differenceInMinutes(a, b), 1);
});

Deno.test("differenceInMinutes: 30 seconds rounds to 1 minute", () => {
  const a = new Date(2026, 2, 18, 10, 0, 30);
  const b = new Date(2026, 2, 18, 10, 0, 0);
  assertEquals(differenceInMinutes(a, b), 1); // Math.round(0.5) = 1
});

Deno.test("differenceInMinutes: 29 seconds rounds to 0 minutes", () => {
  const a = new Date(2026, 2, 18, 10, 0, 29);
  const b = new Date(2026, 2, 18, 10, 0, 0);
  assertEquals(differenceInMinutes(a, b), 0); // Math.round(0.483) = 0
});

// ─── addMinutes ─────────────────────────────────────────────────────────────

Deno.test("addMinutes: positive minutes", () => {
  const d = new Date(2026, 2, 18, 10, 0);
  const result = addMinutes(d, 30);
  assertEquals(result.getHours(), 10);
  assertEquals(result.getMinutes(), 30);
});

Deno.test("addMinutes: negative minutes", () => {
  const d = new Date(2026, 2, 18, 10, 30);
  const result = addMinutes(d, -30);
  assertEquals(result.getHours(), 10);
  assertEquals(result.getMinutes(), 0);
});

Deno.test("addMinutes: zero minutes returns same time", () => {
  const d = new Date(2026, 2, 18, 10, 0);
  const result = addMinutes(d, 0);
  assertEquals(result.getTime(), d.getTime());
});

Deno.test("addMinutes: crossing midnight forward", () => {
  const d = new Date(2026, 2, 18, 23, 30);
  const result = addMinutes(d, 60);
  assertEquals(result.getDate(), 19);
  assertEquals(result.getHours(), 0);
  assertEquals(result.getMinutes(), 30);
});

Deno.test("addMinutes: crossing midnight backward", () => {
  const d = new Date(2026, 2, 19, 0, 30);
  const result = addMinutes(d, -60);
  assertEquals(result.getDate(), 18);
  assertEquals(result.getHours(), 23);
  assertEquals(result.getMinutes(), 30);
});

Deno.test("addMinutes: crossing day boundary (add 24h)", () => {
  const d = new Date(2026, 2, 18, 10, 0);
  const result = addMinutes(d, 24 * 60);
  assertEquals(result.getDate(), 19);
  assertEquals(result.getHours(), 10);
  assertEquals(result.getMinutes(), 0);
});

Deno.test("addMinutes: does not mutate original date", () => {
  const d = new Date(2026, 2, 18, 10, 0);
  const originalTime = d.getTime();
  addMinutes(d, 30);
  assertEquals(d.getTime(), originalTime);
});

Deno.test("addMinutes: large negative goes to previous month", () => {
  const d = new Date(2026, 2, 1, 0, 0); // March 1
  const result = addMinutes(d, -60);
  assertEquals(result.getMonth(), 1); // February
  assertEquals(result.getDate(), 28);
  assertEquals(result.getHours(), 23);
});

// ─── durationString ─────────────────────────────────────────────────────────

Deno.test("durationString: 0 minutes", () => {
  assertEquals(durationString(0), "0 Min.");
});

Deno.test("durationString: 1 minute", () => {
  assertEquals(durationString(1), "1 Min.");
});

Deno.test("durationString: 59 minutes", () => {
  assertEquals(durationString(59), "59 Min.");
});

Deno.test("durationString: exactly 60 minutes → 1 Std.", () => {
  assertEquals(durationString(60), "1 Std.");
});

Deno.test("durationString: 61 minutes → 1 Std. 1 Min.", () => {
  assertEquals(durationString(61), "1 Std. 1 Min.");
});

Deno.test("durationString: 120 minutes → 2 Std.", () => {
  assertEquals(durationString(120), "2 Std.");
});

Deno.test("durationString: 121 minutes → 2 Std. 1 Min.", () => {
  assertEquals(durationString(121), "2 Std. 1 Min.");
});

Deno.test("durationString: 1441 minutes (>24h) → 24 Std. 1 Min.", () => {
  assertEquals(durationString(1441), "24 Std. 1 Min.");
});

Deno.test("durationString: 90 minutes → 1 Std. 30 Min.", () => {
  assertEquals(durationString(90), "1 Std. 30 Min.");
});

Deno.test("durationString: negative minutes (edge case, no guard in code)", () => {
  // The function has no guard for negatives. With -30:
  // -30 < 60 is true, so it returns "-30 Min."
  // This documents the actual behavior.
  assertEquals(durationString(-30), "-30 Min.");
});

Deno.test("durationString: negative minutes >= -60 (edge case)", () => {
  // -60 < 60 is true, so still returns minutes format
  assertEquals(durationString(-60), "-60 Min.");
});

Deno.test("durationString: negative minutes < -60 (edge case)", () => {
  // -61 < 60 is true (since -61 < 60), so returns "-61 Min."
  assertEquals(durationString(-61), "-61 Min.");
});

// ─── timeStringToMinutes ────────────────────────────────────────────────────

Deno.test("timeStringToMinutes: midnight 00:00 → 0", () => {
  assertEquals(timeStringToMinutes("00:00"), 0);
});

Deno.test("timeStringToMinutes: 23:59 → 1439", () => {
  assertEquals(timeStringToMinutes("23:59"), 23 * 60 + 59);
});

Deno.test("timeStringToMinutes: noon 12:00 → 720", () => {
  assertEquals(timeStringToMinutes("12:00"), 720);
});

Deno.test("timeStringToMinutes: 12:30 → 750", () => {
  assertEquals(timeStringToMinutes("12:30"), 750);
});

Deno.test("timeStringToMinutes: 08:00 → 480", () => {
  assertEquals(timeStringToMinutes("08:00"), 480);
});

Deno.test("timeStringToMinutes: 17:00 → 1020", () => {
  assertEquals(timeStringToMinutes("17:00"), 1020);
});

Deno.test("timeStringToMinutes: 01:01 → 61", () => {
  assertEquals(timeStringToMinutes("01:01"), 61);
});

Deno.test("timeStringToMinutes: invalid string with no colon → NaN", () => {
  // "abc".split(":") → ["abc"], map(Number) → [NaN]
  // h=NaN, m=undefined → NaN * 60 + undefined = NaN
  const result = timeStringToMinutes("abc");
  assertEquals(isNaN(result), true);
});

Deno.test("timeStringToMinutes: empty string → NaN", () => {
  const result = timeStringToMinutes("");
  assertEquals(isNaN(result), true);
});

// ─── formatTime (locale-dependent, de-CH) ───────────────────────────────────

Deno.test("formatTime: produces HH:MM format string", () => {
  const d = new Date(2026, 2, 18, 14, 30);
  const result = formatTime(d);
  // de-CH locale should produce "14:30" (24h format)
  assertEquals(result, "14:30");
});

Deno.test("formatTime: midnight", () => {
  const d = new Date(2026, 2, 18, 0, 0);
  const result = formatTime(d);
  assertEquals(result, "00:00");
});

// ─── formatDate (locale-dependent, de-CH) ───────────────────────────────────

Deno.test("formatDate: produces locale-formatted string containing year", () => {
  const d = new Date(2026, 2, 18); // Wednesday March 18
  const result = formatDate(d);
  // de-CH should produce something like "Mittwoch, 18. März 2026"
  // We test for presence of key parts rather than exact format
  assertEquals(result.includes("2026"), true);
});

// ─── Edge: Invalid Date inputs ──────────────────────────────────────────────

Deno.test("formatDateISO: Invalid Date produces NaN strings", () => {
  const d = new Date("invalid");
  const result = formatDateISO(d);
  // getFullYear() → NaN, getMonth()+1 → NaN, getDate() → NaN
  // String(NaN) → "NaN", padStart(2,'0') on a 3-char string → "NaN" (no padding needed)
  assertEquals(result, "NaN-NaN-NaN");
});

Deno.test("formatTimeHHMM: Invalid Date produces NaN strings", () => {
  const d = new Date("invalid");
  const result = formatTimeHHMM(d);
  // String(NaN).padStart(2,'0') → "NaN" (already 3 chars, no padding)
  assertEquals(result, "NaN:NaN");
});

Deno.test("differenceInMinutes: Invalid Date produces NaN", () => {
  const a = new Date("invalid");
  const b = new Date(2026, 2, 18);
  const result = differenceInMinutes(a, b);
  assertEquals(isNaN(result), true);
});

Deno.test("addMinutes: Invalid Date returns Invalid Date", () => {
  const d = new Date("invalid");
  const result = addMinutes(d, 30);
  assertEquals(isNaN(result.getTime()), true);
});

Deno.test("formatDateDDMMYYYY: Invalid Date produces NaN strings", () => {
  const d = new Date("invalid");
  const result = formatDateDDMMYYYY(d);
  // String(NaN).padStart(2,'0') → "NaN" (already 3 chars, no padding)
  assertEquals(result, "NaN.NaN.NaN");
});

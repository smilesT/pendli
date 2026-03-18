/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { getBaseLocation } from "../src/lib/planner/base-location.ts";
import type { UserConfig, ResolvedLocation } from "../src/types/index.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeLocation(name: string): ResolvedLocation {
  return { name, latitude: 47.3769, longitude: 8.5417, station: name };
}

function makeConfig(overrides?: {
  days?: number[];
  startTime?: string;
  endTime?: string;
}): UserConfig {
  return {
    homeAddress: makeLocation("Zuhause"),
    workAddress: makeLocation("Büro"),
    workSchedule: {
      days: overrides?.days ?? [1, 2, 3, 4, 5], // Mon-Fri
      startTime: overrides?.startTime ?? "08:00",
      endTime: overrides?.endTime ?? "17:00",
    },
    bufferMinutes: 10,
  };
}

// Date helpers: create a date on a specific weekday
// 2026-03-16 is Monday, 2026-03-17 is Tuesday, ..., 2026-03-21 is Saturday, 2026-03-22 is Sunday
function monday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 16, hours, minutes);
}
function tuesday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 17, hours, minutes);
}
function wednesday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 18, hours, minutes);
}
function thursday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 19, hours, minutes);
}
function friday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 20, hours, minutes);
}
function saturday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 21, hours, minutes);
}
function sunday(hours: number, minutes: number): Date {
  return new Date(2026, 2, 22, hours, minutes);
}

// ─── Monday during work hours → work ───────────────────────────────────────

Deno.test("getBaseLocation: Monday 10:00 → work", () => {
  const config = makeConfig();
  const result = getBaseLocation(monday(10, 0), config);
  assertEquals(result.name, "Büro");
});

// ─── Monday before work → home ─────────────────────────────────────────────

Deno.test("getBaseLocation: Monday 07:59 → home (before work start)", () => {
  const config = makeConfig();
  const result = getBaseLocation(monday(7, 59), config);
  assertEquals(result.name, "Zuhause");
});

// ─── Monday after work → home ───────────────────────────────────────────────

Deno.test("getBaseLocation: Monday 17:01 → home (after work end)", () => {
  const config = makeConfig();
  const result = getBaseLocation(monday(17, 1), config);
  assertEquals(result.name, "Zuhause");
});

// ─── Exact boundary: work start ─────────────────────────────────────────────

Deno.test("getBaseLocation: Monday 08:00 → work (exact start boundary, uses >=)", () => {
  const config = makeConfig();
  // The code uses timeStr >= config.workSchedule.startTime
  // "08:00" >= "08:00" is true
  const result = getBaseLocation(monday(8, 0), config);
  assertEquals(result.name, "Büro");
});

// ─── Exact boundary: work end ───────────────────────────────────────────────

Deno.test("getBaseLocation: Monday 17:00 → work (exact end boundary, uses <=)", () => {
  const config = makeConfig();
  // The code uses timeStr <= config.workSchedule.endTime
  // "17:00" <= "17:00" is true
  const result = getBaseLocation(monday(17, 0), config);
  assertEquals(result.name, "Büro");
});

// ─── Weekend → home ────────────────────────────────────────────────────────

Deno.test("getBaseLocation: Saturday 10:00 → home (weekend)", () => {
  const config = makeConfig();
  const result = getBaseLocation(saturday(10, 0), config);
  assertEquals(result.name, "Zuhause");
});

Deno.test("getBaseLocation: Sunday 10:00 → home (weekend)", () => {
  const config = makeConfig();
  const result = getBaseLocation(sunday(10, 0), config);
  assertEquals(result.name, "Zuhause");
});

// ─── Midday work ────────────────────────────────────────────────────────────

Deno.test("getBaseLocation: Wednesday 12:00 → work (midday)", () => {
  const config = makeConfig();
  const result = getBaseLocation(wednesday(12, 0), config);
  assertEquals(result.name, "Büro");
});

// ─── All weekdays during work hours ─────────────────────────────────────────

Deno.test("getBaseLocation: Tuesday 09:00 → work", () => {
  const config = makeConfig();
  const result = getBaseLocation(tuesday(9, 0), config);
  assertEquals(result.name, "Büro");
});

Deno.test("getBaseLocation: Thursday 16:00 → work", () => {
  const config = makeConfig();
  const result = getBaseLocation(thursday(16, 0), config);
  assertEquals(result.name, "Büro");
});

Deno.test("getBaseLocation: Friday 08:01 → work", () => {
  const config = makeConfig();
  const result = getBaseLocation(friday(8, 1), config);
  assertEquals(result.name, "Büro");
});

// ─── Custom schedule: only Mon/Wed/Fri ──────────────────────────────────────

Deno.test("getBaseLocation: custom Mon/Wed/Fri - Monday 10:00 → work", () => {
  const config = makeConfig({ days: [1, 3, 5] });
  const result = getBaseLocation(monday(10, 0), config);
  assertEquals(result.name, "Büro");
});

Deno.test("getBaseLocation: custom Mon/Wed/Fri - Tuesday 10:00 → home (not work day)", () => {
  const config = makeConfig({ days: [1, 3, 5] });
  const result = getBaseLocation(tuesday(10, 0), config);
  assertEquals(result.name, "Zuhause");
});

Deno.test("getBaseLocation: custom Mon/Wed/Fri - Wednesday 10:00 → work", () => {
  const config = makeConfig({ days: [1, 3, 5] });
  const result = getBaseLocation(wednesday(10, 0), config);
  assertEquals(result.name, "Büro");
});

Deno.test("getBaseLocation: custom Mon/Wed/Fri - Thursday 10:00 → home", () => {
  const config = makeConfig({ days: [1, 3, 5] });
  const result = getBaseLocation(thursday(10, 0), config);
  assertEquals(result.name, "Zuhause");
});

Deno.test("getBaseLocation: custom Mon/Wed/Fri - Friday 10:00 → work", () => {
  const config = makeConfig({ days: [1, 3, 5] });
  const result = getBaseLocation(friday(10, 0), config);
  assertEquals(result.name, "Büro");
});

Deno.test("getBaseLocation: custom Mon/Wed/Fri - Saturday 10:00 → home", () => {
  const config = makeConfig({ days: [1, 3, 5] });
  const result = getBaseLocation(saturday(10, 0), config);
  assertEquals(result.name, "Zuhause");
});

// ─── Custom schedule: different hours ───────────────────────────────────────

Deno.test("getBaseLocation: custom 09:00-18:00 - 08:59 → home", () => {
  const config = makeConfig({ startTime: "09:00", endTime: "18:00" });
  const result = getBaseLocation(monday(8, 59), config);
  assertEquals(result.name, "Zuhause");
});

Deno.test("getBaseLocation: custom 09:00-18:00 - 09:00 → work", () => {
  const config = makeConfig({ startTime: "09:00", endTime: "18:00" });
  const result = getBaseLocation(monday(9, 0), config);
  assertEquals(result.name, "Büro");
});

Deno.test("getBaseLocation: custom 09:00-18:00 - 18:00 → work", () => {
  const config = makeConfig({ startTime: "09:00", endTime: "18:00" });
  const result = getBaseLocation(monday(18, 0), config);
  assertEquals(result.name, "Büro");
});

Deno.test("getBaseLocation: custom 09:00-18:00 - 18:01 → home", () => {
  const config = makeConfig({ startTime: "09:00", endTime: "18:00" });
  const result = getBaseLocation(monday(18, 1), config);
  assertEquals(result.name, "Zuhause");
});

// ─── No work days at all ────────────────────────────────────────────────────

Deno.test("getBaseLocation: empty work days → always home", () => {
  const config = makeConfig({ days: [] });
  const result = getBaseLocation(monday(10, 0), config);
  assertEquals(result.name, "Zuhause");
});

// ─── Work every day including weekends ──────────────────────────────────────

Deno.test("getBaseLocation: work 7 days - Saturday 10:00 → work", () => {
  const config = makeConfig({ days: [0, 1, 2, 3, 4, 5, 6] });
  const result = getBaseLocation(saturday(10, 0), config);
  assertEquals(result.name, "Büro");
});

Deno.test("getBaseLocation: work 7 days - Sunday 10:00 → work", () => {
  const config = makeConfig({ days: [0, 1, 2, 3, 4, 5, 6] });
  const result = getBaseLocation(sunday(10, 0), config);
  assertEquals(result.name, "Büro");
});

// ─── Night shift scenario ───────────────────────────────────────────────────
// LIMITATION: the code uses string comparison (timeStr >= startTime && timeStr <= endTime)
// This means night shifts (startTime > endTime) will never match because no time
// is simultaneously >= "22:00" AND <= "06:00".

Deno.test("getBaseLocation: night shift 22:00-06:00 - LIMITATION: 23:00 → home (string comparison fails)", () => {
  // This documents a known limitation: the code does not handle night shifts.
  // "23:00" >= "22:00" is true, BUT "23:00" <= "06:00" is false
  // So the condition fails and returns home even though the user is working.
  const config = makeConfig({ startTime: "22:00", endTime: "06:00" });
  const result = getBaseLocation(monday(23, 0), config);
  // This is the ACTUAL behavior, not necessarily correct behavior
  assertEquals(result.name, "Zuhause");
});

Deno.test("getBaseLocation: night shift 22:00-06:00 - LIMITATION: 02:00 → home (string comparison fails)", () => {
  const config = makeConfig({ startTime: "22:00", endTime: "06:00" });
  const result = getBaseLocation(tuesday(2, 0), config);
  assertEquals(result.name, "Zuhause");
});

// ─── Midnight edge ──────────────────────────────────────────────────────────

Deno.test("getBaseLocation: midnight 00:00 on Monday → home (before work)", () => {
  const config = makeConfig();
  const result = getBaseLocation(monday(0, 0), config);
  assertEquals(result.name, "Zuhause");
});

Deno.test("getBaseLocation: 23:59 on Monday → home (after work)", () => {
  const config = makeConfig();
  const result = getBaseLocation(monday(23, 59), config);
  assertEquals(result.name, "Zuhause");
});

// ─── Returns the actual config objects ──────────────────────────────────────

Deno.test("getBaseLocation: returns workAddress object (identity check)", () => {
  const config = makeConfig();
  const result = getBaseLocation(monday(10, 0), config);
  assertEquals(result, config.workAddress);
});

Deno.test("getBaseLocation: returns homeAddress object (identity check)", () => {
  const config = makeConfig();
  const result = getBaseLocation(saturday(10, 0), config);
  assertEquals(result, config.homeAddress);
});

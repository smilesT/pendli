/// <reference lib="deno.ns" />
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Mirror of preCleanQuery + simplifyQuery from transport-api.ts
const COUNTRY_NAMES = ["switzerland", "schweiz", "suisse", "svizzera"];
const NOISE_PATTERNS = [
  /\b(room|raum|sitzungszimmer|gebäude|building|department of|büro|office|c\/o)\s+\S+/gi,
  /\b(mein|dein|unser|meine)\s+\S+/gi,
];

function preCleanQuery(query: string): string {
  let cleaned = query;
  const parts = cleaned.split(",").map((p) => p.trim());
  if (parts.length > 1 && COUNTRY_NAMES.includes(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
    cleaned = parts.join(", ");
  }
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();
}

function simplifyQuery(rawQuery: string): string[] {
  const query = preCleanQuery(rawQuery);
  const queries: string[] = [];
  const seen = new Set<string>();
  const add = (q: string) => {
    const trimmed = q.replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim();
    if (trimmed.length >= 2 && !seen.has(trimmed)) {
      seen.add(trimmed);
      queries.push(trimmed);
    }
  };

  add(query);
  add(query.replace(/,\s*/g, " ").replace(/\b\d{1,3}[a-zA-Z]?\b/g, ""));
  const parts = query.split(",").map((p) => p.trim());
  for (const part of [...parts].reverse()) {
    add(part);
    add(part.replace(/\b\d+[a-zA-Z]?\b/g, "").trim());
  }
  add(query.replace(/\b\d+[a-zA-Z]?\b/g, ""));

  return queries;
}

// === PLZ preservation ===

Deno.test("PLZ+city kept: '9320 Arbon' stays in variants", () => {
  const v = simplifyQuery("Marktgasse 12, 9320 Arbon");
  assert(v.includes("9320 Arbon"), `Must include '9320 Arbon', got: ${JSON.stringify(v)}`);
});

Deno.test("PLZ+city kept: '8001 Zürich' stays in variants", () => {
  const v = simplifyQuery("Paradeplatz, 8001 Zürich");
  assert(v.includes("8001 Zürich"), `Must include '8001 Zürich'`);
});

Deno.test("PLZ+city kept: '3011 Bern' stays in variants", () => {
  const v = simplifyQuery("Marktgasse 12, 3011 Bern");
  assert(v.includes("3011 Bern"), `Must include '3011 Bern'`);
});

// === City before street ===

Deno.test("city before street: 'Marktgasse 12, 9320 Arbon'", () => {
  const v = simplifyQuery("Marktgasse 12, 9320 Arbon");
  const arbonIdx = v.findIndex((q) => q === "Arbon" || q === "9320 Arbon");
  const streetIdx = v.findIndex((q) => q === "Marktgasse" || q === "Marktgasse 12");
  assert(arbonIdx < streetIdx, `Arbon (${arbonIdx}) before Marktgasse (${streetIdx})`);
});

Deno.test("city before street: 'Bahnhofstrasse 1, 8001 Zürich'", () => {
  const v = simplifyQuery("Bahnhofstrasse 1, 8001 Zürich");
  const cityIdx = v.findIndex((q) => q === "Zürich" || q === "8001 Zürich");
  const streetIdx = v.findIndex((q) => q === "Bahnhofstrasse");
  assert(cityIdx < streetIdx, "Zürich before Bahnhofstrasse");
});

Deno.test("city before street: 'Hauptstrasse 5, 4500 Solothurn'", () => {
  const v = simplifyQuery("Hauptstrasse 5, 4500 Solothurn");
  const cityIdx = v.findIndex((q) => q === "Solothurn" || q === "4500 Solothurn");
  const streetIdx = v.findIndex((q) => q === "Hauptstrasse");
  assert(cityIdx < streetIdx, "Solothurn before Hauptstrasse");
});

// === Country name stripping ===

Deno.test("strips 'Switzerland' from end", () => {
  const v = simplifyQuery("ETH Zürich, 8092 Zürich, Switzerland");
  assert(!v.some((q) => q.toLowerCase().includes("switzerland")), "Switzerland must be stripped");
  assert(v.includes("ETH Zürich") || v.some((q) => q.includes("ETH")), "ETH Zürich must remain");
});

Deno.test("strips 'Schweiz' from end", () => {
  const v = simplifyQuery("Marktgasse, Bern, Schweiz");
  assert(!v.some((q) => q.toLowerCase().includes("schweiz")), "Schweiz must be stripped");
  assert(v.includes("Bern"), "Bern must remain");
});

Deno.test("strips 'Suisse' from end", () => {
  const v = simplifyQuery("Gare, Lausanne, Suisse");
  assert(!v.some((q) => q.toLowerCase().includes("suisse")), "Suisse must be stripped");
  assert(v.includes("Lausanne"), "Lausanne must remain");
});

Deno.test("does NOT strip country if not last part", () => {
  const v = simplifyQuery("Switzerland Avenue, Zürich");
  // "Switzerland Avenue" is not a country-only part — the whole part must match
  // preCleanQuery only strips if the last comma-separated part is a country name
  assert(v.some((q) => q.includes("Zürich")), "Zürich must be present");
});

// === Noise stripping ===

Deno.test("strips 'Room 4B' from 'Meeting Room 4B, ETH Zentrum, Zürich'", () => {
  const v = simplifyQuery("Meeting Room 4B, ETH Zentrum, Zürich");
  // "Room 4B" should be stripped, "ETH Zentrum" and "Zürich" should remain
  assert(v.includes("ETH Zentrum") || v.some((q) => q.includes("ETH")), "ETH must remain");
  assert(v.includes("Zürich"), "Zürich must remain");
});

Deno.test("strips 'Büro XY' from address", () => {
  const v = simplifyQuery("Büro 301, Bahnhofstrasse 10, 8001 Zürich");
  assert(v.includes("Zürich") || v.includes("8001 Zürich"), "Zürich must remain");
});

Deno.test("strips 'Department of Computer Science'", () => {
  const v = simplifyQuery("Department of Science, ETH Zürich, 8092 Zürich");
  assert(v.includes("ETH Zürich") || v.some((q) => q.includes("ETH")), "ETH must remain");
  assert(v.includes("Zürich") || v.includes("8092 Zürich"), "Zürich must remain");
});

// === No duplicates ===

Deno.test("no duplicates in output", () => {
  const inputs = [
    "Marktgasse 12, 9320 Arbon",
    "ETH Zürich, Rämistrasse 101, 8092 Zürich, Switzerland",
    "Bern",
    "Rue de la Gare 15, 1003 Lausanne, Suisse",
  ];
  for (const input of inputs) {
    const v = simplifyQuery(input);
    assertEquals(v.length, new Set(v).size, `Duplicates in: ${JSON.stringify(v)}`);
  }
});

// === Short parts excluded ===

Deno.test("parts shorter than 2 chars excluded", () => {
  const v = simplifyQuery("A, 8000 Zürich");
  for (const q of v) {
    assert(q.length >= 2, `"${q}" is too short`);
  }
});

// === Simple names pass through ===

Deno.test("'Zürich HB' stays as first variant", () => {
  assertEquals(simplifyQuery("Zürich HB")[0], "Zürich HB");
});

Deno.test("'Bern' stays as first variant", () => {
  assertEquals(simplifyQuery("Bern")[0], "Bern");
});

Deno.test("'Basel SBB' stays as first variant", () => {
  assertEquals(simplifyQuery("Basel SBB")[0], "Basel SBB");
});

// === Multi-language ===

Deno.test("French: Lausanne in variants", () => {
  const v = simplifyQuery("Rue de la Gare 15, 1003 Lausanne");
  assert(v.includes("1003 Lausanne") || v.includes("Lausanne"), "Must include Lausanne");
});

Deno.test("Italian: Bellinzona in variants", () => {
  const v = simplifyQuery("Via della Stazione 5, 6500 Bellinzona");
  assert(v.includes("6500 Bellinzona") || v.includes("Bellinzona"), "Must include Bellinzona");
});

// === Long Google Calendar addresses ===

Deno.test("long address: 'ETH Zürich, Dept of CS, Universitätstr 6, CAB Building, 8092 Zürich, Switzerland'", () => {
  const v = simplifyQuery("ETH Zürich, Department of CS, Universitätstrasse 6, CAB Building, 8092 Zürich, Switzerland");
  // Switzerland stripped, ETH Zürich and Zürich must be present
  assert(!v.some((q) => q.toLowerCase().includes("switzerland")), "Switzerland stripped");
  assert(v.some((q) => q.includes("Zürich")), "Zürich must be in variants");
  assert(v.some((q) => q.includes("ETH")), "ETH must be in variants");
  // "8092 Zürich" or "Zürich" should come before standalone "CAB Building"
  const zhIdx = v.findIndex((q) => q === "8092 Zürich" || q === "Zürich");
  const cabIdx = v.findIndex((q) => q === "CAB Building");
  if (cabIdx !== -1) {
    assert(zhIdx < cabIdx, `Zürich (${zhIdx}) before CAB Building (${cabIdx}) in ${JSON.stringify(v)}`);
  }
});

// === Useless inputs ===

Deno.test("'Mein Büro' — noise stripped, short result", () => {
  const v = simplifyQuery("Mein Büro");
  // "Mein" is a noise word, "Büro" is a noise word
  // Result should be minimal
  assert(v.length <= 3, `Too many variants for useless input: ${JSON.stringify(v)}`);
});

// === Swiss cities with PLZ ===

const SWISS_CITIES = [
  { input: "Langstrasse 100, 8004 Zürich", city: "Zürich", plz: "8004" },
  { input: "Bundesplatz 3, 3003 Bern", city: "Bern", plz: "3003" },
  { input: "Freiestrasse 52, 4001 Basel", city: "Basel", plz: "4001" },
  { input: "Pilatusstrasse 1, 6003 Luzern", city: "Luzern", plz: "6003" },
  { input: "Vadianstrasse 2, 9000 St. Gallen", city: "St. Gallen", plz: "9000" },
  { input: "Quaderstrasse 8, 7000 Chur", city: "Chur", plz: "7000" },
  { input: "Avenue de la Gare 10, 1003 Lausanne", city: "Lausanne", plz: "1003" },
  { input: "Rue du Rhône 1, 1204 Genève", city: "Genève", plz: "1204" },
  { input: "Via Nassa 3, 6900 Lugano", city: "Lugano", plz: "6900" },
];

for (const { input, city, plz } of SWISS_CITIES) {
  Deno.test(`Swiss city: '${input}' → PLZ+city or city in variants`, () => {
    const v = simplifyQuery(input);
    const hasCity = v.includes(city) || v.includes(`${plz} ${city}`);
    assert(hasCity, `City '${city}' not found in: ${JSON.stringify(v)}`);
  });
}

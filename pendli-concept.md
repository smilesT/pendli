# 🚆 pendli — Dein smarter ÖV-Tagesplaner für die Schweiz

> **Repo-Name:** `pendli`
> **Tagline:** *"Dein Tag. Deine Termine. Deine optimale Route."*
> **Namens-Herleitung:** Schweizerdeutsches Diminutiv von "Pendler" — kurz, einprägsam, lokal.

---

## 1. Problemstellung

Wer in der Schweiz mit dem ÖV unterwegs ist und mehrere Termine an verschiedenen Orten hat, steht vor dem Problem: "Wann muss ich wo los, um überall rechtzeitig zu sein?" Aktuell muss man manuell jeden Transfer auf sbb.ch nachschlagen. Das kostet Zeit und ist fehleranfällig.

**pendli** löst das: Kalender hochladen → Arbeitszeiten konfigurieren → optimale ÖV-Route für den ganzen Tag erhalten.

---

## 2. Kernfunktionen

### 2.1 Kalender-Import
- **iCal (.ics)**: Standard-Export aus Google Calendar, Outlook, Apple Calendar
- **CSV**: Manueller Import mit Spalten: `Datum`, `Uhrzeit`, `Dauer`, `Ort/Adresse`, `Titel`
- Parsing und Extraktion der Felder: Zeitpunkt, Dauer, Standort (aus LOCATION-Feld oder Beschreibung)

### 2.2 Standort-Logik (Home / Work)
Der User konfiguriert:
- **Privatadresse** (= Standardstandort ausserhalb der Arbeitszeit)
- **Arbeitsadresse** (= Standardstandort während der Arbeitszeit)
- **Arbeitszeiten** (z.B. Mo–Fr, 08:00–17:00)

**Logik:** Zwischen Terminen wird der "Basis-Standort" automatisch bestimmt:
- Fällt ein Zeitfenster in die Arbeitszeit → Arbeitsadresse als Ausgangsort
- Fällt es ausserhalb → Privatadresse als Ausgangsort
- Erster Termin des Tages → Route ab Privatadresse
- Letzter Termin des Tages → Route zurück zur Privatadresse

### 2.3 Routen-Berechnung
- Für jeden Übergang (A → B) wird die **Swiss Transport API** (`transport.opendata.ch`) abgefragt
- Berücksichtigt werden: Abfahrtszeit, Umsteigezeit, Ankunftszeit
- Pufferzeit vor jedem Termin konfigurierbar (Standard: 10 Min.)

### 2.4 Tagesplan-Ansicht
- Timeline-Darstellung des gesamten Tages
- Pro Segment: Abfahrt, Umsteige-Details, Ankunft, Puffer
- Farbcodierung: 🟢 genug Zeit, 🟡 knapp, 🔴 unmöglich
- Warnungen bei unrealistischen Verbindungen

---

## 3. Technische Architektur

### 3.1 Tech-Stack

| Komponente      | Technologie                     | Begründung                                         |
|-----------------|----------------------------------|-----------------------------------------------------|
| Runtime         | **Deno 2**                      | Moderner, sicherer, native TS-Unterstützung, npm-kompatibel |
| Framework       | **React + Vite + TypeScript**   | Schnell, modern, kein SSR nötig (reine Client-App) |
| Styling         | **Tailwind CSS**                | Utility-first, schnelles Prototyping                |
| iCal-Parsing    | **ical.js** (npm: `ical.js`)   | Robuster iCal-Parser, MIT License                   |
| CSV-Parsing     | **PapaParse**                   | Standard für CSV im Browser                         |
| ÖV-API          | **transport.opendata.ch**       | Kostenlos, kein API-Key, Schweiz-spezifisch         |
| Geocoding       | **transport.opendata.ch/locations** | Ortssuche inkl. Haltestellen direkt via ÖV-API |
| State Mgmt      | **Zustand**                     | Leichtgewichtig, reicht für diese App               |
| Datum/Zeit      | **date-fns**                    | Lightweight Alternative zu moment.js                |
| Routing (App)   | **React Router**                | Standard SPA-Routing                                |
| PWA             | **vite-plugin-pwa**             | Service Worker, Manifest, Offline-Cache             |

### 3.1.1 Portabilitätsstrategie: PWA → Capacitor → Android

Die App wird von Anfang an als **Progressive Web App (PWA)** gebaut:
- Installierbar auf Android (und iOS) direkt aus dem Browser
- Offline-fähig via Service Worker (gecachte Verbindungen)
- Responsives Mobile-First-Design

**Upgrade-Pfad für native Android-App:**
Wenn später native Features benötigt werden (Push-Notifications, Kalender-Sync, etc.),
kann die bestehende Web-App mit **Capacitor** in eine native Android-Shell gewickelt werden:
`npx cap add android` — fertig. Kein Rewrite nötig.

**Architektur-Regel:** Die gesamte Business-Logik in `src/lib/` ist framework-agnostisch —
kein React-Import, keine DOM-Abhängigkeit. Dadurch ist sie wiederverwendbar in jedem Kontext
(React Native, Capacitor, CLI-Tool, etc.).

### 3.2 Ordnerstruktur

```
pendli/
├── public/
│   ├── favicon.svg
│   ├── icons/                     # PWA Icons (192x192, 512x512)
│   └── manifest.webmanifest       # PWA Manifest (wird von vite-plugin-pwa generiert)
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── upload/
│   │   │   ├── FileUploader.tsx        # Drag & Drop iCal/CSV
│   │   │   ├── CalendarPreview.tsx      # Vorschau der erkannten Termine
│   │   │   └── ManualEntryForm.tsx      # Manuelle Termin-Eingabe
│   │   ├── settings/
│   │   │   ├── AddressConfig.tsx        # Home/Work Adressen
│   │   │   ├── WorkSchedule.tsx         # Arbeitszeiten
│   │   │   └── Preferences.tsx          # Pufferzeit etc.
│   │   ├── planner/
│   │   │   ├── DayTimeline.tsx          # Haupt-Timeline-View
│   │   │   ├── RouteSegment.tsx         # Einzelne Verbindung
│   │   │   ├── AppointmentCard.tsx      # Termin-Karte
│   │   │   └── ConnectionDetails.tsx    # Umsteige-Details
│   │   └── common/
│   │       ├── LocationSearch.tsx       # Autocomplete mit ÖV-API
│   │       ├── TimeInput.tsx
│   │       └── StatusBadge.tsx
│   ├── lib/                            # ⚠️ Framework-agnostisch! Kein React hier.
│   │   ├── parser/
│   │   │   ├── ical-parser.ts           # iCal → Appointment[]
│   │   │   └── csv-parser.ts            # CSV → Appointment[]
│   │   ├── api/
│   │   │   ├── transport-api.ts         # Swiss Transport API Client
│   │   │   └── types.ts                 # API Response Types
│   │   ├── planner/
│   │   │   ├── route-calculator.ts      # Kernlogik: Optimale Routen
│   │   │   ├── base-location.ts         # Home/Work-Logik
│   │   │   └── time-utils.ts            # Zeitberechnungen
│   │   └── store/
│   │       └── app-store.ts             # Zustand Store
│   ├── types/
│   │   └── index.ts                     # Shared Types
│   ├── test/
│   │   ├── fixtures/
│   │   │   ├── sample.ics               # Test iCal-Datei
│   │   │   └── sample.csv               # Test CSV-Datei
│   │   ├── parser.test.ts
│   │   ├── route-calculator.test.ts
│   │   └── base-location.test.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── deno.json                            # Deno-Config (ersetzt package.json + tsconfig)
├── vite.config.ts
├── tailwind.config.ts
├── README.md
└── LICENSE
```

### 3.3 Datenmodell (TypeScript Types)

```typescript
// Kern-Typen
interface Appointment {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string;           // Rohtext aus Kalender
  resolvedLocation?: Location; // Nach Geocoding
}

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  station?: string;           // Nächste ÖV-Haltestelle
}

interface UserConfig {
  homeAddress: Location;
  workAddress: Location;
  workSchedule: WorkSchedule;
  bufferMinutes: number;      // Puffer vor Terminen (default: 10)
}

interface WorkSchedule {
  days: number[];             // 0=So, 1=Mo, ..., 6=Sa
  startTime: string;          // "08:00"
  endTime: string;            // "17:00"
}

interface RouteSegment {
  from: Location;
  to: Location;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;           // Minuten
  connections: Connection[];
  status: 'ok' | 'tight' | 'impossible';
}

interface Connection {
  departure: string;          // Haltestellenname
  arrival: string;
  departureTime: Date;
  arrivalTime: Date;
  line: string;               // z.B. "S3", "IR 36", "Bus 31"
  platform?: string;
  operator?: string;
}

interface DayPlan {
  date: Date;
  segments: RouteSegment[];
  appointments: Appointment[];
  warnings: string[];
}
```

### 3.4 API-Integration

**Swiss Transport API** (https://transport.opendata.ch):

```
# Ortssuche (für Autocomplete & Geocoding)
GET https://transport.opendata.ch/v1/locations?query=ETH+Zürich

# Verbindung suchen
GET https://transport.opendata.ch/v1/connections?from=Zürich+HB&to=Bern&date=2026-03-18&time=08:30

# Stationsboard (optional, für Live-Daten)
GET https://transport.opendata.ch/v1/stationboard?station=Zürich+HB&limit=5
```

**Wichtig:** Die API ist kostenlos, braucht keinen Key, hat aber Rate-Limits. Requests sollten gecached und gebatched werden.

---

## 4. Algorithmus: Route-Berechnung

### 4.1 Ablauf

```
1. Termine nach Startzeit sortieren
2. Für jeden Übergang:
   a. Bestimme Ausgangsort:
      - Vor erstem Termin → Home
      - Zwischen Terminen → vorheriger Terminort ODER
        Base-Location (Home/Work) falls Zeitlücke > 1h
      - Nach letztem Termin → zurück zu Home
   b. Bestimme Abfahrtszeit:
      - Ankunftszeit des nächsten Termins MINUS Pufferzeit
      - = "späteste Ankunft", API gibt passende Verbindung
   c. Frage Swiss Transport API ab
   d. Bewerte Verbindung:
      - >= 15 Min. Puffer → 🟢 ok
      - 5–15 Min. → 🟡 tight
      - < 5 Min. oder keine Verbindung → 🔴 impossible
3. Erstelle DayPlan mit allen Segmenten
```

### 4.2 Base-Location-Logik (Pseudocode)

```typescript
function getBaseLocation(time: Date, config: UserConfig): Location {
  const day = time.getDay();
  const timeStr = format(time, 'HH:mm');

  if (config.workSchedule.days.includes(day)
      && timeStr >= config.workSchedule.startTime
      && timeStr <= config.workSchedule.endTime) {
    return config.workAddress;
  }
  return config.homeAddress;
}
```

---

## 5. Test-Daten (Fake)

### 5.1 User-Konfiguration
- **Privatadresse:** Altstetten, Zürich (nahe Bhf. Zürich Altstetten) → `47.3914, 8.4889`
- **Arbeitsadresse:** ETH Zürich, Rämistrasse 101 → `47.3763, 8.5483`
- **Arbeitszeiten:** Mo–Fr, 08:00–17:00
- **Puffer:** 10 Minuten

### 5.2 Test-Kalendertag (Mittwoch, 18.03.2026)

| Zeit        | Titel                           | Ort                                    |
|-------------|---------------------------------|----------------------------------------|
| 09:00–10:00 | Team Standup                    | ETH Zürich (= Arbeitsort, kein Travel) |
| 11:30–12:30 | Kundentermin                    | Paradeplatz, Zürich                    |
| 14:00–15:00 | Zahnarzt                        | Bern, Marktgasse 12                    |
| 17:30–18:30 | Fussball-Training               | Sportanlage Buchlern, Zürich           |
| 20:00–22:00 | Kino mit Freunden               | Arena Cinemas, Zürich Sihlcity         |

### 5.3 Erwartete Routenplanung

```
07:15  🏠 Ab Altstetten → ETH Zürich
07:45  🏢 Ankunft ETH (15 Min. Puffer vor Standup)

09:00  📅 Team Standup (ETH)
10:00  Ende

11:00  🏢 Ab ETH → Paradeplatz
11:20  📍 Ankunft Paradeplatz (10 Min. Puffer)

11:30  📅 Kundentermin (Paradeplatz)
12:30  Ende → Zurück zu ETH (Arbeitszeit)

13:00  🏢 Ab ETH → Bern
13:50  📍 Ankunft Bern (10 Min. Puffer)

14:00  📅 Zahnarzt (Bern)
15:00  Ende → Zurück Richtung Zürich (Arbeitszeit endet um 17:00)

17:00  ⚽ Ab Work/unterwegs → Sportanlage Buchlern
17:20  📍 Ankunft Buchlern (10 Min. Puffer)

17:30  📅 Fussball-Training
18:30  Ende

19:30  ⚽ Ab Buchlern → Sihlcity
19:50  📍 Ankunft Sihlcity (10 Min. Puffer)

20:00  📅 Kino
22:00  Ende → Ab Sihlcity → Altstetten
22:15  🏠 Ankunft zuhause
```

### 5.4 Sample .ics-Datei

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//pendli//test//DE
BEGIN:VEVENT
DTSTART:20260318T090000
DTEND:20260318T100000
SUMMARY:Team Standup
LOCATION:ETH Zürich, Rämistrasse 101, 8092 Zürich
END:VEVENT
BEGIN:VEVENT
DTSTART:20260318T113000
DTEND:20260318T123000
SUMMARY:Kundentermin
LOCATION:Paradeplatz, 8001 Zürich
END:VEVENT
BEGIN:VEVENT
DTSTART:20260318T140000
DTEND:20260318T150000
SUMMARY:Zahnarzt
LOCATION:Marktgasse 12, 3011 Bern
END:VEVENT
BEGIN:VEVENT
DTSTART:20260318T173000
DTEND:20260318T183000
SUMMARY:Fussball-Training
LOCATION:Sportanlage Buchlern, Zürich
END:VEVENT
BEGIN:VEVENT
DTSTART:20260318T200000
DTEND:20260318T220000
SUMMARY:Kino mit Freunden
LOCATION:Arena Cinemas Sihlcity, Zürich
END:VEVENT
END:VCALENDAR
```

---

## 6. UX / Design-Richtung

### 6.1 Ästhetik
- **Stil:** Swiss Design / International Typographic Style — sauber, grid-basiert, confident
- **Primärfarben:** SBB-Rot (#EB0000) als Akzent, dunkles Anthrazit (#1A1A2E), warmes Weiss (#FAFAF8)
- **Typografie:** "Söhne" oder "Geist" als Display-Font, "IBM Plex Sans" als Body
- **Ikonografie:** Minimalistisch, linienbasiert (Lucide Icons)
- **Layout:** Vertikale Timeline als Herzstück, Cards für Termine, Inline-Verbindungsdetails

### 6.2 User Flow

```
┌─────────────────────────────────────────────────┐
│  1. SETUP (einmalig)                            │
│  ├── Privatadresse eingeben (Autocomplete)      │
│  ├── Arbeitsadresse eingeben                    │
│  └── Arbeitszeiten festlegen                    │
├─────────────────────────────────────────────────┤
│  2. IMPORT                                      │
│  ├── Drag & Drop .ics / .csv                    │
│  ├── Termine werden erkannt und angezeigt       │
│  └── Manuell korrigieren / hinzufügen           │
├─────────────────────────────────────────────────┤
│  3. PLANEN                                      │
│  ├── "Route berechnen" klicken                  │
│  ├── API-Calls werden gemacht                   │
│  └── Timeline wird generiert                    │
├─────────────────────────────────────────────────┤
│  4. ERGEBNIS                                    │
│  ├── Tages-Timeline mit allen Verbindungen      │
│  ├── Farbcodierte Status-Badges                 │
│  ├── Klick auf Segment → Details (Gleis, Linie) │
│  └── Export als PDF / Textübersicht             │
└─────────────────────────────────────────────────┘
```

---

## 7. Nicht im Scope (V1)

- Kein User-Account / Auth
- Kein Backend (reine Client-App)
- Keine Echtzeit-Verspätungen
- Kein Multi-Day-Planner (nur Einzeltag)
- Kein Routing-Optimierung (Reihenfolge ändern)
- Keine Kosten-Berechnung
- Keine native Android-App (PWA reicht für V1)

---

## 8. Erweiterungen (V2+)

- **Capacitor-Wrapper für Android** (native App aus bestehendem Code, `npx cap add android`)
- Push-Notifications bei Verspätungen (via Capacitor)
- Native Kalender-Sync (via Capacitor Calendar Plugin)
- Multi-Tag-Ansicht (Wochenübersicht)
- Google Calendar API-Anbindung (direkt, ohne Export)
- Zwischenstopps vorschlagen (z.B. "Mittagessen auf dem Weg")
- SBB-Ticket-Deeplinks
- Verspätungs-Alerts via Stationboard-API
- Halbtax/GA-Berücksichtigung für Kosten

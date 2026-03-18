# Claude Code Anweisung: pendli implementieren

> **Kontext:** Du implementierst "pendli" — eine Schweizer ÖV-Tagesplaner-Webapp. Der User lädt seinen Kalender hoch (.ics oder .csv), gibt Arbeits-/Privatadresse und Arbeitszeiten an, und bekommt eine optimierte Tagesroute mit allen ÖV-Verbindungen berechnet.
>
> **Runtime:** Deno 2 (nicht Node/npm). Verwende `deno task` statt `npm run`.
>
> **Architektur:** PWA-first (installierbar auf Android). Alle Business-Logik in `src/lib/` MUSS framework-agnostisch sein (kein React, kein DOM) — vorbereitet für spätere Capacitor-Migration zu nativer Android-App.
>
> **Lies zuerst `pendli-concept.md` im selben Verzeichnis** — dort findest du das vollständige Konzept mit Datenmodell, Algorithmus, Testdaten und Design-Richtung.

---

## Phase 0: Projekt-Setup

### Deno + Vite + React

```bash
# Projekt erstellen mit Deno
deno run -A npm:create-vite@latest pendli -- --template react-ts
cd pendli

# Dependencies installieren
deno install

# Zusätzliche Packages
deno install npm:zustand npm:date-fns npm:ical.js npm:papaparse npm:uuid
deno install -D npm:@tailwindcss/vite npm:@types/papaparse npm:@types/uuid
deno install -D npm:vite-plugin-pwa npm:workbox-precaching
```

### `deno.json` konfigurieren:
```json
{
  "tasks": {
    "dev": "deno run -A npm:vite",
    "build": "deno run -A npm:vite build",
    "preview": "deno run -A npm:vite preview",
    "test": "deno test src/"
  },
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "strict": true
  },
  "imports": {
    "react": "npm:react@^19",
    "react-dom": "npm:react-dom@^19",
    "react-router-dom": "npm:react-router-dom@^7"
  },
  "nodeModulesDir": "auto"
}
```

### Vite-Config mit PWA + Tailwind:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'pendli — ÖV-Tagesplaner',
        short_name: 'pendli',
        description: 'Dein smarter ÖV-Tagesplaner für die Schweiz',
        theme_color: '#1A1A2E',
        background_color: '#FAFAF8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/transport\.opendata\.ch\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'transport-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 } // 5 Min. Cache
            }
          }
        ]
      }
    })
  ]
});
```

**Tailwind CSS:** In `src/index.css`:
```css
@import "tailwindcss";
```

### PWA Icons erstellen:
Erstelle simple SVG-basierte Icons (Zug-Symbol in SBB-Rot) und konvertiere zu PNG in 192x192 und 512x512.

Initialen Dev-Server starten mit `deno task dev` und sicherstellen, dass alles läuft, bevor du weitermachst.

### WICHTIG — Portabilitätsregel:
**Alles in `src/lib/` MUSS framework-agnostisch sein!**
- Kein `import` von React, ReactDOM, oder React-Hooks
- Kein DOM-Zugriff (kein `document`, `window`, etc.)
- Nur pure TypeScript-Funktionen mit klar definierten Input/Output-Types
- Das ermöglicht spätere Wiederverwendung in Capacitor, React Native, oder sogar einem CLI-Tool

---

## Phase 1: Types & Datenmodell

Erstelle `src/types/index.ts` mit folgenden Typen (exakt wie im Konzept spezifiziert):

```typescript
export interface Appointment {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string;
  resolvedLocation?: ResolvedLocation;
}

export interface ResolvedLocation {
  name: string;
  latitude: number;
  longitude: number;
  station?: string;
}

export interface UserConfig {
  homeAddress: ResolvedLocation;
  workAddress: ResolvedLocation;
  workSchedule: WorkSchedule;
  bufferMinutes: number;
}

export interface WorkSchedule {
  days: number[];        // 0=So, 1=Mo, ..., 6=Sa
  startTime: string;     // "08:00"
  endTime: string;       // "17:00"
}

export interface RouteSegment {
  from: ResolvedLocation;
  to: ResolvedLocation;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  connections: Connection[];
  status: 'ok' | 'tight' | 'impossible';
}

export interface Connection {
  departure: string;
  arrival: string;
  departureTime: Date;
  arrivalTime: Date;
  line: string;
  platform?: string;
  operator?: string;
}

export interface DayPlan {
  date: Date;
  segments: RouteSegment[];
  appointments: Appointment[];
  warnings: string[];
}
```

---

## Phase 2: Swiss Transport API Client

> ⚠️ **Portabilitätsregel:** Dieser Code lebt in `src/lib/` — KEIN React, KEIN DOM. Pure TypeScript mit `fetch()`.

Erstelle `src/lib/api/transport-api.ts`:

### Endpunkte:

1. **Ortssuche:** `GET https://transport.opendata.ch/v1/locations?query={query}&type=all`
   - Für Autocomplete in der Adress-Suche
   - Gibt Stationen und Adressen zurück
   - Response: `{ stations: [{ name, coordinate: { x, y }, id }] }`

2. **Verbindungen:** `GET https://transport.opendata.ch/v1/connections?from={from}&to={to}&date={YYYY-MM-DD}&time={HH:MM}&isArrivalTime=1`
   - **WICHTIG:** `isArrivalTime=1` verwenden! Wir wollen Verbindungen, die VOR dem Termin ankommen.
   - Response enthält `connections[].sections[]` mit Details zu jeder Etappe

### Implementierung:

- Debounced Location-Search (300ms) für Autocomplete
- Connection-Cache (gleiche Route + Zeitfenster → Cache hit)
- Error-Handling: API kann 429 (Rate Limit) returnen → Retry mit Backoff
- Response-Mapping auf unsere `Connection`-Types

### Rate-Limiting beachten:
- Maximal 3 parallele Requests
- 500ms Delay zwischen Requests
- Simple Queue implementieren

---

## Phase 3: Parser (iCal + CSV)

> ⚠️ **Portabilitätsregel:** Parser sind framework-agnostisch. Nur `string` rein, `Appointment[]` raus. Kein DOM.

### `src/lib/parser/ical-parser.ts`
- Nutze `ical.js` (ICAL) zum Parsen
- Extrahiere: SUMMARY → title, DTSTART/DTEND → startTime/endTime, LOCATION → location
- Filtere Events ohne LOCATION raus (mit Warning)
- Gruppiere nach Tag (für Tages-Ansicht)

```typescript
import ICAL from 'ical.js';

export function parseICalFile(content: string): Appointment[] {
  const jcal = ICAL.parse(content);
  const comp = new ICAL.Component(jcal);
  const events = comp.getAllSubcomponents('vevent');
  // ... map to Appointment[]
}
```

### `src/lib/parser/csv-parser.ts`
- Nutze PapaParse
- Erwartete Spalten: `Datum`, `Startzeit`, `Endzeit`, `Titel`, `Ort`
- Flexible Header-Erkennung (case-insensitive, auch englische Varianten)
- Validation: Fehlerhafte Zeilen loggen, valide zurückgeben

---

## Phase 4: Kernlogik — Route-Calculator

> ⚠️ **Portabilitätsregel:** Das Herz der App — MUSS framework-agnostisch bleiben. Nur Types + API-Client als Dependencies.

### `src/lib/planner/base-location.ts`

```typescript
export function getBaseLocation(time: Date, config: UserConfig): ResolvedLocation {
  const day = time.getDay();
  const timeStr = format(time, 'HH:mm');
  const isWorkDay = config.workSchedule.days.includes(day);
  const isWorkTime = timeStr >= config.workSchedule.startTime
                   && timeStr <= config.workSchedule.endTime;

  return (isWorkDay && isWorkTime) ? config.workAddress : config.homeAddress;
}
```

### `src/lib/planner/route-calculator.ts`

**Algorithmus:**

```typescript
export async function calculateDayPlan(
  appointments: Appointment[],
  config: UserConfig
): Promise<DayPlan> {

  // 1. Sortiere Termine chronologisch
  const sorted = [...appointments].sort((a, b) =>
    a.startTime.getTime() - b.startTime.getTime()
  );

  // 2. Resolve alle Locations via Transport API
  for (const apt of sorted) {
    if (!apt.resolvedLocation) {
      apt.resolvedLocation = await resolveLocation(apt.location);
    }
  }

  // 3. Baue Segment-Liste
  const segments: RouteSegment[] = [];
  const warnings: string[] = [];

  // Segment 0: Home → erster Termin
  // (nur wenn erster Termin NICHT am Arbeitsort UND nicht zuhause)
  segments.push(await calculateSegment(
    config.homeAddress,
    sorted[0].resolvedLocation!,
    sorted[0].startTime,
    config.bufferMinutes
  ));

  // Segmente zwischen Terminen
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // Bestimme Ausgangsort
    let origin: ResolvedLocation;
    const gapMinutes = differenceInMinutes(next.startTime, current.endTime);

    if (gapMinutes > 60) {
      // Grosse Lücke → Zurück zur Base-Location, dann weiter
      const baseLocation = getBaseLocation(current.endTime, config);
      // Segment: Termin → Base
      segments.push(await calculateSegment(
        current.resolvedLocation!,
        baseLocation,
        current.endTime,
        0  // kein Puffer nötig
      ));
      origin = baseLocation;
    } else {
      // Direkt zum nächsten Termin
      origin = current.resolvedLocation!;
    }

    // Segment: Origin → nächster Termin
    const segment = await calculateSegment(
      origin,
      next.resolvedLocation!,
      next.startTime,
      config.bufferMinutes
    );
    segments.push(segment);

    if (segment.status === 'impossible') {
      warnings.push(`Verbindung zu "${next.title}" ist zeitlich nicht machbar!`);
    }
  }

  // Letztes Segment: letzter Termin → Home
  const lastApt = sorted[sorted.length - 1];
  segments.push(await calculateSegment(
    lastApt.resolvedLocation!,
    config.homeAddress,
    lastApt.endTime,
    0  // Kein Puffer nach Hause
  ));

  return { date: sorted[0].startTime, segments, appointments: sorted, warnings };
}
```

### `calculateSegment` Funktion:
- Ruft Transport API auf mit `isArrivalTime=1` (für Hinreise) oder `isArrivalTime=0` (für Heimreise)
- Mappt die API-Response auf `RouteSegment`
- Bewertet Status basierend auf verfügbarer Pufferzeit

---

## Phase 5: Zustand Store

### `src/lib/store/app-store.ts`

```typescript
import { create } from 'zustand';

interface AppState {
  // Config
  config: UserConfig | null;
  setConfig: (config: UserConfig) => void;

  // Appointments
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  removeAppointment: (id: string) => void;

  // Day Plan
  dayPlan: DayPlan | null;
  isCalculating: boolean;
  calculatePlan: () => Promise<void>;

  // UI State
  currentStep: 'setup' | 'import' | 'plan' | 'result';
  setStep: (step: AppState['currentStep']) => void;
}
```

**Default-Werte für Testdaten** vorbelegen:
- Home: Zürich Altstetten (47.3914, 8.4889), Station: "Zürich Altstetten"
- Work: ETH Zürich (47.3763, 8.5483), Station: "ETH/Universitätsspital"
- Arbeitszeiten: Mo–Fr, 08:00–17:00
- Puffer: 10 Minuten

---

## Phase 6: UI-Komponenten

### Design-Richtlinien

**WICHTIG — Swiss Design Ästhetik:**

- **Schriften:** Lade via Google Fonts: `DM Sans` (Body) und `Space Mono` (Zeiten/Codes). Falls nicht verfügbar: `JetBrains Mono` für Mono.
- **Farben als CSS Custom Properties:**
  ```css
  :root {
    --color-sbb-red: #EB0000;
    --color-anthracite: #1A1A2E;
    --color-warm-white: #FAFAF8;
    --color-slate: #64748B;
    --color-success: #059669;
    --color-warning: #D97706;
    --color-danger: #DC2626;
  }
  ```
- **Status-Farben:** Grün (#059669), Gelb (#D97706), Rot (#DC2626)
- **Kein generisches UI** — Dieses Tool soll sich anfühlen wie ein durchdachtes Schweizer Produkt
- **Timeline ist das Herzstück** — grosszügiger Platz, klare vertikale Linie, Zeitmarken links

### Komponenten-Details

#### `FileUploader.tsx`
- Drag & Drop Zone mit klarem visuellen Feedback
- Akzeptiert `.ics` und `.csv`
- Zeigt Dateiname und Parsing-Status
- "Oder Testdaten laden"-Button für Quick Demo

#### `LocationSearch.tsx`
- Input mit Autocomplete-Dropdown
- Debounced API-Calls an transport.opendata.ch/v1/locations
- Zeigt Stations-Icon vs. Adress-Icon
- Speichert ausgewählte `ResolvedLocation`

#### `DayTimeline.tsx` — HAUPT-KOMPONENTE
- Vertikale Timeline mit Zeitachse links (06:00–24:00)
- Termine als Cards auf der Timeline
- Verbindungs-Segmente zwischen den Cards mit:
  - Abfahrtszeit & Abfahrtsort
  - Linie(n) und Umsteigeorte
  - Ankunftszeit
  - Status-Badge (🟢🟡🔴)
- Klick auf Segment → expandiert zu `ConnectionDetails`
- Grauer Bereich für Arbeitszeit-Fenster
- Gestrichelte Linie für "Rückkehr zur Base-Location"

#### `RouteSegment.tsx`
- Kompakte Darstellung: `🚆 S3 Altstetten → HB (4 Min.) → 🚋 Tram 6 → ETH (8 Min.)`
- Expandierbar für Gleis-/Plattform-Infos
- Farbiger Linken-Rand basierend auf Status

#### `AppointmentCard.tsx`
- Titel, Zeit, Ort
- Icon basierend auf Kategorie (falls erkennbar)
- Subtiler Schatten, abgerundete Ecken

### App-Layout / Pages

Die App ist ein **Multi-Step Wizard** mit 4 Schritten:

**Step 1 — Setup:**
- Privatadresse (LocationSearch)
- Arbeitsadresse (LocationSearch)
- Arbeitszeiten (Tage-Checkboxen + Zeit-Inputs)
- Pufferzeit (Slider, 5–30 Min.)
- "Weiter"-Button
- "Demo-Daten laden"-Button, der alles vorausfüllt

**Step 2 — Import:**
- FileUploader (Drag & Drop)
- CalendarPreview (Tabelle der erkannten Termine)
- Manuell Termin hinzufügen (Formular)
- Termine löschen / bearbeiten
- "Route berechnen"-Button

**Step 3 — Berechnung:**
- Loading-Animation (Zug-Animation oder Fortschrittsbalken)
- Schritt-für-Schritt-Anzeige: "Suche Verbindung Altstetten → ETH..."
- Fehler-Handling falls API nicht erreichbar

**Step 4 — Ergebnis:**
- DayTimeline (Haupt-Ansicht)
- Warnings-Banner oben (falls vorhanden)
- "Neuen Tag planen"-Button
- "Einstellungen ändern"-Button

---

## Phase 7: Test-Fixtures

### `src/test/fixtures/sample.ics`
Verwende die iCal-Datei aus dem Konzeptdokument (Abschnitt 5.4).

### `src/test/fixtures/sample.csv`
```csv
Datum,Startzeit,Endzeit,Titel,Ort
2026-03-18,09:00,10:00,Team Standup,"ETH Zürich, Rämistrasse 101, 8092 Zürich"
2026-03-18,11:30,12:30,Kundentermin,"Paradeplatz, 8001 Zürich"
2026-03-18,14:00,15:00,Zahnarzt,"Marktgasse 12, 3011 Bern"
2026-03-18,17:30,18:30,Fussball-Training,"Sportanlage Buchlern, Zürich"
2026-03-18,20:00,22:00,Kino mit Freunden,"Arena Cinemas Sihlcity, Zürich"
```

### "Demo laden"-Funktion
Beim Klick auf "Demo-Daten laden":
1. Config wird mit Altstetten/ETH vorausgefüllt
2. Die 5 Test-Termine werden geladen
3. User kann direkt zu Schritt 4 springen

---

## Phase 8: Polishing, PWA & Edge Cases

### PWA-Anforderungen
- Service Worker cached die App-Shell + letzte API-Responses
- `manifest.webmanifest` mit korrekten Icons, Theme-Color, Display-Mode
- Offline-Fallback: Zeige gecachten letzten Tagesplan wenn offline
- "App installieren"-Banner/Hint bei erstem Besuch auf Mobile
- Meta-Tags für PWA: `<meta name="theme-color" content="#1A1A2E">`, Apple-Touch-Icons

### Error-Handling
- API nicht erreichbar → Freundliche Fehlermeldung + Retry-Button
- Location nicht auflösbar → Warnung + manuelle Eingabe ermöglichen
- iCal-Parsing-Fehler → Zeige, welche Events fehlerhaft sind
- Keine Verbindung möglich → "Keine ÖV-Verbindung gefunden, evtl. Taxi?"

### Performance
- Locations-Cache im Store (gleicher Suchtext → gecachtes Ergebnis)
- Connections parallel abrufen (mit Rate-Limit Queue)
- Skeleton-Loading für Timeline während Berechnung

### Responsive Design
- Mobile-First: Timeline muss auf Handy gut funktionieren
- Desktop: Sidebar mit Settings, Hauptbereich mit Timeline
- Breakpoints: sm (640px), md (768px), lg (1024px)

### Accessibility
- Keyboard-navigierbar
- Screen-Reader-Labels für Status-Badges
- Kontrast-Ratio >= 4.5:1

---

## Zusammenfassung der Prioritäten

| Priorität | Was                                        |
|-----------|--------------------------------------------|
| P0        | Types, API-Client, Parser, Route-Calculator |
| P0        | DayTimeline + RouteSegment Komponenten      |
| P0        | Demo-Daten (sofort funktionsfähige Demo)    |
| P1        | Setup-Wizard (Adress-Config, Arbeitszeiten) |
| P1        | File-Upload (Drag & Drop)                   |
| P1        | LocationSearch mit Autocomplete              |
| P1        | PWA: Manifest, Service Worker, Icons         |
| P2        | Polish: Animationen, Loading-States          |
| P2        | Error-Handling für alle Edge Cases           |
| P2        | Responsive Design (Mobile-First)             |
| P3        | PDF-Export                                   |
| P3        | Offline-Modus (gecachte Verbindungen)        |

---

## Checkliste vor "Done"

- [ ] `deno task dev` startet ohne Fehler
- [ ] PWA-Manifest wird korrekt geladen (Chrome DevTools → Application → Manifest)
- [ ] Service Worker registriert sich (Chrome DevTools → Application → Service Workers)
- [ ] App ist auf Android via "Zum Startbildschirm hinzufügen" installierbar
- [ ] Demo-Daten laden → Timeline wird angezeigt mit echten ÖV-Verbindungen
- [ ] iCal-Upload funktioniert mit der sample.ics
- [ ] CSV-Upload funktioniert mit der sample.csv
- [ ] Adress-Autocomplete funktioniert (Transport API)
- [ ] Arbeitszeiten-Änderung beeinflusst Base-Location korrekt
- [ ] Status-Badges (🟢🟡🔴) werden korrekt angezeigt
- [ ] Mobile-Ansicht ist benutzbar (responsiv ab 360px Breite)
- [ ] `src/lib/` enthält KEINEN React-Import (framework-agnostisch!)
- [ ] Keine Console-Errors
- [ ] TypeScript kompiliert ohne Fehler (`deno task build`)
- [ ] README.md mit Setup-Anleitung vorhanden (Deno-basiert)

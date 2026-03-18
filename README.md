# pendli — ÖV-Tagesplaner für die Schweiz

> *"Dein Tag. Deine Termine. Deine optimale Route."*

**pendli** (Schweizerdeutsch für "kleiner Pendler") berechnet dir die optimale ÖV-Route durch deinen Tag. Kalender hochladen, Arbeitszeiten konfigurieren, fertig.

## Features

- **Kalender-Import** — Drag & Drop von `.ics` (Google Calendar, Outlook, Apple) oder `.csv`
- **Automatische Routen** — Optimale ÖV-Verbindungen via [Swiss Transport API](https://transport.opendata.ch)
- **Intelligente Basis-Logik** — Erkennt automatisch ob du von Zuhause oder vom Arbeitsort startest
- **Tages-Timeline** — Visueller Tagesplan mit allen Verbindungen, Umsteige-Details und Pufferzeiten
- **Status-Bewertung** — Grün/Gelb/Rot-Ampel für jede Verbindung
- **SBB Deep-Links** — Direkt zur Verbindung auf sbb.ch
- **Dark Mode** — Automatisch oder manuell umschaltbar
- **PWA** — Installierbar auf Android/iOS direkt aus dem Browser

## Tech Stack

| Komponente | Technologie |
|-----------|-------------|
| Runtime | Deno 2 |
| Framework | React 19 + Vite 8 + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| ÖV-Daten | [transport.opendata.ch](https://transport.opendata.ch) (kostenlos, kein API-Key) |
| Kalender-Parsing | ical.js + PapaParse |
| PWA | vite-plugin-pwa + Workbox |

## Schnellstart

```bash
# Deno 2 installieren (falls nicht vorhanden)
curl -fsSL https://deno.land/install.sh | sh

# Dependencies installieren
deno install

# Dev-Server starten
deno task dev

# Tests laufen lassen
deno test src/

# Production Build
deno task build
```

## Architektur

```
src/
├── lib/                    # Framework-agnostisch (kein React!)
│   ├── api/               # Swiss Transport API Client
│   ├── parser/            # iCal & CSV Parser
│   ├── planner/           # Routenberechnung & Zeitlogik
│   └── store/             # Zustand State Management
├── components/            # React UI-Komponenten
│   ├── layout/           # Header, Footer, Layout
│   ├── settings/         # Adress-Config, Arbeitszeiten
│   ├── upload/           # File-Upload, Kalender-Vorschau
│   ├── planner/          # Timeline, Verbindungs-Details
│   └── common/           # LocationSearch, StatusBadge
├── types/                # TypeScript Interfaces
└── test/                 # 207 Deno-Tests
```

**Portabilitätsregel:** Alles in `src/lib/` ist framework-agnostisch — kein React, kein DOM. Vorbereitet für spätere Capacitor-Migration zu nativer Android-App.

## Routen-Algorithmus

1. Termine nach Startzeit sortieren
2. Für jeden Übergang: Ausgangsort bestimmen (Home/Work basierend auf Arbeitszeit)
3. **Direkt vs. Rückkehr zur Basis** — Beide Strategien werden berechnet, gewählt wird die sinnvollere (min. 20 Min. Aufenthalt an der Basis, sonst direkt)
4. **Optimale Verbindung** — Spätestmögliche Abfahrt die rechtzeitig ankommt (nicht die erste!)
5. **Früheste Abfahrt beachtet** — Keine Verbindungen vor Terminende
6. Status-Bewertung: ≥15 Min. Puffer = OK, 5–15 Min. = Knapp, <5 Min. = Kritisch

## Testdaten

Die App enthält Demo-Daten (Button "Demo laden") mit 5 Terminen in Zürich:

| Zeit | Termin | Ort |
|------|--------|-----|
| 09:00–10:00 | Team Standup | ETH Zürich |
| 11:30–12:30 | Kundentermin | Paradeplatz, Zürich |
| 14:00–15:00 | Zahnarzt | Marktgasse, Bern |
| 17:30–18:30 | Fussball-Training | Sportanlage Buchlern |
| 20:00–22:00 | Kino | Arena Cinemas Sihlcity |

## Tests

207 Tests in 5 Dateien:

```bash
deno test src/test/
```

- `time-utils.test.ts` (64) — Datums-/Zeitformatierung, Grenzen, Invalid Date
- `base-location.test.ts` (30) — Arbeitszeit-Logik, Wochenende, Custom-Schedules
- `csv-parser.test.ts` (41) — Header-Erkennung, Datumsformate, BOM, Stress-Tests
- `ical-parser.test.ts` (26) — Events, Unicode, VTODO, Fehlerbehandlung
- `route-calculator.test.ts` (46) — Standort-Vergleich, Algorithmus-Logik, Overlap-Detection

## Lizenz

MIT

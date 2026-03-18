# pendli — Swiss Public Transport Day Planner

> *"Your day. Your appointments. Your optimal route."*

**pendli** (Swiss German diminutive of "commuter") calculates the optimal public transport route through your day. Upload your calendar, configure work hours — done.

## Features

- **Calendar import** — Drag & drop `.ics` (Google Calendar, Outlook, Apple) or `.csv`
- **Automatic routing** — Optimal connections via [Swiss Transport API](https://transport.opendata.ch)
- **Smart base logic** — Automatically determines whether you start from home or work
- **Day timeline** — Visual plan with all connections, transfers, walking segments, and buffer times
- **Status indicators** — Green/yellow/red for each connection
- **SBB deep links** — Direct link to the connection on sbb.ch
- **Share Target** — Receive appointments via Android share sheet
- **Export** — Share as `.ics` (with travel events) or text (WhatsApp, Telegram)
- **Dark mode** — Midnight Blue theme, auto-detects system preference
- **PWA** — Installable on Android/iOS from the browser

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Deno 2 |
| Framework | React 19, TypeScript |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Transit data | [transport.opendata.ch](https://transport.opendata.ch) (free, no API key) |
| Calendar parsing | ical.js, PapaParse |
| PWA | vite-plugin-pwa, Workbox |

## Quick Start

```bash
# Install Deno 2 (if not present)
curl -fsSL https://deno.land/install.sh | sh

# Install dependencies
deno install

# Start dev server
deno task dev

# Run tests
deno task test

# Production build
deno task build
```

## Project Structure

```
pendli/
├── src/
│   ├── components/
│   │   ├── common/          # LocationSearch, StatusBadge, TimeInput
│   │   ├── import/          # ImportHandler (Share Target)
│   │   ├── layout/          # Header, Footer, Layout
│   │   ├── planner/         # DayTimeline, RouteSegment, AppointmentCard, PlanActions
│   │   ├── settings/        # AddressConfig, WorkSchedule, Preferences
│   │   └── upload/          # FileUploader, CalendarPreview, ManualEntryForm
│   ├── lib/                 # Framework-agnostic (no React, no DOM)
│   │   ├── api/             # Swiss Transport API client
│   │   ├── export/          # ICS export, text format, Google Calendar URLs
│   │   ├── i18n/            # UI strings (German)
│   │   ├── parser/          # iCal, CSV, and free-text parsers
│   │   ├── planner/         # Route calculation, base location logic, time utils
│   │   └── store/           # Zustand stores (app state, theme)
│   ├── types/               # TypeScript interfaces
│   ├── sw-custom.ts         # Service worker (Share Target POST handler)
│   ├── App.tsx              # Main app with step wizard
│   └── main.tsx             # Entry point
├── test/                    # Deno tests (207 tests)
├── public/                  # Static assets, PWA icons
├── deno.json                # Config, dependencies, version
├── vite.config.ts           # Build config, PWA manifest
└── .github/workflows/       # GitHub Pages deployment
```

**Portability rule:** Everything in `src/lib/` is framework-agnostic — no React imports, no DOM access. Prepared for future Capacitor migration to native Android.

## Routing Algorithm

1. Sort appointments by start time
2. For each transition: determine origin (home/work based on work schedule)
3. **Direct vs. return to base** — Both strategies evaluated; base return only chosen if >= 20 min dwell time at base
4. **Optimal connection** — Latest departure that arrives on time (not the first result)
5. **Earliest departure constraint** — No connections before the previous appointment ends
6. Status: >= 15 min buffer = OK, 5–15 min = tight, < 5 min = critical

## Tests

```bash
deno task test
```

5 test files covering time utils, base location logic, CSV/iCal parsing, and route calculation.

## Deployment

Automatic via GitHub Actions on push to `main`. Deployed to GitHub Pages at:

**https://smilest.github.io/pendli/**

## License

GPLv2 — see [LICENSE](LICENSE)

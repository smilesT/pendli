# pendli — Claude Code Project Notes

## Runtime
- **Deno 2** (not Node/npm). Use `deno task dev`, `deno task build`.
- Deno binary at `/home/user/.deno/bin/deno` — always `export PATH="/home/user/.deno/bin:$PATH"` before running.
- Dev server typically runs on port 5174 (5173 is occupied by another project).

## Dev Workflow
- **ALWAYS reload the browser after making changes**: run `xdg-open http://localhost:5174` to refresh.
- After restarting the dev server, also reload the browser.
- Check the browser console for errors after reloading.

## Architecture
- `src/lib/` is **framework-agnostic** — NO React imports, NO DOM access. Pure TypeScript.
- `src/components/` contains React UI components.
- Business logic: types → api → parser → planner → store → components.

## Key APIs
- Swiss Transport API: `https://transport.opendata.ch/v1/`
  - `locations?query=...&type=all` for location search
  - `connections?from=...&to=...&date=YYYY-MM-DD&time=HH:MM&isArrivalTime=1` for routes
  - Rate limited: max 3 parallel, 500ms delay between requests
  - Full addresses often return empty results — simplify queries (strip PLZ, street numbers)
  - Some results have null coordinates — filter or fallback to city name

## Timetable Deep Links
- Use `https://fahrplan.search.ch/{from}/{to}?date=DD.MM.YYYY&time=HH:MM` (NOT sbb.ch — their deeplinks are broken)

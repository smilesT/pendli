import type { ResolvedLocation, Connection } from '../../types/index.ts';
import type {
  LocationsResponse,
  ConnectionsResponse,
  TransportLocation,
  TransportConnection,
} from './types.ts';

const BASE_URL = 'https://transport.opendata.ch/v1';

// --- Rate Limiting ---
const MAX_CONCURRENT = 3;
const DELAY_MS = 500;
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

function enqueue(): Promise<void> {
  return new Promise((resolve) => {
    const tryRun = () => {
      if (activeRequests < MAX_CONCURRENT) {
        activeRequests++;
        resolve();
      } else {
        requestQueue.push(tryRun);
      }
    };
    tryRun();
  });
}

function dequeue(): void {
  activeRequests--;
  setTimeout(() => {
    const next = requestQueue.shift();
    if (next) next();
  }, DELAY_MS);
}

async function rateLimitedFetch(url: string): Promise<Response> {
  await enqueue();
  try {
    const response = await fetch(url);
    if (response.status === 429) {
      // Rate limited — wait and retry once
      await new Promise((r) => setTimeout(r, 2000));
      return fetch(url);
    }
    return response;
  } finally {
    dequeue();
  }
}

// --- Location Search ---
const locationCache = new Map<string, TransportLocation[]>();

export async function searchLocations(
  query: string
): Promise<TransportLocation[]> {
  if (query.length < 2) return [];

  const cached = locationCache.get(query);
  if (cached) return cached;

  const url = `${BASE_URL}/locations?query=${encodeURIComponent(query)}&type=all`;
  const response = await rateLimitedFetch(url);
  const data: LocationsResponse = await response.json();
  const results = data.stations || [];

  locationCache.set(query, results);
  return results;
}

// --- Debounced Location Search ---
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSearchLocations(
  query: string,
  callback: (results: TransportLocation[]) => void,
  delay = 300
): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const results = await searchLocations(query);
    callback(results);
  }, delay);
}

// --- Simplify address for better API hits ---
function simplifyQuery(query: string): string[] {
  const queries: string[] = [query];

  // Strip postal codes (4-digit Swiss PLZ)
  const withoutPlz = query.replace(/\b\d{4}\b/g, '').replace(/,\s*,/g, ',').trim();
  if (withoutPlz !== query) queries.push(withoutPlz);

  // Strip street numbers
  const withoutNumbers = withoutPlz.replace(/\b\d+[a-zA-Z]?\b/g, '').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();
  if (withoutNumbers !== withoutPlz) queries.push(withoutNumbers);

  // Just the first part (before first comma) — often the most useful
  const firstPart = query.split(',')[0].trim();
  if (firstPart.length >= 3 && !queries.includes(firstPart)) queries.push(firstPart);

  return queries;
}

// --- Resolve Location ---
export async function resolveLocation(
  query: string
): Promise<ResolvedLocation | null> {
  const queryVariants = simplifyQuery(query);

  // First pass: prefer results with valid coordinates
  for (const q of queryVariants) {
    const results = await searchLocations(q);
    const withCoords = results.filter(
      (r) => r.coordinate && r.coordinate.x != null && r.coordinate.y != null
    );
    if (withCoords.length > 0) {
      const best = withCoords[0];
      return {
        name: best.name,
        latitude: best.coordinate.x,
        longitude: best.coordinate.y,
        station: best.name,
        stationId: best.id || undefined,
      };
    }
  }

  // Second pass: accept results without coordinates (name still works for connection search)
  for (const q of queryVariants) {
    const results = await searchLocations(q);
    if (results.length > 0) {
      const best = results[0];
      return {
        name: best.name,
        latitude: best.coordinate?.x ?? 0,
        longitude: best.coordinate?.y ?? 0,
        station: best.name,
        stationId: best.id || undefined,
      };
    }
  }

  // Last resort: extract city name from address parts and search as station
  const parts = query.split(',').map((p) => p.trim());
  for (const part of parts.reverse()) {
    // Skip parts that look like street numbers or PLZ
    const cleaned = part.replace(/\b\d+[a-zA-Z]?\b/g, '').trim();
    if (cleaned.length < 2) continue;
    const results = await searchLocations(cleaned);
    const withCoords = results.filter(
      (r) => r.coordinate && r.coordinate.x != null && r.coordinate.y != null
    );
    if (withCoords.length > 0) {
      const best = withCoords[0];
      return {
        name: best.name,
        latitude: best.coordinate.x,
        longitude: best.coordinate.y,
        station: best.name,
        stationId: best.id || undefined,
      };
    }
  }

  return null;
}

export function transportLocationToResolved(
  loc: TransportLocation
): ResolvedLocation {
  return {
    name: loc.name,
    latitude: loc.coordinate.x,
    longitude: loc.coordinate.y,
    station: loc.name,
    stationId: loc.id || undefined,
  };
}

// --- Connection Search ---
const connectionCache = new Map<string, Connection[]>();

function connectionCacheKey(
  from: string,
  to: string,
  date: string,
  time: string,
  isArrival: boolean
): string {
  return `${from}|${to}|${date}|${time}|${isArrival}`;
}

export async function searchConnections(
  from: string,
  to: string,
  date: string, // YYYY-MM-DD
  time: string, // HH:MM
  isArrivalTime = true
): Promise<Connection[]> {
  const key = connectionCacheKey(from, to, date, time, isArrivalTime);
  const cached = connectionCache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    from,
    to,
    date,
    time,
    isArrivalTime: isArrivalTime ? '1' : '0',
  });
  const url = `${BASE_URL}/connections?${params}`;
  const response = await rateLimitedFetch(url);
  const data: ConnectionsResponse = await response.json();

  const connections = (data.connections || []).flatMap((conn) =>
    mapConnection(conn)
  );

  connectionCache.set(key, connections);
  return connections;
}

// Map API category codes to readable line names
function formatLineName(category: string, number: string): string {
  const cat = category.trim();
  const num = number.trim();
  switch (cat) {
    case 'T': return `Tram ${num}`;
    case 'B':
    case 'NFB':
    case 'NFO': return `Bus ${num}`;
    case 'S': return `S${num}`;
    case 'IR': return `IR ${num}`;
    case 'IC': return `IC ${num}`;
    case 'ICE': return `ICE ${num}`;
    case 'EC': return `EC ${num}`;
    case 'RE': return `RE ${num}`;
    case 'R': return `R ${num}`;
    case 'BAT': return `Schiff ${num}`;
    case 'FUN': return `Seilbahn ${num}`;
    default: return `${cat} ${num}`;
  }
}

function mapConnection(conn: TransportConnection): Connection[] {
  return conn.sections
    .filter((s) => s.journey !== null)
    .map((section) => ({
      departure: section.departure.station.name,
      arrival: section.arrival.station.name,
      departureTime: new Date(section.departure.departure || ''),
      arrivalTime: new Date(section.arrival.arrival || ''),
      line: formatLineName(section.journey!.category, section.journey!.number),
      platform: section.departure.platform || undefined,
      operator: section.journey!.operator?.trim() || undefined,
    }));
}

export interface ConnectionResult {
  connections: Connection[];
  departureTime: Date;
  arrivalTime: Date;
}

// --- Get best connection for a route ---
// isArrivalTime=true:  find latest departure that still arrives before targetTime (max time at origin)
// isArrivalTime=false: find shortest trip departing after targetTime (fastest home)
export async function getBestConnection(
  from: string,
  to: string,
  date: string,
  time: string,
  isArrivalTime = true,
  bufferMinutes = 0
): Promise<ConnectionResult | null> {
  const params = new URLSearchParams({
    from,
    to,
    date,
    time,
    isArrivalTime: isArrivalTime ? '1' : '0',
    limit: '6',
  });
  const url = `${BASE_URL}/connections?${params}`;
  const response = await rateLimitedFetch(url);
  const data: ConnectionsResponse = await response.json();

  if (!data.connections || data.connections.length === 0) return null;

  const targetMs = new Date(`${date}T${time}:00`).getTime();
  const bufferMs = bufferMinutes * 60 * 1000;

  if (isArrivalTime) {
    // Arriving TO an appointment: pick the latest departure that arrives with buffer
    // API returns connections sorted by departure (earliest first)
    // We want the LAST one that arrives before (targetTime - buffer)
    const deadline = targetMs - bufferMs;

    let best: TransportConnection | null = null;
    for (const conn of data.connections) {
      const arrival = new Date(conn.to.arrival || '').getTime();
      if (arrival <= deadline) {
        // This connection arrives on time — keep it (later ones override earlier)
        best = conn;
      }
    }

    // If no connection meets the buffer, take the one arriving closest to target
    if (!best) {
      best = data.connections.reduce((a, b) => {
        const aArr = new Date(a.to.arrival || '').getTime();
        const bArr = new Date(b.to.arrival || '').getTime();
        // Prefer the one closest to (but not after) the target time
        const aDiff = targetMs - aArr;
        const bDiff = targetMs - bArr;
        if (aDiff >= 0 && bDiff >= 0) return aDiff < bDiff ? a : b; // both before: pick latest
        if (aDiff >= 0) return a; // only a is before
        if (bDiff >= 0) return b; // only b is before
        return Math.abs(aDiff) < Math.abs(bDiff) ? a : b; // both after: pick closest
      });
    }

    return toResult(best);
  } else {
    // Departing FROM an appointment: pick the shortest trip
    const best = data.connections.reduce((a, b) => {
      const aDur = parseDuration(a.duration);
      const bDur = parseDuration(b.duration);
      return aDur <= bDur ? a : b;
    });

    return toResult(best);
  }
}

function toResult(conn: TransportConnection): ConnectionResult {
  return {
    connections: mapConnection(conn),
    departureTime: new Date(conn.from.departure || ''),
    arrivalTime: new Date(conn.to.arrival || ''),
  };
}

// Parse "00d01:12:00" → minutes
function parseDuration(dur: string): number {
  const match = dur.match(/(\d+)d(\d+):(\d+):(\d+)/);
  if (match) {
    return parseInt(match[1]) * 1440 + parseInt(match[2]) * 60 + parseInt(match[3]);
  }
  // fallback: "01:12:00"
  const parts = dur.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 60 + parts[1];
  return 9999;
}

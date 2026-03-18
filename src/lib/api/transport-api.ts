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
      return await fetch(url);
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

  try {
    const url = `${BASE_URL}/locations?query=${encodeURIComponent(query)}&type=all`;
    const response = await rateLimitedFetch(url);
    const data: LocationsResponse = await response.json();
    const results = data.stations || [];

    locationCache.set(query, results);
    return results;
  } catch {
    return [];
  }
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
    latitude: loc.coordinate?.x ?? 0,
    longitude: loc.coordinate?.y ?? 0,
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
    .filter((s) => s.journey !== null && s.departure.departure != null && s.arrival.arrival != null)
    .map((section) => ({
      departure: section.departure.station.name,
      arrival: section.arrival.station.name,
      departureTime: new Date(section.departure.departure!),
      arrivalTime: new Date(section.arrival.arrival!),
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
// isArrivalTime=true:  find latest departure (after earliestDeparture) that arrives before targetTime
// isArrivalTime=false: find earliest arrival departing after targetTime
export async function getBestConnection(
  from: string,
  to: string,
  date: string,
  time: string,
  isArrivalTime = true,
  bufferMinutes = 0,
  earliestDeparture?: Date
): Promise<ConnectionResult | null> {
  try {
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
  const earliestMs = earliestDeparture ? earliestDeparture.getTime() : 0;

  if (isArrivalTime) {
    const deadline = targetMs - bufferMs;

    // Filter: only connections that depart AFTER earliestDeparture
    const viable = data.connections.filter((conn) => {
      const dep = new Date(conn.from.departure || '').getTime();
      return dep >= earliestMs;
    });

    // Among viable: pick latest departure that arrives before deadline
    let best: TransportConnection | null = null;
    for (const conn of viable) {
      const arrival = new Date(conn.to.arrival || '').getTime();
      if (arrival <= deadline) {
        best = conn;
      }
    }

    // Fallback among viable: closest arrival to target
    if (!best && viable.length > 0) {
      best = viable.reduce((a, b) => {
        const aDiff = targetMs - new Date(a.to.arrival || '').getTime();
        const bDiff = targetMs - new Date(b.to.arrival || '').getTime();
        if (aDiff >= 0 && bDiff >= 0) return aDiff < bDiff ? a : b;
        if (aDiff >= 0) return a;
        if (bDiff >= 0) return b;
        return Math.abs(aDiff) < Math.abs(bDiff) ? a : b;
      });
    }

    // Last resort: if no viable connections (all depart before earliestDeparture),
    // we need a second API call starting from earliestDeparture
    if (!best) {
      const fallbackTime = earliestDeparture
        ? formatTime24(earliestDeparture)
        : time;
      const params2 = new URLSearchParams({
        from,
        to,
        date,
        time: fallbackTime,
        isArrivalTime: '0', // search by departure time instead
        limit: '4',
      });
      const url2 = `${BASE_URL}/connections?${params2}`;
      const response2 = await rateLimitedFetch(url2);
      const data2: ConnectionsResponse = await response2.json();
      if (data2.connections && data2.connections.length > 0) {
        // Pick the one arriving closest to (but ideally before) target
        best = data2.connections.reduce((a, b) => {
          const aDiff = targetMs - new Date(a.to.arrival || '').getTime();
          const bDiff = targetMs - new Date(b.to.arrival || '').getTime();
          if (aDiff >= 0 && bDiff >= 0) return aDiff < bDiff ? a : b;
          if (aDiff >= 0) return a;
          if (bDiff >= 0) return b;
          return Math.abs(aDiff) < Math.abs(bDiff) ? a : b;
        });
      }
    }

    if (!best) return null;
    return toResult(best);
  } else {
    // Departing FROM an appointment: pick earliest arrival
    const best = data.connections.reduce((a, b) => {
      const aArr = new Date(a.to.arrival || '').getTime() || Infinity;
      const bArr = new Date(b.to.arrival || '').getTime() || Infinity;
      return aArr <= bArr ? a : b;
    });

    return toResult(best);
  }
  } catch {
    return null;
  }
}

function formatTime24(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toResult(conn: TransportConnection): ConnectionResult | null {
  const depTime = conn.from.departure ? new Date(conn.from.departure) : null;
  const arrTime = conn.to.arrival ? new Date(conn.to.arrival) : null;
  if (!depTime || !arrTime || isNaN(depTime.getTime()) || isNaN(arrTime.getTime())) return null;
  return {
    connections: mapConnection(conn),
    departureTime: depTime,
    arrivalTime: arrTime,
  };
}


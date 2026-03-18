import type {
  Appointment,
  UserConfig,
  DayPlan,
  RouteSegment,
  ResolvedLocation,
} from '../../types/index.ts';
import { resolveLocation, getBestConnection } from '../api/transport-api.ts';
import { getBaseLocation } from './base-location.ts';
import {
  differenceInMinutes,
  formatDateISO,
  formatTimeHHMM,
} from './time-utils.ts';

export type ProgressCallback = (message: string) => void;

// Minimum time at base for a return trip to be worthwhile
const MIN_DWELL_AT_BASE = 20; // minutes
// Below this gap, never consider returning to base
const MIN_GAP_FOR_BASE_CONSIDERATION = 30; // minutes

function isSameLocation(a: ResolvedLocation, b: ResolvedLocation): boolean {
  if (a.stationId && b.stationId) return a.stationId === b.stationId;
  return a.name === b.name || (a.station === b.station && !!a.station);
}

async function calculateSegment(
  from: ResolvedLocation,
  to: ResolvedLocation,
  targetTime: Date,
  bufferMinutes: number,
  isArrivalTime: boolean,
  segmentType: RouteSegment['segmentType'] = 'travel',
  earliestDeparture?: Date
): Promise<RouteSegment> {
  // Skip if same location
  if (isSameLocation(from, to)) {
    return {
      from,
      to,
      departureTime: targetTime,
      arrivalTime: targetTime,
      duration: 0,
      connections: [],
      status: 'ok',
      segmentType: 'wait',
    };
  }

  const date = formatDateISO(targetTime);
  const time = formatTimeHHMM(targetTime);

  const result = await getBestConnection(
    from.station || from.name,
    to.station || to.name,
    date,
    time,
    isArrivalTime,
    bufferMinutes,
    earliestDeparture
  );

  if (!result || result.connections.length === 0) {
    return {
      from,
      to,
      departureTime: targetTime,
      arrivalTime: targetTime,
      duration: 0,
      connections: [],
      status: 'impossible',
      segmentType,
    };
  }

  const { connections, departureTime, arrivalTime } = result;
  const duration = differenceInMinutes(arrivalTime, departureTime);

  let status: RouteSegment['status'] = 'ok';
  if (isArrivalTime) {
    const bufferActual = differenceInMinutes(targetTime, arrivalTime);
    if (bufferActual < 0) status = 'impossible';
    else if (bufferActual < 5) status = 'tight';
  }

  return {
    from,
    to,
    departureTime,
    arrivalTime,
    duration,
    connections,
    status,
    segmentType,
  };
}

export async function calculateDayPlan(
  appointments: Appointment[],
  config: UserConfig,
  onProgress?: ProgressCallback
): Promise<DayPlan> {
  const sorted = [...appointments].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const warnings: string[] = [];
  const segments: RouteSegment[] = [];

  // Resolve all locations
  for (const apt of sorted) {
    if (!apt.resolvedLocation) {
      onProgress?.(`Suche Standort: "${apt.location}"...`);
      const resolved = await resolveLocation(apt.location);
      if (resolved) {
        apt.resolvedLocation = resolved;
      } else {
        warnings.push(
          `Ort "${apt.location}" für "${apt.title}" konnte nicht aufgelöst werden.`
        );
      }
    }
  }

  const validApts = sorted.filter((a) => a.resolvedLocation);
  if (validApts.length === 0) {
    return {
      date: sorted[0]?.startTime || new Date(),
      segments: [],
      appointments: sorted,
      warnings: [...warnings, 'Keine Termine mit gültigem Standort gefunden.'],
    };
  }

  // Segment 0: Home -> first appointment
  const firstApt = validApts[0];
  if (!isSameLocation(config.homeAddress, firstApt.resolvedLocation!)) {
    onProgress?.(
      `Suche Verbindung: ${config.homeAddress.name} → ${firstApt.resolvedLocation!.name}...`
    );
    segments.push(
      await calculateSegment(
        config.homeAddress,
        firstApt.resolvedLocation!,
        firstApt.startTime,
        config.bufferMinutes,
        true
      )
    );
  }

  // Segments between appointments
  for (let i = 0; i < validApts.length - 1; i++) {
    const current = validApts[i];
    const next = validApts[i + 1];
    const gapMinutes = differenceInMinutes(next.startTime, current.endTime);

    if (gapMinutes < 0) {
      warnings.push(`Termine ${current.title} und ${next.title} überlappen sich`);
    }

    // Same location? No travel needed.
    if (isSameLocation(current.resolvedLocation!, next.resolvedLocation!)) {
      continue;
    }

    // Short gap or gap too small for base return: always go direct
    if (gapMinutes < MIN_GAP_FOR_BASE_CONSIDERATION) {
      onProgress?.(
        `Suche Verbindung: ${current.resolvedLocation!.name} → ${next.resolvedLocation!.name}...`
      );
      const segment = await calculateSegment(
        current.resolvedLocation!,
        next.resolvedLocation!,
        next.startTime,
        config.bufferMinutes,
        true,
        'travel',
        current.endTime // don't depart before this appointment ends!
      );
      segments.push(segment);
      if (segment.status === 'impossible') {
        warnings.push(`Verbindung zu "${next.title}" ist zeitlich nicht machbar!`);
      }
      continue;
    }

    // Larger gap: evaluate both strategies
    const baseLocation = getBaseLocation(current.endTime, config);
    const alreadyAtBase = isSameLocation(current.resolvedLocation!, baseLocation);
    const nextIsBase = isSameLocation(next.resolvedLocation!, baseLocation);

    // Strategy A: Go direct (earliest departure = current appointment end)
    onProgress?.(
      `Suche Verbindung: ${current.resolvedLocation!.name} → ${next.resolvedLocation!.name}...`
    );
    const directSegment = await calculateSegment(
      current.resolvedLocation!,
      next.resolvedLocation!,
      next.startTime,
      config.bufferMinutes,
      true,
      'travel',
      current.endTime
    );

    // Strategy B: Return to base, then go to next
    let useBase = false;
    let toBaseSegment: RouteSegment | null = null;
    let fromBaseSegment: RouteSegment | null = null;

    if (!alreadyAtBase && !nextIsBase && gapMinutes >= MIN_GAP_FOR_BASE_CONSIDERATION) {
      onProgress?.(
        `Prüfe Rückkehr zu ${baseLocation.name}...`
      );

      // Step 1: current -> base (depart after appointment ends)
      toBaseSegment = await calculateSegment(
        current.resolvedLocation!,
        baseLocation,
        current.endTime,
        0,
        false,
        'return-to-base'
      );

      // Step 2: base -> next (earliest departure = arrival at base)
      const baseArrival = toBaseSegment.status !== 'impossible'
        ? toBaseSegment.arrivalTime
        : undefined;
      fromBaseSegment = await calculateSegment(
        baseLocation,
        next.resolvedLocation!,
        next.startTime,
        config.bufferMinutes,
        true,
        'travel',
        baseArrival
      );

      // Check temporal consistency: enough dwell time at base?
      if (toBaseSegment.status !== 'impossible' && fromBaseSegment.status !== 'impossible') {
        const dwellTime = differenceInMinutes(
          fromBaseSegment.departureTime,
          toBaseSegment.arrivalTime
        );
        if (dwellTime >= MIN_DWELL_AT_BASE) {
          useBase = true;
        }
      }
    }

    if (useBase && toBaseSegment && fromBaseSegment) {
      segments.push(toBaseSegment);
      segments.push(fromBaseSegment);
    } else {
      segments.push(directSegment);
      if (directSegment.status === 'impossible') {
        warnings.push(`Verbindung zu "${next.title}" ist zeitlich nicht machbar!`);
      }
    }
  }

  // Last segment: last appointment -> home
  const lastApt = validApts[validApts.length - 1];
  if (!isSameLocation(lastApt.resolvedLocation!, config.homeAddress)) {
    onProgress?.(
      `Suche Verbindung: ${lastApt.resolvedLocation!.name} → ${config.homeAddress.name}...`
    );
    segments.push(
      await calculateSegment(
        lastApt.resolvedLocation!,
        config.homeAddress,
        lastApt.endTime,
        0,
        false
      )
    );
  }

  return {
    date: validApts[0].startTime,
    segments,
    appointments: sorted,
    warnings,
  };
}

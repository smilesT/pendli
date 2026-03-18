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
import { t } from '../i18n/index.ts';

export type ProgressCallback = (message: string) => void;

// Minimum dwell time at base for a return trip to be worthwhile
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
  // Skip if origin and destination are the same
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

/** Type guard narrowing an Appointment to one with a resolved location. */
function hasResolvedLocation(
  apt: Appointment
): apt is Appointment & { resolvedLocation: ResolvedLocation } {
  return apt.resolvedLocation !== undefined;
}

export async function calculateDayPlan(
  appointments: Appointment[],
  config: UserConfig,
  onProgress?: ProgressCallback
): Promise<DayPlan> {
  // Deep-copy appointments to avoid mutating store state
  const sorted = [...appointments]
    .map((a) => ({ ...a }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const warnings: string[] = [];
  const segments: RouteSegment[] = [];
  const segmentGaps: number[] = [];

  // Resolve all appointment locations
  for (const apt of sorted) {
    if (!apt.resolvedLocation) {
      onProgress?.(`Suche Standort: "${apt.location}"...`);
      const resolved = await resolveLocation(apt.location);
      if (resolved) {
        apt.resolvedLocation = resolved;
      } else {
        warnings.push(t.errors.locationNotFound(apt.location, apt.title));
      }
    }
  }

  const validApts = sorted.filter(hasResolvedLocation);
  if (validApts.length === 0) {
    return {
      date: sorted[0]?.startTime || new Date(),
      segments: [],
      segmentGaps: [],
      appointments: sorted,
      warnings,
    };
  }

  // First segment: home -> first appointment
  const firstApt = validApts[0];
  if (!isSameLocation(config.homeAddress, firstApt.resolvedLocation)) {
    onProgress?.(
      `Suche Verbindung: ${config.homeAddress.name} → ${firstApt.resolvedLocation.name}...`
    );
    segments.push(
      await calculateSegment(
        config.homeAddress,
        firstApt.resolvedLocation,
        firstApt.startTime,
        config.bufferMinutes,
        true
      )
    );
    segmentGaps.push(1);
  } else {
    segmentGaps.push(0);
  }

  // Intermediate segments between appointments
  for (let i = 0; i < validApts.length - 1; i++) {
    const current = validApts[i];
    const next = validApts[i + 1];
    const curLoc = current.resolvedLocation;
    const nextLoc = next.resolvedLocation;
    const gapMinutes = differenceInMinutes(next.startTime, current.endTime);

    if (gapMinutes < 0) {
      warnings.push(t.errors.appointmentsOverlap(current.title, next.title));
    }

    // Same location -- no travel needed
    if (isSameLocation(curLoc, nextLoc)) {
      segmentGaps.push(0);
      continue;
    }

    // Short gap -- go direct, no base return
    if (gapMinutes < MIN_GAP_FOR_BASE_CONSIDERATION) {
      onProgress?.(
        `Suche Verbindung: ${curLoc.name} → ${nextLoc.name}...`
      );
      const segment = await calculateSegment(
        curLoc,
        nextLoc,
        next.startTime,
        config.bufferMinutes,
        true,
        'travel',
        current.endTime // earliest departure: when current appointment ends
      );
      segments.push(segment);
      if (segment.status === 'impossible') {
        warnings.push(t.errors.connectionImpossible(next.title));
      }
      segmentGaps.push(1);
      continue;
    }

    // Larger gap: evaluate direct vs. base-return strategies
    const baseLocation = getBaseLocation(current.endTime, config);
    const alreadyAtBase = isSameLocation(curLoc, baseLocation);
    const nextIsBase = isSameLocation(nextLoc, baseLocation);

    // Strategy A: go direct (earliest departure = current appointment end)
    onProgress?.(
      `Suche Verbindung: ${curLoc.name} → ${nextLoc.name}...`
    );
    const directSegment = await calculateSegment(
      curLoc,
      nextLoc,
      next.startTime,
      config.bufferMinutes,
      true,
      'travel',
      current.endTime
    );

    // Strategy B: return to base, then go to next
    let useBase = false;
    let toBaseSegment: RouteSegment | null = null;
    let fromBaseSegment: RouteSegment | null = null;

    if (!alreadyAtBase && !nextIsBase && gapMinutes >= MIN_GAP_FOR_BASE_CONSIDERATION) {
      onProgress?.(
        `Prüfe Rückkehr zu ${baseLocation.name}...`
      );

      // Step 1: current -> base (depart after current appointment ends)
      toBaseSegment = await calculateSegment(
        curLoc,
        baseLocation,
        current.endTime,
        0,
        false,
        'return-to-base'
      );

      // Step 2: base -> next appointment (earliest departure = arrival at base)
      const baseArrival = toBaseSegment.status !== 'impossible'
        ? toBaseSegment.arrivalTime
        : undefined;
      fromBaseSegment = await calculateSegment(
        baseLocation,
        nextLoc,
        next.startTime,
        config.bufferMinutes,
        true,
        'travel',
        baseArrival
      );

      // Check: enough dwell time at base to justify the detour?
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
      segmentGaps.push(2);
    } else {
      segments.push(directSegment);
      if (directSegment.status === 'impossible') {
        warnings.push(t.errors.connectionImpossible(next.title));
      }
      segmentGaps.push(1);
    }
  }

  // Final segment: last appointment -> home
  const lastApt = validApts[validApts.length - 1];
  if (!isSameLocation(lastApt.resolvedLocation, config.homeAddress)) {
    onProgress?.(
      `Suche Verbindung: ${lastApt.resolvedLocation.name} → ${config.homeAddress.name}...`
    );
    segments.push(
      await calculateSegment(
        lastApt.resolvedLocation,
        config.homeAddress,
        lastApt.endTime,
        0,
        false
      )
    );
    segmentGaps.push(1);
  } else {
    segmentGaps.push(0);
  }

  return {
    date: validApts[0].startTime,
    segments,
    segmentGaps,
    appointments: sorted,
    warnings,
  };
}

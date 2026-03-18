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

async function calculateSegment(
  from: ResolvedLocation,
  to: ResolvedLocation,
  targetTime: Date,
  bufferMinutes: number,
  isArrivalTime: boolean
): Promise<RouteSegment> {
  const date = formatDateISO(targetTime);
  const time = formatTimeHHMM(targetTime);

  const result = await getBestConnection(
    from.station || from.name,
    to.station || to.name,
    date,
    time,
    isArrivalTime,
    bufferMinutes
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
    };
  }

  const { connections, departureTime, arrivalTime } = result;
  const duration = differenceInMinutes(arrivalTime, departureTime);

  // Determine status based on buffer
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

  // Filter out appointments without resolved locations
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
  onProgress?.(
    `Suche Verbindung: ${config.homeAddress.name} → ${firstApt.resolvedLocation!.name}...`
  );
  segments.push(
    await calculateSegment(
      config.homeAddress,
      firstApt.resolvedLocation!,
      firstApt.startTime,
      config.bufferMinutes,
      true // arrival time
    )
  );

  // Segments between appointments
  for (let i = 0; i < validApts.length - 1; i++) {
    const current = validApts[i];
    const next = validApts[i + 1];
    const gapMinutes = differenceInMinutes(
      next.startTime,
      current.endTime
    );

    if (gapMinutes > 60) {
      // Large gap: return to base location, then go to next
      const baseLocation = getBaseLocation(current.endTime, config);

      onProgress?.(
        `Suche Verbindung: ${current.resolvedLocation!.name} → ${baseLocation.name}...`
      );
      segments.push(
        await calculateSegment(
          current.resolvedLocation!,
          baseLocation,
          current.endTime,
          0,
          false // departure time
        )
      );

      onProgress?.(
        `Suche Verbindung: ${baseLocation.name} → ${next.resolvedLocation!.name}...`
      );
      segments.push(
        await calculateSegment(
          baseLocation,
          next.resolvedLocation!,
          next.startTime,
          config.bufferMinutes,
          true // arrival time
        )
      );
    } else {
      // Direct to next appointment
      onProgress?.(
        `Suche Verbindung: ${current.resolvedLocation!.name} → ${next.resolvedLocation!.name}...`
      );
      const segment = await calculateSegment(
        current.resolvedLocation!,
        next.resolvedLocation!,
        next.startTime,
        config.bufferMinutes,
        true
      );
      segments.push(segment);

      if (segment.status === 'impossible') {
        warnings.push(
          `Verbindung zu "${next.title}" ist zeitlich nicht machbar!`
        );
      }
    }
  }

  // Last segment: last appointment -> home
  const lastApt = validApts[validApts.length - 1];
  onProgress?.(
    `Suche Verbindung: ${lastApt.resolvedLocation!.name} → ${config.homeAddress.name}...`
  );
  segments.push(
    await calculateSegment(
      lastApt.resolvedLocation!,
      config.homeAddress,
      lastApt.endTime,
      0,
      false // departure time
    )
  );

  return {
    date: validApts[0].startTime,
    segments,
    appointments: sorted,
    warnings,
  };
}

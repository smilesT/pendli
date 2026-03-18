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
  stationId?: string;
}

export interface UserConfig {
  homeAddress: ResolvedLocation;
  workAddress: ResolvedLocation;
  workSchedule: WorkSchedule;
  bufferMinutes: number;
}

export interface WorkSchedule {
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "08:00"
  endTime: string; // "17:00"
}

export interface RouteSegment {
  from: ResolvedLocation;
  to: ResolvedLocation;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  connections: Connection[];
  status: 'ok' | 'tight' | 'impossible';
  segmentType: 'travel' | 'return-to-base' | 'wait';
}

export interface Connection {
  departure: string;
  arrival: string;
  departureTime: Date;
  arrivalTime: Date;
  line: string;
  platform?: string;
  operator?: string;
  isWalk?: boolean;
  walkDuration?: number;
}

export interface DayPlan {
  date: Date;
  segments: RouteSegment[];
  segmentGaps: number[];
  appointments: Appointment[];
  warnings: string[];
}

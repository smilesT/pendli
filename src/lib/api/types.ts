// Swiss Transport API Response Types

export interface TransportLocation {
  name: string;
  score: number | null;
  coordinate: {
    type: string;
    x: number; // latitude
    y: number; // longitude
  };
  id: string | null;
  type: string; // "station" | "address" | "poi"
}

export interface LocationsResponse {
  stations: TransportLocation[];
}

export interface TransportConnection {
  from: TransportStop;
  to: TransportStop;
  duration: string; // "00d00:30:00"
  sections: TransportSection[];
}

export interface TransportStop {
  station: TransportLocation;
  arrival: string | null; // ISO datetime
  departure: string | null; // ISO datetime
  platform: string | null;
}

export interface TransportSection {
  journey: TransportJourney | null;
  walk: { duration: number } | null;
  departure: TransportStop;
  arrival: TransportStop;
}

export interface TransportJourney {
  name: string; // e.g. "S3 18378"
  category: string; // e.g. "S"
  number: string; // e.g. "18378"
  operator: string;
  to: string; // final destination
}

export interface ConnectionsResponse {
  connections: TransportConnection[];
}

import type { Connection } from '../../types/index.ts';
import { formatTimeHHMM } from '../../lib/planner/time-utils.ts';

interface ConnectionDetailsProps {
  connections: Connection[];
}

export function ConnectionDetails({ connections }: ConnectionDetailsProps) {
  if (connections.length === 0) {
    return (
      <p className="text-xs text-slate italic px-2 py-1">
        Keine ÖV-Verbindung gefunden
      </p>
    );
  }

  return (
    <div className="space-y-1 py-1">
      {connections.map((conn, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span className="font-mono font-bold text-sbb-red w-10 text-right flex-shrink-0">
            {formatTimeHHMM(conn.departureTime)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="bg-anthracite text-white px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                {conn.line}
              </span>
              <span className="text-anthracite truncate">
                {conn.departure}
              </span>
              {conn.platform && (
                <span className="text-slate">Gl. {conn.platform}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-slate">
              <span className="w-10 text-right font-mono flex-shrink-0">
                {formatTimeHHMM(conn.arrivalTime)}
              </span>
              <span className="truncate">{conn.arrival}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

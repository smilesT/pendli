import type { Connection } from '../../types/index.ts';
import { formatTimeHHMM, differenceInMinutes } from '../../lib/planner/time-utils.ts';

interface ConnectionDetailsProps {
  connections: Connection[];
}

export function ConnectionDetails({ connections }: ConnectionDetailsProps) {
  if (connections.length === 0) {
    return (
      <p className="text-xs text-slate dark:text-dark-muted italic px-2 py-1">
        Keine ÖV-Verbindung gefunden
      </p>
    );
  }

  return (
    <div className="space-y-1 py-1">
      {connections.map((conn, i) =>
        conn.isWalk ? (
          <div key={i} className="flex items-center gap-2 text-xs text-slate dark:text-dark-muted py-0.5">
            <span className="font-mono w-10 text-right flex-shrink-0">
              {formatTimeHHMM(conn.departureTime)}
            </span>
            <span className="bg-slate/20 dark:bg-dark-border px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
              🚶
            </span>
            <span>
              {differenceInMinutes(conn.arrivalTime, conn.departureTime)} Min. Fussweg → {conn.arrival}
            </span>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="font-mono font-bold text-sbb-red w-10 text-right flex-shrink-0">
              {formatTimeHHMM(conn.departureTime)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="bg-anthracite dark:bg-dark-muted text-white dark:text-dark-bg px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                  {conn.line}
                </span>
                <span className="text-anthracite dark:text-dark-text truncate">
                  {conn.departure}
                </span>
                {conn.platform && (
                  <span className="text-slate dark:text-dark-muted">Gl. {conn.platform}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate dark:text-dark-muted">
                <span className="w-10 text-right font-mono flex-shrink-0">
                  {formatTimeHHMM(conn.arrivalTime)}
                </span>
                <span className="truncate">{conn.arrival}</span>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

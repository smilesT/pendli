import { useState } from 'react';
import type { RouteSegment as RouteSegmentType } from '../../types/index.ts';
import { formatTimeHHMM, formatDateISO, durationString } from '../../lib/planner/time-utils.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { ConnectionDetails } from './ConnectionDetails.tsx';

function buildSbbUrl(segment: RouteSegmentType): string {
  const fromName = segment.from.station || segment.from.name;
  const toName = segment.to.station || segment.to.name;
  const fromId = segment.from.stationId;
  const toId = segment.to.stationId;

  const fromParam = fromId ? `${fromName}_I${fromId}` : fromName;
  const toParam = toId ? `${toName}_I${toId}` : toName;

  const hh = String(segment.departureTime.getHours()).padStart(2, '0');
  const mm = String(segment.departureTime.getMinutes()).padStart(2, '0');

  const params = new URLSearchParams({
    stops: `${fromParam}~${toParam}`,
    time: `${hh}_${mm}`,
    day: formatDateISO(segment.departureTime),
    moment: 'dep',
  });
  return `https://www.sbb.ch/en?${params}`;
}

interface RouteSegmentProps {
  segment: RouteSegmentType;
  isReturn?: boolean;
}

export function RouteSegmentCard({ segment, isReturn }: RouteSegmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const borderColor = {
    ok: 'border-l-success',
    tight: 'border-l-warning',
    impossible: 'border-l-danger',
  }[segment.status];

  // Compact route summary
  const routeSummary = segment.connections.length > 0
    ? segment.connections.map((c) => c.line).join(' → ')
    : 'Keine Verbindung';

  return (
    <div className="relative pl-10">
      {/* Timeline connector */}
      <div className={`absolute left-[1.2rem] top-0 bottom-0 w-0.5 ${isReturn ? 'bg-gray-200 dark:bg-dark-border' : 'bg-gray-300 dark:bg-dark-border'}`}
        style={isReturn ? { backgroundImage: 'repeating-linear-gradient(to bottom, #e2e8f0 0, #e2e8f0 6px, transparent 6px, transparent 12px)' } : undefined}
      />

      {/* Departure dot */}
      <div className="absolute left-[0.85rem] top-3 w-2.5 h-2.5 rounded-full bg-white dark:bg-dark-card border-2 border-gray-400 dark:border-dark-muted" />

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full text-left bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border ${borderColor} border-l-4 rounded-lg px-4 py-3 my-2 hover:shadow-sm transition-shadow`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-mono text-sm font-bold text-anthracite dark:text-dark-text">
              {formatTimeHHMM(segment.departureTime)}
            </span>
            <span className="text-slate dark:text-dark-muted text-xs">→</span>
            <span className="font-mono text-sm text-slate dark:text-dark-muted">
              {formatTimeHHMM(segment.arrivalTime)}
            </span>
          </div>
          <StatusBadge status={segment.status} size="sm" />
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-xs text-anthracite dark:text-dark-text truncate">
            {segment.from.name}
          </span>
          <span className="text-slate dark:text-dark-muted text-xs flex-shrink-0">→</span>
          <span className="text-xs text-anthracite dark:text-dark-text truncate">
            {segment.to.name}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-slate dark:text-dark-muted">
          <span>{routeSummary}</span>
          <span className="font-mono">({durationString(segment.duration)})</span>
          <svg
            className={`w-3 h-3 transition-transform flex-shrink-0 ml-auto ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 12 12"
          >
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-dark-border" onClick={(e) => e.stopPropagation()}>
            <ConnectionDetails connections={segment.connections} />
            <a
              href={buildSbbUrl(segment)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-sbb-red hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M5 1H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Auf SBB ansehen
            </a>
          </div>
        )}
      </button>
    </div>
  );
}

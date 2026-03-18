import type { RouteSegment } from '../../types/index.ts';

interface StatusBadgeProps {
  status: RouteSegment['status'];
  size?: 'sm' | 'md';
}

const statusConfig = {
  ok: { label: 'OK', color: 'bg-success', textColor: 'text-success', emoji: '' },
  tight: { label: 'Knapp', color: 'bg-warning', textColor: 'text-warning', emoji: '' },
  impossible: { label: 'Kritisch', color: 'bg-danger', textColor: 'text-danger', emoji: '' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${textSize} font-medium ${config.textColor}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span className={`${dotSize} rounded-full ${config.color} inline-block`} />
      {config.label}
    </span>
  );
}

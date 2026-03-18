import type { RouteSegment } from '../../types/index.ts';
import { t } from '../../lib/i18n/index.ts';

interface StatusBadgeProps {
  status: RouteSegment['status'];
  size?: 'sm' | 'md';
}

const statusConfig = {
  ok: { label: t.status.ok, color: 'bg-success', textColor: 'text-success', emoji: '' },
  tight: { label: t.status.tight, color: 'bg-warning', textColor: 'text-warning', emoji: '' },
  impossible: { label: t.status.impossible, color: 'bg-danger', textColor: 'text-danger', emoji: '' },
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

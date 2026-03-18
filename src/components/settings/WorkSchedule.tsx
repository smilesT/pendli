import type { WorkSchedule as WorkScheduleType } from '../../types/index.ts';
import { TimeInput } from '../common/TimeInput.tsx';
import { t } from '../../lib/i18n/index.ts';

interface WorkScheduleProps {
  schedule: WorkScheduleType;
  onChange: (schedule: WorkScheduleType) => void;
}

const DAYS = [
  { value: 1, label: t.days.short[1] },
  { value: 2, label: t.days.short[2] },
  { value: 3, label: t.days.short[3] },
  { value: 4, label: t.days.short[4] },
  { value: 5, label: t.days.short[5] },
  { value: 6, label: t.days.short[6] },
  { value: 0, label: t.days.short[0] },
];

export function WorkScheduleConfig({ schedule, onChange }: WorkScheduleProps) {
  function toggleDay(day: number) {
    const days = schedule.days.includes(day)
      ? schedule.days.filter((d) => d !== day)
      : [...schedule.days, day];
    onChange({ ...schedule, days });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-anthracite dark:text-dark-text mb-2">
          {t.setup.workDays}
        </label>
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                schedule.days.includes(day.value)
                  ? 'bg-sbb-red text-white'
                  : 'bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-slate dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-border'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <TimeInput
          label={t.setup.workStart}
          value={schedule.startTime}
          onChange={(startTime) => onChange({ ...schedule, startTime })}
        />
        <TimeInput
          label={t.setup.workEnd}
          value={schedule.endTime}
          onChange={(endTime) => onChange({ ...schedule, endTime })}
        />
      </div>
    </div>
  );
}

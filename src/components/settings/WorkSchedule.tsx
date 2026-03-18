import type { WorkSchedule as WorkScheduleType } from '../../types/index.ts';
import { TimeInput } from '../common/TimeInput.tsx';

interface WorkScheduleProps {
  schedule: WorkScheduleType;
  onChange: (schedule: WorkScheduleType) => void;
}

const DAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 0, label: 'So' },
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
        <label className="block text-sm font-medium text-anthracite mb-2">
          Arbeitstage
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
                  : 'bg-white border border-gray-200 text-slate hover:bg-gray-50'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <TimeInput
          label="Arbeitsbeginn"
          value={schedule.startTime}
          onChange={(startTime) => onChange({ ...schedule, startTime })}
        />
        <TimeInput
          label="Arbeitsende"
          value={schedule.endTime}
          onChange={(endTime) => onChange({ ...schedule, endTime })}
        />
      </div>
    </div>
  );
}

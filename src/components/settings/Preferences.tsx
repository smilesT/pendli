import { t } from '../../lib/i18n/index.ts';

interface PreferencesProps {
  bufferMinutes: number;
  onChange: (minutes: number) => void;
}

export function Preferences({ bufferMinutes, onChange }: PreferencesProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-anthracite dark:text-dark-text mb-2">
        {t.setup.buffer}: <span className="font-mono text-sbb-red">{bufferMinutes} {t.setup.bufferUnit}</span>
      </label>
      <input
        type="range"
        min={5}
        max={30}
        step={5}
        value={bufferMinutes}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-sbb-red"
      />
      <div className="flex justify-between text-xs text-slate dark:text-dark-muted mt-1 font-mono">
        <span>5</span>
        <span>10</span>
        <span>15</span>
        <span>20</span>
        <span>25</span>
        <span>30</span>
      </div>
    </div>
  );
}

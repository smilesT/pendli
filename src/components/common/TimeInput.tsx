interface TimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TimeInput({ label, value, onChange }: TimeInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-anthracite mb-1">
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-anthracite font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sbb-red/20 focus:border-sbb-red transition-colors"
      />
    </div>
  );
}

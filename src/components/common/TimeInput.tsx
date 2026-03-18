interface TimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TimeInput({ label, value, onChange }: TimeInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/[^0-9:]/g, '');
    // Auto-insert colon after 2 digits
    if (v.length === 2 && !v.includes(':')) v += ':';
    if (v.length > 5) v = v.slice(0, 5);
    onChange(v);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-anthracite dark:text-dark-text mb-1">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-2][0-9]:[0-5][0-9]"
        placeholder="08:00"
        maxLength={5}
        value={value}
        onChange={handleChange}
        className="w-20 px-3 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-anthracite dark:text-dark-text font-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-sbb-red/20 focus:border-sbb-red transition-colors"
      />
    </div>
  );
}

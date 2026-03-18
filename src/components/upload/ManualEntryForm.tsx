import { useState } from 'react';
import type { Appointment } from '../../types/index.ts';
import { t } from '../../lib/i18n/index.ts';
import { v4 as uuidv4 } from 'uuid';

interface ManualEntryFormProps {
  onAdd: (appointment: Appointment) => void;
}

export function ManualEntryForm({ onAdd }: ManualEntryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date || !startTime || !endTime || !location) return;

    const [year, month, day] = date.split('-').map(Number);
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    onAdd({
      id: uuidv4(),
      title,
      startTime: new Date(year, month - 1, day, startH, startM),
      endTime: new Date(year, month - 1, day, endH, endM),
      location,
    });

    setTitle('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full border border-dashed border-gray-300 dark:border-dark-border rounded-lg py-2.5 text-sm text-slate dark:text-dark-muted hover:text-anthracite dark:hover:text-dark-text hover:border-gray-400 dark:hover:border-dark-muted transition-colors"
      >
        {t.import.addManual}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-4 space-y-3">
      <input
        type="text"
        placeholder={t.import.titlePlaceholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 input-base placeholder-slate dark:placeholder-dark-muted"
        required
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full px-3 py-2 input-base font-mono"
        required
      />
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <label className="block text-xs text-slate dark:text-dark-muted mb-1">Von</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-2][0-9]:[0-5][0-9]"
            placeholder="09:00"
            maxLength={5}
            value={startTime}
            onChange={(e) => {
              let v = e.target.value.replace(/[^0-9:]/g, '');
              if (v.length === 2 && !v.includes(':') && v.length > startTime.length) v += ':';
              if (v.length > 5) v = v.slice(0, 5);
              setStartTime(v);
            }}
            className="w-full px-3 py-2 input-base font-mono text-center"
            required
          />
        </div>
        <span className="self-end pb-2.5 text-slate dark:text-dark-muted">&ndash;</span>
        <div className="flex-1 min-w-0">
          <label className="block text-xs text-slate dark:text-dark-muted mb-1">Bis</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-2][0-9]:[0-5][0-9]"
            placeholder="10:00"
            maxLength={5}
            value={endTime}
            onChange={(e) => {
              let v = e.target.value.replace(/[^0-9:]/g, '');
              if (v.length === 2 && !v.includes(':') && v.length > endTime.length) v += ':';
              if (v.length > 5) v = v.slice(0, 5);
              setEndTime(v);
            }}
            className="w-full px-3 py-2 input-base font-mono text-center"
            required
          />
        </div>
      </div>
      <input
        type="text"
        placeholder={t.import.locationPlaceholder}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full px-3 py-2 input-base placeholder-slate dark:placeholder-dark-muted"
        required
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-sbb-red text-white py-2 rounded-lg text-sm font-medium hover:bg-sbb-red/90 transition-colors"
        >
          {t.import.add}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-sm text-slate dark:text-dark-muted hover:text-anthracite dark:hover:text-dark-text transition-colors"
        >
          {t.import.cancel}
        </button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import type { Appointment } from '../../types/index.ts';
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
        className="w-full border border-dashed border-gray-300 rounded-lg py-2.5 text-sm text-slate hover:text-anthracite hover:border-gray-400 transition-colors"
      >
        + Termin manuell hinzufügen
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <input
        type="text"
        placeholder="Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sbb-red/20 focus:border-sbb-red"
        required
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sbb-red/20 focus:border-sbb-red"
        required
      />
      <div className="flex gap-3">
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sbb-red/20 focus:border-sbb-red"
          required
        />
        <span className="self-center text-slate">–</span>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sbb-red/20 focus:border-sbb-red"
          required
        />
      </div>
      <input
        type="text"
        placeholder="Ort / Adresse"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sbb-red/20 focus:border-sbb-red"
        required
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-sbb-red text-white py-2 rounded-lg text-sm font-medium hover:bg-sbb-red/90 transition-colors"
        >
          Hinzufügen
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-sm text-slate hover:text-anthracite transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

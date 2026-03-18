import { useState, useRef } from 'react';
import { parseICalFile } from '../../lib/parser/ical-parser.ts';
import { parseCSVFile } from '../../lib/parser/csv-parser.ts';
import type { Appointment } from '../../types/index.ts';

interface FileUploaderProps {
  onImport: (appointments: Appointment[], warnings: string[]) => void;
}

export function FileUploader({ onImport }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      let result;

      if (file.name.endsWith('.ics')) {
        result = parseICalFile(content);
      } else if (file.name.endsWith('.csv')) {
        result = parseCSVFile(content);
      } else {
        setError('Nur .ics und .csv Dateien werden unterstützt.');
        return;
      }

      if (result.appointments.length === 0) {
        setError(
          'Keine Termine gefunden. ' +
            (result.warnings.length > 0 ? result.warnings.join(' ') : '')
        );
        return;
      }

      onImport(result.appointments, result.warnings);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-sbb-red bg-sbb-red/5'
            : 'border-gray-300 dark:border-dark-border hover:border-sbb-red/50 hover:bg-gray-50 dark:hover:bg-dark-border'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".ics,.csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        <div className="text-4xl mb-3">{isDragging ? '\u{1F4E5}' : '\u{1F4C5}'}</div>
        <p className="text-sm font-medium text-anthracite dark:text-dark-text">
          {fileName || 'Kalender-Datei hierher ziehen'}
        </p>
        <p className="text-xs text-slate dark:text-dark-muted mt-1">.ics oder .csv</p>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}

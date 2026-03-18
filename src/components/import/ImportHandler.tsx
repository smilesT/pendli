import { useEffect, useState } from 'react';
import { useAppStore } from '../../lib/store/app-store.ts';
import { parseICalFile } from '../../lib/parser/ical-parser.ts';
import { parseTextToAppointment } from '../../lib/parser/text-parser.ts';

export function ImportHandler() {
  const { addAppointment, setStep } = useAppStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Importiere...');

  useEffect(() => {
    handleImport();
  }, []);

  async function handleImport() {
    try {
      // 1. Check share-target cache
      const cache = await caches.open('share-target');
      const response = await cache.match('/shared-data');
      if (response) {
        const data = await response.json();
        await cache.delete('/shared-data');

        if (data.type === 'ics') {
          const result = parseICalFile(data.content);
          result.appointments.forEach(apt => addAppointment(apt));
          setMessage(`${result.appointments.length} Termine importiert`);
          setStatus('success');
          setTimeout(() => setStep('import'), 2000);
          return;
        } else if (data.type === 'text') {
          const apt = parseTextToAppointment(data.content);
          if (apt) {
            addAppointment(apt);
            setMessage(`Termin "${apt.title}" importiert`);
            setStatus('success');
          } else {
            setMessage('Konnte keinen Termin aus dem Text erkennen');
            setStatus('error');
          }
          setTimeout(() => setStep('import'), 2000);
          return;
        }
      }

      // 2. Check query params
      const params = new URLSearchParams(globalThis.location?.search || '');
      const text = params.get('text');
      const title = params.get('title');
      if (text) {
        const apt = parseTextToAppointment(text);
        if (apt) {
          if (title) apt.title = title;
          addAppointment(apt);
          setMessage(`Termin "${apt.title}" importiert`);
          setStatus('success');
          setTimeout(() => setStep('import'), 2000);
          return;
        }
      }

      // 3. Check File Handler API
      if ('launchQueue' in globalThis) {
        (globalThis as any).launchQueue.setConsumer(async (launchParams: any) => {
          if (launchParams.files?.length > 0) {
            const fileHandle = launchParams.files[0];
            const file = await fileHandle.getFile();
            const content = await file.text();
            const result = parseICalFile(content);
            result.appointments.forEach(apt => addAppointment(apt));
            setMessage(`${result.appointments.length} Termine importiert`);
            setStatus('success');
            setTimeout(() => setStep('import'), 2000);
          }
        });
        // launchQueue is async — don't fall through to the "no data" case immediately
        // Give it a moment to fire, then show error if nothing happened
        setTimeout(() => {
          setStatus((prev) => {
            if (prev === 'loading') {
              setMessage('Keine Daten zum Importieren gefunden');
              return 'error';
            }
            return prev;
          });
          setTimeout(() => setStep('import'), 2000);
        }, 500);
        return;
      }

      setMessage('Keine Daten zum Importieren gefunden');
      setStatus('error');
      setTimeout(() => setStep('import'), 2000);
    } catch (e) {
      setMessage(`Fehler: ${e instanceof Error ? e.message : 'Unbekannt'}`);
      setStatus('error');
      setTimeout(() => setStep('import'), 2000);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-8 text-center shadow-sm max-w-sm w-full">
        {/* Status icon */}
        <div className="text-4xl mb-4">
          {status === 'loading' && (
            <div className="inline-block w-10 h-10 border-4 border-gray-300 dark:border-dark-border border-t-sbb-red rounded-full animate-spin" />
          )}
          {status === 'success' && (
            <svg className="inline-block w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'error' && (
            <svg className="inline-block w-10 h-10 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
            </svg>
          )}
        </div>

        {/* Message */}
        <p className={`text-sm font-medium ${
          status === 'success'
            ? 'text-success'
            : status === 'error'
              ? 'text-danger'
              : 'text-anthracite dark:text-dark-text'
        }`}>
          {message}
        </p>

        {status !== 'loading' && (
          <p className="text-xs text-slate dark:text-dark-muted mt-2">
            Weiterleitung in 2 Sekunden...
          </p>
        )}
      </div>
    </div>
  );
}

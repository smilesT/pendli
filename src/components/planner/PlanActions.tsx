import { useState } from 'react';
import type { DayPlan } from '../../types/index.ts';
import { generateICS } from '../../lib/export/ics-export.ts';
import { generateText } from '../../lib/export/text-format.ts';
import { formatDateISO } from '../../lib/planner/time-utils.ts';

interface PlanActionsProps {
  plan: DayPlan;
}

export function PlanActions({ plan }: PlanActionsProps) {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  async function handleCalendarExport() {
    const ics = generateICS(plan);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const fileName = `pendli-${formatDateISO(plan.date)}.ics`;

    // Try Web Share API with file support
    if (navigator.share) {
      const file = new File([blob], fileName, { type: 'text/calendar' });
      try {
        await navigator.share({
          title: 'pendli Tagesplan',
          files: [file],
        });
        showToast('Exportiert');
        return;
      } catch (e) {
        // User cancelled or share with files not supported — fall through to download
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exportiert');
  }

  async function handleTextShare() {
    const text = generateText(plan);

    // Try Web Share API (text only)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'pendli Tagesplan',
          text,
        });
        showToast('Geteilt');
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      showToast('Kopiert');
    } catch {
      // Last resort: prompt
      prompt('Plan kopieren:', text);
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCalendarExport}
          className="flex-1 flex items-center justify-center gap-2 bg-sbb-red text-white py-3 rounded-lg font-medium hover:bg-sbb-red/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          In Kalender
        </button>
        <button
          type="button"
          onClick={handleTextShare}
          className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-dark-border text-anthracite dark:text-dark-text py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-border transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Teilen
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-anthracite dark:bg-dark-card text-white dark:text-dark-text text-sm font-medium px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

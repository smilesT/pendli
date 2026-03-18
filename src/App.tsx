import { useAppStore } from './lib/store/app-store.ts';
import { Layout } from './components/layout/Layout.tsx';
import { AddressConfig } from './components/settings/AddressConfig.tsx';
import { WorkScheduleConfig } from './components/settings/WorkSchedule.tsx';
import { Preferences } from './components/settings/Preferences.tsx';
import { FileUploader } from './components/upload/FileUploader.tsx';
import { CalendarPreview } from './components/upload/CalendarPreview.tsx';
import { ManualEntryForm } from './components/upload/ManualEntryForm.tsx';
import { DayTimeline } from './components/planner/DayTimeline.tsx';
import type { ResolvedLocation, UserConfig, WorkSchedule, Appointment } from './types/index.ts';
import { useState } from 'react';

function SetupStep() {
  const { config, setConfig, setStep, loadDemoData } = useAppStore();

  const [homeAddress, setHomeAddress] = useState<ResolvedLocation | null>(
    config?.homeAddress || null
  );
  const [workAddress, setWorkAddress] = useState<ResolvedLocation | null>(
    config?.workAddress || null
  );
  const [schedule, setSchedule] = useState<WorkSchedule>(
    config?.workSchedule || {
      days: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '17:00',
    }
  );
  const [buffer, setBuffer] = useState(config?.bufferMinutes || 10);

  function handleNext() {
    if (!homeAddress || !workAddress) return;
    const newConfig: UserConfig = {
      homeAddress,
      workAddress,
      workSchedule: schedule,
      bufferMinutes: buffer,
    };
    setConfig(newConfig);
    setStep('import');
  }

  function handleDemo() {
    loadDemoData();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-anthracite dark:text-dark-text mb-1">Einrichtung</h2>
        <p className="text-sm text-slate dark:text-dark-muted">
          Konfiguriere deine Adressen und Arbeitszeiten.
        </p>
      </div>

      <AddressConfig
        homeAddress={homeAddress}
        workAddress={workAddress}
        onHomeChange={setHomeAddress}
        onWorkChange={setWorkAddress}
      />

      <WorkScheduleConfig schedule={schedule} onChange={setSchedule} />

      <Preferences bufferMinutes={buffer} onChange={setBuffer} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleNext}
          disabled={!homeAddress || !workAddress}
          className="flex-1 bg-sbb-red text-white py-3 rounded-lg font-medium hover:bg-sbb-red/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Weiter
        </button>
        <button
          type="button"
          onClick={handleDemo}
          className="px-6 py-3 border border-gray-300 dark:border-dark-border rounded-lg text-sm text-slate dark:text-dark-muted hover:text-anthracite dark:hover:text-dark-text hover:border-gray-400 dark:hover:border-dark-muted transition-colors"
        >
          Demo laden
        </button>
      </div>
    </div>
  );
}

function ImportStep() {
  const { appointments, setAppointments, addAppointment, removeAppointment, calculatePlan, setStep } = useAppStore();
  const [warnings, setWarnings] = useState<string[]>([]);

  function handleImport(newAppointments: Appointment[], newWarnings: string[]) {
    const existing = new Set(
      appointments.map((a) => `${a.title}|${a.startTime.getTime()}|${a.location}`)
    );
    const deduped = newAppointments.filter(
      (a) => !existing.has(`${a.title}|${a.startTime.getTime()}|${a.location}`)
    );
    setAppointments([...appointments, ...deduped]);
    setWarnings((prev) => [...prev, ...newWarnings]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-anthracite dark:text-dark-text mb-1">Termine importieren</h2>
        <p className="text-sm text-slate dark:text-dark-muted">
          Lade deinen Kalender hoch oder füge Termine manuell hinzu.
        </p>
      </div>

      <FileUploader onImport={handleImport} />

      {warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-warning">{w}</p>
          ))}
        </div>
      )}

      <CalendarPreview appointments={appointments} onRemove={removeAppointment} />

      <ManualEntryForm onAdd={addAppointment} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep('setup')}
          className="px-6 py-3 border border-gray-300 dark:border-dark-border rounded-lg text-sm text-slate dark:text-dark-muted hover:text-anthracite dark:hover:text-dark-text hover:border-gray-400 dark:hover:border-dark-muted transition-colors"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={calculatePlan}
          disabled={appointments.length === 0}
          className="flex-1 bg-sbb-red text-white py-3 rounded-lg font-medium hover:bg-sbb-red/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Route berechnen
        </button>
      </div>
    </div>
  );
}

function PlanStep() {
  const { calculationProgress } = useAppStore();

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      {/* Train animation */}
      <div className="relative w-40 h-16">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-300 dark:bg-dark-border" />
        <div className="absolute bottom-2 animate-bounce">
          <svg width="64" height="40" viewBox="0 0 64 40" fill="none">
            <rect x="4" y="4" width="56" height="28" rx="4" fill="#EB0000" />
            <rect x="8" y="8" width="14" height="10" rx="2" fill="#FAFAF8" />
            <rect x="26" y="8" width="14" height="10" rx="2" fill="#FAFAF8" />
            <rect x="44" y="8" width="8" height="10" rx="2" fill="#FAFAF8" />
            <circle cx="16" cy="36" r="4" fill="#1A1A2E" />
            <circle cx="48" cy="36" r="4" fill="#1A1A2E" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-lg font-bold text-anthracite dark:text-dark-text mb-2">
          Route wird berechnet...
        </h2>
        <p className="text-sm text-slate dark:text-dark-muted font-mono animate-pulse">
          {calculationProgress}
        </p>
      </div>
    </div>
  );
}

function ResultStep() {
  const { dayPlan, setStep, setAppointments } = useAppStore();

  if (!dayPlan) {
    return (
      <div className="text-center py-12">
        <p className="text-slate dark:text-dark-muted">Kein Tagesplan vorhanden.</p>
        <button
          type="button"
          onClick={() => setStep('setup')}
          className="mt-4 text-sbb-red hover:underline text-sm"
        >
          Zurück zum Start
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DayTimeline plan={dayPlan} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            setAppointments([]);
            setStep('import');
          }}
          className="flex-1 bg-anthracite dark:bg-dark-border text-white py-3 rounded-lg font-medium hover:bg-anthracite/90 dark:hover:bg-dark-muted transition-colors"
        >
          Neuen Tag planen
        </button>
        <button
          type="button"
          onClick={() => setStep('setup')}
          className="px-6 py-3 border border-gray-300 dark:border-dark-border rounded-lg text-sm text-slate dark:text-dark-muted hover:text-anthracite dark:hover:text-dark-text hover:border-gray-400 dark:hover:border-dark-muted transition-colors"
        >
          Einstellungen
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const currentStep = useAppStore((s) => s.currentStep);

  return (
    <Layout currentStep={currentStep}>
      {currentStep === 'setup' && <SetupStep />}
      {currentStep === 'import' && <ImportStep />}
      {currentStep === 'plan' && <PlanStep />}
      {currentStep === 'result' && <ResultStep />}
    </Layout>
  );
}

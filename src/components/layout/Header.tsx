import type { AppStep } from '../../lib/store/app-store.ts';
import { useThemeStore } from '../../lib/store/theme-store.ts';

interface HeaderProps {
  currentStep: AppStep;
}

const steps: { key: AppStep; label: string }[] = [
  { key: 'setup', label: 'Setup' },
  { key: 'import', label: 'Import' },
  { key: 'plan', label: 'Berechnung' },
  { key: 'result', label: 'Tagesplan' },
];

export function Header({ currentStep }: HeaderProps) {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);
  const { isDark, toggle } = useThemeStore();

  return (
    <header className="bg-anthracite dark:bg-dark-surface text-warm-white">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-sbb-red">pendli</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate font-mono uppercase tracking-wider hidden sm:inline">
              OeV-Tagesplaner
            </span>
            <button
              type="button"
              onClick={toggle}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 9.68A6.5 6.5 0 016.32 2 6.5 6.5 0 108 14.5a6.47 6.47 0 006-4.82z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 transition-colors ${
                    i <= currentIdx
                      ? 'bg-sbb-red text-white'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs hidden sm:inline transition-colors ${
                    i <= currentIdx ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px flex-1 mx-2 transition-colors ${
                    i < currentIdx ? 'bg-sbb-red' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

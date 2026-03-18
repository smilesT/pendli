import type { AppStep } from '../../lib/store/app-store.ts';

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

  return (
    <header className="bg-anthracite text-warm-white">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-sbb-red">pendli</span>
          </h1>
          <span className="text-xs text-slate font-mono uppercase tracking-wider">
            OeV-Tagesplaner
          </span>
        </div>

        {/* Step indicator */}
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

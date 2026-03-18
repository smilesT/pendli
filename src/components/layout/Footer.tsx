import { t } from '../../lib/i18n/index.ts';

declare const __APP_VERSION__: string;

export function Footer() {
  return (
    <footer className="bg-anthracite dark:bg-dark-surface text-warm-white/50 py-4 mt-auto">
      <div className="max-w-3xl mx-auto px-4 text-center text-xs font-mono">
        <p>
          {t.app.name} &mdash; {t.footer.dataVia}{' '}
          <a
            href="https://transport.opendata.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-warm-white/70 hover:text-sbb-red transition-colors underline"
          >
            transport.opendata.ch
          </a>
        </p>
        <p className="text-warm-white/20 text-[10px] mt-1">v{__APP_VERSION__}</p>
      </div>
    </footer>
  );
}

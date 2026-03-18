export function Footer() {
  return (
    <footer className="bg-anthracite text-warm-white/50 py-4 mt-auto">
      <div className="max-w-3xl mx-auto px-4 text-center text-xs font-mono">
        <p>
          pendli &mdash; Daten via{' '}
          <a
            href="https://transport.opendata.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="text-warm-white/70 hover:text-sbb-red transition-colors underline"
          >
            transport.opendata.ch
          </a>
        </p>
      </div>
    </footer>
  );
}

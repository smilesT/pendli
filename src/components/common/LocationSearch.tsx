import { useState, useRef, useEffect } from 'react';
import type { ResolvedLocation } from '../../types/index.ts';
import {
  debouncedSearchLocations,
  transportLocationToResolved,
} from '../../lib/api/transport-api.ts';
import type { TransportLocation } from '../../lib/api/types.ts';

interface LocationSearchProps {
  label: string;
  value: ResolvedLocation | null;
  onChange: (location: ResolvedLocation) => void;
  placeholder?: string;
}

export function LocationSearch({
  label,
  value,
  onChange,
  placeholder = 'Adresse oder Haltestelle suchen...',
}: LocationSearchProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState<TransportLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (val.length >= 2) {
      setIsLoading(true);
      debouncedSearchLocations(val, (res) => {
        setResults(res);
        setIsOpen(true);
        setIsLoading(false);
      });
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }

  function handleSelect(loc: TransportLocation) {
    const resolved = transportLocationToResolved(loc);
    onChange(resolved);
    setQuery(resolved.name);
    setIsOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-anthracite dark:text-dark-text mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-anthracite dark:text-dark-text placeholder-slate dark:placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-sbb-red/20 focus:border-sbb-red transition-colors"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate/30 border-t-sbb-red rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((loc, i) => (
            <li key={`${loc.name}-${i}`}>
              <button
                type="button"
                onClick={() => handleSelect(loc)}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-dark-border flex items-center gap-3 transition-colors"
              >
                <span className="text-lg flex-shrink-0">
                  {loc.type === 'station' ? '\u{1F689}' : '\u{1F4CD}'}
                </span>
                <span className="text-sm text-anthracite dark:text-dark-text truncate">
                  {loc.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

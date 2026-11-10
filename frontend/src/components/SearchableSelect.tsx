import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface SearchableOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  value: string | number;
  options: SearchableOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => String(option.value) === String(value));
  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(!open); setQuery(''); }}
        className={[
          'w-full flex items-center justify-between border rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50',
          compact
            ? 'px-2.5 py-1.75 bg-slate-50 border-slate-200 text-[11px] font-semibold'
            : 'px-3.5 py-2.5 bg-slate-50 border-slate-200 text-xs font-semibold',
        ].join(' ')}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close options" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div className={`absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl ${compact ? 'p-1.5' : 'p-2'}`}>
            <div className="relative mb-2">
              <Search className={`absolute left-2.5 top-2.5 text-slate-400 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type to filter..."
                className={compact
                  ? 'w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500'
                  : 'w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500'}
              />
            </div>
            <div className={compact ? 'max-h-40 overflow-y-auto' : 'max-h-52 overflow-y-auto'}>
              {filteredOptions.length === 0 ? (
                <div className="px-2 py-3 text-xs text-slate-400">No matching options</div>
              ) : filteredOptions.map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => { onChange(String(option.value)); setOpen(false); }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-700 hover:bg-emerald-50"
                >
                  <span className="truncate">{option.label}</span>
                  {String(option.value) === String(value) && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

'use client';

import { useState, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';

export interface MultiSelectOption {
  value: string | number;
  label: string;
}

interface SearchableMultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableMultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = 'Auswählen…',
  searchPlaceholder = 'Suchen...',
  disabled = false,
  className = '',
}: SearchableMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    let filtered = options;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(term) ||
          String(opt.value).toLowerCase().includes(term),
      );
    }
    return [...filtered].sort((a, b) => a.label.localeCompare(b.label, 'de-DE'));
  }, [options, searchTerm]);

  const selectedSet = useMemo(
    () => new Set(selectedValues.map(String)),
    [selectedValues],
  );

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [String(o.value), o.label]));
    return selectedValues.map((v) => ({ value: v, label: map.get(String(v)) ?? String(v) }));
  }, [options, selectedValues]);

  const toggle = useCallback(
    (value: string | number) => {
      const strVal = String(value);
      if (selectedSet.has(strVal)) {
        onChange(selectedValues.filter((v) => String(v) !== strVal));
      } else {
        onChange([...selectedValues, value]);
      }
    },
    [selectedValues, selectedSet, onChange],
  );

  const selectAll = useCallback(() => {
    const allVisible = filteredOptions.map((o) => o.value);
    const merged = new Set([...selectedValues.map(String), ...allVisible.map(String)]);
    onChange(Array.from(merged));
  }, [filteredOptions, selectedValues, onChange]);

  const deselectAll = useCallback(() => {
    const visibleSet = new Set(filteredOptions.map((o) => String(o.value)));
    onChange(selectedValues.filter((v) => !visibleSet.has(String(v))));
  }, [filteredOptions, selectedValues, onChange]);

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Selected tags */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selectedLabels.map((item) => (
            <span
              key={item.value}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {item.label}
              <button
                type="button"
                onClick={() => toggle(item.value)}
                disabled={disabled}
                className="hover:text-red-600 disabled:cursor-not-allowed"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
      />

      {/* Select all / deselect all */}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled}
          className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Alle auswählen ({filteredOptions.length})
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={deselectAll}
          disabled={disabled}
          className="text-gray-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Auswahl aufheben
        </button>
        {selectedValues.length > 0 && (
          <span className="ml-auto text-gray-400">{selectedValues.length} ausgewählt</span>
        )}
      </div>

      {/* Checkbox list */}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white">
        {filteredOptions.length === 0 ? (
          <p className="px-3 py-2 text-sm text-gray-400">{placeholder}</p>
        ) : (
          filteredOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(String(opt.value))}
                onChange={() => toggle(opt.value)}
                disabled={disabled}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              {opt.label}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

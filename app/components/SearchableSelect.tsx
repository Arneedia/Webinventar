'use client';

import { useState, useMemo } from 'react';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  sortAlphabetically?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '-- Auswählen --',
  searchPlaceholder = 'Suchen...',
  required = false,
  disabled = false,
  className = '',
  emptyLabel = '',
  sortAlphabetically = true,
}: SearchableSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSortedOptions = useMemo(() => {
    let filtered = options;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(term) ||
          String(opt.value).toLowerCase().includes(term)
      );
    }

    // Sort alphabetically if enabled
    if (sortAlphabetically) {
      filtered = [...filtered].sort((a, b) =>
        a.label.localeCompare(b.label, 'de-DE')
      );
    }

    return filtered;
  }, [options, searchTerm, sortAlphabetically]);

  return (
    <div className="space-y-1">
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
      >
        <option value="">{emptyLabel || placeholder}</option>
        {filteredAndSortedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

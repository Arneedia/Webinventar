'use client';

import { useState, useMemo } from 'react';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectWithCustomProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  customPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  sortAlphabetically?: boolean;
  allowCustom?: boolean;
}

export default function SearchableSelectWithCustom({
  options,
  value,
  onChange,
  placeholder = '-- Auswählen --',
  searchPlaceholder = 'Suchen...',
  customPlaceholder = 'Oder eigenen Wert eingeben...',
  required = false,
  disabled = false,
  className = '',
  emptyLabel = '',
  sortAlphabetically = true,
  allowCustom = true,
}: SearchableSelectWithCustomProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [useCustom, setUseCustom] = useState(false);

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

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === '__custom__') {
      setUseCustom(true);
      onChange(customValue);
    } else {
      setUseCustom(false);
      onChange(selectedValue);
    }
  };

  const handleCustomValueChange = (newCustomValue: string) => {
    setCustomValue(newCustomValue);
    if (useCustom) {
      onChange(newCustomValue);
    }
  };

  // Prüfen ob der aktuelle Wert in den Optionen existiert
  const valueExistsInOptions = options.some(opt => String(opt.value) === value || opt.label === value);

  return (
    <div className="space-y-1">
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
      />
      <select
        value={useCustom || !valueExistsInOptions ? '__custom__' : value}
        onChange={(e) => handleSelectChange(e.target.value)}
        required={required && !allowCustom}
        disabled={disabled}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
      >
        <option value="">{emptyLabel || placeholder}</option>
        {filteredAndSortedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {allowCustom && (
          <option value="__custom__">
            {useCustom || !valueExistsInOptions ? '✓ Eigener Wert' : '+ Eigenen Wert eingeben'}
          </option>
        )}
      </select>
      {allowCustom && (useCustom || !valueExistsInOptions) && (
        <input
          type="text"
          placeholder={customPlaceholder}
          value={useCustom || !valueExistsInOptions ? value : customValue}
          onChange={(e) => {
            setUseCustom(true);
            handleCustomValueChange(e.target.value);
          }}
          required={required}
          disabled={disabled}
          className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        />
      )}
    </div>
  );
}

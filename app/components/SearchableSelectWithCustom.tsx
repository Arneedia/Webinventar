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

const CUSTOM = '__custom__';

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
  const [customMode, setCustomMode] = useState(false);

  const filteredAndSortedOptions = useMemo(() => {
    let filtered = options;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(term) ||
          String(opt.value).toLowerCase().includes(term)
      );
    }

    if (sortAlphabetically) {
      filtered = [...filtered].sort((a, b) => a.label.localeCompare(b.label, 'de-DE'));
    }

    return filtered;
  }, [options, searchTerm, sortAlphabetically]);

  const valueExistsInOptions = options.some((opt) => String(opt.value) === value);
  // Freitext-Modus: explizit gewählt oder ein vorhandener Wert, der nicht in der Liste steht
  const isCustom = allowCustom && (customMode || (value !== '' && !valueExistsInOptions));

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === CUSTOM) {
      setCustomMode(true);
      onChange(searchTerm.trim());
      return;
    }
    setCustomMode(false);
    onChange(selectedValue);
  };

  const inputClass = `w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`;

  return (
    <div className="space-y-1">
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={disabled}
        className={inputClass}
      />
      <select
        value={isCustom ? CUSTOM : value}
        onChange={(e) => handleSelectChange(e.target.value)}
        required={required && !isCustom}
        disabled={disabled}
        className={inputClass}
      >
        <option value="">{emptyLabel || placeholder}</option>
        {filteredAndSortedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {allowCustom && (
          <option value={CUSTOM}>{isCustom ? '✓ Eigener Wert' : '+ Eigenen Wert eingeben'}</option>
        )}
      </select>
      {isCustom && (
        <input
          type="text"
          placeholder={customPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          autoFocus={customMode}
          className={inputClass}
        />
      )}
    </div>
  );
}

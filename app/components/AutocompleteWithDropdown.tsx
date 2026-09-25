'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

interface Option {
  id: number | string;
  name: string;
}

interface AutocompleteWithDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => Promise<string[]>;
  options: Option[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  onDropdownSelect?: (option: Option) => void;
}

export default function AutocompleteWithDropdown({
  value,
  onChange,
  onSearch,
  options,
  placeholder = 'Eingeben oder auswählen...',
  label,
  required = false,
  disabled = false,
  onDropdownSelect,
}: AutocompleteWithDropdownProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleInputChange(inputValue: string) {
    onChange(inputValue);

    if (inputValue.length >= 1) {
      setLoading(true);
      try {
        const results = await onSearch(inputValue);
        setSuggestions(results);
        setShowSuggestions(true);
        setShowDropdown(false);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function handleSuggestionClick(suggestion: string) {
    onChange(suggestion);
    setShowSuggestions(false);
  }

  function handleClear() {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setDropdownSearch('');
  }

  function handleDropdownToggle() {
    if (disabled) return;
    setShowDropdown(!showDropdown);
    setShowSuggestions(false);
    setDropdownSearch('');
  }

  function handleDropdownSelect(option: Option) {
    onChange(option.name);
    setShowDropdown(false);
    setDropdownSearch('');
    if (onDropdownSelect) {
      onDropdownSelect(option);
    }
  }

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full px-3 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          )}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Löschen"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDropdownToggle}
            disabled={disabled}
            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:cursor-not-allowed"
            title="Dropdown öffnen"
          >
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {showSuggestions && !loading && suggestions.length === 0 && value.length >= 1 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
          Keine Vorschläge gefunden
        </div>
      )}

      {/* Dropdown Options */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              value={dropdownSearch}
              onChange={(e) => setDropdownSearch(e.target.value)}
              placeholder="Suchen..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Keine Optionen gefunden</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleDropdownSelect(option)}
                  className="w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  {option.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

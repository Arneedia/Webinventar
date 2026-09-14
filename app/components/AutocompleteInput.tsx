'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => Promise<string[]>;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function AutocompleteInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Eingeben oder auswählen...',
  label,
  required = false,
  disabled = false,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
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
  }

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
          className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>

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
    </div>
  );
}

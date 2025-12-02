'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Input } from './input';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AutocompleteOption = {
  id: string;
  label: string;
  subtitle?: string;
  imageUrl?: string;
  [key: string]: any;
};

type AutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  fetchOptions: (query: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  minLength?: number;
  debounceMs?: number;
  className?: string;
  renderOption?: (option: AutocompleteOption) => React.ReactNode;
  getOptionLabel?: (option: AutocompleteOption) => string;
};

export function Autocomplete({
  value,
  onChange,
  onSelect,
  fetchOptions,
  placeholder = 'Search...',
  minLength = 2,
  debounceMs = 300,
  className,
  renderOption,
  getOptionLabel = (opt) => opt.label,
}: AutocompleteProps) {
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.length < minLength) {
      setOptions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await fetchOptions(value);
        setOptions(results);
        setShowDropdown(results.length > 0);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Autocomplete fetch error:', error);
        setOptions([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, minLength, debounceMs, fetchOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || options.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  const handleSelect = (option: AutocompleteOption) => {
    onSelect(option);
    setShowDropdown(false);
    setOptions([]);
    onChange('');
  };

  const defaultRenderOption = (option: AutocompleteOption, index: number) => (
    <div
      key={option.id}
      className={cn(
        'flex items-center gap-3 p-3 cursor-pointer transition',
        index === highlightedIndex
          ? 'bg-primary/20 text-foreground'
          : 'hover:bg-white/5 text-muted hover:text-foreground'
      )}
      onClick={() => handleSelect(option)}
      onMouseEnter={() => setHighlightedIndex(index)}
    >
      {option.imageUrl && (
        <div className="relative h-12 w-8 flex-shrink-0 rounded overflow-hidden border border-white/10">
          <img
            src={option.imageUrl}
            alt={getOptionLabel(option)}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{getOptionLabel(option)}</p>
        {option.subtitle && (
          <p className="text-sm text-muted truncate">{option.subtitle}</p>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative z-[9999]">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (options.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="w-full"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        )}
      </div>

      {showDropdown && options.length > 0 && (
        <div className="absolute z-[9999] mt-2 w-full max-h-96 overflow-y-auto rounded-lg border border-white/20 bg-background shadow-lg">
          {options.map((option, index) =>
            renderOption ? (
              <div key={option.id} onClick={() => handleSelect(option)}>
                {renderOption(option)}
              </div>
            ) : (
              defaultRenderOption(option, index)
            )
          )}
        </div>
      )}
    </div>
  );
}


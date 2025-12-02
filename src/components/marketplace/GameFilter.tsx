'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

type GameOption = {
  label: string;
  value: string;
};

type GameFilterProps = {
  options: GameOption[];
  selectedValue?: string;
};

export function GameFilter({ options, selectedValue }: GameFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (value === 'all') {
      params.delete('game');
    } else {
      params.set('game', value);
    }
    const queryString = params.toString();
    const target = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(target);
    setOpen(false);
  };

  const selectedLabel = options.find((option) => option.value === selectedValue)?.label;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
      >
        {selectedLabel || 'Select Card Game'}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && (
        <div className="absolute left-0 z-40 mt-2 w-64 rounded-2xl border border-white/10 bg-gray-900/90 p-4 shadow-2xl backdrop-blur">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gray-400">Card Games</p>
          <div className="grid gap-2">
            {options.map((option) => {
              const isSelected = option.value === selectedValue;
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'secondary'}
                  onClick={() => handleSelect(option.value)}
                  className={`justify-start border ${isSelected ? 'border-primary' : 'border-white/10'} text-left`}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


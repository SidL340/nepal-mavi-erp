'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  code?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  searchPlaceholder?: string;
}

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = '-- Select --',
  disabled = false,
  required = false,
  className = '',
  searchPlaceholder = 'Search...',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      (opt.code && opt.code.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Hidden input for form required validation */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={() => {}}
          required={required}
          className="absolute opacity-0 pointer-events-none h-0 w-0"
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 focus:border-[#1e3a5f] focus:outline-hidden shadow-2xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'ring-2 ring-[#1e3a5f]/20 border-[#1e3a5f]' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 truncate text-left">
          {selectedOption ? (
            <span className="truncate">
              {selectedOption.code && (
                <span className="font-mono text-blue-700 font-extrabold mr-1">
                  [{selectedOption.code}]
                </span>
              )}
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-gray-400 font-normal ml-1">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400 font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform shrink-0 ml-1 ${
            isOpen ? 'rotate-180 text-[#1e3a5f]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[70] mt-1 w-full min-w-[220px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl text-xs space-y-1 max-h-60 overflow-hidden flex flex-col">
          {/* Search Box */}
          <div className="relative shrink-0">
            <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-gray-200 bg-slate-50 pl-7 pr-7 py-1.5 text-xs font-medium focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Option List */}
          <div className="overflow-y-auto max-h-48 divide-y divide-gray-50 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-gray-400 italic text-[11px]">
                No options match "{search}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                      isSelected
                        ? 'bg-blue-50 text-[#1e3a5f] font-extrabold'
                        : 'hover:bg-slate-100 text-gray-700'
                    }`}
                  >
                    <div className="truncate">
                      {opt.code && (
                        <span className="font-mono text-blue-700 font-bold mr-1">
                          [{opt.code}]
                        </span>
                      )}
                      <span>{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[11px] text-gray-400 ml-1 block font-normal">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="text-[#1e3a5f] shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

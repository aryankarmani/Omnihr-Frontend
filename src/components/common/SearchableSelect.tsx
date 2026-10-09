import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search, Check } from 'lucide-react';

export interface SelectOption {
    label: string;
    value: string;
    subLabel?: string;
    flag?: string;
}

interface SearchableSelectProps {
    label?: string;
    placeholder?: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string, option?: SelectOption) => void;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    searchPlaceholder?: string;
}

export default function SearchableSelect({
    label,
    placeholder = 'Select option...',
    options,
    value,
    onChange,
    disabled = false,
    required = false,
    className = '',
    searchPlaceholder = 'Type to search...'
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Selected option object
    const selectedOption = useMemo(() => {
        return options.find(opt => opt.value === value || opt.label === value);
    }, [options, value]);

    // Filter options based on search query (case-insensitive)
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const q = searchTerm.toLowerCase().trim();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(q) ||
            (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
            opt.value.toLowerCase().includes(q)
        );
    }, [options, searchTerm]);

    // Handle outside click to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (opt: SelectOption) => {
        onChange(opt.value, opt);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">
                    {label} {required && <span className="text-[#DE350B]">*</span>}
                </label>
            )}

            {/* Display Box / Trigger Button */}
            <div
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        if (!isOpen) setSearchTerm('');
                    }
                }}
                className={`w-full min-h-[38px] px-3 py-2 border rounded-[7px] text-[13.5px] flex items-center justify-between gap-2 transition-all select-none ${
                    disabled
                        ? 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 text-gray-400 cursor-not-allowed opacity-60'
                        : isOpen
                        ? 'bg-white dark:bg-[#12151C] border-[#2C4FD6] ring-1 ring-[#2C4FD6]/30 text-[#12151C] dark:text-white cursor-pointer shadow-xs'
                        : 'bg-white dark:bg-[#12151C] border-[#E2E6ED] dark:border-gray-700 hover:border-[#CBD2DC] text-[#12151C] dark:text-white cursor-pointer'
                }`}
            >
                <div className="flex items-center gap-2 truncate flex-1">
                    {selectedOption?.flag && <span className="text-base leading-none">{selectedOption.flag}</span>}
                    <span className={`truncate ${!selectedOption ? 'text-[#9AA3B1] dark:text-gray-500 italic' : 'font-medium'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    {selectedOption?.subLabel && (
                        <span className="text-xs text-[#9AA3B1] font-normal truncate">
                            ({selectedOption.subLabel})
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[#9AA3B1]">
                    {selectedOption && !disabled && (
                        <span
                            onClick={handleClear}
                            className="p-0.5 hover:text-[#DE350B] hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </span>
                    )}
                    <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#2C4FD6]' : ''}`} />
                </div>
            </div>

            {/* Search Dropdown Overlay */}
            {isOpen && !disabled && (
                <div className="absolute z-[99999] top-full left-0 right-0 mt-1 bg-white dark:bg-[#161B26] border border-[#E2E6ED] dark:border-gray-800 rounded-[8px] shadow-xl overflow-hidden animate-scale-in">
                    {/* Search Input Header */}
                    <div className="p-2 border-b border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA] dark:bg-white/5 flex items-center gap-2">
                        <Search size={14} className="text-[#9AA3B1] shrink-0 ml-1" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full bg-transparent border-0 outline-none text-[13px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] py-1"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white p-0.5"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Options List */}
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800/40">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const isSelected = opt.value === value || opt.label === value;
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleSelect(opt)}
                                        className={`px-3 py-2 text-[13px] flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-[#EEF2FD] dark:bg-blue-950/40 text-[#2C4FD6] dark:text-blue-400 font-semibold'
                                                : 'text-[#12151C] dark:text-gray-200 hover:bg-[#F7F8FA] dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            {opt.flag && <span className="text-sm shrink-0">{opt.flag}</span>}
                                            <span className="truncate">{opt.label}</span>
                                            {opt.subLabel && (
                                                <span className="text-[11.5px] text-[#9AA3B1] font-normal truncate">
                                                    ({opt.subLabel})
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check size={14} className="text-[#2C4FD6] dark:text-blue-400 shrink-0" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-[#9AA3B1] text-xs italic">
                                No matching results for "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// components/CustomAutocomplete/CustomAutocomplete.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './CustomAutocomplete.module.css';

interface Option {
  id: string;
  name: string;
}

interface CustomAutocompleteProps {
  options: Option[];
  value: Option | null;
  onChange: (value: Option | null) => void;
  placeholder?: string;
  disabled?: boolean;
  noOptionsText?: string;
}

export default function CustomAutocomplete({
  options,
  value,
  onChange,
  placeholder = 'Поиск...',
  disabled = false,
  noOptionsText = 'Ничего не найдено'
}: CustomAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    onChange(option);
    setSearch('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        e.preventDefault();
        break;
      case 'ArrowUp':
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        e.preventDefault();
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        e.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div 
      ref={wrapperRef} 
      className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}
    >
      <div className={styles.inputWrapper}>
        {value ? (
          <span className={styles.selectedValue}>{value.name}</span>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={styles.input}
          />
        )}
        <div className={styles.icons}>
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
              tabIndex={-1}
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={`${styles.arrowButton} ${isOpen ? styles.arrowOpen : ''}`}
            disabled={disabled}
            tabIndex={-1}
          >
            ▼
          </button>
        </div>
      </div>
      
      {isOpen && !disabled && (
        <div className={styles.dropdown}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option.id}
                className={`${styles.option} ${
                  index === highlightedIndex ? styles.highlighted : ''
                } ${value?.id === option.id ? styles.selected : ''}`}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option.name}
              </div>
            ))
          ) : (
            <div className={styles.noOptions}>{noOptionsText}</div>
          )}
        </div>
      )}
    </div>
  );
}
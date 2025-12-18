// Custom Select Component - Design Moderno
import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Selecione...",
  disabled = false,
  className = "",
  onCreateNew = null,
  createNewLabel = "+ Criar novo"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fechar com ESC
  useEffect(() => {
    function handleEsc(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  if (disabled) {
    return (
      <div className={`flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-400 ${className}`}>
        <span>{displayText}</span>
        <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
          isOpen
            ? 'border-indigo-500 bg-indigo-50/50 text-slate-900 ring-2 ring-indigo-500/20'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
          {displayText}
        </span>
        <svg 
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
          role="listbox"
        >
          {/* Botão Criar Novo */}
          {onCreateNew && (
            <button
              type="button"
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 text-left text-sm font-semibold text-indigo-700 transition-all hover:from-indigo-100 hover:to-purple-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{createNewLabel}</span>
            </button>
          )}

          {options.length === 0 ? (
            <div className="px-4 py-3 text-center text-sm text-slate-400">
              Nenhuma opção disponível
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                      {option.label}
                    </p>
                    {option.subtitle && (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {option.subtitle}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <svg className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * Select con búsqueda por texto — usable en móvil y desktop
 */
export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Buscar o seleccionar...',
  getOptionLabel = (opt) => opt.label ?? opt.nombre ?? String(opt),
  getOptionValue = (opt) => opt.value ?? opt.nombre ?? opt,
  renderOption,
  disabled = false,
  clearable = true,
  allowCustom = false,
  onNotFound,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((opt) => getOptionValue(opt) === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const label = getOptionLabel(opt).toLowerCase();
      const searchText = (opt.searchText || label).toLowerCase();
      const extra = opt.potencia != null ? `${opt.potencia}w` : '';
      return searchText.includes(q) || label.includes(q) || extra.includes(q);
    });
  }, [options, query, getOptionLabel]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const selectOption = (opt) => {
    onChange(getOptionValue(opt), opt);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlightIndex]) {
      e.preventDefault();
      selectOption(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const displayValue = open
    ? query
    : selectedOption
      ? getOptionLabel(selectedOption)
      : (value || '');

  const showCustomOption = allowCustom
    && query.trim()
    && !filtered.some((opt) => getOptionLabel(opt).toLowerCase() === query.trim().toLowerCase());

  const useCustomValue = () => {
    const custom = query.trim();
    if (!custom) return;
    onChange(custom, null);
    setOpen(false);
    setQuery('');
  };

  return (
    <div
      className={`searchable-select ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
      ref={containerRef}
    >
      <div className="searchable-select-control" onClick={() => !disabled && setOpen(true)}>
        <Search size={16} className="searchable-select-icon" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          className="searchable-select-input"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value && selectedOption && clearable) onChange('', null);
          }}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
        />
        {clearable && value && !open && (
          <button type="button" className="searchable-select-clear" onClick={handleClear} aria-label="Limpiar">
            <X size={14} />
          </button>
        )}
        <ChevronDown size={16} className={`searchable-select-chevron ${open ? 'rotated' : ''}`} aria-hidden />
      </div>

      {open && (
        <ul className="searchable-select-dropdown" role="listbox">
          {filtered.length === 0 ? (
            <li className="searchable-select-empty">
              No se encontraron resultados
              {(onNotFound || allowCustom) && query.trim() && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'block', margin: '0.75rem auto 0', width: 'auto' }}
                  onClick={() => {
                    if (onNotFound) onNotFound(query);
                    else useCustomValue();
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  + Usar «{query.trim()}»
                </button>
              )}
            </li>
          ) : (
            <>
            {filtered.map((opt, index) => (
              <li
                key={opt.id ?? getOptionValue(opt)}
                role="option"
                aria-selected={index === highlightIndex}
                className={`searchable-select-option ${index === highlightIndex ? 'highlighted' : ''} ${getOptionValue(opt) === value ? 'selected' : ''}`}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectOption(opt)}
              >
                {renderOption ? renderOption(opt) : getOptionLabel(opt)}
              </li>
            ))}
            {showCustomOption && (
              <li
                role="option"
                className="searchable-select-option searchable-select-option--custom"
                onClick={useCustomValue}
              >
                + Usar «{query.trim()}»
              </li>
            )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}

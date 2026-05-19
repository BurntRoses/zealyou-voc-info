import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2 } from 'lucide-react';

export function TimeZonePicker({ zones, value, clock, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = zones.find((zone) => zone.value === value) ?? zones[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.type === 'pointerdown' && rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    window.addEventListener('pointerdown', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('pointerdown', close);
    };
  }, [open]);

  return (
    <div className={`timezone-picker ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button
        className="timezone-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selected.label}
        onClick={() => setOpen((current) => !current)}
      >
        <Globe2 size={13} aria-hidden="true" />
        <span>{selected.shortLabel}</span>
        <strong>{clock}</strong>
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open ? (
        <div className="timezone-menu" role="listbox" aria-label="第二时区">
          {zones.map((zone) => {
            const isSelected = zone.value === value;
            return (
              <button
                className={isSelected ? 'is-selected' : ''}
                key={zone.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange?.(zone.value);
                  setOpen(false);
                }}
              >
                <span className="timezone-option-mark">
                  {isSelected ? <Check size={13} aria-hidden="true" /> : null}
                </span>
                <strong>{zone.label}</strong>
                <em>{zone.value.replace('_', ' ')}</em>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

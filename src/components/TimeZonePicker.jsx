import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2, Search } from 'lucide-react';
import { isValidTimeZone } from '../domain/formatters.js';

export function TimeZonePicker({ zones, value, clock, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const supportedZones = useMemo(() => getSupportedTimeZones(), []);
  const selected = useMemo(() => buildZoneOption(value, zones), [value, zones]);
  const visibleZones = useMemo(
    () => filterTimeZones({ query, zones, supportedZones, selected }),
    [query, zones, supportedZones, selected],
  );

  const selectZone = (nextZone) => {
    const resolved = resolveTimeZone(nextZone, supportedZones);
    if (!resolved) return;
    onChange?.(resolved);
    setQuery('');
    setOpen(false);
  };

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
    <div
      className={`timezone-picker ${open ? 'is-open' : ''}`}
      ref={rootRef}
      onPointerDown={(event) => event.stopPropagation()}
    >
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
          <label className="timezone-search">
            <Search size={13} aria-hidden="true" />
            <input
              value={query}
              placeholder="搜索 / IANA"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                selectZone(visibleZones[0]?.value ?? query);
              }}
            />
          </label>

          <div className="timezone-options">
            {visibleZones.map((zone) => {
              const isSelected = zone.value === selected.value;
              return (
                <button
                  className={isSelected ? 'is-selected' : ''}
                  key={zone.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectZone(zone.value);
                  }}
                  onClick={() => selectZone(zone.value)}
                >
                  <span className="timezone-option-mark">
                    {isSelected ? <Check size={13} aria-hidden="true" /> : null}
                  </span>
                  <strong>{zone.label}</strong>
                  <em>{zone.value.replaceAll('_', ' ')}</em>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function filterTimeZones({ query, zones, supportedZones, selected }) {
  const normalizedQuery = query.trim().toLowerCase();
  const presets = dedupeZones([selected, ...zones.map((zone) => buildZoneOption(zone.value, zones))]);
  if (!normalizedQuery) return presets.slice(0, 14);

  const matches = supportedZones
    .filter((zone) => zone.toLowerCase().includes(normalizedQuery))
    .map((zone) => buildZoneOption(zone, zones));
  const exact = resolveTimeZone(query, supportedZones);
  return dedupeZones([
    ...(exact ? [buildZoneOption(exact, zones)] : []),
    ...presets.filter((zone) => matchesQuery(zone, normalizedQuery)),
    ...matches,
  ]).slice(0, 18);
}

function matchesQuery(zone, query) {
  return `${zone.value} ${zone.label} ${zone.shortLabel}`.toLowerCase().includes(query);
}

function buildZoneOption(value, zones) {
  const zone = zones.find((item) => item.value === value);
  if (zone) return zone;
  const fallbackValue = isValidTimeZone(value) ? value : 'Asia/Shanghai';
  const city = fallbackValue.split('/').pop()?.replaceAll('_', ' ') ?? fallbackValue;
  return {
    value: fallbackValue,
    label: fallbackValue === 'UTC' ? 'UTC' : `${city} 时间`,
    shortLabel: fallbackValue === 'UTC' ? 'UTC' : city,
  };
}

function getSupportedTimeZones() {
  if (typeof Intl.supportedValuesOf === 'function') {
    return ['UTC', ...Intl.supportedValuesOf('timeZone')];
  }
  return [
    'UTC',
    'Pacific/Honolulu',
    'America/Anchorage',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Singapore',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];
}

function resolveTimeZone(value, supportedZones) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  const exact = supportedZones.find((zone) => zone.toLowerCase() === trimmed.toLowerCase());
  if (exact && isValidTimeZone(exact)) return exact;
  if (isValidTimeZone(trimmed)) {
    return new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).resolvedOptions().timeZone;
  }
  return '';
}

function dedupeZones(zones) {
  const seen = new Set();
  return zones.filter((zone) => {
    if (!zone?.value || seen.has(zone.value)) return false;
    seen.add(zone.value);
    return true;
  });
}

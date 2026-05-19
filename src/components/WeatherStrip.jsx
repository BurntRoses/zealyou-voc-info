import { CloudSun, Droplets, Thermometer, Wind } from 'lucide-react';
import { formatDateTime, getWeatherSnapshot, localeForLanguage, translateForecast } from '../domain/formatters.js';

export function WeatherStrip({ weather, alerts, timeZone, language = 'zh' }) {
  const snapshot = getWeatherSnapshot(weather);
  const locale = localeForLanguage(language);
  const copy = language === 'en'
    ? {
        empty: 'NOAA/NWS point weather is unavailable',
        wind: 'Wind',
        precipitation: 'Rain',
        temperature: 'Temp',
        normal: 'Normal',
        low: 'Low',
        mid: 'Medium',
        high: 'High',
      }
    : {
        empty: 'NOAA/NWS 暂无点位天气',
        wind: '风',
        precipitation: '降水',
        temperature: '气温',
        normal: '正常',
        low: '低',
        mid: '中',
        high: '高',
      };

  if (!snapshot.current) {
    return (
      <div className="weather-strip is-empty">
        <CloudSun size={18} aria-hidden="true" />
        <span>{copy.empty}</span>
      </div>
    );
  }

  const summary = translateForecast(snapshot.current.shortForecast, language);
  const precip = Number(snapshot.current.precipitationChance ?? 0);
  const windKmh = parseMaxNumber(snapshot.wind);
  const weatherMetrics = [
    {
      key: 'temp',
      icon: Thermometer,
      label: copy.temperature,
      value: snapshot.celsius == null ? '--' : `${snapshot.celsius}°C`,
      level: temperatureLevel(snapshot.celsius, copy),
      tone: temperatureTone(snapshot.celsius),
      ratio: temperatureRatio(snapshot.celsius),
    },
    {
      key: 'wind',
      icon: Wind,
      label: copy.wind,
      value: `${snapshot.windDirection ? `${snapshot.windDirection} ` : ''}${snapshot.wind || '--'}`,
      level: windLevel(windKmh, copy),
      tone: windTone(windKmh),
      ratio: ratio(windKmh, 55),
    },
    {
      key: 'precip',
      icon: Droplets,
      label: copy.precipitation,
      value: `${Number.isFinite(precip) ? precip : 0}%`,
      level: precipitationLevel(precip, copy),
      tone: precipitationTone(precip),
      ratio: ratio(precip, 100),
    },
  ];

  return (
    <div className={`weather-strip ${alerts?.length ? 'has-alerts' : ''}`}>
      <div className="weather-primary">
        <CloudSun size={20} aria-hidden="true" />
        <strong>{snapshot.celsius ?? '--'}°C</strong>
        <span>{summary}</span>
      </div>
      <div className="weather-meta">
        {weatherMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              className={`weather-metric weather-metric--${metric.tone}`}
              key={metric.key}
              style={{ '--metric-ratio': `${metric.ratio}%` }}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.level}</em>
              <i aria-hidden="true" />
            </article>
          );
        })}
      </div>
      <div className="hourly-rail">
        {snapshot.hourly.slice(0, 6).map((period) => (
          <article key={`${period.number}-${period.startTime}`}>
            <time>{formatDateTime(period.startTime, timeZone, locale).slice(-5)}</time>
            <strong>{period.temperature ? `${Math.round(((period.temperature - 32) * 5) / 9)}°` : '--'}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function parseMaxNumber(value) {
  const numbers = String(value ?? '').match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  return numbers.length ? Math.max(...numbers) : null;
}

function ratio(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round((number / max) * 100)));
}

function temperatureRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(((number + 5) / 45) * 100)));
}

function temperatureTone(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'normal';
  if (number <= 10) return 'low';
  if (number >= 32) return 'high';
  return 'normal';
}

function temperatureLevel(value, copy) {
  const tone = temperatureTone(value);
  if (tone === 'low') return copy.low;
  if (tone === 'high') return copy.high;
  return copy.normal;
}

function windTone(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'normal';
  if (number >= 35) return 'high';
  if (number >= 20) return 'watch';
  return 'normal';
}

function windLevel(value, copy) {
  const tone = windTone(value);
  if (tone === 'high') return copy.high;
  if (tone === 'watch') return copy.mid;
  return copy.normal;
}

function precipitationTone(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'normal';
  if (number >= 60) return 'high';
  if (number >= 25) return 'watch';
  return 'normal';
}

function precipitationLevel(value, copy) {
  const tone = precipitationTone(value);
  if (tone === 'high') return copy.high;
  if (tone === 'watch') return copy.mid;
  return copy.low;
}

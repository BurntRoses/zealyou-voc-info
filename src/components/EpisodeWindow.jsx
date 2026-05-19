import {
  CalendarDays,
  ExternalLink,
  Flame,
  PauseCircle,
  RadioTower,
  TimerReset,
} from 'lucide-react';
import { cnTimeWindow } from '../domain/formatters.js';
import './EpisodeWindow.css';

const copy = {
  zh: {
    source: 'USGS/HVO',
    noEpisode: '当前通报',
    episodePrefix: 'Episode',
    windowTitle: '喷发窗口',
    noWindow: '未给出短期窗口',
    current: '当前',
    before: '未到',
    after: '已过',
    windowDay: '窗口日',
    inWindow: '窗口内',
    beforeWindow: '窗口前',
    afterWindow: '窗口后',
    openNotice: '官方通报',
    paused: '喷发暂停',
    officialWindow: 'HVO 窗口',
    notProbability: '综合信号',
    modelEstimate: '参考窗口',
    candidate: '候选',
    forecastWindow: '官方窗口',
    advisory: '官方状态',
  },
  en: {
    source: 'USGS/HVO',
    noEpisode: 'Latest notice',
    episodePrefix: 'Episode',
    windowTitle: 'eruption window',
    noWindow: 'No short-term window',
    current: 'Current',
    before: 'Before',
    after: 'Past',
    windowDay: 'Window day',
    inWindow: 'In window',
    beforeWindow: 'Before window',
    afterWindow: 'After window',
    openNotice: 'Official notice',
    paused: 'Paused',
    officialWindow: 'HVO window',
    notProbability: 'Public signal',
    modelEstimate: 'Reference window',
    candidate: 'candidate',
    forecastWindow: 'Forecast window',
    advisory: 'Official status',
  },
};

export function EpisodeWindow({
  dashboard,
  timeZone = 'Pacific/Honolulu',
  language = 'zh',
  compact = false,
}) {
  const messages = language === 'en' ? copy.en : copy.zh;
  const latestEpisode = getLatestEpisode(dashboard);
  const isModel = latestEpisode?.sourceType === 'model' || latestEpisode?.type === 'model' || /model/i.test(`${latestEpisode?.status ?? ''} ${latestEpisode?.source ?? ''}`);
  const latestNotice = dashboard?.officialNotices?.items?.[0] ?? null;
  const status = dashboard?.officialStatus ?? {};
  const dateRange = getEpisodeDateRange(latestEpisode, dashboard?.forecast?.timeWindow);
  const days = buildWindowDays(dateRange.start, dateRange.end, language);
  const referenceTime = dashboard?.generatedAt ?? status.updatedAt ?? latestEpisode?.sentUtc ?? latestNotice?.sentUtc ?? new Date();
  const currentKey = getDateKeyInZone(referenceTime, timeZone);
  const windowState = getWindowState(days, currentKey, messages);
  const statusLabel = localizeStatus(latestEpisode?.status, messages);
  const windowLabel = localizeWindowLabel(latestEpisode?.windowLabel ?? dashboard?.forecast?.timeWindow, language, messages);
  const episodeTitle = latestEpisode?.episodeNumber
    ? `${messages.episodePrefix} ${latestEpisode.episodeNumber}${isModel ? ` ${messages.candidate}` : ''}`
    : messages.noEpisode;
  const noticeUrl = latestEpisode?.url ?? latestNotice?.url ?? dashboard?.volcano?.notice?.url ?? dashboard?.volcano?.officialUrl;

  return (
    <section
      className={`episode-window ${compact ? 'episode-window--compact' : ''}`.trim()}
      aria-label={`${episodeTitle} ${windowLabel}`}
      style={{ '--episode-progress': `${windowState.progress}%` }}
    >
      <div className="episode-window__identity">
        <span className="episode-window__source">
          <RadioTower size={16} aria-hidden="true" />
          {messages.source}
        </span>
        <h2>
          <span>{episodeTitle}</span>
          <strong>{latestEpisode?.episodeNumber ? (isModel ? messages.modelEstimate : messages.windowTitle) : messages.noWindow}</strong>
        </h2>
        {noticeUrl ? (
          <a className="episode-window__link" href={noticeUrl} target="_blank" rel="noreferrer">
            {messages.openNotice}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <div className="episode-window__calendar" role="list" aria-label={windowLabel}>
        {days.length ? days.map((day) => (
          <article
            className={`episode-window__day ${day.key === currentKey ? 'is-current' : ''} ${getDayTone(day.key, currentKey)}`}
            key={day.key}
            role="listitem"
          >
            <span>{day.month}</span>
            <strong>{day.day}</strong>
            <span>{day.weekday}</span>
            <em>{day.key === currentKey ? messages.current : messages.windowDay}</em>
          </article>
        )) : (
          <article className="episode-window__day is-empty" role="listitem">
            <span>{messages.advisory}</span>
            <strong>{status.level ?? '--'}</strong>
            <span>{status.colorCode ?? '--'}</span>
            <em>{messages.noWindow}</em>
          </article>
        )}
      </div>

      <div className="episode-window__bar" aria-hidden="true" />

      <div className="episode-window__facts" aria-label={messages.forecastWindow}>
        <span>
          <CalendarDays size={16} aria-hidden="true" />
          {windowState.label}
        </span>
        <span>
          <PauseCircle size={16} aria-hidden="true" />
          {statusLabel}
        </span>
        <span>
          <TimerReset size={16} aria-hidden="true" />
          {windowLabel}
        </span>
        <span>
          <Flame size={16} aria-hidden="true" />
          {messages.notProbability}
        </span>
      </div>
    </section>
  );
}

export default EpisodeWindow;

function getLatestEpisode(dashboard) {
  const context = dashboard?.travelContext ?? {};
  if (context.activeWindow?.episodeNumber || context.activeWindow?.start) {
    return {
      ...context.activeWindow,
      windowLabel: context.activeWindow.label,
      status: context.activeWindow.status ?? (context.activeWindow.type === 'model' ? 'Reference window' : 'Forecast window'),
      sourceType: context.activeWindow.type,
    };
  }
  const episodes = dashboard?.history?.episodes ?? [];
  return episodes.find((item) => item?.episodeNumber) ?? null;
}

function getEpisodeDateRange(episode, fallbackWindow) {
  const start = parseDay(episode?.start) ?? parseWindowLabel(fallbackWindow)?.start ?? null;
  const end = parseDay(episode?.end) ?? parseWindowLabel(episode?.windowLabel ?? fallbackWindow)?.end ?? start;
  return { start, end };
}

function buildWindowDays(start, end, language) {
  if (!start) return [];
  const finish = end ?? start;
  const span = Math.round((finish.getTime() - start.getTime()) / 86_400_000);
  if (span < 0 || span > 9) return [formatWindowDay(start, language)];
  return Array.from({ length: span + 1 }, (_, index) => {
    const day = new Date(start.getTime() + index * 86_400_000);
    return formatWindowDay(day, language);
  });
}

function formatWindowDay(date, language) {
  const locale = language === 'en' ? 'en-US' : 'zh-CN';
  return {
    key: isoDateKey(date),
    month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date),
    day: new Intl.DateTimeFormat(locale, { day: '2-digit', timeZone: 'UTC' }).format(date),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date),
  };
}

function getWindowState(days, currentKey, messages) {
  if (!days.length) return { label: messages.noWindow, progress: 0 };
  const first = days[0].key;
  const last = days[days.length - 1].key;
  if (currentKey && currentKey < first) return { label: messages.beforeWindow, progress: 0 };
  if (currentKey && currentKey > last) return { label: messages.afterWindow, progress: 100 };
  const index = Math.max(0, days.findIndex((day) => day.key === currentKey));
  const progress = Math.round(((index + 0.5) / days.length) * 100);
  return { label: messages.inWindow, progress };
}

function getDayTone(dayKey, currentKey) {
  if (!currentKey) return '';
  if (dayKey < currentKey) return 'is-past';
  if (dayKey > currentKey) return 'is-future';
  return '';
}

function localizeWindowLabel(value, language, messages) {
  if (!value) return messages.noWindow;
  return language === 'en' ? String(value) : cnTimeWindow(value);
}

function localizeStatus(value, messages) {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('forecast')) return messages.forecastWindow;
  if (text.includes('paused')) return messages.paused;
  return messages.officialWindow;
}

function parseWindowLabel(value) {
  const text = String(value ?? '').replace(/[\u2010-\u2015\u2212]/g, '-');
  const range = text.match(/\b([A-Z][a-z]+)\s+(\d{1,2})\s*-\s*(?:([A-Z][a-z]+)\s+)?(\d{1,2}),?\s*(\d{4})\b/i);
  if (!range) return null;
  const startMonth = range[1];
  const endMonth = range[3] ?? startMonth;
  return {
    start: parseDay(`${range[5]}-${String(monthNumber(startMonth)).padStart(2, '0')}-${String(range[2]).padStart(2, '0')}`),
    end: parseDay(`${range[5]}-${String(monthNumber(endMonth)).padStart(2, '0')}-${String(range[4]).padStart(2, '0')}`),
  };
}

function parseDay(value) {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function getDateKeyInZone(value, timeZone) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isoDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function monthNumber(monthName) {
  const key = String(monthName ?? '').toLowerCase().slice(0, 3);
  return {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  }[key] ?? 1;
}

function isValidTimeZone(timeZone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

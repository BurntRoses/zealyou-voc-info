import './EruptionTimeline.css';

const copy = {
  zh: {
    title: 'Episode 轨道',
    subtitle: 'USGS/HVO Episode 优先；GVP 记录作为长期参考。',
    records: '记录',
    latest: '最新',
    maxVei: '最高 VEI',
    start: '开始',
    end: '结束',
    noData: '无',
    emptyTitle: '暂无历史记录',
    emptyBody: '当前来源没有返回可展示的官方事件或喷发记录。',
    present: '至今',
    unknownDate: '时间未知',
    vei: 'VEI',
    years: '年',
    days: '天',
    fallbackTitle: '历史喷发',
  },
  en: {
    title: 'Episode rail',
    subtitle: 'USGS/HVO episodes are shown first; GVP records are long-term context.',
    records: 'Records',
    latest: 'Latest',
    maxVei: 'Max VEI',
    start: 'Start',
    end: 'End',
    noData: 'None',
    emptyTitle: 'No history records',
    emptyBody: 'Current sources did not return displayable episode or eruption records.',
    present: 'present',
    unknownDate: 'Unknown date',
    vei: 'VEI',
    years: 'y',
    days: 'd',
    fallbackTitle: 'Historical eruption',
  },
};

const historyKeys = ['episodes', 'eruptions', 'items', 'events', 'timeline', 'records', 'history'];

export function EruptionTimeline({ history, timeZone = 'Pacific/Honolulu', language = 'zh' }) {
  const messages = language === 'en' ? copy.en : copy.zh;
  const rows = normalizeHistory(history, timeZone, language, messages);
  const visibleRows = rows.slice(0, 8);
  const stats = buildStats(rows, messages);
  const gantt = buildGantt(visibleRows, messages);

  return (
    <section className="eruption-timeline" aria-label={messages.title}>
      <div className="eruption-timeline__header">
        <div className="eruption-timeline__heading">
          <h2>{messages.title}</h2>
          <p className="eruption-timeline__subtitle">{messages.subtitle}</p>
        </div>

        <dl className="eruption-timeline__stats">
          {stats.map((stat) => (
            <div className="eruption-timeline__stat" key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {rows.length ? (
        <div className="eruption-timeline__gantt" style={gantt.style}>
          <div className="eruption-timeline__axis" aria-hidden="true">
            <span>{gantt.startLabel}</span>
            <span>{gantt.endLabel}</span>
          </div>
          {visibleRows.map((row) => (
            <article className={`eruption-timeline__gantt-row ${row.toneClass}`} key={row.key} title={row.summary}>
              <div className="eruption-timeline__gantt-label">
                <span>{row.episodeNumber ? `EP ${row.episodeNumber}` : row.shortLabel}</span>
                <strong>{row.title}</strong>
              </div>
              <div className="eruption-timeline__gantt-track">
                <span className="eruption-timeline__gantt-bar" style={row.ganttStyle}>
                  <time dateTime={row.isoStart}>{row.rangeLabel}</time>
                </span>
              </div>
              <div className="eruption-timeline__item-tags">
                {row.statusLabel ? <span>{row.statusLabel}</span> : null}
                {row.durationLabel ? <span>{row.durationLabel}</span> : null}
                {row.veiLabel ? <span>{row.veiLabel}</span> : null}
                {row.sourceLabel ? <span>{row.sourceLabel}</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="eruption-timeline__empty">
          <strong>{messages.emptyTitle}</strong>
          <p>{messages.emptyBody}</p>
        </div>
      )}
    </section>
  );
}

export default EruptionTimeline;

function normalizeHistory(history, timeZone, language, messages) {
  return extractHistoryItems(history)
    .map((item, index) => normalizeItem(item, index, timeZone, language, messages))
    .filter(Boolean)
    .sort((left, right) => right.sortValue - left.sortValue || left.index - right.index);
}

function extractHistoryItems(history) {
  if (Array.isArray(history)) return history;
  if (!history || typeof history !== 'object') return [];

  const items = [];
  if (Array.isArray(history.episodes)) items.push(...history.episodes);
  if (Array.isArray(history.eruptions)) items.push(...history.eruptions);
  if (items.length) return items;

  for (const key of historyKeys) {
    if (Array.isArray(history[key]) && history[key].length) return history[key];
  }
  if (Array.isArray(history.profile?.eruptions) && history.profile.eruptions.length) return history.profile.eruptions;
  if (history.geologicalSummary || history.lastEruptionYear) return [history];
  return [];
}

function normalizeItem(item, index, timeZone, language, messages) {
  if (item == null) return null;
  const source = typeof item === 'object' ? item : { title: String(item), date: item };
  const startValue = firstDefined(
    source.start,
    source.startDate,
    source.startedAt,
    source.date,
    source.year,
    source.startYear,
  );
  const endValue = firstDefined(source.end, source.endDate, source.endedAt, source.endYear);
  const start = parseTemporalPoint(startValue, timeZone, language, messages);
  const end = parseTemporalPoint(endValue, timeZone, language, messages);
  const primary = start.date ? start : end;
  const vei = parseNumber(source.vei ?? source.VEI ?? source.maxVei ?? source.veiMax);
  const episodeTitle = source.episodeNumber
    ? (language === 'en' ? `Episode ${source.episodeNumber}` : `第 ${source.episodeNumber} 次活动`)
    : '';
  const rawTitle = pickText(
    source.title,
    episodeTitle,
    source.name,
    source.activityArea,
    source.activityUnit,
    source.event,
    source.label,
  ) || (Number.isFinite(vei) ? `${messages.vei} ${formatVei(vei)}` : messages.fallbackTitle);
  const title = language === 'en' ? rawTitle : localizeHistoryText(rawTitle);
  const rawSummary = pickText(
    source.summary,
    source.description,
    source.detail,
    source.body,
    source.synopsis,
    source.geologicalSummary,
  );
  const summary = language === 'en' ? rawSummary : localizeHistoryText(rawSummary);
  const rawStatusLabel = pickText(source.status, source.activityType, source.type);
  const statusLabel = language === 'en' ? rawStatusLabel : localizeHistoryText(rawStatusLabel);
  const ongoing = Boolean(source.ongoing || isOngoingLabel(endValue));

  return {
    key: String(source.id ?? source.key ?? `${title}-${index}`),
    index,
    episodeNumber: source.episodeNumber ? Number(source.episodeNumber) : null,
    sortValue: primary.date?.getTime?.() ?? Number.NEGATIVE_INFINITY + index,
    isoStart: start.date?.toISOString?.(),
    startDate: start.date,
    endDate: end.date,
    title,
    summary,
    rangeLabel: buildRangeLabel(start, end, ongoing, messages, language),
    shortLabel: start.shortLabel || end.shortLabel || messages.unknownDate,
    durationLabel: buildDurationLabel(start.date, end.date, ongoing, messages),
    statusLabel,
    veiLabel: Number.isFinite(vei) ? `${messages.vei} ${formatVei(vei)}` : '',
    sourceLabel: pickText(source.source, source.sourceLabel, source.agency),
    toneClass: source.episodeNumber ? 'eruption-timeline__item--episode' : getToneClass(vei),
  };
}

function buildGantt(rows, messages) {
  const datedRows = rows.filter((row) => row.startDate || row.endDate);
  if (!datedRows.length) {
    rows.forEach((row) => {
      row.ganttStyle = { '--gantt-left': '0%', '--gantt-width': '100%' };
    });
    return { startLabel: messages.start, endLabel: messages.end, style: {} };
  }

  const starts = datedRows.map((row) => (row.startDate ?? row.endDate).getTime());
  const ends = datedRows.map((row) => (row.endDate ?? row.startDate).getTime());
  const min = Math.min(...starts);
  const max = Math.max(...ends, min + 86_400_000);
  const span = Math.max(86_400_000, max - min);

  rows.forEach((row, index) => {
    const start = (row.startDate ?? row.endDate)?.getTime?.();
    const end = (row.endDate ?? row.startDate)?.getTime?.();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      row.ganttStyle = { '--gantt-left': `${Math.min(72, index * 6)}%`, '--gantt-width': '18%' };
      return;
    }
    const left = Math.max(0, Math.min(96, ((Math.min(start, end) - min) / span) * 100));
    const width = Math.max(9, Math.min(100 - left, (Math.max(start, end) - Math.min(start, end)) / span * 100));
    row.ganttStyle = {
      '--gantt-left': `${left.toFixed(2)}%`,
      '--gantt-width': `${width.toFixed(2)}%`,
    };
  });

  return {
    startLabel: formatAxisDate(new Date(min)),
    endLabel: formatAxisDate(new Date(max)),
    style: {},
  };
}

function formatAxisDate(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.getUTCFullYear() === new Date().getUTCFullYear()
    ? `${date.getUTCMonth() + 1}/${date.getUTCDate()}`
    : String(date.getUTCFullYear());
}

function buildStats(rows, messages) {
  const veis = rows.map((row) => parseNumber(row.veiLabel)).filter(Number.isFinite);
  return [
    { label: messages.records, value: String(rows.length) },
    { label: messages.latest, value: rows[0]?.shortLabel ?? messages.noData },
    { label: messages.maxVei, value: veis.length ? `${messages.vei} ${formatVei(Math.max(...veis))}` : messages.noData },
  ];
}

function buildRangeLabel(start, end, ongoing, messages, language = 'zh') {
  if (!start.label && !end.label) return messages.unknownDate;
  const startText = compactTemporalLabel(start, language);
  const endText = compactTemporalLabel(end, language);
  if (ongoing && startText) return `${startText} - ${messages.present}`;
  if (startText && endText && startText !== endText) return `${startText} - ${endText}`;
  return startText || endText || start.label || end.label;
}

function compactTemporalLabel(point, language = 'zh') {
  if (!point?.date) return point?.label ?? '';
  const yearOnly = point.label && /^-?\d{1,5}$/.test(String(point.label));
  if (yearOnly) return point.label;
  const date = point.date;
  if (Number.isNaN(date.getTime())) return point.label ?? '';
  if (language === 'en') {
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function buildDurationLabel(start, end, ongoing, messages) {
  if (!start) return '';
  const finish = end || (ongoing ? new Date() : null);
  if (!finish) return '';
  const days = Math.max(1, Math.round((finish.getTime() - start.getTime()) / 86_400_000));
  if (days < 30) return languageAwareDuration(days, messages.days);
  return languageAwareDuration(Math.max(1, Math.round(days / 365)), messages.years);
}

function languageAwareDuration(value, unit) {
  return `${value}${unit}`;
}

function parseTemporalPoint(value, timeZone, language, messages) {
  if (value == null || value === '') return { date: null, label: '', shortLabel: '' };
  const locale = language === 'en' ? 'en-US' : 'zh-CN';
  const year = typeof value === 'number' ? value : String(value).trim().match(/^-?\d{1,5}$/)?.[0];
  if (year !== undefined) {
    const date = new Date(Date.UTC(0, 0, 1));
    date.setUTCFullYear(Number(year), 0, 1);
    return { date, label: String(year), shortLabel: String(year) };
  }
  const parsed = Date.parse(String(value));
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const shortFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
      year: 'numeric',
      month: 'short',
    });
    return { date, label: formatter.format(date), shortLabel: shortFormatter.format(date) };
  }
  return { date: null, label: String(value), shortLabel: String(value) || messages.unknownDate };
}

function pickText(...values) {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function parseNumber(value) {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  const next = match ? Number(match[0]) : Number(value);
  return Number.isFinite(next) ? next : null;
}

function formatVei(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(1).replace(/\.0$/, '');
}

function getToneClass(vei) {
  if (!Number.isFinite(vei)) return 'eruption-timeline__item--unknown';
  if (vei >= 4) return 'eruption-timeline__item--high';
  if (vei >= 2) return 'eruption-timeline__item--medium';
  return 'eruption-timeline__item--low';
}

function isOngoingLabel(value) {
  return /present|ongoing|current|至今/i.test(String(value ?? ''));
}

function localizeHistoryText(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text
    .replace(/Official HVO Episode\s+(\d+)\s+window:\s*May\s+12\s*-\s*May\s+14,\s*2026\./i, 'USGS/HVO 第 $1 次喷发活动窗口：2026 年 5 月 12-14 日。')
    .replace(/Official HVO Episode\s+(\d+)\s+window:\s*May\s+12\s*-\s*May\s+15,\s*2026\./i, 'USGS/HVO 第 $1 次喷发活动窗口：2026 年 5 月 12-15 日。')
    .replace(/Official HVO Episode\s+(\d+)\s+wording detected\./i, 'USGS/HVO 提到第 $1 次喷发活动。')
    .replace(/Summary:\s*/i, '摘要：')
    .replace(/The eruption at the summit of Kīlauea is currently paused\./i, '基拉韦厄峰顶喷发目前暂停。')
    .replace(/The forecast window for the onset of episode\s+(\d+)\s+fountaining is May\s+12\s*[–-]\s*May\s+14,\s*2026[^.]*\./i, '第 $1 次喷发活动的官方窗口为 2026 年 5 月 12-14 日。')
    .replace(/The forecast window for the onset of episode\s+(\d+)\s+fountaining is May\s+12\s*[–-]\s*May\s+15,\s*2026[^.]*\./i, '第 $1 次喷发活动的官方窗口为 2026 年 5 月 12-15 日。')
    .replace(/USGS\/HVO episode record\./i, 'USGS/HVO 事件记录。')
    .replace(/Smithsonian GVP eruption record/i, 'Smithsonian GVP 喷发记录')
    .replace(/Episode\s+(\d+)\s+fountaining forecast/i, '第 $1 次喷发活动窗口')
    .replace(/Episode\s+(\d+)\s+forecast window/i, '第 $1 次喷发通报窗口')
    .replace(/Historical eruption/i, '历史喷发')
    .replace(/Forecast window/i, '官方窗口')
    .replace(/Paused/i, '暂停')
    .replace(/Official notice/i, '官方通报')
    .replace(/Episode\s+(\d+)/gi, '第 $1 次活动');
}

function isValidTimeZone(timeZone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  History,
  RadioTower,
  Ruler,
  ShieldCheck,
} from 'lucide-react';
import { DetailModal } from '../../components/DetailModal.jsx';
import {
  buildWindowDays,
  dateKeyInZone,
  primaryVolcanoName,
  windowState,
} from '../../domain/formatters.js';

const hstZone = 'Pacific/Honolulu';
const dayMs = 86_400_000;

const scaleOptions = [
  { id: 'ep5', label: '近五次EP', kind: 'episode', episodeLimit: 5 },
  { id: 'recent', label: '近年喷发', kind: 'history', limit: 8 },
  { id: 'century', label: '百年', kind: 'history', limit: 14 },
  { id: 'all', label: '全记录', kind: 'history', limit: 18 },
];

export function TrendsView({ dashboard, timeZone }) {
  const [scaleMode, setScaleMode] = useState('ep5');
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [activeDetail, setActiveDetail] = useState(null);
  const context = dashboard.travelContext ?? {};
  const officialWindow = context.officialWindow;
  const modelWindow = context.modelWindow;
  const activeWindow = context.activeWindow ?? pickDisplayWindow(officialWindow, modelWindow, dashboard.generatedAt, timeZone);
  const isModelWindow = activeWindow?.type === 'model';
  const scaleOption = getScaleOption(scaleMode);
  const isEpisodeScale = scaleOption.kind === 'episode';
  const episodeRows = useMemo(
    () => buildEpisodeRows(dashboard, officialWindow, modelWindow),
    [dashboard, officialWindow, modelWindow],
  );
  const historyRows = useMemo(() => buildHistoricalRows(dashboard), [dashboard]);
  const visibleHistory = useMemo(
    () => selectHistoryRows(historyRows, scaleOption, expandedHistory),
    [historyRows, scaleOption, expandedHistory],
  );
  const timelineRows = useMemo(
    () => buildTimelineRows(episodeRows, visibleHistory, scaleOption),
    [episodeRows, visibleHistory, scaleOption],
  );
  const bounds = useMemo(() => timeBounds(timelineRows, scaleOption, dashboard.generatedAt), [timelineRows, scaleOption, dashboard.generatedAt]);
  const axisTicks = useMemo(() => buildGanttAxis(bounds, scaleOption), [bounds, scaleOption]);
  const now = isEpisodeScale ? nowPosition(bounds, dashboard.generatedAt) : null;
  const sourceUrl = activeWindow?.url ?? officialWindow?.url ?? dashboard.latestAdvisory?.url ?? context.officialLinks?.hvoUpdates;
  const activeRange = activeWindow?.start ? formatRangeValue(activeWindow.start, activeWindow.end) : '未发布';
  const officialRange = officialWindow?.start ? formatRangeValue(officialWindow.start, officialWindow.end) : '未发布';
  const canExpand = !isEpisodeScale && (historyRows.length > visibleHistory.length || expandedHistory);
  const summaryCards = [
    {
      icon: RadioTower,
      tone: isModelWindow ? 'watch' : 'good',
      label: isModelWindow ? '下一候选窗口' : '当前官方窗口',
      value: activeWindow?.episodeNumber ? `EP ${activeWindow.episodeNumber}${isModelWindow ? ' 候选' : ''}` : '未发布',
      meta: `${activeRange} HST`,
      title: isModelWindow ? '下一候选 EP 窗口' : '当前官方 EP 窗口',
      description: isModelWindow ? '来自公开通报整理的参考窗口。' : 'USGS/HVO 官方窗口，优先显示。',
      detail: isModelWindow ? '下一 EP 参考范围需等待官方确认。' : '当前可核验的官方短期窗口。',
      sourceUrl,
      facts: [
        { label: 'EP', value: activeWindow?.episodeNumber ? `EP ${activeWindow.episodeNumber}` : '--', tone: isModelWindow ? 'watch' : 'good' },
        { label: '范围', value: activeRange, tone: isModelWindow ? 'watch' : 'good' },
        { label: '性质', value: isModelWindow ? '待确认' : '官方窗口', tone: isModelWindow ? 'watch' : 'good' },
      ],
    },
    {
      icon: ShieldCheck,
      tone: 'notice',
      label: '上一官方窗口',
      value: officialWindow?.episodeNumber ? `EP ${officialWindow.episodeNumber}` : '--',
      meta: `${officialRange} HST`,
      title: '上一官方 EP 窗口',
      description: '已转入历史序列，用于和下一候选窗口对照。',
      detail: '上一官方窗口已退回历史，不再作为当前判读窗口。',
      sourceUrl,
      facts: [
        { label: 'EP', value: officialWindow?.episodeNumber ? `EP ${officialWindow.episodeNumber}` : '--', tone: 'notice' },
        { label: '范围', value: officialRange, tone: 'notice' },
        { label: '用途', value: '历史对照', tone: 'notice' },
      ],
    },
    {
      icon: History,
      tone: 'good',
      label: '历史喷发活动',
      value: `${historyRows.length} 段`,
      meta: `${primaryVolcanoName(dashboard.volcano?.name)} / GVP`,
      title: '历史喷发活动',
      description: '长期喷发历史来自 Smithsonian GVP。',
      detail: '用于查看基拉韦厄长期喷发活动脉络。',
      sourceUrl,
      facts: [
        { label: '数量', value: `${historyRows.length} 段`, tone: 'good' },
        { label: '来源', value: 'Smithsonian GVP', tone: 'good' },
        { label: '范围', value: '长期历史', tone: 'good' },
      ],
    },
  ];

  return (
    <div className="trends-grid trends-grid--history">
      <section className="trends-summary trends-summary--public">
        {summaryCards.map((card) => (
          <SummaryTile {...card} key={card.label} onOpen={() => setActiveDetail(card)} />
        ))}
      </section>

      <section className="panel gantt-panel eruption-history-panel">
        <header className="panel-head">
          <span><CalendarDays size={17} />喷发历史活动</span>
          <div className="panel-actions scale-actions" aria-label="时间尺度">
            <span className="scale-label"><Ruler size={14} />范围</span>
            {scaleOptions.map((option) => (
              <button
                className={`chip-button ${scaleMode === option.id ? 'is-active' : ''}`}
                key={option.id}
                type="button"
                onClick={() => setScaleMode(option.id)}
              >
                {option.label}
              </button>
            ))}
            {canExpand ? (
              <button className="chip-button" type="button" onClick={() => setExpandedHistory((value) => !value)}>
                {expandedHistory ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                {expandedHistory ? '收起' : '更多历史'}
              </button>
            ) : null}
          </div>
        </header>

        <div className="gantt-chart history-timeline" aria-label="喷发历史时间轴">
          {axisTicks.length ? (
            <div className={`gantt-axis gantt-axis--${scaleMode}`} aria-hidden="true">
              {axisTicks.map((tick) => (
                <span className="gantt-axis-tick" style={{ '--tick': `${tick.position}%` }} key={`${tick.position}-${tick.label}`}>
                  <i />
                  <em>{tick.label}</em>
                </span>
              ))}
              {Number.isFinite(now) ? <b className="gantt-now-label" style={{ '--now': `${now}%` }}>今日</b> : null}
            </div>
          ) : null}

          {timelineRows.map((row) => {
            const position = ganttPosition(row, bounds);
            return (
              <div className={`gantt-row history-row ${row.model ? 'is-model' : ''} is-${row.rowType}`} key={row.id}>
                <div className="gantt-label">
                  <strong>{row.title}</strong>
                  <span>{row.kind}</span>
                </div>
                <div className="gantt-track" title={`${row.title} ${row.range}`}>
                  {Number.isFinite(now) ? <i className="gantt-now" style={{ '--now': `${now}%` }} /> : null}
                  <i
                    className={`gantt-bar ${row.model ? 'is-model' : ''} is-${row.rowType}`}
                    style={{ '--start': `${position.left}%`, '--width': `${position.width}%` }}
                  />
                </div>
                <div className="gantt-meta">
                  <span className="gantt-date-chip">
                    <strong>{row.startLabel}</strong>
                    <i aria-hidden="true" />
                    <strong>{row.endLabel}</strong>
                  </span>
                  <em>{row.durationLabel}</em>
                </div>
              </div>
            );
          })}
          {!timelineRows.length ? <p className="empty-copy">暂无可展示的喷发历史记录。</p> : null}
        </div>

        <footer className="history-legend">
          <span><i className="is-official" />USGS/HVO官方窗口</span>
          <span><i className="is-model" />参考窗口</span>
          <span><i className="is-episode" />HVO喷发记录</span>
          <span><i className="is-history" />GVP喷发历史</span>
          {sourceUrl ? <a className="external-link" href={sourceUrl} target="_blank" rel="noreferrer">HVO 原文 <ExternalLink size={13} /></a> : null}
        </footer>
      </section>
      <DetailModal detail={activeDetail} onClose={() => setActiveDetail(null)} />
    </div>
  );
}

function getScaleOption(scaleMode) {
  return scaleOptions.find((item) => item.id === scaleMode) ?? scaleOptions[0];
}

function SummaryTile({ icon: Icon, tone, label, value, meta, onOpen }) {
  return (
    <button
      className={`panel summary-card tone-${tone} is-expandable`}
      type="button"
      aria-label={`打开${label}详情`}
      onClick={onOpen}
    >
      <span><Icon size={16} />{label}</span>
      <strong>{value}</strong>
      <em>{meta}</em>
    </button>
  );
}

function pickDisplayWindow(officialWindow, modelWindow, generatedAt, timeZone) {
  const key = dateKeyInZone(generatedAt ?? new Date(), timeZone);
  const state = windowState(buildWindowDays(officialWindow), key);
  if (state.key === 'after' && modelWindow?.episodeNumber) return modelWindow;
  return officialWindow ?? modelWindow ?? null;
}

function buildEpisodeRows(dashboard, officialWindow, modelWindow) {
  const rows = [];
  for (const episode of dashboard.history?.episodes ?? []) {
    const row = normalizeEpisodeRow(episode);
    if (row) rows.push(row);
  }

  if (officialWindow && !rows.some((row) => row.episodeNumber === officialWindow.episodeNumber && !row.model)) {
    const row = normalizeEpisodeRow({
      ...officialWindow,
      id: `official-window-${officialWindow.episodeNumber ?? officialWindow.start}`,
      status: 'Official window',
      sourceType: 'official',
    });
    if (row) rows.push(row);
  }

  if (modelWindow?.episodeNumber && !rows.some((row) => row.episodeNumber === modelWindow.episodeNumber && row.model)) {
    const row = normalizeEpisodeRow({
      ...modelWindow,
      id: `model-window-${modelWindow.episodeNumber}-${modelWindow.start}`,
      status: 'Model estimate',
      sourceType: 'model',
    });
    if (row) rows.unshift(row);
  }

  return rows.sort(compareEpisodeRows).slice(0, 30);
}

function normalizeEpisodeRow(episode) {
  const start = parseWindowTime(episode.start, 'start');
  const end = parseWindowTime(episode.end ?? episode.start, 'end') ?? start;
  if (!start) return null;
  const text = `${episode.sourceType ?? ''} ${episode.type ?? ''} ${episode.status ?? ''} ${episode.title ?? ''} ${episode.source ?? ''}`;
  const model = episode.sourceType === 'model' || /model/i.test(text);
  const officialWindow = !model && (episode.windowKind === 'forecast' || episode.status?.includes('Forecast') || (episode.windowLabel && !/completed|ended|observed/i.test(text)));
  const rowType = model ? 'model' : officialWindow ? 'official' : 'episode';
  const episodeNumber = episode.episodeNumber ?? episode.episode ?? null;

  return {
    id: episode.id ?? `ep-${episodeNumber ?? 'window'}-${episode.start}`,
    episodeNumber,
    title: episodeNumber ? `EP ${episodeNumber}${model ? ' 候选' : ''}` : (episode.title ?? 'EP 窗口'),
    kind: model ? '参考窗口' : (officialWindow ? 'USGS/HVO官方窗口' : 'HVO喷发记录'),
    range: formatRangeValue(episode.start, episode.end ?? episode.start),
    start,
    end,
    startLabel: compactDateLabel(episode.start, start),
    endLabel: compactDateLabel(episode.end ?? episode.start, end),
    durationLabel: officialWindow || model ? `${durationDays(start, end)}天窗口` : episodeDurationLabel(start, end),
    rowType,
    model,
  };
}

function compareEpisodeRows(left, right) {
  const leftEpisode = Number(left.episodeNumber);
  const rightEpisode = Number(right.episodeNumber);
  if (Number.isFinite(leftEpisode) && Number.isFinite(rightEpisode) && leftEpisode !== rightEpisode) {
    return rightEpisode - leftEpisode;
  }
  return right.start.getTime() - left.start.getTime();
}

function buildHistoricalRows(dashboard) {
  const seenYears = new Set();
  const rows = [];
  const eruptions = [...(dashboard.history?.eruptions ?? [])].sort((a, b) => Number(b.startYear ?? 0) - Number(a.startYear ?? 0));
  for (const eruption of eruptions) {
    const startYear = Number(eruption.startYear);
    if (!Number.isFinite(startYear)) continue;
    const endYear = Number(eruption.endYear && eruption.endYear !== eruption.startYear ? eruption.endYear : startYear);
    const key = `${startYear}-${endYear}`;
    if (seenYears.has(key)) continue;
    seenYears.add(key);
    const start = new Date(`${startYear}-01-01T00:00:00-10:00`);
    const end = new Date(`${endYear}-12-31T23:59:59-10:00`);
    rows.push({
      id: `gvp-${key}-${eruption.eruptionNumber ?? rows.length}`,
      title: endYear !== startYear ? `${startYear}-${endYear}` : String(startYear),
      kind: translateGvpActivity(eruption.activityType),
      area: eruption.activityArea ?? 'GVP 记录',
      range: endYear !== startYear ? `${startYear}-${endYear}` : String(startYear),
      start,
      end,
      startYear,
      endYear,
      startLabel: String(startYear),
      endLabel: String(endYear),
      durationLabel: endYear !== startYear ? `${endYear - startYear + 1}年跨度` : '单年记录',
      rowType: 'history',
      model: false,
    });
    if (rows.length >= 48) break;
  }
  return rows;
}

function selectHistoryRows(rows, option, expanded) {
  if (option.kind === 'episode') return [];
  const limit = expanded ? Math.max(option.limit, 24) : option.limit;
  if (option.id === 'century') return rows.filter((row) => row.endYear >= 1920).slice(0, limit);
  if (option.id === 'all') return rows.slice(0, limit);
  return rows.filter((row) => row.endYear >= 1980).slice(0, limit);
}

function buildTimelineRows(episodeRows, historyRows, option) {
  if (option.kind === 'episode') return episodeRows.slice(0, option.episodeLimit ?? 5);
  return [...episodeRows.slice(0, 2), ...historyRows]
    .sort((a, b) => b.start.getTime() - a.start.getTime());
}

function translateGvpActivity(value) {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('confirmed')) return '确认喷发';
  if (text.includes('uncertain')) return '不确定记录';
  if (text.includes('eruption')) return '喷发记录';
  return value ?? 'GVP 记录';
}

function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
}

function parseWindowTime(value, edge = 'start') {
  if (!value) return null;
  if (isDateOnly(value)) {
    return new Date(`${value}T${edge === 'end' ? '23:59:59' : '00:00:00'}-10:00`);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRangeValue(startValue, endValue) {
  if (!startValue) return '--';
  if (isDateOnly(startValue) && isDateOnly(endValue ?? startValue)) {
    const [startYear, startMonth, startDay] = String(startValue).split('-').map(Number);
    const [endYear, endMonth, endDay] = String(endValue ?? startValue).split('-').map(Number);
    if (startYear === endYear && startMonth === endMonth && startDay === endDay) return `${startYear}年${startMonth}月${startDay}日`;
    if (startYear === endYear && startMonth === endMonth) return `${startYear}年${startMonth}月${startDay}-${endDay}日`;
    if (startYear === endYear) return `${startYear}年${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
    return `${startYear}年${startMonth}月${startDay}日 - ${endYear}年${endMonth}月${endDay}日`;
  }
  const start = parseWindowTime(startValue, 'start');
  const end = parseWindowTime(endValue ?? startValue, 'end') ?? start;
  if (!start) return '--';
  const startLabel = compactDateLabel(startValue, start, true);
  const endLabel = compactDateLabel(endValue ?? startValue, end, true);
  if (!end || startLabel === endLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

function compactDateLabel(rawValue, date, includeYear = false) {
  if (!date) return '--';
  if (isDateOnly(rawValue)) {
    const [year, month, day] = String(rawValue).split('-');
    return includeYear ? `${year}年${Number(month)}月${Number(day)}日` : `${Number(month)}/${Number(day)}`;
  }
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: hstZone,
    month: 'numeric',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
}

function durationDays(start, end) {
  if (!start || !end) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));
}

function episodeDurationLabel(start, end) {
  const days = durationDays(start, end);
  return days > 1 ? `${days}天活动` : '单日记录';
}

function timeBounds(rows, option, generatedAt) {
  const times = rows.flatMap((row) => [row.start?.getTime(), row.end?.getTime()]).filter(Number.isFinite);
  const generated = Date.parse(generatedAt ?? new Date());
  if (option.kind === 'episode' && Number.isFinite(generated)) times.push(generated);
  if (!times.length) {
    const now = Date.now();
    return { min: now - 7 * dayMs, max: now + 7 * dayMs };
  }
  const padding = option.kind === 'episode' ? dayMs : 90 * dayMs;
  const min = Math.min(...times) - padding;
  const max = Math.max(...times) + padding;
  return { min, max: max === min ? min + dayMs : max };
}

function buildGanttAxis(bounds, option) {
  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max) || bounds.max <= bounds.min) return [];
  const ticks = [];
  const count = option.kind === 'episode' ? 5 : 5;
  for (let index = 0; index < count; index += 1) {
    const ratio = index / (count - 1);
    const time = bounds.min + (bounds.max - bounds.min) * ratio;
    const date = new Date(time);
    ticks.push({
      position: ratio * 100,
      label: option.kind === 'episode'
        ? new Intl.DateTimeFormat('zh-CN', { timeZone: hstZone, month: 'numeric', day: 'numeric' }).format(date)
        : new Intl.DateTimeFormat('zh-CN', { timeZone: hstZone, year: 'numeric' }).format(date),
    });
  }
  return dedupeTicks(ticks);
}

function dedupeTicks(ticks) {
  const used = new Set();
  return ticks.filter((tick) => {
    if (used.has(tick.label)) return false;
    used.add(tick.label);
    return true;
  });
}

function ganttPosition(row, bounds) {
  const span = bounds.max - bounds.min;
  const left = ((row.start.getTime() - bounds.min) / span) * 100;
  const width = ((row.end.getTime() - row.start.getTime()) / span) * 100;
  const clampedLeft = Math.max(0, Math.min(96, left));
  return {
    left: clampedLeft,
    width: Math.max(2, Math.min(100 - clampedLeft, width || 3)),
  };
}

function nowPosition(bounds, generatedAt) {
  const time = Date.parse(generatedAt ?? new Date());
  if (!Number.isFinite(time) || !Number.isFinite(bounds.min) || !Number.isFinite(bounds.max) || bounds.max <= bounds.min) return null;
  return Math.max(0, Math.min(100, ((time - bounds.min) / (bounds.max - bounds.min)) * 100));
}

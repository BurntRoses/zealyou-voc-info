import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  BellRing,
  Camera,
  CheckCheck,
  Clock3,
  Database,
  ExternalLink,
  MapPinned,
  MonitorUp,
  Moon,
  Mountain,
  RefreshCcw,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { views } from '../domain/config.js';
import { cnColor, cnStatus, eruptionTone, formatDateTime, formatWindowLabel, primaryVolcanoName, resolveEruptionState, statusTone } from '../domain/formatters.js';
import { defaultNotificationPreferences } from '../domain/notifications.js';
import { useLiveClock } from '../hooks/useLiveClock.js';
import { TimeZonePicker } from './TimeZonePicker.jsx';

const viewIcons = {
  today: Mountain,
  trends: TrendingUp,
  map: MapPinned,
  cameras: Camera,
  sources: Database,
};

const secondaryTimeZones = [
  { value: 'Asia/Shanghai', label: '北京时间', shortLabel: '北京' },
  { value: 'Asia/Tokyo', label: '东京时间', shortLabel: '东京' },
  { value: 'America/Los_Angeles', label: '洛杉矶时间', shortLabel: '洛杉矶' },
  { value: 'America/New_York', label: '纽约时间', shortLabel: '纽约' },
  { value: 'UTC', label: 'UTC', shortLabel: 'UTC' },
];

export function AppShell({
  activeView,
  selectedVolcano,
  dashboard,
  loading,
  notice,
  theme = 'light',
  secondaryTimeZone = 'Asia/Shanghai',
  notificationPreferences = defaultNotificationPreferences,
  notificationItems = [],
  notificationToasts = [],
  notificationUnreadCount = 0,
  onViewChange,
  onRefresh,
  onPreferenceChange,
  onNotificationPreferenceChange,
  onMarkNotificationsRead,
  onDismissNotification,
  onDismissNotificationToast,
  onClearNotifications,
  children,
}) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRootRef = useRef(null);
  const active = views.find((view) => view.id === activeView) ?? views[0];
  const status = dashboard?.officialStatus ?? {};
  const context = dashboard?.travelContext ?? {};
  const eruption = resolveEruptionState(context.eruptionState, status.summary);
  const activeWindow = context.activeWindow ?? context.modelWindow ?? context.officialWindow;
  const activeWindowIsModel = activeWindow?.type === 'model';
  const previousWindow = activeWindowIsModel ? (context.lastOfficialWindow ?? context.officialWindow) : null;
  const resolvedSecondaryZone = secondaryTimeZones.some((zone) => zone.value === secondaryTimeZone)
    ? secondaryTimeZone
    : 'Asia/Shanghai';
  const compactClockOptions = { seconds: false, weekday: false };
  const hstClock = useLiveClock('Pacific/Honolulu', 'zh-CN', compactClockOptions);
  const secondaryClock = useLiveClock(resolvedSecondaryZone, 'zh-CN', compactClockOptions);
  const updatedAt = formatDateTime(dashboard?.generatedAt ?? status.updatedAt, 'Pacific/Honolulu', 'zh-CN');
  const statusClass = statusTone(status.level, status.colorCode);
  const eruptionClass = eruptionTone(eruption.state);
  const compactEruptionLabel = String(eruption.label ?? '监测中').replace(/^喷发/, '') || eruption.label;
  const activeWindowText = activeWindow?.episodeNumber
    ? `EP ${activeWindow.episodeNumber}${activeWindowIsModel ? ' 参考' : ''} · ${compactWindowRange(activeWindow)} · ${activeWindowIsModel ? '待官方确认' : '官方'}`
    : '';
  const activeWindowTitle = previousWindow?.episodeNumber
    ? `${formatWindowLabel(activeWindow)}，EP ${previousWindow.episodeNumber} 官方窗口已转历史`
    : formatWindowLabel(activeWindow);
  const NotificationIcon = notificationUnreadCount ? BellRing : Bell;

  useEffect(() => {
    if (!notificationOpen) return undefined;
    const close = (event) => {
      if (event.key === 'Escape') setNotificationOpen(false);
      if (event.type === 'pointerdown' && notificationRootRef.current && !notificationRootRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    window.addEventListener('pointerdown', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('pointerdown', close);
    };
  }, [notificationOpen]);

  useEffect(() => {
    if (notificationOpen && notificationUnreadCount) {
      onMarkNotificationsRead?.();
    }
  }, [notificationOpen, notificationUnreadCount, onMarkNotificationsRead]);

  useEffect(() => {
    if (!notificationOpen || !notificationToasts.length) return;
    notificationToasts.forEach((item) => onDismissNotificationToast?.(item.id));
  }, [notificationOpen, notificationToasts, onDismissNotificationToast]);

  return (
    <main className="app-shell">
      <aside className="side-nav" aria-label="主导航">
        <a className="brand-block" href="?view=today" aria-label="返回首页">
          <span className="brand-icon"><Mountain size={22} aria-hidden="true" /></span>
          <span>
            <strong>Hawaii Volcano Watch</strong>
            <small>USGS/HVO 优先</small>
          </span>
        </a>

        <div className="nav-section">
          {views.map((view) => {
            const Icon = viewIcons[view.id] ?? Activity;
            return (
              <button
                className={activeView === view.id ? 'is-active' : ''}
                key={view.id}
                type="button"
                aria-current={activeView === view.id ? 'page' : undefined}
                onClick={() => onViewChange(view.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{view.shortLabel}</strong>
                  <em>{view.description}</em>
                </span>
              </button>
            );
          })}
        </div>

        <div className="side-source">
          <span>公开信息核验</span>
          <strong>USGS/HVO</strong>
          <em>安全与通行以官方公告为准</em>
        </div>
      </aside>

      <section className="work-area">
        <header className="top-status">
          <div className="top-title">
            <span>{active.label}</span>
            <strong>{primaryVolcanoName(selectedVolcano?.name ?? dashboard?.volcano?.name)}</strong>
          </div>

          <div className="top-center">
            <div className="status-strip" aria-label="当前状态">
              <span className={`status-pill status-pill--${statusClass}`}>
                <i aria-hidden="true" />
                火山 {cnStatus(status.level)}
              </span>
              <span className={`status-pill status-pill--${statusClass}`}>
                航空 {cnColor(status.colorCode)}
              </span>
              <span className={`status-pill status-pill--${eruptionClass}`}>
                状态 {compactEruptionLabel}
              </span>
              {activeWindow?.episodeNumber ? (
                <span className={`status-pill status-pill--${activeWindowIsModel ? 'watch' : 'good'}`} title={activeWindowTitle}>
                  {activeWindowText}
                </span>
              ) : null}
              <span className="status-pill">
                <Clock3 size={14} aria-hidden="true" />
                更新 {updatedAt}
              </span>
            </div>
            <div className="top-timebar" aria-label="时间">
              <span><Clock3 size={13} aria-hidden="true" /><strong>夏威夷</strong>{hstClock}</span>
              <TimeZonePicker
                zones={secondaryTimeZones}
                value={resolvedSecondaryZone}
                clock={secondaryClock}
                onChange={(nextZone) => onPreferenceChange?.({ secondaryTimeZone: nextZone })}
              />
              {notice ? <em>{notice}</em> : null}
            </div>
          </div>

          <div className="top-controls" ref={notificationRootRef}>
            <div className="volcano-select is-fixed" aria-label="当前火山">
              <span>火山</span>
              <strong>{primaryVolcanoName(selectedVolcano?.name ?? dashboard?.volcano?.name)}</strong>
            </div>
            <button
              className={`icon-action notification-button ${notificationUnreadCount ? 'has-unread' : ''}`}
              type="button"
              title="通知设置与记录"
              aria-haspopup="dialog"
              aria-expanded={notificationOpen}
              onClick={() => setNotificationOpen((current) => !current)}
            >
              <NotificationIcon size={16} />
              <span>通知</span>
              {notificationUnreadCount ? <em className="notification-badge">{Math.min(notificationUnreadCount, 9)}</em> : null}
            </button>
            <button className="icon-action" type="button" title={theme === 'dark' ? '切换浅色' : '切换暗色'} onClick={() => onPreferenceChange?.({ theme: theme === 'dark' ? 'light' : 'dark' })}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? '浅色' : '暗色'}</span>
            </button>
            <button className="icon-action" type="button" title="刷新数据" onClick={onRefresh} disabled={loading}>
              <RefreshCcw size={16} />
              <span>刷新</span>
            </button>
            {notificationOpen ? (
              <NotificationPanel
                preferences={notificationPreferences}
                items={notificationItems}
                unreadCount={notificationUnreadCount}
                onPreferenceChange={onNotificationPreferenceChange}
                onMarkRead={onMarkNotificationsRead}
                onDismiss={onDismissNotification}
                onClear={onClearNotifications}
              />
            ) : null}
          </div>
        </header>

        <div className="page-workspace">
          {children}
        </div>
      </section>
      <NotificationToasts items={notificationOpen ? [] : notificationToasts} onDismiss={onDismissNotificationToast} />
    </main>
  );
}

function NotificationPanel({
  preferences,
  items,
  unreadCount,
  onPreferenceChange,
  onMarkRead,
  onDismiss,
  onClear,
}) {
  const prefs = {
    ...defaultNotificationPreferences,
    ...preferences,
    channels: { ...defaultNotificationPreferences.channels, ...(preferences?.channels ?? {}) },
  };
  const channelLabels = [
    ['earthquakes', '强震'],
    ['tsunami', '海啸'],
    ['status', '官方警戒'],
    ['windows', 'EP 窗口'],
    ['signal', '活动信号'],
    ['weather', '天气提醒'],
    ['sources', '数据源'],
  ];

  return (
    <section className="notification-popover" role="dialog" aria-label="通知设置与记录">
      <header className="notification-popover__head">
        <span>
          <Bell size={16} aria-hidden="true" />
          <strong>通知</strong>
          {unreadCount ? <em>{unreadCount} 未读</em> : <em>已同步</em>}
        </span>
        <div>
          <button type="button" title="全部标为已读" onClick={onMarkRead} disabled={!items.length}>
            <CheckCheck size={15} />
          </button>
          <button type="button" title="清空通知" onClick={onClear} disabled={!items.length}>
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      <div className="notification-settings">
        <SwitchRow
          icon={MonitorUp}
          label="页面内通知"
          detail="铃铛未读、站内记录和浮层提示"
          checked={prefs.inPage}
          onChange={(inPage) => onPreferenceChange?.({ inPage })}
        />

        <label className="notification-range">
          <span><SlidersHorizontal size={14} />活动信号阈值<strong>{prefs.signalThreshold}/100</strong></span>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={prefs.signalThreshold}
            onChange={(event) => onPreferenceChange?.({ signalThreshold: Number(event.target.value) })}
          />
        </label>

        <div className="notification-channels" aria-label="通知类型">
          {channelLabels.map(([key, label]) => (
            <label className={prefs.channels[key] ? 'is-active' : ''} key={key}>
              <input
                type="checkbox"
                checked={Boolean(prefs.channels[key])}
                onChange={(event) => onPreferenceChange?.({ channels: { [key]: event.target.checked } })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="notification-list" aria-label="通知记录">
        {items.length ? items.map((item) => (
          <NotificationItem item={item} key={item.id} onDismiss={onDismiss} />
        )) : (
          <p className="notification-empty">还没有触发通知。刷新数据或调低阈值后会自动记录。</p>
        )}
      </div>
    </section>
  );
}

function SwitchRow({ icon: Icon, label, detail, checked, onChange }) {
  return (
    <label className={`notification-switch ${checked ? 'is-active' : ''}`}>
      <span className="notification-switch__icon"><Icon size={16} aria-hidden="true" /></span>
      <span>
        <strong>{label}</strong>
        <em>{detail}</em>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange?.(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function NotificationItem({ item, onDismiss }) {
  return (
    <article className={`notification-item tone-${item.tone ?? 'notice'} ${item.read ? '' : 'is-unread'}`}>
      <header>
        <strong>{item.title}</strong>
        <button type="button" title="移除此条" onClick={() => onDismiss?.(item.id)}>
          <X size={14} />
        </button>
      </header>
      <p>{item.body}</p>
      <footer>
        <span>{item.meta || '通知'}</span>
        {item.sourceUrl ? (
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            来源 <ExternalLink size={12} />
          </a>
        ) : null}
      </footer>
    </article>
  );
}

function NotificationToasts({ items, onDismiss }) {
  if (!items?.length) return null;
  return (
    <div className="notification-toasts" aria-live="polite">
      {items.map((item) => (
        <article className={`notification-toast tone-${item.tone ?? 'notice'}`} key={item.id}>
          <span><BellRing size={15} aria-hidden="true" />{item.title}</span>
          <p>{item.body}</p>
          <button type="button" title="关闭" onClick={() => onDismiss?.(item.id)}>
            <X size={14} />
          </button>
        </article>
      ))}
    </div>
  );
}

function compactWindowRange(window) {
  if (window?.start) {
    const start = parseDateParts(window.start);
    const end = parseDateParts(window.end ?? window.start);
    if (start && end) {
      if (start.month === end.month && start.day === end.day) return `${start.month}/${start.day}`;
      if (start.month === end.month) return `${start.month}/${start.day}-${end.day}`;
      return `${start.month}/${start.day}-${end.month}/${end.day}`;
    }
  }
  return formatWindowLabel(window)
    .replace(/\s*2026\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/链\s*/g, '/')
    .replace(/\s*日/g, '')
    .trim();
}

function parseDateParts(value) {
  const dateOnly = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return { month: Number(dateOnly[2]), day: Number(dateOnly[3]) };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Honolulu',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return { month: Number(parts.month), day: Number(parts.day) };
}

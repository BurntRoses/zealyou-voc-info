import {
  activityBand,
  activitySignalValue,
  cnColor,
  cnStatus,
  formatDateTime,
  formatWindowLabel,
  primaryVolcanoName,
  statusTone,
} from './formatters.js';

export const defaultNotificationPreferences = {
  inPage: true,
  signalThreshold: 45,
  channels: {
    status: true,
    windows: true,
    signal: true,
    weather: true,
    sources: false,
  },
};

export function normalizeNotificationPreferences(input = {}) {
  const channels = {
    ...defaultNotificationPreferences.channels,
    ...(input?.channels ?? {}),
  };

  return {
    ...defaultNotificationPreferences,
    ...input,
    inPage: input?.inPage !== false,
    signalThreshold: clampNumber(input?.signalThreshold, defaultNotificationPreferences.signalThreshold, 1, 100),
    channels,
  };
}

export function mergeNotificationPreferences(current, patch = {}) {
  const normalized = normalizeNotificationPreferences(current);
  return normalizeNotificationPreferences({
    ...normalized,
    ...patch,
    channels: {
      ...normalized.channels,
      ...(patch.channels ?? {}),
    },
  });
}

export function buildDashboardNotifications({ dashboard, selectedVolcano, preferences }) {
  if (!dashboard) return [];
  const prefs = normalizeNotificationPreferences(preferences);
  const channels = prefs.channels;
  const volcanoName = primaryVolcanoName(selectedVolcano?.name ?? dashboard.volcano?.name);
  const status = dashboard.officialStatus ?? {};
  const sourceUrl = dashboard.latestAdvisory?.url
    ?? dashboard.travelContext?.officialLinks?.hans
    ?? dashboard.travelContext?.officialLinks?.hvoUpdates
    ?? selectedVolcano?.officialUrl
    ?? dashboard.volcano?.officialUrl
    ?? '';
  const generatedAt = dashboard.generatedAt ?? new Date().toISOString();
  const events = [];

  if (channels.status) {
    const tone = statusTone(status.level, status.colorCode);
    if (['notice', 'watch', 'danger'].includes(tone)) {
      events.push({
        key: [
          'status',
          String(status.level ?? '').toUpperCase(),
          String(status.colorCode ?? '').toUpperCase(),
          status.updatedAt ?? generatedAt,
        ].join(':'),
        type: 'status',
        tone,
        title: `${volcanoName} 官方警戒：${cnStatus(status.level)} / ${cnColor(status.colorCode)}`,
        body: `USGS/HVO 当前火山警戒为${cnStatus(status.level)}，航空颜色为${cnColor(status.colorCode)}。`,
        meta: formatDateTime(status.updatedAt ?? generatedAt, dashboard.timeZone ?? 'Pacific/Honolulu'),
        sourceUrl,
      });
    }
  }

  if (channels.windows) {
    const activeWindow = dashboard.travelContext?.activeWindow
      ?? dashboard.travelContext?.officialWindow
      ?? dashboard.travelContext?.modelWindow
      ?? null;

    if (activeWindow?.episodeNumber && (activeWindow.start || activeWindow.label)) {
      const isModel = activeWindow.type === 'model' || /model/i.test(String(activeWindow.sourceType ?? activeWindow.status ?? ''));
      const range = activeWindow.start ? formatWindowLabel(activeWindow) : String(activeWindow.label ?? '未发布日程');
      events.push({
        key: [
          'window',
          isModel ? 'model' : 'official',
          activeWindow.episodeNumber,
          activeWindow.start ?? '',
          activeWindow.end ?? activeWindow.start ?? '',
        ].join(':'),
        type: 'window',
        tone: isModel ? 'watch' : 'notice',
        title: `${volcanoName} EP ${activeWindow.episodeNumber}${isModel ? ' 候选窗口' : ' 官方窗口'}`,
        body: isModel ? `${range}，该窗口需等待官方后续确认。` : `${range}，来源：USGS/HVO。`,
        meta: isModel ? '参考窗口' : '官方通报',
        sourceUrl: activeWindow.url ?? sourceUrl,
      });
    }
  }

  if (channels.signal) {
    const signal = activitySignalValue(dashboard.forecast, dashboard.assessment);
    if (signal >= prefs.signalThreshold) {
      const band = activityBand(signal);
      events.push({
        key: [
          'signal',
          band.key,
          Math.floor(signal / 5) * 5,
          String(dashboard.assessment?.timeframe ?? dashboard.forecast?.timeWindow ?? ''),
        ].join(':'),
        type: 'signal',
        tone: band.tone,
        title: `${volcanoName} 活动信号 ${signal}/100`,
        body: `已达到你设置的 ${prefs.signalThreshold}/100 通知阈值，当前分级为${band.label}。`,
        meta: `${band.label} · ${formatDateTime(generatedAt, dashboard.timeZone ?? 'Pacific/Honolulu')}`,
        sourceUrl,
      });
    }
  }

  if (channels.weather) {
    const weatherAlerts = Array.isArray(dashboard.weatherAlerts) ? dashboard.weatherAlerts : [];
    if (weatherAlerts.length) {
      const first = weatherAlerts[0] ?? {};
      const alertKey = weatherAlerts
        .slice(0, 5)
        .map((alert, index) => alert.id ?? alert.event ?? alert.headline ?? index)
        .join('|');
      events.push({
        key: `weather:${weatherAlerts.length}:${alertKey}`,
        type: 'weather',
        tone: 'watch',
        title: `${volcanoName} 附近有 ${weatherAlerts.length} 条天气提醒`,
        body: String(first.headline ?? first.event ?? first.description ?? 'NOAA/NWS 返回新的天气提醒。').slice(0, 180),
        meta: 'NOAA/NWS',
        sourceUrl: first.url ?? sourceUrl,
      });
    }
  }

  if (channels.sources && dashboard.diagnostics?.degraded) {
    const errors = Array.isArray(dashboard.diagnostics.errors) ? dashboard.diagnostics.errors : [];
    const errorKey = errors.map((error) => error.sourceId ?? error.message ?? 'source').join('|') || generatedAt;
    events.push({
      key: `sources:${errorKey}`,
      type: 'sources',
      tone: 'unknown',
      title: `${volcanoName} 数据源降级`,
      body: '部分公开信息暂时不可用，页面会继续使用最近可用内容。',
      meta: '更新状态',
      sourceUrl,
    });
  }

  return events;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

import {
  activityBand,
  activitySignalValue,
  cnColor,
  cnStatus,
  formatDateTime,
  formatWindowLabel,
  getQuakeArea,
  getQuakeDepthKm,
  getQuakeId,
  getQuakeMagnitude,
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
    earthquakes: true,
    tsunami: true,
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

  if (channels.earthquakes) {
    const quake = strongestRecentQuake(dashboard.earthquakes);
    if (quake) {
      const magnitude = getQuakeMagnitude(quake);
      const depthKm = getQuakeDepthKm(quake);
      const place = formatQuakeAreaZh(getQuakeArea(quake));
      events.push({
        key: [
          'earthquake',
          getQuakeId(quake),
          magnitude.toFixed(1),
          quake.time ?? '',
        ].join(':'),
        type: 'earthquake',
        tone: earthquakeTone(magnitude),
        title: `${volcanoName} 近期强震 M${magnitude.toFixed(1)}`,
        body: `${place}，震源深度 ${depthKm.toFixed(1)} km / USGS`,
        meta: formatDateTime(quake.time ?? generatedAt, dashboard.timeZone ?? 'Pacific/Honolulu'),
        sourceUrl: quake.url ?? sourceUrl,
      });
    }
  }

  if (channels.tsunami) {
    const tsunamiAlerts = (Array.isArray(dashboard.weatherAlerts) ? dashboard.weatherAlerts : []).filter(isTsunamiAlert);
    if (tsunamiAlerts.length) {
      const first = tsunamiAlerts[0] ?? {};
      const alertKey = tsunamiAlerts
        .slice(0, 5)
        .map((alert, index) => alert.id ?? alert.event ?? alert.headline ?? index)
        .join('|');
      events.push({
        key: `tsunami:${tsunamiAlerts.length}:${alertKey}`,
        type: 'tsunami',
        tone: 'danger',
        title: `${volcanoName} 海啸提醒`,
        body: String(first.headline ?? first.event ?? first.description ?? 'NOAA/NWS 发布海啸提醒。').slice(0, 180),
        meta: 'NOAA/NWS',
        sourceUrl: first.url ?? sourceUrl,
      });
    }
  }

  if (channels.weather) {
    const severeAlerts = (Array.isArray(dashboard.weatherAlerts) ? dashboard.weatherAlerts : [])
      .filter((alert) => !isTsunamiAlert(alert) && isSevereWeatherAlert(alert));
    if (severeAlerts.length) {
      const first = severeAlerts[0] ?? {};
      const alertKey = severeAlerts
        .slice(0, 5)
        .map((alert, index) => alert.id ?? alert.event ?? alert.headline ?? index)
        .join('|');
      events.push({
        key: `severe-weather:${severeAlerts.length}:${alertKey}`,
        type: 'weather',
        tone: weatherTone(first),
        title: `${volcanoName} 强天气提醒`,
        body: String(first.headline ?? first.event ?? first.description ?? 'NOAA/NWS 发布强天气提醒。').slice(0, 180),
        meta: 'NOAA/NWS',
        sourceUrl: first.url ?? sourceUrl,
      });
    }

    const weatherAlerts = (Array.isArray(dashboard.weatherAlerts) ? dashboard.weatherAlerts : [])
      .filter((alert) => !isTsunamiAlert(alert) && !isSevereWeatherAlert(alert));
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
      body: '来源需复核',
      meta: '更新状态',
      sourceUrl,
    });
  }

  return events;
}

function strongestRecentQuake(earthquakes) {
  const items = Array.isArray(earthquakes) ? earthquakes : (earthquakes?.events ?? []);
  return items
    .filter((quake) => getQuakeMagnitude(quake) >= 3)
    .sort((left, right) => {
      const magnitudeDelta = getQuakeMagnitude(right) - getQuakeMagnitude(left);
      if (Math.abs(magnitudeDelta) >= 0.5) return magnitudeDelta;
      return (Date.parse(right.time ?? '') || 0) - (Date.parse(left.time ?? '') || 0);
    })[0] ?? null;
}

function earthquakeTone(magnitude) {
  if (magnitude >= 5) return 'danger';
  if (magnitude >= 4) return 'watch';
  return 'notice';
}

function formatQuakeAreaZh(area) {
  return String(area ?? '夏威夷大岛')
    .replace(/\bof\b/gi, '距')
    .replace(/\bIsland of Hawaii\b/gi, '夏威夷大岛')
    .replace(/\bHawaii Island\b/gi, '夏威夷大岛')
    .replace(/\bHawaii\b/gi, '夏威夷')
    .replace(/\bPahala\b/gi, '帕哈拉')
    .replace(/\bKilauea\b/gi, '基拉韦厄')
    .replace(/\bMauna Loa\b/gi, '冒纳罗亚')
    .replace(/\bNaalehu\b/gi, '纳阿莱胡')
    .replace(/\bVolcano\b/gi, '火山村')
    .replace(/\bHilo\b/gi, '希洛')
    .replace(/\bKailua-Kona\b/gi, '凯卢阿-科纳')
    .replace(/\bSSE\b/g, directionZh('SSE'))
    .replace(/\bSSW\b/g, directionZh('SSW'))
    .replace(/\bNNE\b/g, directionZh('NNE'))
    .replace(/\bNNW\b/g, directionZh('NNW'))
    .replace(/\bENE\b/g, directionZh('ENE'))
    .replace(/\bESE\b/g, directionZh('ESE'))
    .replace(/\bWNW\b/g, directionZh('WNW'))
    .replace(/\bWSW\b/g, directionZh('WSW'))
    .replace(/\bN\b/g, directionZh('N'))
    .replace(/\bS\b/g, directionZh('S'))
    .replace(/\bE\b/g, directionZh('E'))
    .replace(/\bW\b/g, directionZh('W'));
}

function directionZh(value) {
  const map = {
    N: '北',
    S: '南',
    E: '东',
    W: '西',
    SSE: '南偏东',
    SSW: '南偏西',
    NNE: '北偏东',
    NNW: '北偏西',
    ENE: '东偏北',
    ESE: '东偏南',
    WNW: '西偏北',
    WSW: '西偏南',
  };
  return map[value] ?? value;
}

function alertText(alert) {
  return [
    alert?.event,
    alert?.headline,
    alert?.description,
    alert?.instruction,
    alert?.severity,
    alert?.urgency,
  ].filter(Boolean).join(' ').toLowerCase();
}

function isTsunamiAlert(alert) {
  return /\btsunami\b/.test(alertText(alert));
}

function isSevereWeatherAlert(alert) {
  return /\b(emergency|warning|flash flood|hurricane|tropical storm|severe thunderstorm|tornado|high wind|extreme wind|coastal flood|high surf|red flag|volcanic ash|special marine)\b/.test(alertText(alert));
}

function weatherTone(alert) {
  const text = alertText(alert);
  if (/\b(emergency|warning|extreme|severe|tsunami)\b/.test(text)) return 'danger';
  if (/\bwatch|advisory|expected|immediate\b/.test(text)) return 'watch';
  return 'notice';
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

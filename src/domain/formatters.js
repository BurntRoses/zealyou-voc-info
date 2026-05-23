const STATUS_ZH = {
  NORMAL: '正常',
  ADVISORY: '注意',
  WATCH: '观察',
  WARNING: '警告',
  UNKNOWN: '未知',
};

const COLOR_ZH = {
  GREEN: '绿色',
  YELLOW: '黄色',
  ORANGE: '橙色',
  RED: '红色',
  GRAY: '灰色',
  UNASSIGNED: '未分配',
  UNKNOWN: '未知',
};

const SOURCE_STATUS_ZH = {
  fresh: '实时',
  cached: '缓存',
  stale: '过期',
  failed: '失败',
  reference: '参考',
  unknown: '未知',
};

const WEATHER_ZH = new Map([
  ['Sunny', '晴'],
  ['Mostly Sunny', '大部晴'],
  ['Partly Sunny', '局部晴'],
  ['Mostly Cloudy', '大部多云'],
  ['Partly Cloudy', '局部多云'],
  ['Cloudy', '多云'],
  ['Clear', '晴朗'],
  ['Mostly Clear', '大部晴朗'],
  ['Showers Likely', '可能阵雨'],
  ['Chance Showers', '可能阵雨'],
  ['Scattered Showers', '零星阵雨'],
  ['Isolated Showers', '局部阵雨'],
  ['Rain', '降雨'],
  ['Haze', '霾'],
  ['Patchy Fog', '局部雾'],
  ['Windy', '有风'],
  ['Scattered Showers And Thunderstorms', '零星阵雨和雷雨'],
  ['Showers And Thunderstorms Likely', '可能阵雨和雷雨'],
  ['Chance Showers And Thunderstorms', '可能阵雨和雷雨'],
  ['Isolated Showers And Thunderstorms', '局部阵雨和雷雨'],
  ['Slight Chance Showers And Thunderstorms', '小概率阵雨和雷雨'],
]);

const VOLCANO_NAMES = {
  'hawaii-island': { zh: 'Hawaii Island', en: 'Hawaii Island' },
  kilauea: { zh: '基拉韦厄', en: 'Kilauea' },
  'mauna-loa': { zh: '莫纳罗亚', en: 'Mauna Loa' },
};

const SOURCE_LABELS = {
  'usgs-vsc': 'USGS 火山状态',
  'usgs-hans': 'USGS/HVO HANS',
  'usgs-earthquakes': 'USGS 地震',
  'smithsonian-gvp': 'Smithsonian GVP',
  'noaa-nws-alerts': 'NOAA/NWS 提醒',
  'noaa-nws-points': 'NOAA/NWS 网格点',
  'noaa-nws-forecast': 'NOAA/NWS 预报',
  'noaa-nws-hourly': 'NOAA/NWS 小时预报',
  'hvo-webcams': 'USGS/HVO 摄像头',
  'nps-havo': 'NPS 公园状态',
};

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function primaryVolcanoName(value, language = 'zh') {
  const text = String(value ?? '').trim();
  const parts = text.split('/').map((part) => part.trim()).filter(Boolean);
  const slug = slugify(parts.join(' '));
  const mapped = VOLCANO_NAMES[slug]
    ?? (slug.includes('hawaii-island') || slug.includes('big-island') ? VOLCANO_NAMES['hawaii-island'] : null)
    ?? (slug.includes('kilauea') ? VOLCANO_NAMES.kilauea : null)
    ?? (slug.includes('mauna') ? VOLCANO_NAMES['mauna-loa'] : null);
  if (mapped) return mapped[language] ?? mapped.zh;
  if (language === 'en') return parts[1] ?? parts[0] ?? 'Hawaii volcano';
  return parts[0] ?? '夏威夷火山';
}

export function titleCase(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

export function cnStatus(value) {
  return STATUS_ZH[String(value ?? '').trim().toUpperCase()] ?? value ?? '未知';
}

export function cnColor(value) {
  return COLOR_ZH[String(value ?? '').trim().toUpperCase()] ?? value ?? '未知';
}

export function statusTone(value, colorCode = '') {
  const text = `${value ?? ''} ${colorCode ?? ''}`.toLowerCase();
  if (text.includes('warning') || text.includes('red')) return 'danger';
  if (text.includes('watch') || text.includes('orange')) return 'watch';
  if (text.includes('advisory') || text.includes('yellow')) return 'notice';
  if (text.includes('normal') || text.includes('green')) return 'good';
  return 'unknown';
}

export function eruptionTone(state) {
  const text = String(state ?? '').toLowerCase();
  if (text.includes('erupting')) return 'danger';
  if (text.includes('paused')) return 'watch';
  if (text.includes('not')) return 'good';
  return 'notice';
}

export function resolveEruptionState(state, summary = '') {
  const current = state ?? { state: 'monitoring', label: '监测中', source: 'official' };
  const text = `${summary ?? ''} ${current.label ?? ''} ${current.state ?? ''}`.toLowerCase();
  if (/eruption of [^.]{0,100} is paused|eruption is paused|currently paused|喷发暂停/.test(text)) {
    return { ...current, state: 'paused', label: '喷发暂停' };
  }
  if (/no eruption is occurring|not erupting|no eruptive activity|当前未发生喷发|未喷发/.test(text)) {
    return { ...current, state: 'not_erupting', label: '未喷发' };
  }
  if (/currently erupting|eruption continues|ongoing eruption|正在喷发/.test(text)) {
    return { ...current, state: 'erupting', label: '正在喷发' };
  }
  return current;
}

export function localeForLanguage(language = 'zh') {
  return language === 'en' ? 'en-US' : 'zh-CN';
}

export function isValidTimeZone(timeZone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function formatDateTime(value, timeZone = 'Pacific/Honolulu', locale = 'zh-CN', options = {}) {
  if (!value) return locale.startsWith('en') ? 'pending' : '待更新';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(date);
}

export function formatClock(date, timeZone = 'Pacific/Honolulu', locale = 'zh-CN', options = {}) {
  const { seconds = true, weekday = 'short' } = options;
  return new Intl.DateTimeFormat(locale, {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    ...(weekday ? { weekday } : {}),
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(date);
}

export function dateKeyInZone(value, timeZone = 'Pacific/Honolulu') {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatWindowLabel(window, language = 'zh') {
  const label = typeof window === 'string' ? window : window?.label;
  if (!label) return language === 'en' ? 'No official short-term window' : '未发布官方短期窗口';
  if (language === 'en') return label;
  return String(label)
    .replace(/January/g, '1月')
    .replace(/February/g, '2月')
    .replace(/March/g, '3月')
    .replace(/April/g, '4月')
    .replace(/May/g, '5月')
    .replace(/June/g, '6月')
    .replace(/July/g, '7月')
    .replace(/August/g, '8月')
    .replace(/September/g, '9月')
    .replace(/October/g, '10月')
    .replace(/November/g, '11月')
    .replace(/December/g, '12月')
    .replace(/,\s*(\d{4})/g, ' $1')
    .replace(/\s*-\s*/g, ' - ');
}

export function parseIsoDay(value) {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function formatWindowDay(date, language = 'zh') {
  const locale = localeForLanguage(language);
  return {
    key: date.toISOString().slice(0, 10),
    month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date),
    day: new Intl.DateTimeFormat(locale, { day: '2-digit', timeZone: 'UTC' }).format(date),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date),
  };
}

export function buildWindowDays(window, language = 'zh') {
  const start = parseIsoDay(window?.start);
  const end = parseIsoDay(window?.end) ?? start;
  if (!start) return [];
  const span = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (span < 0 || span > 21) return [formatWindowDay(start, language)];
  return Array.from({ length: span + 1 }, (_, index) => formatWindowDay(new Date(start.getTime() + index * 86_400_000), language));
}

export function windowState(days, currentKey, language = 'zh') {
  const labels = language === 'en'
    ? { none: 'No official window', before: 'Before window', in: 'In window', after: 'Window passed' }
    : { none: '无官方窗口', before: '窗口前', in: '窗口内', after: '窗口已过' };
  if (!days.length) return { key: 'none', label: labels.none, progress: 0 };
  const first = days[0].key;
  const last = days[days.length - 1].key;
  if (currentKey < first) return { key: 'before', label: labels.before, progress: 0 };
  if (currentKey > last) return { key: 'after', label: labels.after, progress: 100 };
  const index = Math.max(0, days.findIndex((day) => day.key === currentKey));
  return { key: 'in', label: labels.in, progress: Math.round(((index + 0.5) / days.length) * 100) };
}

export function fahrenheitToCelsius(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(((number - 32) * 5) / 9) : null;
}

export function mphTextToKmh(value) {
  const text = String(value ?? '').trim();
  if (!text) return '--';
  return text.replace(/(\d+(?:\.\d+)?)\s*mph/gi, (_, speed) => `${Math.round(Number(speed) * 1.609)} km/h`);
}

export function translateForecast(text, language = 'zh') {
  const value = String(text ?? '').trim();
  if (!value) return language === 'en' ? 'No forecast' : '暂无预报';
  if (language === 'en') return value;
  const direct = WEATHER_ZH.get(value);
  if (direct) return direct;
  const lower = value.toLowerCase();
  if (lower.includes('thunderstorm') && lower.includes('shower')) return lower.includes('likely') ? '可能阵雨和雷雨' : '阵雨和雷雨';
  if (lower.includes('thunderstorm')) return '雷雨';
  if (lower.includes('shower')) return lower.includes('likely') ? '可能阵雨' : '阵雨';
  if (lower.includes('rain')) return '降雨';
  if (lower.includes('cloud')) return '多云';
  if (lower.includes('sunny')) return '晴';
  return value;
}

function precipitationValue(value) {
  if (value && typeof value === 'object') return Number(value.value ?? 0) || 0;
  return Number(value ?? 0) || 0;
}

export function getWeatherSnapshot(weather) {
  const hourly = weather?.hourly?.periods ?? [];
  const daily = weather?.forecast?.periods ?? [];
  const current = hourly[0] ?? daily[0] ?? null;
  return {
    current: current ? { ...current, precipitationChance: precipitationValue(current.precipitationChance) } : null,
    hourly,
    daily,
    celsius: fahrenheitToCelsius(current?.temperature),
    summary: translateForecast(current?.shortForecast),
    wind: mphTextToKmh(current?.windSpeed),
    windDirection: current?.windDirection ?? '',
    updatedAt: weather?.hourly?.updatedAt ?? weather?.forecast?.updatedAt,
  };
}

export function activitySignalValue(forecast = {}, assessment = {}) {
  const value = Number(forecast.activitySignal ?? assessment.likelihood?.score ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
}

export function activityBand(score, language = 'zh') {
  const value = activitySignalValue({ activitySignal: score });
  if (value >= 75) return { key: 'high', tone: 'danger', label: language === 'en' ? 'High' : '高' };
  if (value >= 45) return { key: 'elevated', tone: 'watch', label: language === 'en' ? 'Elevated' : '偏高' };
  if (value >= 20) return { key: 'watch', tone: 'notice', label: language === 'en' ? 'Watch' : '关注' };
  return { key: 'low', tone: 'good', label: language === 'en' ? 'Low' : '低' };
}

export function getQuakeId(quake) {
  return String(quake?.id ?? quake?.properties?.code ?? `${quake?.time ?? ''}-${quake?.place ?? ''}`);
}

export function getQuakeCoordinates(quake) {
  const coords = quake?.geometry?.coordinates;
  return {
    lat: Number(quake?.lat ?? quake?.coordinates?.lat ?? (Array.isArray(coords) ? coords[1] : null)),
    lon: Number(quake?.lon ?? quake?.lng ?? quake?.coordinates?.lon ?? (Array.isArray(coords) ? coords[0] : null)),
  };
}

export function getQuakeMagnitude(quake) {
  const value = Number(quake?.magnitude ?? quake?.mag ?? quake?.properties?.mag ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function getQuakeDepthKm(quake) {
  const coords = quake?.geometry?.coordinates;
  const value = Number(quake?.depthKm ?? quake?.depth ?? quake?.coordinates?.depthKm ?? (Array.isArray(coords) ? coords[2] : 0));
  return Number.isFinite(value) ? value : 0;
}

export function getQuakeArea(quake) {
  return quake?.area ?? quake?.place ?? quake?.properties?.place ?? '夏威夷岛';
}

export function getQuakeStyle(magnitude) {
  const mag = Number(magnitude) || 0;
  if (mag >= 4) return { tone: 'danger', size: 18 };
  if (mag >= 3) return { tone: 'watch', size: 15 };
  if (mag >= 2) return { tone: 'notice', size: 12 };
  return { tone: 'good', size: 9 };
}

export function getCoordinates(dashboard, selectedVolcano) {
  return dashboard?.volcano?.coordinates ?? selectedVolcano?.coordinates ?? { lat: 19.421, lon: -155.287 };
}

export function sourceLabelForStatus(status, language = 'zh') {
  const key = String(status ?? 'unknown').toLowerCase();
  return language === 'en' ? titleCase(key) : SOURCE_STATUS_ZH[key] ?? SOURCE_STATUS_ZH.unknown;
}

export function inferSourceStatus(source) {
  if (!source) return 'unknown';
  if (source.status) return String(source.status).toLowerCase();
  if (source.error) return 'failed';
  if (source.cache?.stale) return 'stale';
  if (source.cache?.hit) return 'cached';
  return 'fresh';
}

export function getSourceUrl(source) {
  return source?.url ?? source?.documentationUrl ?? null;
}

export function displaySourceLabel(value, language = 'zh') {
  const id = typeof value === 'string' ? value : value?.id;
  const label = typeof value === 'string' ? value : (value?.label ?? value?.name ?? value?.agency ?? value?.id);
  if (language === 'en') return label ?? id ?? 'Source';
  return SOURCE_LABELS[id] ?? label ?? id ?? '数据源';
}

export function getUniqueSources(sources = []) {
  const map = new Map();
  for (const raw of Array.isArray(sources) ? sources : []) {
    const source = {
      ...raw,
      label: raw?.label ?? raw?.name ?? raw?.agency ?? raw?.id ?? '数据源',
      status: inferSourceStatus(raw),
      url: getSourceUrl(raw),
    };
    const key = source.id ?? source.url ?? source.label;
    map.set(key, mergeSource(map.get(key), source));
  }
  return Array.from(map.values());
}

function mergeSource(current, next) {
  if (!current) return next;
  const rank = { failed: 5, stale: 4, cached: 3, fresh: 2, reference: 1, unknown: 0 };
  const status = (rank[next.status] ?? 0) > (rank[current.status] ?? 0) ? next.status : current.status;
  return {
    ...current,
    ...next,
    status,
    error: next.error ?? current.error,
    cache: next.cache ?? current.cache,
    notes: [...toArray(current.notes), ...toArray(next.notes)].filter(Boolean),
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : (value ? [value] : []);
}

export function formatDurationMs(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms)) return '--';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatSourceTiming(source, timeZone, locale = 'zh-CN') {
  const retrievedAt = source?.retrievedAt ?? source?.cache?.savedAt;
  return formatDateTime(retrievedAt, timeZone, locale);
}

export function cnOfficialText(text, status) {
  const value = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return '官方通报暂无摘要。';
  const lower = value.toLowerCase();
  const noEruption = /\b(no eruption is occurring|not erupting|no eruptive activity|no eruption)\b/.test(lower);
  const paused = /\b(currently paused|eruption is paused|eruption of [^.]{0,80} is paused|activity is paused|between eruption episodes)\b/.test(lower);
  const erupting = /\b(currently erupting|is erupting|eruption continues|ongoing eruption|eruptive activity continues)\b/.test(lower);
  const alert = status?.level ? `火山警戒 ${cnStatus(status.level)}` : '';
  const color = status?.colorCode ? `航空 ${cnColor(status.colorCode)}` : '';
  if (noEruption) return `当前未发生喷发。${[alert, color].filter(Boolean).join('，') || '官方状态待更新'}。`;
  if (paused) return `喷发暂停。${[alert, color].filter(Boolean).join('，') || '官方继续监测'}。`;
  if (erupting) return `正在喷发。${[alert, color].filter(Boolean).join('，') || '以 HVO 最新通报为准'}。`;
  return value.length > 180 ? `${value.slice(0, 176)}...` : value;
}

export function cnFactor(value) {
  const map = {
    quiet: '活动偏低',
    paused: '喷发暂停',
    ash: '火山灰信号',
    window: '短期窗口',
    deformation: '形变信号',
    seismic: '震动信号',
    earthquake_frequency: '地震频度',
    alert_level: '火山警戒',
    aviation_color: '航空颜色',
    earthquakes: '近场地震',
    shallow_earthquakes: '浅源地震',
    official_notice: 'HVO 通报',
    weather_alerts: '天气提醒',
  };
  return map[value] ?? String(value ?? '').replace(/_/g, ' ');
}

export function cnIntensity(value) {
  const map = {
    background: '背景',
    low: '低',
    moderate: '中等',
    elevated: '偏高',
    high: '高',
  };
  return map[String(value ?? '').toLowerCase()] ?? value ?? '未知';
}

export function cnExplanationText(text) {
  return String(text ?? '')
    .replace(/Official notice says activity is low, near background, or not erupting\./gi, '官方通报显示活动低、接近背景或未喷发。')
    .replace(/Official notice says eruptive activity is paused\./gi, '官方通报显示喷发活动暂停。')
    .replace(/Current-activity text mentions ash, explosions, or ballistic activity\./gi, '当前活动文本提及火山灰、爆炸或弹道喷出物。')
    .replace(/Official volcano alert level is ADVISORY\./gi, '官方火山警戒等级为注意。')
    .replace(/Official volcano alert level is WATCH\./gi, '官方火山警戒等级为观察。')
    .replace(/Official volcano alert level is WARNING\./gi, '官方火山警戒等级为警告。')
    .replace(/Official notice uses near-term forecast-window language\./gi, '官方通报包含短期窗口表述。')
    .replace(/Current-activity text mentions inflation, tilt, uplift, or elevated deformation\./gi, '当前活动文本提及膨胀、倾斜、抬升或形变升高。')
    .replace(/Current-activity text mentions elevated tremor or seismicity\./gi, '当前活动文本提及震颤或地震活动升高。')
    .replace(/(\d+)\s+earthquakes in\s+(\d+)\s+days\s+\([^)]+\)\s+within\s+(\d+)\s+km\./gi, '$1 次地震 / $2 日，半径 $3 km。')
    .replace(/model/gi, '模型')
    .replace(/official/gi, '官方')
    .replace(/earthquake/gi, '地震')
    .replace(/eruption/gi, '喷发')
    .replace(/forecast window/gi, '通报窗口');
}

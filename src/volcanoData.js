import { officialWebcams } from './domain/config.js';
import { slugify, titleCase } from './domain/formatters.js';

export const mockVolcanoes = [
  {
    id: 'kilauea',
    vnum: '332010',
    slug: 'kilauea',
    volcanoCd: 'hi3',
    name: '基拉韦厄 / Kilauea',
    island: 'Island of Hawaii',
    region: 'Hawaii',
    alertLevel: 'WATCH',
    colorCode: 'ORANGE',
    officialLevel: 'Watch',
    lastUpdated: '2026-05-13T19:00:00Z',
    coordinates: { lat: 19.421, lon: -155.287 },
    officialUrl: 'https://www.usgs.gov/volcanoes/kilauea',
    notice: {
      synopsis: 'The eruption at the summit of Kilauea is currently paused. Forecast models suggest that episode 48 will occur sometime between May 22 and 25, 2026.',
      url: 'https://volcanoes.usgs.gov/hans-public/volcano/332010',
    },
  },
  {
    id: 'mauna-loa',
    vnum: '332020',
    slug: 'mauna-loa',
    volcanoCd: 'hi2',
    name: '莫纳罗亚 / Mauna Loa',
    island: 'Island of Hawaii',
    region: 'Hawaii',
    alertLevel: 'NORMAL',
    colorCode: 'GREEN',
    officialLevel: 'Normal',
    lastUpdated: '2026-05-10T18:35:00Z',
    coordinates: { lat: 19.475, lon: -155.608 },
    officialUrl: 'https://www.usgs.gov/volcanoes/mauna-loa',
  },
  {
    id: 'hawaii-island',
    vnum: 'hawaii-island',
    slug: 'hawaii-island',
    volcanoCd: null,
    name: 'Hawaii Island Volcanoes',
    island: 'Island of Hawaii',
    region: 'Hawaii',
    alertLevel: 'WATCH',
    colorCode: 'ORANGE',
    officialLevel: 'Watch',
    lastUpdated: '2026-05-13T19:00:00Z',
    coordinates: { lat: 19.55, lon: -155.55 },
    officialUrl: 'https://www.usgs.gov/observatories/hvo',
    notice: {
      synopsis: 'Composite Hawaii Island view combining Kilauea, Mauna Loa, earthquakes, NOAA/NWS alerts, and HVO sources.',
      url: 'https://www.usgs.gov/observatories/hvo',
    },
  },
];

export const mockDashboards = {
  kilauea: buildMockDashboard(mockVolcanoes[0], {
    key: 'kilauea',
    eruptionState: { state: 'paused', label: '喷发暂停', source: 'official' },
    officialWindow: {
      type: 'official',
      source: 'USGS/HVO',
      episodeNumber: 47,
      start: '2026-05-13',
      end: '2026-05-14',
      label: 'May 13 - May 14, 2026',
      url: 'https://volcanoes.usgs.gov/hans-public/volcano/332010',
    },
    modelWindow: {
      type: 'model',
      source: 'HVO 参考窗口',
      episodeNumber: 48,
      start: '2026-05-22',
      end: '2026-05-25',
      label: 'May 22 - May 25, 2026',
      url: 'https://volcanoes.usgs.gov/hans-public/volcano/332010',
      note: '公开通报参考窗口',
    },
    signal: 44,
    statusSummary: 'Summit eruption is paused; the next Episode 48 reference window is May 22 to May 27, 2026.',
  }),
  'mauna-loa': buildMockDashboard(mockVolcanoes[1], {
    key: 'mauna-loa',
    eruptionState: { state: 'not_erupting', label: '未喷发', source: 'official' },
    officialWindow: null,
    signal: 8,
    statusSummary: 'Activity remains near background; no official short-term eruption window detected.',
  }),
  'hawaii-island': buildMockDashboard(mockVolcanoes[2], {
    key: 'hawaii-island',
    eruptionState: { state: 'monitoring', label: 'Composite monitoring', source: 'official' },
    officialWindow: null,
    signal: 44,
    statusSummary: 'Composite Hawaii Island monitoring view for Kilauea, Mauna Loa, earthquakes, tsunami, and severe weather alerts.',
  }),
};

function buildMockDashboard(volcano, options) {
  const generatedAt = new Date().toISOString();
  const webcamKey = options.key;
  const fallbackRadiusKm = webcamKey === 'hawaii-island' ? 100 : 50;
  const webcams = officialWebcams[webcamKey] ?? officialWebcams.kilauea;
  const earthquakes = webcamKey === 'hawaii-island'
    ? [
        quake('hv-demo-major', 19.298, -155.872, 5.9, 22.6, '13 km S of Honaunau-Napoopoo, Hawaii', '2026-05-23T07:46:01Z'),
        quake('k1', 19.406, -155.283, 2.8, 3.1, 'Halemaumau', '2026-05-12T12:30:00Z'),
        quake('m1', 19.475, -155.608, 1.4, 7.1, 'Moku aweoweo', '2026-05-12T12:00:00Z'),
      ]
    : webcamKey === 'kilauea'
    ? [
        quake('k1', 19.406, -155.283, 2.8, 3.1, 'Halemaumau', '2026-05-12T12:30:00Z'),
        quake('k2', 19.392, -155.221, 2.1, 4.5, 'South caldera', '2026-05-12T09:10:00Z'),
        quake('k3', 19.444, -155.271, 1.7, 2.2, 'Kilauea summit', '2026-05-12T06:45:00Z'),
      ]
    : [quake('m1', 19.475, -155.608, 1.4, 7.1, 'Moku aweoweo', '2026-05-12T12:00:00Z')];

  const activeWindow = isPastWindow(options.officialWindow) && options.modelWindow?.episodeNumber
    ? options.modelWindow
    : (options.officialWindow ?? options.modelWindow ?? null);
  const episodeRows = [
    ...(options.modelWindow?.episodeNumber
      ? [{
          id: `ep${options.modelWindow.episodeNumber}-model`,
          episodeNumber: options.modelWindow.episodeNumber,
          start: options.modelWindow.start,
          end: options.modelWindow.end,
          windowLabel: options.modelWindow.label,
          title: `Episode ${options.modelWindow.episodeNumber} reference window`,
          status: 'Reference window',
          source: options.modelWindow.source ?? 'HVO 参考窗口',
          sourceType: 'model',
          summary: options.modelWindow.note ?? 'Reference window from public updates; final confirmation should come from HVO.',
          url: options.modelWindow.url,
          sentUtc: volcano.lastUpdated,
        }]
      : []),
    ...(options.officialWindow
      ? [{
          id: 'ep47',
          episodeNumber: options.officialWindow.episodeNumber,
          start: options.officialWindow.start,
          end: options.officialWindow.end,
          windowLabel: options.officialWindow.label,
          title: `Episode ${options.officialWindow.episodeNumber} forecast window`,
          status: 'Forecast window',
          source: 'USGS/HVO',
          sourceType: 'official',
          summary: 'Official HVO forecast window.',
          url: options.officialWindow.url,
          sentUtc: volcano.lastUpdated,
        }]
      : []),
  ];

  return {
    generatedAt,
    timeZone: 'Pacific/Honolulu',
    volcano,
    officialStatus: {
      level: titleCase(volcano.alertLevel),
      colorCode: titleCase(volcano.colorCode),
      summary: options.statusSummary,
      updatedAt: volcano.lastUpdated,
      agency: 'USGS Hawaiian Volcano Observatory',
    },
    officialNotices: {
      total: 1,
      items: [
        {
          id: `${volcano.slug}-mock-notice`,
          sentUtc: volcano.lastUpdated,
          synopsis: options.statusSummary,
          text: options.statusSummary,
          url: volcano.notice?.url ?? volcano.officialUrl,
        },
      ],
    },
    latestAdvisory: {
      title: activeWindow?.episodeNumber
        ? `Episode ${activeWindow.episodeNumber} ${activeWindow.type === 'model' ? 'reference window' : 'forecast window'}`
        : 'Latest HVO status',
      issuedAt: volcano.lastUpdated,
      body: options.statusSummary,
      url: volcano.notice?.url ?? volcano.officialUrl,
    },
    forecast: {
      activitySignal: options.signal,
      timeWindow: activeWindow?.label ?? 'No official short-term window detected',
      intensity: options.eruptionState.label,
      confidence: options.officialWindow ? 70 : 54,
    },
    forecastSeries: buildFallbackSeries(options.signal),
    earthquakes,
    earthquakeStats: buildEarthquakeStats(earthquakes, 7, fallbackRadiusKm),
    history: {
      episodes: [
        ...episodeRows,
        ...(options.officialWindow
          ? [
              { id: 'ep46', episodeNumber: 46, start: '2026-05-06T18:17:00Z', end: '2026-05-07T03:22:00Z', title: 'Episode 46 eruption', status: 'Completed', source: 'USGS/HVO' },
              { id: 'ep45', episodeNumber: 45, start: '2026-04-23T11:34:00Z', end: '2026-04-23T20:01:00Z', title: 'Episode 45 eruption', status: 'Completed', source: 'USGS/HVO' },
            ]
          : []),
      ],
      eruptions: webcamKey === 'mauna-loa'
        ? [{ startYear: 2022, endYear: 2022, activityType: 'Confirmed Eruption', activityArea: '2022 Northeast Rift Zone eruption', vei: 0 }]
        : [],
    },
    weather: {
      point: { timeZone: 'Pacific/Honolulu' },
      forecast: { periods: [] },
      hourly: { periods: [] },
    },
    weatherAlerts: [],
    assessment: {
      disclaimer: '参考信息来自公开资料整理。',
      likelihood: { label: 'elevated', score: options.signal },
      timeframe: activeWindow?.type === 'model' ? 'model_estimate_window' : (options.officialWindow ? 'official_notice_window' : 'no_short_term_official_window'),
      confidence: { label: 'moderate', score: 0.6 },
      intensity: { label: 'moderate', score: options.signal },
      drivers: [],
      uncertainties: [],
    },
    travelContext: {
      generatedAt,
      eruptionState: options.eruptionState,
      officialWindow: options.officialWindow,
      lastOfficialWindow: options.officialWindow ?? null,
      modelWindow: options.modelWindow ?? { type: 'model', source: '参考窗口', label: '待确认窗口' },
      activeWindow,
      aviation: { colorCode: volcano.colorCode, alertLevel: volcano.alertLevel, updatedAt: volcano.lastUpdated },
      weatherSnapshot: null,
      weatherAlerts: 0,
      earthquakeSummary: buildEarthquakeStats(earthquakes, 7, fallbackRadiusKm),
      webcams,
      officialLinks: {
        volcano: volcano.officialUrl,
        hvoUpdates: volcano.officialUrl,
        hvoWebcams: webcams.sourcePage,
        npsAlerts: 'https://www.nps.gov/havo/planyourvisit/conditions.htm',
        hans: volcano.notice?.url ?? null,
      },
    },
    sources: [
      { id: 'usgs-vsc', label: 'USGS Volcano Science Center', url: volcano.officialUrl, status: 'reference' },
      { id: 'hvo-webcams', label: 'USGS/HVO Webcams', url: webcams.sourcePage, status: 'reference' },
      { id: 'nps-havo', label: 'Hawaii Volcanoes National Park Alerts', url: 'https://www.nps.gov/havo/planyourvisit/conditions.htm', status: 'reference' },
    ],
    diagnostics: { degraded: false, errors: [] },
    disclaimer: '本页汇总公开信息；安全、通行与航空判断以 USGS/HVO、NOAA/NWS、NPS 及当地部门公告为准。',
  };
}

function quake(id, lat, lon, magnitude, depthKm, area, time) {
  return { id, lat, lon, magnitude, mag: magnitude, depthKm, area, place: area, time, coordinates: { lat, lon } };
}

export function normalizeVolcanoes(payload) {
  const items = Array.isArray(payload) ? payload : (payload?.data ?? payload?.volcanoes);
  if (!Array.isArray(items) || items.length === 0) return mockVolcanoes;

  const tracked = items.filter((item) => {
    const key = String(item.vnum ?? item.id ?? item.slug ?? '').toLowerCase();
    const nameSlug = slugify(item.name);
    return ['332010', '332020', 'kilauea', 'mauna-loa', 'hawaii-island', 'big-island'].includes(key) || nameSlug === 'kilauea' || nameSlug === 'mauna-loa' || nameSlug === 'hawaii-island';
  });

  return (tracked.length ? tracked : items).map((item, index) => {
    const slug = item.slug ?? slugify(item.name ?? item.title ?? item.id ?? index);
    const vnum = String(item.vnum ?? item.id ?? '');
    return {
      id: slug || vnum || String(index),
      vnum,
      slug,
      volcanoCd: item.volcanoCd ?? null,
      name: displayName(item.name ?? item.title ?? 'Unknown volcano'),
      island: item.island ?? item.location ?? item.region ?? 'Island of Hawaii',
      region: item.region ?? item.island ?? item.location ?? 'Hawaii',
      coordinates: item.coordinates ?? null,
      officialUrl: item.officialUrl ?? item.url ?? null,
      imageUrl: item.imageUrl ?? null,
      notice: item.notice ?? null,
      alertLevel: item.alertLevel ?? item.officialLevel ?? item.status?.level ?? 'Unknown',
      colorCode: item.colorCode ?? item.status?.colorCode ?? item.aviationColor ?? 'Gray',
      officialLevel: titleCase(item.alertLevel ?? item.officialLevel ?? item.status?.level ?? 'Unknown'),
      lastUpdated: item.lastUpdated ?? item.updatedAt ?? item.alertDate ?? item.colorDate ?? null,
    };
  });
}

export function normalizeDashboard(payload, volcanoId) {
  const fallback = mockDashboards[volcanoId] ?? mockDashboards.kilauea;
  if (!payload || typeof payload !== 'object') return fallback;
  if (payload.data?.volcano) return normalizeEnvelopeDashboard(payload, fallback);
  return {
    ...fallback,
    ...payload,
    volcano: { ...fallback.volcano, ...(payload.volcano ?? {}) },
    officialStatus: { ...fallback.officialStatus, ...(payload.officialStatus ?? payload.status ?? {}) },
    forecast: { ...fallback.forecast, ...(payload.forecast ?? {}) },
    travelContext: { ...fallback.travelContext, ...(payload.travelContext ?? {}) },
  };
}

function normalizeEnvelopeDashboard(payload, fallback) {
  const data = payload.data ?? {};
  const volcano = normalizeVolcano(data.volcano ?? fallback.volcano, fallback.volcano);
  const assessment = data.assessment ?? fallback.assessment;
  const officialNotices = data.officialNotices ?? fallback.officialNotices;
  const latestNotice = officialNotices?.items?.[0] ?? {};
  const extractedEpisodes = extractOfficialEpisodes(officialNotices?.items, volcano.notice?.synopsis);
  const history = normalizeHistory(data.history, fallback.history, officialNotices?.items, extractedEpisodes);
  const travelContext = normalizeTravelContext(data.travelContext, fallback.travelContext, volcano, history);
  const officialWindow = travelContext.officialWindow ?? firstOfficialEpisode(history, { model: false })?.window ?? null;
  const activeWindow = travelContext.activeWindow
    ?? (isPastWindow(officialWindow) && travelContext.modelWindow?.episodeNumber ? travelContext.modelWindow : (officialWindow ?? travelContext.modelWindow ?? null));
  const earthquakes = normalizeEarthquakes(data.earthquakes, fallback.earthquakes);
  const earthquakeStats = data.earthquakes?.stats ?? buildEarthquakeStats(earthquakes, data.earthquakes?.days ?? 7, data.earthquakes?.radiusKm ?? 50);
  const signal = clampPercent(assessment?.likelihood?.score ?? fallback.forecast.activitySignal);

  return {
    ...fallback,
    generatedAt: payload.generatedAt,
    endpoint: payload.endpoint,
    timeZone: data.weather?.point?.timeZone ?? fallback.timeZone,
    diagnostics: payload.diagnostics ?? data.diagnostics ?? fallback.diagnostics,
    disclaimer: payload.disclaimer ?? assessment?.disclaimer ?? fallback.disclaimer,
    volcano,
    officialStatus: {
      level: titleCase(volcano.alertLevel ?? latestNotice.extractedCodes?.alertLevel ?? fallback.officialStatus.level),
      colorCode: titleCase(volcano.colorCode ?? latestNotice.extractedCodes?.colorCode ?? fallback.officialStatus.colorCode),
      summary: volcano.notice?.synopsis ?? latestNotice.synopsis ?? fallback.officialStatus.summary,
      updatedAt: volcano.alertDate ?? volcano.colorDate ?? latestNotice.sentUtc ?? payload.generatedAt,
      agency: 'USGS Hawaiian Volcano Observatory',
    },
    officialNotices,
    latestAdvisory: {
      title: episodeTitle(latestNotice, history) ?? fallback.latestAdvisory.title,
      issuedAt: latestNotice.sentUtc ?? volcano.alertDate ?? payload.generatedAt,
      body: latestNotice.synopsis ?? volcano.notice?.synopsis ?? fallback.latestAdvisory.body,
      url: latestNotice.url ?? volcano.notice?.url ?? volcano.officialUrl,
    },
    forecast: {
      activitySignal: signal,
      timeWindow: activeWindow?.label ?? officialWindow?.label ?? fallback.forecast.timeWindow,
      intensity: travelContext?.eruptionState?.label ?? fallback.forecast.intensity,
      confidence: Math.round(Number(assessment?.confidence?.score ?? 0.5) * 100),
    },
    forecastSeries: buildForecastSeries(data.earthquakes?.dailyCounts, signal, fallback.forecastSeries),
    earthquakes,
    earthquakeStats,
    history,
    weather: data.weather ?? fallback.weather,
    weatherAlerts: Array.isArray(data.weatherAlerts) ? data.weatherAlerts : fallback.weatherAlerts,
    assessment,
    travelContext: {
      ...travelContext,
      officialWindow,
      activeWindow,
      earthquakeSummary: travelContext.earthquakeSummary ?? earthquakeStats,
    },
    sources: Array.isArray(payload.sources) ? payload.sources.map(normalizeSource) : fallback.sources,
  };
}

function normalizeVolcano(volcano, fallback) {
  return {
    ...fallback,
    ...volcano,
    id: String(volcano.slug ?? slugify(volcano.name) ?? volcano.id ?? fallback.id),
    vnum: String(volcano.vnum ?? volcano.id ?? fallback.vnum ?? ''),
    slug: volcano.slug ?? slugify(volcano.name),
    name: displayName(volcano.name ?? fallback.name),
    officialLevel: titleCase(volcano.alertLevel ?? fallback.officialLevel),
    colorCode: titleCase(volcano.colorCode ?? fallback.colorCode),
    lastUpdated: volcano.alertDate ?? volcano.colorDate ?? fallback.lastUpdated,
  };
}

function normalizeEarthquakes(raw, fallback = []) {
  if (Array.isArray(raw)) return raw;
  const events = Array.isArray(raw?.events) ? raw.events : fallback;
  return events.map((event) => ({
    ...event,
    id: event.id,
    lat: event.lat ?? event.coordinates?.lat,
    lon: event.lon ?? event.coordinates?.lon,
    magnitude: event.magnitude ?? event.mag ?? 0,
    mag: event.mag ?? event.magnitude ?? 0,
    depthKm: event.depthKm ?? event.coordinates?.depthKm ?? 0,
    area: event.area ?? event.place ?? 'Hawaii',
    place: event.place ?? event.area ?? 'Hawaii',
    time: event.time ?? null,
    url: event.url ?? null,
  }));
}

function normalizeHistory(history, fallback = {}, notices = [], extractedEpisodes = []) {
  const next = history && typeof history === 'object' ? history : {};
  const hasEpisodeArray = Array.isArray(next.episodes);
  const official = hasEpisodeArray ? next.episodes : extractedEpisodes;
  const episodes = hasEpisodeArray
    ? mergeLatestNoticeIntoEpisodes(official, notices)
    : (official.length ? mergeLatestNoticeIntoEpisodes(official, notices) : (fallback.episodes ?? []));
  return {
    ...fallback,
    ...next,
    profile: next.profile ?? fallback.profile ?? null,
    episodes,
    eruptions: Array.isArray(next.eruptions) ? next.eruptions : (fallback.eruptions ?? []),
  };
}

function normalizeTravelContext(travelContext, fallback, volcano, history) {
  const key = slugify(volcano.name).includes('mauna') ? 'mauna-loa' : 'kilauea';
  const webcams = normalizeWebcams(travelContext?.webcams, fallback.webcams ?? officialWebcams[key]);
  const officialWindow = travelContext?.officialWindow ?? firstOfficialEpisode(history, { model: false })?.window ?? null;
  const modelWindow = travelContext?.modelWindow ?? fallback.modelWindow ?? { type: 'model', source: '参考窗口', label: '待确认窗口' };
  const officialLinks = {
    ...fallback.officialLinks,
    ...(travelContext?.officialLinks ?? {}),
    volcano: volcano.officialUrl ?? travelContext?.officialLinks?.volcano ?? fallback.officialLinks?.volcano,
    hvoWebcams: travelContext?.officialLinks?.hvoWebcams ?? webcams.sourcePage,
  };
  return {
    ...fallback,
    ...travelContext,
    officialWindow,
    lastOfficialWindow: travelContext?.lastOfficialWindow ?? officialWindow ?? null,
    modelWindow,
    activeWindow: travelContext?.activeWindow ?? (isPastWindow(officialWindow) && modelWindow?.episodeNumber ? modelWindow : (officialWindow ?? modelWindow)),
    webcams,
    officialLinks,
  };
}

function isPastWindow(window) {
  const end = window?.end ?? window?.start;
  if (!end) return false;
  const endMs = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(String(end)) ? `${end}T23:59:59-10:00` : end);
  return Number.isFinite(endMs) ? endMs < Date.now() : false;
}

function normalizeWebcams(webcams, fallback) {
  if (!webcams?.cameras?.length) return fallback;
  return {
    ...fallback,
    ...webcams,
    cameras: webcams.cameras.map((camera) => ({
      ...camera,
      id: camera.id ?? String(camera.code).toLowerCase(),
      imageUrl: camera.imageUrl ?? `https://volcanoes.usgs.gov/cams/${camera.code}/images/M.jpg`,
      timelapseUrl: camera.timelapseUrl ?? `https://volcanoes.usgs.gov/observatories/hvo/cams/${camera.code}/images/${camera.code}.gif`,
    })),
  };
}

function normalizeSource(source) {
  return {
    ...source,
    label: source.label ?? source.name ?? source.agency ?? source.id ?? 'Unknown source',
    url: source.url ?? source.documentationUrl ?? null,
  };
}

function firstOfficialEpisode(history, options = {}) {
  const includeModel = options.model !== false;
  const episode = Array.isArray(history?.episodes)
    ? history.episodes.find((item) => {
        const isModel = item?.sourceType === 'model' || item?.type === 'model' || /model/i.test(`${item?.status ?? ''} ${item?.source ?? ''}`);
        return (includeModel || !isModel) && (item?.windowLabel || item?.start);
      })
    : null;
  if (!episode) return null;
  return {
    window: {
      type: 'official',
      source: 'USGS/HVO',
      episodeNumber: episode.episodeNumber,
      start: episode.start,
      end: episode.end,
      label: episode.windowLabel,
      url: episode.url,
    },
  };
}

function episodeTitle(latestNotice, history) {
  const text = `${latestNotice?.synopsis ?? ''} ${latestNotice?.text ?? ''}`;
  const fromNotice = forecastEpisodeNumber(text);
  const number = fromNotice ?? history?.episodes?.[0]?.episodeNumber;
  if (number) return `Episode ${number} HVO update`;
  return latestNotice?.type ? `HVO ${latestNotice.type}` : null;
}

function buildForecastSeries(dailyCounts = [], score = 0, fallback = []) {
  const rows = Array.isArray(dailyCounts) ? dailyCounts : [];
  if (!rows.length) return fallback.length ? fallback : buildFallbackSeries(score);
  return rows.map((point, index) => ({
    day: String(point.date ?? point.day ?? index + 1).slice(5),
    activitySignal: clampPercent(score - (rows.length - index - 1) * 2),
    tremor: clampPercent(Number(point.count ?? 0) * 3),
    count: Number(point.count ?? 0),
  }));
}

function buildFallbackSeries(score) {
  return ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'D'].map((day, index) => ({
    day,
    activitySignal: clampPercent(score - 1 + Math.min(index, 1)),
    tremor: clampPercent(score * 0.28 + index * 2),
    count: index + 1,
  }));
}

function buildEarthquakeStats(earthquakes, days = 7, radiusKm = 50) {
  const magnitudes = earthquakes.map((event) => Number(event.mag ?? event.magnitude ?? 0)).filter(Number.isFinite);
  return {
    days,
    radiusKm,
    count: earthquakes.length,
    maxMagnitude: magnitudes.length ? Math.max(...magnitudes) : null,
    latestEventTime: earthquakes[0]?.time ?? null,
  };
}

function displayName(value) {
  const text = String(value ?? '').replace(/K澧╨auea/g, 'Kilauea').replace(/K墨lauea/g, 'Kilauea');
  const slug = slugify(text);
  if (slug.includes('hawaii-island') || slug.includes('big-island')) return 'Hawaii Island Volcanoes';
  if (slug.includes('kilauea')) return '基拉韦厄 / Kilauea';
  if (slug.includes('mauna-loa')) return '莫纳罗亚 / Mauna Loa';
  return text;
}

function clampPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function extractOfficialEpisodes(notices = [], fallbackText = '') {
  const rows = [];
  const candidates = [...(Array.isArray(notices) ? notices : []), { id: 'volcano-notice', synopsis: fallbackText }];
  for (const notice of candidates) {
    const text = String(`${notice?.synopsis ?? ''} ${notice?.text ?? ''}`).replace(/\s+/g, ' ');
    if (!/forecast window/i.test(text)) continue;
    const episode = forecastEpisodeNumber(text);
    const range = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*-\s*(?:(January|February|March|April|May|June|July|August|September|October|November|December)\s+)?(\d{1,2}),\s*(\d{4})/i);
    if (!episode || !range) continue;
    const startMonth = MONTHS[range[1].toLowerCase()];
    const endMonth = MONTHS[(range[3] ?? range[1]).toLowerCase()];
    const start = isoDay(range[5], startMonth, range[2]);
    const end = isoDay(range[5], endMonth, range[4]);
    rows.push({
      id: notice?.id ?? `episode-${episode}`,
      episodeNumber: Number(episode),
      start,
      end,
      windowLabel: `${range[1]} ${range[2]} - ${range[3] ? `${range[3]} ` : ''}${range[4]}, ${range[5]}`,
      title: `Episode ${episode} forecast window`,
      status: 'Forecast window',
      source: 'USGS/HVO',
      summary: `Official HVO window: ${range[1]} ${range[2]} - ${range[3] ? `${range[3]} ` : ''}${range[4]}, ${range[5]}.`,
      sentUtc: notice?.sentUtc,
      url: notice?.url,
    });
  }
  const deduped = new Map();
  for (const row of rows) {
    const key = `${row.episodeNumber}:${row.start}:${row.end}`;
    const current = deduped.get(key);
    if (!current || Date.parse(row.sentUtc ?? 0) > Date.parse(current.sentUtc ?? 0)) {
      deduped.set(key, row);
    }
  }
  return Array.from(deduped.values()).sort((a, b) => Number(b.episodeNumber ?? 0) - Number(a.episodeNumber ?? 0));
}

function forecastEpisodeNumber(text) {
  const value = String(text ?? '');
  const focused = value.match(/forecast\s+window[^.]{0,180}?(?:episode|episo|epis\.?|ep\.?)\s*(\d+)/i)
    ?? value.match(/onset[^.]{0,120}?(?:episode|episo|epis\.?|ep\.?)\s*(\d+)/i);
  if (focused?.[1]) return focused[1];
  const matches = Array.from(value.matchAll(/\b(?:episode|episo|epis\.?|ep\.?)\s*(\d+)/gi)).map((match) => match[1]);
  return matches.at(-1);
}

function mergeLatestNoticeIntoEpisodes(episodes, notices = []) {
  return episodes.map((episode) => {
    const match = notices.find((notice) => new RegExp(`\\bepisode\\s*${episode.episodeNumber}\\b`, 'i').test(`${notice?.synopsis ?? ''} ${notice?.text ?? ''}`));
    return match ? { ...episode, sentUtc: match.sentUtc ?? episode.sentUtc, url: match.url ?? episode.url } : episode;
  });
}

function isoDay(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

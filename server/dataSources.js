const runtimeEnv = globalThis.process?.env ?? {};
const DEFAULT_TIMEOUT_MS = Number(runtimeEnv.API_TIMEOUT_MS ?? 8000);
const DEFAULT_USER_AGENT =
  runtimeEnv.API_USER_AGENT ?? "VocInfo/0.1 public volcano dashboard";

const VSC_VOLCANOES_URL =
  "https://volcanoes.usgs.gov/vsc/api/volcanoApi/geojson";
const HANS_SEARCH_URL = "https://volcanoes.usgs.gov/hans-public/api/search/search";
const EARTHQUAKE_QUERY_URL =
  "https://earthquake.usgs.gov/fdsnws/event/1/query";
const GVP_WFS_URL = "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows";
const NOAA_ALERTS_URL = "https://api.weather.gov/alerts/active";
const NOAA_POINTS_URL = "https://api.weather.gov/points";

const CACHE_TTL_MS = {
  volcanoes: 5 * 60 * 1000,
  hans: 2 * 60 * 1000,
  earthquakes: 30 * 1000,
  gvp: 24 * 60 * 60 * 1000,
  noaa: 60 * 1000,
  noaaPoints: 12 * 60 * 60 * 1000,
  noaaForecast: 3 * 60 * 1000,
};

const STALE_TTL_MS = {
  volcanoes: 6 * 60 * 60 * 1000,
  hans: 60 * 60 * 1000,
  earthquakes: 30 * 60 * 1000,
  gvp: 7 * 24 * 60 * 60 * 1000,
  noaa: 30 * 60 * 1000,
  noaaPoints: 7 * 24 * 60 * 60 * 1000,
  noaaForecast: 2 * 60 * 60 * 1000,
};

const HANS_EPISODE_LOOKBACK_DAYS = 120;
const HANS_EPISODE_PAGE_COUNT = 4;
const HAWAII_ISLAND_ID = "hawaii-island";
const HAWAII_ISLAND_DEFAULT_RADIUS_KM = 100;
const HAWAII_ISLAND_CENTER = { lat: 19.55, lon: -155.55 };
const HAWAII_ISLAND_COMPONENT_IDS = ["kilauea", "mauna-loa"];
const HAWAII_ISLAND_ALERT_POINTS = [
  { id: "hawaii-island-center", name: "Hawaii Island", coordinates: HAWAII_ISLAND_CENTER },
  { id: "kilauea-alert-point", name: "Kilauea", coordinates: { lat: 19.421, lon: -155.287 } },
  { id: "mauna-loa-alert-point", name: "Mauna Loa", coordinates: { lat: 19.475, lon: -155.608 } },
  { id: "hilo-alert-point", name: "Hilo", coordinates: { lat: 19.707, lon: -155.088 } },
  { id: "kona-alert-point", name: "Kailua-Kona", coordinates: { lat: 19.641, lon: -155.996 } },
];
const ALERT_LEVEL_RANK = { UNASSIGNED: 0, NORMAL: 1, ADVISORY: 2, WATCH: 3, WARNING: 4 };
const COLOR_CODE_RANK = { UNASSIGNED: 0, GREEN: 1, YELLOW: 2, ORANGE: 3, RED: 4 };

const SOURCE_DEFINITIONS = {
  "usgs-vsc": {
    id: "usgs-vsc",
    name: "USGS Volcano Science Center Volcano Status API",
    agency: "U.S. Geological Survey",
    documentationUrl: "https://volcanoes.usgs.gov/vsc/api/",
  },
  "usgs-hans": {
    id: "usgs-hans",
    name: "USGS HANS Public API",
    agency: "U.S. Geological Survey",
    documentationUrl: "https://volcanoes.usgs.gov/hans-public/api/search/",
  },
  "usgs-earthquakes": {
    id: "usgs-earthquakes",
    name: "USGS Earthquake FDSN Event GeoJSON API",
    agency: "U.S. Geological Survey",
    documentationUrl: "https://earthquake.usgs.gov/fdsnws/event/1/",
  },
  "smithsonian-gvp": {
    id: "smithsonian-gvp",
    name: "Smithsonian Global Volcanism Program WFS",
    agency: "Smithsonian Institution",
    documentationUrl: "https://volcano.si.edu/database/webservices.cfm",
  },
  "noaa-nws-alerts": {
    id: "noaa-nws-alerts",
    name: "NOAA/National Weather Service Alerts API",
    agency: "NOAA/National Weather Service",
    documentationUrl: "https://www.weather.gov/documentation/services-web-api",
  },
  "noaa-nws-points": {
    id: "noaa-nws-points",
    name: "NOAA/National Weather Service Points API",
    agency: "NOAA/National Weather Service",
    documentationUrl: "https://www.weather.gov/documentation/services-web-api",
  },
  "noaa-nws-forecast": {
    id: "noaa-nws-forecast",
    name: "NOAA/National Weather Service Forecast API",
    agency: "NOAA/National Weather Service",
    documentationUrl: "https://www.weather.gov/documentation/services-web-api",
  },
  "noaa-nws-hourly": {
    id: "noaa-nws-hourly",
    name: "NOAA/National Weather Service Hourly Forecast API",
    agency: "NOAA/National Weather Service",
    documentationUrl: "https://www.weather.gov/documentation/services-web-api",
  },
  "hvo-webcams": {
    id: "hvo-webcams",
    name: "USGS/HVO Webcams",
    agency: "U.S. Geological Survey",
    documentationUrl: "https://www.usgs.gov/observatories/hvo/multimedia/webcams",
  },
  "nps-havo": {
    id: "nps-havo",
    name: "Hawaii Volcanoes National Park Alerts",
    agency: "National Park Service",
    documentationUrl: "https://www.nps.gov/havo/planyourvisit/conditions.htm",
  },
};

const cache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeInteger(value) {
  const number = safeNumber(value);
  return number === null ? null : Math.trunc(number);
}

function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function serializeError(error) {
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      body: options.body,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
        ...options.headers,
      },
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}: ${text.slice(0, 240)}`,
      );
    }

    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeout);
  }
}

async function cachedJson(key, fetcher, ttlMs, staleTtlMs, options = {}) {
  const cached = cache.get(key);
  const currentTime = Date.now();

  if (!options.forceRefresh && cached && currentTime - cached.savedAt <= ttlMs) {
    return {
      ok: true,
      data: cached.data,
      error: null,
      cache: {
        key,
        hit: true,
        stale: false,
        savedAt: new Date(cached.savedAt).toISOString(),
        ageMs: currentTime - cached.savedAt,
      },
    };
  }

  try {
    const data = await fetcher();
    cache.set(key, { data, savedAt: currentTime });
    return {
      ok: true,
      data,
      error: null,
      cache: {
        key,
        hit: false,
        stale: false,
        savedAt: new Date(currentTime).toISOString(),
        ageMs: 0,
      },
    };
  } catch (error) {
    if (cached && currentTime - cached.savedAt <= staleTtlMs) {
      return {
        ok: false,
        data: cached.data,
        error: serializeError(error),
        cache: {
          key,
          hit: true,
          stale: true,
          savedAt: new Date(cached.savedAt).toISOString(),
          ageMs: currentTime - cached.savedAt,
        },
      };
    }

    return {
      ok: false,
      data: null,
      error: serializeError(error),
      cache: {
        key,
        hit: false,
        stale: false,
        savedAt: null,
        ageMs: null,
      },
    };
  }
}

function sourceResult(id, url, result, notes = []) {
  const failed = !result.ok && result.data === null;
  return {
    ...SOURCE_DEFINITIONS[id],
    url,
    retrievedAt: nowIso(),
    cache: result.cache,
    status: failed
      ? "failed"
      : result.cache?.stale
        ? "stale"
        : result.cache?.hit
          ? "cached"
          : "fresh",
    error: result.error,
    notes,
  };
}

function referenceSource(id, url, notes = []) {
  return {
    ...SOURCE_DEFINITIONS[id],
    url,
    retrievedAt: nowIso(),
    cache: null,
    status: "reference",
    error: null,
    notes,
  };
}

const OFFICIAL_LINKS = {
  kilauea: {
    hvoUpdates: "https://www.usgs.gov/volcanoes/kilauea/volcano-updates",
    hvoWebcams: "https://www.usgs.gov/volcanoes/kilauea/webcams",
    npsAlerts: "https://www.nps.gov/havo/planyourvisit/conditions.htm",
  },
  "mauna-loa": {
    hvoUpdates: "https://www.usgs.gov/volcanoes/mauna-loa/volcano-updates",
    hvoWebcams: "https://www.usgs.gov/volcanoes/mauna-loa/webcams",
    npsAlerts: "https://www.nps.gov/havo/planyourvisit/conditions.htm",
  },
};

const HVO_WEBCAMS = {
  kilauea: {
    defaultCamera: "V1cam",
    sourcePage: OFFICIAL_LINKS.kilauea.hvoWebcams,
    cameras: [
      ["V1cam", "西 Halemaumau 火山口", "峰顶主视角"],
      ["V2cam", "东 Halemaumau 火山口", "峰顶东侧"],
      ["V3cam", "南 Halemaumau 火山口", "峰顶南侧"],
      ["F1cam", "Halemaumau 热成像", "热异常与夜间辉光"],
      ["KWcam", "Kilauea 峰顶西缘", "峰顶全景"],
      ["B1cam", "Kilauea 破裂块与火山口", "峰顶形变区域"],
      ["K2cam", "Kaluapele / Kilauea caldera", "Uekahuna 视角"],
      ["KPcam", "Kilauea 峰顶与 Mauna Loa Strip Road", "峰顶道路方向"],
      ["S1cam", "西南裂谷带", "裂谷带视角"],
      ["MITDcam", "中东裂谷带", "裂谷带视角"],
      ["KOcam", "上东裂谷带", "Maunaulu 方向"],
      ["PEcam", "Puu Oo 东坡", "东裂谷带视角"],
      ["PWcam", "Puu Oo 西坡", "东裂谷带视角"],
      ["R3cam", "移动机位 3", "临时监测机位"],
      ["MUcam", "Maunaulu 全景", "东裂谷带全景"],
      ["HPcam", "Holei Pali", "下东裂谷带视角"],
      ["PGcam", "Leilani Estates 裂隙区", "历史裂隙区"],
    ],
  },
  "mauna-loa": {
    defaultCamera: "MLcam",
    sourcePage: OFFICIAL_LINKS["mauna-loa"].hvoWebcams,
    cameras: [
      ["MLcam", "Moku aweoweo 火山口", "峰顶主视角"],
      ["MTcam", "Mauna Loa 峰顶", "峰顶视角"],
      ["MOcam", "南峰顶", "峰顶南侧"],
      ["SPcam", "西南裂谷带", "裂谷带视角"],
      ["MSTcam", "峰顶热成像", "热异常"],
      ["HLcam", "北坡", "山坡视角"],
      ["MKcam", "山坡", "山坡视角"],
      ["M1cam", "峰顶与东北裂谷热成像", "热异常"],
      ["MSPcam", "西南热成像", "热异常"],
    ],
  },
};

function isHawaiiIslandId(id) {
  const wanted = slugify(id);
  return wanted === HAWAII_ISLAND_ID || wanted === "big-island" || wanted === "island-of-hawaii";
}

function strongestCode(items, field, rank) {
  return (Array.isArray(items) ? items : []).reduce((best, item) => {
    const value = normalizeString(item?.[field])?.toUpperCase();
    if (!value) return best;
    const bestRank = rank[best] ?? -1;
    const valueRank = rank[value] ?? -1;
    return valueRank > bestRank ? value : best;
  }, null);
}

function latestTimestamp(items, fields) {
  const values = [];
  for (const item of Array.isArray(items) ? items : []) {
    for (const field of fields) {
      const value = normalizeString(item?.[field]);
      const time = Date.parse(value ?? "");
      if (Number.isFinite(time)) values.push({ value, time });
    }
  }
  values.sort((left, right) => right.time - left.time);
  return values[0]?.value ?? null;
}

function buildHawaiiIslandVolcano(volcanoes = []) {
  const components = HAWAII_ISLAND_COMPONENT_IDS
    .map((id) => findVolcano(volcanoes, id))
    .filter(Boolean);
  const alertLevel = strongestCode(components, "alertLevel", ALERT_LEVEL_RANK);
  const colorCode = strongestCode(components, "colorCode", COLOR_CODE_RANK);
  const synopsis = components
    .map((volcano) => `${volcano.name}: ${volcano.alertLevel ?? "UNKNOWN"} / ${volcano.colorCode ?? "UNKNOWN"}`)
    .join("; ");

  return {
    id: HAWAII_ISLAND_ID,
    vnum: HAWAII_ISLAND_ID,
    volcanoCd: null,
    slug: HAWAII_ISLAND_ID,
    name: "Hawaii Island Volcanoes",
    coordinates: { ...HAWAII_ISLAND_CENTER },
    observatory: "hvo",
    region: "Hawaii",
    officialUrl: "https://www.usgs.gov/observatories/hvo",
    imageUrl: components.find((volcano) => volcano.imageUrl)?.imageUrl ?? null,
    statusIconUrl: components.find((volcano) => volcano.statusIconUrl)?.statusIconUrl ?? null,
    notice: {
      id: `composite-${components.map((volcano) => volcano.notice?.id).filter(Boolean).join("-") || "hvo"}`,
      synopsis: synopsis || "Composite Hawaii Island volcano status.",
      url: "https://www.usgs.gov/observatories/hvo",
    },
    alertLevel,
    colorCode,
    alertDate: latestTimestamp(components, ["alertDate"]),
    colorDate: latestTimestamp(components, ["colorDate"]),
    nvewsThreat: components.find((volcano) => volcano.nvewsThreat)?.nvewsThreat ?? null,
    components: components.map((volcano) => volcano.id),
    sourceIds: ["usgs-vsc"],
  };
}

function volcanoKey(volcano) {
  const value = slugify(`${volcano?.slug ?? ""} ${volcano?.name ?? ""} ${volcano?.vnum ?? ""}`);
  if (value.includes("mauna") || value.includes("332020")) return "mauna-loa";
  return "kilauea";
}

function webcamImageUrl(code, mode = "live") {
  return mode === "timelapse"
    ? `https://volcanoes.usgs.gov/observatories/hvo/cams/${code}/images/${code}.gif`
    : `https://volcanoes.usgs.gov/cams/${code}/images/M.jpg`;
}

function getOfficialLinks(volcano) {
  if (isHawaiiIslandId(volcano?.id ?? volcano?.slug ?? volcano?.name)) {
    return {
      volcano: "https://www.usgs.gov/observatories/hvo",
      hvoUpdates: "https://www.usgs.gov/observatories/hvo/volcano-updates",
      hvoWebcams: "https://www.usgs.gov/observatories/hvo/multimedia/webcams",
      npsAlerts: "https://www.nps.gov/havo/planyourvisit/conditions.htm",
      hans: "https://volcanoes.usgs.gov/hans-public/",
    };
  }
  const key = volcanoKey(volcano);
  const base = OFFICIAL_LINKS[key] ?? OFFICIAL_LINKS.kilauea;
  return {
    volcano: volcano?.officialUrl ?? base.hvoUpdates,
    hvoUpdates: base.hvoUpdates,
    hvoWebcams: base.hvoWebcams,
    npsAlerts: base.npsAlerts,
    hans: volcano?.notice?.url ?? (volcano?.vnum ? `https://volcanoes.usgs.gov/hans-public/volcano/${volcano.vnum}` : null),
  };
}

function getWebcamManifest(volcano) {
  const manifest = HVO_WEBCAMS[volcanoKey(volcano)] ?? HVO_WEBCAMS.kilauea;
  return {
    ...manifest,
    cameras: manifest.cameras.map(([code, label, role]) => ({
      id: code.toLowerCase(),
      code,
      label,
      role,
      imageUrl: webcamImageUrl(code, "live"),
      timelapseUrl: webcamImageUrl(code, "timelapse"),
      pageUrl: `https://volcanoes.usgs.gov/observatories/hvo/cams/panorama.php?cam=${code}`,
    })),
  };
}

function inferEruptionState(volcano, notices) {
  const text = [
    volcano?.notice?.synopsis,
    ...(Array.isArray(notices) ? notices.slice(0, 3).flatMap((notice) => [notice?.synopsis, notice?.text]) : []),
  ].filter(Boolean).join(" ").toLowerCase();

  if (/\b(currently paused|eruption is paused|eruption of [^.]{0,80} is paused|paused eruptive activity|between eruption episodes|activity is paused)\b/.test(text)) {
    return { state: "paused", label: "喷发暂停", source: "official" };
  }
  if (/\b(no eruption is occurring|not erupting|no eruptive activity|no eruption)\b/.test(text)) {
    return { state: "not_erupting", label: "未喷发", source: "official" };
  }
  if (/\b(currently erupting|is erupting|eruption continues|ongoing eruption|active lava|lava is erupting|eruptive activity continues)\b/.test(text)) {
    return { state: "erupting", label: "正在喷发", source: "official" };
  }
  return { state: "monitoring", label: "监测中", source: "official" };
}

function buildTravelContext({ volcano, notices, officialEpisodes, weather, weatherAlerts, earthquakes, radiusKm, days }) {
  const windowEpisodes = officialEpisodes.filter((episode) => episode?.windowLabel || episode?.start);
  const officialWindow = windowEpisodes.find((episode) => episode?.sourceType !== "model") ?? null;
  const modelWindowEpisode = windowEpisodes.find((episode) => episode?.sourceType === "model") ?? null;
  const officialWindowContext = officialWindow ? episodeToWindowContext(officialWindow, "official", "USGS/HVO") : null;
  const modelWindowContext = modelWindowEpisode
    ? episodeToWindowContext(modelWindowEpisode, "model", "HVO 模型估算")
    : buildFallbackModelWindow(officialWindowContext);
  const activeWindow = !isWindowPast(officialWindowContext)
    ? officialWindowContext
    : modelWindowContext?.start
      ? modelWindowContext
      : null;
  const links = getOfficialLinks(volcano);
  const webcams = getWebcamManifest(volcano);
  const latestHourly = weather?.hourly?.periods?.[0] ?? weather?.forecast?.periods?.[0] ?? null;

  return {
    generatedAt: nowIso(),
    eruptionState: inferEruptionState(volcano, notices),
    officialWindow: officialWindowContext ? { ...officialWindowContext, url: officialWindowContext.url ?? links.hans } : null,
    lastOfficialWindow: officialWindowContext ? { ...officialWindowContext, url: officialWindowContext.url ?? links.hans } : null,
    modelWindow: modelWindowContext ? { ...modelWindowContext, url: modelWindowContext.url ?? links.hans } : null,
    activeWindow: activeWindow ? { ...activeWindow, url: activeWindow.url ?? links.hans } : null,
    aviation: {
      colorCode: normalizeString(volcano?.colorCode),
      alertLevel: normalizeString(volcano?.alertLevel),
      updatedAt: normalizeString(volcano?.colorDate ?? volcano?.alertDate),
    },
    weatherSnapshot: latestHourly
      ? {
          updatedAt: weather?.hourly?.updatedAt ?? weather?.forecast?.updatedAt ?? null,
          temperature: latestHourly.temperature,
          temperatureUnit: latestHourly.temperatureUnit,
          windSpeed: latestHourly.windSpeed,
          windDirection: latestHourly.windDirection,
          precipitationChance: latestHourly.precipitationChance,
          shortForecast: latestHourly.shortForecast,
        }
      : null,
    weatherAlerts: Array.isArray(weatherAlerts) ? weatherAlerts.length : 0,
    earthquakeSummary: {
      days,
      radiusKm,
      count: earthquakes?.stats?.count ?? 0,
      maxMagnitude: earthquakes?.stats?.maxMagnitude ?? null,
      latestEventTime: earthquakes?.stats?.latestEventTime ?? null,
    },
    webcams,
    officialLinks: links,
  };
}

function episodeToWindowContext(episode, type, source) {
  return {
    type,
    source,
    episodeNumber: episode?.episodeNumber ?? null,
    start: episode?.start ?? null,
    end: episode?.end ?? null,
    label: episode?.windowLabel ?? null,
    url: episode?.url ?? null,
    status: episode?.status ?? null,
    note: episode?.sourceType === "model"
      ? "HVO 模型估算"
      : "USGS/HVO 官方窗口",
  };
}

function buildFallbackModelWindow(lastOfficialWindow) {
  const nextEpisode = safeInteger(lastOfficialWindow?.episodeNumber) === null
    ? null
    : safeInteger(lastOfficialWindow?.episodeNumber) + 1;
  return {
    type: "model",
    source: "模型估算",
    episodeNumber: nextEpisode,
    start: null,
    end: null,
    label: nextEpisode
      ? `EP ${nextEpisode} 候选窗口`
      : "模型估算窗口",
    url: lastOfficialWindow?.url ?? null,
    status: "Model boundary",
    note: "模型估算",
  };
}

function isWindowPast(window) {
  if (!window?.start && !window?.end) return false;
  const end = window.end ?? window.start;
  const endMs = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(String(end)) ? `${end}T23:59:59-10:00` : end);
  return Number.isFinite(endMs) ? endMs < Date.now() : false;
}

function decodeHtmlEntities(text) {
  return String(text ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    );
}

function htmlToText(html) {
  return decodeHtmlEntities(
    String(html ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractSpanText(html, spanName) {
  const match = String(html ?? "").match(
    new RegExp(
      `<span[^>]+name=["']${spanName}["'][^>]*>([\\s\\S]*?)<\\/span>`,
      "i",
    ),
  );
  return match ? htmlToText(match[1]) : null;
}

function extractCurrentCode(text, label) {
  const match = String(text ?? "").match(
    new RegExp(`${label}:\\s*([^\\n\\r<]+)`, "i"),
  );
  return match ? match[1].trim().toUpperCase().replace(/\s+/g, " ") : null;
}

function normalizeVolcanoFeature(feature) {
  const properties = feature?.properties ?? {};
  const coordinates = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [];
  const lon = safeNumber(coordinates[0]);
  const lat = safeNumber(coordinates[1]);
  const vnum = normalizeString(properties.vnum ?? properties.vNum);
  const volcanoCd = normalizeString(properties.volcanoCd);
  const name = normalizeString(properties.volcanoName ?? properties.name);

  return {
    id: vnum ?? volcanoCd ?? slugify(name),
    vnum,
    volcanoCd,
    slug: slugify(name ?? vnum ?? volcanoCd),
    name,
    coordinates: lat === null || lon === null ? null : { lat, lon },
    observatory: normalizeString(properties.obs)?.toLowerCase() ?? null,
    region: normalizeString(properties.region),
    officialUrl: normalizeString(properties.volcanoUrl),
    imageUrl: normalizeString(properties.volcanoImage),
    statusIconUrl: normalizeString(properties.statusIconUrl),
    notice: {
      id: normalizeString(properties.noticeId),
      synopsis: normalizeString(properties.noticeSynopsis),
      url: normalizeString(properties.noticeUrl),
    },
    alertLevel: normalizeString(properties.alertLevel)?.toUpperCase() ?? null,
    colorCode: normalizeString(properties.colorCode)?.toUpperCase() ?? null,
    alertDate: normalizeString(properties.alertDate),
    colorDate: normalizeString(properties.colorDate),
    nvewsThreat: normalizeString(properties.nvewsThreat),
    sourceIds: ["usgs-vsc"],
  };
}

function normalizeHansNotice(notice) {
  const html = normalizeString(notice?.noticeHtml);
  const text = htmlToText(html);
  const identifier = normalizeString(
    notice?.noticeIdentifier ?? notice?.noticeId ?? notice?.id,
  );
  const synopsis =
    extractSpanText(html, "synopsis") ??
    normalizeString(notice?.noticeSynopsis) ??
    text.split("\n").find((line) => line.length > 40) ??
    null;

  return {
    id: identifier ?? `${notice?.noticeTypeCd ?? "notice"}-${notice?.sentUnixtime}`,
    type: normalizeString(notice?.noticeTypeCd),
    sentUtc: normalizeString(notice?.sentUtc),
    sentUnixtime: safeInteger(notice?.sentUnixtime),
    observatory: normalizeString(notice?.obsAbbr)?.toLowerCase() ?? null,
    volcanoCodes:
      normalizeString(notice?.volcCds)
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean) ?? [],
    url:
      normalizeString(notice?.permLink) ??
      (identifier
        ? `https://volcanoes.usgs.gov/hans2/view/notice/${encodeURIComponent(
            identifier,
          )}`
        : null),
    synopsis,
    text,
    extractedCodes: {
      alertLevel: extractCurrentCode(text, "Current Volcano Alert Level"),
      colorCode: extractCurrentCode(text, "Current Aviation Color Code"),
    },
    sourceIds: ["usgs-hans"],
  };
}

function extractEpisodeNumber(text) {
  const value = String(text ?? "");
  const matches = Array.from(
    value.matchAll(/\b(?:episode|episo|epis\.?|ep\.?)\s*(?:no\.?|number)?[\s#:-]*(\d{1,3})\b/gi),
  );
  if (matches.length === 0) return null;

  const scored = matches
    .map((match) => {
      const index = match.index ?? 0;
      const episodeNumber = Number(match[1]);
      const sentenceStart = Math.max(
        value.lastIndexOf(".", index),
        value.lastIndexOf("!", index),
        value.lastIndexOf("?", index),
        value.lastIndexOf("\n", index),
      );
      const sentenceEndCandidates = [".", "!", "?", "\n"]
        .map((token) => value.indexOf(token, index + match[0].length))
        .filter((candidate) => candidate >= 0);
      const sentenceEnd = sentenceEndCandidates.length > 0
        ? Math.min(...sentenceEndCandidates)
        : value.length;
      const sentence = value.slice(sentenceStart + 1, sentenceEnd).toLowerCase();
      const context = value
        .slice(Math.max(0, index - 120), index + match[0].length + 180)
        .toLowerCase();
      const before = value.slice(Math.max(0, index - 80), index).toLowerCase();
      const after = value.slice(index + match[0].length, index + match[0].length + 90).toLowerCase();
      let score = 0;
      if (/\bforecast\s+window\b|\bonset\b|\bexpected\b|\blikely\b|\banticipated\b|\bmost\s+likely\b/.test(sentence)) score += 120;
      else if (/\bforecast\s+window\b|\bonset\b|\bexpected\b|\blikely\b|\banticipated\b|\bmost\s+likely\b/.test(context)) score += 60;
      if (/\b(?:began|started|resumed|occurred|ended|stopped|completed)\b[^.\n]{0,180}\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(sentence)) score += 55;
      if (/\bfountaining\b|\bfountain\b|\beruption\b|\blava\b/.test(sentence)) score += 25;
      else if (/\bfountaining\b|\bfountain\b|\beruption\b|\blava\b/.test(context)) score += 10;
      if (/\bcurrently\s+paused\b|\bremains\s+paused\b|\bpaused\b/.test(sentence)) score += 30;
      if (/\bended\b|\bcompleted\b|\bprevious\b|\bprior\b|\boccurred\b|\bbegan\b/.test(sentence) && !/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(sentence)) score -= 80;
      if (/\bprior\s+to\s*$|\bprevious\s*$|\bbefore\s*$|\bpatterns?\s*$/.test(before)) score -= 220;
      if (/^\s*(?:and|or|,|-)\s*\d{1,3}\b/.test(after) && /\bprior\s+to\b|\bprevious\b|\bbefore\b/.test(before)) score -= 180;
      return { episodeNumber, index, score };
    })
    .filter((item) => Number.isFinite(item.episodeNumber));

  if (scored.length === 0) return null;
  scored.sort((left, right) =>
    right.score - left.score ||
    right.index - left.index ||
    right.episodeNumber - left.episodeNumber,
  );
  return scored[0].score > 0 ? scored[0].episodeNumber : null;
}

function compactEpisodeCue(text, episodeNumber) {
  const normalized = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  const episodePattern = new RegExp(
    `\\b(?:episode|episo|epis\\.?|ep\\.?)\\s*(?:no\\.?|number)?[\\s#:-]*${episodeNumber}\\b`,
    "i",
  );
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const picked = sentences.filter((sentence) =>
    episodePattern.test(sentence) ||
      /\bforecast\s+window\b|\bfountaining\b|\bmost\s+likely\b|\bpaused\b|\bonset\b/i.test(sentence),
  );

  return picked
    .slice(0, 2)
    .join(" ")
    .slice(0, 360)
    .trim();
}

function buildOfficialEpisodeSummary(text, episodeNumber, window, options = {}) {
  const cue = compactEpisodeCue(text, episodeNumber);
  const base = options.modelEstimate
    ? (window?.label
      ? `HVO model estimate for Episode ${episodeNumber}: ${window.label}.`
      : `HVO model-estimate wording detected for Episode ${episodeNumber}.`)
    : options.observedOnly
      ? (window?.label
        ? `HVO Episode ${episodeNumber} activity record: ${window.label}.`
        : `HVO Episode ${episodeNumber} activity wording detected.`)
      : (window?.label
        ? `Official HVO Episode ${episodeNumber} window: ${window.label}.`
        : `Official HVO Episode ${episodeNumber} wording detected.`);
  return cue ? `${base} ${cue}` : base;
}

function monthNumber(monthName) {
  const key = String(monthName ?? "").toLowerCase().slice(0, 3);
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
  }[key] ?? null;
}

function isoDateFromParts(monthName, day, year) {
  const month = monthNumber(monthName);
  const numericDay = safeInteger(day);
  const numericYear = safeInteger(year);
  if (!month || !numericDay || !numericYear) return null;
  return `${numericYear}-${String(month).padStart(2, "0")}-${String(numericDay).padStart(2, "0")}`;
}

function extractOfficialWindow(text, sentUtc) {
  const value = String(text ?? "").replace(/[\u2010-\u2015\u2212]/g, "-");
  const fallbackYear =
    safeInteger(String(sentUtc ?? "").slice(0, 4)) ?? new Date().getUTCFullYear();
  const sameMonth = value.match(
    /\b([A-Z][a-z]+)\s+(\d{1,2})\s*-\s*(?:([A-Z][a-z]+)\s+)?(\d{1,2}),?\s*(\d{4})\b/,
  );
  if (sameMonth) {
    const startMonth = sameMonth[1];
    const endMonth = sameMonth[3] ?? startMonth;
    const year = sameMonth[5];
    return {
      label: `${startMonth} ${sameMonth[2]} - ${endMonth} ${sameMonth[4]}, ${year}`,
      start: isoDateFromParts(startMonth, sameMonth[2], year),
      end: isoDateFromParts(endMonth, sameMonth[4], year),
    };
  }

  const between = value.match(
    /between\s+(?:[A-Z][a-z]+,\s*)?([A-Z][a-z]+)\s+(\d{1,2})\s+and\s+(?:(?:[A-Z][a-z]+,\s*)?([A-Z][a-z]+)\s+)?(\d{1,2})(?:,?\s*(\d{4}))?/i,
  );
  if (between) {
    const year = between[5] ?? fallbackYear;
    const endMonth = between[3] ?? between[1];
    return {
      label: `${between[1]} ${between[2]} - ${endMonth} ${between[4]}, ${year}`,
      start: isoDateFromParts(between[1], between[2], year),
      end: isoDateFromParts(endMonth, between[4], year),
    };
  }

  const singleDate = value.match(
    /forecast window[^.\n]*?\b([A-Z][a-z]+)\s+(\d{1,2}),?\s*(\d{4})\b/i,
  );
  if (singleDate) {
    return {
      label: `${singleDate[1]} ${singleDate[2]}, ${singleDate[3]}`,
      start: isoDateFromParts(singleDate[1], singleDate[2], singleDate[3]),
      end: null,
    };
  }

  return null;
}

function extractObservedEpisodeWindow(text, episodeNumber, sentUtc) {
  const value = String(text ?? "").replace(/[\u2010-\u2015\u2212]/g, "-");
  const fallbackYear =
    safeInteger(String(sentUtc ?? "").slice(0, 4)) ?? new Date().getUTCFullYear();
  const episodePattern = new RegExp(
    `\\b(?:episode|episo|epis\\.?|ep\\.?)\\s*(?:no\\.?|number)?[\\s#:-]*${episodeNumber}\\b[^.\\n]{0,420}`,
    "gi",
  );
  const segments = Array.from(value.matchAll(episodePattern))
    .map((match) => match[0])
    .filter(Boolean);

  for (const segment of segments) {
    if (/\bforecast\s+window\b|\bforecast\s+models?\b|\bmodels?\s+suggest\b/i.test(segment)) {
      continue;
    }

    const betweenDates = segment.match(
      /\b([A-Z][a-z]+)\s+(\d{1,2})\s*(?:-|to|and)\s*(?:([A-Z][a-z]+)\s+)?(\d{1,2})(?:,?\s*(\d{4}))?/i,
    );
    if (betweenDates) {
      const year = betweenDates[5] ?? fallbackYear;
      const endMonth = betweenDates[3] ?? betweenDates[1];
      return {
        label: `${betweenDates[1]} ${betweenDates[2]} - ${endMonth} ${betweenDates[4]}, ${year}`,
        start: isoDateFromParts(betweenDates[1], betweenDates[2], year),
        end: isoDateFromParts(endMonth, betweenDates[4], year),
      };
    }

    const datedAction = segment.match(
      /\b(?:began|started|resumed|occurred|ended|stopped)[^.]{0,160}?\bon\s+([A-Z][a-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i,
    );
    const plainEpisodeDate = segment.match(
      /\b([A-Z][a-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?\b/i,
    );
    const match = datedAction ?? plainEpisodeDate;
    if (match) {
      const year = match[3] ?? fallbackYear;
      const start = isoDateFromParts(match[1], match[2], year);
      if (!start) continue;
      return {
        label: `${match[1]} ${match[2]}, ${year}`,
        start,
        end: start,
      };
    }
  }

  return null;
}

function hasOfficialWindow(episode) {
  return Boolean(episode?.windowLabel || episode?.end);
}

function mergeOfficialEpisode(current, next) {
  if (!current) return next;

  const currentTime = Date.parse(current.sentUtc ?? current.start ?? "");
  const nextTime = Date.parse(next.sentUtc ?? next.start ?? "");
  const nextIsNewer =
    Number.isFinite(nextTime) &&
    (!Number.isFinite(currentTime) || nextTime >= currentTime);
  const newer = nextIsNewer ? next : current;
  const older = nextIsNewer ? current : next;
  const merged = { ...older, ...newer };

  if (!hasOfficialWindow(newer) && hasOfficialWindow(older)) {
    merged.start = older.start ?? merged.start;
    merged.end = older.end ?? merged.end;
    merged.windowLabel = older.windowLabel ?? merged.windowLabel;
    merged.summary = older.summary ?? merged.summary;
    if (/forecast/i.test(String(older.title ?? "")) && !/forecast/i.test(String(newer.title ?? ""))) {
      merged.title = older.title;
    }
    if (/forecast/i.test(String(older.status ?? "")) && !/forecast/i.test(String(newer.status ?? ""))) {
      merged.status = older.status;
    }
  }

  if (older.windowKind === "forecast" && newer.windowKind !== "forecast") {
    merged.start = older.start ?? merged.start;
    merged.end = older.end ?? merged.end;
    merged.windowLabel = older.windowLabel ?? merged.windowLabel;
    merged.windowKind = older.windowKind;
    merged.summary = older.summary ?? merged.summary;
    merged.status = older.status ?? merged.status;
    merged.title = older.title ?? merged.title;
  }

  return merged;
}

export function normalizeOfficialEpisodes(notices) {
  const byEpisode = new Map();

  for (const notice of Array.isArray(notices) ? notices : []) {
    const text = [notice?.synopsis, notice?.text].filter(Boolean).join("\n");
    const episodeNumber = extractEpisodeNumber(text);
    if (!episodeNumber) continue;

    const forecastContext = /forecast\s+window|\bforecast\s+models?\b|\bmodels?\s+suggest\b|\bonset\b|\bexpected\b|\blikely\b|\bwill\s+occur\b|\bmost\s+likely\b/i.test(text);
    const forecastWindow = forecastContext ? extractOfficialWindow(text, notice?.sentUtc) : null;
    const observedWindow = forecastWindow
      ? null
      : extractObservedEpisodeWindow(text, episodeNumber, notice?.sentUtc);
    const window = forecastWindow ?? observedWindow;
    const paused = /\bpaused\b/i.test(text);
    const modelEstimate = /\bforecast models?\b|\bmodels?\s+suggest\b/i.test(text);
    const forecast = Boolean(forecastWindow) || forecastContext;
    const observedOnly = Boolean(observedWindow && !forecastWindow && !modelEstimate);
    const episode = {
      id: `hans-${notice?.id ?? notice?.sentUnixtime ?? episodeNumber}-episode-${episodeNumber}`,
      episodeNumber,
      start: window?.start ?? notice?.sentUtc ?? null,
      end: window?.end ?? null,
      windowLabel: window?.label ?? null,
      title: forecast
        ? `Episode ${episodeNumber} ${modelEstimate ? "model estimate" : "forecast window"}`
        : observedOnly
          ? `Episode ${episodeNumber} activity`
          : `Episode ${episodeNumber}`,
      status: modelEstimate ? "Model estimate" : forecast ? "Forecast window" : observedOnly ? "Completed episode" : paused ? "Paused" : "Official notice",
      sourceType: modelEstimate ? "model" : "official",
      windowKind: modelEstimate ? "model-estimate" : forecast ? "forecast" : observedOnly ? "observed" : null,
      source: "USGS HVO",
      summary: buildOfficialEpisodeSummary(text, episodeNumber, window, { modelEstimate, observedOnly }),
      noticeId: notice?.id ?? null,
      url: notice?.url ?? null,
      sentUtc: notice?.sentUtc ?? null,
      sourceIds: ["usgs-hans"],
    };
    byEpisode.set(episodeNumber, mergeOfficialEpisode(byEpisode.get(episodeNumber), episode));
  }

  const episodes = Array.from(byEpisode.values()).sort((left, right) => {
    const rightTime = Date.parse(right.sentUtc ?? right.start ?? "");
    const leftTime = Date.parse(left.sentUtc ?? left.start ?? "");
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
  const windowed = episodes.filter(hasOfficialWindow);
  return windowed.length > 0 ? windowed : episodes.slice(0, 1);
}

function normalizeEarthquakeFeature(feature) {
  const properties = feature?.properties ?? {};
  const coordinates = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [];
  const time = safeInteger(properties.time);
  const lon = safeNumber(coordinates[0]);
  const lat = safeNumber(coordinates[1]);

  return {
    id: normalizeString(feature?.id),
    time: time === null ? null : new Date(time).toISOString(),
    mag: safeNumber(properties.mag),
    depthKm: safeNumber(coordinates[2]),
    place: normalizeString(properties.place),
    type: normalizeString(properties.type),
    status: normalizeString(properties.status),
    url: normalizeString(properties.url),
    coordinates: lat === null || lon === null ? null : { lat, lon },
    sourceIds: ["usgs-earthquakes"],
  };
}

function normalizeEarthquakes(data, days, radiusKm) {
  const events = (Array.isArray(data?.features) ? data.features : [])
    .map(normalizeEarthquakeFeature)
    .filter((event) => event.time && event.type === "earthquake");
  const magnitudes = events
    .map((event) => event.mag)
    .filter((mag) => Number.isFinite(mag));
  const shallowThresholdKm = 5;
  const shallowCount = events.filter(
    (event) => event.depthKm !== null && event.depthKm <= shallowThresholdKm,
  ).length;
  const buckets = new Map();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    buckets.set(date, 0);
  }

  for (const event of events) {
    const date = event.time.slice(0, 10);
    if (buckets.has(date)) buckets.set(date, buckets.get(date) + 1);
  }

  return {
    radiusKm,
    days,
    shallowThresholdKm,
    events,
    stats: {
      count: events.length,
      countPerDay: Number((events.length / Math.max(days, 1)).toFixed(2)),
      shallowCount,
      shallowRatio:
        events.length === 0
          ? 0
          : Number((shallowCount / events.length).toFixed(3)),
      maxMagnitude: magnitudes.length === 0 ? null : Math.max(...magnitudes),
      averageMagnitude:
        magnitudes.length === 0
          ? null
          : Number(
              (
                magnitudes.reduce((total, mag) => total + mag, 0) /
                magnitudes.length
              ).toFixed(2),
            ),
      latestEventTime: events[0]?.time ?? null,
    },
    dailyCounts: Array.from(buckets, ([date, count]) => ({ date, count })),
    sourceIds: ["usgs-earthquakes"],
  };
}

function normalizeGvpFeature(feature) {
  const properties = feature?.properties ?? {};
  const coordinates = Array.isArray(feature?.geometry?.coordinates)
    ? feature.geometry.coordinates
    : [];
  const lat = safeNumber(properties.Latitude) ?? safeNumber(coordinates[1]);
  const lon = safeNumber(properties.Longitude) ?? safeNumber(coordinates[0]);

  return {
    vnum: normalizeString(properties.Volcano_Number),
    name: normalizeString(properties.Volcano_Name),
    primaryVolcanoType: normalizeString(properties.Primary_Volcano_Type),
    landform: normalizeString(properties.Volcanic_Landform),
    lastEruptionYear: safeInteger(properties.Last_Eruption_Year),
    country: normalizeString(properties.Country),
    region: normalizeString(properties.Region),
    subregion: normalizeString(properties.Subregion),
    elevationM: safeNumber(properties.Elevation),
    tectonicSetting: normalizeString(properties.Tectonic_Setting),
    geologicEpoch: normalizeString(properties.Geologic_Epoch),
    evidenceCategory: normalizeString(properties.Evidence_Category),
    geologicalSummary: normalizeString(properties.Geological_Summary),
    primaryPhoto: {
      url: normalizeString(properties.Primary_Photo_Link),
      caption: normalizeString(properties.Primary_Photo_Caption),
      credit: normalizeString(properties.Primary_Photo_Credit),
    },
    coordinates: lat === null || lon === null ? null : { lat, lon },
    sourceIds: ["smithsonian-gvp"],
  };
}

function normalizeNoaaAlerts(data) {
  return (Array.isArray(data?.features) ? data.features : []).map((feature) => {
    const properties = feature?.properties ?? {};
    return {
      id: normalizeString(properties.id ?? feature?.id),
      event: normalizeString(properties.event),
      headline: normalizeString(properties.headline),
      description: normalizeString(properties.description),
      instruction: normalizeString(properties.instruction),
      severity: normalizeString(properties.severity),
      certainty: normalizeString(properties.certainty),
      urgency: normalizeString(properties.urgency),
      areaDesc: normalizeString(properties.areaDesc),
      effective: normalizeString(properties.effective),
      expires: normalizeString(properties.expires),
      url: normalizeString(properties["@id"] ?? properties.id),
      sourceIds: ["noaa-nws-alerts"],
    };
  });
}

function normalizeNwsPoint(data) {
  const properties = data?.properties ?? {};
  const relativeLocation = properties.relativeLocation?.properties ?? {};
  const coordinates = Array.isArray(data?.geometry?.coordinates)
    ? data.geometry.coordinates
    : [];

  return {
    gridId: normalizeString(properties.gridId),
    gridX: safeInteger(properties.gridX),
    gridY: safeInteger(properties.gridY),
    forecastUrl: normalizeString(properties.forecast),
    forecastHourlyUrl: normalizeString(properties.forecastHourly),
    forecastGridDataUrl: normalizeString(properties.forecastGridData),
    forecastZoneUrl: normalizeString(properties.forecastZone),
    countyUrl: normalizeString(properties.county),
    timeZone: normalizeString(properties.timeZone) ?? "Pacific/Honolulu",
    relativeLocation: {
      city: normalizeString(relativeLocation.city),
      state: normalizeString(relativeLocation.state),
      distanceValue: safeNumber(relativeLocation.distance?.value),
      bearingValue: safeNumber(relativeLocation.bearing?.value),
    },
    coordinates:
      coordinates[1] === undefined || coordinates[0] === undefined
        ? null
        : {
            lat: safeNumber(coordinates[1]),
            lon: safeNumber(coordinates[0]),
          },
    sourceIds: ["noaa-nws-points"],
  };
}

function normalizeWeatherPeriod(period, sourceId) {
  const precipitation =
    safeNumber(period?.probabilityOfPrecipitation?.value) ??
    safeNumber(period?.probabilityOfPrecipitation);

  return {
    number: safeInteger(period?.number),
    name: normalizeString(period?.name),
    startTime: normalizeString(period?.startTime),
    endTime: normalizeString(period?.endTime),
    isDaytime:
      typeof period?.isDaytime === "boolean" ? period.isDaytime : null,
    temperature: safeNumber(period?.temperature),
    temperatureUnit: normalizeString(period?.temperatureUnit),
    temperatureTrend: normalizeString(period?.temperatureTrend),
    windSpeed: normalizeString(period?.windSpeed),
    windDirection: normalizeString(period?.windDirection),
    icon: normalizeString(period?.icon),
    shortForecast: normalizeString(period?.shortForecast),
    detailedForecast: normalizeString(period?.detailedForecast),
    precipitationChance: precipitation,
    sourceIds: [sourceId],
  };
}

function normalizeWeatherForecast(data, sourceId) {
  const properties = data?.properties ?? {};
  return {
    updatedAt: normalizeString(
      properties.generatedAt ?? properties.updateTime ?? properties.updated,
    ),
    units: normalizeString(properties.units),
    periods: (Array.isArray(properties.periods) ? properties.periods : [])
      .map((period) => normalizeWeatherPeriod(period, sourceId))
      .filter((period) => period.startTime || period.name || period.shortForecast),
  };
}

function buildEarthquakeUrl(volcano, days, radiusKm) {
  const params = new URLSearchParams({
    format: "geojson",
    latitude: String(volcano.coordinates.lat),
    longitude: String(volcano.coordinates.lon),
    maxradiuskm: String(radiusKm),
    starttime: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    endtime: new Date().toISOString(),
    orderby: "time",
    limit: "20000",
  });
  return `${EARTHQUAKE_QUERY_URL}?${params.toString()}`;
}

function buildGvpUrl(vnum) {
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: "GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes",
    outputFormat: "application/json",
    CQL_FILTER: `Volcano_Number=${Number(vnum)}`,
  });
  return `${GVP_WFS_URL}?${params.toString()}`;
}

function buildNoaaAlertsUrl(coordinates) {
  const params = new URLSearchParams({
    point: `${coordinates.lat.toFixed(4)},${coordinates.lon.toFixed(4)}`,
  });
  return `${NOAA_ALERTS_URL}?${params.toString()}`;
}

function buildNwsPointsUrl(coordinates) {
  return `${NOAA_POINTS_URL}/${coordinates.lat.toFixed(4)},${coordinates.lon.toFixed(4)}`;
}

export async function getVolcanoes(options = {}) {
  const result = await cachedJson(
    "usgs-vsc:volcanoes",
    () => fetchJson(VSC_VOLCANOES_URL),
    CACHE_TTL_MS.volcanoes,
    STALE_TTL_MS.volcanoes,
    options,
  );
  const volcanoes = (Array.isArray(result.data?.features)
    ? result.data.features
    : []
  )
    .map(normalizeVolcanoFeature)
    .filter((volcano) => volcano.id && volcano.name);
  const hawaiiIsland = buildHawaiiIslandVolcano(volcanoes);

  return {
    volcanoes: [hawaiiIsland, ...volcanoes],
    sources: [
      sourceResult("usgs-vsc", VSC_VOLCANOES_URL, result, [
        "Primary volcano inventory, status, alert/color codes, and current notice synopsis.",
      ]),
    ],
    diagnostics: {
      degraded: !result.ok,
      errors: result.error
        ? [{ sourceId: "usgs-vsc", error: result.error }]
        : [],
    },
  };
}

export function findVolcano(volcanoes, id) {
  const wanted = slugify(id);
  return volcanoes.find((volcano) =>
    [volcano.id, volcano.vnum, volcano.volcanoCd, volcano.slug, volcano.name]
      .map(slugify)
      .includes(wanted),
  );
}

export async function getHansNotices(volcano, days, options = {}) {
  const endUnixtime = Math.floor(Date.now() / 1000);
  const body = {
    obsAbbr: volcano.observatory ?? "",
    noticeTypeCd: "",
    volcCd: volcano.volcanoCd ?? "",
    startUnixtime: endUnixtime - days * 24 * 60 * 60,
    endUnixtime,
    searchText: volcano.volcanoCd ? "" : (volcano.name ?? ""),
  };
  const pageCount = days >= HANS_EPISODE_LOOKBACK_DAYS ? HANS_EPISODE_PAGE_COUNT : 1;
  const result = await cachedJson(
    `usgs-hans:${volcano.volcanoCd ?? volcano.id}:${days}:pages-${pageCount}`,
    async () => {
      const pages = await Promise.all(
        Array.from({ length: pageCount }, (_, pageIndex) =>
          fetchJson(HANS_SEARCH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, pageIndex }),
          }),
        ),
      );
      const noticesById = new Map();
      for (const page of pages) {
        for (const notice of Array.isArray(page?.noticeData) ? page.noticeData : []) {
          const key = notice?.noticeIdentifier ?? notice?.noticeId ?? notice?.id ?? `${notice?.noticeTypeCd ?? "notice"}-${notice?.sentUnixtime}`;
          noticesById.set(key, notice);
        }
      }
      return {
        noticeTotal: Math.max(...pages.map((page) => safeInteger(page?.noticeTotal) ?? 0), noticesById.size),
        noticeData: Array.from(noticesById.values()),
      };
    },
    CACHE_TTL_MS.hans,
    STALE_TTL_MS.hans,
    options,
  );
  const notices = Array.isArray(result.data?.noticeData)
    ? result.data.noticeData.map(normalizeHansNotice)
    : [];

  return {
    notices,
    total: safeInteger(result.data?.noticeTotal) ?? notices.length,
    sources: [
      sourceResult("usgs-hans", HANS_SEARCH_URL, result, [
        "Public HANS search API. Field names are parsed defensively.",
      ]),
    ],
    diagnostics: {
      degraded: !result.ok,
      errors: result.error
        ? [{ sourceId: "usgs-hans", error: result.error }]
        : [],
    },
  };
}

export async function getEarthquakes(volcano, days, radiusKm, options = {}) {
  if (!volcano.coordinates) {
    return {
      earthquakes: normalizeEarthquakes(null, days, radiusKm),
      sources: [],
      diagnostics: {
        degraded: true,
        errors: [
          {
            sourceId: "usgs-earthquakes",
            error: { message: "Volcano coordinates are missing." },
          },
        ],
      },
    };
  }

  const url = buildEarthquakeUrl(volcano, days, radiusKm);
  const result = await cachedJson(
    `usgs-earthquakes:${volcano.id}:${days}:${radiusKm}`,
    () => fetchJson(url),
    CACHE_TTL_MS.earthquakes,
    STALE_TTL_MS.earthquakes,
    options,
  );

  return {
    earthquakes: normalizeEarthquakes(result.data, days, radiusKm),
    sources: [
      sourceResult("usgs-earthquakes", url, result, [
        "FDSN event query centered on volcano coordinates.",
      ]),
    ],
    diagnostics: {
      degraded: !result.ok,
      errors: result.error
        ? [{ sourceId: "usgs-earthquakes", error: result.error }]
        : [],
    },
  };
}

export async function getGvpHistory(volcano, options = {}) {
  if (!volcano.vnum || !Number.isFinite(Number(volcano.vnum))) {
    return {
      history: null,
      sources: [],
      diagnostics: {
        degraded: true,
        errors: [
          {
            sourceId: "smithsonian-gvp",
            error: { message: "Volcano number is missing or not numeric." },
          },
        ],
      },
    };
  }

  const url = buildGvpUrl(volcano.vnum);
  const result = await cachedJson(
    `smithsonian-gvp:${volcano.vnum}`,
    () => fetchJson(url),
    CACHE_TTL_MS.gvp,
    STALE_TTL_MS.gvp,
    options,
  );
  const feature = Array.isArray(result.data?.features)
    ? result.data.features[0]
    : null;

  return {
    history: feature ? normalizeGvpFeature(feature) : null,
    sources: [
      sourceResult("smithsonian-gvp", url, result, [
        "WFS lookup by Smithsonian volcano number.",
      ]),
    ],
    diagnostics: {
      degraded: !result.ok,
      errors: result.error
        ? [{ sourceId: "smithsonian-gvp", error: result.error }]
        : [],
    },
  };
}

export async function getGvpEruptions(volcano, options = {}) {
  if (!volcano.vnum || !Number.isFinite(Number(volcano.vnum))) {
    return {
      eruptions: [],
      sources: [],
      diagnostics: {
        degraded: true,
        errors: [
          {
            sourceId: "smithsonian-gvp",
            error: { message: "Volcano number is missing or not numeric." },
          },
        ],
      },
    };
  }

  const params = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName: "GVP-VOTW:Smithsonian_VOTW_Holocene_Eruptions",
    outputFormat: "application/json",
    CQL_FILTER: `Volcano_Number=${Number(volcano.vnum)}`,
    maxFeatures: "1000",
  });
  const url = `${GVP_WFS_URL}?${params.toString()}`;
  const result = await cachedJson(
    `smithsonian-gvp-eruptions:${volcano.vnum}`,
    () => fetchJson(url),
    CACHE_TTL_MS.gvp,
    STALE_TTL_MS.gvp,
    options,
  );
  const eruptions = (Array.isArray(result.data?.features) ? result.data.features : [])
    .map((feature) => {
      const properties = feature?.properties ?? {};
      return {
        eruptionNumber: safeInteger(properties.Eruption_Number),
        activityType: normalizeString(properties.Activity_Type),
        activityArea: normalizeString(properties.ActivityArea),
        activityUnit: normalizeString(properties.ActivityUnit),
        vei: safeInteger(properties.ExplosivityIndexMax),
        veiModifier: normalizeString(properties.ExplosivityIndexModifier),
        startEvidenceMethod: normalizeString(properties.StartEvidenceMethod),
        startYear: safeInteger(properties.StartDateYear),
        startYearUncertainty: safeInteger(properties.StartDateYearUncertainty),
        startMonth: safeInteger(properties.StartDateMonth),
        startDay: safeInteger(properties.StartDateDay),
        endYear: safeInteger(properties.EndDateYear),
        endMonth: safeInteger(properties.EndDateMonth),
        endDay: safeInteger(properties.EndDateDay),
      };
    })
    .filter((entry) => entry.eruptionNumber !== null || entry.startYear !== null);

  return {
    eruptions,
    sources: [
      sourceResult("smithsonian-gvp", url, result, [
        "Holocene eruption records for timeline and historical context.",
      ]),
    ],
    diagnostics: {
      degraded: !result.ok,
      errors: result.error
        ? [{ sourceId: "smithsonian-gvp", error: result.error }]
        : [],
    },
  };
}

export async function getNoaaAlerts(volcano, options = {}) {
  if (!volcano.coordinates) {
    return {
      alerts: [],
      sources: [],
      diagnostics: { degraded: false, errors: [] },
    };
  }

  const url = buildNoaaAlertsUrl(volcano.coordinates);
  const result = await cachedJson(
    `noaa-nws-alerts:${volcano.id}`,
    () => fetchJson(url),
    CACHE_TTL_MS.noaa,
    STALE_TTL_MS.noaa,
    options,
  );

  return {
    alerts: result.data ? normalizeNoaaAlerts(result.data) : [],
    sources: [
      sourceResult("noaa-nws-alerts", url, result, [
        "Optional weather hazard context; not used as volcano prediction evidence.",
      ]),
    ],
    diagnostics: {
      degraded: !result.ok,
      errors: result.error
        ? [{ sourceId: "noaa-nws-alerts", error: result.error }]
        : [],
    },
  };
}

export async function getNwsWeather(volcano, options = {}) {
  if (!volcano.coordinates) {
    return {
      weather: {
        point: null,
        forecast: { updatedAt: null, units: null, periods: [] },
        hourly: { updatedAt: null, units: null, periods: [] },
      },
      sources: [],
      diagnostics: {
        degraded: true,
        errors: [
          {
            sourceId: "noaa-nws-points",
            error: { message: "Volcano coordinates are missing." },
          },
        ],
      },
    };
  }

  const pointUrl = buildNwsPointsUrl(volcano.coordinates);
  const pointResult = await cachedJson(
    `noaa-nws-points:${volcano.id}`,
    () => fetchJson(pointUrl),
    CACHE_TTL_MS.noaaPoints,
    STALE_TTL_MS.noaaPoints,
    options,
  );
  const point = pointResult.data ? normalizeNwsPoint(pointResult.data) : null;
  const forecastUrl = point?.forecastUrl;
  const hourlyUrl = point?.forecastHourlyUrl;

  const [forecastResult, hourlyResult] = await Promise.all([
    forecastUrl
      ? cachedJson(
          `noaa-nws-forecast:${forecastUrl}`,
          () => fetchJson(forecastUrl),
          CACHE_TTL_MS.noaaForecast,
          STALE_TTL_MS.noaaForecast,
          options,
        )
      : Promise.resolve(null),
    hourlyUrl
      ? cachedJson(
          `noaa-nws-hourly:${hourlyUrl}`,
          () => fetchJson(hourlyUrl),
          CACHE_TTL_MS.noaaForecast,
          STALE_TTL_MS.noaaForecast,
          options,
        )
      : Promise.resolve(null),
  ]);

  const sources = [
    sourceResult("noaa-nws-points", pointUrl, pointResult, [
      "Official point metadata used to resolve forecast and hourly endpoints.",
    ]),
  ];
  const errors = pointResult.error
    ? [{ sourceId: "noaa-nws-points", error: pointResult.error }]
    : [];

  if (forecastUrl && forecastResult) {
    sources.push(
      sourceResult("noaa-nws-forecast", forecastUrl, forecastResult, [
        "Official multi-period weather forecast near the selected volcano.",
      ]),
    );
    if (forecastResult.error) {
      errors.push({ sourceId: "noaa-nws-forecast", error: forecastResult.error });
    }
  }

  if (hourlyUrl && hourlyResult) {
    sources.push(
      sourceResult("noaa-nws-hourly", hourlyUrl, hourlyResult, [
        "Official hourly weather forecast near the selected volcano.",
      ]),
    );
    if (hourlyResult.error) {
      errors.push({ sourceId: "noaa-nws-hourly", error: hourlyResult.error });
    }
  }

  const forecast = forecastResult?.data
    ? normalizeWeatherForecast(forecastResult.data, "noaa-nws-forecast")
    : { updatedAt: null, units: null, periods: [] };
  const hourly = hourlyResult?.data
    ? normalizeWeatherForecast(hourlyResult.data, "noaa-nws-hourly")
    : { updatedAt: null, units: null, periods: [] };

  return {
    weather: {
      point,
      forecast: {
        ...forecast,
        periods: forecast.periods.slice(0, 8),
      },
      hourly: {
        ...hourly,
        periods: hourly.periods.slice(0, 12),
      },
    },
    sources,
    diagnostics: {
      degraded: sources.some((source) =>
        ["failed", "stale"].includes(source.status),
      ),
      errors,
    },
  };
}

function dedupeBy(items, keyFn) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = keyFn(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, item);
  }
  return Array.from(map.values());
}

function mergeDiagnostics(results) {
  const errors = results.flatMap((result) => result?.diagnostics?.errors ?? []);
  return {
    degraded: results.some((result) => result?.diagnostics?.degraded),
    errors,
  };
}

async function getNoaaAlertsForHawaiiIsland(options = {}) {
  const results = await Promise.all(HAWAII_ISLAND_ALERT_POINTS.map((point) => getNoaaAlerts(point, options)));
  const alerts = dedupeBy(
    results.flatMap((result) => result.alerts ?? []),
    (alert) => alert?.id ?? `${alert?.event ?? ""}:${alert?.headline ?? ""}:${alert?.effective ?? ""}`,
  );

  return {
    alerts,
    sources: results.flatMap((result) => result.sources ?? []),
    diagnostics: mergeDiagnostics(results),
  };
}

function mergeHistoryProfiles(profiles) {
  const components = profiles
    .map((result) => result?.history)
    .filter(Boolean);
  const eruptionYears = components
    .map((profile) => profile?.lastEruptionYear)
    .filter((year) => Number.isFinite(year));
  return {
    profile: components[0] ?? null,
    components,
    lastEruptionYear: eruptionYears.length ? Math.max(...eruptionYears) : null,
    evidenceCategory: components.find((profile) => profile?.evidenceCategory)?.evidenceCategory ?? null,
    geologicalSummary: components
      .map((profile) => profile?.geologicalSummary)
      .filter(Boolean)
      .join("\n\n"),
  };
}

function sortNotices(notices) {
  return [...notices].sort((left, right) => {
    const rightTime = Date.parse(right.sentUtc ?? "") || Number(right.sentUnixtime ?? 0) * 1000 || 0;
    const leftTime = Date.parse(left.sentUtc ?? "") || Number(left.sentUnixtime ?? 0) * 1000 || 0;
    return rightTime - leftTime;
  });
}

async function getHawaiiIslandDashboardData(volcanoList, options = {}) {
  const days = options.days ?? 7;
  const radiusKm = options.radiusKm ?? HAWAII_ISLAND_DEFAULT_RADIUS_KM;
  const includeNoaa = options.includeNoaa ?? true;
  const sourceOptions = { forceRefresh: Boolean(options.forceRefresh) };
  const volcano = buildHawaiiIslandVolcano(volcanoList);
  const componentVolcanoes = HAWAII_ISLAND_COMPONENT_IDS
    .map((id) => findVolcano(volcanoList, id))
    .filter(Boolean);
  const hansDays = Math.max(days, options.episodeDays ?? HANS_EPISODE_LOOKBACK_DAYS);

  const [
    hansResults,
    earthquakeResult,
    historyResults,
    eruptionResults,
    noaa,
    weather,
  ] = await Promise.all([
    Promise.all(componentVolcanoes.map((item) => getHansNotices(item, hansDays, sourceOptions))),
    getEarthquakes(volcano, days, radiusKm, sourceOptions),
    Promise.all(componentVolcanoes.map((item) => getGvpHistory(item, sourceOptions))),
    Promise.all(componentVolcanoes.map((item) => getGvpEruptions(item, sourceOptions))),
    includeNoaa
      ? getNoaaAlertsForHawaiiIsland(sourceOptions)
      : Promise.resolve({ alerts: [], sources: [], diagnostics: { degraded: false, errors: [] } }),
    includeNoaa
      ? getNwsWeather(volcano, sourceOptions)
      : Promise.resolve({
          weather: {
            point: null,
            forecast: { updatedAt: null, units: null, periods: [] },
            hourly: { updatedAt: null, units: null, periods: [] },
          },
          sources: [],
          diagnostics: { degraded: false, errors: [] },
        }),
  ]);
  const notices = sortNotices(hansResults.flatMap((result) => result.notices ?? []));
  const officialEpisodes = normalizeOfficialEpisodes(notices);
  const historyProfile = mergeHistoryProfiles(historyResults);
  const eruptions = eruptionResults.flatMap((result) => result.eruptions ?? []);
  const travelContext = buildTravelContext({
    volcano,
    notices,
    officialEpisodes,
    weather: weather.weather,
    weatherAlerts: noaa.alerts,
    earthquakes: earthquakeResult.earthquakes,
    radiusKm,
    days,
  });
  const sourceGroups = [
    ...hansResults,
    earthquakeResult,
    ...historyResults,
    ...eruptionResults,
    noaa,
    weather,
  ];
  const sources = [
    ...sourceGroups.flatMap((result) => result.sources ?? []),
    referenceSource("hvo-webcams", travelContext.officialLinks.hvoWebcams, [
      "Official HVO webcam page and static camera image endpoints.",
    ]),
    referenceSource("nps-havo", travelContext.officialLinks.npsAlerts, [
      "National Park Service conditions and closure page for visitor verification.",
    ]),
  ];
  const diagnostics = mergeDiagnostics(sourceGroups);

  return {
    found: true,
    volcano,
    officialNotices: {
      total: hansResults.reduce((total, result) => total + (result.total ?? 0), 0),
      items: notices,
    },
    earthquakes: earthquakeResult.earthquakes,
    history: {
      ...historyProfile,
      episodes: officialEpisodes,
      eruptions,
    },
    weatherAlerts: noaa.alerts,
    weather: weather.weather,
    travelContext,
    sources,
    diagnostics: {
      degraded: diagnostics.degraded || sources.some((source) => ["failed", "stale"].includes(source.status)),
      errors: diagnostics.errors,
    },
  };
}

export async function getDashboardData(id, options = {}) {
  const days = options.days ?? 7;
  const radiusKm = options.radiusKm ?? HAWAII_ISLAND_DEFAULT_RADIUS_KM;
  const includeNoaa = options.includeNoaa ?? true;
  const sourceOptions = { forceRefresh: Boolean(options.forceRefresh) };
  const volcanoList = await getVolcanoes(sourceOptions);

  if (isHawaiiIslandId(id)) {
    const dashboard = await getHawaiiIslandDashboardData(volcanoList.volcanoes, {
      ...options,
      days,
      radiusKm,
      includeNoaa,
    });
    return {
      ...dashboard,
      sources: [...volcanoList.sources, ...dashboard.sources],
      diagnostics: {
        degraded: volcanoList.diagnostics.degraded || dashboard.diagnostics.degraded,
        errors: [...volcanoList.diagnostics.errors, ...dashboard.diagnostics.errors],
      },
    };
  }

  const volcano = findVolcano(volcanoList.volcanoes, id);

  if (!volcano) {
    return {
      found: false,
      volcano: null,
      volcanoes: volcanoList.volcanoes,
      sources: volcanoList.sources,
      diagnostics: {
        degraded: true,
        errors: [
          ...volcanoList.diagnostics.errors,
          {
            sourceId: "api",
            error: { message: `Volcano '${id}' was not found.` },
          },
        ],
      },
    };
  }

  const hansDays = Math.max(days, options.episodeDays ?? HANS_EPISODE_LOOKBACK_DAYS);
  const [hans, earthquakes, historyProfile, eruptions, noaa, weather] =
    await Promise.all([
      getHansNotices(volcano, hansDays, sourceOptions),
      getEarthquakes(volcano, days, radiusKm, sourceOptions),
      getGvpHistory(volcano, sourceOptions),
      getGvpEruptions(volcano, sourceOptions),
      includeNoaa
        ? getNoaaAlerts(volcano, sourceOptions)
        : Promise.resolve({
            alerts: [],
            sources: [],
            diagnostics: { degraded: false, errors: [] },
          }),
      includeNoaa
        ? getNwsWeather(volcano, sourceOptions)
        : Promise.resolve({
            weather: {
              point: null,
              forecast: { updatedAt: null, units: null, periods: [] },
              hourly: { updatedAt: null, units: null, periods: [] },
            },
            sources: [],
            diagnostics: { degraded: false, errors: [] },
          }),
    ]);
  const officialEpisodes = normalizeOfficialEpisodes(hans.notices);
  const travelContext = buildTravelContext({
    volcano,
    notices: hans.notices,
    officialEpisodes,
    weather: weather.weather,
    weatherAlerts: noaa.alerts,
    earthquakes: earthquakes.earthquakes,
    radiusKm,
    days,
  });
  const sources = [
    ...volcanoList.sources,
    ...hans.sources,
    ...earthquakes.sources,
    ...historyProfile.sources,
    ...eruptions.sources,
    ...noaa.sources,
    ...weather.sources,
    referenceSource("hvo-webcams", travelContext.officialLinks.hvoWebcams, [
      "Official HVO webcam page and static camera image endpoints.",
    ]),
    referenceSource("nps-havo", travelContext.officialLinks.npsAlerts, [
      "National Park Service conditions and closure page for visitor verification.",
    ]),
  ];
  const errors = [
    ...volcanoList.diagnostics.errors,
    ...hans.diagnostics.errors,
    ...earthquakes.diagnostics.errors,
    ...historyProfile.diagnostics.errors,
    ...eruptions.diagnostics.errors,
    ...noaa.diagnostics.errors,
    ...weather.diagnostics.errors,
  ];

  return {
    found: true,
    volcano,
    officialNotices: {
      total: hans.total,
      items: hans.notices,
    },
    earthquakes: earthquakes.earthquakes,
    history: {
      ...historyProfile.history,
      profile: historyProfile.history,
      episodes: officialEpisodes,
      eruptions: eruptions.eruptions,
    },
    weatherAlerts: noaa.alerts,
    weather: weather.weather,
    travelContext,
    sources,
    diagnostics: {
      degraded: sources.some((source) =>
        ["failed", "stale"].includes(source.status),
      ),
      errors,
    },
  };
}

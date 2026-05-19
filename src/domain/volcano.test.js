import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDashboard, normalizeVolcanoes } from '../volcanoData.js';
import { normalizeOfficialEpisodes } from '../../server/dataSources.js';
import { buildExpertAssessment } from '../../server/expertModel.js';
import { readAppUrlState } from '../hooks/useUrlState.js';
import { readStoredState, writeStoredState } from '../hooks/useStoredState.js';
import { mapLayers } from './config.js';
import { cnOfficialText, getUniqueSources, resolveEruptionState } from './formatters.js';

test('normalizeVolcanoes preserves map and source fields', () => {
  const payload = {
    data: [
      {
        id: '1',
        vnum: '332010',
        volcanoCd: 'hi3',
        slug: 'kilauea',
        name: 'Kilauea',
        region: 'Hawaii',
        coordinates: { lat: 19.4, lon: -155.2 },
        officialUrl: 'https://example.com',
        imageUrl: 'https://example.com/img.jpg',
      },
    ],
  };

  const volcanoes = normalizeVolcanoes(payload);
  assert.equal(volcanoes[0].coordinates.lat, 19.4);
  assert.equal(volcanoes[0].officialUrl, 'https://example.com');
  assert.equal(volcanoes[0].imageUrl, 'https://example.com/img.jpg');
});

test('normalizeDashboard preserves assessment and disclaimer', () => {
  const payload = {
    generatedAt: '2026-05-12T00:00:00.000Z',
    disclaimer: 'non-official',
    diagnostics: { degraded: false, errors: [] },
    sources: [],
    data: {
      volcano: {
        slug: 'kilauea',
        name: 'Kilauea',
        region: 'Hawaii',
        coordinates: { lat: 19.4, lon: -155.2 },
        alertLevel: 'WATCH',
        colorCode: 'ORANGE',
      },
      assessment: {
        likelihood: { label: 'elevated', score: 42 },
        timeframe: 'days_to_weeks',
        confidence: { label: 'moderate', score: 0.64 },
        intensity: { label: 'moderate', score: 39 },
        drivers: [{ name: 'alert_level', direction: 'raises', weight: 12, detail: 'detail' }],
        uncertainties: [],
        disclaimer: 'non-official',
      },
      officialNotices: { items: [] },
      earthquakes: { stats: { count: 0 }, events: [], dailyCounts: [] },
      history: {},
      weatherAlerts: [],
      weather: { point: { timeZone: 'Pacific/Honolulu' }, forecast: { periods: [] }, hourly: { periods: [] } },
    },
  };

  const dashboard = normalizeDashboard(payload, 'kilauea');
  assert.equal(dashboard.disclaimer, 'non-official');
  assert.equal(dashboard.assessment.likelihood.score, 42);
  assert.equal(dashboard.volcano.coordinates.lat, 19.4);
});

test('cnOfficialText handles negated eruption language without false activity claim', () => {
  const text = cnOfficialText('No eruption is occurring, but monitoring teams report persistent seismicity.', {
    level: 'WATCH',
    colorCode: 'ORANGE',
  });

  assert.match(text, /当前未发生喷发/);
  assert.doesNotMatch(text, /通报提到熔岩/);
});

test('resolveEruptionState promotes paused eruption wording from HVO summary', () => {
  const state = resolveEruptionState(
    { state: 'monitoring', label: '监测中', source: 'official' },
    'The Halemaʻumaʻu eruption of Kīlauea is paused. Forecast models suggest episode 48.',
  );

  assert.equal(state.state, 'paused');
  assert.equal(state.label, '喷发暂停');
});

test('normalizeDashboard uses volcano-specific trend fallback when daily counts are missing', () => {
  const dashboard = normalizeDashboard({
    generatedAt: '2026-05-12T00:00:00.000Z',
    sources: [],
    data: {
      volcano: {
        slug: 'mauna-loa',
        name: 'Mauna Loa',
        region: 'Island of Hawaii',
        alertLevel: 'NORMAL',
        colorCode: 'GREEN',
      },
      assessment: {
        likelihood: { label: 'background', score: 8 },
        timeframe: 'no_short_term_official_window',
        confidence: { label: 'moderate', score: 0.6 },
        intensity: { label: 'background', score: 8 },
        drivers: [],
        uncertainties: [],
      },
      officialNotices: { items: [] },
      earthquakes: { stats: { count: 0 }, events: [], dailyCounts: [] },
      history: {},
      weatherAlerts: [],
      weather: { point: { timeZone: 'Pacific/Honolulu' }, forecast: { periods: [] }, hourly: { periods: [] } },
    },
  }, 'mauna-loa');

  assert.equal(dashboard.forecastSeries[0].activitySignal, 7);
});

test('normalizeDashboard keeps live official episodes separate from fallback history', () => {
  const dashboard = normalizeDashboard({
    generatedAt: '2026-05-12T00:00:00.000Z',
    sources: [],
    data: {
      volcano: {
        slug: 'kilauea',
        name: 'Kilauea',
        region: 'Island of Hawaii',
        alertLevel: 'ADVISORY',
        colorCode: 'YELLOW',
        notice: {
          synopsis: 'Episode 46 ended after lava fountaining. The forecast window for the onset of Episo47 fountaining is May 12 - May 14, 2026. The forecast window for episode 47 is based on patterns prior to episode 45 and 46.',
        },
      },
      assessment: {
        likelihood: { label: 'elevated', score: 36 },
        timeframe: 'official_notice_window',
        confidence: { label: 'moderate', score: 0.7 },
        intensity: { label: 'moderate', score: 36 },
        drivers: [],
        uncertainties: [],
      },
      officialNotices: {
        items: [
          {
            id: 'hvo-episode-47',
            sentUtc: '2026-05-12T19:00:00Z',
            synopsis: 'Episode 46 ended after lava fountaining. The forecast window for the onset of Episo47 fountaining is May 12 - May 14, 2026. The forecast window for episode 47 is based on patterns prior to episode 45 and 46.',
          },
        ],
      },
      earthquakes: { stats: { count: 0 }, events: [], dailyCounts: [] },
      history: {},
      weatherAlerts: [],
      weather: { point: { timeZone: 'Pacific/Honolulu' }, forecast: { periods: [] }, hourly: { periods: [] } },
    },
  }, 'kilauea');

  assert.deepEqual(dashboard.history.episodes.map((item) => item.episodeNumber), [47]);
  assert.match(dashboard.latestAdvisory.title, /Episode 47/);
  assert.equal(dashboard.history.episodes[0].start, '2026-05-12');
  assert.equal(dashboard.history.episodes[0].end, '2026-05-14');
});

test('normalizeDashboard preserves explicit empty live episode list instead of mock EP fallback', () => {
  const dashboard = normalizeDashboard({
    generatedAt: '2026-05-12T00:00:00.000Z',
    sources: [],
    data: {
      volcano: {
        slug: 'kilauea',
        name: 'Kilauea',
        region: 'Island of Hawaii',
        alertLevel: 'ADVISORY',
        colorCode: 'YELLOW',
      },
      assessment: {
        likelihood: { label: 'background', score: 12 },
        timeframe: 'no_short_term_official_window',
        confidence: { label: 'moderate', score: 0.7 },
        intensity: { label: 'background', score: 12 },
        drivers: [],
        uncertainties: [],
      },
      officialNotices: { items: [] },
      earthquakes: { stats: { count: 0 }, events: [], dailyCounts: [] },
      history: { episodes: [], eruptions: [] },
      weatherAlerts: [],
      weather: { point: { timeZone: 'Pacific/Honolulu' }, forecast: { periods: [] }, hourly: { periods: [] } },
    },
  }, 'kilauea');

  assert.deepEqual(dashboard.history.episodes, []);
});

test('normalizeDashboard preserves official episode window when latest notice is generic', () => {
  const dashboard = normalizeDashboard({
    generatedAt: '2026-05-12T22:00:00.000Z',
    sources: [],
    data: {
      volcano: {
        slug: 'kilauea',
        name: 'Kilauea',
        region: 'Island of Hawaii',
        alertLevel: 'ADVISORY',
        colorCode: 'YELLOW',
      },
      assessment: {
        likelihood: { label: 'elevated', score: 36 },
        timeframe: 'official_notice_window',
        confidence: { label: 'moderate', score: 0.7 },
        intensity: { label: 'moderate', score: 36 },
        drivers: [],
        uncertainties: [],
      },
      officialNotices: {
        items: [
          {
            id: 'hvo-episode-47-update',
            sentUtc: '2026-05-12T22:00:00Z',
            synopsis: 'Episode 47 remains paused in the latest HVO update.',
          },
        ],
      },
      earthquakes: { stats: { count: 0 }, events: [], dailyCounts: [] },
      history: {
        episodes: [
          {
            episodeNumber: 47,
            start: '2026-05-12',
            end: '2026-05-14',
            windowLabel: 'May 12 - May 14, 2026',
            title: 'Episode 47 forecast window',
            status: 'Forecast window',
            summary: 'Official HVO window: May 12 - May 14, 2026.',
            sentUtc: '2026-05-12T19:00:00Z',
          },
        ],
      },
      weatherAlerts: [],
      weather: { point: { timeZone: 'Pacific/Honolulu' }, forecast: { periods: [] }, hourly: { periods: [] } },
    },
  }, 'kilauea');

  assert.equal(dashboard.history.episodes[0].episodeNumber, 47);
  assert.equal(dashboard.history.episodes[0].sentUtc, '2026-05-12T22:00:00Z');
  assert.equal(dashboard.history.episodes[0].start, '2026-05-12');
  assert.equal(dashboard.history.episodes[0].summary, 'Official HVO window: May 12 - May 14, 2026.');
});

test('server official episodes prefer forecast context and merge windows', () => {
  const episodes = normalizeOfficialEpisodes([
    {
      id: 'old-window',
      sentUtc: '2026-05-12T19:00:00Z',
      synopsis: 'Episode 46 ended. The forecast window for the onset of episode 47 fountaining is May 12 - May 14, 2026. The forecast window for episode 47 is based on patterns prior to episode 45 and 46.',
      url: 'https://example.com/old',
    },
    {
      id: 'new-generic',
      sentUtc: '2026-05-12T22:00:00Z',
      synopsis: 'Episode 47 remains paused while HVO monitors summit inflation.',
      url: 'https://example.com/new',
    },
  ]);

  assert.deepEqual(episodes.map((item) => item.episodeNumber), [47]);
  assert.equal(episodes[0].sentUtc, '2026-05-12T22:00:00Z');
  assert.equal(episodes[0].start, '2026-05-12');
  assert.equal(episodes[0].end, '2026-05-14');
  assert.equal(episodes[0].url, 'https://example.com/new');
});

test('server official episodes ignore prior-to episode references', () => {
  const episodes = normalizeOfficialEpisodes([
    {
      id: 'window',
      sentUtc: '2026-05-12T19:00:00Z',
      synopsis: 'The forecast window is based on patterns prior to episode 45 and 46. The forecast window for the onset of Episo47 fountaining is May 12 - May 14, 2026.',
    },
    {
      id: 'old-complete',
      sentUtc: '2026-05-10T19:00:00Z',
      synopsis: 'Episode 44 ended after lava fountaining.',
    },
  ]);

  assert.deepEqual(episodes.map((item) => item.episodeNumber), [47]);
  assert.equal(episodes[0].start, '2026-05-12');
  assert.equal(episodes[0].end, '2026-05-14');
});

test('server official episodes classify HVO episode 48 wording as model estimate', () => {
  const episodes = normalizeOfficialEpisodes([
    {
      id: 'ep48-model',
      sentUtc: '2026-05-16T17:06:42Z',
      synopsis: 'Forecast models suggest that episode 48 will occur sometime between May 22 and 25. The eruption is paused.',
      url: 'https://example.com/ep48',
    },
    {
      id: 'ep47-official',
      sentUtc: '2026-05-15T10:42:54Z',
      synopsis: 'The forecast window for episode 47 is May 13 - May 14, 2026.',
      url: 'https://example.com/ep47',
    },
  ]);

  assert.deepEqual(episodes.map((item) => item.episodeNumber), [48, 47]);
  assert.equal(episodes[0].sourceType, 'model');
  assert.equal(episodes[0].status, 'Model estimate');
  assert.equal(episodes[0].start, '2026-05-22');
  assert.equal(episodes[0].end, '2026-05-25');
});

test('server official episodes expose observed current-sequence EP records without relabeling older history', () => {
  const episodes = normalizeOfficialEpisodes([
    {
      id: 'ep46-observed',
      sentUtc: '2026-05-07T14:00:00Z',
      synopsis: 'Episode 46 occurred May 6 - May 7, 2026 and the eruption is paused.',
      url: 'https://example.com/ep46',
    },
  ]);

  assert.deepEqual(episodes.map((item) => item.episodeNumber), [46]);
  assert.equal(episodes[0].status, 'Completed episode');
  assert.equal(episodes[0].windowKind, 'observed');
  assert.equal(episodes[0].start, '2026-05-06');
  assert.equal(episodes[0].end, '2026-05-07');
});

test('server official episodes keep a forecast window when a newer same-EP update only reports completion', () => {
  const episodes = normalizeOfficialEpisodes([
    {
      id: 'ep47-window',
      sentUtc: '2026-05-12T19:00:00Z',
      synopsis: 'The forecast window for episode 47 is May 13 - May 14, 2026.',
    },
    {
      id: 'ep47-ended',
      sentUtc: '2026-05-15T08:00:00Z',
      synopsis: 'Episode 47 ended on May 14, 2026 and the eruption is paused.',
    },
  ]);

  assert.deepEqual(episodes.map((item) => item.episodeNumber), [47]);
  assert.equal(episodes[0].status, 'Forecast window');
  assert.equal(episodes[0].windowKind, 'forecast');
  assert.equal(episodes[0].start, '2026-05-13');
  assert.equal(episodes[0].end, '2026-05-14');
});

test('normalizeDashboard promotes active EP48 model window after EP47 official window is past', () => {
  const dashboard = normalizeDashboard({
    generatedAt: '2026-05-18T00:00:00.000Z',
    sources: [],
    data: {
      volcano: {
        slug: 'kilauea',
        name: 'Kilauea',
        region: 'Island of Hawaii',
        alertLevel: 'ADVISORY',
        colorCode: 'YELLOW',
      },
      assessment: {
        likelihood: { label: 'elevated', score: 44 },
        timeframe: 'hvo_model_estimate_window',
        confidence: { label: 'moderate', score: 0.7 },
        intensity: { label: 'moderate', score: 44 },
        drivers: [],
        uncertainties: [],
      },
      officialNotices: {
        items: [
          {
            id: 'ep48-model',
            sentUtc: '2026-05-16T17:06:42Z',
            synopsis: 'Forecast models suggest that episode 48 will occur sometime between May 22 and 25.',
          },
        ],
      },
      history: {
        episodes: [
          {
            episodeNumber: 48,
            start: '2026-05-22',
            end: '2026-05-25',
            windowLabel: 'May 22 - May 25, 2026',
            status: 'Model estimate',
            sourceType: 'model',
          },
          {
            episodeNumber: 47,
            start: '2026-05-13',
            end: '2026-05-14',
            windowLabel: 'May 13 - May 14, 2026',
            status: 'Forecast window',
            sourceType: 'official',
          },
        ],
      },
      travelContext: {
        officialWindow: {
          type: 'official',
          source: 'USGS/HVO',
          episodeNumber: 47,
          start: '2026-05-13',
          end: '2026-05-14',
          label: 'May 13 - May 14, 2026',
        },
        modelWindow: {
          type: 'model',
          source: 'HVO model estimate',
          episodeNumber: 48,
          start: '2026-05-22',
          end: '2026-05-25',
          label: 'May 22 - May 25, 2026',
          note: 'HVO model estimate; not an official deterministic conclusion.',
        },
      },
      earthquakes: { stats: { count: 0 }, events: [], dailyCounts: [] },
      weatherAlerts: [],
      weather: { point: { timeZone: 'Pacific/Honolulu' }, forecast: { periods: [] }, hourly: { periods: [] } },
    },
  }, 'kilauea');

  assert.equal(dashboard.travelContext.officialWindow.episodeNumber, 47);
  assert.equal(dashboard.travelContext.activeWindow.episodeNumber, 48);
  assert.equal(dashboard.travelContext.activeWindow.type, 'model');
  assert.equal(dashboard.forecast.timeWindow, 'May 22 - May 25, 2026');
});

test('expert assessment reports HVO model estimate timeframe when latest episode is model', () => {
  const assessment = buildExpertAssessment({
    volcano: { name: 'Kilauea', alertLevel: 'ADVISORY', colorCode: 'YELLOW' },
    officialNotices: {
      items: [
        { synopsis: 'Forecast models suggest that episode 48 will occur sometime between May 22 and 25. The eruption is paused.' },
      ],
    },
    earthquakes: { stats: { count: 0 } },
    history: {
      episodes: [
        {
          episodeNumber: 48,
          status: 'Model estimate',
          sourceType: 'model',
          start: '2026-05-22',
          end: '2026-05-25',
        },
      ],
    },
    diagnostics: { errors: [] },
  });

  assert.equal(assessment.timeframe, 'hvo_model_estimate_window');
});

test('readAppUrlState parses query values', () => {
  global.window = {
    location: {
      search: '?view=map&volcano=mauna-loa&layer=satellite&quakes=0&radiusKm=150&noaa=0',
      hash: '',
    },
  };

  const state = readAppUrlState();
  assert.equal(state.activeView, 'map');
  assert.equal(state.selectedVolcanoId, 'kilauea');
  assert.equal(state.mapLayer, 'satellite');
  assert.equal(state.showQuakes, false);
  assert.equal(state.radiusKm, 150);
  assert.equal(state.includeNoaa, false);
  delete global.window;
});

test('default map layers use local tiles for deterministic validation', () => {
  for (const layer of Object.values(mapLayers)) {
    assert.match(layer.tileUrl, /^\/map-tiles\/.+\.svg$/);
    assert.match(layer.externalTileUrl, /^https:\/\//);
  }
});

test('readStoredState merges fallback and stored values', () => {
  global.window = {
    localStorage: {
      getItem: () => JSON.stringify({ compactSources: true }),
    },
  };

  const state = readStoredState('prefs', { compactSources: false, other: true });
  assert.equal(state.compactSources, true);
  assert.equal(state.other, true);
  delete global.window;
});

test('writeStoredState tolerates unavailable localStorage', () => {
  global.window = {
    localStorage: {
      setItem: () => {
        throw new Error('storage unavailable');
      },
    },
  };

  assert.doesNotThrow(() => writeStoredState('prefs', { compactSources: true }));
  delete global.window;
});

test('getUniqueSources deduplicates and preserves best status', () => {
  const sources = getUniqueSources([
    { label: 'USGS', url: 'https://a', status: 'cached', cache: { hit: true } },
    { label: 'USGS', url: 'https://a', status: 'failed', error: { message: 'x' } },
  ]);

  assert.equal(sources.length, 1);
  assert.equal(sources[0].status, 'failed');
});

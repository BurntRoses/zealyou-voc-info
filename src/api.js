import { mockDashboards, mockVolcanoes, normalizeDashboard as normalizeDashboardPayload, normalizeVolcanoes } from './volcanoData.js';

async function readJson(response) {
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`.trim();
    try {
      const payload = await response.json();
      message = payload?.error?.message ?? message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

export async function getVolcanoes(signal, refreshKey) {
  const params = new URLSearchParams();
  if (refreshKey !== undefined) params.set('refresh', String(refreshKey));
  const path = params.size ? `/api/volcanoes?${params.toString()}` : '/api/volcanoes';
  const payload = await fetch(path, { signal }).then(readJson);
  return normalizeVolcanoes(payload);
}

export async function getDashboard(volcanoId, options = 7, signal) {
  const encodedId = encodeURIComponent(volcanoId);
  const normalizedOptions = typeof options === 'number'
    ? { days: options }
    : { days: 7, radiusKm: 100, includeNoaa: true, ...options };
  const params = new URLSearchParams({
    days: String(normalizedOptions.days ?? 7),
    radiusKm: String(normalizedOptions.radiusKm ?? 100),
    noaa: normalizedOptions.includeNoaa === false ? '0' : '1',
  });
  if (normalizedOptions.refreshKey !== undefined) {
    params.set('refresh', String(normalizedOptions.refreshKey));
  }
  const payload = await fetch(`/api/volcano/${encodedId}/dashboard?${params.toString()}`, { signal }).then(readJson);
  return preserveSourceMetadata(normalizeDashboardPayload(payload, volcanoId), payload);
}

export function getFallbackVolcanoes() {
  return mockVolcanoes;
}

export function getFallbackDashboard(volcanoId) {
  return mockDashboards[volcanoId] ?? mockDashboards.kilauea;
}

function preserveSourceMetadata(dashboard, payload) {
  if (!payload || typeof payload !== 'object') return dashboard;

  return {
    ...dashboard,
    sources: buildSourcesWithMetadata(dashboard.sources, payload),
  };
}

function buildSourcesWithMetadata(sources = [], payload) {
  const rawSources = Array.isArray(payload.sources) ? payload.sources : null;
  const sourceItems = rawSources?.length ? rawSources : sources;

  return sourceItems.map((source) => ({
    ...source,
    label: source.label ?? source.name ?? source.agency ?? source.id ?? 'Unknown source',
    url: source.url ?? source.documentationUrl ?? null,
  }));
}

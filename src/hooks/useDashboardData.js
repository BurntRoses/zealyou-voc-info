import { useEffect, useMemo, useState } from 'react';
import { getDashboard, getFallbackDashboard, getFallbackVolcanoes, getVolcanoes } from '../api.js';

export function useDashboardData(selectedVolcanoId, options) {
  const [volcanoes, setVolcanoes] = useState(() => getFallbackVolcanoes());
  const [dashboard, setDashboard] = useState(null);
  const [volcanoState, setVolcanoState] = useState({ loading: true, error: '' });
  const [dashboardState, setDashboardState] = useState({ loading: true, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    setVolcanoState({ loading: true, error: '' });

    getVolcanoes(controller.signal, options.refreshKey)
      .then((items) => {
        setVolcanoes(items);
        setVolcanoState({ loading: false, error: '' });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setVolcanoes(getFallbackVolcanoes());
        setVolcanoState({
          loading: false,
          error: '实时信息暂不可用，当前显示离线示例。',
        });
      });

    return () => controller.abort();
  }, [options.refreshKey]);

  useEffect(() => {
    if (!selectedVolcanoId) return undefined;

    const controller = new AbortController();
    setDashboardState({ loading: true, error: '' });
    setDashboard(null);

    getDashboard(
      selectedVolcanoId,
      {
        days: options.days,
        radiusKm: options.radiusKm,
        includeNoaa: options.includeNoaa,
        refreshKey: options.refreshKey,
      },
      controller.signal,
    )
      .then((payload) => {
        setDashboard(payload);
        setDashboardState({ loading: false, error: '' });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setDashboard(markOfflineExample(getFallbackDashboard(selectedVolcanoId)));
        setDashboardState({
          loading: false,
          error: '实时信息暂不可用，当前显示离线示例。',
        });
      });

    return () => controller.abort();
  }, [selectedVolcanoId, options.days, options.radiusKm, options.includeNoaa, options.refreshKey]);

  const selectedVolcano = useMemo(
    () => volcanoes.find((volcano) => volcano.id === selectedVolcanoId) ?? volcanoes[0],
    [selectedVolcanoId, volcanoes],
  );

  return {
    volcanoes,
    dashboard,
    selectedVolcano,
    loading: volcanoState.loading || dashboardState.loading || !dashboard,
    notice: dashboardState.error || volcanoState.error,
  };
}

function markOfflineExample(dashboard) {
  return {
    ...dashboard,
    dataMode: 'offline-example',
    diagnostics: {
      ...(dashboard.diagnostics ?? {}),
      offlineExample: true,
    },
  };
}

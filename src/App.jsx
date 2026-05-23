import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell.jsx';
import { LoadingState } from './components/LoadingState.jsx';
import { defaultUrlState, views } from './domain/config.js';
import { getQuakeId } from './domain/formatters.js';
import {
  defaultNotificationPreferences,
  mergeNotificationPreferences,
  normalizeNotificationPreferences,
} from './domain/notifications.js';
import { TodayView } from './features/today/TodayView.jsx';
import { useDashboardData } from './hooks/useDashboardData.js';
import { useNotificationCenter } from './hooks/useNotificationCenter.js';
import { useStoredState } from './hooks/useStoredState.js';
import { useUrlState } from './hooks/useUrlState.js';

const preferenceKey = 'voc-info-volcano-preferences-v2';
const primaryVolcanoId = 'hawaii-island';
const liveRefreshMs = 60_000;
const CamerasView = lazy(() => import('./features/cameras/CamerasView.jsx').then((module) => ({ default: module.CamerasView })));
const MapView = lazy(() => import('./features/map/MapView.jsx').then((module) => ({ default: module.MapView })));
const TrendsView = lazy(() => import('./features/trends/TrendsView.jsx').then((module) => ({ default: module.TrendsView })));
const SourcesView = lazy(() => import('./features/sources/SourcesView.jsx').then((module) => ({ default: module.SourcesView })));

function App() {
  const [urlState, setUrlState] = useUrlState();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedQuakeId, setSelectedQuakeId] = useState('');
  const [preferences, setPreferences] = useStoredState(preferenceKey, {
    secondaryTimeZone: 'Asia/Shanghai',
    theme: 'light',
    notifications: defaultNotificationPreferences,
  });

  const { volcanoes, dashboard, selectedVolcano, loading, notice } = useDashboardData(primaryVolcanoId, {
    days: 7,
    radiusKm: urlState.radiusKm,
    includeNoaa: urlState.includeNoaa,
    refreshKey,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshKey((value) => value + 1);
    }, liveRefreshMs);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (urlState.selectedVolcanoId !== primaryVolcanoId) {
      setUrlState({ selectedVolcanoId: primaryVolcanoId }, { replace: true });
    }
  }, [setUrlState, urlState.selectedVolcanoId]);

  useEffect(() => {
    setSelectedQuakeId('');
  }, [urlState.radiusKm, urlState.showQuakes]);

  useEffect(() => {
    if (!selectedQuakeId && dashboard?.earthquakes?.[0]) {
      setSelectedQuakeId(getQuakeId(dashboard.earthquakes[0]));
    }
  }, [dashboard, selectedQuakeId]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme === 'dark' ? 'dark' : 'light';
    document.documentElement.lang = 'zh-CN';
  }, [preferences.theme]);

  const timeZone = dashboard?.timeZone ?? dashboard?.weather?.point?.timeZone ?? 'Pacific/Honolulu';
  const activeView = views.some((view) => view.id === urlState.activeView) ? urlState.activeView : defaultUrlState.activeView;
  const theme = preferences.theme === 'dark' ? 'dark' : 'light';
  const updatePreferences = (patch) => setPreferences((current) => ({ ...current, ...patch }));
  const fixedVolcano = volcanoes.find((volcano) => volcano.id === primaryVolcanoId) ?? selectedVolcano;
  const notificationPreferences = useMemo(
    () => normalizeNotificationPreferences(preferences.notifications),
    [preferences.notifications],
  );
  const notificationCenter = useNotificationCenter({
    dashboard,
    selectedVolcano: fixedVolcano,
    preferences: notificationPreferences,
  });
  const updateNotificationPreferences = (patch) => setPreferences((current) => ({
    ...current,
    notifications: mergeNotificationPreferences(current.notifications ?? defaultNotificationPreferences, patch),
  }));

  const renderPage = () => {
    if (!dashboard) {
      return <LoadingState volcanoName={fixedVolcano?.name} />;
    }

    if (activeView === 'trends') {
      return <TrendsView dashboard={dashboard} timeZone={timeZone} />;
    }

    if (activeView === 'map') {
      return (
        <MapView
          dashboard={dashboard}
          selectedVolcano={fixedVolcano}
          timeZone={timeZone}
          selectedQuakeId={selectedQuakeId}
          onSelectQuake={setSelectedQuakeId}
          mapLayer={urlState.mapLayer}
          onMapLayerChange={(mapLayer) => setUrlState({ mapLayer })}
          showQuakes={urlState.showQuakes}
          onShowQuakesChange={(showQuakes) => setUrlState({ showQuakes })}
          radiusKm={urlState.radiusKm}
          onRadiusChange={(radiusKm) => setUrlState({ radiusKm })}
        />
      );
    }

    if (activeView === 'cameras') {
      return <CamerasView dashboard={dashboard} timeZone={timeZone} />;
    }

    if (activeView === 'sources') {
      return <SourcesView dashboard={dashboard} timeZone={timeZone} />;
    }

    return (
      <TodayView
        dashboard={dashboard}
        selectedVolcano={fixedVolcano}
        timeZone={timeZone}
        onNavigate={(nextView) => setUrlState({ activeView: nextView })}
      />
    );
  };

  return (
    <AppShell
      activeView={activeView}
      selectedVolcano={fixedVolcano}
      dashboard={dashboard}
      loading={loading}
      notice={notice}
      theme={theme}
      secondaryTimeZone={preferences.secondaryTimeZone}
      notificationPreferences={notificationPreferences}
      notificationItems={notificationCenter.items}
      notificationToasts={notificationCenter.toastItems}
      notificationUnreadCount={notificationCenter.unreadCount}
      onViewChange={(view) => setUrlState({ activeView: view })}
      onRefresh={() => setRefreshKey((value) => value + 1)}
      onPreferenceChange={updatePreferences}
      onNotificationPreferenceChange={updateNotificationPreferences}
      onMarkNotificationsRead={notificationCenter.markAllRead}
      onDismissNotification={notificationCenter.dismissNotification}
      onDismissNotificationToast={notificationCenter.dismissToast}
      onClearNotifications={notificationCenter.clearNotifications}
    >
      <Suspense fallback={<LoadingState volcanoName={fixedVolcano?.name} />}>
        {renderPage()}
      </Suspense>
    </AppShell>
  );
}

export default App;

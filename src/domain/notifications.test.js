import assert from 'node:assert/strict';
import test from 'node:test';
import { mockDashboards, mockVolcanoes } from '../volcanoData.js';
import {
  buildDashboardNotifications,
  defaultNotificationPreferences,
  mergeNotificationPreferences,
} from './notifications.js';

test('buildDashboardNotifications creates status, window, and signal events', () => {
  const events = buildDashboardNotifications({
    dashboard: mockDashboards.kilauea,
    selectedVolcano: mockVolcanoes[0],
    preferences: {
      ...defaultNotificationPreferences,
      signalThreshold: 40,
    },
  });

  assert.ok(events.some((event) => event.type === 'status'));
  assert.ok(events.some((event) => event.type === 'window'));
  assert.ok(events.some((event) => event.type === 'signal'));
});

test('buildDashboardNotifications respects disabled channels and thresholds', () => {
  const preferences = mergeNotificationPreferences(defaultNotificationPreferences, {
    signalThreshold: 90,
    channels: { status: false, windows: false, weather: false },
  });
  const events = buildDashboardNotifications({
    dashboard: mockDashboards.kilauea,
    selectedVolcano: mockVolcanoes[0],
    preferences,
  });

  assert.equal(events.some((event) => event.type === 'status'), false);
  assert.equal(events.some((event) => event.type === 'window'), false);
  assert.equal(events.some((event) => event.type === 'signal'), false);
});

test('buildDashboardNotifications creates high earthquake and hazard events', () => {
  const dashboard = {
    ...mockDashboards['hawaii-island'],
    weatherAlerts: [
      { id: 'tsunami-warning', event: 'Tsunami Warning', headline: 'Tsunami Warning for Hawaii coastal areas', url: 'https://example.com/tsunami' },
      { id: 'flash-flood-warning', event: 'Flash Flood Warning', headline: 'Flash Flood Warning for Hawaii Island', url: 'https://example.com/flood' },
    ],
  };
  const events = buildDashboardNotifications({
    dashboard,
    selectedVolcano: mockVolcanoes.find((volcano) => volcano.id === 'hawaii-island'),
    preferences: defaultNotificationPreferences,
  });
  const earthquake = events.find((event) => event.type === 'earthquake');

  assert.equal(earthquake?.tone, 'danger');
  assert.match(earthquake?.title ?? '', /近期强震 M5\.9|近期强震 M6\.0/);
  assert.match(earthquake?.body ?? '', /震源深度/);
  assert.ok(events.some((event) => event.type === 'tsunami' && event.tone === 'danger'));
  assert.ok(events.some((event) => event.type === 'weather' && event.tone === 'danger'));
});

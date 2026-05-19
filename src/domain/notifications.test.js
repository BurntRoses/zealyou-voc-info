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

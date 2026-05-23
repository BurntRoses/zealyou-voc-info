import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildDashboardNotifications,
  normalizeNotificationPreferences,
} from '../domain/notifications.js';
import { useStoredState } from './useStoredState.js';

const notificationStoreKey = 'voc-info-notification-center-v1';
const maxNotificationItems = 50;

export function useNotificationCenter({ dashboard, selectedVolcano, preferences }) {
  const notificationPreferences = useMemo(
    () => normalizeNotificationPreferences(preferences),
    [preferences],
  );
  const [state, setState] = useStoredState(notificationStoreKey, {
    items: [],
  });
  const [toastItems, setToastItems] = useState([]);
  const previousItemIdsRef = useRef(new Set((state.items ?? []).map((item) => item.id)));

  const events = useMemo(
    () => buildDashboardNotifications({
      dashboard,
      selectedVolcano,
      preferences: notificationPreferences,
    }),
    [dashboard, selectedVolcano, notificationPreferences],
  );

  useEffect(() => {
    if (!dashboard || !notificationPreferences.inPage || !events.length) return;

    setState((current) => {
      const currentItems = Array.isArray(current.items) ? current.items : [];
      const eventsByKey = new Map(events.map((event) => [event.key, event]));
      const updatedItems = currentItems.map((item) => {
        const event = eventsByKey.get(item.key);
        return event
          ? { ...item, ...event, id: item.id, createdAt: item.createdAt, read: item.read }
          : item;
      });
      const existingKeys = new Set(updatedItems.map((item) => item.key));
      const createdAt = new Date().toISOString();
      const newItems = events
        .filter((event) => !existingKeys.has(event.key))
        .map((event) => ({
          ...event,
          id: `${event.key}:${createdAt}`,
          createdAt,
          read: false,
        }));
      const updatedExisting = updatedItems.some((item, index) => {
        const currentItem = currentItems[index];
        return item.title !== currentItem.title || item.body !== currentItem.body || item.meta !== currentItem.meta;
      });

      if (!newItems.length && !updatedExisting) return current;

      return {
        ...current,
        items: [...newItems, ...updatedItems].slice(0, maxNotificationItems),
      };
    });
  }, [dashboard, events, notificationPreferences.inPage, setState]);

  useEffect(() => {
    const previousIds = previousItemIdsRef.current;
    const currentItems = Array.isArray(state.items) ? state.items : [];
    const freshItems = currentItems.filter((item) => !previousIds.has(item.id) && !item.read);
    previousItemIdsRef.current = new Set(currentItems.map((item) => item.id));

    if (!notificationPreferences.inPage || !freshItems.length) return;

    setToastItems((current) => [...freshItems, ...current].slice(0, 3));
  }, [notificationPreferences.inPage, state.items]);

  const unreadCount = useMemo(
    () => (state.items ?? []).filter((item) => !item.read).length,
    [state.items],
  );

  const markAllRead = useCallback(() => {
    setState((current) => ({
      ...current,
      items: (current.items ?? []).map((item) => ({ ...item, read: true })),
    }));
  }, [setState]);

  const dismissNotification = useCallback((id) => {
    setState((current) => ({
      ...current,
      items: (current.items ?? []).filter((item) => item.id !== id),
    }));
    setToastItems((current) => current.filter((item) => item.id !== id));
  }, [setState]);

  const dismissToast = useCallback((id) => {
    setToastItems((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!toastItems.length) return undefined;
    const timers = toastItems.map((item) => window.setTimeout(() => {
      dismissToast(item.id);
    }, 9000));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [dismissToast, toastItems]);

  const clearNotifications = useCallback(() => {
    setState((current) => ({ ...current, items: [] }));
    setToastItems([]);
  }, [setState]);

  return {
    events,
    items: state.items ?? [],
    toastItems,
    unreadCount,
    markAllRead,
    dismissNotification,
    dismissToast,
    clearNotifications,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultUrlState, mapLayerIds, viewIds } from '../domain/config.js';

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolFromParam(value, fallback) {
  if (!value) return fallback;
  return !['0', 'false', 'off', 'hidden', 'no'].includes(String(value).toLowerCase());
}

function getHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return new URLSearchParams();
  const queryIndex = hash.indexOf('?');
  if (queryIndex >= 0) return new URLSearchParams(hash.slice(queryIndex + 1));
  return hash.includes('=') ? new URLSearchParams(hash) : new URLSearchParams();
}

function readUrlParam(searchParams, hashParams, names) {
  for (const name of names) {
    const fromQuery = searchParams.get(name);
    if (fromQuery) return fromQuery;
    const fromHash = hashParams.get(name);
    if (fromHash) return fromHash;
  }
  return '';
}

function readHashView() {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return viewIds.has(hash) ? hash : '';
}

export function readAppUrlState() {
  if (typeof window === 'undefined') return defaultUrlState;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = getHashParams();
  const view = readUrlParam(searchParams, hashParams, ['view', 'section', 'page']) || readHashView();
  const layer = readUrlParam(searchParams, hashParams, ['layer', 'mapLayer']);
  const quakes = readUrlParam(searchParams, hashParams, ['quakes', 'showQuakes']);
  const radius = readUrlParam(searchParams, hashParams, ['radiusKm', 'radius']);
  const noaa = readUrlParam(searchParams, hashParams, ['noaa', 'weather']);

  return {
    activeView: viewIds.has(view) ? view : defaultUrlState.activeView,
    selectedVolcanoId: defaultUrlState.selectedVolcanoId,
    mapLayer: mapLayerIds.has(layer) ? layer : defaultUrlState.mapLayer,
    showQuakes: boolFromParam(quakes, defaultUrlState.showQuakes),
    radiusKm: clampInteger(radius, defaultUrlState.radiusKm, 5, 200),
    includeNoaa: boolFromParam(noaa, defaultUrlState.includeNoaa),
  };
}

function buildUrlFromState(state) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', viewIds.has(state.activeView) ? state.activeView : defaultUrlState.activeView);
  url.searchParams.delete('volcano');
  url.searchParams.delete('v');
  url.searchParams.set('layer', mapLayerIds.has(state.mapLayer) ? state.mapLayer : defaultUrlState.mapLayer);
  url.searchParams.set('quakes', state.showQuakes ? '1' : '0');
  url.searchParams.set('radiusKm', String(clampInteger(state.radiusKm, defaultUrlState.radiusKm, 5, 200)));
  url.searchParams.set('noaa', state.includeNoaa ? '1' : '0');
  return `${url.pathname}${url.search}`;
}

function currentUrlWithoutHash() {
  return `${window.location.pathname}${window.location.search}`;
}

function stateKey(state) {
  return state.activeView;
}

function isSameState(a, b) {
  return (
    a.activeView === b.activeView &&
    a.mapLayer === b.mapLayer &&
    a.showQuakes === b.showQuakes &&
    a.radiusKm === b.radiusKm &&
    a.includeNoaa === b.includeNoaa
  );
}

export function useUrlState() {
  const initialState = useMemo(readAppUrlState, []);
  const [urlState, setUrlState] = useState(initialState);
  const syncRef = useRef({
    initialized: false,
    applyingUrl: false,
    routeKey: stateKey(initialState),
    replaceNext: false,
  });

  useEffect(() => {
    const applyUrlState = () => {
      const nextState = readAppUrlState();
      setUrlState((current) => {
        if (isSameState(current, nextState)) return current;
        syncRef.current.applyingUrl = true;
        return nextState;
      });
    };

    window.addEventListener('popstate', applyUrlState);
    window.addEventListener('hashchange', applyUrlState);
    return () => {
      window.removeEventListener('popstate', applyUrlState);
      window.removeEventListener('hashchange', applyUrlState);
    };
  }, []);

  useEffect(() => {
    const nextUrl = buildUrlFromState(urlState);
    const currentUrl = currentUrlWithoutHash();
    const nextRouteKey = stateKey(urlState);

    if (syncRef.current.applyingUrl) {
      syncRef.current.applyingUrl = false;
      syncRef.current.initialized = true;
      syncRef.current.routeKey = nextRouteKey;
      return;
    }

    if (nextUrl === currentUrl) {
      syncRef.current.initialized = true;
      syncRef.current.routeKey = nextRouteKey;
      syncRef.current.replaceNext = false;
      return;
    }

    const routeChanged = syncRef.current.routeKey && syncRef.current.routeKey !== nextRouteKey;
    const shouldPush = syncRef.current.initialized && routeChanged && !syncRef.current.replaceNext;
    window.history[shouldPush ? 'pushState' : 'replaceState'](urlState, '', nextUrl);
    syncRef.current.initialized = true;
    syncRef.current.routeKey = nextRouteKey;
    syncRef.current.replaceNext = false;
  }, [urlState]);

  const updateUrlState = useCallback((patch, options = {}) => {
    if (options.replace) syncRef.current.replaceNext = true;
    setUrlState((current) => ({
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch),
    }));
  }, []);

  return [urlState, updateUrlState];
}

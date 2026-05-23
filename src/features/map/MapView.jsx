import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import { AlertTriangle, Crosshair, Eye, EyeOff, Map as MapIcon } from 'lucide-react';
import { mapLayers } from '../../domain/config.js';
import {
  formatDateTime,
  getCoordinates,
  getQuakeArea,
  getQuakeCoordinates,
  getQuakeDepthKm,
  getQuakeId,
  getQuakeMagnitude,
  getQuakeStyle,
  primaryVolcanoName,
} from '../../domain/formatters.js';

const radiusOptions = [10, 25, 50, 100, 150, 200];

export function MapView({
  dashboard,
  selectedVolcano,
  timeZone,
  selectedQuakeId,
  onSelectQuake,
  mapLayer,
  onMapLayerChange,
  showQuakes,
  onShowQuakesChange,
  radiusKm,
  onRadiusChange,
}) {
  const mapRef = useRef(null);
  const elementRef = useRef(null);
  const layerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const coordinates = getCoordinates(dashboard, selectedVolcano);
  const quakes = useMemo(() => buildNearbyQuakeRows(dashboard.earthquakes ?? [], coordinates, radiusKm), [dashboard.earthquakes, coordinates, radiusKm]);
  const notableQuakes = useMemo(() => buildNotableQuakeRows(quakes), [quakes]);
  const selected = quakes.find((row) => row.id === selectedQuakeId) ?? notableQuakes[0] ?? quakes[0] ?? null;
  const selectedQuake = selected?.quake ?? null;
  const layer = mapLayers[mapLayer] ?? mapLayers.topo;
  const [tileState, setTileState] = useState('loading');

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    mapRef.current = L.map(elementRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    }).setView([coordinates.lat, coordinates.lon], 10);
    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
    const map = mapRef.current;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resizeObserver.observe(elementRef.current);
    window.setTimeout(() => map.invalidateSize({ animate: false }), 120);
    return () => {
      resizeObserver.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setTileState('loading');
    if (layerRef.current) map.removeLayer(layerRef.current);
    const timeout = window.setTimeout(() => {
      if (layerRef.current && layerRef.current._url === layer.externalTileUrl) {
        layerRef.current.setUrl(layer.fallbackTileUrl);
      }
      setTileState((current) => current === 'ready' ? 'ready' : 'fallback');
    }, 4500);
    layerRef.current = L.tileLayer(layer.externalTileUrl, {
      attribution: layer.attribution,
      maxZoom: 18,
      crossOrigin: true,
    })
      .on('load', () => {
        window.clearTimeout(timeout);
        setTileState((current) => current === 'fallback' || current === 'local' ? current : 'ready');
      })
      .on('tileerror', () => {
        if (!layerRef.current) return;
        if (layerRef.current._url === layer.externalTileUrl) {
          layerRef.current.setUrl(layer.fallbackTileUrl);
          setTileState('fallback');
          return;
        }
        if (layer.tileUrl && layerRef.current._url !== layer.tileUrl) {
          layerRef.current.setUrl(layer.tileUrl);
          setTileState('local');
          return;
        }
        setTileState('local');
      })
      .addTo(map);

    return () => window.clearTimeout(timeout);
  }, [layer.externalTileUrl, layer.fallbackTileUrl, layer.tileUrl, layer.attribution]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();

    const volcanoMarker = L.marker([coordinates.lat, coordinates.lon], {
      icon: L.divIcon({
        className: 'volcano-map-icon',
        html: '<span></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      title: primaryVolcanoName(dashboard.volcano?.name),
    }).addTo(markerLayer);
    volcanoMarker.bindPopup(`<strong>${primaryVolcanoName(dashboard.volcano?.name)}</strong><br/>火山中心`);

    if (showQuakes) {
      for (const row of quakes) {
        const quakeCoordinates = getQuakeCoordinates(row.quake);
        if (!Number.isFinite(quakeCoordinates.lat) || !Number.isFinite(quakeCoordinates.lon)) continue;
        const style = getQuakeStyle(getQuakeMagnitude(row.quake));
        const marker = L.marker([quakeCoordinates.lat, quakeCoordinates.lon], {
          icon: L.divIcon({
            className: `quake-map-icon quake-map-icon--${style.tone} ${row.id === selectedQuakeId ? 'is-selected' : ''}`,
            html: `<span style="width:${style.size}px;height:${style.size}px"></span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          title: `M${getQuakeMagnitude(row.quake).toFixed(1)} ${getQuakeArea(row.quake)}`,
        }).addTo(markerLayer);
        marker.on('click', () => onSelectQuake(row.id));
        marker.bindPopup(`<strong>M${getQuakeMagnitude(row.quake).toFixed(1)}</strong><br/>${getQuakeArea(row.quake)}`);
      }
    }
  }, [coordinates, dashboard.volcano?.name, onSelectQuake, quakes, selectedQuakeId, showQuakes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds([[coordinates.lat, coordinates.lon]]);

    if (showQuakes) {
      for (const row of quakes) {
        const quakeCoordinates = getQuakeCoordinates(row.quake);
        if (!Number.isFinite(quakeCoordinates.lat) || !Number.isFinite(quakeCoordinates.lon)) continue;
        bounds.extend([quakeCoordinates.lat, quakeCoordinates.lon]);
      }
    }

    if (bounds.isValid()) map.fitBounds(bounds.pad(0.24), { maxZoom: 12, animate: false });
  }, [coordinates, quakes, showQuakes]);

  useEffect(() => {
    if (selected && selected.id !== selectedQuakeId) onSelectQuake(selected.id);
  }, [selected, selectedQuakeId, onSelectQuake]);

  return (
    <div className="map-view">
      <section className="panel map-panel">
        <div className="map-toolbar">
          <div className="map-control" aria-label="地图底图">
            {Object.values(mapLayers).map((item) => (
              <button className={item.id === mapLayer ? 'is-active' : ''} key={item.id} type="button" onClick={() => onMapLayerChange(item.id)}>
                <MapIcon size={14} />{item.label}
              </button>
            ))}
          </div>
          <div className="radius-pills" aria-label="地震半径">
            {radiusOptions.map((value) => (
              <button className={value === radiusKm ? 'is-active' : ''} key={value} type="button" onClick={() => onRadiusChange(value)}>
                {value} km
              </button>
            ))}
            <button type="button" onClick={() => onShowQuakesChange(!showQuakes)}>
              {showQuakes ? <Eye size={14} /> : <EyeOff size={14} />}
              {showQuakes ? '隐藏地震' : '显示地震'}
            </button>
          </div>
        </div>
        <div className="map-canvas-wrap">
          <div className="leaflet-map" ref={elementRef} aria-label="夏威夷火山真实地图" />
          <span className={`map-tile-state is-${tileState}`}>
            {tileState === 'loading' ? '底图加载中' : tileState === 'fallback' ? '备用 OSM 底图' : tileState === 'local' ? '底图降级' : `${layer.label}底图`}
          </span>
          <div className="map-legend" aria-label="地图图例">
            <span><i className="is-volcano" />火山中心</span>
            <span><i />USGS 地震</span>
            <span><i className="is-selected" />当前选中</span>
          </div>
        </div>
      </section>

      <aside className="map-side">
        <section className="panel quake-detail">
          <span className="tag tag-official"><Crosshair size={13} />USGS 地震</span>
          {selectedQuake ? (
            <>
              <strong>M{getQuakeMagnitude(selectedQuake).toFixed(1)}</strong>
              <span>{getQuakeArea(selectedQuake)}</span>
              <em>{getQuakeDepthKm(selectedQuake).toFixed(1)} km / {formatDateTime(selectedQuake.time, timeZone)}</em>
              <em>距离火山约 {formatDistanceKm(selected?.distanceKm)}</em>
            </>
          ) : (
            <span>半径内暂无地震事件。</span>
          )}
          <p className="map-note">
            地震反映近场活动背景，不等同喷发预测。喷发状态以 USGS/HVO 官方通报为准。
          </p>
        </section>

        <section className="panel">
          <header className="panel-head">
            <span><AlertTriangle size={17} />值得注意</span>
            <strong className="tag">{notableQuakes.length} 条</strong>
          </header>
          <div className="compact-list">
            {notableQuakes.slice(0, 8).map((row) => (
              <button
                className={`quake-button ${row.id === selectedQuakeId ? 'is-active' : ''}`}
                key={row.id}
                type="button"
                onClick={() => onSelectQuake(row.id)}
              >
                <strong>M{getQuakeMagnitude(row.quake).toFixed(1)}</strong>
                <span>{getQuakeArea(row.quake)}</span>
                <em>{formatDistanceKm(row.distanceKm)} / {getQuakeDepthKm(row.quake).toFixed(1)} km</em>
              </button>
            ))}
            {!notableQuakes.length ? <p className="empty-copy">当前半径内没有可展示地震。</p> : null}
          </div>
        </section>
      </aside>
    </div>
  );
}

function buildNotableQuakeRows(rows) {
  const significant = rows.filter((row) => getQuakeMagnitude(row.quake) >= 3);
  const candidates = significant.length ? significant : rows;
  return [...candidates].sort((left, right) => {
    const magnitudeDelta = getQuakeMagnitude(right.quake) - getQuakeMagnitude(left.quake);
    if (Math.abs(magnitudeDelta) >= 0.1) return magnitudeDelta;
    return right.timeValue - left.timeValue || left.distanceKm - right.distanceKm || left.index - right.index;
  });
}

function buildNearbyQuakeRows(earthquakes, coordinates, radiusKm) {
  const radius = Math.max(5, Math.min(200, Number(radiusKm) || 50));
  return earthquakes
    .map((quake, index) => {
      const quakeCoordinates = getQuakeCoordinates(quake);
      const distanceKm = distanceKmBetween(coordinates, quakeCoordinates);
      return {
        quake,
        index,
        id: getQuakeId(quake),
        coordinates: quakeCoordinates,
        distanceKm,
        timeValue: Date.parse(quake?.time ?? '') || 0,
      };
    })
    .filter((row) => Number.isFinite(row.coordinates.lat) && Number.isFinite(row.coordinates.lon) && row.distanceKm <= radius)
    .sort((left, right) => right.timeValue - left.timeValue || right.distanceKm - left.distanceKm || left.index - right.index);
}

function distanceKmBetween(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371.0088;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function formatDistanceKm(value) {
  if (!Number.isFinite(value)) return '-- km';
  return value < 10 ? `${value.toFixed(1)} km` : `${Math.round(value)} km`;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import {
  AlertTriangle,
  Camera,
  CloudRain,
  Crosshair,
  ExternalLink,
  Eye,
  Gauge,
  MapPinned,
  Navigation,
  RadioTower,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { craterActivityImages, mapLayers, viewingLocations } from '../../domain/config.js';
import {
  activityBand,
  activitySignalValue,
  cnColor,
  cnStatus,
  formatDateTime,
  formatWindowLabel,
  getCoordinates,
  getWeatherSnapshot,
  primaryVolcanoName,
  resolveEruptionState,
  statusTone,
  translateForecast,
} from '../../domain/formatters.js';

const hstZone = 'Pacific/Honolulu';

export function ViewingView({ dashboard, selectedVolcano, timeZone = hstZone, onNavigate }) {
  const [selectedImageId, setSelectedImageId] = useState(craterActivityImages[0]?.id ?? '');
  const [selectedLocationId, setSelectedLocationId] = useState(viewingLocations[0]?.id ?? '');
  const status = dashboard.officialStatus ?? {};
  const context = dashboard.travelContext ?? {};
  const eruption = resolveEruptionState(context.eruptionState, status.summary);
  const signal = activitySignalValue(dashboard.forecast, dashboard.assessment);
  const band = activityBand(signal);
  const activeWindow = context.activeWindow ?? context.officialWindow ?? context.modelWindow;
  const weather = getWeatherSnapshot(dashboard.weather);
  const weatherAlerts = dashboard.weatherAlerts ?? [];
  const coordinates = getCoordinates(dashboard, selectedVolcano);
  const isNight = isNightInZone(dashboard.generatedAt ?? new Date(), hstZone);
  const image = craterActivityImages.find((item) => item.id === selectedImageId) ?? craterActivityImages[0];
  const locations = useMemo(
    () => buildLocationReadiness(viewingLocations, { weather, weatherAlerts, isNight, signal }),
    [weather, weatherAlerts, isNight, signal],
  );
  const selectedLocation = locations.find((item) => item.id === selectedLocationId) ?? locations[0];
  const sourceUrl = activeWindow?.url ?? dashboard.latestAdvisory?.url ?? context.officialLinks?.hvoUpdates ?? selectedVolcano?.officialUrl;
  const cameraCount = context.webcams?.cameras?.length ?? 0;

  return (
    <div className="viewing-view">
      <section className="viewing-hero panel">
        <div className="viewing-hero__copy">
          <span className="source-chip"><Eye size={15} />HVO · UWD · NPS</span>
          <h1>{primaryVolcanoName(dashboard.volcano?.name ?? selectedVolcano?.name)} 观赏</h1>
        </div>
        <div className="viewing-hero__actions">
          <button type="button" onClick={() => onNavigate?.('cameras')}>
            <Camera size={16} />影像
          </button>
          <button type="button" onClick={() => onNavigate?.('map')}>
            <MapPinned size={16} />地震
          </button>
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              <RadioTower size={16} />HVO
            </a>
          ) : null}
        </div>
      </section>

      <section className="viewing-readiness">
        <ReadinessCard
          icon={ShieldCheck}
          tone={statusTone(status.level, status.colorCode)}
          label="状态"
          value={`${cnStatus(status.level)} / ${cnColor(status.colorCode)}`}
          detail={status.agency ?? 'USGS/HVO'}
        />
        <ReadinessCard
          icon={Gauge}
          tone={band.tone}
          label="活动信号"
          value={`${signal}/100`}
          detail={band.label}
        />
        <ReadinessCard
          icon={CloudRain}
          tone={weatherAlerts.length ? 'watch' : 'good'}
          label="天气"
          value={weather.current ? translateForecast(weather.current.shortForecast) : '暂无预报'}
          detail={weatherAlerts.length ? `${weatherAlerts.length} 条 NOAA/NWS 提醒` : `${weather.windDirection || '--'} ${weather.wind}`}
        />
        <ReadinessCard
          icon={Crosshair}
          tone={context.earthquakeSummary?.maxMagnitude >= 4 ? 'watch' : 'notice'}
          label="地震"
          value={`${context.earthquakeSummary?.count ?? dashboard.earthquakes?.length ?? 0} 条`}
          detail={context.earthquakeSummary?.maxMagnitude ? `最大 M${Number(context.earthquakeSummary.maxMagnitude).toFixed(1)}` : 'USGS 7 日'}
        />
      </section>

      <section className="viewing-main-grid">
        <article className="panel crater-activity-card">
          <header className="panel-head">
            <span><Gauge size={17} />活动图</span>
            <strong className="tag">USGS UWD</strong>
          </header>
          <div className="crater-tabs" aria-label="火山口活动图时间范围">
            {craterActivityImages.map((item) => (
              <button
                className={item.id === image?.id ? 'is-active' : ''}
                key={item.id}
                type="button"
                onClick={() => setSelectedImageId(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {image ? (
            <>
              <div className="crater-image-frame">
                <img src={image.url} alt={image.title} referrerPolicy="no-referrer" />
              </div>
              <div className="crater-caption">
                <strong>{image.title}</strong>
                <span>{image.description}</span>
                <a href={image.sourceUrl} target="_blank" rel="noreferrer">
                  USGS <ExternalLink size={13} />
                </a>
              </div>
            </>
          ) : null}
        </article>

        <aside className="panel viewing-decision-card">
          <header className="panel-head">
            <span><Navigation size={17} />观赏</span>
            <strong className={`tag tag-${band.tone}`}>{band.label}</strong>
          </header>
          <div className="decision-stack">
            <DecisionRow label="喷发" value={eruption.label ?? '监测中'} />
            <DecisionRow
              label="EP"
              value={activeWindow?.episodeNumber ? `EP ${activeWindow.episodeNumber} / ${formatWindowLabel(activeWindow)}` : '未发布'}
            />
            <DecisionRow label="机位" value={`${cameraCount}`} />
            <DecisionRow label="HST" value={formatDateTime(dashboard.generatedAt, hstZone)} />
          </div>
          <div className="decision-note decision-note--compact">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>USGS/HVO</span>
            <span>NPS</span>
            <span>NOAA/NWS</span>
          </div>
        </aside>
      </section>

      <section className="viewing-locations-grid">
        <article className="panel viewing-map-panel">
          <header className="panel-head">
            <span><MapPinned size={17} />观赏点</span>
            <strong className="tag">{locations.length} 个点位</strong>
          </header>
          <ViewingMap
            coordinates={coordinates}
            locations={locations}
            selectedLocation={selectedLocation}
            onSelect={setSelectedLocationId}
          />
        </article>

        <aside className="panel location-list-panel">
          <header className="panel-head">
            <span><Route size={17} />排序</span>
            <strong className="tag">{isNight ? '夜间模式' : '白天模式'}</strong>
          </header>
          <div className="location-list">
            {locations.map((location, index) => (
              <button
                className={`location-card tone-${location.tone} ${location.id === selectedLocation?.id ? 'is-active' : ''}`}
                key={location.id}
                type="button"
                onClick={() => setSelectedLocationId(location.id)}
              >
                <span className="location-rank">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{location.name}</strong>
                  <em>{location.rankLabel} / 准备度 {location.liveScore}</em>
                </span>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>
      </section>

      {selectedLocation ? (
        <section className="panel selected-location-panel">
          <div className="selected-location-copy">
            <span className={`tag tag-${selectedLocation.tone}`}>{selectedLocation.rankLabel}</span>
            <h2>{selectedLocation.name}</h2>
            <p>{selectedLocation.bestFor}</p>
          </div>
          <div className="selected-location-grid">
            <InfoBlock label="交通与抵达" value={selectedLocation.access} />
            <InfoBlock label="最佳时间" value={selectedLocation.timing} />
            <InfoBlock label="距离" value={`~ ${selectedLocation.distanceKm} km`} />
          </div>
          <div className="tag-row">
            {selectedLocation.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className="caution-list">
            {selectedLocation.cautions.map((item) => (
              <span key={item}><AlertTriangle size={14} />{item}</span>
            ))}
          </div>
          <footer>
            <a href={selectedLocation.sourceUrl} target="_blank" rel="noreferrer">
              NPS <ExternalLink size={13} />
            </a>
          </footer>
        </section>
      ) : null}
    </div>
  );
}

function ReadinessCard({ icon: Icon, tone, label, value, detail }) {
  return (
    <article className={`panel readiness-card tone-${tone}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </article>
  );
}

function DecisionRow({ label, value }) {
  return (
    <span>
      <strong>{label}</strong>
      <em>{value}</em>
    </span>
  );
}

function InfoBlock({ label, value }) {
  return (
    <span>
      <strong>{label}</strong>
      <em>{value}</em>
    </span>
  );
}

function ViewingMap({ coordinates, locations, selectedLocation, onSelect }) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerLayerRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return undefined;
    mapRef.current = L.map(elementRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView([coordinates.lat, coordinates.lon], 13);
    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
    const map = mapRef.current;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resizeObserver.observe(elementRef.current);
    window.setTimeout(() => map.invalidateSize({ animate: false }), 120);
    return () => {
      resizeObserver.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const layer = mapLayers.topo;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(layer.externalTileUrl, {
      attribution: layer.attribution,
      maxZoom: 18,
      crossOrigin: true,
    })
      .on('tileerror', () => {
        if (tileLayerRef.current && tileLayerRef.current._url !== layer.fallbackTileUrl) {
          tileLayerRef.current.setUrl(layer.fallbackTileUrl);
        }
      })
      .addTo(map);
    return undefined;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    const bounds = L.latLngBounds([[coordinates.lat, coordinates.lon]]);

    L.marker([coordinates.lat, coordinates.lon], {
      icon: L.divIcon({
        className: 'volcano-map-icon',
        html: '<span></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      title: 'Halemaumau 火山口',
    }).addTo(markerLayer).bindPopup('<strong>Halemaumau</strong><br/>NPS');

    locations.forEach((location, index) => {
      const marker = L.marker([location.coordinates.lat, location.coordinates.lon], {
        icon: L.divIcon({
          className: `viewing-map-icon tone-${location.tone} ${location.id === selectedLocation?.id ? 'is-selected' : ''}`,
          html: `<span>${index + 1}</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
        title: location.name,
      }).addTo(markerLayer);
      marker.on('click', () => onSelect(location.id));
      marker.bindPopup(`<strong>${location.name}</strong><br/>${location.rankLabel} / 准备度 ${location.liveScore}`);
      bounds.extend([location.coordinates.lat, location.coordinates.lon]);
    });

    if (bounds.isValid()) map.fitBounds(bounds.pad(0.2), { maxZoom: 14, animate: false });
  }, [coordinates, locations, onSelect, selectedLocation?.id]);

  return (
    <div className="viewing-map-wrap">
      <div className="leaflet-map viewing-leaflet" ref={elementRef} aria-label="火山口观赏点地图" />
      <div className="map-legend viewing-map-legend" aria-label="观赏地图图例">
        <span><i className="is-volcano" />火山口</span>
        <span><i className="is-selected" />已选点位</span>
        <span><i />观赏位置</span>
      </div>
    </div>
  );
}

function buildLocationReadiness(locations, { weather, weatherAlerts, isNight, signal }) {
  const precipitation = weather.current?.precipitationChance ?? 0;
  const weatherPenalty = weatherAlerts.length ? 16 : precipitation >= 50 ? 12 : precipitation >= 30 ? 6 : 0;
  const activityBonus = signal >= 45 ? 4 : signal >= 20 ? 2 : 0;
  const nightBonus = isNight ? 5 : 0;

  return locations
    .map((location) => {
      const liveScore = Math.max(30, Math.min(100, Math.round(location.score + activityBonus + nightBonus - weatherPenalty)));
      const tone = liveScore >= 88 ? 'good' : liveScore >= 74 ? 'notice' : 'watch';
      return { ...location, liveScore, tone };
    })
    .sort((left, right) => right.liveScore - left.liveScore || right.score - left.score);
}

function isNightInZone(value, timeZone) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return false;
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).format(date));
  return hour >= 18 || hour <= 5;
}

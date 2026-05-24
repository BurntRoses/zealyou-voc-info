import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CloudRain,
  Compass,
  ExternalLink,
  Flame,
  Gauge,
  MapPinned,
  RadioTower,
  ShieldCheck,
  TimerReset,
  Waves,
  Wind,
} from 'lucide-react';
import { mapLayers } from '../../domain/config.js';
import {
  activityBand,
  activitySignalValue,
  buildWindowDays,
  cnColor,
  cnStatus,
  dateKeyInZone,
  eruptionTone,
  formatDateTime,
  formatWindowLabel,
  getCoordinates,
  getQuakeArea,
  getQuakeCoordinates,
  getQuakeDepthKm,
  getQuakeMagnitude,
  getQuakeStyle,
  getWeatherSnapshot,
  primaryVolcanoName,
  resolveEruptionState,
  statusTone,
  translateForecast,
  windowState,
} from '../../domain/formatters.js';
import { DetailModal } from '../../components/DetailModal.jsx';

export function TodayView({ dashboard, selectedVolcano, timeZone, onNavigate }) {
  const volcano = dashboard.volcano ?? selectedVolcano;
  const context = dashboard.travelContext ?? {};
  const status = dashboard.officialStatus ?? {};
  const eruption = resolveEruptionState(context.eruptionState, status.summary);
  const officialWindow = context.officialWindow;
  const currentKey = dateKeyInZone(dashboard.generatedAt ?? new Date(), timeZone);
  const officialWindowState = windowState(buildWindowDays(officialWindow), currentKey);
  const modelWindow = context.modelWindow;
  const displayWindow = context.activeWindow
    ?? (officialWindowState.key === 'after' && modelWindow?.episodeNumber ? modelWindow : (officialWindow ?? modelWindow));
  const days = buildWindowDays(displayWindow);
  const currentWindowState = windowState(days, currentKey);
  const [selectedDayKey, setSelectedDayKey] = useState('');
  const [activeDetail, setActiveDetail] = useState(null);
  const selectedDay = days.find((day) => day.key === selectedDayKey)
    ?? days.find((day) => day.key >= currentKey)
    ?? days[0]
    ?? null;
  const selectedDayIndex = selectedDay ? days.findIndex((day) => day.key === selectedDay.key) : -1;
  const windowStage = buildWindowStage(days, currentKey);
  const isModelWindow = displayWindow?.type === 'model';
  const previousWindow = isModelWindow ? (context.lastOfficialWindow ?? officialWindow) : null;
  const signal = activitySignalValue(dashboard.forecast, dashboard.assessment);
  const band = activityBand(signal);
  const weather = getWeatherSnapshot(dashboard.weather);
  const latestCamera = context.webcams?.cameras?.find((camera) => camera.code === context.webcams?.defaultCamera)
    ?? context.webcams?.cameras?.[0];
  const latestQuakes = dashboard.earthquakes ?? [];
  const maxMagnitude = latestQuakes.reduce((max, quake) => Math.max(max, getQuakeMagnitude(quake)), 0);
  const coordinates = getCoordinates(dashboard, selectedVolcano);
  const sourceUrl = displayWindow?.url ?? dashboard.latestAdvisory?.url ?? context.officialLinks?.hans ?? context.officialLinks?.hvoUpdates ?? volcano?.officialUrl;
  const cameraUrl = latestCamera?.imageUrl ? `${latestCamera.imageUrl}?t=${encodeURIComponent(dashboard.generatedAt ?? '')}` : '';
  const compactEruption = String(eruption.label ?? '监测中').replace(/^喷发/, '') || eruption.label;
  const heroTitle = displayWindow?.episodeNumber
    ? `${primaryVolcanoName(volcano?.name)}：EP ${displayWindow.episodeNumber}${isModelWindow ? ' 候选窗口' : ' 官方窗口'}`
    : `${primaryVolcanoName(volcano?.name)}：${eruption.label}`;
  const metricCards = [
    {
      tone: statusTone(status.level, status.colorCode),
      icon: ShieldCheck,
      label: '火山警戒',
      value: cnStatus(status.level),
      meta: 'USGS/HVO',
      title: '火山警戒等级',
      description: 'USGS/HVO',
      detail: 'USGS/HVO',
      sourceUrl,
      facts: [
        { label: '等级', value: cnStatus(status.level), tone: statusTone(status.level, status.colorCode) },
        { label: '航空', value: cnColor(status.colorCode), tone: statusTone(status.level, status.colorCode) },
        { label: '更新', value: updatedLabel(dashboard.generatedAt ?? status.updatedAt), tone: 'notice' },
      ],
    },
    {
      tone: statusTone(status.level, status.colorCode),
      icon: AlertTriangle,
      label: '航空颜色',
      value: cnColor(status.colorCode),
      meta: 'Aviation',
      title: '航空颜色代码',
      description: 'Aviation',
      detail: 'Aviation',
      sourceUrl,
      facts: [
        { label: '颜色', value: cnColor(status.colorCode), tone: statusTone(status.level, status.colorCode) },
        { label: '火山', value: cnStatus(status.level), tone: statusTone(status.level, status.colorCode) },
        { label: '来源', value: 'USGS/HVO', tone: 'good' },
      ],
    },
    {
      tone: eruptionTone(eruption.state),
      icon: Flame,
      label: '喷发状态',
      value: compactEruption,
      meta: isModelWindow ? '暂停 / 候选窗口' : 'HVO 当前文本',
      title: '当前喷发状态',
      description: 'HVO',
      detail: isModelWindow ? '待确认' : 'HVO',
      sourceUrl,
      facts: [
        { label: '状态', value: compactEruption, tone: eruptionTone(eruption.state) },
        { label: '窗口', value: displayWindow?.episodeNumber ? `EP ${displayWindow.episodeNumber}` : '未发布', tone: isModelWindow ? 'watch' : 'good' },
        { label: '性质', value: isModelWindow ? '待确认' : '官方窗口', tone: isModelWindow ? 'watch' : 'good' },
      ],
    },
    {
      tone: band.tone,
      icon: Gauge,
      label: '活动信号',
      value: `${signal}/100`,
      sub: '综合信号',
      meta: band.label,
      title: '活动信号指数',
      description: 'Signal',
      detail: band.label,
      sourceUrl,
      facts: [
        { label: '指数', value: `${signal}/100`, tone: band.tone },
        { label: '分级', value: band.label, tone: band.tone },
        { label: '性质', value: '综合读数', tone: 'unknown' },
      ],
    },
  ];

  return (
    <div className="today-grid">
      <section className="status-hero">
        <div className="hero-copy">
          <span className="source-chip"><RadioTower size={15} />USGS/HVO</span>
          <h1>{heroTitle}</h1>
        </div>
        <div className="hero-window-line" aria-label="EP 窗口摘要">
          <span>
            <strong>{displayWindow?.episodeNumber ? `EP ${displayWindow.episodeNumber}${isModelWindow ? ' 候选' : ''}` : 'EP 未发布'}</strong>
            <em>{displayWindow?.start ? formatWindowLabel(displayWindow) : displayWindow?.label ?? '无短期窗口'}</em>
          </span>
          <span>
            <strong>{isModelWindow ? '待官方确认' : '官方窗口'}</strong>
            <em>{isModelWindow ? '参考窗口' : currentWindowState.label}</em>
          </span>
          <span>
            <strong>{previousWindow?.episodeNumber ? `上一官方 EP ${previousWindow.episodeNumber}` : '上一官方窗口'}</strong>
            <em>{previousWindow?.start ? formatWindowLabel(previousWindow) : '未识别'}</em>
          </span>
        </div>
        <div className="hero-decision-chain" aria-label="追火山核验链">
          <span><i>01</i><strong>HVO</strong><em>{cnStatus(status.level)} / {cnColor(status.colorCode)}</em></span>
          <span><i>02</i><strong>EP</strong><em>{displayWindow?.episodeNumber ? `EP ${displayWindow.episodeNumber}${isModelWindow ? ' 候选' : ''}` : '未发布'}</em></span>
          <span><i>03</i><strong>影像 / 天气</strong><em>{latestCamera?.code ?? 'HVO'} / {weather.current ? translateForecast(weather.current?.shortForecast) : '待更新'}</em></span>
          <span><i>04</i><strong>NPS</strong><em>道路 / 开放</em></span>
        </div>
        <div className="hero-metrics">
          {metricCards.map((card) => (
            <Metric {...card} key={card.label} onOpen={() => setActiveDetail(card)} />
          ))}
        </div>
      </section>

      <section className="window-panel panel">
        <header className="panel-head">
          <span><CalendarDays size={17} />EP 窗口</span>
          <strong className={isModelWindow ? 'tag tag-model' : 'tag tag-official'}>
            {isModelWindow ? '待官方确认' : '官方窗口'}
          </strong>
        </header>
        <div className="window-title">
          <strong>{displayWindow?.episodeNumber ? `EP ${displayWindow.episodeNumber}${isModelWindow ? ' 候选' : ''}` : '未发布 EP 窗口'}</strong>
          <span>{displayWindow?.start ? formatWindowLabel(displayWindow) : displayWindow?.label ?? '无官方短期窗口'}</span>
        </div>
        <div className="window-timeline" style={{ '--window-now': `${windowStage.marker}%` }}>
          <div className={`window-stage tone-${windowStage.tone}`}>
            <TimerReset size={18} aria-hidden="true" />
            <span>{windowStage.label}</span>
            <strong>{windowStage.value}</strong>
            <em>{windowStage.detail}</em>
          </div>
          <div className="window-rail" role="list" aria-label={displayWindow?.start ? formatWindowLabel(displayWindow) : 'EP 窗口'}>
            <i className="window-band" aria-hidden="true" />
            {windowStage.showMarker ? (
              <i className="window-now-marker" aria-label="当前日期位置">
                <span>今日</span>
              </i>
            ) : null}
            {days.length ? days.map((day, index) => (
              <button
                className={`${day.key === currentKey ? 'is-current' : ''} ${dayToneClass(day.key, currentKey)} ${day.key === selectedDay?.key ? 'is-selected' : ''}`}
                key={day.key}
                type="button"
                aria-pressed={day.key === selectedDay?.key}
                style={{ '--tick-x': `${days.length === 1 ? 50 : (index / (days.length - 1)) * 100}%` }}
                onClick={() => setSelectedDayKey(day.key)}
              >
                <i aria-hidden="true" />
                <span>{compactDayLabel(day)}</span>
                <strong>{day.weekday}</strong>
              </button>
            )) : (
              <span className="window-empty">USGS/HVO 未发布短期窗口</span>
            )}
          </div>
          <div className="window-readout">
            <strong>{selectedDay ? `候选范围 ${selectedDayIndex + 1}/${days.length}` : '未发布窗口'}</strong>
            <span>{selectedDay ? `${selectedDay.month}${selectedDay.day} ${selectedDay.weekday}` : '等待官方通报'}</span>
            <em>{isModelWindow ? '待官方确认范围' : currentWindowState.label}</em>
          </div>
        </div>
        <footer>
          <span>{isModelWindow ? '待 HVO 确认' : currentWindowState.label}</span>
          {previousWindow?.episodeNumber ? <em>上一官方 EP {previousWindow.episodeNumber} / {formatWindowLabel(previousWindow)}</em> : null}
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">HVO 原文 <ExternalLink size={13} /></a> : null}
        </footer>
      </section>

      <section className="condition-strip panel">
        <Condition icon={Wind} label="风向" value={weather.current ? `${weather.windDirection || '--'} ${weather.wind}` : '--'} tone="notice" />
        <Condition icon={CloudRain} label="降雨" value={weather.current ? `${weather.current.precipitationChance ?? 0}%` : '--'} tone={(weather.current?.precipitationChance ?? 0) >= 40 ? 'watch' : 'good'} />
        <Condition icon={Waves} label="能见度" value={translateForecast(weather.current?.shortForecast)} tone="good" />
        <Condition icon={AlertTriangle} label="天气提醒" value={`${dashboard.weatherAlerts?.length ?? 0} 条`} tone={dashboard.weatherAlerts?.length ? 'watch' : 'good'} />
      </section>

      <section className="overview-row">
        <article className="panel camera-preview">
          <header className="panel-head">
            <span><Camera size={17} />HVO 摄像头</span>
            <button type="button" onClick={() => onNavigate('cameras')}>查看</button>
          </header>
          {latestCamera ? (
            <div className="preview-media">
              <img src={cameraUrl} alt={`${latestCamera.code} HVO 摄像头`} referrerPolicy="no-referrer" />
              <span>{latestCamera.code} / {latestCamera.label}</span>
            </div>
          ) : <p className="empty-copy">未返回摄像头清单。</p>}
        </article>

        <article className="panel mini-map-card map-preview-card">
          <header className="panel-head">
            <span><MapPinned size={17} />真实地图与地震</span>
            <button type="button" onClick={() => onNavigate('map')}>地图</button>
          </header>
          <MapPreview coordinates={coordinates} quakes={latestQuakes} onNavigate={onNavigate} />
          <div className="quake-summary">
            <strong>{latestQuakes.length}</strong>
            <span>近场地震 / 7 日</span>
            <em>最大 M{maxMagnitude.toFixed(1)}</em>
          </div>
        </article>

        <article className="panel quake-list-card">
          <header className="panel-head">
            <span><Compass size={17} />最近地震</span>
            <strong className="tag">USGS</strong>
          </header>
          <div className="compact-list">
            {latestQuakes.slice(0, 5).map((quake) => (
              <div key={quake.id ?? `${quake.time}-${quake.place}`}>
                <strong>M{getQuakeMagnitude(quake).toFixed(1)}</strong>
                <span>{getQuakeArea(quake)}</span>
                <em>{getQuakeDepthKm(quake).toFixed(1)} km / {formatDateTime(quake.time, timeZone)}</em>
              </div>
            ))}
            {!latestQuakes.length ? <p className="empty-copy">半径内暂无 USGS 地震事件。</p> : null}
          </div>
        </article>
      </section>
      <DetailModal detail={activeDetail} onClose={() => setActiveDetail(null)} />
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, tone, onOpen }) {
  return (
    <button
      className={`metric-tile tone-${tone} is-expandable`}
      type="button"
      aria-label={`打开${label}详情`}
      onClick={onOpen}
    >
      <Icon size={20} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value ?? '--'}</strong>
      {sub ? <em>{sub}</em> : null}
    </button>
  );
}

function updatedLabel(value) {
  return value ? formatDateTime(value, 'Pacific/Honolulu') : '待更新';
}

function Condition({ icon: Icon, label, value, tone }) {
  return (
    <article className={`condition-item tone-${tone}`}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value ?? '--'}</strong>
    </article>
  );
}

function dayToneClass(dayKey, currentKey) {
  if (!dayKey || !currentKey) return '';
  if (dayKey < currentKey) return 'is-past';
  if (dayKey > currentKey) return 'is-future';
  return '';
}

function compactDayLabel(day) {
  const month = String(day.month ?? '').replace('月', '').replace(/\s/g, '');
  const date = String(day.day ?? '').replace('日', '').replace(/\D/g, '') || day.day;
  return `${month}/${date}`;
}

function buildWindowStage(days, currentKey) {
  if (!days.length) {
    return { label: '窗口状态', value: '未发布', detail: '等待 USGS/HVO 通报', marker: 0, showMarker: false, tone: 'unknown' };
  }
  const first = days[0].key;
  const last = days[days.length - 1].key;
  if (currentKey < first) {
    const gap = Math.max(0, dayDistance(currentKey, first));
    return { label: '窗口前', value: `T-${gap}`, detail: `距起始 ${gap} 天`, marker: 0, showMarker: false, tone: 'watch' };
  }
  if (currentKey > last) {
    const gap = Math.max(0, dayDistance(last, currentKey));
    return { label: '窗口已过', value: `+${gap} 天`, detail: '已转为历史窗口', marker: 100, showMarker: false, tone: 'unknown' };
  }
  const index = Math.max(0, days.findIndex((day) => day.key === currentKey));
  const marker = Math.round(((index + 0.5) / days.length) * 100);
  return { label: '窗口内', value: `${index + 1}/${days.length}`, detail: `第 ${index + 1} 天`, marker, showMarker: true, tone: 'danger' };
}

function dayDistance(startKey, endKey) {
  const start = Date.parse(`${startKey}T00:00:00Z`);
  const end = Date.parse(`${endKey}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

function MapPreview({ coordinates, quakes, onNavigate }) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [tileState, setTileState] = useState('loading');
  const previewQuakes = useMemo(() => quakes.slice(0, 36), [quakes]);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return undefined;
    mapRef.current = L.map(elementRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
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
      tileLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const topo = mapLayers.topo;
    setTileState('loading');
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const timeout = window.setTimeout(() => {
      if (tileLayerRef.current && tileLayerRef.current._url !== topo.fallbackTileUrl) {
        tileLayerRef.current.setUrl(topo.fallbackTileUrl);
      }
      setTileState((current) => current === 'ready' ? 'ready' : 'fallback');
    }, 4500);
    tileLayerRef.current = L.tileLayer(topo.externalTileUrl, {
      attribution: topo.attribution,
      maxZoom: 18,
      crossOrigin: true,
    })
      .on('load', () => {
        window.clearTimeout(timeout);
        setTileState((current) => current === 'fallback' ? 'fallback' : 'ready');
      })
      .on('tileerror', () => {
        if (!tileLayerRef.current || tileLayerRef.current._url === topo.fallbackTileUrl) {
          setTileState('fallback');
          return;
        }
        tileLayerRef.current.setUrl(topo.fallbackTileUrl);
        setTileState('fallback');
      })
      .addTo(map);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    const bounds = L.latLngBounds([[coordinates.lat, coordinates.lon]]);
    L.marker([coordinates.lat, coordinates.lon], {
      icon: L.divIcon({
        className: 'volcano-map-icon home-volcano-icon',
        html: '<span></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      title: 'Kilauea',
    }).addTo(markerLayer);

    for (const quake of previewQuakes) {
      const quakeCoordinates = getQuakeCoordinates(quake);
      if (!Number.isFinite(quakeCoordinates.lat) || !Number.isFinite(quakeCoordinates.lon)) continue;
      const magnitude = getQuakeMagnitude(quake);
      const style = getQuakeStyle(magnitude);
      L.marker([quakeCoordinates.lat, quakeCoordinates.lon], {
        icon: L.divIcon({
          className: `quake-map-icon quake-map-icon--${style.tone} home-quake-icon`,
          html: `<span style="width:${style.size}px;height:${style.size}px"></span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        title: `M${magnitude.toFixed(1)} ${getQuakeArea(quake)}`,
      }).addTo(markerLayer);
      bounds.extend([quakeCoordinates.lat, quakeCoordinates.lon]);
    }
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.2), { maxZoom: 11, animate: false });
  }, [coordinates.lat, coordinates.lon, previewQuakes]);

  return (
    <div className="home-map-preview">
      <div className="home-leaflet-map" ref={elementRef} aria-label="首页真实地图预览" />
      <button className="map-preview-open" type="button" onClick={() => onNavigate('map')}>
        <MapPinned size={14} /> 地图
      </button>
      <span className={`map-preview-state is-${tileState}`}>
        {tileState === 'loading' ? '加载中' : tileState === 'fallback' ? 'OSM' : 'Esri'}
      </span>
    </div>
  );
}

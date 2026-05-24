import { useMemo, useState } from 'react';
import { Camera, ExternalLink, RefreshCcw, Video } from 'lucide-react';
import { cameraModes, officialWebcams } from '../../domain/config.js';
import { primaryVolcanoName } from '../../domain/formatters.js';
import { useLiveClock } from '../../hooks/useLiveClock.js';

export function CamerasView({ dashboard }) {
  const [mode, setMode] = useState('live');
  const [refreshKey, setRefreshKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const webcamSet = dashboard.travelContext?.webcams ?? officialWebcams[dashboard.volcano?.slug] ?? officialWebcams.kilauea;
  const cameras = webcamSet?.cameras ?? [];
  const defaultCode = webcamSet?.defaultCamera ?? cameras[0]?.code;
  const [selectedCode, setSelectedCode] = useState(defaultCode);
  const hawaiiClock = useLiveClock('Pacific/Honolulu', 'zh-CN');
  const activeCamera = useMemo(
    () => cameras.find((camera) => camera.code === selectedCode) ?? cameras[0] ?? null,
    [cameras, selectedCode],
  );
  const imageUrl = activeCamera ? cameraUrl(activeCamera, mode, refreshKey) : '';

  const selectCamera = (code) => {
    setSelectedCode(code);
    setFailed(false);
    setLoading(true);
  };

  const refresh = () => {
    setRefreshKey((value) => value + 1);
    setFailed(false);
    setLoading(true);
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setFailed(false);
    setLoading(true);
  };

  return (
    <div className="cameras-view">
      <section className="panel camera-main">
        <div className="camera-toolbar">
          <div>
            <strong>HVO</strong>
            <span>{primaryVolcanoName(dashboard.volcano?.name)} / HST {hawaiiClock}</span>
          </div>
          <div className="camera-mode" aria-label="摄像头模式">
            {cameraModes.map((item) => (
              <button className={mode === item.id ? 'is-active' : ''} key={item.id} type="button" onClick={() => changeMode(item.id)}>
                <Video size={14} />{item.label}
              </button>
            ))}
            <button type="button" onClick={refresh}>
              <RefreshCcw size={14} />刷新
            </button>
          </div>
        </div>

        <div className="camera-frame">
          {activeCamera && imageUrl ? (
            <img
              src={imageUrl}
              alt={`${activeCamera.code} ${activeCamera.label}`}
              referrerPolicy="no-referrer"
              onLoad={() => {
                setLoading(false);
                setFailed(false);
              }}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
            />
          ) : null}
          {loading && activeCamera ? <div className="media-state">加载中</div> : null}
          {failed ? <div className="media-state">加载失败</div> : null}
          {!activeCamera || !imageUrl ? <div className="media-state">无机位</div> : null}
        </div>

        <div className="camera-meta">
          <div>
            <strong>{activeCamera?.label ?? 'HVO 摄像头'}</strong>
            <span>{activeCamera?.role ?? 'HVO'} / {activeCamera?.code ?? '--'}</span>
          </div>
          {activeCamera?.pageUrl || webcamSet?.sourcePage ? (
            <a className="external-link" href={activeCamera?.pageUrl ?? webcamSet.sourcePage} target="_blank" rel="noreferrer">
              HVO <ExternalLink size={13} />
            </a>
          ) : null}
        </div>
      </section>

      <aside className="panel">
        <header className="panel-head">
          <span><Camera size={17} />机位</span>
          <strong className="tag">{cameras.length} 个</strong>
        </header>
        <div className="camera-list">
          {cameras.map((camera) => (
            <button
              className={`camera-thumb ${camera.code === activeCamera?.code ? 'is-active' : ''}`}
              key={camera.code}
              type="button"
              onClick={() => selectCamera(camera.code)}
            >
              <img
                src={cameraUrl(camera, 'live', refreshKey)}
                alt={`${camera.code} 缩略图`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.style.visibility = 'hidden';
                }}
              />
              <span>
                <strong>{camera.code} / {camera.label}</strong>
                <em>{camera.role ?? 'HVO'}</em>
              </span>
            </button>
          ))}
          {!cameras.length ? <p className="empty-copy">无机位</p> : null}
        </div>
      </aside>
    </div>
  );
}

function cameraUrl(camera, mode, refreshKey) {
  const base = mode === 'timelapse' ? camera.timelapseUrl : camera.imageUrl;
  if (!base) return '';
  const joiner = base?.includes('?') ? '&' : '?';
  return `${base}${joiner}v=${refreshKey}`;
}

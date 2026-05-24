import { AlertTriangle, CheckCircle2, CloudRain, ExternalLink, FileText, RadioTower, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { getUniqueSources, inferSourceStatus } from '../../domain/formatters.js';

export function SourcesView({ dashboard }) {
  const sources = useMemo(() => getUniqueSources(dashboard.sources ?? []), [dashboard.sources]);
  const counts = countSources(sources);
  const degraded = Boolean(dashboard.diagnostics?.degraded || counts.failed || counts.stale);
  const officialLinks = dashboard.travelContext?.officialLinks ?? {};
  const sourceCards = buildSourceCards(sources, officialLinks);
  const availableOfficialLinks = sourceCards.filter((item) => item.value).length;
  const summaryCards = [
    {
      icon: ExternalLink,
      label: '入口',
      value: `${availableOfficialLinks}个`,
      sub: 'USGS/HVO',
      tone: 'notice',
    },
    {
      icon: degraded ? AlertTriangle : CheckCircle2,
      label: '状态',
      value: degraded ? '需复核' : '正常',
      sub: degraded ? '复核' : 'OK',
      tone: degraded ? 'watch' : 'good',
    },
    {
      icon: FileText,
      label: '边界',
      value: '官方优先',
      sub: 'HVO · NPS · NWS',
      tone: 'notice',
    },
  ];

  return (
    <div className="sources-view sources-view--compact">
      <section className="source-summary source-summary--compact">
        {summaryCards.map((card) => (
          <Metric {...card} key={card.label} />
        ))}
      </section>

      <section className="panel official-source-panel">
        <header className="panel-head panel-head--flush">
          <span><ExternalLink size={17} />入口</span>
          <strong className="tag tag-official">官方</strong>
        </header>
        <div className="official-source-grid">
          {sourceCards.map((item) => (
            <OfficialSourceCard item={item} key={item.label} />
          ))}
        </div>
      </section>

      <section className="panel source-boundary">
        <span><RadioTower size={15} />USGS/HVO</span>
        <span><CloudRain size={15} />NOAA/NWS</span>
        <span><AlertTriangle size={15} />NPS</span>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, tone }) {
  return (
    <article className={`summary-card panel tone-${tone}`}>
      <span><Icon size={16} />{label}</span>
      <strong>{value}</strong>
      <em>{sub}</em>
    </article>
  );
}

function buildSourceCards(sources, officialLinks) {
  const byId = (id) => sources.find((source) => source.id === id || String(source.id).startsWith(id));
  return [
    { icon: RadioTower, label: 'USGS/HVO', value: officialLinks.volcano ?? byId('usgs-vsc')?.url, tone: 'good' },
    { icon: FileText, label: 'HANS通报', value: officialLinks.hans, tone: 'good' },
    { icon: RadioTower, label: 'HVO摄像头', value: officialLinks.hvoWebcams, tone: 'good' },
    { icon: ShieldCheck, label: 'USGS地震', value: byId('usgs-earthquakes')?.url, tone: 'notice' },
    { icon: CloudRain, label: 'NOAA/NWS', value: byId('noaa-nws')?.url, tone: 'notice' },
    { icon: AlertTriangle, label: 'NPS状态', value: officialLinks.npsAlerts, tone: 'watch' },
  ];
}

function OfficialSourceCard({ item }) {
  const Icon = item.icon;
  return (
    <a className={`official-source-card tone-${item.tone} ${item.value ? '' : 'is-missing'}`} href={item.value || undefined} target="_blank" rel="noreferrer" aria-disabled={!item.value}>
      <Icon size={18} />
      <strong>{item.label}</strong>
      <span>{item.value ? '打开' : '--'}</span>
      {item.value ? <ExternalLink size={13} /> : null}
    </a>
  );
}

function countSources(sources) {
  return sources.reduce((acc, source) => {
    const status = inferSourceStatus(source);
    if (status === 'failed') acc.failed += 1;
    if (status === 'stale') acc.stale += 1;
    return acc;
  }, { failed: 0, stale: 0 });
}

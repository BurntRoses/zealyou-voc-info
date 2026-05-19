import { AlertTriangle, CheckCircle2, CloudRain, ExternalLink, FileText, RadioTower, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DetailModal } from '../../components/DetailModal.jsx';
import { getUniqueSources, inferSourceStatus } from '../../domain/formatters.js';

export function SourcesView({ dashboard }) {
  const [activeDetail, setActiveDetail] = useState(null);
  const sources = useMemo(() => getUniqueSources(dashboard.sources ?? []), [dashboard.sources]);
  const counts = countSources(sources);
  const degraded = Boolean(dashboard.diagnostics?.degraded || counts.failed || counts.stale);
  const officialLinks = dashboard.travelContext?.officialLinks ?? {};
  const sourceCards = buildSourceCards(sources, officialLinks);
  const availableOfficialLinks = sourceCards.filter((item) => item.value).length;
  const summaryCards = [
    {
      icon: ExternalLink,
      label: '官方入口',
      value: `${availableOfficialLinks}个`,
      sub: '打开原文核验',
      tone: 'notice',
      title: '官方核验入口',
      description: '集中打开官方公告、摄像头、地震与天气入口。',
      detail: '页面只保留面向用户的核验入口，内部加载细节不在页面展示。',
      facts: [
        { label: '入口', value: `${availableOfficialLinks}个`, tone: 'notice' },
        { label: '用途', value: '原文核验', tone: 'good' },
        { label: '原则', value: '官方优先', tone: 'good' },
      ],
    },
    {
      icon: degraded ? AlertTriangle : CheckCircle2,
      label: '更新状态',
      value: degraded ? '需复核' : '正常',
      sub: degraded ? '部分信息稍后重试' : '可继续查看',
      tone: degraded ? 'watch' : 'good',
      title: '更新状态',
      description: '用简化状态提示是否需要人工复核。',
      detail: degraded ? '部分公开信息暂时不可用，页面会继续展示最近可用内容。' : '当前核心公开信息可用；重要决策仍请打开官方原文确认。',
      facts: [
        { label: '状态', value: degraded ? '需复核' : '正常', tone: degraded ? 'watch' : 'good' },
        { label: '处理', value: degraded ? '稍后重试' : '继续查看', tone: degraded ? 'watch' : 'good' },
        { label: '提醒', value: '以原文为准', tone: 'notice' },
      ],
    },
    {
      icon: FileText,
      label: '核验建议',
      value: '以官方为准',
      sub: '旅行 / 航空 / 通行',
      tone: 'notice',
      title: '核验建议',
      description: '重要行程、安全和航空判断不要只看聚合页面。',
      detail: '出发前请打开 USGS/HVO、NOAA/NWS、NPS 及当地部门公告做最终确认。',
      facts: [
        { label: '火山', value: 'USGS/HVO', tone: 'good' },
        { label: '天气', value: 'NOAA/NWS', tone: 'notice' },
        { label: '通行', value: 'NPS / 当地部门', tone: 'watch' },
      ],
    },
  ];

  return (
    <div className="sources-view sources-view--compact">
      <section className="source-summary source-summary--compact">
        {summaryCards.map((card) => (
          <Metric {...card} key={card.label} onOpen={() => setActiveDetail(card)} />
        ))}
      </section>

      <section className="panel official-source-panel">
        <header className="panel-head panel-head--flush">
          <span><ExternalLink size={17} />官方入口</span>
          <strong className="tag tag-official">可核验</strong>
        </header>
        <div className="official-source-grid">
          {sourceCards.map((item) => (
            <OfficialSourceCard item={item} key={item.label} />
          ))}
        </div>
      </section>

      <section className="panel disclaimer disclaimer--compact">
        <strong>免责声明</strong>
        <p>{buildDisclaimer()}</p>
      </section>
      <DetailModal detail={activeDetail} onClose={() => setActiveDetail(null)} />
    </div>
  );
}

function buildDisclaimer() {
  return '本页汇总公开信息，仅供行前核验；安全、通行与航空判断以 USGS/HVO、NOAA/NWS、NPS 及当地部门公告为准。';
}

function Metric({ icon: Icon, label, value, sub, tone, onOpen }) {
  return (
    <button
      className={`summary-card panel tone-${tone} is-expandable`}
      type="button"
      aria-label={`打开${label}详情`}
      onClick={onOpen}
    >
      <span><Icon size={16} />{label}</span>
      <strong>{value}</strong>
      <em>{sub}</em>
    </button>
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
      <span>{item.value ? '打开官方来源' : '本次未返回链接'}</span>
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

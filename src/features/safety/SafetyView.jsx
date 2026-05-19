import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck, Wind } from 'lucide-react';
import { WeatherStrip } from '../../components/WeatherStrip.jsx';
import { formatDateTime, localeForLanguage, primaryVolcanoName } from '../../domain/formatters.js';
import { t } from '../../domain/i18n.js';

const officialLinks = [
  [{ zh: 'USGS/HVO 通报', en: 'USGS/HVO updates' }, 'https://www.usgs.gov/volcanoes/kilauea/volcano-updates'],
  [{ zh: '国家公园封闭', en: 'National Park alerts' }, 'https://www.nps.gov/havo/planyourvisit/conditions.htm'],
  [{ zh: '县民防', en: 'County Civil Defense' }, 'https://www.hawaiicounty.gov/departments/civil-defense'],
  [{ zh: 'NOAA/NWS 天气', en: 'NOAA/NWS weather' }, 'https://www.weather.gov/hfo/'],
];

const copy = {
  zh: {
    title: '行动',
    updated: '官方更新',
    weather: '天气',
    noWeather: '无提醒',
    alerts: '条提醒',
    actions: '行动项',
    links: '官方入口',
    weatherToggle: 'NOAA/NWS',
    safe: '安全状态',
  },
  en: {
    title: 'Safety',
    updated: 'Official update',
    weather: 'Weather',
    noWeather: 'No alerts',
    alerts: 'alerts',
    actions: 'What to do now',
    links: 'Official links',
    weatherToggle: 'NOAA/NWS',
    safe: 'Safety status',
  },
};

export function SafetyView({ dashboard, timeZone, includeNoaa, onIncludeNoaaChange, language = 'zh' }) {
  const messages = language === 'en' ? copy.en : copy.zh;
  const weatherAlerts = dashboard.weatherAlerts ?? [];
  const locale = localeForLanguage(language);
  const actions = buildActionItems(dashboard.travelSafety, language);

  return (
    <div className="safety-page release-safety">
      <section className="release-page-head" aria-labelledby="page-title">
        <span>{messages.title}</span>
        <h1 id="page-title">{primaryVolcanoName(dashboard.volcano?.name, language)} {messages.safe}</h1>
      </section>

      <section className="release-safety-board">
        <article className="release-safety-status">
          <ShieldCheck size={22} aria-hidden="true" />
          <span>{messages.updated}</span>
          <strong>{formatDateTime(dashboard.officialStatus?.updatedAt, timeZone, locale)}</strong>
          <em>{dashboard.officialStatus?.agency ?? 'USGS/HVO'}</em>
        </article>
        <article className={`release-safety-status ${weatherAlerts.length ? 'is-watch' : ''}`}>
          <AlertTriangle size={22} aria-hidden="true" />
          <span>{messages.weather}</span>
          <strong>{weatherAlerts.length ? `${weatherAlerts.length} ${messages.alerts}` : messages.noWeather}</strong>
          <em>NOAA/NWS</em>
        </article>
        <button
          className={`release-safety-toggle ${includeNoaa ? 'is-active' : ''}`}
          type="button"
          aria-pressed={includeNoaa}
          onClick={() => onIncludeNoaaChange(!includeNoaa)}
        >
          <Wind size={20} aria-hidden="true" />
          <strong>{messages.weatherToggle}</strong>
          <span>{includeNoaa ? t(language, 'weatherOn') : t(language, 'weatherOff')}</span>
        </button>
      </section>

      <section className="release-safety-grid">
        <article className="release-action-panel">
          <header>
            <h2>{messages.actions}</h2>
          </header>
          <div className="release-action-list">
            {actions.map((item) => (
              <div key={item}>
                <CheckCircle2 size={18} aria-hidden="true" />
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="release-weather-card">
          <WeatherStrip weather={dashboard.weather} alerts={weatherAlerts} timeZone={timeZone} language={language} />
        </article>

        <article className="release-links-panel">
          <header>
            <h2>{messages.links}</h2>
          </header>
          <div className="release-official-links">
            {officialLinks.map(([label, href]) => (
              <a href={href} target="_blank" rel="noreferrer" key={href}>
                <strong>{label[language] ?? label.zh}</strong>
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function buildActionItems(items = [], language = 'zh') {
  const mapped = items.map((item) => translateSafetyItem(item, language)).filter(Boolean);
  return Array.from(new Set(mapped)).slice(0, 5);
}

function translateSafetyItem(item, language = 'zh') {
  if (language === 'en') return String(item ?? '').trim();
  const text = String(item ?? '');
  if (/(alert level|警戒|警报)/i.test(text)) return 'HVO 警戒级别';
  if (/(does not show an elevated|未升高|未升级)/i.test(text)) return '官方未升高';
  if (/(closed area|park closed|roads|trail|关闭|封闭)/i.test(text)) return '封闭道路 / 步道 / 喷发区';
  if (/(gas|vog|SO2|气体|vog|空气质量)/i.test(text)) return 'vog / 空气质量 / 下风向';
  if (/(tephra|ash|Pele|落灰|纤维)/i.test(text)) return '落灰 / Pele’s hair';
  if (/(weather alert|天气提醒|风|道路)/i.test(text)) return '风 / 能见度 / 道路';
  if (/(Verify USGS|USGS|NPS|NWS|县民防)/i.test(text)) return 'USGS / NPS / NWS / 县民防';
  return text.trim();
}

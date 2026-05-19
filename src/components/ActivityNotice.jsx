import { AlertTriangle, ExternalLink } from 'lucide-react';
import { t } from '../domain/i18n.js';

export function ActivityNotice({
  reminder,
  language = 'zh',
  dismissed = false,
  onDismiss,
  onOpenSources,
}) {
  if (!reminder?.active || dismissed) return null;

  return (
    <aside className={`activity-banner tone-${reminder.severity}`} role="status">
      <div className="activity-banner-icon">
        <AlertTriangle size={18} aria-hidden="true" />
      </div>
      <div>
        <strong>{t(language, 'activityBannerTitle')}</strong>
      </div>
      <button
        className="activity-banner-action"
        type="button"
        aria-label={t(language, 'openSources')}
        title={t(language, 'openSources')}
        onClick={() => {
          onDismiss?.();
          onOpenSources?.();
        }}
      >
        <ExternalLink size={14} aria-hidden="true" />
      </button>
    </aside>
  );
}

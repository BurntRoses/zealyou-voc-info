import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';

export function DetailModal({ detail, onClose }) {
  useEffect(() => {
    if (!detail) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [detail, onClose]);

  if (!detail || typeof document === 'undefined') return null;

  const Icon = detail.icon;

  return createPortal(
    <div className={`detail-modal-shell detail-tone-${detail.tone ?? 'notice'}`} onMouseDown={onClose}>
      <section
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="detail-modal__close" type="button" aria-label="关闭详情" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="detail-modal__hero">
          <span className="detail-modal__icon">
            {Icon ? <Icon size={28} aria-hidden="true" /> : null}
          </span>
          <div className="detail-modal__title">
            <span>{detail.kicker ?? '关键读数'}</span>
            <h2 id="detail-modal-title">{detail.title ?? detail.label}</h2>
            <p>{detail.description ?? detail.detail}</p>
          </div>
          <div className="detail-modal__readout">
            <strong>{detail.value ?? '--'}</strong>
            <em>{detail.meta ?? detail.label}</em>
          </div>
        </div>

        {detail.facts?.length ? (
          <div className="detail-modal__facts">
            {detail.facts.map((fact) => (
              <article className={`detail-fact tone-${fact.tone ?? detail.tone ?? 'notice'}`} key={`${fact.label}-${fact.value}`}>
                <span>{fact.label}</span>
                <strong>{fact.value ?? '--'}</strong>
                {fact.caption ? <em>{fact.caption}</em> : null}
              </article>
            ))}
          </div>
        ) : null}

        <div className="detail-modal__statement">
          <span className="detail-modal__rule" aria-hidden="true" />
          <div>
            <strong>{detail.statementTitle ?? '判读'}</strong>
            <p>{detail.detail}</p>
          </div>
        </div>

        {detail.sourceUrl ? (
          <a className="detail-modal__source" href={detail.sourceUrl} target="_blank" rel="noreferrer">
            官方来源 <ExternalLink size={14} />
          </a>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}

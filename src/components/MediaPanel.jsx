import { ArrowUpRight } from 'lucide-react';
import { AppVisual } from './AppVisual.jsx';

export function MediaPanel({
  title,
  subtitle,
  image,
  imageAlt = '',
  visual,
  action,
  children,
  className = '',
}) {
  return (
    <section className={`media-panel ${visual || image ? 'has-visual' : ''} ${className}`.trim()}>
      {image || visual ? (
        <figure className="media-panel-image">
          {image ? (
            <img src={image} alt={imageAlt} loading="lazy" decoding="async" />
          ) : (
            <AppVisual name={visual} label={imageAlt} />
          )}
        </figure>
      ) : null}
      <div className="media-panel-body">
        <div className="section-title">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {children}
        {action?.href ? (
          <a className="inline-link" href={action.href} target="_blank" rel="noreferrer">
            {action.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

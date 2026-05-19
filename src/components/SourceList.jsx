import { ArrowUpRight } from 'lucide-react';
import {
  displaySourceLabel,
  getUniqueSources,
  sourceLabelForStatus,
} from '../domain/formatters.js';

export function SourceList({ sources, compact = false, language = 'zh' }) {
  const uniqueSources = getUniqueSources(sources);

  if (uniqueSources.length === 0) {
    return <p className="empty-copy">{language === 'en' ? 'No source links yet.' : '暂无来源链接。'}</p>;
  }

  return (
    <div className={`source-list ${compact ? 'is-compact' : ''}`}>
      {uniqueSources.map((source) => {
        const label = displaySourceLabel(`${source.label ?? ''} ${source.url ?? ''}`, language);
        const statusText = sourceLabelForStatus(source.status, language);
        const content = (
          <>
            <span className="source-copy">
              <strong>{label}</strong>
              <span className={`source-status status-${source.status}`} title={source.error ? String(source.error) : ''}>
                {statusText}
              </span>
            </span>
            {source.url ? <ArrowUpRight size={17} aria-hidden="true" /> : null}
          </>
        );

        return source.url ? (
          <a href={source.url} target="_blank" rel="noreferrer" key={`${label}-${source.url}`}>
            {content}
          </a>
        ) : (
          <div className="source-unlinked" key={`${label}-${source.status}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

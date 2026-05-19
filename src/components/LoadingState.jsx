export function LoadingState({ volcanoName }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div>
        <strong>{volcanoName || '夏威夷火山'}</strong>
        <p>正在整理官方公开信息</p>
      </div>
      <div className="loading-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

const sceneText = {
  volcano: '火山与日出插画',
  camera: '火山摄像头插画',
  map: '夏威夷地图与地震点插画',
  trend: '趋势图与火山插画',
  safety: '旅行安全与道路插画',
  sources: '数据来源插画',
};

const palettes = {
  volcano: ['#eafff8', '#dcefff', '#ff8c66', '#2f8a86', '#ffd166'],
  camera: ['#f3fffb', '#e7f1ff', '#6ec5c0', '#263f46', '#ffb98f'],
  map: ['#f8fffb', '#e9f5ff', '#3da7a0', '#ff8765', '#ffc857'],
  trend: ['#f6fffd', '#ecf4ff', '#65c2a7', '#e56b52', '#496b7a'],
  safety: ['#fbfff4', '#eaf6ff', '#89b66b', '#f29f67', '#2f6f78'],
  sources: ['#f6fffc', '#eef4ff', '#5ea6c9', '#f1b65c', '#356a70'],
};

function SceneDefs({ id, colors }) {
  return (
    <defs>
      <linearGradient id={`${id}-bg`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={colors[0]} />
        <stop offset="100%" stopColor={colors[1]} />
      </linearGradient>
      <linearGradient id={`${id}-warm`} x1="0" x2="1" y1="1" y2="0">
        <stop offset="0%" stopColor={colors[2]} />
        <stop offset="100%" stopColor={colors[4]} />
      </linearGradient>
      <linearGradient id={`${id}-cool`} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor={colors[3]} />
        <stop offset="100%" stopColor={colors[0]} />
      </linearGradient>
    </defs>
  );
}

function BaseScene({ name, children }) {
  const colors = palettes[name] ?? palettes.volcano;
  const id = `visual-${name}`;

  return (
    <svg
      className="app-visual-svg"
      viewBox="0 0 880 520"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <SceneDefs id={id} colors={colors} />
      <rect width="880" height="520" rx="34" fill={`url(#${id}-bg)`} />
      <circle cx="720" cy="108" r="72" fill={`url(#${id}-warm)`} opacity="0.38" />
      <circle cx="168" cy="112" r="54" fill="#ffffff" opacity="0.62" />
      <path d="M0 416 C150 378 260 430 410 392 C560 355 676 382 880 330 L880 520 L0 520 Z" fill="#ffffff" opacity="0.58" />
      <path d="M0 430 C132 398 266 442 412 414 C594 379 704 392 880 352 L880 520 L0 520 Z" fill={`url(#${id}-cool)`} opacity="0.36" />
      {children(id)}
    </svg>
  );
}

function VolcanoScene() {
  return (
    <BaseScene name="volcano">
      {(id) => (
        <>
          <path d="M95 410 L280 212 L400 330 L515 166 L780 410 Z" fill={`url(#${id}-cool)`} />
          <path d="M461 220 L518 168 L582 256 C540 240 502 240 461 220 Z" fill="#ffffff" opacity="0.72" />
          <path d="M455 246 C514 268 564 265 622 238 C608 300 574 340 523 363 C490 334 466 300 455 246 Z" fill={`url(#${id}-warm)`} />
          <path d="M222 384 C296 355 366 358 448 389 C520 416 586 402 662 362" fill="none" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" opacity="0.76" />
        </>
      )}
    </BaseScene>
  );
}

function CameraScene() {
  return (
    <BaseScene name="camera">
      {(id) => (
        <>
          <rect x="226" y="196" width="426" height="206" rx="44" fill="#ffffff" opacity="0.88" />
          <rect x="256" y="226" width="366" height="146" rx="34" fill="#304e57" />
          <circle cx="442" cy="300" r="62" fill={`url(#${id}-warm)`} />
          <circle cx="442" cy="300" r="32" fill="#f7fffc" opacity="0.92" />
          <rect x="305" y="178" width="152" height="52" rx="20" fill="#6ec5c0" />
          <path d="M288 408 L394 360 M592 408 L492 360 M438 374 L438 428" stroke="#304e57" strokeWidth="14" strokeLinecap="round" />
        </>
      )}
    </BaseScene>
  );
}

function MapScene() {
  return (
    <BaseScene name="map">
      {(id) => (
        <>
          <path d="M168 166 L330 124 L508 174 L704 128 L704 386 L520 434 L338 382 L168 422 Z" fill="#ffffff" opacity="0.86" />
          <path d="M330 124 L338 382 M508 174 L520 434" stroke="#c8e6e3" strokeWidth="8" />
          <path d="M454 158 C394 158 346 207 346 266 C346 336 454 420 454 420 C454 420 562 336 562 266 C562 207 514 158 454 158 Z" fill={`url(#${id}-warm)`} />
          <circle cx="454" cy="266" r="36" fill="#ffffff" opacity="0.92" />
          {[252, 608, 648, 292].map((cx, index) => (
            <circle key={cx} cx={cx} cy={index % 2 ? 330 : 248} r={index === 1 ? 17 : 12} fill={index === 1 ? '#ff8765' : '#3da7a0'} opacity="0.9" />
          ))}
        </>
      )}
    </BaseScene>
  );
}

function TrendScene() {
  return (
    <BaseScene name="trend">
      {(id) => (
        <>
          <rect x="152" y="132" width="576" height="278" rx="34" fill="#ffffff" opacity="0.84" />
          {[190, 252, 314, 376].map((y) => (
            <path key={y} d={`M198 ${y} H682`} stroke="#d9ece9" strokeWidth="5" strokeLinecap="round" />
          ))}
          <path d="M212 344 C294 326 304 274 382 280 C466 286 500 204 574 218 C620 226 636 190 676 172" fill="none" stroke={`url(#${id}-warm)`} strokeWidth="18" strokeLinecap="round" />
          <path d="M226 370 L338 282 L420 350 L514 248 L662 370 Z" fill={`url(#${id}-cool)`} opacity="0.42" />
        </>
      )}
    </BaseScene>
  );
}

function SafetyScene() {
  return (
    <BaseScene name="safety">
      {(id) => (
        <>
          <path d="M96 438 C248 334 362 328 480 396 C590 460 682 424 790 338" fill="none" stroke="#ffffff" strokeWidth="74" strokeLinecap="round" />
          <path d="M96 438 C248 334 362 328 480 396 C590 460 682 424 790 338" fill="none" stroke={`url(#${id}-cool)`} strokeWidth="40" strokeLinecap="round" />
          <path d="M438 126 L602 188 L582 322 C566 384 438 420 438 420 C438 420 310 384 294 322 L274 188 Z" fill="#ffffff" opacity="0.9" />
          <path d="M382 278 L420 316 L502 226" fill="none" stroke={`url(#${id}-warm)`} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </BaseScene>
  );
}

function SourcesScene() {
  return (
    <BaseScene name="sources">
      {(id) => (
        <>
          <rect x="174" y="176" width="240" height="190" rx="30" fill="#ffffff" opacity="0.9" />
          <rect x="224" y="132" width="240" height="190" rx="30" fill="#f7fffc" opacity="0.92" />
          <rect x="274" y="92" width="240" height="190" rx="30" fill="#ffffff" opacity="0.96" />
          <path d="M318 146 H466 M318 188 H438 M318 230 H490" stroke="#b9deda" strokeWidth="14" strokeLinecap="round" />
          <circle cx="622" cy="182" r="42" fill={`url(#${id}-warm)`} />
          <circle cx="674" cy="308" r="54" fill={`url(#${id}-cool)`} />
        </>
      )}
    </BaseScene>
  );
}

const scenes = {
  volcano: VolcanoScene,
  camera: CameraScene,
  map: MapScene,
  trend: TrendScene,
  safety: SafetyScene,
  sources: SourcesScene,
};

export function AppVisual({ name = 'volcano', className = '', label = '' }) {
  const Scene = scenes[name] ?? scenes.volcano;
  const accessibleLabel = label || sceneText[name] || sceneText.volcano;

  return (
    <figure
      className={`app-visual app-visual-${name} ${className}`.trim()}
      role="img"
      aria-label={accessibleLabel}
    >
      <Scene />
    </figure>
  );
}

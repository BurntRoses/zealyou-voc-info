export const views = [
  { id: 'today', label: '首页', shortLabel: '首页', description: '状态 / EP / 地震' },
  { id: 'viewing', label: '观赏', shortLabel: '观赏', description: '火山口 / 观景点' },
  { id: 'trends', label: '研判', shortLabel: '研判', description: 'EP 历史 / 窗口' },
  { id: 'map', label: '地图', shortLabel: '地图', description: '真实底图 / 地震' },
  { id: 'cameras', label: '摄像头', shortLabel: '摄像头', description: 'HVO 官方画面' },
  { id: 'sources', label: '说明', shortLabel: '说明', description: '来源 / 策略' },
];

export const viewIds = new Set(views.map((view) => view.id));

export const defaultUrlState = {
  activeView: 'today',
  selectedVolcanoId: 'hawaii-island',
  mapLayer: 'topo',
  showQuakes: true,
  radiusKm: 100,
  includeNoaa: true,
};

export const mapLayers = {
  topo: {
    id: 'topo',
    label: '地形',
    tileUrl: '/map-tiles/topo.svg',
    externalTileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    fallbackTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Esri World Topographic Map',
  },
  satellite: {
    id: 'satellite',
    label: '卫星',
    tileUrl: '/map-tiles/satellite.svg',
    externalTileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    fallbackTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'Esri World Imagery',
  },
  minimal: {
    id: 'minimal',
    label: '浅色',
    tileUrl: '/map-tiles/minimal.svg',
    externalTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap contributors',
  },
};

export const mapLayerIds = new Set(Object.keys(mapLayers));

export const cameraModes = [
  { id: 'live', label: '最新画面' },
  { id: 'timelapse', label: '24 小时' },
];

export const craterActivityImages = [
  {
    id: 'tilt-2day',
    label: '2 天倾斜',
    title: 'UWD 峰顶倾斜仪 2 天图',
    url: 'https://volcanoes.usgs.gov/vsc/captures/kilauea/UWD-TILT-2day.png',
    sourceUrl: 'https://www.usgs.gov/volcanoes/kilauea/science/monitoring-data-kilauea',
    description: '用于快速查看 Halemaumau 附近近期膨胀或下沉变化。',
  },
  {
    id: 'tilt-week',
    label: '1 周倾斜',
    title: 'UWD 峰顶倾斜仪 1 周图',
    url: 'https://volcanoes.usgs.gov/vsc/captures/kilauea/UWD-TILT-week.png',
    sourceUrl: 'https://www.usgs.gov/volcanoes/kilauea/science/monitoring-data-kilauea',
    description: '用于观察窗口期前后的持续膨胀、放缓或回落。',
  },
  {
    id: 'tilt-month',
    label: '1 月倾斜',
    title: 'UWD 峰顶倾斜仪 1 月图',
    url: 'https://volcanoes.usgs.gov/vsc/captures/kilauea/UWD-TILT-month.png',
    sourceUrl: 'https://www.usgs.gov/volcanoes/kilauea/science/monitoring-data-kilauea',
    description: '用于把短期窗口放回一个月趋势中比较。',
  },
  {
    id: 'tilt-3month',
    label: '3 月倾斜',
    title: 'UWD 峰顶倾斜仪 3 月图',
    url: 'https://volcanoes.usgs.gov/vsc/captures/kilauea/UWD-TILT-3month.png',
    sourceUrl: 'https://www.usgs.gov/volcanoes/kilauea/science/monitoring-data-kilauea',
    description: '用于观察多轮喷泉事件的膨胀到下沉节奏。',
  },
];

export const viewingLocations = [
  {
    id: 'uekahuna',
    name: 'Uekahuna 观景区',
    rankLabel: '夜间首选',
    score: 95,
    tone: 'good',
    coordinates: { lat: 19.4247, lon: -155.2939 },
    distanceKm: 0.8,
    bestFor: '观测 Halemaumau 火山口辉光、喷泉方向和云底反光。',
    access: '停车后短步行；风大、雨雾和封闭状态需出发前核验。',
    timing: '日落后到清晨更容易看见辉光；白天适合看喷发柱与天气。',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['火山口西缘', '夜间优先', '撤离清晰'],
    cautions: ['不要越过封闭线', '带头灯和保暖防雨层', '强风会迅速改变 vog 方向'],
  },
  {
    id: 'kilauea-overlook',
    name: 'Kilauea Overlook',
    rankLabel: '车行友好',
    score: 90,
    tone: 'good',
    coordinates: { lat: 19.4219, lon: -155.2875 },
    distanceKm: 0.9,
    bestFor: '从北缘观察 Kaluapele / Halemaumau 方向，适合快速停车核验。',
    access: '道路和停车位受公园管理；拥挤时按 NPS 指引改用其他点位。',
    timing: '日落前后可同时判断云量、风向和火山口可见性。',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['北缘视角', '短停', '家庭友好'],
    cautions: ['停车满位时不要路边违停', '夜间保持在步道内', '雨雾会遮挡火山口'],
  },
  {
    id: 'wahinekapu',
    name: 'Wahinekapu / Steam Vents',
    rankLabel: '备用视角',
    score: 82,
    tone: 'notice',
    coordinates: { lat: 19.4214, lon: -155.2774 },
    distanceKm: 1.7,
    bestFor: '在北缘寻找更开阔的风向和云量判断点。',
    access: '靠近 Crater Rim Drive；以 NPS 当日封闭和停车指示为准。',
    timing: '白天适合判断能见度，夜间可作为 Uekahuna 拥挤时的备选。',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['北缘备用', '看风向', '短步行'],
    cautions: ['蒸汽区地表脆弱', '不要离开标记步道', '留意雨雾和低云'],
  },
  {
    id: 'kupinai-pali',
    name: 'Kūpinaʻi Pali / Waldron Ledge',
    rankLabel: '步行观景',
    score: 78,
    tone: 'notice',
    coordinates: { lat: 19.4179, lon: -155.2738 },
    distanceKm: 2.0,
    bestFor: '沿步道获得更安静的火山口边缘视角。',
    access: '需要步行；夜间必须确认路线、照明和返程时间。',
    timing: '黄昏前抵达更稳妥，夜间只建议有充足准备时前往。',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['步行', '低拥挤', '黄昏'],
    cautions: ['夜间不要独行', '边缘区域风强', '带足水和头灯'],
  },
  {
    id: 'keanakakoi',
    name: 'Keanakakoi Overlook',
    rankLabel: '长线备选',
    score: 72,
    tone: 'watch',
    coordinates: { lat: 19.4075, lon: -155.2617 },
    distanceKm: 3.8,
    bestFor: '当 NPS 开放且天气允许时，从东南侧观察火山口与喷发云。',
    access: '通常需要更长步行或骑行；是否开放和距离以 NPS 当日信息为准。',
    timing: '只建议白天或有明确返程计划的傍晚使用。',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['长步行', '东南侧', '需核验开放'],
    cautions: ['封闭变化频繁', '夜间返程风险更高', '不要依赖单一地图路线'],
  },
];

function camera(code, label, role) {
  return {
    id: code.toLowerCase(),
    code,
    label,
    role,
    imageUrl: `https://volcanoes.usgs.gov/cams/${code}/images/M.jpg`,
    timelapseUrl: `https://volcanoes.usgs.gov/observatories/hvo/cams/${code}/images/${code}.gif`,
    pageUrl: `https://volcanoes.usgs.gov/observatories/hvo/cams/panorama.php?cam=${code}`,
  };
}

export const officialWebcams = {
  kilauea: {
    defaultCamera: 'V1cam',
    sourcePage: 'https://www.usgs.gov/volcanoes/kilauea/webcams',
    cameras: [
      camera('V1cam', 'Halemaumau 西侧火山口', '峰顶主视角'),
      camera('V2cam', 'Halemaumau 中部火山口', '峰顶东侧'),
      camera('V3cam', 'Halemaumau 南侧火山口', '峰顶南侧'),
      camera('F1cam', 'Halemaumau 热成像', '热异常与夜间辉光'),
      camera('KWcam', 'Kilauea 峰顶西缘', '峰顶全景'),
      camera('B1cam', 'Kilauea 破裂块与火山口', '峰顶形变区域'),
      camera('K2cam', 'Kaluapele / Kilauea caldera', 'Uekahuna 视角'),
      camera('KPcam', 'Kilauea 峰顶与 Mauna Loa Strip Road', '峰顶道路方向'),
      camera('S1cam', '西南裂谷带', '裂谷带视角'),
      camera('MITDcam', '中东裂谷带', '裂谷带视角'),
      camera('KOcam', '上东裂谷带', 'Maunaulu 方向'),
      camera('PEcam', 'Puu Oo 东坡', '东裂谷带视角'),
      camera('PWcam', 'Puu Oo 西坡', '东裂谷带视角'),
      camera('R3cam', '移动机位 3', '临时监测机位'),
      camera('MUcam', 'Maunaulu 全景', '东裂谷带全景'),
      camera('HPcam', 'Holei Pali', '下东裂谷带视角'),
      camera('PGcam', 'Leilani Estates 裂隙区', '历史裂隙区'),
    ],
  },
  'mauna-loa': {
    defaultCamera: 'MLcam',
    sourcePage: 'https://www.usgs.gov/volcanoes/mauna-loa/webcams',
    cameras: [
      camera('MLcam', 'Moku aweoweo 火山口', '峰顶主视角'),
      camera('MTcam', 'Mauna Loa 峰顶', '峰顶视角'),
      camera('MOcam', '南峰顶', '峰顶南侧'),
      camera('SPcam', '西南裂谷带', '裂谷带视角'),
      camera('MSTcam', '峰顶热成像', '热异常'),
      camera('HLcam', '北坡', '山坡视角'),
      camera('MKcam', '山坡', '山坡视角'),
      camera('M1cam', '峰顶与东北裂谷热成像', '热异常'),
      camera('MSPcam', '西南热成像', '热异常'),
    ],
  },
};

export const views = [
  { id: 'today', label: '状态', shortLabel: '状态', description: 'EP · HVO' },
  { id: 'viewing', label: '观赏', shortLabel: '观赏', description: 'UWD · NPS' },
  { id: 'trends', label: '研判', shortLabel: '研判', description: '历史 · EP' },
  { id: 'map', label: '地图', shortLabel: '地图', description: 'USGS · 半径' },
  { id: 'cameras', label: '影像', shortLabel: '影像', description: 'HVO' },
  { id: 'sources', label: '来源', shortLabel: '来源', description: 'USGS · NWS' },
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
    label: '简图',
    tileUrl: '/map-tiles/minimal.svg',
    externalTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap contributors',
  },
};

export const mapLayerIds = new Set(Object.keys(mapLayers));

export const cameraModes = [
  { id: 'live', label: '实时' },
  { id: 'timelapse', label: '24h' },
];

export const craterActivityImages = [
  {
    id: 'tilt-2day',
    label: '2日',
    title: 'UWD 2日倾斜',
    url: 'https://volcanoes.usgs.gov/vsc/captures/kilauea/UWD-TILT-2day.png',
    sourceUrl: 'https://www.usgs.gov/volcanoes/kilauea/science/monitoring-data-kilauea',
    description: 'Tilt / 2d',
  },
  {
    id: 'tilt-week',
    label: '1周',
    title: 'UWD 1周倾斜',
    url: 'https://volcanoes.usgs.gov/vsc/captures/kilauea/UWD-TILT-week.png',
    sourceUrl: 'https://www.usgs.gov/volcanoes/kilauea/science/monitoring-data-kilauea',
    description: 'Tilt / 1w',
  },
  {
    id: 'tilt-month',
    label: '1月',
    title: 'UWD 1月倾斜',
    url: 'https://volcanoes.usgs.gov/vsc/captures/kilauea/UWD-TILT-month.png',
    sourceUrl: 'https://www.usgs.gov/volcanoes/kilauea/science/monitoring-data-kilauea',
    description: 'Tilt / 1m',
  },
  {
    id: 'tilt-3month',
    label: '3月',
    title: 'UWD 3月倾斜',
    url: 'https://volcanoes.usgs.gov/vsc/captures/kilauea/UWD-TILT-3month.png',
    sourceUrl: 'https://www.usgs.gov/volcanoes/kilauea/science/monitoring-data-kilauea',
    description: 'Tilt / 3m',
  },
];

export const viewingLocations = [
  {
    id: 'uekahuna',
    name: 'Uekahuna',
    rankLabel: '夜间优先',
    score: 95,
    tone: 'good',
    coordinates: { lat: 19.4247, lon: -155.2939 },
    distanceKm: 0.8,
    bestFor: 'Halemaumau 西缘',
    access: '短步行 / 停车',
    timing: '日落后',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['西缘', '夜间', '停车'],
    cautions: ['勿越界', '头灯', '防雨'],
  },
  {
    id: 'kilauea-overlook',
    name: 'Kilauea Overlook',
    rankLabel: '停车友好',
    score: 90,
    tone: 'good',
    coordinates: { lat: 19.4219, lon: -155.2875 },
    distanceKm: 0.9,
    bestFor: 'Kaluapele 北缘',
    access: '短停 / 步道',
    timing: '黄昏',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['北缘', '短停', '家庭'],
    cautions: ['勿路边停车', '留在步道', '低云遮挡'],
  },
  {
    id: 'wahinekapu',
    name: 'Wahinekapu / Steam Vents',
    rankLabel: '备用视角',
    score: 82,
    tone: 'notice',
    coordinates: { lat: 19.4214, lon: -155.2774 },
    distanceKm: 1.7,
    bestFor: '北缘风向',
    access: 'Crater Rim Drive',
    timing: '白天 / 黄昏',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['北缘', '风向', '短步行'],
    cautions: ['蒸汽区', '标记步道', '低光'],
  },
  {
    id: 'kupinai-pali',
    name: 'Kupinai Pali / Waldron Ledge',
    rankLabel: '步行视角',
    score: 78,
    tone: 'notice',
    coordinates: { lat: 19.4179, lon: -155.2738 },
    distanceKm: 2.0,
    bestFor: '安静北缘',
    access: '步行',
    timing: '黄昏前',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['步行', '低拥挤', '黄昏'],
    cautions: ['勿独行', '强风', '带水'],
  },
  {
    id: 'keanakakoi',
    name: 'Keanakakoi Overlook',
    rankLabel: '长线备用',
    score: 72,
    tone: 'watch',
    coordinates: { lat: 19.4075, lon: -155.2617 },
    distanceKm: 3.8,
    bestFor: '东南侧',
    access: '长步行 / 骑行',
    timing: '白天',
    sourceUrl: 'https://www.nps.gov/havo/planyourvisit/lava2.htm',
    tags: ['东南', '长线', 'NPS'],
    cautions: ['封闭变化', '夜返风险', '离线地图'],
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
      camera('V1cam', 'Halemaumau 西侧', '峰顶'),
      camera('V2cam', 'Halemaumau 中部', '峰顶'),
      camera('V3cam', 'Halemaumau 南侧', '峰顶'),
      camera('F1cam', 'Halemaumau 热成像', '热成像'),
      camera('KWcam', 'Kilauea 西缘', '全景'),
      camera('B1cam', 'Kilauea 破裂块', '形变区'),
      camera('K2cam', 'Kaluapele', 'Uekahuna'),
      camera('KPcam', 'Mauna Loa Strip Road', '道路'),
      camera('S1cam', '西南裂谷', '裂谷'),
      camera('MITDcam', '中东裂谷', '裂谷'),
      camera('KOcam', '上东裂谷', 'Maunaulu'),
      camera('PEcam', 'Puu Oo 东坡', '东裂谷'),
      camera('PWcam', 'Puu Oo 西坡', '东裂谷'),
      camera('R3cam', '移动机位 3', '临时'),
      camera('MUcam', 'Maunaulu', '全景'),
      camera('HPcam', 'Holei Pali', '下东裂谷'),
      camera('PGcam', 'Leilani Estates', '历史裂隙'),
    ],
  },
  'mauna-loa': {
    defaultCamera: 'MLcam',
    sourcePage: 'https://www.usgs.gov/volcanoes/mauna-loa/webcams',
    cameras: [
      camera('MLcam', 'Moku aweoweo', '峰顶'),
      camera('MTcam', 'Mauna Loa 峰顶', '峰顶'),
      camera('MOcam', '南峰顶', '峰顶'),
      camera('SPcam', '西南裂谷', '裂谷'),
      camera('MSTcam', '峰顶热成像', '热成像'),
      camera('HLcam', '北坡', '山坡'),
      camera('MKcam', '山坡', '山坡'),
      camera('M1cam', '东北裂谷热成像', '热成像'),
      camera('MSPcam', '西南热成像', '热成像'),
    ],
  },
};

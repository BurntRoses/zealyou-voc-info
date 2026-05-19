export const views = [
  { id: 'today', label: '首页', shortLabel: '首页', description: '状态 / EP / 地震' },
  { id: 'trends', label: '研判', shortLabel: '研判', description: 'EP 历史 / 窗口' },
  { id: 'map', label: '地图', shortLabel: '地图', description: '真实底图 / 地震' },
  { id: 'cameras', label: '摄像头', shortLabel: '摄像头', description: 'HVO 官方画面' },
  { id: 'sources', label: '说明', shortLabel: '说明', description: '来源 / 策略' },
];

export const viewIds = new Set(views.map((view) => view.id));

export const defaultUrlState = {
  activeView: 'today',
  selectedVolcanoId: 'kilauea',
  mapLayer: 'topo',
  showQuakes: true,
  radiusKm: 50,
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
      camera('K2cam', 'Kaluapele / Kilauea caldera', 'Uekahuna 视角'),
      camera('S1cam', '西南裂谷带', '裂谷带视角'),
      camera('MITDcam', '中东裂谷带', '裂谷带视角'),
      camera('KOcam', '上东裂谷带', 'Maunaulu 方向'),
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

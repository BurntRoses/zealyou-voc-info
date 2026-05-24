# zealyou-voc-info

[中文](#中文) | [English](#english)

Live site: https://zealyou-voc-info.pages.dev

## 中文

夏威夷火山状态看板：USGS/HVO 状态、EP 窗口、UWD 倾斜图、HVO 影像、USGS 地震、NOAA/NWS 天气、NPS 入口。

界面原则：短标签、图标优先、自定义时区。

### 本地运行

```bash
npm install
npm run dev
```

- 前端：`http://localhost:5173`
- API：`http://localhost:8787`

### 检查

```bash
npm test
npm run build
```

### 部署

```bash
npm run deploy
```

Cloudflare Pages 项目：`zealyou-voc-info`

自动部署：`.github/workflows/deploy.yml`

- 触发：push 到 `main`
- 构建：`npm ci`、`npm test`、`npm run build`
- 发布：`wrangler pages deploy dist`
- GitHub Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`

### 边界

USGS/HVO、NOAA/NWS、NPS、Hawaii County Civil Defense 优先。

## English

Hawaii volcano status dashboard: USGS/HVO status, EP windows, UWD tilt charts, HVO imagery, USGS earthquakes, NOAA/NWS weather, and NPS links.

UI rules: short labels, icon-first controls, custom time zones.

### Local

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`

### Checks

```bash
npm test
npm run build
```

### Deploy

```bash
npm run deploy
```

Cloudflare Pages project: `zealyou-voc-info`

Automatic deploy: `.github/workflows/deploy.yml`

- Trigger: push to `main`
- Build: `npm ci`, `npm test`, `npm run build`
- Publish: `wrangler pages deploy dist`
- GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

### Boundary

USGS/HVO, NOAA/NWS, NPS, and Hawaii County Civil Defense first.

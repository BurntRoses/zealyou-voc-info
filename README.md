# zealyou-voc-info

夏威夷火山公开信息看板，面向行前核验和状态浏览。

## Local Development

```bash
npm install
npm run dev
```

前端默认使用 Vite，API 由本地 `server/index.js` 或 Cloudflare Pages Functions 提供。

## Build

```bash
npm test
npm run build
```

Cloudflare Pages 项目名统一为 `zealyou-voc-info`，默认线上域名为 `https://zealyou-voc-info.pages.dev`。

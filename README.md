# zealyou-voc-info

[中文](#中文) | [English](#english)

Live site: https://zealyou-voc-info.pages.dev

<details open>
<summary id="中文"><strong>中文说明</strong></summary>

## 项目简介

`zealyou-voc-info` 是一个夏威夷火山公开信息看板，用于快速查看基拉韦厄等火山的官方状态、EP 窗口、摄像头画面、地震、天气和官方核验入口。

本项目仅汇总公开信息，适合行前核验和状态浏览。安全、通行、航空和应急判断必须以 USGS/HVO、NOAA/NWS、NPS 及当地部门的官方公告为准。

## 主要功能

- 首页状态概览：火山警戒、航空颜色、喷发状态、EP 参考窗口。
- 研判视图：近期 EP 窗口与长期喷发历史时间线。
- 地图视图：真实底图、近场地震、筛选半径和图层切换。
- 摄像头视图：HVO 官方摄像头画面与 24 小时动图。
- 说明视图：官方入口、更新状态和核验建议。

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址：

- 前端：`http://localhost:5173`
- API：`http://localhost:8787`

## 检查与构建

```bash
npm test
npm run build
```

## 部署

项目已按 Cloudflare Pages 配置，项目名为 `zealyou-voc-info`。

```bash
npm run deploy
```

默认线上域名：

```text
https://zealyou-voc-info.pages.dev
```

## 数据与免责声明

页面会优先展示官方公开信息，并提供官方入口方便核验。该页面不是官方预报、疏散建议、旅行指令或航空决策依据。

</details>

<details>
<summary id="english"><strong>English Guide</strong></summary>

## Overview

`zealyou-voc-info` is a public-information dashboard for Hawaii volcano monitoring. It helps users review official status, EP windows, webcam imagery, earthquakes, weather, and verification links for Kilauea and related Hawaii volcano context.

This project aggregates public information for situational review. Safety, access, aviation, and emergency decisions must be confirmed through official notices from USGS/HVO, NOAA/NWS, NPS, and local authorities.

## Features

- Status overview: volcano alert level, aviation color code, eruption state, and EP reference window.
- Analysis view: recent EP windows and long-term eruption history timeline.
- Map view: live basemap, nearby earthquakes, radius filters, and layer switching.
- Camera view: HVO webcam images and 24-hour timelapse links.
- Info view: official links, update status, and verification guidance.

## Local Development

```bash
npm install
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`

## Checks And Build

```bash
npm test
npm run build
```

## Deployment

The project is configured for Cloudflare Pages under the project name `zealyou-voc-info`.

```bash
npm run deploy
```

Default production domain:

```text
https://zealyou-voc-info.pages.dev
```

## Data And Disclaimer

The dashboard prioritizes official public information and links back to official sources for verification. It is not an official forecast, evacuation notice, travel directive, or aviation decision source.

</details>

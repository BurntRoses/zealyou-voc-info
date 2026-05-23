import express from "express";
import { fileURLToPath } from "node:url";
import { buildExpertAssessment } from "./expertModel.js";
import { getDashboardData, getVolcanoes } from "./dataSources.js";

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader(
    "Cache-Control",
    req.method === "GET" && req.path !== "/api/health"
      ? "public, max-age=20, stale-while-revalidate=90"
      : "no-store",
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sendEnvelope(res, payload, status = 200) {
  return res.status(status).json({
    ok: status >= 200 && status < 400,
    generatedAt: new Date().toISOString(),
    ...payload,
  });
}

app.get("/api/health", (req, res) => {
  return sendEnvelope(res, {
    endpoint: "/api/health",
    data: { status: "ok" },
    meta: { pid: process.pid },
    sources: [],
    diagnostics: { degraded: false, errors: [] },
    disclaimer: "Health endpoint only.",
  });
});

app.get("/api/volcanoes", async (req, res) => {
  try {
    const query = String(req.query.q ?? "").trim().toLowerCase();
    const region = String(req.query.region ?? "").trim().toLowerCase();
    const limit = clampInteger(req.query.limit, 250, 1, 1000);
    const offset = clampInteger(req.query.offset, 0, 0, 100000);
    const forceRefresh = req.query.refresh !== undefined;

    const result = await getVolcanoes({ forceRefresh });
    let volcanoes = result.volcanoes;

    if (query) {
      volcanoes = volcanoes.filter((volcano) =>
        [
          volcano.name,
          volcano.region,
          volcano.vnum,
          volcano.volcanoCd,
          volcano.slug,
          volcano.alertLevel,
          volcano.colorCode,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      );
    }

    if (region) {
      volcanoes = volcanoes.filter((volcano) =>
        String(volcano.region ?? "").toLowerCase().includes(region),
      );
    }

    const page = volcanoes.slice(offset, offset + limit);
    return sendEnvelope(res, {
      endpoint: "/api/volcanoes",
      data: page,
      meta: {
        total: volcanoes.length,
        returned: page.length,
        offset,
        limit,
        filters: { q: query || null, region: region || null },
        degraded: result.diagnostics.degraded,
      },
      sources: result.sources,
      diagnostics: result.diagnostics,
      disclaimer:
        "List view is a public-data snapshot and is not a forecast. Use the volcano dashboard for the heuristic assessment.",
    });
  } catch (error) {
    return sendEnvelope(
      res,
      {
        endpoint: "/api/volcanoes",
        error: {
          name: error?.name ?? "Error",
          message: error?.message ?? String(error),
        },
        data: [],
        sources: [],
        diagnostics: { degraded: true, errors: [] },
      },
      500,
    );
  }
});

app.get("/api/volcano/:id/dashboard", async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    const days = clampInteger(req.query.days, 7, 1, 30);
    const radiusKm = clampInteger(req.query.radiusKm, 100, 5, 200);
    const includeNoaa = String(req.query.noaa ?? "1") !== "0";
    const forceRefresh = req.query.refresh !== undefined;

    const dashboard = await getDashboardData(id, {
      days,
      radiusKm,
      includeNoaa,
      forceRefresh,
    });

    if (!dashboard.found) {
      return sendEnvelope(
        res,
        {
          endpoint: `/api/volcano/${encodeURIComponent(id)}/dashboard`,
          error: {
            name: "NotFoundError",
            message: `Volcano '${id}' was not found.`,
          },
          data: null,
          sources: dashboard.sources,
          diagnostics: dashboard.diagnostics,
          disclaimer:
            "No official volcano record matched the requested id. Try a VNUM, volcano code, or volcano name.",
        },
        404,
      );
    }

    const assessment = buildExpertAssessment({
      volcano: dashboard.volcano,
      officialNotices: dashboard.officialNotices,
      earthquakes: dashboard.earthquakes,
      history: dashboard.history,
      diagnostics: dashboard.diagnostics,
    });

    return sendEnvelope(res, {
      endpoint: `/api/volcano/${encodeURIComponent(id)}/dashboard`,
      data: {
        volcano: dashboard.volcano,
        officialNotices: dashboard.officialNotices,
        earthquakes: dashboard.earthquakes,
        history: dashboard.history,
        weatherAlerts: dashboard.weatherAlerts,
        weather: dashboard.weather,
        travelContext: dashboard.travelContext,
        assessment,
      },
      meta: {
        days,
        radiusKm,
        includeNoaa,
        forceRefresh,
        degraded: dashboard.diagnostics.degraded,
      },
      sources: dashboard.sources,
      diagnostics: dashboard.diagnostics,
      disclaimer: assessment.disclaimer,
    });
  } catch (error) {
    return sendEnvelope(
      res,
      {
        endpoint: `/api/volcano/${encodeURIComponent(req.params.id)}/dashboard`,
        error: {
          name: error?.name ?? "Error",
          message: error?.message ?? String(error),
        },
        data: null,
        sources: [],
        diagnostics: { degraded: true, errors: [] },
      },
      500,
    );
  }
});

const isDirectRun = process.argv[1]
  ? fileURLToPath(import.meta.url) === process.argv[1]
  : false;

const server = isDirectRun
  ? app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend listening on http://127.0.0.1:${PORT}`);
    })
  : null;

export { app, server };
export default app;

import { clampInteger, errorEnvelope, jsonEnvelope } from "../_shared/http.js";
import { getVolcanoes } from "../../server/dataSources.js";

export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const query = String(url.searchParams.get("q") ?? "").trim().toLowerCase();
    const region = String(url.searchParams.get("region") ?? "").trim().toLowerCase();
    const limit = clampInteger(url.searchParams.get("limit"), 250, 1, 1000);
    const offset = clampInteger(url.searchParams.get("offset"), 0, 0, 100000);
    const forceRefresh = url.searchParams.has("refresh");

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
    return jsonEnvelope({
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
    return errorEnvelope("/api/volcanoes", error, []);
  }
}

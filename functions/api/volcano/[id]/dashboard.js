import { buildExpertAssessment } from "../../../../server/expertModel.js";
import { clampInteger, jsonEnvelope } from "../../../_shared/http.js";
import { getDashboardData } from "../../../../server/dataSources.js";

export async function onRequestGet({ request, params }) {
  const id = String(params.id ?? "").trim();
  const url = new URL(request.url);

  try {
    const days = clampInteger(url.searchParams.get("days"), 7, 1, 30);
    const radiusKm = clampInteger(url.searchParams.get("radiusKm"), 50, 5, 200);
    const includeNoaa = String(url.searchParams.get("noaa") ?? "1") !== "0";

    const dashboard = await getDashboardData(id, {
      days,
      radiusKm,
      includeNoaa,
    });

    if (!dashboard.found) {
      return jsonEnvelope(
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

    return jsonEnvelope({
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
        degraded: dashboard.diagnostics.degraded,
      },
      sources: dashboard.sources,
      diagnostics: dashboard.diagnostics,
      disclaimer: assessment.disclaimer,
    });
  } catch (error) {
    return jsonEnvelope(
      {
        endpoint: `/api/volcano/${encodeURIComponent(id)}/dashboard`,
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
}

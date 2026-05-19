import { jsonEnvelope } from "../_shared/http.js";

export function onRequestGet() {
  return jsonEnvelope(
    {
      endpoint: "/api/health",
      data: { status: "ok", runtime: "cloudflare-pages" },
      meta: {},
      sources: [],
      diagnostics: { degraded: false, errors: [] },
      disclaimer: "Health endpoint only.",
    },
    200,
    { cacheControl: "no-store" },
  );
}

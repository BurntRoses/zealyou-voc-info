export function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function jsonEnvelope(payload, status = 200, options = {}) {
  return Response.json(
    {
      ok: status >= 200 && status < 400,
      generatedAt: new Date().toISOString(),
      ...payload,
    },
    {
      status,
      headers: {
        "Cache-Control": options.cacheControl ?? "public, max-age=60, s-maxage=180, stale-while-revalidate=600",
      },
    },
  );
}

export function errorEnvelope(endpoint, error, data = null, status = 500) {
  return jsonEnvelope(
    {
      endpoint,
      error: {
        name: error?.name ?? "Error",
        message: error?.message ?? String(error),
      },
      data,
      sources: [],
      diagnostics: { degraded: true, errors: [] },
    },
    status,
    { cacheControl: "no-store" },
  );
}

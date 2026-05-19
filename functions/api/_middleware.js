const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const response = await context.next();
  const nextHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    nextHeaders.set(key, value);
  }
  if (!nextHeaders.has("Cache-Control")) {
    nextHeaders.set("Cache-Control", "no-store");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders,
  });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const incoming = new URL(request.url);
    const target = incoming.searchParams.get("url");
    if (!target || !target.startsWith("https://ssd.jpl.nasa.gov/api/horizons.api")) {
      return new Response("Missing or blocked url parameter.", { status: 400, headers: CORS_HEADERS });
    }

    const upstream = await fetch(target, { method: "GET" });
    const headers = new Headers(upstream.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  }
};

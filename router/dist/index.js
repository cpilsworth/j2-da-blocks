// router/src/index.js
var ORIGIN = "https://main--j2retail--cpilsworth.aem.live";
var ORIGIN_HOST = new URL(ORIGIN).host;
var FETCH_OPTIONS = {
  redirect: "manual",
  cf: { cacheTtl: 0, cacheEverything: false, cacheTtlByStatus: { "200-599": 0 } }
};
function toWorkerResponse(upstreamResponse, init = {}) {
  const response = new Response(upstreamResponse.body, {
    status: init.status ?? upstreamResponse.status,
    headers: upstreamResponse.headers
  });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.delete("CF-Cache-Status");
  response.headers.delete("Age");
  response.headers.delete("Expires");
  response.headers.delete("ETag");
  response.headers.delete("Last-Modified");
  return response;
}
async function fetchOrigin404(request) {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("host", ORIGIN_HOST);
  const upstreamRequest = new Request(`${ORIGIN}/404`, {
    method: "GET",
    headers
  });
  const upstreamResponse = await fetch(upstreamRequest, FETCH_OPTIONS);
  return toWorkerResponse(upstreamResponse, { status: 404 });
}
var index_default = {
  async fetch(request) {
    const url = new URL(request.url);
    const isTrade = url.hostname === "trade.diffatech.co.uk";
    const isRetail = url.hostname === "retail.diffatech.co.uk";
    if (!isTrade && !isRetail) {
      return fetchOrigin404(request);
    }
    if (isRetail && /^\/trade(\/|$)/i.test(url.pathname)) {
      return fetchOrigin404(request);
    }
    const upstreamUrl = ORIGIN + url.pathname + url.search;
    const upstreamRequest = new Request(upstreamUrl, request);
    upstreamRequest.headers.set("host", ORIGIN_HOST);
    const upstreamResponse = await fetch(upstreamRequest, FETCH_OPTIONS);
    return toWorkerResponse(upstreamResponse);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

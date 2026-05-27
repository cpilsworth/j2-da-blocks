const ORIGIN = 'https://main--j2retail--cpilsworth.aem.live';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const isTrade = url.hostname === 'trade.diffatech.co.uk';
    const isRetail = url.hostname === 'retail.diffatech.co.uk';

    if (!isTrade && !isRetail) {
      return new Response('Not Found', { status: 404 });
    }

    if (isRetail && /^\/trade(\/|$)/i.test(url.pathname)) {
      return new Response('Not Found', { status: 404 });
    }

    const upstreamUrl = ORIGIN + url.pathname + url.search;
    const upstreamRequest = new Request(upstreamUrl, request);
    upstreamRequest.headers.set('host', new URL(ORIGIN).host);

    const upstreamResponse = await fetch(upstreamRequest, {
      redirect: 'manual',
      cf: { cacheTtl: 0, cacheEverything: false, cacheTtlByStatus: { '200-599': 0 } },
    });

    const response = new Response(upstreamResponse.body, upstreamResponse);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.delete('CF-Cache-Status');
    response.headers.delete('Age');
    response.headers.delete('Expires');
    response.headers.delete('ETag');
    response.headers.delete('Last-Modified');
    return response;
  },
};

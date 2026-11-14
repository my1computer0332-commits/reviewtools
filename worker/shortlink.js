/**
 * Cloudflare Worker: expands Google Maps short links for ReviewLink Studio.
 *
 * Deploy:
 *   npm i -g wrangler
 *   wrangler deploy worker/shortlink.js --name reviewlink-shortlink
 *
 * Then build the app with:
 *   VITE_SHORTLINK_RESOLVER="https://reviewlink-shortlink.<account>.workers.dev/?url={url}"
 *
 * Contract: GET ?url=<encoded short link> -> JSON
 *   { "url": "<final google maps url>", "placeId"?: "ChIJ…", "cid"?: "123…" }
 *
 * Google's redirect cannot be read from the browser (no CORS headers), which is
 * why this small server-side hop is required for automatic expansion.
 */

const SHORT_HOST = /^(maps\.app\.goo\.gl|goo\.gl|g\.co)$/i;
const PLACE_ID = /\b(ChIJ[\w-]{8,})/;
const FTID = /(?:!1s|ftid=|fid=)(0x[0-9a-f]+:0x[0-9a-f]+)/i;
const CID = /[?&](?:cid|ludocid)=(\d{6,})/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept",
  "Cache-Control": "public, max-age=300",
};

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "GET") {
      return reply({ error: "Method not allowed" }, 405);
    }

    const target = new URL(request.url).searchParams.get("url");
    if (!target) return reply({ error: "Missing url parameter" }, 400);

    let shortUrl;
    try {
      shortUrl = new URL(target);
    } catch {
      return reply({ error: "Invalid url parameter" }, 400);
    }
    if (!/^https?:$/.test(shortUrl.protocol) || !SHORT_HOST.test(shortUrl.hostname)) {
      return reply({ error: "Only Google Maps short links are supported" }, 400);
    }

    let response;
    try {
      response = await fetch(shortUrl.toString(), {
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } catch {
      return reply({ error: "Could not reach Google Maps" }, 502);
    }

    const finalUrl = response.url || "";
    const body = response.ok ? await response.text() : "";
    const haystack = `${finalUrl}\n${body}`;

    const placeId = haystack.match(PLACE_ID)?.[1];
    const featureId = haystack.match(FTID)?.[1]?.toLowerCase();
    const cid = haystack.match(CID)?.[1];

    if (!finalUrl) return reply({ error: "No redirect target" }, 502);

    return reply({
      url: finalUrl,
      ...(placeId ? { placeId } : {}),
      ...(featureId ? { featureId } : {}),
      ...(cid ? { cid } : {}),
    });
  },
};

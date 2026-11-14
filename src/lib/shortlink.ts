/**
 * Expansion of shortened Google Maps links (maps.app.goo.gl, goo.gl, g.co).
 *
 * Google's redirect responses do not include CORS headers, so a browser cannot
 * read the final `Location` on its own. We try the direct request first (some
 * environments and extensions rewrite it), then an optional resolver endpoint.
 *
 * To enable automatic expansion in production, set VITE_SHORTLINK_RESOLVER to
 * an endpoint that accepts either:
 *   - a `{url}` placeholder, e.g. https://example.com/expand?url={url}
 *   - the URL-encoded short link appended to the base URL
 * The endpoint may reply with JSON `{ "url": "…" }`, `{ "placeId": "…" }`,
 * `{ "cid": "…" }`, or a plain-text body containing the final URL.
 */

const RESOLVER_TEMPLATE = (import.meta.env.VITE_SHORTLINK_RESOLVER ?? "").trim();

const GLOBAL_HOST = /(^|\.)(google\.[a-z.]+|goo\.gl|g\.co)$/i;
const SHORT_HOST = /^(?:maps\.app\.goo\.gl|goo\.gl|g\.co)$/i;
const URL_IN_TEXT = /https?:\/\/[^\s"'<>]+/i;

export const SHORT_LINK_ERROR =
  "Google's short links cannot be expanded inside the browser. Open the short link once, then paste the full google.com/maps URL from the address bar.";

function usableFinalUrl(candidate: string, shortUrl: string): string | null {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!GLOBAL_HOST.test(url.hostname)) return null;
    if (SHORT_HOST.test(url.hostname)) return null;
    if (url.toString() === shortUrl) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function followRedirect(shortUrl: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(shortUrl, {
      redirect: "follow",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal: signal ?? null,
    });
    // Opaque responses hide the resolved URL, so there is nothing to read.
    if (response.type === "opaque") return null;
    return usableFinalUrl(response.url, shortUrl);
  } catch {
    return null;
  }
}

function resolverEndpoint(shortUrl: string): string | null {
  if (!RESOLVER_TEMPLATE) return null;
  const encoded = encodeURIComponent(shortUrl);
  if (RESOLVER_TEMPLATE.includes("{url}")) {
    return RESOLVER_TEMPLATE.replaceAll("{url}", encoded);
  }
  return `${RESOLVER_TEMPLATE}${encoded}`;
}

function fromPayload(payload: unknown, shortUrl: string): string | null {
  if (typeof payload === "string") {
    const match = payload.match(URL_IN_TEXT)?.[0];
    return match ? usableFinalUrl(match, shortUrl) : null;
  }
  if (typeof payload !== "object" || payload === null) return null;

  const record = payload as Record<string, unknown>;
  for (const key of ["url", "finalUrl", "resolvedUrl", "location", "result"]) {
    const value = record[key];
    if (typeof value === "string") {
      const finalUrl = usableFinalUrl(value, shortUrl);
      if (finalUrl) return finalUrl;
    }
  }

  const placeId = record.placeId ?? record.place_id;
  if (typeof placeId === "string" && /^ChIJ[\w-]{8,}$/.test(placeId)) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  }

  const featureId = record.featureId ?? record.ftid;
  if (typeof featureId === "string" && /^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(featureId)) {
    return `https://www.google.com/maps?ftid=${encodeURIComponent(featureId.toLowerCase())}`;
  }

  const cid = record.cid ?? record.ludocid;
  if (typeof cid === "string" && /^\d{6,}$/.test(cid)) {
    return `https://www.google.com/maps?cid=${encodeURIComponent(cid)}`;
  }

  return null;
}

/**
 * Resolve a short Google Maps link to a full URL (or a synthetic Maps URL that
 * carries a Place ID / CID). Throws SHORT_LINK_ERROR when expansion fails.
 */
export async function expandGoogleShortLink(shortUrl: string, signal?: AbortSignal): Promise<string> {
  const trimmed = shortUrl.trim();
  if (!trimmed) throw new Error(SHORT_LINK_ERROR);

  const direct = await followRedirect(trimmed, signal);
  if (direct) return direct;

  const endpoint = resolverEndpoint(trimmed);
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        signal: signal ?? null,
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: "application/json, text/plain;q=0.9" },
      });
      if (response.ok) {
        const text = await response.text();
        let payload: unknown = text;
        try {
          payload = JSON.parse(text) as unknown;
        } catch {
          // Plain-text responses are handled by fromPayload.
        }
        const finalUrl = fromPayload(payload, trimmed);
        if (finalUrl) return finalUrl;
      }
    } catch (cause) {
      if (signal?.aborted) throw cause;
    }
  }

  throw new Error(SHORT_LINK_ERROR);
}

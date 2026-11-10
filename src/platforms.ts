export type PlatformId = "google" | "facebook" | "yelp" | "tripadvisor" | "trustpilot";

export interface PlatformDefinition {
  id: PlatformId;
  name: string;
  badge: string;
  accent: string;
  /** Short description of what the generated link opens. */
  linkKind: string;
  inputLabel: string;
  placeholder: string;
  help: string;
  example: string;
  /** Only Google supports resolving a business name without a listing URL. */
  supportsPlaceSearch: boolean;
}

export const PLATFORMS: readonly PlatformDefinition[] = [
  {
    id: "google",
    name: "Google",
    badge: "G",
    accent: "#4285f4",
    linkKind: "Direct review link",
    inputLabel: "Google Maps link, Place ID, or CID",
    placeholder: "https://www.google.com/maps/place/… or ChIJ…",
    help: "Paste the full link from your business's Google Maps page (open short maps.app.goo.gl links first), a Place ID (starts with ChIJ), or a CID. Full Maps links and CIDs are converted into a one-tap review link.",
    example:
      "https://www.google.com/maps/place/San+Francisco+International+Airport/@37.6213,-122.3790,17z/data=!4m3!3m2!1s0x808f778c55555555:0xa4f25c571acded3f",
    supportsPlaceSearch: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    badge: "f",
    accent: "#1877f2",
    linkKind: "Reviews tab link",
    inputLabel: "Facebook page link or handle",
    placeholder: "https://www.facebook.com/your-page",
    help: "Use the page's public URL or its @handle. The link opens the page's Reviews tab.",
    example: "https://www.facebook.com/meta",
    supportsPlaceSearch: false,
  },
  {
    id: "yelp",
    name: "Yelp",
    badge: "Y",
    accent: "#ff1a1a",
    linkKind: "Reviews section link",
    inputLabel: "Yelp business page link",
    placeholder: "https://www.yelp.com/biz/your-business",
    help: "Open your Yelp business page and copy the address bar. The link opens its reviews section.",
    example: "https://www.yelp.com/biz/ferry-building-san-francisco",
    supportsPlaceSearch: false,
  },
  {
    id: "tripadvisor",
    name: "Tripadvisor",
    badge: "TA",
    accent: "#00aa6c",
    linkKind: "Reviews section link",
    inputLabel: "Tripadvisor listing link",
    placeholder: "https://www.tripadvisor.com/Restaurant_Review-…",
    help: "Use the restaurant, hotel, or attraction page. The link opens its reviews section.",
    example:
      "https://www.tripadvisor.com/Restaurant_Review-g60763-d1234567-Reviews-Example-New_York_City_New_York.html",
    supportsPlaceSearch: false,
  },
  {
    id: "trustpilot",
    name: "Trustpilot",
    badge: "★",
    accent: "#00b67a",
    linkKind: "Review page link",
    inputLabel: "Trustpilot review link or domain",
    placeholder: "https://www.trustpilot.com/review/your-domain.com",
    help: "Paste the Trustpilot review page or just your domain. The business must already be listed on Trustpilot.",
    example: "example.com",
    supportsPlaceSearch: false,
  },
] as const;

export interface GeneratedLink {
  platform: PlatformId;
  reviewUrl: string;
  businessName?: string;
  /** Extra context such as an address. */
  detail?: string;
  /** True when the link opens the review form or review tab directly. */
  direct: boolean;
  /** Limitation or guidance shown with the result. */
  note?: string;
  /** Google Place ID used for the review link. */
  placeId?: string;
  /** Google CID (decimal) when the input only carried a CID. */
  cid?: string;
  /** Google feature ID pair (0x…:0x…) found in the input. */
  featureId?: string;
  /** True when the Place ID was rebuilt from a feature ID. */
  reconstructed?: boolean;
}

export type ParseResult = { ok: true; link: GeneratedLink } | { ok: false; error: string };

export interface InputFeedback {
  tone: "ok" | "warn" | "error";
  message: string;
  link?: GeneratedLink;
}

const SCHEME = /^https?:\/\//i;
const GOOGLE_PLACE_ID_QUERY = /[?&](?:query_)?place_?id=([\w-]{8,})/i;
const GOOGLE_PLACE_ID_PREFIX = /place_id:([\w-]{8,})/i;
const GOOGLE_PLACE_ID = /\b(ChIJ[\w-]{8,})/;
const GOOGLE_CID = /[?&](?:cid|ludocid)=(\d{6,})/i;
/** Full feature ID pair (0x…:0x…) from a Maps data block or an ftid/fid parameter. */
const GOOGLE_FTID = /(?:!1s|ftid=|fid=|business_id=)(0x[0-9a-f]+:0x[0-9a-f]+)/i;
const GOOGLE_FTID_VALUE = /^0x[0-9a-f]{1,16}:0x[0-9a-f]{1,16}$/i;
const GOOGLE_BARE_CID = /^\d{6,}$/;
const GOOGLE_HOST = /(^|\.)google\.[a-z.]+$/i;
const GOOGLE_SHORT_HOST = /^(?:maps\.app\.goo\.gl|goo\.gl)$/i;
const G_PAGE_REVIEW = /^\/r\/[^/]+\/review\/?$/i;

const FACEBOOK_HOST = /(^|\.)facebook\.com$/i;
const FACEBOOK_RESERVED = new Set([
  "ads",
  "bookmarks",
  "business",
  "events",
  "friends",
  "fundraisers",
  "gaming",
  "groups",
  "help",
  "live",
  "login",
  "marketplace",
  "memories",
  "messages",
  "notifications",
  "permalink",
  "photo",
  "photos",
  "policies",
  "posts",
  "reel",
  "reels",
  "saved",
  "settings",
  "share",
  "sharer",
  "stories",
  "video",
  "watch",
]);

const YELP_HOST = /(^|\.)yelp\.[a-z.]+$/i;
const TRIPADVISOR_HOST = /(^|\.)tripadvisor\.[a-z.]+$/i;
const TRUSTPILOT_HOST = /(^|\.)trustpilot\.[a-z.]+$/i;
const BARE_DOMAIN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function fail(error: string): ParseResult {
  return { ok: false, error };
}

function withScheme(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const candidate = SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

export function reviewUrlForPlaceId(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/**
 * Google's official write-a-review Maps link, built from a feature ID pair.
 * This is the same shape the Places API returns in `googleMapsLinks.writeAReviewUri`,
 * and it opens the review dialog without needing a Place ID.
 */
export function reviewUrlForFeatureId(featureId: string): string {
  return `https://www.google.com/maps/place//data=!4m3!3m2!1s${featureId.toLowerCase()}!12e1`;
}

/**
 * Fallback review link for a CID-only input. Google Search accepts a
 * `ludocid` plus an `#lrd=0x0:0x<cid>,3` fragment, which opens the review tab.
 */
export function reviewUrlForCid(cid: string, businessName?: string): string {
  const hex = BigInt(cid).toString(16);
  const query = encodeURIComponent(businessName?.trim() || cid);
  return `https://www.google.com/search?q=${query}&ludocid=${cid}#lrd=0x0:0x${hex},3`;
}

function writeUint64LE(bytes: Uint8Array, offset: number, value: bigint): void {
  let remaining = value;
  for (let index = 0; index < 8; index += 1) {
    bytes[offset + index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += BASE64URL[first >> 2];
    output += BASE64URL[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    if (second === undefined) break;
    output += BASE64URL[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    if (third === undefined) break;
    output += BASE64URL[third & 0x3f];
  }
  return output;
}

/**
 * Rebuild a `ChIJ…` Place ID from the 0x…:0x… feature pair in a Maps URL.
 * The Place ID is a base64url-encoded protobuf containing both halves as
 * little-endian 64-bit fields. Returns null when the pair is not valid.
 */
export function placeIdFromFeatureId(featureId: string): string | null {
  const match = /^0x([0-9a-f]{1,16}):0x([0-9a-f]{1,16})$/i.exec(featureId.trim());
  if (!match) return null;

  const bytes = new Uint8Array(20);
  bytes[0] = 0x0a;
  bytes[1] = 0x12;
  bytes[2] = 0x09;
  writeUint64LE(bytes, 3, BigInt(`0x${match[1]}`));
  bytes[11] = 0x11;
  writeUint64LE(bytes, 12, BigInt(`0x${match[2]}`));
  return toBase64Url(bytes);
}

function googlePlaceName(url: URL): string | undefined {
  const segments = url.pathname.split("/").filter(Boolean);
  const index = segments.indexOf("place");
  if (index === -1) return undefined;
  const segment = segments[index + 1];
  if (!segment || segment.startsWith("@") || segment.startsWith("data=")) return undefined;
  try {
    const name = decodeURIComponent(segment.replaceAll("+", " ")).trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

function prettySlug(slug: string): string {
  return slug
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function placeIdLink(placeId: string, extra: Partial<GeneratedLink> = {}): ParseResult {
  return {
    ok: true,
    link: {
      platform: "google",
      reviewUrl: reviewUrlForPlaceId(placeId),
      placeId,
      direct: true,
      ...extra,
    },
  };
}

function featureIdLink(featureId: string, businessName?: string): ParseResult {
  const normalized = featureId.toLowerCase();
  const placeId = placeIdFromFeatureId(normalized);

  if (!placeId) {
    return {
      ok: true,
      link: {
        platform: "google",
        reviewUrl: reviewUrlForFeatureId(normalized),
        businessName,
        featureId: normalized,
        direct: true,
      },
    };
  }

  return placeIdLink(placeId, {
    businessName,
    featureId: normalized,
    reconstructed: true,
  });
}

function cidLink(cid: string, businessName?: string): ParseResult {
  return {
    ok: true,
    link: {
      platform: "google",
      reviewUrl: reviewUrlForCid(cid, businessName),
      businessName,
      cid,
      direct: true,
      note: "Built from the CID. If the review form does not open, paste the full Maps URL that contains the 0x…:0x… pair.",
    },
  };
}

function extractFeatureId(raw: string, url: URL): string | undefined {
  const fromRaw = raw.match(GOOGLE_FTID)?.[1];
  const fromParam =
    url.searchParams.get("ftid") ??
    url.searchParams.get("fid") ??
    url.searchParams.get("business_id") ??
    undefined;
  const candidate = fromRaw ?? (fromParam && GOOGLE_FTID_VALUE.test(fromParam) ? fromParam : undefined);
  return candidate?.toLowerCase();
}

function extractCid(raw: string, url: URL): string | undefined {
  const fromParam = url.searchParams.get("cid") ?? url.searchParams.get("ludocid");
  if (fromParam && GOOGLE_BARE_CID.test(fromParam)) return fromParam;

  if (/^local\.google\.com$/i.test(url.hostname) && url.pathname.startsWith("/place")) {
    const id = url.searchParams.get("id");
    if (id && GOOGLE_BARE_CID.test(id)) return id;
  }

  return raw.match(GOOGLE_CID)?.[1];
}

function parseGoogle(input: string): ParseResult {
  const raw = input.trim();
  if (!raw) return fail("Paste a Google Maps link, a Place ID, or switch to name search.");

  const placeIdMatch =
    raw.match(GOOGLE_PLACE_ID_QUERY) ?? raw.match(GOOGLE_PLACE_ID_PREFIX) ?? raw.match(GOOGLE_PLACE_ID);
  const explicitPlaceId = placeIdMatch?.[1];
  if (explicitPlaceId) return placeIdLink(explicitPlaceId);

  if (GOOGLE_FTID_VALUE.test(raw)) return featureIdLink(raw);
  if (GOOGLE_BARE_CID.test(raw)) return cidLink(raw);

  const url = withScheme(raw);
  if (!url) {
    return fail("That does not look like a Google Maps link or Place ID. Paste the full URL, or switch to name search.");
  }

  if (GOOGLE_SHORT_HOST.test(url.hostname)) {
    return fail(
      "Short Google Maps links have to be opened first. Open the link, then copy the full google.com/maps URL from the address bar.",
    );
  }

  if (/^g\.page$/i.test(url.hostname)) {
    if (G_PAGE_REVIEW.test(url.pathname)) {
      return { ok: true, link: { platform: "google", reviewUrl: url.toString(), direct: true } };
    }
    return fail("That g.page link is not a review link. Copy the review link from your Business Profile, or paste a Maps URL.");
  }

  if (!GOOGLE_HOST.test(url.hostname)) {
    return fail("That is not a Google link. Paste a google.com/maps URL or a Place ID that starts with ChIJ.");
  }

  if (url.pathname.includes("/local/writereview")) {
    const placeId = url.searchParams.get("placeid");
    if (placeId) return placeIdLink(placeId);
    return fail("That review link is missing its placeid. Copy the complete link and try again.");
  }

  const name = googlePlaceName(url);
  const featureId = extractFeatureId(raw, url);
  if (featureId) return featureIdLink(featureId, name);

  const cid = extractCid(raw, url);
  if (cid) return cidLink(cid, name);

  if (url.hash.includes("lrd=")) {
    return {
      ok: true,
      link: { platform: "google", reviewUrl: url.toString(), businessName: name, direct: true },
    };
  }

  if (name) {
    return fail(
      `I found the place name “${name}”, but this Maps URL does not include a Place ID or feature ID. Copy the full URL from the address bar (open a Share short link first), or search by name with a Places API key.`,
    );
  }

  return fail(
    "This Google Maps link does not include a Place ID or feature ID. Open the business on Google Maps, copy the full URL from the address bar, and paste it here.",
  );
}

function parseFacebook(input: string): ParseResult {
  const raw = input.trim();
  if (!raw) return fail("Paste a Facebook page link or @handle.");

  const url = withScheme(raw);
  if (url) {
    if (!FACEBOOK_HOST.test(url.hostname)) {
      return fail("That is not a facebook.com link. Paste your page URL, for example facebook.com/your-business.");
    }
    if (url.pathname === "/profile.php") {
      const id = url.searchParams.get("id");
      if (!id) return fail("That Facebook profile link is missing its id. Copy the page URL again.");
      return {
        ok: true,
        link: {
          platform: "facebook",
          reviewUrl: `https://www.facebook.com/profile.php?id=${encodeURIComponent(id)}&sk=reviews`,
          direct: true,
        },
      };
    }
    const segments = url.pathname.split("/").filter(Boolean);
    const handle = segments[0];
    if (!handle || FACEBOOK_RESERVED.has(handle.toLowerCase())) {
      return fail("That Facebook link points to a post, group, or another non-business page. Use the page's main URL.");
    }
    return {
      ok: true,
      link: {
        platform: "facebook",
        reviewUrl: `https://www.facebook.com/${handle}/reviews`,
        businessName: prettySlug(handle),
        direct: true,
      },
    };
  }

  const handle = raw.replace(/^@/, "").replace(/^facebook\.com\//i, "").replace(/\/+$/u, "");
  if (!/^[\w.-]{3,}$/u.test(handle) || FACEBOOK_RESERVED.has(handle.toLowerCase())) {
    return fail("Enter a Facebook page URL or a handle like @your-business.");
  }
  return {
    ok: true,
    link: {
      platform: "facebook",
      reviewUrl: `https://www.facebook.com/${handle}/reviews`,
      businessName: prettySlug(handle),
      direct: true,
    },
  };
}

function parseYelp(input: string): ParseResult {
  const raw = input.trim();
  if (!raw) return fail("Paste your Yelp business page link.");

  const url = withScheme(raw);
  if (!url) return fail("Paste the full URL from your Yelp business page.");
  if (!YELP_HOST.test(url.hostname)) {
    return fail("That is not a Yelp link. Open your business page on Yelp and copy the address bar.");
  }

  const slug = url.pathname.match(/\/biz\/([^/?#]+)/i)?.[1];
  if (!slug) {
    return fail("This Yelp link does not point to a business page. Copy the URL that contains /biz/.");
  }

  return {
    ok: true,
    link: {
      platform: "yelp",
      reviewUrl: `https://${url.hostname}/biz/${slug}#reviews`,
      businessName: prettySlug(slug),
      direct: false,
      note: "This opens the reviews section. Yelp only allows a one-tap review form through its own internal business ID, so reviewers start from the business page.",
    },
  };
}

function parseTripadvisor(input: string): ParseResult {
  const raw = input.trim();
  if (!raw) return fail("Paste your Tripadvisor listing link.");

  const url = withScheme(raw);
  if (!url) return fail("Paste the full URL from the restaurant, hotel, or attraction page.");
  if (!TRIPADVISOR_HOST.test(url.hostname)) {
    return fail("That is not a tripadvisor.com link. Open the listing and copy the address bar.");
  }
  if (!/_Reviews?-/i.test(url.pathname) && !/ShowUserReviews-/i.test(url.pathname)) {
    return fail("This Tripadvisor link is not a listing page. Use the restaurant, hotel, or attraction page.");
  }

  url.hash = "REVIEWS";
  return {
    ok: true,
    link: {
      platform: "tripadvisor",
      reviewUrl: url.toString(),
      direct: false,
      note: "This opens the reviews section. Tripadvisor asks reviewers to sign in before writing, so the link lands on the listing rather than a blank form.",
    },
  };
}

function parseTrustpilot(input: string): ParseResult {
  const raw = input.trim();
  if (!raw) return fail("Paste a Trustpilot review link or your domain.");

  const url = withScheme(raw);
  if (url) {
    if (TRUSTPILOT_HOST.test(url.hostname)) {
      const domain = url.pathname.match(/\/review\/([^/?#]+)/i)?.[1];
      if (!domain) {
        return fail("This Trustpilot link is not a review page. Copy the URL that contains /review/your-domain.");
      }
      return {
        ok: true,
        link: {
          platform: "trustpilot",
          reviewUrl: `https://www.trustpilot.com/review/${domain}`,
          businessName: domain,
          direct: true,
        },
      };
    }
    const domain = url.hostname.replace(/^www\./i, "");
    if (!BARE_DOMAIN.test(domain)) {
      return fail("Enter your business domain, for example example.com, or its Trustpilot review link.");
    }
    return {
      ok: true,
      link: {
        platform: "trustpilot",
        reviewUrl: `https://www.trustpilot.com/review/${domain}`,
        businessName: domain,
        direct: true,
      },
    };
  }

  if (BARE_DOMAIN.test(raw)) {
    return {
      ok: true,
      link: {
        platform: "trustpilot",
        reviewUrl: `https://www.trustpilot.com/review/${raw.toLowerCase()}`,
        businessName: raw.toLowerCase(),
        direct: true,
      },
    };
  }

  return fail("Enter a domain like example.com, or paste the Trustpilot review page URL.");
}

export function generateLink(platform: PlatformId, input: string): ParseResult {
  switch (platform) {
    case "google":
      return parseGoogle(input);
    case "facebook":
      return parseFacebook(input);
    case "yelp":
      return parseYelp(input);
    case "tripadvisor":
      return parseTripadvisor(input);
    case "trustpilot":
      return parseTrustpilot(input);
  }
}

/** Live, non-committing feedback for the input box. */
export function inspectInput(platform: PlatformId, input: string): InputFeedback | null {
  if (!input.trim()) return null;

  const outcome = generateLink(platform, input);
  if (!outcome.ok) return { tone: "error", message: outcome.error };

  const link = outcome.link;
  if (link.cid && !link.placeId && !link.featureId) {
    return {
      tone: "warn",
      message:
        "CID found — using a Google Search fallback. Paste the full Maps URL with its 0x…:0x… pair for a guaranteed one-tap link.",
      link,
    };
  }

  if (!link.direct) {
    return { tone: "warn", message: link.note ?? "This link opens the listing, not the review form.", link };
  }

  let label = "Link ready";
  if (link.placeId && link.featureId) label = "Place ID rebuilt from the Maps link";
  else if (link.placeId) label = "Place ID found";
  else if (link.featureId) label = "Feature ID found";
  else if (link.cid) label = "CID found";

  return { tone: "ok", message: `${label} — opens the review form directly.`, link };
}

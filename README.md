# ReviewLink Studio

Create share-ready review links for a business on Google, Facebook, Yelp, Tripadvisor,
or Trustpilot. Built with Vite, React, and TypeScript.

This is an original implementation inspired by the workflow of public "review link
generator" tools. It does not use another site's code, branding, logo, or copy.

## What it does

- Parses a Google Maps URL, Place ID, CID, or `0x…:0x…` feature pair into a review link
  that opens the "Write a review" dialog directly.
- Expands short `maps.app.goo.gl`, `goo.gl`, and `g.co` links before parsing.
- Produces ready-to-send email, SMS, WhatsApp, receipt, and website-button messages.
- Shows live input feedback and the detected Place ID, CID, or feature ID before you generate.
- Stores recent links in this browser only (`localStorage`).
- Optionally searches for a Google business by name using your own Places API key.
- Uses a light color scheme, keyboard navigation, and reduced motion.

## Design

The interface follows the design language of public review-link generator tools
such as Productmate: a light-only theme, a deep-navy primary, system UI type on
an 18px base, compact radii, a Google-blue focus glow, and a centered
single-column tool layout. All code, branding, and copy in this project are
original.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL. Production build:

```bash
npm run build
npm run preview
```

Tests and typecheck:

```bash
npm test
npm run typecheck
```

## How each platform link works

| Platform   | Input                                                   | Output                                                       |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| Google     | Maps URL, short link, `ChIJ…` Place ID, CID, or `0x…:0x…` pair | `search.google.com/local/writereview?placeid=…` or `?ludocid=…` (review dialog) |
| Facebook   | Page URL or `@handle`                                   | `facebook.com/<page>/reviews`                                |
| Yelp       | `yelp.com/biz/<slug>` URL                               | `yelp.com/biz/<slug>#reviews`                                |
| Tripadvisor| Restaurant, hotel, or attraction page                   | Listing URL with `#REVIEWS`                                  |
| Trustpilot | Review URL or bare domain                               | `trustpilot.com/review/<domain>`                             |

### Google Place IDs, feature IDs, and CIDs

A one-tap Google review link needs a **Place ID** (`ChIJ…`). The tool accepts one
directly or rebuilds it from the input:

- Place ID → `search.google.com/local/writereview?placeid=…`
- Feature ID pair (`0x…:0x…` after `!1s`, `ftid=`, or `fid=`) → the pair is encoded
  into the matching Place ID, then the same `writereview` link is returned.
- CID (`cid=`, `ludocid=`, `local.google.com/place?id=`, `action=write_review`, or a bare
  number) → `search.google.com/local/writereview?ludocid=…`, which opens the same review
  dialog without a Place ID.
- Review fragment (`#lrd=…`) → passed through unchanged.
- Short link (`maps.app.goo.gl`, `goo.gl`, `g.co`) → expanded first, then parsed as above.

A valid feature pair always round-trips to a Place ID. If a pair is malformed, the tool
falls back to `google.com/maps/place//data=!4m3!3m2!1s…!12e1`, the same
`writeAReviewUri` shape Google's Places API returns. Short links (`maps.app.goo.gl`)
are expanded automatically when possible.

### Short link expansion

Google's redirect responses do not send CORS headers, so a browser cannot read the
final URL itself. The app tries a direct request first, then a resolver endpoint.
A ready-to-deploy Cloudflare Worker lives in `worker/shortlink.js`:

```bash
npm i -g wrangler
wrangler deploy worker/shortlink.js --name reviewlink-shortlink
```

Point the build at it (see `.env.example`):

```bash
VITE_SHORTLINK_RESOLVER="https://reviewlink-shortlink.<account>.workers.dev/?url={url}"
npm run build
```

The worker follows the redirect and returns JSON with the final `url` plus any
`placeId`, `featureId`, or `cid` it finds. Any compatible endpoint works: it receives
the short link URL-encoded (`{url}` is replaced, or the URL is appended when the
placeholder is absent) and may reply with JSON `{ "url": "…" }`, `{ "placeId": "…" }`,
`{ "cid": "…" }`, or plain text containing the final URL. Without a resolver, the form
shows a clear instruction to open the short link once and paste the full Maps URL —
no request ever fails silently.

To get a direct link without a Maps URL:

1. Paste the Place ID from a `place_id:` URL or the business's Google Business Profile
   review link.
2. Paste the full Maps URL and let the tool rebuild the Place ID from its feature pair.
3. Use **Search by name** with your own Google Places API key. The key is stored only in
   this browser and is sent only to `places.googleapis.com`.

### Platform limitations

Facebook, Yelp, and Tripadvisor do not expose a public, URL-only "write a review" form.
The generated links open each platform's review area, which is the best stable link
without a private business ID. This is stated in the UI rather than hidden.

## Places API key setup

1. In Google Cloud, enable **Places API (New)**.
2. Create an API key and restrict it to the Places API and your site's HTTP referrers.
3. Paste the key into the **Search by name** panel.

Search requests use `places:searchText` with a field mask of `places.id`,
`places.displayName`, `places.formattedAddress`, and `places.googleMapsUri`.

## Project structure

```
src/
  App.tsx                 page composition and state
  platforms.ts            platform registry and URL parsers
  platforms.test.ts       parser tests
  components/             picker, form, result, templates, history, FAQ
  lib/                    clipboard, Places search, short-link expansion, storage, templates
  styles.css              design system and responsive layout
worker/
  shortlink.js            optional Cloudflare Worker that expands short links
```

## Privacy

- Link generation happens in the browser.
- Nothing is uploaded unless you run a name search with your own API key, or a configured
  short-link resolver expands a `maps.app.goo.gl` link.
- History and the optional API key live in `localStorage`; clear them from the UI or
  your browser settings.

import { afterEach, describe, expect, it, vi } from "vitest";
import { SHORT_LINK_ERROR, expandGoogleShortLink } from "./shortlink";

const FINAL_URL =
  "https://www.google.com/maps/place/Blue+Bottle/@37.8,-122.2,17z/data=!4m3!3m2!1s0x808f80b4c2b1a2c3:0xabc123";

function response(overrides: Partial<Response>): Response {
  return { ok: true, type: "cors", url: FINAL_URL, text: async () => "", ...overrides } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("expandGoogleShortLink", () => {
  it("uses the final URL from a followed redirect", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({})));
    await expect(expandGoogleShortLink("https://maps.app.goo.gl/abc123")).resolves.toBe(FINAL_URL);
  });

  it("ignores opaque responses and reports a clear error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ type: "opaque", url: "" })));
    await expect(expandGoogleShortLink("https://maps.app.goo.gl/abc123")).rejects.toThrow(
      SHORT_LINK_ERROR,
    );
  });

  it("reports an error when the request is blocked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(expandGoogleShortLink("https://g.co/kgs/abc123")).rejects.toThrow(SHORT_LINK_ERROR);
  });

  it("rejects a non-Google redirect target", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response({ url: "https://example.com/not-google" })),
    );
    await expect(expandGoogleShortLink("https://goo.gl/maps/abc123")).rejects.toThrow(SHORT_LINK_ERROR);
  });
});

import { describe, expect, it } from "vitest";
import {
  generateLink,
  inspectInput,
  placeIdFromFeatureId,
  reviewUrlForCid,
  reviewUrlForFeatureId,
  reviewUrlForPlaceId,
  type PlatformId,
} from "./platforms";

function linkFor(platform: PlatformId, input: string) {
  const outcome = generateLink(platform, input);
  if (!outcome.ok) throw new Error(`Expected a link for ${input}, got: ${outcome.error}`);
  return outcome.link;
}

function errorFor(platform: PlatformId, input: string) {
  const outcome = generateLink(platform, input);
  if (outcome.ok) throw new Error(`Expected an error for ${input}, got: ${outcome.link.reviewUrl}`);
  return outcome.error;
}

describe("Google review links", () => {
  it("builds a review form link from a Place ID", () => {
    const link = linkFor("google", "ChIJN1t_tDeuEmsRUsoyG83frY4");
    expect(link.reviewUrl).toBe(reviewUrlForPlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4"));
    expect(link.placeId).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4");
    expect(link.direct).toBe(true);
  });

  it("reads a placeid query parameter", () => {
    const link = linkFor("google", "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4");
    expect(link.reviewUrl).toBe(reviewUrlForPlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4"));
    expect(link.placeId).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4");
  });

  it("reads a place_id prefix in a Maps URL", () => {
    const link = linkFor("google", "https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4");
    expect(link.reviewUrl).toContain("placeid=ChIJN1t_tDeuEmsRUsoyG83frY4");
  });

  it("rebuilds a Place ID from a Maps feature ID pair", () => {
    const link = linkFor(
      "google",
      "https://www.google.com/maps/place/Blue+Bottle/@37.8,-122.2,17z/data=!4m6!3m5!1s0x808f80b4c2b1a2c3:0xabc123!8m2!3d37.8!4d-122.2",
    );
    expect(link.featureId).toBe("0x808f80b4c2b1a2c3:0xabc123");
    expect(link.placeId).toBe(placeIdFromFeatureId("0x808f80b4c2b1a2c3:0xabc123"));
    expect(link.reviewUrl).toBe(reviewUrlForPlaceId(link.placeId!));
    expect(link.reconstructed).toBe(true);
    expect(link.direct).toBe(true);
    expect(link.businessName).toBe("Blue Bottle");
  });

  it("matches ProductMate's documented feature ID example", () => {
    expect(placeIdFromFeatureId("0x47b18f1cae867bab:0xb6f8b3a3753ba1a2")).toBe(
      "ChIJq3uGrhyPsUcRoqE7daOz-LY",
    );

    const link = linkFor(
      "google",
      "https://www.google.com/maps/place//data=!4m3!3m2!1s0x47b18f1cae867bab:0xb6f8b3a3753ba1a2!12e1",
    );
    expect(link.reviewUrl).toBe(reviewUrlForPlaceId("ChIJq3uGrhyPsUcRoqE7daOz-LY"));
  });

  it("round-trips known Place IDs through their feature pair", () => {
    expect(placeIdFromFeatureId("0x6b12ae37b47f5b37:0x8eaddfcd1b32ca52")).toBe(
      "ChIJN1t_tDeuEmsRUsoyG83frY4",
    );
  });

  it("exposes the fallback feature-ID review URL", () => {
    expect(reviewUrlForFeatureId("0x808F80B4C2B1A2C3:0xABC123")).toBe(
      "https://www.google.com/maps/place//data=!4m3!3m2!1s0x808f80b4c2b1a2c3:0xabc123!12e1",
    );
  });

  it("reads a feature ID from an ftid query parameter", () => {
    const link = linkFor("google", "https://www.google.com/maps?ftid=0x808f80b4c2b1a2c3:0xABC123");
    expect(link.featureId).toBe("0x808f80b4c2b1a2c3:0xabc123");
    expect(link.placeId).toBe(placeIdFromFeatureId(link.featureId!));
    expect(link.reviewUrl).toBe(reviewUrlForPlaceId(link.placeId!));
  });

  it("accepts a bare feature ID pair", () => {
    const link = linkFor("google", "0x47b18f1cae867bab:0xb6f8b3a3753ba1a2");
    expect(link.reviewUrl).toBe(reviewUrlForPlaceId("ChIJq3uGrhyPsUcRoqE7daOz-LY"));
  });

  it("builds a review link from a CID", () => {
    const link = linkFor("google", "https://www.google.com/maps?cid=11256099");
    expect(link.reviewUrl).toBe(reviewUrlForCid("11256099"));
    expect(link.cid).toBe("11256099");
    expect(link.direct).toBe(true);
  });

  it("accepts a bare CID", () => {
    expect(linkFor("google", "11256099").reviewUrl).toBe(reviewUrlForCid("11256099"));
  });

  it("reads a ludocid parameter", () => {
    const link = linkFor("google", "https://www.google.com/search?ludocid=12682026813239828050");
    expect(link.reviewUrl).toBe(reviewUrlForCid("12682026813239828050"));
  });

  it("reads a CID from a local.google.com place link", () => {
    const link = linkFor("google", "https://local.google.com/place?id=11256099&use=srp");
    expect(link.reviewUrl).toBe(reviewUrlForCid("11256099"));
  });

  it("reads query_place_id from a Maps URL", () => {
    const link = linkFor(
      "google",
      "https://www.google.com/maps?q=Blue+Bottle&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4",
    );
    expect(link.placeId).toBe("ChIJN1t_tDeuEmsRUsoyG83frY4");
    expect(link.reviewUrl).toBe(reviewUrlForPlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4"));
  });

  it("uses the place name in a CID review link", () => {
    const link = linkFor(
      "google",
      "https://www.google.com/maps/place/Massage+Envy/@33.6,-112.1,17z?cid=12682026813239828050",
    );
    expect(link.reviewUrl).toBe(reviewUrlForCid("12682026813239828050", "Massage Envy"));
    expect(link.businessName).toBe("Massage Envy");
  });

  it("passes through a g.page review link", () => {
    const link = linkFor("google", "https://g.page/r/abc123/review");
    expect(link.reviewUrl).toBe("https://g.page/r/abc123/review");
    expect(link.direct).toBe(true);
  });

  it("passes through a review fragment when no IDs are present", () => {
    const input = "https://www.google.com/search?q=Example#lrd=0x0:0xabc123,3";
    const link = linkFor("google", input);
    expect(link.reviewUrl).toBe(input);
    expect(link.direct).toBe(true);
  });

  it("reports live feedback for a Maps link", () => {
    const feedback = inspectInput(
      "google",
      "https://www.google.com/maps/place//data=!4m3!3m2!1s0x47b18f1cae867bab:0xb6f8b3a3753ba1a2!12e1",
    );
    expect(feedback?.tone).toBe("ok");
    expect(feedback?.message).toContain("Place ID rebuilt");
    expect(feedback?.link?.placeId).toBe("ChIJq3uGrhyPsUcRoqE7daOz-LY");
  });

  it("warns about the CID fallback in live feedback", () => {
    const feedback = inspectInput("google", "https://www.google.com/maps?cid=11256099");
    expect(feedback?.tone).toBe("warn");
    expect(feedback?.message).toContain("CID found");
    expect(feedback?.link?.cid).toBe("11256099");
  });

  it("reports live feedback for an invalid link", () => {
    const feedback = inspectInput("google", "https://example.com/business");
    expect(feedback?.tone).toBe("error");
    expect(feedback?.message).toContain("not a Google link");
  });

  it("explains how to resolve a short Maps link", () => {
    expect(errorFor("google", "https://maps.app.goo.gl/abc123")).toContain("Short Google Maps links");
  });

  it("rejects non-Google links", () => {
    expect(errorFor("google", "https://example.com/business")).toContain("not a Google link");
  });

  it("rejects empty input", () => {
    expect(errorFor("google", "   ")).toContain("Paste a Google Maps link");
  });
});

describe("Facebook review links", () => {
  it("builds a reviews tab link from a page URL", () => {
    expect(linkFor("facebook", "https://www.facebook.com/my-business").reviewUrl).toBe(
      "https://www.facebook.com/my-business/reviews",
    );
  });

  it("accepts a handle", () => {
    expect(linkFor("facebook", "@my-business").reviewUrl).toBe("https://www.facebook.com/my-business/reviews");
  });

  it("handles profile.php pages", () => {
    expect(linkFor("facebook", "https://www.facebook.com/profile.php?id=12345").reviewUrl).toBe(
      "https://www.facebook.com/profile.php?id=12345&sk=reviews",
    );
  });

  it("rejects groups", () => {
    expect(errorFor("facebook", "https://www.facebook.com/groups/some-group")).toContain("non-business page");
  });

  it("rejects other hosts", () => {
    expect(errorFor("facebook", "https://example.com/my-business")).toContain("not a facebook.com link");
  });
});

describe("Yelp review links", () => {
  it("builds a reviews section link", () => {
    const link = linkFor("yelp", "https://www.yelp.com/biz/joes-coffee-san-francisco?osq=Coffee");
    expect(link.reviewUrl).toBe("https://www.yelp.com/biz/joes-coffee-san-francisco#reviews");
    expect(link.businessName).toBe("joes coffee san francisco");
    expect(link.direct).toBe(false);
  });

  it("requires a business path", () => {
    expect(errorFor("yelp", "https://www.yelp.com/search?find_desc=coffee")).toContain("/biz/");
  });

  it("rejects other hosts", () => {
    expect(errorFor("yelp", "https://example.com/biz/joes-coffee")).toContain("not a Yelp link");
  });
});

describe("Tripadvisor review links", () => {
  it("adds the reviews anchor to a listing", () => {
    const link = linkFor(
      "tripadvisor",
      "https://www.tripadvisor.com/Restaurant_Review-g60763-d1234567-Reviews-Example-New_York_City_New_York.html",
    );
    expect(link.reviewUrl.endsWith("#REVIEWS")).toBe(true);
    expect(link.direct).toBe(false);
  });

  it("rejects non-listing pages", () => {
    expect(errorFor("tripadvisor", "https://www.tripadvisor.com/Trips")).toContain("not a listing page");
  });

  it("rejects other hosts", () => {
    expect(errorFor("tripadvisor", "https://example.com/Restaurant_Review-g1-d2")).toContain("not a tripadvisor.com link");
  });
});

describe("Trustpilot review links", () => {
  it("builds a review page from a bare domain", () => {
    expect(linkFor("trustpilot", "example.com").reviewUrl).toBe("https://www.trustpilot.com/review/example.com");
  });

  it("normalizes an existing review URL", () => {
    expect(linkFor("trustpilot", "https://www.trustpilot.com/review/example.com?languages=all").reviewUrl).toBe(
      "https://www.trustpilot.com/review/example.com",
    );
  });

  it("uses the hostname when a business URL is pasted", () => {
    expect(linkFor("trustpilot", "https://www.example.com/about").reviewUrl).toBe(
      "https://www.trustpilot.com/review/example.com",
    );
  });

  it("rejects free text", () => {
    expect(errorFor("trustpilot", "my business")).toContain("Enter a domain");
  });
});

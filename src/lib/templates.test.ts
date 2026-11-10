import { describe, expect, it } from "vitest";
import type { GeneratedLink } from "../platforms";
import { buildTemplates, templateText } from "./templates";

const link: GeneratedLink = {
  platform: "google",
  reviewUrl: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
  businessName: "Blue Bottle",
  direct: true,
};

describe("share templates", () => {
  it("includes the review link in every template", () => {
    for (const template of buildTemplates(link)) {
      expect(templateText(template)).toContain(link.reviewUrl);
    }
  });

  it("includes the business name and an email subject", () => {
    const email = buildTemplates(link).find((template) => template.id === "email");
    expect(email?.subject).toContain("Blue Bottle");
    expect(email ? templateText(email) : "").toContain("Subject:");
    expect(email?.composeHref).toContain("mailto:");
  });

  it("creates compose links for email, SMS, and WhatsApp", () => {
    const channels = buildTemplates(link)
      .filter((template) => template.composeHref)
      .map((template) => template.id);
    expect(channels).toEqual(["email", "sms", "whatsapp"]);
  });
});

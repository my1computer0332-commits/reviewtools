import type { GeneratedLink } from "../platforms";

export type TemplateChannel = "email" | "sms" | "whatsapp" | "print" | "website";

export interface ShareTemplate {
  id: string;
  title: string;
  description: string;
  channel: TemplateChannel;
  /** Email subject line, when the channel supports one. */
  subject?: string;
  body: string;
  /** Optional link that opens the message in the relevant app. */
  composeHref?: string;
  composeLabel?: string;
}

/** The full text to copy, including a subject line for email. */
export function templateText(template: ShareTemplate): string {
  return template.subject ? `Subject: ${template.subject}\n\n${template.body}` : template.body;
}

export function buildTemplates(link: GeneratedLink): ShareTemplate[] {
  const url = link.reviewUrl;
  const name = link.businessName?.trim();
  const place = name ? ` ${name}` : " us";

  const emailSubject = `A quick favor after your visit${name ? ` to ${name}` : ""}`;
  const emailBody = [
    "Hi there,",
    "",
    `Thank you for choosing${place}. Your honest feedback helps us understand what is working and what we can improve.`,
    "",
    "If you have a minute, would you share a quick review? It takes less than two minutes:",
    url,
    "",
    "Thank you — we really appreciate it.",
  ].join("\n");

  const smsBody = `Hi! Thanks for visiting${name ? ` ${name}` : ""}. If you have a minute, would you leave a quick review? It really helps us improve: ${url}`;

  const whatsappBody = `Hello! Thanks for stopping by${name ? ` ${name}` : ""}. We would love your honest feedback — it helps us get better. You can leave a review here: ${url}`;

  return [
    {
      id: "email",
      title: "Email",
      description: "For post-visit follow-ups, receipts, or your newsletter.",
      channel: "email",
      subject: emailSubject,
      body: emailBody,
      composeHref: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
      composeLabel: "Open in email",
    },
    {
      id: "sms",
      title: "SMS",
      description: "Short and friendly for a quick text message.",
      channel: "sms",
      body: smsBody,
      composeHref: `sms:?body=${encodeURIComponent(smsBody)}`,
      composeLabel: "Open in messages",
    },
    {
      id: "whatsapp",
      title: "WhatsApp",
      description: "Easy to forward in a chat or customer group.",
      channel: "whatsapp",
      body: whatsappBody,
      composeHref: `https://wa.me/?text=${encodeURIComponent(whatsappBody)}`,
      composeLabel: "Open WhatsApp",
    },
    {
      id: "print",
      title: "Receipt or table card",
      description: "Print the QR code with this short call to action.",
      channel: "print",
      body: ["HOW WAS YOUR VISIT?", "Scan the QR code to share your experience with us.", url].join("\n"),
    },
    {
      id: "button",
      title: "Website button",
      description: "Add a review button to your site or booking page.",
      channel: "website",
      body: ["Button text: Leave us a review", `Button URL: ${url}`].join("\n"),
    },
  ];
}

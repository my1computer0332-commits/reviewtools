import { useEffect, useMemo, useState } from "react";
import type { GeneratedLink } from "../platforms";
import { copyText } from "../lib/clipboard";
import { buildTemplates, templateText, type TemplateChannel } from "../lib/templates";

const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WA",
  print: "Print",
  website: "Web",
};

export function ShareTemplates({ link }: { link: GeneratedLink }) {
  const templates = useMemo(() => buildTemplates(link), [link]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return;
    const timer = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedId]);

  const copy = async (id: string, body: string) => {
    if (await copyText(body)) setCopiedId(id);
  };

  return (
    <section className="card templates">
      <div className="section-head">
        <p className="eyebrow">Copy and send</p>
        <h2>Ready-to-send messages</h2>
        <p className="muted">
          Your review link is already included. Pick a channel, copy the message, or open it in the
          matching app and add your customer&apos;s details.
        </p>
      </div>
      <div className="template-grid">
        {templates.map((template) => (
          <article key={template.id} className={`template-card template-${template.channel}`}>
            <div className="template-head">
              <span className="template-channel" aria-hidden="true">
                {CHANNEL_LABELS[template.channel]}
              </span>
              <div>
                <h3>{template.title}</h3>
                <p className="template-desc">{template.description}</p>
              </div>
            </div>
            <pre>{templateText(template)}</pre>
            <div className="template-actions">
              <button
                type="button"
                className="text-button"
                onClick={() => void copy(template.id, templateText(template))}
              >
                {copiedId === template.id ? "Copied" : "Copy message"}
              </button>
              {template.composeHref ? (
                <a
                  className="text-button"
                  href={template.composeHref}
                  target={template.channel === "whatsapp" ? "_blank" : undefined}
                  rel={template.channel === "whatsapp" ? "noreferrer" : undefined}
                >
                  {template.composeLabel}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

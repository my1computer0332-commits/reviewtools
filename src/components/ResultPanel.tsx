import { useEffect, useMemo, useState } from "react";
import { PLATFORMS, type GeneratedLink } from "../platforms";
import { copyText } from "../lib/clipboard";
import { downloadDataUrl, downloadText, qrPngDataUrl, qrPreviewDataUrl, qrSvg } from "../lib/qr";

interface Props {
  link: GeneratedLink;
  onReset: () => void;
}

interface Identifier {
  key: string;
  label: string;
  value: string;
  note?: string;
}

const FALLBACK_PLATFORM = PLATFORMS[0]!;

export function ResultPanel({ link, onReset }: Props) {
  const platform = useMemo(
    () => PLATFORMS.find((item) => item.id === link.platform) ?? FALLBACK_PLATFORM,
    [link.platform],
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setQr(null);
    setQrError(false);
    qrPreviewDataUrl(link.reviewUrl)
      .then((value) => {
        if (active) setQr(value);
      })
      .catch(() => {
        if (active) setQrError(true);
      });
    return () => {
      active = false;
    };
  }, [link.reviewUrl]);

  useEffect(() => {
    if (!copiedKey) return;
    const timer = window.setTimeout(() => setCopiedKey(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedKey]);

  const identifiers = useMemo<Identifier[]>(() => {
    const items: Identifier[] = [];
    if (link.placeId) {
      items.push({
        key: "placeId",
        label: "Place ID",
        value: link.placeId,
        note: link.reconstructed ? "Rebuilt from the Maps feature ID" : undefined,
      });
    }
    if (link.cid) items.push({ key: "cid", label: "CID", value: link.cid });
    if (link.featureId) items.push({ key: "featureId", label: "Feature ID", value: link.featureId });
    return items;
  }, [link]);

  const verifyUrl = useMemo(() => {
    if (link.placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(link.placeId)}`;
    }
    if (link.cid) return `https://maps.google.com/?cid=${encodeURIComponent(link.cid)}`;
    return null;
  }, [link]);

  const withAction = async (action: () => Promise<void>) => {
    try {
      setActionError(null);
      await action();
    } catch {
      setActionError("That action failed. Please try again.");
    }
  };

  const copyValue = (key: string, value: string) =>
    void withAction(async () => {
      if (!(await copyText(value))) throw new Error("copy failed");
      setCopiedKey(key);
    });

  const downloadPng = () =>
    void withAction(async () => {
      const data = await qrPngDataUrl(link.reviewUrl, 2048);
      downloadDataUrl(data, `review-link-${link.platform}.png`);
    });

  const downloadSvg = () =>
    void withAction(async () => {
      const svg = await qrSvg(link.reviewUrl);
      downloadText(svg, `review-link-${link.platform}.svg`, "image/svg+xml");
    });

  return (
    <section className="card result" aria-live="polite">
      <div className="result-head">
        <span className={`platform-badge badge-${platform.id} large`} aria-hidden="true">
          {platform.badge}
        </span>
        <div className="result-title">
          <p className="eyebrow">{platform.name} review link</p>
          <h2>{link.businessName ?? "Your business"}</h2>
          {link.detail ? <p className="muted">{link.detail}</p> : null}
        </div>
      </div>

      <div className={`result-banner${link.direct ? " is-direct" : " is-partial"}`}>
        <span className="banner-icon" aria-hidden="true">
          {link.direct ? "✓" : "!"}
        </span>
        <div>
          <strong>Your review link is ready</strong>
          <p>
            {link.direct
              ? "Customers open the review form in one tap — no searching required."
              : "Customers land on the reviews section, one step away from the review form."}
          </p>
        </div>
      </div>

      {link.note ? <p className="notice">{link.note}</p> : null}

      <div className="link-box">
        <input
          className="link-input"
          value={link.reviewUrl}
          readOnly
          aria-label="Review link"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => copyValue("link", link.reviewUrl)}
        >
          {copiedKey === "link" ? "Copied" : "Copy"}
        </button>
        <a className="btn btn-secondary" href={link.reviewUrl} target="_blank" rel="noreferrer">
          Open
        </a>
      </div>

      {identifiers.length > 0 ? (
        <div className="identifiers" aria-label="Detected Google identifiers">
          {identifiers.map((item) => (
            <div key={item.key} className="identifier">
              <div className="identifier-text">
                <span className="identifier-label">{item.label}</span>
                <span className="identifier-value" title={item.value}>
                  {item.value}
                </span>
                {item.note ? <span className="identifier-note">{item.note}</span> : null}
              </div>
              <button
                type="button"
                className="identifier-copy"
                onClick={() => copyValue(item.key, item.value)}
                aria-label={`Copy ${item.label}`}
              >
                {copiedKey === item.key ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
          {verifyUrl ? (
            <a className="btn btn-secondary verify-link" href={verifyUrl} target="_blank" rel="noreferrer">
              Verify on Maps
            </a>
          ) : null}
        </div>
      ) : null}

      {actionError ? (
        <p className="error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="result-grid">
        <div className="qr-card">
          <p className="eyebrow">QR code</p>
          {qr ? (
            <img src={qr} alt={`QR code for the ${platform.name} review link`} width={220} height={220} />
          ) : (
            <div className="qr-placeholder" aria-hidden="true" />
          )}
          <div className="qr-actions">
            <button type="button" className="btn btn-secondary" onClick={downloadPng} disabled={!qr}>
              Download PNG
            </button>
            <button type="button" className="btn btn-ghost" onClick={downloadSvg} disabled={!qr}>
              Download SVG
            </button>
          </div>
          <p className="qr-meta">2048 × 2048 PNG · scalable SVG · print-ready</p>
          {qrError ? <p className="error">The QR code could not be generated.</p> : null}
        </div>

        <div className="result-actions">
          <p className="eyebrow">Use it anywhere</p>
          <ul className="plain-list">
            <li>Print it on receipts, table cards, or packaging.</li>
            <li>Add it to emails, SMS, or WhatsApp messages.</li>
            <li>Link it from your website or social profiles.</li>
          </ul>
          <button type="button" className="btn btn-secondary btn-wide" onClick={onReset}>
            Try another business
          </button>
        </div>
      </div>
    </section>
  );
}

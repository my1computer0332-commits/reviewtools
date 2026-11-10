import { useMemo, useState, type FormEvent } from "react";
import { inspectInput, type PlatformDefinition } from "../platforms";
import type { PlaceResult } from "../lib/places";

export type InputMode = "link" | "search";

interface Props {
  platform: PlatformDefinition;
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  input: string;
  onInputChange: (value: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  rememberKey: boolean;
  onRememberKeyChange: (value: boolean) => void;
  error: string | null;
  busy: boolean;
  places: PlaceResult[];
  onChoosePlace: (place: PlaceResult) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function GeneratorForm({
  platform,
  mode,
  onModeChange,
  input,
  onInputChange,
  apiKey,
  onApiKeyChange,
  rememberKey,
  onRememberKeyChange,
  error,
  busy,
  places,
  onChoosePlace,
  onSubmit,
}: Props) {
  const [pasteError, setPasteError] = useState(false);
  const searchMode = mode === "search" && platform.supportsPlaceSearch;
  const feedback = useMemo(
    () => (searchMode ? null : inspectInput(platform.id, input)),
    [input, platform.id, searchMode],
  );

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onInputChange(text.trim());
        setPasteError(false);
      }
    } catch {
      setPasteError(true);
    }
  };

  const inputTone = feedback?.tone ?? "";

  return (
    <form className="generator" onSubmit={onSubmit} noValidate>
      {platform.supportsPlaceSearch ? (
        <div className="mode-switch" role="tablist" aria-label="Input mode">
          <button
            type="button"
            role="tab"
            aria-selected={!searchMode}
            className={!searchMode ? "is-active" : undefined}
            onClick={() => onModeChange("link")}
          >
            Paste a link
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={searchMode}
            className={searchMode ? "is-active" : undefined}
            onClick={() => onModeChange("search")}
          >
            Search by name
          </button>
        </div>
      ) : null}

      <label className="field-label" htmlFor="listing-input">
        {searchMode ? "Business name and city" : platform.inputLabel}
      </label>

      <div className={`input-glow${inputTone ? ` is-${inputTone}` : ""}`}>
        <input
          id="listing-input"
          className="text-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={searchMode ? "e.g. Blue Bottle Coffee, Oakland" : platform.placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={feedback ? "listing-help listing-feedback" : "listing-help"}
          aria-invalid={feedback?.tone === "error" ? true : undefined}
        />
        {input ? (
          <button
            type="button"
            className="input-clear"
            aria-label="Clear input"
            onClick={() => onInputChange("")}
          >
            ×
          </button>
        ) : null}
        {!searchMode ? (
          <button type="button" className="paste-btn" onClick={() => void paste()}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M9 12h6" />
              <path d="M9 16h4" />
            </svg>
            <span>Paste</span>
          </button>
        ) : null}
      </div>

      <div className="help-row">
        <p id="listing-help" className="hint">
          {searchMode
            ? "Search uses the Google Places API (New) with your own key. The key stays in this browser and is only sent to places.googleapis.com."
            : platform.help}
        </p>
        {!searchMode ? (
          <button type="button" className="text-button" onClick={() => onInputChange(platform.example)}>
            Use an example
          </button>
        ) : null}
      </div>

      {feedback ? (
        <p
          id="listing-feedback"
          className={`feedback feedback-${feedback.tone}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          <span className="feedback-dot" aria-hidden="true" />
          <span>{feedback.message}</span>
        </p>
      ) : null}

      {!searchMode && platform.id === "google" ? (
        <details className="input-guide">
          <summary>Where do I find my Google Maps link?</summary>
          <ol>
            <li>Open your business on Google Maps and check that it is the right location.</li>
            <li>
              Copy the full URL from the address bar. It usually contains a 0x…:0x… feature pair.
            </li>
            <li>
              If you used <strong>Share → Copy link</strong> and got a maps.app.goo.gl link, open it
              once, then copy the full google.com/maps URL from the address bar.
            </li>
          </ol>
          <p className="hint">
            Already have a Place ID (starts with ChIJ), a CID, or a 0x…:0x… feature pair? Paste any of
            them — the link is built the same way.
          </p>
        </details>
      ) : null}

      {pasteError ? (
        <p className="hint hint-warn">Clipboard access was blocked. Paste with Ctrl+V (or ⌘V) instead.</p>
      ) : null}

      {searchMode ? (
        <div className="key-box">
          <label className="field-label" htmlFor="places-key">
            Google Places API key
          </label>
          <input
            id="places-key"
            className="text-input"
            type="password"
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="AIza…"
            autoComplete="off"
            spellCheck={false}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(event) => onRememberKeyChange(event.target.checked)}
            />
            Remember this key on this device
          </label>
        </div>
      ) : null}

      {places.length > 0 ? (
        <div className="places">
          <p className="places-title">Choose the right listing</p>
          <ul className="place-results">
            {places.map((place) => (
              <li key={place.placeId}>
                <button type="button" className="place-result" onClick={() => onChoosePlace(place)}>
                  <span className="place-name">{place.name}</span>
                  {place.address ? <span className="place-address">{place.address}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error && error !== feedback?.message ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-wide" disabled={busy}>
        {searchMode ? (busy ? "Searching…" : "Search places") : "Create review link"}
      </button>
    </form>
  );
}

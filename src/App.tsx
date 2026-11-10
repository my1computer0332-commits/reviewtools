import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PLATFORMS, generateLink, type GeneratedLink, type PlatformId } from "./platforms";
import { searchPlaces, type PlaceResult } from "./lib/places";
import {
  addHistory,
  readHistory,
  readPlacesKey,
  writeHistory,
  writePlacesKey,
  type StoredLink,
} from "./lib/storage";
import { PlatformPicker } from "./components/PlatformPicker";
import { GeneratorForm, type InputMode } from "./components/GeneratorForm";
import { ResultPanel } from "./components/ResultPanel";
import { ShareTemplates } from "./components/ShareTemplates";
import { HistoryPanel } from "./components/HistoryPanel";
import { Faq } from "./components/Faq";

const FALLBACK_PLATFORM = PLATFORMS[0]!;

function identifiersFromUrl(url: string): Pick<GeneratedLink, "placeId" | "cid"> {
  try {
    const parsed = new URL(url);
    return {
      placeId: parsed.searchParams.get("placeid") ?? parsed.searchParams.get("place_id") ?? undefined,
      cid: parsed.searchParams.get("cid") ?? parsed.searchParams.get("ludocid") ?? undefined,
    };
  } catch {
    return {};
  }
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

export default function App() {
  const [platformId, setPlatformId] = useState<PlatformId>("google");
  const [mode, setMode] = useState<InputMode>("link");
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState(() => readPlacesKey());
  const [rememberKey, setRememberKey] = useState(() => readPlacesKey().length > 0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedLink | null>(null);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState<StoredLink[]>(() => readHistory());
  const resultRef = useRef<HTMLDivElement>(null);
  const searchController = useRef<AbortController | null>(null);

  const platform = useMemo(
    () => PLATFORMS.find((item) => item.id === platformId) ?? FALLBACK_PLATFORM,
    [platformId],
  );

  useEffect(() => () => searchController.current?.abort(), []);

  useEffect(() => {
    writePlacesKey(rememberKey ? apiKey.trim() : "");
  }, [apiKey, rememberKey]);

  const commit = useCallback((link: GeneratedLink) => {
    setResult(link);
    setError(null);
    setPlaces([]);
    setHistory((previous) => {
      const next = addHistory(previous, link);
      writeHistory(next);
      return next;
    });
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const handlePlatform = (id: PlatformId) => {
    setPlatformId(id);
    setMode("link");
    setInput("");
    setError(null);
    setResult(null);
    setPlaces([]);
  };

  const handleModeChange = (next: InputMode) => {
    if (next === mode) return;
    setMode(next);
    setInput("");
    setError(null);
    setPlaces([]);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (error) setError(null);
  };

  const runSearch = async () => {
    const query = input.trim();
    if (!query) {
      setError("Type a business name and city to search.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Add a Google Places API key to search by name. You can also switch to “Paste a link”.");
      return;
    }

    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearching(true);
    setError(null);
    setPlaces([]);

    try {
      const found = await searchPlaces(query, apiKey.trim(), controller.signal);
      if (!found.length) {
        setError("No places matched that search. Add a city or street and try again.");
      } else {
        setPlaces(found);
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "The place search failed.");
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "search" && platform.supportsPlaceSearch) {
      void runSearch();
      return;
    }
    const outcome = generateLink(platformId, input);
    if (outcome.ok) commit(outcome.link);
    else {
      setError(outcome.error);
      setResult(null);
    }
  };

  const choosePlace = (place: PlaceResult) => {
    commit({
      platform: "google",
      reviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.placeId)}`,
      placeId: place.placeId,
      businessName: place.name,
      detail: place.address || undefined,
      direct: true,
    });
  };

  const restore = useCallback((item: StoredLink) => {
    setPlatformId(item.platform);
    setMode("link");
    setInput("");
    setPlaces([]);
    setError(null);
    setResult({
      platform: item.platform,
      reviewUrl: item.url,
      businessName: item.label,
      direct: item.direct,
      ...identifiersFromUrl(item.url),
    });
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const removeHistoryItem = (id: string) => {
    setHistory((previous) => {
      const next = previous.filter((item) => item.id !== id);
      writeHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    writeHistory([]);
  };

  return (
    <div className="app">
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="#top" aria-label="ReviewLink Studio home">
            <span className="brand-mark" aria-hidden="true">
              ★
            </span>
            <span className="brand-name">
              ReviewLink<span> Studio</span>
            </span>
          </a>
          <nav className="site-nav" aria-label="Primary">
            <a href="#how-it-works">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="first-screen">
          <div className="first-screen-inner">
            <div className="hero">
              <div className="hero-stars" aria-hidden="true">
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </div>
              <h1>Free review link generator</h1>
              <p className="lede">
                Paste a Google Maps link, Place ID, or CID and get a one-tap review link, a
                print-ready QR code, and ready-to-send messages. Facebook, Yelp, Tripadvisor, and
                Trustpilot are supported too.
              </p>
              <ul className="trust-pills">
                <li>
                  <GiftIcon /> Free
                </li>
                <li>
                  <CheckIcon /> No sign-up needed
                </li>
                <li>
                  <CheckIcon /> Runs in your browser
                </li>
              </ul>
            </div>

            <div className="workspace" aria-label="Review link generator">
              <PlatformPicker value={platformId} onChange={handlePlatform} />
              <GeneratorForm
                platform={platform}
                mode={mode}
                onModeChange={handleModeChange}
                input={input}
                onInputChange={handleInputChange}
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
                rememberKey={rememberKey}
                onRememberKeyChange={setRememberKey}
                error={error}
                busy={searching}
                places={places}
                onChoosePlace={choosePlace}
                onSubmit={handleSubmit}
              />
              {result ? (
                <div ref={resultRef}>
                  <ResultPanel link={result} onReset={() => setResult(null)} />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {result ? (
          <section className="shell">
            <ShareTemplates link={result} />
          </section>
        ) : null}

        <section className="shell">
          <HistoryPanel
            items={history}
            onRestore={restore}
            onRemove={removeHistoryItem}
            onClear={clearHistory}
          />
        </section>

        <section id="how-it-works" className="shell how">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Three steps to a review-ready link</h2>
          </div>
          <ol className="steps">
            <li>
              <span className="step-number">1.</span>
              <h3>Pick the platform</h3>
              <p>Choose where your customers already leave feedback. Each platform has its own link format.</p>
            </li>
            <li>
              <span className="step-number">2.</span>
              <h3>Paste a Maps link, Place ID, or CID</h3>
              <p>
                We rebuild the Place ID instantly and show the detected identifiers. On Google you can
                also search by name with your own Places API key.
              </p>
            </li>
            <li>
              <span className="step-number">3.</span>
              <h3>Copy, open, or scan</h3>
              <p>
                Copy the one-tap link, open it to check, download a high-resolution QR code, or start
                from a ready-to-send message.
              </p>
            </li>
          </ol>
        </section>

        <section id="faq" className="shell">
          <Faq />
        </section>
      </main>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <p className="footer-brand">ReviewLink Studio</p>
          <p>
            ReviewLink Studio generates links locally in your browser. Nothing is uploaded unless you
            choose name search with your own Google Places API key.
          </p>
          <p className="fine">
            Not affiliated with Google, Meta, Yelp, Tripadvisor, or Trustpilot. Platform names and
            badges are used only to describe the links you create.
          </p>
        </div>
      </footer>
    </div>
  );
}

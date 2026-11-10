import type { GeneratedLink, PlatformId } from "../platforms";

const HISTORY_KEY = "reviewlink.history.v1";
const PLACES_KEY = "reviewlink.placesKey.v1";
const HISTORY_LIMIT = 12;

export interface StoredLink {
  id: string;
  platform: PlatformId;
  url: string;
  label?: string;
  direct: boolean;
  createdAt: number;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isPlatform(value: unknown): value is PlatformId {
  return value === "google" || value === "facebook" || value === "yelp" || value === "tripadvisor" || value === "trustpilot";
}

function isStoredLink(value: unknown): value is StoredLink {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    isPlatform(item.platform) &&
    typeof item.url === "string" &&
    typeof item.direct === "boolean" &&
    typeof item.createdAt === "number" &&
    (item.label === undefined || typeof item.label === "string")
  );
}

export function readHistory(): StoredLink[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredLink).slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export function writeHistory(items: StoredLink[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)));
  } catch {
    // Storage can be unavailable in private mode; history is a convenience only.
  }
}

export function addHistory(items: StoredLink[], link: GeneratedLink): StoredLink[] {
  const entry: StoredLink = {
    id: newId(),
    platform: link.platform,
    url: link.reviewUrl,
    label: link.businessName,
    direct: link.direct,
    createdAt: Date.now(),
  };
  const deduped = items.filter((item) => item.platform !== entry.platform || item.url !== entry.url);
  return [entry, ...deduped].slice(0, HISTORY_LIMIT);
}

export function readPlacesKey(): string {
  try {
    return localStorage.getItem(PLACES_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writePlacesKey(key: string): void {
  try {
    if (key) localStorage.setItem(PLACES_KEY, key);
    else localStorage.removeItem(PLACES_KEY);
  } catch {
    // Ignore storage failures.
  }
}

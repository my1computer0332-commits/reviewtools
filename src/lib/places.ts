export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  mapsUrl?: string;
}

interface PlacesResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    googleMapsUri?: string;
  }>;
  error?: { message?: string; status?: string };
}

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.googleMapsUri";

export async function searchPlaces(query: string, apiKey: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 6 }),
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error(
      "The Places search request could not be sent. Check your connection, or paste a Maps link instead.",
    );
  }

  const body = (await response.json().catch(() => null)) as PlacesResponse | null;
  if (!response.ok) {
    const message = body?.error?.message;
    throw new Error(message ? `Places search failed: ${message}` : `Places search failed (HTTP ${response.status}).`);
  }

  return (body?.places ?? []).flatMap((place) => {
    if (!place.id) return [];
    return [
      {
        placeId: place.id,
        name: place.displayName?.text ?? "Unnamed place",
        address: place.formattedAddress ?? "",
        mapsUrl: place.googleMapsUri,
      },
    ];
  });
}

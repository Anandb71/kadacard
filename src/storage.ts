import type { SavedListing } from './listing';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LISTINGS_KEY = 'kadacard:v1:listings';
export const LISTING_HISTORY_LIMIT = 100;

export function createListingId(now = Date.now(), random = Math.random()): string {
  return `kada-${now.toString(36)}-${random.toString(36).slice(2, 8)}`;
}

export function sanitizeListing(value: SavedListing): SavedListing {
  return {
    id: value.id,
    createdAt: value.createdAt,
    categoryId: value.categoryId,
    productName: value.productName,
    price: value.price,
    phone: value.phone,
    confidence: value.confidence,
    text: value.text,
  };
}

/** Newest first. A repeat of the latest text is kept once. Same id is replaced. */
export function rememberListing(existing: readonly SavedListing[], next: SavedListing): SavedListing[] {
  const clean = sanitizeListing(next);
  const latest = existing[0];
  if (
    latest &&
    latest.text === clean.text &&
    latest.categoryId === clean.categoryId &&
    latest.price === clean.price &&
    latest.phone === clean.phone
  ) {
    return existing.slice();
  }
  return [clean, ...existing.filter((item) => item.id !== clean.id)].slice(0, LISTING_HISTORY_LIMIT);
}

export function removeListing(existing: readonly SavedListing[], id: string): SavedListing[] {
  return existing.filter((item) => item.id !== id).map((item) => sanitizeListing(item));
}

export function createListingStore(storage: KeyValueStore) {
  return {
    load(): SavedListing[] {
      const raw = storage.getItem(LISTINGS_KEY);
      if (!raw) return [];
      return parseListings(raw);
    },
    save(listings: readonly SavedListing[]): void {
      const clean = listings.slice(0, LISTING_HISTORY_LIMIT).map((item) => sanitizeListing(item));
      storage.setItem(LISTINGS_KEY, JSON.stringify(clean));
    },
    clear(): void {
      storage.removeItem(LISTINGS_KEY);
    },
  };
}

function parseListings(raw: string): SavedListing[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedListing).map((item) => sanitizeListing(item));
  } catch {
    return [];
  }
}

function isSavedListing(value: unknown): value is SavedListing {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<SavedListing>;
  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.createdAt === 'string' &&
    typeof record.categoryId === 'string' &&
    typeof record.productName === 'string' &&
    typeof record.price === 'string' &&
    typeof record.phone === 'string' &&
    typeof record.text === 'string' &&
    (record.confidence === null ||
      (typeof record.confidence === 'number' && Number.isFinite(record.confidence)))
  );
}

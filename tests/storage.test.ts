import { describe, expect, it } from 'vitest';
import type { SavedListing } from '../src/listing';
import {
  LISTING_HISTORY_LIMIT,
  LISTINGS_KEY,
  createListingId,
  createListingStore,
  rememberListing,
  removeListing,
  sanitizeListing,
  type KeyValueStore,
} from '../src/storage';

function memory(): KeyValueStore & { dump(): Map<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    dump: () => map,
  };
}

function sample(overrides: Partial<SavedListing> = {}): SavedListing {
  return {
    id: 'kada-1',
    createdAt: '2026-10-13T03:00:00.000Z',
    categoryId: 'banana-chips',
    productName: 'Homemade Banana Chips',
    price: '150',
    phone: '+91 90000 00000',
    confidence: 0.64,
    text: '🍌 Homemade Banana Chips — crispy & fresh',
    ...overrides,
  };
}

describe('listing storage', () => {
  it('round-trips history with the newest listing first', () => {
    const store = createListingStore(memory());
    const older = sample({ id: 'older', createdAt: '2026-10-12T03:00:00.000Z', text: 'older listing' });
    const newer = sample({ id: 'newer', createdAt: '2026-10-13T03:00:00.000Z', text: 'newer listing' });
    store.save(rememberListing(rememberListing([], older), newer));
    expect(store.load().map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('does not persist a photo even if one is attached to the record', () => {
    const raw = memory();
    const store = createListingStore(raw);
    const smuggled = { ...sample(), photo: 'data:image/jpeg;base64,aaaa' } as SavedListing;
    store.save([smuggled]);
    const saved = raw.dump().get(LISTINGS_KEY) ?? '';
    expect(saved).not.toMatch(/photo|blob|data:/i);
    expect(store.load()[0]).toEqual(sample());
    expect(JSON.stringify(sanitizeListing(smuggled))).not.toMatch(/photo|data:/i);
  });

  it('keeps one copy when the latest listing is copied again', () => {
    const first = sample({ id: 'a' });
    const repeat = sample({ id: 'b' });
    const kept = rememberListing([first], repeat);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.id).toBe('a');

    const edited = sample({ id: 'c', price: '200', text: 'edited' });
    expect(rememberListing(kept, edited).map((item) => item.id)).toEqual(['c', 'a']);
  });

  it('replaces a listing with the same id and can remove or clear it', () => {
    const raw = memory();
    const store = createListingStore(raw);
    const updated = rememberListing([sample()], sample({ text: 'rewritten', price: '10' }));
    expect(updated).toHaveLength(1);
    expect(updated[0]?.text).toBe('rewritten');

    store.save(updated);
    store.save(removeListing(store.load(), 'kada-1'));
    expect(store.load()).toEqual([]);

    store.save([sample(), sample({ id: 'other', text: 'second' })]);
    expect(removeListing(store.load(), 'missing')).toHaveLength(2);
    store.clear();
    expect(store.load()).toEqual([]);
    expect(raw.dump().has(LISTINGS_KEY)).toBe(false);
  });

  it('drops corrupt JSON and records that are missing fields', () => {
    const raw = memory();
    const store = createListingStore(raw);
    raw.setItem(LISTINGS_KEY, '{');
    expect(store.load()).toEqual([]);

    raw.setItem(
      LISTINGS_KEY,
      JSON.stringify([
        sample(),
        { id: 'bad', text: 'nope' },
        sample({ id: 'null-score', confidence: null, text: 'unsure' }),
        { ...sample({ id: 'bad-score' }), confidence: 'high' },
      ]),
    );
    expect(store.load().map((item) => item.id)).toEqual(['kada-1', 'null-score']);

    raw.setItem(LISTINGS_KEY, JSON.stringify({ id: 'not-a-list' }));
    expect(store.load()).toEqual([]);
  });

  it('caps saved history at 100 listings', () => {
    let history: SavedListing[] = [];
    for (let index = 0; index < LISTING_HISTORY_LIMIT + 5; index += 1) {
      history = rememberListing(
        history,
        sample({ id: `id-${index}`, text: `listing ${index}`, price: String(index) }),
      );
    }
    expect(history).toHaveLength(LISTING_HISTORY_LIMIT);
    expect(history[0]?.id).toBe(`id-${LISTING_HISTORY_LIMIT + 4}`);
    expect(history.some((item) => item.id === 'id-0')).toBe(false);
  });

  it('builds an id that does not depend on the photo', () => {
    const id = createListingId(1_700_000_000_000, 0.123456789);
    expect(id).toMatch(/^kada-[a-z0-9]+-[a-z0-9]+$/);
    expect(id).not.toMatch(/photo|blob/i);
  });
});

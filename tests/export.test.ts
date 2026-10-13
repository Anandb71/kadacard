import { describe, expect, it } from 'vitest';
import { listingsToCsv, listingsToText } from '../src/export';
import type { SavedListing } from '../src/listing';

function sample(overrides: Partial<SavedListing> = {}): SavedListing {
  return {
    id: 'kada-1',
    createdAt: '2026-10-13T03:00:00.000Z',
    categoryId: 'banana-chips',
    productName: 'Homemade Banana Chips',
    price: '150',
    phone: '+91 90000 00000',
    confidence: 0.64,
    text: '🍌 Homemade Banana Chips — crispy & fresh\nവീട്ടിൽ ഉണ്ടാക്കിയ കായ ചിപ്സ്',
    ...overrides,
  };
}

describe('export', () => {
  it('writes a UTF-8 CSV with a header and quoted listing text', () => {
    const csv = listingsToCsv([
      sample({
        productName: 'Chips, "hot"',
        text: 'line one\nline "two"',
      }),
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const body = csv.slice(1);
    expect(body.startsWith('id,createdAt,categoryId,productName,price,phone,confidence,text\n')).toBe(true);
    expect(body).toContain('"Chips, ""hot"""');
    expect(body).toContain('"line one\nline ""two"""');
    expect(body).toContain(',0.64,');
    expect(body).not.toMatch(/photo|blob|data:/i);
  });

  it('leaves confidence blank when it was not scored and neutralizes formula cells', () => {
    const csv = listingsToCsv([
      sample({
        productName: '=HYPERLINK("http://example.test")',
        phone: '+919000000000',
        confidence: null,
        text: 'plain',
      }),
    ]);
    expect(csv).toContain(`'=HYPERLINK(""http://example.test"")`);
    expect(csv).toContain(",'+919000000000,,plain");
  });

  it('joins listing text with a divider', () => {
    const text = listingsToText([
      sample({ id: 'a', text: 'First listing' }),
      sample({ id: 'b', text: 'Second listing\n' }),
    ]);
    expect(text).toBe('KadaCard listings\n\nFirst listing\n\n---\n\nSecond listing\n');
  });

  it('exports an empty history without inventing listings', () => {
    expect(listingsToText([])).toBe('KadaCard listings\n\n(none yet)\n');
    const csv = listingsToCsv([]);
    expect(csv.slice(1)).toBe('id,createdAt,categoryId,productName,price,phone,confidence,text\n');
  });
});

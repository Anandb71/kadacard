import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../src/catalog';
import { buildListing, createSavedListing, formatPhone, formatPrice } from '../src/listing';

const MALAYALAM = /[\u0D00-\u0D7F]/;

const BANANA_LISTING = `🍌 Homemade Banana Chips — crispy & fresh
വീട്ടിൽ ഉണ്ടാക്കിയ കായ ചിപ്സ് — കുരുകുരുപ്പ്

250g pack · Made in Kochi
Price: ₹___
WhatsApp: ___

#KeralaSnacks #BananaChips #Homemade #Kochi #SupportLocal`;

describe('buildListing', () => {
  it('fills the banana chips WhatsApp template', () => {
    expect(buildListing({ categoryId: 'banana-chips' })).toBe(BANANA_LISTING);
    expect(
      buildListing({
        categoryId: 'banana-chips',
        productName: 'Homemade Banana Chips',
        price: '   ',
        phone: '',
      }),
    ).toBe(BANANA_LISTING);
  });

  it('inserts the seller price and WhatsApp number', () => {
    const text = buildListing({
      categoryId: 'banana-chips',
      price: '150',
      phone: '+91 98470 11111',
    });
    expect(text).toContain('Price: ₹150');
    expect(text).toContain('WhatsApp: +91 98470 11111');
    expect(text).not.toContain('₹___');
  });

  it('uses an edited product name and strips a typed rupee sign', () => {
    const text = buildListing({
      categoryId: 'pickles',
      productName: "Amma's Mango Pickle",
      price: '₹ 80',
      phone: '9847011111',
    });
    expect(text.startsWith("🫙 Amma's Mango Pickle — tangy & fresh\n")).toBe(true);
    expect(text).toContain('വീട്ടിൽ ഉണ്ടാക്കിയ അച്ചാർ — പുളിയും രുചിയും');
    expect(text).toContain('Price: ₹80');
    expect(text).toContain('WhatsApp: 9847011111');
  });

  it('falls back to the category default when the name is blank', () => {
    const text = buildListing({ categoryId: 'spices', productName: '   ' });
    expect(text.startsWith('🌶️ Homemade Spice Mix — aromatic & fresh ground')).toBe(true);
  });

  it('rejects an unknown category', () => {
    expect(() => buildListing({ categoryId: 'outdoor' })).toThrow(/unknown category/i);
  });

  it('writes Malayalam, a price line, and hashtags for every niche', () => {
    for (const category of CATEGORIES) {
      const text = buildListing({ categoryId: category.id, price: '10', phone: '99999 00000' });
      expect(text).toContain(category.emoji);
      expect(text).toContain(category.blurbMl);
      expect(text).toMatch(MALAYALAM);
      expect(text).toContain('Price: ₹10');
      expect(text).toContain('WhatsApp: 99999 00000');
      expect(text).toContain(category.hashtags[0]);
      expect(text.endsWith(category.hashtags.join(' '))).toBe(true);
    }
  });
});

describe('listing fields', () => {
  it('keeps a typed price note and blanks an empty phone', () => {
    expect(formatPrice('150 per kg')).toBe('150 per kg');
    expect(formatPrice('₹200')).toBe('200');
    expect(formatPrice('')).toBe('___');
    expect(formatPhone('  ')).toBe('___');
    expect(formatPhone('+91 90000 00000')).toBe('+91 90000 00000');
  });

  it('stores the rendered listing and the default name, without a photo', () => {
    const saved = createSavedListing({
      id: 'kada-1',
      createdAt: '2026-10-13T03:00:00.000Z',
      categoryId: 'coconut',
      productName: '  ',
      price: '90',
      confidence: 0.64,
    });
    expect(saved.productName).toBe('Kerala Coconut Product');
    expect(saved.text).toBe(
      buildListing({ categoryId: 'coconut', productName: 'Kerala Coconut Product', price: '90', phone: '' }),
    );
    expect(saved.confidence).toBe(0.64);
    expect(JSON.stringify(saved)).not.toMatch(/photo|blob|data:/i);
    expect(createSavedListing({
      id: 'kada-2',
      createdAt: '2026-10-13T03:00:00.000Z',
      categoryId: 'other',
      confidence: 0,
    }).confidence).toBe(0);
  });
});

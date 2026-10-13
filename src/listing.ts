import { categoryById, type Category } from './catalog';

export interface ListingDraft {
  categoryId: string;
  productName?: string;
  price?: string;
  phone?: string;
}

export interface SavedListing {
  id: string;
  createdAt: string;
  categoryId: string;
  productName: string;
  price: string;
  phone: string;
  confidence: number | null;
  text: string;
}

export function formatPrice(raw: string): string {
  const trimmed = raw.trim().replace(/^₹\s*/, '').trim();
  return trimmed || '___';
}

export function formatPhone(raw: string): string {
  const trimmed = raw.trim();
  return trimmed || '___';
}

export function requireCategory(categoryId: string): Category {
  const category = categoryById(categoryId);
  if (!category) throw new Error(`Unknown category: ${categoryId}`);
  return category;
}

/** Bilingual WhatsApp listing. Template text only — no model writes the copy. */
export function buildListing(draft: ListingDraft): string {
  const category = requireCategory(draft.categoryId);
  const name = draft.productName?.trim() || category.defaultName;
  const price = formatPrice(draft.price ?? '');
  const phone = formatPhone(draft.phone ?? '');
  return [
    `${category.emoji} ${name} — ${category.tagline}`,
    category.blurbMl,
    '',
    category.detail,
    `Price: ₹${price}`,
    `WhatsApp: ${phone}`,
    '',
    category.hashtags.join(' '),
  ].join('\n');
}

export function createSavedListing(input: {
  id: string;
  createdAt: string;
  categoryId: string;
  productName?: string;
  price?: string;
  phone?: string;
  confidence?: number | null;
}): SavedListing {
  const category = requireCategory(input.categoryId);
  const productName = input.productName?.trim() || category.defaultName;
  const price = input.price?.trim() ?? '';
  const phone = input.phone?.trim() ?? '';
  const confidence = input.confidence ?? null;
  return {
    id: input.id,
    createdAt: input.createdAt,
    categoryId: category.id,
    productName,
    price,
    phone,
    confidence,
    text: buildListing({ categoryId: category.id, productName, price, phone }),
  };
}

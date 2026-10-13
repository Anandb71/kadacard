import type { SavedListing } from './listing';

const CSV_HEADER = ['id', 'createdAt', 'categoryId', 'productName', 'price', 'phone', 'confidence', 'text'];

export function listingsToCsv(listings: readonly SavedListing[]): string {
  const lines = listings.map((item) =>
    [
      item.id,
      item.createdAt,
      item.categoryId,
      item.productName,
      item.price,
      item.phone,
      item.confidence === null ? '' : String(item.confidence),
      item.text,
    ]
      .map(csvCell)
      .join(','),
  );
  const body = [CSV_HEADER.join(','), ...lines].join('\n');
  return `\uFEFF${body}\n`;
}

export function listingsToText(listings: readonly SavedListing[]): string {
  if (listings.length === 0) return 'KadaCard listings\n\n(none yet)\n';
  const body = listings.map((item) => item.text.trim()).join('\n\n---\n\n');
  return `KadaCard listings\n\n${body}\n`;
}

function csvCell(value: string): string {
  let safe = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/^[=+\-@\t]/.test(safe)) safe = `'${safe}`;
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

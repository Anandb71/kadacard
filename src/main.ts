import {
  CATEGORIES,
  categoryById,
  categoryByPrompt,
  classificationLabels,
  nichePrompts,
  resolveCategoryId,
} from './catalog';
import { createClipClassifier, type ModelProgress } from './clipClassifier';
import {
  classifyPhoto,
  createMockClassifier,
  formatConfidence,
  type ClassifyDecision,
  type ImageClassifier,
  type LabelScore,
} from './classify';
import { listingsToCsv, listingsToText } from './export';
import { buildListing, createSavedListing, type SavedListing } from './listing';
import { preparePhoto } from './photo';
import { createListingId, createListingStore, rememberListing, removeListing } from './storage';

const params = new URLSearchParams(location.search);
const demo = params.get('demo') === '1';
const store = createListingStore(localStorage);

const demoEl = document.querySelector<HTMLElement>('#demo');
const drop = document.querySelector<HTMLElement>('#drop');
const dropCopy = document.querySelector<HTMLElement>('#drop-copy');
const preview = document.querySelector<HTMLImageElement>('#preview');
const takeButton = document.querySelector<HTMLButtonElement>('#take-photo');
const chooseButton = document.querySelector<HTMLButtonElement>('#choose-photo');
const statusEl = document.querySelector<HTMLElement>('#status');
const matchEl = document.querySelector<HTMLElement>('#match');
const matchSummary = document.querySelector<HTMLElement>('#match-summary');
const alternatives = document.querySelector<HTMLElement>('#alternatives');
const categorySelect = document.querySelector<HTMLSelectElement>('#category');
const nameInput = document.querySelector<HTMLInputElement>('#product-name');
const priceInput = document.querySelector<HTMLInputElement>('#price');
const phoneInput = document.querySelector<HTMLInputElement>('#phone');
const previewText = document.querySelector<HTMLTextAreaElement>('#preview-text');
const copyButton = document.querySelector<HTMLButtonElement>('#copy');
const historyEl = document.querySelector<HTMLElement>('#history');
const clearButton = document.querySelector<HTMLButtonElement>('#clear-history');
const exportTextButton = document.querySelector<HTMLButtonElement>('#export-text');
const exportCsvButton = document.querySelector<HTMLButtonElement>('#export-csv');
const camera = document.querySelector<HTMLInputElement>('#camera');
const fileInput = document.querySelector<HTMLInputElement>('#file');

if (
  !demoEl ||
  !drop ||
  !dropCopy ||
  !preview ||
  !takeButton ||
  !chooseButton ||
  !statusEl ||
  !matchEl ||
  !matchSummary ||
  !alternatives ||
  !categorySelect ||
  !nameInput ||
  !priceInput ||
  !phoneInput ||
  !previewText ||
  !copyButton ||
  !historyEl ||
  !clearButton ||
  !exportTextButton ||
  !exportCsvButton ||
  !camera ||
  !fileInput
) {
  throw new Error('KadaCard is missing part of its page.');
}

const status = statusEl;
const categoryField = categorySelect;
const productName = nameInput;
const priceField = priceInput;
const phoneField = phoneInput;
const listingPreview = previewText;
const historyHost = historyEl;
const matchPanel = matchEl;
const matchText = matchSummary;
const altHost = alternatives;
const clearHistory = clearButton;
const takePhoto = takeButton;
const choosePhoto = chooseButton;
const previewImage = preview;
const dropHint = dropCopy;
const copyListing = copyButton;

let listings = store.load();
let lastDecision: ClassifyDecision | null = null;
let lastScores: LabelScore[] = [];
let nameEdited = false;
let categoryTouched = false;
let busy = false;
let requestId = 0;
let previewUrl: string | null = null;
let statusMessage = '';
let copyTimer = 0;

const classifier: ImageClassifier = demo
  ? {
      async classify(image, labels) {
        return createMockClassifier(selectedCategory().prompt).classify(image, labels);
      },
    }
  : createClipClassifier((update) => reportModel(update));

for (const category of CATEGORIES) {
  const option = document.createElement('option');
  option.value = category.id;
  option.textContent = category.name;
  categoryField.append(option);
}

demoEl.hidden = !demo;
if (listings[0]?.phone) phoneField.value = listings[0].phone;
const requestedCategory = params.get('category');
if (requestedCategory && categoryById(requestedCategory)) categoryTouched = true;
setCategory(resolveCategoryId(requestedCategory), false);
renderHistory();
setStatus(
  demo
    ? 'Demo mode is on. Add a photo to fill a sample listing.'
    : 'Add a product photo to suggest a category.',
);

takePhoto.addEventListener('click', () => {
  if (busy) return;
  camera.value = '';
  camera.click();
});

choosePhoto.addEventListener('click', () => {
  if (busy) return;
  fileInput.value = '';
  fileInput.click();
});

drop.addEventListener('click', (event) => {
  if (busy) return;
  if ((event.target as HTMLElement).closest('button')) return;
  fileInput.value = '';
  fileInput.click();
});

drop.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  if (busy) return;
  fileInput.value = '';
  fileInput.click();
});

drop.addEventListener('dragover', (event) => {
  event.preventDefault();
  drop.classList.add('dragover');
});

drop.addEventListener('dragleave', () => {
  drop.classList.remove('dragover');
});

drop.addEventListener('drop', (event) => {
  event.preventDefault();
  drop.classList.remove('dragover');
  const file = event.dataTransfer?.files?.[0];
  if (!file || busy) return;
  void readPhoto(file);
});

camera.addEventListener('change', () => {
  const file = camera.files?.[0];
  if (file) void readPhoto(file);
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) void readPhoto(file);
});

categoryField.addEventListener('change', () => {
  categoryTouched = true;
  setCategory(categoryField.value, nameEdited);
  setStatus(`Category set to ${selectedCategory().name}.`);
});

productName.addEventListener('input', () => {
  nameEdited = productName.value.trim() !== selectedCategory().defaultName;
  renderPreview();
});

priceField.addEventListener('input', renderPreview);
phoneField.addEventListener('input', renderPreview);

copyListing.addEventListener('click', () => {
  void copyCurrentListing();
});

clearHistory.addEventListener('click', () => {
  if (listings.length === 0) {
    setStatus('There are no saved listings on this device.');
    return;
  }
  if (!window.confirm('Remove all saved listings from this device?')) return;
  listings = [];
  store.clear();
  renderHistory();
  setStatus('Saved listings removed from this device.');
});

exportTextButton.addEventListener('click', () => {
  if (listings.length === 0) {
    setStatus('Nothing to export yet.');
    return;
  }
  download('kadacard-listings.txt', listingsToText(listings), 'text/plain;charset=utf-8');
  setStatus('Text file downloaded. It stays on this device.');
});

exportCsvButton.addEventListener('click', () => {
  if (listings.length === 0) {
    setStatus('Nothing to export yet.');
    return;
  }
  download('kadacard-listings.csv', listingsToCsv(listings), 'text/csv;charset=utf-8');
  setStatus('CSV downloaded. It stays on this device.');
});

function selectedCategory() {
  return categoryById(categoryField.value) ?? CATEGORIES[0];
}

function setCategory(id: string, keepCustomName: boolean): void {
  const category = categoryById(resolveCategoryId(id)) ?? CATEGORIES[0];
  categoryField.value = category.id;
  if (!keepCustomName) {
    productName.value = category.defaultName;
    nameEdited = false;
  }
  renderPreview();
  renderMatch();
}

function renderPreview(): void {
  listingPreview.value = buildListing({
    categoryId: selectedCategory().id,
    productName: productName.value,
    price: priceField.value,
    phone: phoneField.value,
  });
}

function renderMatch(): void {
  const decision = lastDecision;
  if (!decision) {
    matchPanel.hidden = true;
    return;
  }
  matchPanel.hidden = false;
  const chosen = selectedCategory();
  const topCategory = decision.topLabel ? categoryByPrompt(decision.topLabel) : undefined;
  let summary = describeDecision(decision);
  if (topCategory && chosen.id !== topCategory.id) {
    summary += ` Listing category: ${chosen.name}.`;
  }
  matchText.textContent = summary;
  altHost.replaceChildren();
  for (const entry of decision.top) {
    const category = categoryByPrompt(entry.label);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    const name = category?.name ?? entry.label;
    button.textContent = `${name} · ${formatConfidence(entry.score)}`;
    button.setAttribute('aria-pressed', category?.id === chosen.id ? 'true' : 'false');
    button.addEventListener('click', () => {
      if (!category) return;
      categoryTouched = true;
      setCategory(category.id, nameEdited);
      setStatus(`Category set to ${category.name}.`);
    });
    altHost.append(button);
  }
}

function describeDecision(decision: ClassifyDecision): string {
  const top = decision.top[0];
  const category = top ? categoryByPrompt(top.label) : undefined;
  const name = category ? `${category.name} (${category.nameMl})` : (top?.label ?? 'Unknown');
  const confidence = formatConfidence(decision.topScore);
  if (!decision.accepted) {
    return `Low confidence. Top guess: ${name}, ${confidence}. Pick the closest category.`;
  }
  if (decision.reason === 'override') {
    return `Top category: ${name} · ${confidence}. Your category choice was confident enough.`;
  }
  return `Top category: ${name} · ${confidence}.`;
}

function renderHistory(): void {
  historyHost.replaceChildren();
  clearHistory.hidden = listings.length === 0;
  if (listings.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No listings saved yet. Copy one and it stays on this device.';
    historyHost.append(empty);
    return;
  }

  for (const item of listings) {
    const card = document.createElement('article');
    card.className = 'history-card';
    const title = document.createElement('h3');
    title.textContent = item.productName;
    const meta = document.createElement('p');
    meta.className = 'meta';
    const category = categoryById(item.categoryId);
    const priceLabel = item.price.trim() ? `₹${item.price.trim()}` : 'Price not set';
    meta.textContent = `${category?.name ?? item.categoryId} · ${priceLabel} · ${formatWhen(item.createdAt)}`;
    const body = document.createElement('p');
    body.className = 'listing-text';
    body.textContent = item.text;
    const actions = document.createElement('div');
    actions.className = 'history-actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.addEventListener('click', () => {
      void copySaved(item);
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      listings = removeListing(listings, item.id);
      store.save(listings);
      renderHistory();
      setStatus('Listing removed from this device.');
    });
    actions.append(copy, remove);
    card.append(title, meta, body, actions);
    historyHost.append(card);
  }
}

async function readPhoto(file: File): Promise<void> {
  if (file.type && !file.type.startsWith('image/')) {
    setStatus('Choose a photo of the product.');
    return;
  }
  const id = ++requestId;
  busy = true;
  takePhoto.disabled = true;
  choosePhoto.disabled = true;
  showPreview(file);
  setStatus(demo ? 'Demo mode is matching a sample category…' : 'Checking the photo on this device…');
  try {
    const image = await safePrepare(file);
    if (id !== requestId) return;
    const selected = selectedCategory();
    const labels = classificationLabels(categoryTouched ? selected.id : null);
    const decision = await classifyPhoto(classifier, image, labels.target, labels.distractors, {
      nicheLabels: nichePrompts(),
      overrideLabel: categoryTouched ? selected.prompt : null,
    });
    if (id !== requestId) return;
    lastDecision = decision;
    lastScores = decision.scores;
    const keepName = nameEdited;
    setCategory(suggestedCategoryId(decision), keepName);
    const prefix = demo ? 'Demo mode. ' : '';
    setStatus(`${prefix}${describeDecision(decision)} Change it if that is not the product.`);
  } catch {
    if (id === requestId) setStatus('The checker could not read that photo. Try another shot.');
  } finally {
    if (id === requestId) {
      busy = false;
      takePhoto.disabled = false;
      choosePhoto.disabled = false;
    }
  }
}

async function safePrepare(file: File): Promise<Blob> {
  try {
    return await preparePhoto(file);
  } catch {
    return file;
  }
}

function suggestedCategoryId(decision: ClassifyDecision): string {
  if (decision.topLabel) {
    const match = categoryByPrompt(decision.topLabel);
    if (match) return match.id;
  }
  return 'other';
}

function showPreview(file: File): void {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  previewImage.src = previewUrl;
  previewImage.alt = 'Product photo. It stays on this device.';
  previewImage.hidden = false;
  dropHint.hidden = true;
}

async function copyCurrentListing(): Promise<void> {
  const category = selectedCategory();
  const entry = createSavedListing({
    id: createListingId(),
    createdAt: new Date().toISOString(),
    categoryId: category.id,
    productName: productName.value,
    price: priceField.value,
    phone: phoneField.value,
    confidence: confidenceFor(category.id),
  });
  listingPreview.value = entry.text;
  const copied = await writeClipboard(entry.text);
  listings = rememberListing(listings, entry);
  store.save(listings);
  renderHistory();
  if (copied) {
    copyListing.textContent = 'Copied';
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyListing.textContent = 'Copy WhatsApp listing';
    }, 1600);
    setStatus('Listing copied. It is text only — no photo.');
    return;
  }
  listingPreview.focus();
  listingPreview.select();
  setStatus('Select the listing and copy it. Nothing was uploaded.');
}

async function copySaved(item: SavedListing): Promise<void> {
  const copied = await writeClipboard(item.text);
  if (copied) {
    setStatus('Saved listing copied. It is text only.');
    return;
  }
  listingPreview.value = item.text;
  listingPreview.focus();
  listingPreview.select();
  setStatus('Select the listing and copy it. Nothing was uploaded.');
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function confidenceFor(categoryId: string): number | null {
  const prompt = categoryById(categoryId)?.prompt;
  if (!prompt) return null;
  const found = lastScores.find((entry) => entry.label === prompt);
  return found ? found.score : null;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function download(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function reportModel(update: ModelProgress): void {
  if (update.status === 'progress' && typeof update.progress === 'number') {
    setStatus(`Saving the on-device checker… ${Math.round(update.progress)}%`);
    return;
  }
  if (update.status === 'ready') {
    setStatus('Checker ready. It stays on this device for next time.');
    return;
  }
  setStatus('Loading the on-device checker. The first visit needs a connection.');
}

function setStatus(message: string): void {
  if (message === statusMessage) return;
  statusMessage = message;
  status.textContent = message;
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js');
  });
}

# KadaCard

KadaCard (കട, a shop) helps a Kerala micro-seller turn a product photo into a WhatsApp listing. Homemade snacks, pickles, spices, coconut products, handloom, bakery, produce, crafts, and oils each have a short bilingual template. The seller types the price and phone number, then copies the text. There is no backend.

## Why open-weight and on-device

The category check is [`Xenova/clip-vit-base-patch32`](https://huggingface.co/Xenova/clip-vit-base-patch32), an ONNX build of CLIP, loaded with [Transformers.js](https://huggingface.co/docs/transformers.js). The weights are open, so the check does not depend on a proprietary vision API, an account, or a server that can see the product photo.

The model is downloaded once and cached in the browser. A small service worker then keeps the app shell available, so later visits can open offline. The first visit still needs a connection to fetch the model.

## Privacy

Photos are read locally, resized in memory, scored on the device, and discarded. They are not uploaded and not written to `localStorage`. A preview during the visit lives only in memory.

What is saved is the listing you copy: category, product name, price, WhatsApp number, the rendered text, and the match score. Export downloads that history as text or CSV on this device.

## Run it

```bash
npm install
npm test
npm run dev
```

Add `?demo=1` to draft a listing without downloading the model. Demo mode is labeled on the page and treats the photo as a confident match for the selected category (banana chips by default). `?demo=1&category=pickles` starts on another niche.

```bash
npm run build
npm run preview
```

`npm run build` typechecks, then builds a static `dist/` folder. The Vite base path is `./`, so the same build works on GitHub Pages under `/kadacard/`.

## How classification works

The photo is scored with zero-shot CLIP against the ten category prompts. The hypothesis is “This is a photo of {}”. Distractors are the other niches in the catalog, not unrelated outdoor labels.

The top label is accepted when it is one of those niches and its score is at least 0.22. If the seller already chose a category, and that same label is the top score at 0.18 or above, the choice is accepted as well. The page always shows the top three scores so the category can be changed before copying.

The listing itself is a template keyed by category. CLIP does not write the Malayalam or the hashtags. Empty price and phone stay as blanks (`₹___` and `___`) until the seller fills them.

## Deploy

Pushing to `main` runs the tests, builds `dist`, and publishes it with GitHub Actions. In the repository settings, set Pages to **GitHub Actions**.

## License

MIT. Copyright 2026 Anand Biju.

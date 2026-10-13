---
title: KadaCard: WhatsApp listings from a product photo, scored offline with open-weight CLIP
published: false
tags: devchallenge, hf26challenge, opensource, ai
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

## What I Built

**KadaCard** (കട means shop) is a small browser tool for Kerala micro-sellers. You photograph what you sell — banana chips, pickle, spices, handloom, bakery — and an open-weight CLIP model running on your phone picks a niche. The app then fills a bilingual English and Malayalam WhatsApp listing template. You type the price and WhatsApp number, tap copy, and paste into WhatsApp Business.

It is aimed at the people I actually see selling from home in Kochi: a neighbour with a jar of mango pickle, someone packing banana chips for Onam orders, a handloom stall that still writes every Instagram caption by hand. They do not need another SaaS account. They need something that works on a phone, keeps product photos private, and costs nothing to run.

There is no backend. Photos are scored in the tab and discarded. Only the listing text you choose to save stays in `localStorage`.

I have not put this in front of a paying user yet. That is next, once the write-up is out.

## Demo

Live: **https://anandb71.github.io/kadacard/**

Add `?demo=1` to try the flow without downloading the model. Demo mode is labeled on the page and uses a sample match.

![Home screen](https://raw.githubusercontent.com/Anandb71/kadacard/main/screenshots/01-home.png)
![Demo listing filled from a banana chips photo](https://raw.githubusercontent.com/Anandb71/kadacard/main/screenshots/02-demo-listing.png)
![Saved listing history](https://raw.githubusercontent.com/Anandb71/kadacard/main/screenshots/03-history.png)

Real model runs on the same fixtures. A mango pickle jar is classified as pickles at 99%. A banana chips pack is classified as banana chips at 100%. A handloom textile is classified as handloom at 100%.

![Real CLIP: pickle jar → Pickles & preserves 99%](https://raw.githubusercontent.com/Anandb71/kadacard/main/screenshots/04-real-clip-pickle.png)
![Real CLIP: banana chips → Banana chips & snacks 100%](https://raw.githubusercontent.com/Anandb71/kadacard/main/screenshots/05-real-clip-chips.png)
![Real CLIP: handloom → Handloom & textiles 100%](https://raw.githubusercontent.com/Anandb71/kadacard/main/screenshots/06-real-clip-handloom.png)

## Code

{% github Anandb71/kadacard %}

## How I Built It

- **Model:** [`Xenova/clip-vit-base-patch32`](https://huggingface.co/Xenova/clip-vit-base-patch32), an ONNX export of open-weight CLIP, run with [transformers.js](https://github.com/huggingface/transformers.js) (`@huggingface/transformers`) on WebAssembly in the browser.
- **Classification:** zero-shot image classification against nine seller niches (banana chips, pickles, spices, coconut, handloom, bakery, produce, crafts, beauty). The manual “other” niche is left for the seller to pick; it is not a CLIP label, so a broad “grocery pack” prompt cannot steal snack matches. A match is accepted when the top niche scores at least 0.22, or when the seller’s chosen category is the top label at 0.18 or above. The UI always shows the top three so you can override.
- **Listing copy:** templates, not generated text. Each niche has an English title pattern, a Malayalam blurb, a short detail line, and hashtags. CLIP only picks the niche. Price and phone stay blank until the seller fills them.
- **Offline:** the model downloads once and is cached. A small service worker caches the app shell.
- **Stack:** Vite, TypeScript, Vitest. 41 unit tests cover the catalog, classify decision, listing builder, storage, and export. `npm run build` is clean. GitHub Actions deploys to Pages.
- **Proof:** I ran the real model both in Node (transformers.js on the fixtures) and in headless Chrome against the built site. First browser check took about 34 seconds including the download; later checks were a couple of seconds.

## Why open innovation matters here

The photos that matter to a small seller are inventory, kitchen counters, and half-finished batches. Those should not leave the phone.

- **Privacy.** A closed vision API would upload every product shot. Here the image is resized in memory, scored on the device, and thrown away. History stores listing text only.
- **Cost.** WhatsApp sellers already live on thin margins. An open-weight model on static hosting means there is no per-image bill and no server for me to keep alive. That is what makes a free or ₹99-side tool realistic.
- **Offline and bad signal.** Many home kitchens and weekly markets have weak data. Cached weights are the only reason the checker can keep working after the first visit.
- **Swap and tune.** The niche prompts and templates are plain code. If someone wants a fish-fry card or a card in Tamil, they can fork it and change the list without waiting on an API vendor.

I build Arbor (getarbor.dev), a PR-native security tool that stays on your side of the network. The same instinct applies here: keep the sensitive bit local, keep the open bits readable.

## What's next

- Show it to one Kochi seller and watch them list five products. I will only claim a first user when that actually happens.
- Let sellers save their own WhatsApp number and default “Made in …” town once.
- Add a couple more niches (seafood fry, flower garlands) if people ask.
- Optional: a tiny fine-tune or prompt pack for Kerala snack packaging, still on-device.

## Prize Categories

None. This is an entry for the overall prize.

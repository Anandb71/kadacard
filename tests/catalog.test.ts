import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  DEFAULT_CATEGORY_ID,
  categoryById,
  categoryByPrompt,
  classificationLabels,
  nichePrompts,
  resolveCategoryId,
} from '../src/catalog';

const MALAYALAM = /[\u0D00-\u0D7F]/;

describe('category catalog', () => {
  it('lists the ten seller niches in a stable order', () => {
    expect(CATEGORIES.map((category) => category.id)).toEqual([
      'banana-chips',
      'pickles',
      'spices',
      'coconut',
      'handloom',
      'bakery',
      'produce',
      'crafts',
      'beauty',
      'other',
    ]);
    expect(new Set(CATEGORIES.map((category) => category.id)).size).toBe(10);
    expect(new Set(CATEGORIES.map((category) => category.prompt)).size).toBe(10);
  });

  it('uses visual product prompts rather than outdoor labels', () => {
    for (const category of CATEGORIES) {
      expect(category.prompt.length).toBeGreaterThan(12);
      expect(category.prompt).not.toMatch(/pinecone|bird|moss|dandelion|puddle/i);
    }
    const clipPrompts = CATEGORIES.filter((c) => c.id !== 'other').map((c) => c.prompt);
    expect(nichePrompts()).toEqual(clipPrompts);
    expect(nichePrompts()).not.toContain(categoryById('other')?.prompt);
  });

  it('gives every niche a bilingual name, emoji, detail, and hashtags', () => {
    for (const category of CATEGORIES) {
      expect(category.name.length).toBeGreaterThan(0);
      expect(category.nameMl).toMatch(MALAYALAM);
      expect(category.blurbMl).toMatch(MALAYALAM);
      expect(category.emoji).not.toBe('');
      expect(category.defaultName.length).toBeGreaterThan(0);
      expect(category.tagline.length).toBeGreaterThan(3);
      expect(category.detail).toContain('·');
      expect(category.hashtags.length).toBeGreaterThanOrEqual(4);
      for (const tag of category.hashtags) {
        expect(tag).toMatch(/^#[A-Za-z0-9]+$/);
      }
    }
  });

  it('resolves a known id and falls back to banana chips', () => {
    expect(resolveCategoryId('pickles')).toBe('pickles');
    expect(resolveCategoryId('nope')).toBe(DEFAULT_CATEGORY_ID);
    expect(resolveCategoryId(null)).toBe('banana-chips');
    expect(resolveCategoryId(undefined)).toBe('banana-chips');
    expect(categoryById('coconut')?.nameMl).toBe('തേങ്ങ');
    expect(categoryByPrompt('a bottle of hair oil or skin oil')?.id).toBe('beauty');
    expect(categoryById('missing')).toBeUndefined();
  });

  it('builds distractors from clip niches and skips the manual other niche', () => {
    const clipCount = CATEGORIES.filter((c) => c.id !== 'other').length;
    const { target, distractors } = classificationLabels();
    expect(target).toBe(CATEGORIES[0]?.prompt);
    expect(distractors).toHaveLength(clipCount - 1);
    expect(distractors).not.toContain(target);
    expect(distractors).not.toContain(categoryById('other')?.prompt);
    expect(new Set([target, ...distractors]).size).toBe(clipCount);
    expect(distractors.join(' ')).not.toMatch(/pinecone|park bench|wild bird/i);
    for (const label of distractors) {
      expect(CATEGORIES.some((category) => category.prompt === label)).toBe(true);
    }
  });

  it('puts an override category first and leaves it out of the distractors', () => {
    const pickles = categoryById('pickles');
    const { target, distractors } = classificationLabels('pickles');
    expect(target).toBe(pickles?.prompt);
    expect(distractors).not.toContain(target);
    expect(distractors).toHaveLength(8);
    expect(classificationLabels('not-a-niche').target).toBe(CATEGORIES[0]?.prompt);
  });
});

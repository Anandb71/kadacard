import { describe, expect, it } from 'vitest';
import {
  NICHE_SCORE_THRESHOLD,
  OVERRIDE_SCORE_THRESHOLD,
  classifyPhoto,
  createMockClassifier,
  decideClassification,
  formatConfidence,
  type ImageClassifier,
  type LabelScore,
} from '../src/classify';
import { categoryById, nichePrompts } from '../src/catalog';

const photo = new Blob(['not-a-real-image'], { type: 'image/jpeg' });
const niches = nichePrompts();
const chips = categoryById('banana-chips')?.prompt ?? '';
const pickle = categoryById('pickles')?.prompt ?? '';
const spice = categoryById('spices')?.prompt ?? '';

function scores(entries: Record<string, number>): LabelScore[] {
  return Object.entries(entries).map(([label, score]) => ({ label, score }));
}

describe('decideClassification', () => {
  it('accepts a niche when the top score meets 0.22', () => {
    const decision = decideClassification(scores({ [spice]: 0.1, [chips]: NICHE_SCORE_THRESHOLD }), {
      nicheLabels: niches,
    });
    expect(decision.accepted).toBe(true);
    expect(decision.reason).toBe('niche');
    expect(decision.topLabel).toBe(chips);
    expect(decision.topScore).toBe(NICHE_SCORE_THRESHOLD);
  });

  it('rejects a niche just under 0.22 when there is no override', () => {
    const decision = decideClassification(scores({ [chips]: NICHE_SCORE_THRESHOLD - 0.001, [spice]: 0.05 }), {
      nicheLabels: niches,
    });
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('reject');
    expect(decision.topLabel).toBe(chips);
  });

  it('accepts an override match at 0.18 even when it is under the niche threshold', () => {
    const decision = decideClassification(scores({ [pickle]: OVERRIDE_SCORE_THRESHOLD, [spice]: 0.05 }), {
      nicheLabels: niches,
      overrideLabel: pickle,
    });
    expect(decision.accepted).toBe(true);
    expect(decision.reason).toBe('override');
    expect(decision.topScore).toBe(0.18);
  });

  it('rejects an override match below 0.18', () => {
    const decision = decideClassification(scores({ [pickle]: 0.179, [spice]: 0.01 }), {
      nicheLabels: niches,
      overrideLabel: pickle,
    });
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('reject');
  });

  it('keeps a strong niche match when the override is a different label', () => {
    const decision = decideClassification(scores({ [spice]: 0.51, [pickle]: 0.2 }), {
      nicheLabels: niches,
      overrideLabel: pickle,
    });
    expect(decision.accepted).toBe(true);
    expect(decision.reason).toBe('niche');
    expect(decision.topLabel).toBe(spice);
  });

  it('does not accept an override that is not the top label', () => {
    const decision = decideClassification(scores({ [spice]: 0.21, [pickle]: 0.19 }), {
      nicheLabels: niches,
      overrideLabel: pickle,
    });
    expect(decision.accepted).toBe(false);
    expect(decision.topLabel).toBe(spice);
    expect(decision.top.map((entry) => entry.label)).toEqual([spice, pickle]);
  });

  it('rejects a high score that is not one of our niches', () => {
    const decision = decideClassification(scores({ 'a pinecone on the ground': 0.91, [chips]: 0.04 }), {
      nicheLabels: niches,
    });
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('reject');
    expect(decision.topLabel).toBe('a pinecone on the ground');
  });

  it('accepts a non-niche top label when it is the override and clears 0.18', () => {
    const decision = decideClassification(scores({ 'seller chosen label': 0.2, [chips]: 0.05 }), {
      nicheLabels: niches,
      overrideLabel: 'seller chosen label',
    });
    expect(decision.accepted).toBe(true);
    expect(decision.reason).toBe('override');
  });

  it('rejects an empty score list', () => {
    expect(decideClassification([], { nicheLabels: niches })).toEqual({
      accepted: false,
      reason: 'reject',
      topLabel: null,
      topScore: 0,
      top: [],
      scores: [],
    });
  });

  it('returns the top three labels without mutating the input', () => {
    const input = scores({
      a: 0.1,
      b: 0.4,
      c: 0.05,
      d: 0.3,
      e: 0.2,
    });
    const snapshot = input.map((entry) => ({ ...entry }));
    const decision = decideClassification(input, { nicheLabels: ['b', 'd', 'e', 'a', 'c'] });
    expect(input).toEqual(snapshot);
    expect(decision.top).toEqual([
      { label: 'b', score: 0.4 },
      { label: 'd', score: 0.3 },
      { label: 'e', score: 0.2 },
    ]);
    expect(decision.scores).toHaveLength(5);
    expect(decision.reason).toBe('niche');
  });

  it('breaks equal scores by label so the result is stable', () => {
    const decision = decideClassification(
      scores({ spices: 0.3, pickles: 0.3, chips: 0.3 }),
      { nicheLabels: ['chips', 'pickles', 'spices'] },
    );
    expect(decision.topLabel).toBe('chips');
    expect(decision.top.map((entry) => entry.label)).toEqual(['chips', 'pickles', 'spices']);
  });
});

describe('classifyPhoto', () => {
  it('asks for the target and distractors, then applies the niche rule', async () => {
    const seen: string[][] = [];
    const classifier: ImageClassifier = {
      async classify(_image, labels) {
        seen.push(labels);
        return labels.map((label) => ({
          label,
          score: label === pickle ? 0.64 : 0.04,
        }));
      },
    };

    const decision = await classifyPhoto(classifier, photo, pickle, [pickle, spice, chips], {
      nicheLabels: niches,
    });

    expect(seen).toEqual([[pickle, spice, chips]]);
    expect(decision.accepted).toBe(true);
    expect(decision.reason).toBe('niche');
    expect(decision.topLabel).toBe(pickle);
  });

  it('rejects when another label wins and the override does not match it', async () => {
    const classifier: ImageClassifier = {
      async classify(_image, labels) {
        return labels.map((label) => ({
          label,
          score: label === spice ? 0.2 : 0.04,
        }));
      },
    };

    const decision = await classifyPhoto(classifier, photo, pickle, [spice], {
      nicheLabels: niches,
      overrideLabel: pickle,
    });

    expect(decision.accepted).toBe(false);
    expect(decision.topLabel).toBe(spice);
    expect(decision.topScore).toBe(0.2);
  });
});

describe('createMockClassifier', () => {
  it('fakes a confident match for the chosen category', async () => {
    const labels = [chips, pickle, spice];
    const result = await createMockClassifier(pickle).classify(photo, labels);
    const decision = decideClassification(result, { nicheLabels: labels });
    expect(decision.accepted).toBe(true);
    expect(decision.topLabel).toBe(pickle);
    expect(decision.topScore).toBeGreaterThanOrEqual(NICHE_SCORE_THRESHOLD);
    const rest = result.filter((entry) => entry.label !== pickle);
    expect(rest.every((entry) => entry.score < decision.topScore)).toBe(true);
  });

  it('falls back to the first label when the preferred one is absent', async () => {
    const result = await createMockClassifier('missing').classify(photo, [spice, chips]);
    expect(result[0]).toEqual({ label: spice, score: 0.86 });
    expect(result[1]?.score).toBeLessThan(0.22);
  });

  it('formats confidence as a rounded percent', () => {
    expect(formatConfidence(0.86)).toBe('86%');
    expect(formatConfidence(0.224)).toBe('22%');
    expect(formatConfidence(0.226)).toBe('23%');
    expect(formatConfidence(Number.NaN)).toBe('0%');
  });
});

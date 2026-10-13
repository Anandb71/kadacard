export const NICHE_SCORE_THRESHOLD = 0.22;
export const OVERRIDE_SCORE_THRESHOLD = 0.18;
export const TOP_LABEL_COUNT = 3;

export const CLIP_MODEL_ID = 'Xenova/clip-vit-base-patch32';

export interface LabelScore {
  label: string;
  score: number;
}

export interface ImageClassifier {
  classify(image: Blob, labels: string[]): Promise<LabelScore[]>;
}

export type ClassifyReason = 'niche' | 'override' | 'reject';

export interface ClassifyDecision {
  accepted: boolean;
  reason: ClassifyReason;
  topLabel: string | null;
  topScore: number;
  top: LabelScore[];
  scores: LabelScore[];
}

export interface ClassifyOptions {
  nicheLabels?: readonly string[];
  overrideLabel?: string | null;
}

export function formatConfidence(score: number): string {
  if (!Number.isFinite(score)) return '0%';
  return `${Math.round(score * 100)}%`;
}

function sortedScores(scores: readonly LabelScore[]): LabelScore[] {
  return scores
    .slice()
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
}

/**
 * Accept the top label when it is a known niche at or above 0.22.
 * Otherwise accept it when it matches the seller's override and scores at least 0.18.
 * Always return the top three labels for the picker.
 */
export function decideClassification(
  scores: readonly LabelScore[],
  options: ClassifyOptions = {},
): ClassifyDecision {
  const sorted = sortedScores(scores);
  const top = sorted.slice(0, TOP_LABEL_COUNT);
  const best = sorted[0];
  if (!best) {
    return {
      accepted: false,
      reason: 'reject',
      topLabel: null,
      topScore: 0,
      top,
      scores: sorted,
    };
  }

  const niches = new Set(options.nicheLabels ?? []);
  const override = options.overrideLabel ?? null;
  const nicheHit = niches.has(best.label) && best.score >= NICHE_SCORE_THRESHOLD;
  const overrideHit = override !== null && best.label === override && best.score >= OVERRIDE_SCORE_THRESHOLD;

  if (nicheHit) {
    return {
      accepted: true,
      reason: 'niche',
      topLabel: best.label,
      topScore: best.score,
      top,
      scores: sorted,
    };
  }
  if (overrideHit) {
    return {
      accepted: true,
      reason: 'override',
      topLabel: best.label,
      topScore: best.score,
      top,
      scores: sorted,
    };
  }
  return {
    accepted: false,
    reason: 'reject',
    topLabel: best.label,
    topScore: best.score,
    top,
    scores: sorted,
  };
}

export async function classifyPhoto(
  classifier: ImageClassifier,
  image: Blob,
  targetLabel: string,
  distractors: readonly string[],
  options: ClassifyOptions = {},
): Promise<ClassifyDecision> {
  const labels = [targetLabel, ...distractors.filter((label) => label !== targetLabel)];
  const scores = await classifier.classify(image, labels);
  const nicheLabels = options.nicheLabels ?? labels;
  return decideClassification(scores, {
    nicheLabels,
    overrideLabel: options.overrideLabel ?? null,
  });
}

/** Stand-in checker for `?demo=1`. One chosen label is a confident match. */
export function createMockClassifier(preferredLabel?: string): ImageClassifier {
  return {
    async classify(_image, labels) {
      const chosen = preferredLabel && labels.includes(preferredLabel) ? preferredLabel : labels[0];
      const others = Math.max(labels.length - 1, 1);
      return labels.map((label) => ({
        label,
        score: label === chosen ? 0.86 : 0.14 / others,
      }));
    },
  };
}

import { CLIP_MODEL_ID, type ImageClassifier, type LabelScore } from './classify';

export interface ModelProgress {
  status: string;
  progress?: number;
  file?: string;
}

type ZeroShotOutput = Array<{ label: string; score: number }>;

type ZeroShotClassifier = (
  image: string,
  labels: string[],
  options?: { hypothesis_template?: string },
) => Promise<ZeroShotOutput | ZeroShotOutput[]>;

let loading: Promise<ZeroShotClassifier> | null = null;

export function createClipClassifier(onProgress?: (update: ModelProgress) => void): ImageClassifier {
  return {
    async classify(image, labels) {
      const classifier = await loadClip(onProgress);
      const url = URL.createObjectURL(image);
      try {
        const result = await classifier(url, labels, {
          hypothesis_template: 'This is a photo of {}',
        });
        return normalizeScores(result);
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  };
}

async function loadClip(onProgress?: (update: ModelProgress) => void): Promise<ZeroShotClassifier> {
  if (!loading) {
    loading = startClip(onProgress).catch((error: unknown) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

async function startClip(onProgress?: (update: ModelProgress) => void): Promise<ZeroShotClassifier> {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  const wasm = env.backends.onnx.wasm;
  if (wasm) wasm.numThreads = 1;

  const classifier = await pipeline('zero-shot-image-classification', CLIP_MODEL_ID, {
    progress_callback: (info) => {
      onProgress?.({
        status: info.status,
        progress: 'progress' in info ? info.progress : undefined,
        file: 'file' in info ? info.file : undefined,
      });
    },
  });

  return classifier as unknown as ZeroShotClassifier;
}

function normalizeScores(result: ZeroShotOutput | ZeroShotOutput[]): LabelScore[] {
  const rows = Array.isArray(result)
    ? result.length > 0 && Array.isArray(result[0])
      ? result[0]
      : (result as ZeroShotOutput)
    : [];
  return rows.map((entry) => ({ label: String(entry.label), score: Number(entry.score) }));
}

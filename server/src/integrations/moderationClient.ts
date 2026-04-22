import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';
import { createCanvas, loadImage } from 'canvas';
import { env } from '../config/env';

let nsfwModel: nsfwjs.NSFWJS | null = null;

async function getNsfwModel(): Promise<nsfwjs.NSFWJS> {
  if (!nsfwModel) {
    nsfwModel = await nsfwjs.load();
  }
  return nsfwModel;
}

export interface ModerationResult {
  score: number;
  categories: Array<{ name: string; score: number }>;
  flagged: boolean;
}

export async function moderateImage(imageBuffer: Buffer): Promise<ModerationResult> {
  const model = await getNsfwModel();
  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img as unknown as CanvasImageSource, 0, 0);

  const predictions = await model.classify(canvas as unknown as HTMLCanvasElement);
  const harmful = predictions
    .filter((p) => ['Porn', 'Sexy', 'Hentai'].includes(p.className))
    .reduce((sum, p) => sum + p.probability, 0);

  const categories = predictions.map((p) => ({
    name: p.className,
    score: p.probability,
  }));

  return {
    score: harmful,
    categories,
    flagged: harmful > 0.30,
  };
}

export async function moderateText(text: string): Promise<ModerationResult> {
  if (!env.HUGGINGFACE_API_KEY) {
    // Keyword-based fallback when no API key configured
    return keywordModeration(text);
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/unitary/toxic-bert',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) return keywordModeration(text);

    const data = (await response.json()) as Array<Array<{ label: string; score: number }>>;
    const labels = data[0] ?? [];
    const toxicScore = labels.find((l) => l.label === 'toxic')?.score ?? 0;
    const categories = labels.map((l) => ({ name: l.label, score: l.score }));

    return { score: toxicScore, categories, flagged: toxicScore > 0.5 };
  } catch {
    return keywordModeration(text);
  }
}

const KEYWORD_BLOCKLIST = [
  'kms', 'kill yourself', 'suicide', 'rape', 'n word',
];

function keywordModeration(text: string): ModerationResult {
  const lower = text.toLowerCase();
  const matched = KEYWORD_BLOCKLIST.some((kw) => lower.includes(kw));
  return {
    score: matched ? 0.95 : 0,
    categories: [{ name: 'keyword_match', score: matched ? 1 : 0 }],
    flagged: matched,
  };
}

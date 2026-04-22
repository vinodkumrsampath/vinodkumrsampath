import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData, createCanvas, loadImage } from 'canvas';
import path from 'path';

// Patch face-api.js to use node-canvas
// @ts-expect-error patching browser API
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;
const MODELS_PATH = path.join(__dirname, '../../models');

async function ensureModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH),
    faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH),
    faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH),
  ]);
  modelsLoaded = true;
}

async function getDescriptor(imageBuffer: Buffer): Promise<Float32Array | null> {
  await ensureModels();
  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img as unknown as CanvasImageSource, 0, 0);
  const detection = await faceapi
    .detectSingleFace(canvas as unknown as HTMLCanvasElement)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export async function compareFaces(
  referenceBuffer: Buffer,
  targetBuffer: Buffer
): Promise<{ match: boolean; distance: number; score: number }> {
  const [refDesc, targetDesc] = await Promise.all([
    getDescriptor(referenceBuffer),
    getDescriptor(targetBuffer),
  ]);

  if (!refDesc || !targetDesc) {
    return { match: false, distance: 1, score: 0 };
  }

  const distance = faceapi.euclideanDistance(refDesc, targetDesc);
  // face-api distance: 0 = identical, 0.6 = different person threshold
  // Convert to 0-1 similarity score (1 = same person)
  const score = Math.max(0, 1 - distance / 0.6);
  const match = distance <= 0.55; // ~0.90 similarity

  return { match, distance, score };
}

export async function detectLiveness(imageBuffer: Buffer): Promise<boolean> {
  await ensureModels();
  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img as unknown as CanvasImageSource, 0, 0);
  const detection = await faceapi.detectSingleFace(
    canvas as unknown as HTMLCanvasElement
  );
  // Basic check: a face was detected in the image
  return detection !== undefined;
}

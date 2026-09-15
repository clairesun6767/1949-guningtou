import type { HistoricalAerialQualityMetadata } from './historicalAerialDataset.js';

export interface HistoricalAerialPixelAnalysisOptions {
  width: number;
  height: number;
  channels?: number;
  sampleStride?: number;
}

export interface HistoricalAerialQualitySummary {
  sharpness: number;
  contrast: number;
  entropy: number;
  alphaValidRatio: number;
  informationDensity: number;
  validPixelRatio: number;
  sampleCount: number;
}

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function meanAndDeviation(values: number[]) {
  if (values.length === 0) return { mean: 0, deviation: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, deviation: Math.sqrt(variance) };
}

export function calculateShannonEntropy(histogram: ArrayLike<number>, sampleCount = Array.from(histogram).reduce((sum, value) => sum + value, 0)) {
  if (!sampleCount) return 0;
  return Array.from(histogram).reduce((entropy, count) => {
    if (!count) return entropy;
    const probability = count / sampleCount;
    return entropy - probability * Math.log2(probability);
  }, 0);
}

export function analyzeHistoricalAerialPixels(
  pixels: ArrayLike<number>,
  options: HistoricalAerialPixelAnalysisOptions,
): HistoricalAerialQualitySummary {
  const width = Math.max(1, Math.floor(options.width));
  const height = Math.max(1, Math.floor(options.height));
  const channels = Math.max(1, Math.floor(options.channels ?? 4));
  const stride = Math.max(1, Math.floor(options.sampleStride ?? Math.max(1, Math.ceil(Math.sqrt((width * height) / 750_000)))));
  const grayscale = new Map<string, number>();
  const values: number[] = [];
  const histogram = new Uint32Array(32);
  let alphaValid = 0;
  let valid = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const sourceIndex = (y * width + x) * channels;
      const red = Number(pixels[sourceIndex] ?? 0);
      const green = Number(pixels[sourceIndex + Math.min(1, channels - 1)] ?? red);
      const blue = Number(pixels[sourceIndex + Math.min(2, channels - 1)] ?? green);
      const alpha = channels >= 4 ? Number(pixels[sourceIndex + 3] ?? 255) : 255;
      const alphaIsValid = alpha > 8;
      if (alphaIsValid) alphaValid += 1;
      const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
      const isNoData = alpha <= 8 || (red <= 1 && green <= 1 && blue <= 1 && alpha < 250);
      if (!isNoData) {
        valid += 1;
        values.push(luminance);
        histogram[Math.min(histogram.length - 1, Math.floor(luminance * histogram.length))] += 1;
      }
      grayscale.set(`${x},${y}`, luminance);
    }
  }
  let laplacianEnergy = 0;
  let laplacianSamples = 0;
  for (let y = stride; y < height - stride; y += stride) {
    for (let x = stride; x < width - stride; x += stride) {
      const center = grayscale.get(`${x},${y}`);
      const left = grayscale.get(`${x - stride},${y}`);
      const right = grayscale.get(`${x + stride},${y}`);
      const up = grayscale.get(`${x},${y - stride}`);
      const down = grayscale.get(`${x},${y + stride}`);
      if ([center, left, right, up, down].some(value => value === undefined)) continue;
      laplacianEnergy += Math.abs((left! + right! + up! + down!) - center! * 4);
      laplacianSamples += 1;
    }
  }
  const statistics = meanAndDeviation(values);
  const entropy = calculateShannonEntropy(histogram, valid);
  return {
    sharpness: clamp01((laplacianEnergy / Math.max(1, laplacianSamples)) * 3.2),
    contrast: clamp01(statistics.deviation * 2.6),
    entropy: clamp01(entropy / 5),
    alphaValidRatio: clamp01(alphaValid / Math.max(1, Math.ceil(width / stride) * Math.ceil(height / stride))),
    informationDensity: clamp01((statistics.deviation * 1.35 + entropy / 5) / 1.7),
    validPixelRatio: clamp01(valid / Math.max(1, Math.ceil(width / stride) * Math.ceil(height / stride))),
    sampleCount: valid,
  };
}

export function normalizeHistoricalAerialQuality(summary: HistoricalAerialQualitySummary, minScore = 0, maxScore = 1): HistoricalAerialQualityMetadata {
  const raw = summary.sharpness * 0.3
    + summary.contrast * 0.18
    + summary.entropy * 0.16
    + summary.alphaValidRatio * 0.1
    + summary.informationDensity * 0.16
    + summary.validPixelRatio * 0.1;
  const score = maxScore > minScore ? (raw - minScore) / (maxScore - minScore) : raw;
  return {
    ...summary,
    normalizedScore: clamp01(score),
    confidence: 'measured-local-poc',
    measuredAt: new Date().toISOString().slice(0, 10),
  };
}

export function normalizeHistoricalAerialQualitySet(summaries: Record<string, HistoricalAerialQualitySummary>) {
  const rawScores = Object.values(summaries).map(summary => summary.sharpness * 0.3
    + summary.contrast * 0.18
    + summary.entropy * 0.16
    + summary.alphaValidRatio * 0.1
    + summary.informationDensity * 0.16
    + summary.validPixelRatio * 0.1);
  const minScore = rawScores.length ? Math.min(...rawScores) : 0;
  const maxScore = rawScores.length ? Math.max(...rawScores) : 1;
  return Object.fromEntries(Object.entries(summaries).map(([key, summary]) => [key, normalizeHistoricalAerialQuality(summary, minScore, maxScore)]));
}

export function qualityFromManifest(input: Partial<HistoricalAerialQualityMetadata>): HistoricalAerialQualityMetadata {
  return {
    normalizedScore: clamp01(input.normalizedScore ?? 0),
    sharpness: clamp01(input.sharpness ?? 0),
    contrast: clamp01(input.contrast ?? 0),
    entropy: clamp01(input.entropy ?? 0),
    alphaValidRatio: clamp01(input.alphaValidRatio ?? 0),
    informationDensity: clamp01(input.informationDensity ?? 0),
    validPixelRatio: clamp01(input.validPixelRatio ?? 0),
    sampleCount: Math.max(0, Math.floor(input.sampleCount ?? 0)),
    confidence: input.confidence ?? 'unmeasured',
    measuredAt: input.measuredAt,
  };
}

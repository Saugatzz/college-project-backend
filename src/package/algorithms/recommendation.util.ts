// src/package/algorithms/recommendation.util.ts
//
// Content-Based Recommendation Engine — Cosine Similarity
// ---------------------------------------------------------------------------
// Every tour package is converted into a numeric feature vector built from
// exactly four signals — the ones that actually determine whether two tours
// are "the same kind of trip":
//
//   - price       (normalised numeric)
//   - days        (normalised numeric)
//   - difficulty  (one-hot categorical: Easy / Moderate / Challenging / etc.)
//   - category    (one-hot categorical: Trekking / Sightseeing / etc.)
//
// Rating, location, and boolean flags (familyFriendly, freeCancellation)
// were removed on purpose — they were either near-constant across the
// catalog (rating defaults to 5.0 for every new tour) or just noise for
// this comparison, and were manufacturing false similarity between tours
// that have nothing in common (e.g. a Kathmandu Valley city tour scoring
// close to Langtang/EBC instead of Chitlang).
//
// Two tours are then compared using the Cosine Similarity measure:
//
//                A . B
//   sim(A, B) = -------
//               ||A|| ||B||
//
// which yields a value in [0, 1] — 1 meaning the tours are (feature-wise)
// identical and 0 meaning they share nothing in common.
// ---------------------------------------------------------------------------

import { Package } from 'src/entities/package.entity';

export interface ScoredPackage {
  package: Package;
  score: number;
}

/** Builds a { min, max } range for a numeric array, guarding against empty input. */
function range(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Min-max normalisation into [0, 1].
 *
 * When every value in the catalog is identical (max === min), the feature
 * carries zero information, so it contributes 0 rather than a "neutral"
 * 0.5 — a constant value here would give every pair of tours a free,
 * fake similarity boost on that dimension.
 */
function normalize(value: number, r: { min: number; max: number }): number {
  if (r.max === r.min) return 0;
  return (value - r.min) / (r.max - r.min);
}

function uniqueValues(packages: Package[], select: (p: Package) => string | undefined): string[] {
  return Array.from(
    new Set(packages.map((p) => (select(p) ?? '').trim().toLowerCase()).filter(Boolean)),
  );
}

function oneHot(value: string | undefined, universe: string[]): number[] {
  const v = (value ?? '').trim().toLowerCase();
  return universe.map((u) => (u === v ? 1 : 0));
}

/**
 * Builds a normalised feature vector for every package in the supplied list,
 * using only price, days, difficulty, and category. The vector space
 * (min/max ranges, one-hot universes) is derived from the list itself, so
 * callers should pass the full comparison set (target + candidates) to get
 * consistent, comparable vectors.
 */
export function buildFeatureVectors(packages: Package[]): Map<number, number[]> {
  const difficulties = uniqueValues(packages, (p) => p.difficulty);
  const categories = uniqueValues(packages, (p) => p.category);

  const priceRange = range(packages.map((p) => Number(p.price)));
  const daysRange = range(packages.map((p) => Number(p.days)));

  const vectors = new Map<number, number[]>();

  for (const p of packages) {
    const vec: number[] = [
      // Price and duration are the strongest numeric signals of "how big
      // a trip is" — kept at equal weight so neither dominates.
      normalize(Number(p.price), priceRange),
      normalize(Number(p.days), daysRange),

      // Difficulty is the strongest single proxy for "comparable
      // experience" — weighted highest so an Easy city tour and a
      // Moderate/Challenging multi-day trek clearly separate.
      ...oneHot(p.difficulty, difficulties).map((v) => v * 2.0),

      // Category groups tours by type (Trekking vs Sightseeing, etc.).
      ...oneHot(p.category, categories).map((v) => v * 1.5),
    ];
    vectors.set(p.id, vec);
  }

  return vectors;
}

/** Cosine similarity between two equal-length numeric vectors. Returns a value in [0, 1]. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Ranks `candidates` by how similar they are to `target`, using cosine
 * similarity over price/days/difficulty/category, and returns the top
 * `limit` matches (highest similarity first). Candidates below `minScore`
 * are excluded entirely — with a small catalog, this prevents unrelated
 * tours from appearing just to fill the limit.
 *
 * Time complexity: O(n * d) to build vectors + O(n log n) to sort, where
 * n = number of candidate packages and d = feature vector dimensionality.
 */
export function rankSimilarPackages(
  target: Package,
  candidates: Package[],
  limit = 3,
  minScore = 0.35,
): ScoredPackage[] {
  const others = candidates.filter((c) => c.id !== target.id);
  const vectors = buildFeatureVectors([target, ...others]);
  const targetVec = vectors.get(target.id)!;

  const scored: ScoredPackage[] = others.map((c) => ({
    package: c,
    score: cosineSimilarity(targetVec, vectors.get(c.id)!),
  }));

  return scored
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
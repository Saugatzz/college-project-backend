// src/package/algorithms/recommendation.util.ts
//
// Content-Based Recommendation Engine — Cosine Similarity
// ---------------------------------------------------------------------------
// Every tour package is converted into a numeric feature vector built from:
//   - normalised numeric attributes  (price, duration, rating)
//   - one-hot encoded categorical attributes (category, difficulty, location)
//   - boolean attributes (familyFriendly, freeCancellation)
//
// Two tours are then compared using the Cosine Similarity measure:
//
//                A . B
//   sim(A, B) = -------
//               ||A|| ||B||
//
// which yields a value in [0, 1] — 1 meaning the tours are (feature-wise)
// identical and 0 meaning they share nothing in common. Because every
// feature is normalised to the same [0, 1] scale before comparison, no
// single field (e.g. price) is able to dominate the similarity score.
//
// This is the same technique used by "content-based filtering" recommender
// systems (e.g. recommending similar articles/products based on their
// attributes rather than other users' behaviour), which avoids the
// "cold start" problem that user-based/collaborative filtering suffers
// from when a tour is new and has no bookings yet.
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

/** Min-max normalisation into [0, 1]. Returns 0.5 (neutral) when all values are equal. */
function normalize(value: number, r: { min: number; max: number }): number {
  if (r.max === r.min) return 0.5;
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
 * Builds a normalised feature vector for every package in the supplied list.
 * The vector space (min/max ranges, one-hot universes) is derived from the
 * list itself, so callers should pass the full comparison set (target +
 * candidates) to get consistent, comparable vectors.
 */
export function buildFeatureVectors(packages: Package[]): Map<number, number[]> {
  const categories = uniqueValues(packages, (p) => p.category);
  const difficulties = uniqueValues(packages, (p) => p.difficulty);
  const locations = uniqueValues(packages, (p) => p.location);

  const priceRange = range(packages.map((p) => Number(p.price)));
  const daysRange = range(packages.map((p) => Number(p.days)));
  const ratingRange = range(packages.map((p) => Number(p.rating)));

  const vectors = new Map<number, number[]>();

  for (const p of packages) {
    const vec: number[] = [
      // Numeric features — weighted slightly higher (1.5x) since price is
      // usually the strongest signal of "similar kind of trip".
      normalize(Number(p.price), priceRange) * 1.5,
      normalize(Number(p.days), daysRange),
      normalize(Number(p.rating), ratingRange),
      // Boolean features
      p.familyFriendly ? 1 : 0,
      p.freeCancellation ? 1 : 0,
      // One-hot categorical features
      ...oneHot(p.category, categories),
      ...oneHot(p.difficulty, difficulties),
      ...oneHot(p.location, locations),
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
 * similarity over the feature vectors described above, and returns the
 * top `limit` matches (highest similarity first).
 *
 * Time complexity: O(n * d) to build vectors + O(n log n) to sort, where
 * n = number of candidate packages and d = feature vector dimensionality.
 */
export function rankSimilarPackages(
  target: Package,
  candidates: Package[],
  limit = 3,
): ScoredPackage[] {
  const others = candidates.filter((c) => c.id !== target.id);
  const vectors = buildFeatureVectors([target, ...others]);
  const targetVec = vectors.get(target.id)!;

  const scored: ScoredPackage[] = others.map((c) => ({
    package: c,
    score: cosineSimilarity(targetVec, vectors.get(c.id)!),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// src/package/algorithms/recommendation.util.ts
//
// Content-Based Recommendation Engine — Category-Gated Feature Similarity
// ---------------------------------------------------------------------------
// "Similar tours" means, first and foremost, *the same kind of trip*. A
// $150 2-day Sightseeing tour and a $150 2-day Trekking tour are not
// similar just because their price/duration/difficulty happen to line up —
// they're different products entirely.
//
// ── What changed from the previous weighted-average version ──────────────
// The previous version scored category as just one of four weighted
// features (20%). That let category-mismatched tours still clear the
// similarity bar: e.g. identical difficulty (0.30) + close price/days
// (up to 0.50) already sums to 0.80 — comfortably above minScore = 0.45 —
// with ZERO category overlap. In practice this surfaced wildly
// unrelated tours as "similar."
//
// Fix: category is now a hard pre-filter, not a weighted signal. Only
// candidates in the *same* category are scored at all. Price / days /
// difficulty are then compared within that category using the same
// bounded-similarity approach as before (still not cosine — see prior
// notes below), with weights renormalised across the remaining three
// features now that category no longer needs its own slice.
//
//   - price       (continuous)
//   - days        (continuous)
//   - difficulty  (ordinal: Easy < Moderate < Challenging < Strenuous...)
//   - category    (nominal — hard filter, not weighted)
//
// Rating, location, and boolean flags (familyFriendly, freeCancellation)
// remain excluded — near-constant across the catalog or noise for this
// comparison.
//
// ── Why this isn't cosine similarity ────────────────────────────────────
// Cosine similarity measures the *angle* between vectors from the origin,
// which is a poor fit for non-negative magnitude features like price —
// two very different prices can still point in "nearly the same
// direction" from the origin. Scoring each feature independently on a
// bounded [0, 1] similarity and combining as a weighted average makes
// each feature's influence an explicit, interpretable percentage instead
// of an emergent side effect of vector magnitude, and lets difficulty be
// treated as ordinal (Easy vs Moderate is more similar than Easy vs
// Strenuous) rather than a crude match/no-match.
// ---------------------------------------------------------------------------

import { Package } from 'src/entities/package.entity';

export interface ScoredPackage {
  package: Package;
  score: number;
}

// Relative importance of each *scored* feature — must sum to 1. Category
// is deliberately absent here: it's enforced as a hard filter before
// scoring even begins (see rankSimilarPackages), so every candidate that
// reaches weightedSimilarity() already matches on category.
const WEIGHTS = {
  price: 0.35,
  days: 0.30,
  difficulty: 0.35,
} as const;

// Canonical ordering for common difficulty labels used in the catalog, so
// "Easy" vs "Moderate" scores as more similar than "Easy" vs "Strenuous".
// Anything not recognised here falls back to nominal (exact-match-only)
// comparison rather than guessing at an order.
const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 0,
  leisurely: 0,
  moderate: 1,
  'moderate-challenging': 1.5,
  challenging: 2,
  difficult: 2,
  strenuous: 3,
  'very strenuous': 3.5,
  extreme: 4,
};

/** Builds a { min, max } range for a numeric array, guarding against empty input. */
function range(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Min-max normalisation into [0, 1]. Constant ranges normalise to 0 (no information). */
function normalize(value: number, r: { min: number; max: number }): number {
  if (r.max === r.min) return 0;
  return (value - r.min) / (r.max - r.min);
}

function clean(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** Similarity between two already-normalised [0,1] continuous values. 1 = identical. */
function continuousSimilarity(aNorm: number, bNorm: number): number {
  return 1 - Math.abs(aNorm - bNorm);
}

/**
 * Difficulty similarity. Uses ordinal distance when both labels are
 * recognised (so adjacent tiers score partial credit), otherwise falls
 * back to a strict match/no-match so we never fabricate an ordering for
 * labels we don't understand.
 */
function difficultySimilarity(a: string | undefined, b: string | undefined): number {
  const av = clean(a);
  const bv = clean(b);
  if (!av || !bv) return 0;
  if (av === bv) return 1;

  const aRank = DIFFICULTY_ORDER[av];
  const bRank = DIFFICULTY_ORDER[bv];
  if (aRank === undefined || bRank === undefined) return 0;

  const ranks = Object.values(DIFFICULTY_ORDER);
  const maxSpan = Math.max(...ranks) - Math.min(...ranks);
  if (maxSpan === 0) return 1;
  return 1 - Math.abs(aRank - bRank) / maxSpan;
}

/**
 * Category equality check used as a hard pre-filter. Not part of the
 * weighted score — see module header for why.
 */
function sameCategory(a: string | undefined, b: string | undefined): boolean {
  const av = clean(a);
  const bv = clean(b);
  return av.length > 0 && av === bv;
}

interface NormalizedFeatures {
  price: number;
  days: number;
  difficulty?: string;
}

/**
 * Pre-computes normalised numeric features for every package in the
 * supplied list. Ranges are derived from the list itself, so callers
 * should pass the full comparison set (target + same-category candidates)
 * to get consistent, comparable normalisation.
 */
function buildNormalizedFeatures(packages: Package[]): Map<number, NormalizedFeatures> {
  const priceRange = range(packages.map((p) => Number(p.price)));
  const daysRange = range(packages.map((p) => Number(p.days)));

  const features = new Map<number, NormalizedFeatures>();
  for (const p of packages) {
    features.set(p.id, {
      price: normalize(Number(p.price), priceRange),
      days: normalize(Number(p.days), daysRange),
      difficulty: p.difficulty,
    });
  }
  return features;
}

/**
 * Weighted similarity between two packages' pre-normalised features.
 * Returns a value in [0, 1] — 1 meaning identical on every weighted
 * feature, 0 meaning no similarity on any of them. Callers must ensure
 * both packages already share a category before calling this.
 */
function weightedSimilarity(a: NormalizedFeatures, b: NormalizedFeatures): number {
  const simPrice = continuousSimilarity(a.price, b.price);
  const simDays = continuousSimilarity(a.days, b.days);
  const simDifficulty = difficultySimilarity(a.difficulty, b.difficulty);

  return (
    WEIGHTS.price * simPrice +
    WEIGHTS.days * simDays +
    WEIGHTS.difficulty * simDifficulty
  );
}

/**
 * Ranks `candidates` by how similar they are to `target`, and returns the
 * top `limit` matches (highest similarity first).
 *
 * Category is a hard filter, applied before any scoring: only candidates
 * in the exact same category as `target` are considered at all. Within
 * that category-matched pool, price/days/difficulty are compared via
 * weighted feature similarity. Candidates below `minScore` are excluded —
 * with a small catalog, this prevents same-category-but-otherwise-very-
 * different tours from appearing just to fill the limit.
 *
 * If fewer than `limit` candidates share the target's category, the
 * function returns however many qualify rather than backfilling with
 * other categories — a shorter "similar tours" list is preferable to one
 * padded with a different kind of trip.
 *
 * Time complexity: O(n) to filter + O(n) to build features + O(n) to
 * score + O(n log n) to sort, where n = number of candidate packages.
 */
export function rankSimilarPackages(
  target: Package,
  candidates: Package[],
  limit = 3,
  minScore = 0.45,
): ScoredPackage[] {
  const sameCategoryOthers = candidates.filter(
    (c) => c.id !== target.id && sameCategory(c.category, target.category),
  );

  if (sameCategoryOthers.length === 0) return [];

  const features = buildNormalizedFeatures([target, ...sameCategoryOthers]);
  const targetFeatures = features.get(target.id)!;

  const scored: ScoredPackage[] = sameCategoryOthers.map((c) => ({
    package: c,
    score: weightedSimilarity(targetFeatures, features.get(c.id)!),
  }));

  return scored
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
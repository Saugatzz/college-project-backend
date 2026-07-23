// src/package/algorithms/search-ranking.util.ts
//
// Information Retrieval — TF-IDF Weighted Search Ranking (with partial match)
// ---------------------------------------------------------------------------
//   TF(t, d)  = (occurrences of term t in document d) / (total terms in d)
//   IDF(t)    = ln( (N + 1) / (df(t) + 1) ) + 1        [smoothed IDF]
//   score(d)  = sum over query terms t of  TF(t, d) * IDF(t) * fieldWeight
//
// The original implementation only matched exact tokens. That's the bug:
// "trek" vs "trekking", plurals, typos, or a query where only 1 of 3 words
// appears verbatim would score 0 and get filtered out, even though it's
// obviously a relevant result to a human. Real users don't type queries
// that line up with tokenization boundaries.
//
// This version keeps the TF-IDF core (so relevance ranking is still
// principled) but fixes matching so it degrades gracefully instead of
// falling off a cliff:
//
//   1. Light stemming (plurals, -ing, -ed) so "trekking"/"treks"/"trek"
//      are the same term.
//   2. Field weighting — a hit in name/tagline counts more than a hit
//      buried in the description, matching how relevance actually feels.
//   3. Prefix/substring partial credit — "kathm" matches "kathmandu",
//      at reduced weight, instead of scoring 0.
//   4. Fuzzy fallback (edit distance <= 1 for short terms, <= 2 for
//      longer ones) to tolerate typos, also at reduced weight.
//
// A package only needs to satisfy ONE query term (exact, stemmed, partial,
// or fuzzy) to appear in results — this is what makes "2-3 word queries
// still yield something" true, since real users rarely get every term to
// match exactly.
// ---------------------------------------------------------------------------

import { Package } from 'src/entities/package.entity';

export interface RankedPackage {
  package: Package;
  score: number;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'and', 'to', 'for',
  'with', 'is', 'at', 'from', 'by', 'this', 'that', 'it',
]);

// Match strength multipliers — exact beats stemmed beats partial beats fuzzy.
const MATCH_WEIGHT = {
  exact: 1.0,
  stemmed: 0.85,
  prefix: 0.6,
  substring: 0.45,
  fuzzy: 0.3,
} as const;

// Field weights — a hit in the name/tagline is a stronger relevance signal
// than the same word buried in a long description.
const FIELD_WEIGHTS: Array<{ field: keyof Package; weight: number }> = [
  { field: 'name', weight: 3 },
  { field: 'tagline', weight: 2.5 },
  { field: 'location', weight: 2 },
  { field: 'category', weight: 1.5 },
  { field: 'difficulty', weight: 1.5 },
  { field: 'description', weight: 1 },
];

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/** Very light suffix stripping — not a real stemmer, just enough to unify
 * common plural/verb forms ("treks"/"trekking"/"trekked" -> "trek"). */
function stem(term: string): string {
  if (term.length <= 3) return term;
  if (term.endsWith('ies')) return term.slice(0, -3) + 'y';
  if (term.endsWith('ing') && term.length > 5) return term.slice(0, -3);
  if (term.endsWith('ed') && term.length > 4) return term.slice(0, -2);
  if (term.endsWith('es') && term.length > 4) return term.slice(0, -2);
  if (term.endsWith('s') && !term.endsWith('ss')) return term.slice(0, -1);
  return term;
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array(b.length + 1).fill(0).map((_, j) => (i === 0 ? j : 0)),
  );
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

interface WeightedDoc {
  tokens: string[]; // raw tokens, field-repeated by weight (for TF)
  stemmedTokens: string[]; // stemmed, same order/weighting
  uniqueTokens: Set<string>;
  uniqueStemmed: Set<string>;
}

function buildWeightedDocument(p: Package): WeightedDoc {
  const tokens: string[] = [];
  for (const { field, weight } of FIELD_WEIGHTS) {
    const raw = (p as any)[field] as string | undefined;
    if (!raw) continue;
    const fieldTokens = tokenize(raw);
    // Repeat tokens `weight` times (rounded) so TF naturally reflects field
    // importance without needing a separate weighting pass later.
    const repeats = Math.max(1, Math.round(weight));
    for (let i = 0; i < repeats; i++) tokens.push(...fieldTokens);
  }
  const stemmedTokens = tokens.map(stem);
  return {
    tokens,
    stemmedTokens,
    uniqueTokens: new Set(tokens),
    uniqueStemmed: new Set(stemmedTokens),
  };
}

/**
 * Ranks `packages` by relevance to `keyword` using field-weighted TF-IDF as
 * the core signal, with graceful degradation through stemmed, prefix,
 * substring, and fuzzy matching so results aren't dropped just because a
 * query doesn't line up with exact tokenization. Returns results sorted by
 * descending relevance; packages with zero match on every query term are
 * excluded.
 */
export function rankByKeyword(packages: Package[], keyword: string): RankedPackage[] {
  const rawQueryTerms = tokenize(keyword);
  if (rawQueryTerms.length === 0) {
    return packages.map((p) => ({ package: p, score: 0 }));
  }
  const queryTerms = Array.from(new Set(rawQueryTerms));
  const stemmedQueryTerms = queryTerms.map(stem);

  const docs = packages.map(buildWeightedDocument);
  const N = docs.length;

  // Document frequency (for IDF) computed on stemmed terms so "trek"/"treks"
  // don't get treated as separate, rarer terms than they really are.
  const documentFrequency = new Map<string, number>();
  for (const term of stemmedQueryTerms) {
    const count = docs.filter((d) => d.uniqueStemmed.has(term)).length;
    documentFrequency.set(term, count);
  }
  const idf = new Map<string, number>();
  for (const term of stemmedQueryTerms) {
    const df = documentFrequency.get(term) ?? 0;
    idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
  }

  const scored: RankedPackage[] = packages.map((p, idx) => {
    const doc = docs[idx];
    if (doc.tokens.length === 0) return { package: p, score: 0 };

    const termCounts = new Map<string, number>();
    for (const t of doc.tokens) termCounts.set(t, (termCounts.get(t) ?? 0) + 1);
    const stemmedCounts = new Map<string, number>();
    for (const t of doc.stemmedTokens) stemmedCounts.set(t, (stemmedCounts.get(t) ?? 0) + 1);

    let score = 0;

    for (let i = 0; i < queryTerms.length; i++) {
      const term = queryTerms[i];
      const stemmedTerm = stemmedQueryTerms[i];
      const weightForTerm = idf.get(stemmedTerm) ?? 1;

      // 1. Exact token match.
      if (termCounts.has(term)) {
        const tf = (termCounts.get(term) ?? 0) / doc.tokens.length;
        score += tf * weightForTerm * MATCH_WEIGHT.exact;
        continue;
      }

      // 2. Stemmed match ("trekking" query hits "trek" in doc, or vice versa).
      if (stemmedCounts.has(stemmedTerm)) {
        const tf = (stemmedCounts.get(stemmedTerm) ?? 0) / doc.stemmedTokens.length;
        score += tf * weightForTerm * MATCH_WEIGHT.stemmed;
        continue;
      }

      // 3. Prefix / substring partial credit against unique doc tokens.
      let bestPartial = 0;
      let matchedPartial = false;
      for (const docToken of doc.uniqueTokens) {
        if (docToken.length < 3 || term.length < 3) continue;
        if (docToken.startsWith(term) || term.startsWith(docToken)) {
          bestPartial = Math.max(bestPartial, MATCH_WEIGHT.prefix);
          matchedPartial = true;
        } else if (docToken.includes(term) || term.includes(docToken)) {
          bestPartial = Math.max(bestPartial, MATCH_WEIGHT.substring);
          matchedPartial = true;
        }
      }
      if (matchedPartial) {
        score += weightForTerm * bestPartial * 0.3; // no true TF here, flat partial credit
        continue;
      }

      // 4. Fuzzy fallback for typos — only for reasonably long terms, to
      // avoid noisy matches on short words.
      if (term.length >= 4) {
        const maxDist = term.length <= 5 ? 1 : 2;
        for (const docToken of doc.uniqueTokens) {
          if (Math.abs(docToken.length - term.length) > maxDist) continue;
          if (levenshtein(term, docToken) <= maxDist) {
            score += weightForTerm * MATCH_WEIGHT.fuzzy * 0.3;
            break;
          }
        }
      }
    }

    return { package: p, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}
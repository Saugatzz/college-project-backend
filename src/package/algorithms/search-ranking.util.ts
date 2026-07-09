// src/package/algorithms/search-ranking.util.ts
//
// Information Retrieval — TF-IDF Weighted Search Ranking
// ---------------------------------------------------------------------------
// The previous keyword search simply matched a SQL "LIKE %keyword%" against
// a few columns and left the result order to whatever the default sort was
// (price). That means a tour whose *name* barely mentions the keyword once
// is ranked identically to one whose *description* is packed with relevant
// terms — there is no concept of "relevance".
//
// This module implements classic TF-IDF (Term Frequency - Inverse Document
// Frequency) scoring, the standard technique used by search engines and
// information-retrieval systems to rank documents by relevance to a query:
//
//   TF(t, d)  = (occurrences of term t in document d) / (total terms in d)
//   IDF(t)    = ln( (N + 1) / (df(t) + 1) ) + 1        [smoothed IDF]
//   score(d)  = sum over query terms t of  TF(t, d) * IDF(t)
//
// where N is the number of candidate documents (tours) and df(t) is the
// number of tours whose document contains term t. Terms that are rare
// across the catalogue (e.g. "Everest") get a higher IDF weight than
// common terms (e.g. "tour"), so tours that genuinely match the distinctive
// part of the query rank above tours that just happen to share a common
// word.
//
// Each tour's "document" is the concatenation of its name, description,
// location, category, difficulty and tagline — the fields a traveller is
// actually searching by.
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

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

function documentOf(p: Package): string {
  return [p.name, p.description, p.location, p.category, p.difficulty, p.tagline]
    .filter(Boolean)
    .join(' ');
}

/**
 * Ranks `packages` by TF-IDF relevance to `keyword`. Packages with a score
 * of 0 (no query term appears anywhere in their document) are excluded.
 * Returns results sorted by descending relevance.
 *
 * Time complexity: O(n * L) where n = number of packages and L = average
 * document length, dominated by tokenisation.
 */
export function rankByKeyword(packages: Package[], keyword: string): RankedPackage[] {
  const queryTerms = tokenize(keyword);
  if (queryTerms.length === 0) {
    return packages.map((p) => ({ package: p, score: 0 }));
  }

  const documents = packages.map((p) => tokenize(documentOf(p)));
  const N = documents.length;

  // Document frequency: how many tours contain each distinct query term.
  const uniqueTerms = Array.from(new Set(queryTerms));
  const documentFrequency = new Map<string, number>();
  for (const term of uniqueTerms) {
    const count = documents.filter((doc) => doc.includes(term)).length;
    documentFrequency.set(term, count);
  }

  // Smoothed IDF per query term.
  const idf = new Map<string, number>();
  for (const term of uniqueTerms) {
    const df = documentFrequency.get(term) ?? 0;
    idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
  }

  const scored: RankedPackage[] = packages.map((p, idx) => {
    const doc = documents[idx];
    if (doc.length === 0) return { package: p, score: 0 };

    const termCounts = new Map<string, number>();
    for (const t of doc) termCounts.set(t, (termCounts.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const tf = (termCounts.get(term) ?? 0) / doc.length;
      score += tf * (idf.get(term) ?? 0);
    }

    return { package: p, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

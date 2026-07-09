# Algorithms Implemented

This document describes the two algorithmic components added to the Tour
Management System, for use in the project report's **Methodology /
Algorithms** section and for the viva/defense.

Location in code:
`src/package/algorithms/recommendation.util.ts`
`src/package/algorithms/search-ranking.util.ts`

---

## 1. Content-Based Recommendation Engine (Cosine Similarity)

**Where it's used:** the "You Might Also Like" section on the tour detail
page (`GET /packages/:id/similar`).

**Problem it replaces:** previously, "similar tours" were just tours with
the exact same `category` string, in whatever order the database returned
them — no actual ranking, and two tours with *different* categories but
very similar price/duration/location were never suggested.

**How it works:**

1. Every tour is converted into a numeric **feature vector**:
   - Numeric features (min-max normalised to `[0, 1]`): price, duration
     (days), rating.
   - Categorical features (one-hot encoded): category, difficulty,
     location.
   - Boolean features: family-friendly, free cancellation.
2. Similarity between two tours is computed with the **cosine similarity**
   formula:

   ```
   sim(A, B) = (A · B) / (||A|| * ||B||)
   ```

   This measures the angle between two feature vectors rather than their
   raw distance, so it isn't skewed by scale differences between features.
3. For a given tour, every other active tour is scored against it and the
   top *N* highest-scoring tours are returned.

**Why this algorithm:** cosine similarity is the standard technique behind
*content-based filtering* recommender systems (e.g. "products/articles
similar to this one"). Unlike collaborative filtering (which recommends
based on other users' behaviour), it doesn't suffer from the **cold-start
problem** — a brand-new tour with zero bookings can still be recommended
correctly from day one, because recommendations are based on the tour's own
attributes.

**Complexity:** O(n·d) to build all feature vectors + O(n log n) to sort,
where *n* = number of tours and *d* = feature vector length. Trivial for a
catalogue of this size, and could be pre-computed/cached if the catalogue
grew very large.

---

## 2. Search Relevance Ranking (TF-IDF)

**Where it's used:** the tour search/filter bar keyword search
(`GET /packages?keyword=...`).

**Problem it replaces:** the previous keyword search used a SQL
`LIKE '%keyword%'` match and then sorted results by price — meaning
relevance to the search term played no role in ordering at all.

**How it works:**

1. Each tour is turned into a "document" — its name, description,
   location, category, difficulty and tagline concatenated together and
   tokenised (lower-cased, punctuation stripped, stopwords removed).
2. For each query term, we compute:
   - **Term Frequency (TF):** how often the term appears in a tour's
     document, relative to the document's length.
   - **Inverse Document Frequency (IDF):** `ln((N + 1) / (df + 1)) + 1`,
     where *N* is the number of candidate tours and *df* is how many of
     them contain the term. Rare, distinctive terms (e.g. "Everest") get a
     higher weight than common terms (e.g. "tour").
3. Each tour's relevance score is the sum of `TF × IDF` over all query
   terms. Results are sorted by descending score; non-matching tours
   (score 0) are dropped.

**Why this algorithm:** TF-IDF is the foundational algorithm behind
information retrieval and search engines — it directly addresses "how
relevant is this document to this query", which a plain substring match
cannot express.

**Complexity:** O(n·L) where *n* = number of candidate tours (already
narrowed down by the existing SQL filters) and *L* = average document
length — dominated by tokenisation, which is linear.

---

## Mapping to TU CSC412 Guidance

Both algorithms fall under categories the syllabus explicitly lists as
acceptable ("Information Retrieval — TF-IDF, Cosine Similarity",
"Recommendation Algorithms"), and directly match the "Tourism
Recommendation" example project TU calls out as a strong project type. They
also address the syllabus's warning against submitting a project that is
"just login + CRUD with no substantial logic" — the system now has
non-trivial, explainable algorithmic logic beyond database queries.

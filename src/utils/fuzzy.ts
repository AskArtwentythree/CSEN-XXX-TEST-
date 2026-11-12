export interface FuzzyMatch {
  score: number;
  /** Indices in the text that matched, for highlighting. */
  indices: number[];
}

function isWordStart(text: string, i: number): boolean {
  if (i === 0) return true;
  const prev = text[i - 1];
  return /[\s\-_/.#:]/.test(prev) || (prev === prev.toLowerCase() && text[i] !== text[i].toLowerCase());
}

/**
 * Scores `text` against `query`. Each whitespace-separated word must match as
 * an in-order subsequence, but words may appear in any order ("android crash"
 * finds "Fix crash on Android 12"). Returns null if any word doesn't match.
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { score: 0, indices: [] };
  let score = 0;
  const indices = new Set<number>();
  for (const word of words) {
    const match = matchWord(word, text);
    if (!match) return null;
    score += match.score;
    match.indices.forEach((i) => indices.add(i));
  }
  // Prefer shorter texts when alignment quality is equal.
  return { score: score - text.length * 0.01, indices: [...indices].sort((a, b) => a - b) };
}

/**
 * Best subsequence alignment of one word, via dynamic programming so that
 * e.g. "nt" in "New task" matches the word starts rather than the first letters.
 */
function matchWord(q: string, text: string): FuzzyMatch | null {
  const t = text.toLowerCase();
  const n = q.length;
  const m = t.length;
  if (n > m) return null;

  const NEG = -Infinity;
  // best[i][j]: best score matching q[0..i] with q[i] at t[j].
  const best: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(NEG));
  const from: number[][] = Array.from({ length: n }, () => new Array<number>(m).fill(-1));

  const charScore = (j: number) => 1 + (isWordStart(text, j) ? 8 : 0) + (j === 0 ? 4 : 0);

  for (let j = 0; j < m; j++) {
    if (t[j] === q[0]) best[0][j] = charScore(j) - j * 0.1;
  }
  for (let i = 1; i < n; i++) {
    let runningMax = NEG;
    let runningArg = -1;
    for (let j = i; j < m; j++) {
      // Non-adjacent predecessor: best of best[i-1][0..j-2], with a gap penalty.
      const k = j - 2;
      if (k >= 0 && best[i - 1][k] > runningMax) {
        runningMax = best[i - 1][k];
        runningArg = k;
      }
      if (t[j] !== q[i]) continue;
      const adjacent = best[i - 1][j - 1];
      const viaAdjacent = adjacent === NEG ? NEG : adjacent + charScore(j) + 6;
      const viaGap = runningMax === NEG ? NEG : runningMax + charScore(j) - 1;
      if (viaAdjacent >= viaGap && viaAdjacent !== NEG) {
        best[i][j] = viaAdjacent;
        from[i][j] = j - 1;
      } else if (viaGap !== NEG) {
        best[i][j] = viaGap;
        from[i][j] = runningArg;
      }
    }
  }

  let end = -1;
  let score = NEG;
  for (let j = 0; j < m; j++) {
    if (best[n - 1][j] > score) {
      score = best[n - 1][j];
      end = j;
    }
  }
  if (end === -1) return null;

  const indices: number[] = [];
  for (let i = n - 1, j = end; i >= 0; i--) {
    indices.unshift(j);
    j = from[i][j];
  }
  return { score, indices };
}

/** Filters and ranks items by fuzzy score; stable for ties. */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): Array<{ item: T; match: FuzzyMatch }> {
  return items
    .map((item, order) => ({ item, order, match: fuzzyMatch(query, getText(item)) }))
    .filter((r): r is { item: T; order: number; match: FuzzyMatch } => r.match !== null)
    .sort((a, b) => b.match.score - a.match.score || a.order - b.order)
    .map(({ item, match }) => ({ item, match }));
}

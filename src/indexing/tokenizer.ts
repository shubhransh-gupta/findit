const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they',
  'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which', 'who',
  'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'any', 'as', 'if', 'up', 'also', 'me', 'him',
  'them', 'am', 'been', 'being', 'get', 'got', 'like', 'one', 'two',
]);

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function tokenizeWithPositions(text: string): Array<{ term: string; index: number }> {
  const words = text.toLowerCase().split(/\s+/);
  const result: Array<{ term: string; index: number }> = [];
  let charIndex = 0;

  for (const word of words) {
    const cleaned = word.replace(/[^\w'-]/g, '');
    if (cleaned.length > 1 && !STOP_WORDS.has(cleaned)) {
      result.push({ term: cleaned, index: charIndex });
    }
    charIndex += word.length + 1;
  }
  return result;
}

export function countTerms(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

export function stemWord(word: string): string {
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) return word.slice(0, -1);
  if (word.endsWith('ly') && word.length > 4) return word.slice(0, -2);
  return word;
}

export function normalizeTokens(tokens: string[]): string[] {
  return tokens.map(stemWord);
}

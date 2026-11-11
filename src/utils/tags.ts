export function parseTags(raw: string): string[] {
  const tags = raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean);
  return [...new Set(tags)];
}

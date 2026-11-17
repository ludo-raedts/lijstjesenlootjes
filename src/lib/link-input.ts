/**
 * Pulls a raw capability token out of whatever a person pastes: a full personal link with `#token=…`,
 * a bare token, or a link with surrounding text. Returns undefined when nothing token-shaped is found.
 */
export function extractToken(input: string): string | undefined {
  const value = input.trim();
  if (!value) return undefined;
  const fromFragment = value.match(/[#&?]token=([A-Za-z0-9_-]{40,})/);
  if (fromFragment) return fromFragment[1];
  return /^[A-Za-z0-9_-]{40,}$/.test(value) ? value : undefined;
}

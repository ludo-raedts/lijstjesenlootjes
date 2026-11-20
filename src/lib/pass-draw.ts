import { createAssignments } from "./draw";

/** Limits of the "draw together on one device" flow. Everything runs in the browser; nothing is stored or sent. */
export const PASS_DRAW_MIN_PARTICIPANTS = 3;
export const PASS_DRAW_MAX_PARTICIPANTS = 30;
export const PASS_DRAW_MAX_NAME_LENGTH = 40;

export type PassDrawNamesError = "too_few" | "too_many" | "duplicate" | "name_too_long";

export type PassDrawNamesResult =
  | { ok: true; names: string[] }
  | { ok: false; error: PassDrawNamesError; params: Record<string, string | number> };

/** Splits the textarea input into one name per line and trims whitespace, without validating the group. */
export function listPassDrawNames(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Validates the group: size, name length and duplicates. */
export function parsePassDrawNames(raw: string): PassDrawNamesResult {
  const names = listPassDrawNames(raw);

  const tooLong = names.find((name) => [...name].length > PASS_DRAW_MAX_NAME_LENGTH);
  if (tooLong) return { ok: false, error: "name_too_long", params: { name: tooLong, max: PASS_DRAW_MAX_NAME_LENGTH } };

  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) return { ok: false, error: "duplicate", params: { name } };
    seen.add(key);
  }
  if (names.length < PASS_DRAW_MIN_PARTICIPANTS) return { ok: false, error: "too_few", params: { min: PASS_DRAW_MIN_PARTICIPANTS } };
  if (names.length > PASS_DRAW_MAX_PARTICIPANTS) return { ok: false, error: "too_many", params: { max: PASS_DRAW_MAX_PARTICIPANTS } };
  return { ok: true, names };
}

/** A pair of participant indexes who must not draw each other (in either direction). */
export type PassDrawExclusion = readonly [number, number];

/**
 * Returns, for every participant index, the index of the person they draw, or null when the exclusions leave no
 * valid draw. Nobody draws themselves, nobody draws an excluded partner and everybody is drawn exactly once.
 * Reuses the server's matching-based algorithm, so a solvable set of exclusions always yields an answer.
 */
export function drawAssignments(
  count: number,
  options: { exclusions?: readonly PassDrawExclusion[]; random?: (maxExclusive: number) => number } = {},
): number[] | null {
  if (!Number.isInteger(count) || count < 2) throw new Error("A draw needs at least two participants.");
  const participants = Array.from({ length: count }, (_, index) => ({ id: String(index), name: String(index) }));
  const exclusions = (options.exclusions ?? []).flatMap(([a, b]) => [
    { from: String(a), to: String(b) },
    { from: String(b), to: String(a) },
  ]);
  const result = createAssignments(participants, exclusions, { random: options.random });
  if (result.kind !== "success") return null;
  const recipientOf = new Map(result.assignments.map(({ giverId, recipientId }) => [giverId, Number(recipientId)]));
  return participants.map(({ id }) => recipientOf.get(id)!);
}

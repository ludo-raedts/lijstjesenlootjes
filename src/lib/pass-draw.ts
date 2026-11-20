import { secureIndex } from "./wheel";

/** Limits of the "draw together on one device" flow. Everything runs in the browser; nothing is stored or sent. */
export const PASS_DRAW_MIN_PARTICIPANTS = 3;
export const PASS_DRAW_MAX_PARTICIPANTS = 30;
export const PASS_DRAW_MAX_NAME_LENGTH = 40;

export type PassDrawNamesError = "too_few" | "too_many" | "duplicate" | "name_too_long";

export type PassDrawNamesResult =
  | { ok: true; names: string[] }
  | { ok: false; error: PassDrawNamesError; params: Record<string, string | number> };

/** Splits the textarea input into one name per line, trims whitespace and validates the group. */
export function parsePassDrawNames(raw: string): PassDrawNamesResult {
  const names = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

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

type RandomIndex = (maxExclusive: number) => number;

function shuffled<T>(items: T[], random: RandomIndex) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = random(index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/**
 * Returns, for every participant index, the index of the person they draw. Nobody draws themselves and everybody
 * is drawn exactly once. Plain shuffles are repeated until no one maps to themselves (about one in e of them is
 * fine); a single-cycle fallback (Sattolo) guarantees an answer so the loop can never run away.
 */
export function drawAssignments(count: number, random: RandomIndex = secureIndex): number[] {
  if (!Number.isInteger(count) || count < 2) throw new Error("A draw needs at least two participants.");
  const identity = Array.from({ length: count }, (_, index) => index);
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate = shuffled(identity, random);
    if (candidate.every((recipient, giver) => recipient !== giver)) return candidate;
  }
  const cycle = [...identity];
  for (let index = cycle.length - 1; index > 0; index -= 1) {
    const swap = random(index);
    [cycle[index], cycle[swap]] = [cycle[swap], cycle[index]];
  }
  return cycle;
}

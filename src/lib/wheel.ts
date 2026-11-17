export type RandomFill = (values: Uint32Array) => Uint32Array;

export function secureIndex(maxExclusive: number, fill: RandomFill = (values) => crypto.getRandomValues(values)) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1) throw new Error("Ongeldig aantal opties.");
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  do fill(values); while (values[0] >= limit);
  return values[0] % maxExclusive;
}

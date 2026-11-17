/**
 * Full-jitter backoff for optimistic-concurrency retries. Two writers that collide wait a random, growing time
 * before trying again, so a burst of simultaneous reservations spreads out instead of colliding in lockstep.
 */
export function commitBackoffMs(attempt: number, random: () => number = Math.random) {
  const ceiling = Math.min(20 * 2 ** attempt, 400);
  return Math.floor(random() * ceiling);
}

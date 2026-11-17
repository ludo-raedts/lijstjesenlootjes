import assert from "node:assert/strict";
import test from "node:test";
import { extractToken } from "../src/lib/link-input";
import { normalizeEmail, recoveryHash, recoverySecret } from "../src/lib/recovery";

test("the recovery hash ignores case and surrounding whitespace", () => {
  const secret = "s".repeat(32);
  assert.equal(recoveryHash("  Ludo@Example.NL ", secret), recoveryHash("ludo@example.nl", secret));
  assert.equal(normalizeEmail(" A@B.nl "), "a@b.nl");
});

test("the recovery hash is keyed: another secret or address gives another value, and it is not the address", () => {
  const hash = recoveryHash("a@example.nl", "k".repeat(32));
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, recoveryHash("a@example.nl", "j".repeat(32)));
  assert.notEqual(hash, recoveryHash("b@example.nl", "k".repeat(32)));
  assert.ok(!hash.includes("example"));
});

test("a recovery hash cannot be made without a secret", () => {
  assert.throws(() => recoveryHash("a@example.nl", ""));
});

test("a dedicated recovery secret wins over the database key", () => {
  assert.equal(recoverySecret({ RECOVERY_HASH_SECRET: " own ", SUPABASE_SECRET_KEY: "db" }), "own");
  assert.equal(recoverySecret({ SUPABASE_SECRET_KEY: "db" }), "db");
  assert.equal(recoverySecret({}), "");
});

test("extractToken finds a token in a pasted link, a bare token, or surrounding text", () => {
  const token = "a".repeat(43);
  assert.equal(extractToken(`https://lijstjesenlootjes.nl/verlanglijstje/bekijken#token=${token}`), token);
  assert.equal(extractToken(token), token);
  assert.equal(extractToken(`  mijn lijstje: https://x.nl/y#token=${token} !`), token);
  assert.equal(extractToken("https://x.nl/y"), undefined);
  assert.equal(extractToken("#token=short"), undefined);
  assert.equal(extractToken(""), undefined);
});

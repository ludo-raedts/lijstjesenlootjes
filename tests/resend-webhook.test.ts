import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { publicPages } from "../src/lib/paths";
import { usageEventForResendType, verifyResendSignature } from "../src/lib/resend-webhook";
import { usageEvents } from "../src/lib/usage";

const key = Buffer.from("0123456789abcdef0123456789abcdef");
const secret = `whsec_${key.toString("base64")}`;
const body = JSON.stringify({ type: "email.bounced" });
const now = 1_800_000_000_000;
const timestamp = String(now / 1000);
const sign = (id: string, ts: string, payload: string) =>
  `v1,${createHmac("sha256", key).update(`${id}.${ts}.${payload}`).digest("base64")}`;

test("a correctly signed webhook is accepted", () => {
  assert.equal(verifyResendSignature({ secret, id: "msg_1", timestamp, signature: sign("msg_1", timestamp, body), body, now }), true);
});

test("any one of several listed signatures may match", () => {
  const signature = `v1,AAAA ${sign("msg_1", timestamp, body)}`;
  assert.equal(verifyResendSignature({ secret, id: "msg_1", timestamp, signature, body, now }), true);
});

test("a tampered body, wrong secret, or missing header is rejected", () => {
  const signature = sign("msg_1", timestamp, body);
  assert.equal(verifyResendSignature({ secret, id: "msg_1", timestamp, signature, body: `${body} `, now }), false);
  assert.equal(verifyResendSignature({ secret: `whsec_${Buffer.from("another-secret-another-secret-00").toString("base64")}`, id: "msg_1", timestamp, signature, body, now }), false);
  assert.equal(verifyResendSignature({ secret, id: null, timestamp, signature, body, now }), false);
  assert.equal(verifyResendSignature({ secret, id: "msg_1", timestamp, signature: null, body, now }), false);
  assert.equal(verifyResendSignature({ secret: "", id: "msg_1", timestamp, signature, body, now }), false);
});

test("old and future timestamps are rejected as replays", () => {
  for (const offset of [-6 * 60, 6 * 60]) {
    const ts = String(now / 1000 + offset);
    assert.equal(verifyResendSignature({ secret, id: "msg_1", timestamp: ts, signature: sign("msg_1", ts, body), body, now }), false);
  }
});

test("only delivery outcomes become counters", () => {
  assert.equal(usageEventForResendType("email.delivered"), "email_delivered");
  assert.equal(usageEventForResendType("email.bounced"), "email_bounced");
  assert.equal(usageEventForResendType("email.complained"), "email_complained");
  assert.equal(usageEventForResendType("email.delivery_delayed"), "email_delayed");
  assert.equal(usageEventForResendType("email.opened"), undefined);
  assert.equal(usageEventForResendType(42), undefined);
  for (const type of ["email.delivered", "email.bounced", "email.complained", "email.delivery_delayed"]) {
    assert.ok((usageEvents as readonly string[]).includes(usageEventForResendType(type)!));
  }
});

test("every public page key fits the database page-key shape", () => {
  for (const page of publicPages()) assert.match(page.key, /^[A-Za-z][A-Za-z0-9]{0,39}$/);
});

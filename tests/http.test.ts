import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../src/lib/api-error";
import { readJson } from "../src/lib/http";

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api", { method: "POST", body, headers });

test("readJson returns a parsed object", async () => {
  assert.deepEqual(await readJson(post('{"a":1}')), { a: 1 });
});

test("readJson rejects malformed and non-object bodies with a 400", async () => {
  for (const body of ["{", "", "[]", "null", '"text"']) {
    await assert.rejects(readJson(post(body)), (error) => error instanceof HttpError && error.status === 400 && error.code === "invalid_json");
  }
});

test("readJson rejects oversized bodies with a 413", async () => {
  await assert.rejects(
    readJson(post(JSON.stringify({ padding: "x".repeat(200) })), 100),
    (error) => error instanceof HttpError && error.status === 413 && error.code === "payload_too_large",
  );
  await assert.rejects(
    readJson(post("{}", { "content-length": "999999" }), 100),
    (error) => error instanceof HttpError && error.status === 413,
  );
});

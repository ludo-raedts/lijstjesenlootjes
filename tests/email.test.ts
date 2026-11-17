import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { createTranslator } from "../src/i18n/messages";
import { emailConfigured, senderForHost, sendEmail, sendEmailWithRetry } from "../src/lib/email";
import { escapeHtml, renderDrawEmail, renderRecoveryEmail, renderWishlistEmail } from "../src/lib/email-templates";
import { optionalEmail } from "../src/lib/validation";

const realFetch = globalThis.fetch;
const message = { to: "a@example.com", subject: "s", text: "t", html: "<p>t</p>", idempotencyKey: "k-1" };

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.EMAIL_PROVIDER_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_REPLY_TO;
  delete process.env.EMAIL_FROM_WISHANDDRAW_COM;
});

test("optionalEmail normalizes valid addresses and ignores empty input", () => {
  assert.equal(optionalEmail(undefined), undefined);
  assert.equal(optionalEmail(""), undefined);
  assert.equal(optionalEmail("   "), undefined);
  assert.equal(optionalEmail("  Ludo@Example.NL "), "ludo@example.nl");
});

test("optionalEmail rejects malformed addresses and header injection", () => {
  for (const value of ["nope", "a@b", "a b@c.nl", "a@b.nl\r\nBcc: x@y.nl", "a@b.nl, c@d.nl", "<a@b.nl>", 42, `${"a".repeat(250)}@b.nl`]) {
    assert.throws(() => optionalEmail(value), (error: { code?: string }) => error.code === "invalid_email", String(value));
  }
});

test("sendEmail skips when the provider is not configured and never calls the network", async () => {
  globalThis.fetch = (async () => { throw new Error("must not be called"); }) as typeof fetch;
  assert.equal(emailConfigured(), false);
  assert.equal(await sendEmail(message), "skipped");
});

test("sendEmail posts to Resend with an idempotency key and reply-to", async () => {
  process.env.EMAIL_PROVIDER_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Test <noreply@example.nl>";
  process.env.EMAIL_REPLY_TO = "help@example.nl";
  let captured: { url: string; init: RequestInit } | undefined;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    captured = { url, init };
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  assert.equal(await sendEmail(message), "sent");
  assert.equal(captured?.url, "https://api.resend.com/emails");
  const headers = captured?.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer re_test");
  assert.equal(headers["Idempotency-Key"], "k-1");
  const body = JSON.parse(String(captured?.init.body));
  assert.deepEqual(body.to, ["a@example.com"]);
  assert.equal(body.from, "Test <noreply@example.nl>");
  assert.equal(body.reply_to, "help@example.nl");
});

test("sendEmail reports failure without throwing", async () => {
  process.env.EMAIL_PROVIDER_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Test <noreply@example.nl>";
  globalThis.fetch = (async () => new Response("{}", { status: 500 })) as unknown as typeof fetch;
  assert.equal(await sendEmail(message), "failed");
  globalThis.fetch = (async () => { throw new Error("network"); }) as unknown as typeof fetch;
  assert.equal(await sendEmail(message), "failed");
});

test("templates escape user content in HTML and keep real text versions", () => {
  const t = createTranslator("nl");
  const mail = renderWishlistEmail(t, {
    title: `<script>alert(1)</script> & "co"`,
    manageUrl: "https://lijstjesenlootjes.nl/verlanglijstje/beheren#token=abc",
    guestUrl: "https://lijstjesenlootjes.nl/verlanglijstje/bekijken#token=def",
    site: "lijstjesenlootjes.nl",
  });
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("&lt;script&gt;"));
  assert.ok(mail.text.includes("#token=abc") && mail.text.includes("#token=def"));
  assert.ok(mail.text.includes("lijstjesenlootjes.nl"));
  assert.equal(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});

test("draw email lists every participant link in both languages", () => {
  for (const locale of ["nl", "en"] as const) {
    const mail = renderDrawEmail(createTranslator(locale), {
      group: "Familie",
      adminUrl: "https://x.test/admin#token=a",
      participants: [{ name: "Sam", url: "https://x.test/r#token=1" }, { name: "Noor", url: "https://x.test/r#token=2" }],
      site: "x.test",
    });
    assert.ok(mail.subject.includes("Familie"));
    for (const needle of ["Sam", "Noor", "#token=1", "#token=2", "#token=a"]) assert.ok(mail.text.includes(needle), `${locale} ${needle}`);
  }
});

test("each public domain sends from its own sender and falls back to EMAIL_FROM", () => {
  process.env.EMAIL_FROM = "NL <noreply@lijstjesenlootjes.nl>";
  assert.equal(senderForHost("lijstjesenlootjes.nl"), "NL <noreply@lijstjesenlootjes.nl>");
  assert.equal(senderForHost("wishanddraw.com"), "NL <noreply@lijstjesenlootjes.nl>");
  process.env.EMAIL_FROM_WISHANDDRAW_COM = "EN <noreply@wishanddraw.com>";
  assert.equal(senderForHost("www.wishanddraw.com:443"), "EN <noreply@wishanddraw.com>");
  assert.equal(senderForHost("lijstjesenlootjes.nl"), "NL <noreply@lijstjesenlootjes.nl>");
  assert.equal(senderForHost("localhost:3000"), "NL <noreply@lijstjesenlootjes.nl>");
});

function configureProvider() {
  process.env.EMAIL_PROVIDER_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Test <noreply@example.nl>";
}

test("sendEmailWithRetry retries a provider error and stops at the first success", async () => {
  configureProvider();
  const statuses = [503, 429, 200];
  let calls = 0;
  globalThis.fetch = (async () => new Response("{}", { status: statuses[calls++] })) as typeof fetch;
  assert.equal(await sendEmailWithRetry(message, [0, 0, 0]), "sent");
  assert.equal(calls, 3);
});

test("sendEmailWithRetry does not retry a request the provider rejected", async () => {
  configureProvider();
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; return new Response("{}", { status: 422 }); }) as typeof fetch;
  assert.equal(await sendEmailWithRetry(message, [0, 0, 0]), "failed");
  assert.equal(calls, 1);
});

test("sendEmailWithRetry gives up after the last attempt and reuses the idempotency key", async () => {
  configureProvider();
  const keys: Array<string | null> = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    keys.push(new Headers(init?.headers).get("Idempotency-Key"));
    throw new Error("network down");
  }) as typeof fetch;
  assert.equal(await sendEmailWithRetry(message, [0, 0, 0]), "failed");
  assert.deepEqual(keys, ["k-1", "k-1", "k-1"]);
});

test("sendEmailWithRetry skips quietly when email is not configured", async () => {
  globalThis.fetch = (async () => { throw new Error("must not be called"); }) as typeof fetch;
  assert.equal(await sendEmailWithRetry(message, [0, 0, 0]), "skipped");
});

test("the recovery email lists every list and draw with its own links and no participant links", () => {
  const t = createTranslator("nl");
  const rendered = renderRecoveryEmail(t, {
    site: "lijstjesenlootjes.nl",
    items: [
      { kind: "wishlist", title: "Mijn lijst", manageUrl: "https://x.nl/m#token=m", guestUrl: "https://x.nl/g#token=g" },
      { kind: "draw", title: "Kerst <b>", adminUrl: "https://x.nl/a#token=a" },
    ],
  });
  for (const url of ["https://x.nl/m#token=m", "https://x.nl/g#token=g", "https://x.nl/a#token=a"]) {
    assert.ok(rendered.text.includes(url) && rendered.html.includes(url));
  }
  assert.ok(rendered.html.includes("Kerst &lt;b&gt;") && !rendered.html.includes("Kerst <b>"));
});

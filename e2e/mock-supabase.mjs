// A tiny in-memory stand-in for the Supabase RPC functions the app calls.
// End-to-end tests point SUPABASE_URL here so they never touch a real database.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 4010);

const emptyState = () => ({ version: 1, wishlists: [], draws: [], accessTokens: [], sessions: [] });
let version = 1;
let data = emptyState();
let buckets = new Map();
let usage = new Map();
let traffic = new Map();
// Stand-in for the email provider: records what would have been sent, once per idempotency key.
let mails = [];

function readBody(request) {
  return new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const rpc = {
  read_app_state: () => [{ version, data }],
  commit_app_state: ({ p_expected_version: expected, p_next_data: next }) => {
    if (expected !== version) return false;
    version += 1;
    data = next;
    return true;
  },
  consume_app_rate_limit: ({ p_bucket_key: key, p_maximum: maximum, p_window_seconds: windowSeconds }) => {
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.startedAt <= now - windowSeconds * 1000) {
      buckets.set(key, { startedAt: now, count: 1 });
      return 1 <= maximum;
    }
    current.count += 1;
    return current.count <= maximum;
  },
  app_health: () => true,
  record_usage_event: ({ p_event: event, p_amount: amount = 1 }) => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
    const key = `${day}|${event}`;
    usage.set(key, (usage.get(key) ?? 0) + amount);
    return null;
  },
  read_usage_daily: () => [...usage.entries()].map(([key, count]) => {
    const [day, event] = key.split("|");
    return { day, event, event_count: count };
  }),
  record_traffic_measurement: ({ p_site: site, p_page: page, p_visit: visit }) => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
    const key = `${day}|${site}|${page}`;
    const current = traffic.get(key) ?? { pageViews: 0, visits: 0 };
    current.pageViews += 1;
    current.visits += visit ? 1 : 0;
    traffic.set(key, current);
    return null;
  },
  read_traffic_daily: () => [...traffic.entries()].map(([key, counts]) => {
    const [day, site, page] = key.split("|");
    return {
      day,
      site,
      page,
      page_view_count: counts.pageViews,
      visit_count: counts.visits,
    };
  }),
  cleanup_usage_measurement: () => null,
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/__health") return send(response, 200, { ok: true });
  if (url.pathname === "/__reset" && request.method === "POST") {
    version = 1; data = emptyState(); buckets = new Map(); usage = new Map(); traffic = new Map(); mails = [];
    return send(response, 200, { reset: true });
  }
  if (url.pathname === "/__state" && request.method === "GET") {
    return send(response, 200, { version, data });
  }
  if (url.pathname === "/__traffic" && request.method === "GET") {
    return send(response, 200, { traffic: rpc.read_traffic_daily() });
  }

  if (url.pathname === "/emails" && request.method === "POST") {
    const body = await readBody(request);
    const key = request.headers["idempotency-key"];
    if (!key || !mails.some((mail) => mail.key === key)) {
      mails.push({ key, from: body.from, to: body.to, subject: body.subject, text: body.text });
    }
    return send(response, 200, { id: "mock-email" });
  }
  if (url.pathname === "/__mails" && request.method === "GET") {
    return send(response, 200, { mails });
  }

  const match = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
  if (request.method === "POST" && match && rpc[match[1]]) {
    return send(response, 200, rpc[match[1]](await readBody(request)));
  }
  return send(response, 404, { message: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`mock supabase on ${PORT}`));

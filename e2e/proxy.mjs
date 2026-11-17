// Test-only reverse proxy in front of `next start`.
//
// Browsers reach the app as http://lijstjesenlootjes.nl:3100 or http://wishanddraw.com:3100 (Chrome maps both
// names to 127.0.0.1). `next start` builds request.url from its own bind address (localhost), unlike Vercel which
// uses the real host, so the app's same-origin check would reject every write. For /api requests this proxy
// performs the equivalent check (Origin must match the Host the browser used) and then presents the origin the
// app expects. Server actions and pages are forwarded untouched.
import { createServer, request } from "node:http";

const LISTEN = Number(process.env.E2E_PROXY_PORT ?? 3100);
const TARGET = Number(process.env.E2E_TARGET_PORT ?? 3101);

createServer((incoming, outgoing) => {
  const headers = { ...incoming.headers };
  const isApi = (incoming.url ?? "").startsWith("/api/");
  const origin = incoming.headers.origin;

  if (isApi && origin) {
    if (new URL(origin).host === incoming.headers.host) headers.origin = `http://localhost:${TARGET}`;
    // otherwise the original, mismatching Origin is forwarded and the app rejects it
  }

  const upstream = request(
    { host: "127.0.0.1", port: TARGET, path: incoming.url, method: incoming.method, headers },
    (response) => {
      // `next start` marks session cookies Secure, which a browser refuses over plain http on a non-localhost name.
      const cookies = response.headers["set-cookie"]?.map((cookie) => cookie.replace(/;\s*Secure/i, ""));
      outgoing.writeHead(response.statusCode ?? 502, cookies ? { ...response.headers, "set-cookie": cookies } : response.headers);
      response.pipe(outgoing);
    },
  );
  upstream.on("error", () => { outgoing.writeHead(502); outgoing.end("upstream unavailable"); });
  incoming.pipe(upstream);
}).listen(LISTEN, "127.0.0.1", () => console.log(`e2e proxy ${LISTEN} -> ${TARGET}`));

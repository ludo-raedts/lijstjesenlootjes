import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicTrafficPageKey,
  publicTrafficPageForPath,
  summarizeTraffic,
  trafficWindow,
  type TrafficRow,
} from "../src/lib/analytics";
import { privatePathPrefixes, publicPages } from "../src/lib/paths";

test("traffic measurement maps every declared public path and rejects every private path", () => {
  for (const page of publicPages()) {
    assert.equal(isPublicTrafficPageKey(page.key), true);
    for (const path of Object.values(page.paths).filter((value): value is string => value !== undefined)) {
      assert.equal(publicTrafficPageForPath(path), page.key, `${path} should be measurable`);
      if (path !== "/") assert.equal(publicTrafficPageForPath(`${path}/`), page.key, `${path}/ should be measurable`);
    }
  }
  for (const path of privatePathPrefixes()) {
    assert.equal(publicTrafficPageForPath(path), null, `${path} should stay private`);
  }
  assert.equal(publicTrafficPageForPath("/admin"), null);
  assert.equal(publicTrafficPageForPath("/unknown"), null);
  assert.equal(isPublicTrafficPageKey("wishlistGuest"), false);
});

test("traffic summaries include only the requested calendar-day window", () => {
  const rows: TrafficRow[] = [
    { day: "2026-10-19", site: "nl", page: "home", pageViews: 5, visits: 3 },
    { day: "2026-10-20", site: "nl", page: "home", pageViews: 2, visits: 1 },
    { day: "2026-11-18", site: "nl", page: "home", pageViews: 4, visits: 2 },
    { day: "2026-11-18", site: "en", page: "drawCreate", pageViews: 3, visits: 2 },
  ];
  const summary = summarizeTraffic(trafficWindow(rows, 30, new Date("2026-11-18T12:00:00Z")));
  assert.deepEqual(summary, [
    { site: "en", page: "drawCreate", pageViews: 3, visits: 2 },
    { site: "nl", page: "home", pageViews: 6, visits: 3 },
  ]);
});

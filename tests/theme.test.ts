import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultThemeSettings,
  resolveAppearance,
  resolveAutomaticTheme,
} from "../src/lib/theme";

const atNoon = (date: string) => new Date(`${date}T12:00:00+01:00`);

test("automatic themes respect Dutch Sinterklaas and Christmas windows", () => {
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-11-14")), "autumn");
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-11-15")), "sinterklaas");
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-12-05")), "sinterklaas");
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-12-06")), "christmas");
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-12-27")), "winter");
});

test("English Christmas starts in the middle of November", () => {
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "en", atNoon("2026-11-14")), "autumn");
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "en", atNoon("2026-11-15")), "christmas");
});

test("the general seasons cover the rest of the year", () => {
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-01-15")), "winter");
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-03-15")), "spring");
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-06-15")), "summer");
  assert.equal(resolveAutomaticTheme(defaultThemeSettings, "nl", atNoon("2026-09-15")), "autumn");
});

test("manual theme and layout overrides win independently", () => {
  const appearance = resolveAppearance({
    ...defaultThemeSettings,
    themeMode: "manual",
    manualTheme: "summer",
    layoutMode: "manual",
    manualLayout: "split",
  }, "nl", atNoon("2026-12-05"));

  assert.equal(appearance.theme, "summer");
  assert.equal(appearance.layout, "split");
  assert.equal(appearance.themeSource, "manual");
  assert.equal(appearance.layoutSource, "manual");
});

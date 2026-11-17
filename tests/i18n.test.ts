import assert from "node:assert/strict";
import test from "node:test";
import { translateApiError } from "../src/i18n/api-errors";
import { apiErrorCodes } from "../src/lib/api-error";

test("every API error code has Dutch and English copy", () => {
  for (const code of apiErrorCodes) {
    assert.ok(translateApiError(code, { field: "title", min: 1, max: 50 }, "nl").length > 0);
    assert.ok(translateApiError(code, { field: "title", min: 1, max: 50 }, "en").length > 0);
  }
});

test("field validation is localized in the browser", () => {
  assert.equal(
    translateApiError("field_required", { field: "groupName" }, "nl"),
    "Groepsnaam ontbreekt.",
  );
  assert.equal(
    translateApiError("field_required", { field: "groupName" }, "en"),
    "Group name is required.",
  );
});

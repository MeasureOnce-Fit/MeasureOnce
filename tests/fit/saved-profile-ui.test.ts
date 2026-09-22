import assert from "node:assert/strict";
import test from "node:test";

import { savedFitEvidenceDescription } from "../../src/lib/fit/saved-profile-ui";

test("describes a verified saved size reference without calling it body measurements", () => {
  assert.equal(
    savedFitEvidenceDescription(["reference_garment"]),
    "a verified saved size reference",
  );
});

test("describes saved body measurements only when those measurements were used", () => {
  assert.equal(
    savedFitEvidenceDescription(["body_measurement"]),
    "saved body measurements",
  );
});

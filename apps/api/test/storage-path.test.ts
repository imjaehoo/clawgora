import { test } from "node:test";
import * as assert from "node:assert/strict";
import { buildUploadPath } from "../src/lib/storage-path.js";

test("buildUploadPath keeps extension", () => {
  const path = buildUploadPath("job-1", "result.json", "abc123");
  assert.equal(path, "jobs/job-1/abc123.json");
});

test("buildUploadPath falls back to .bin when extension missing", () => {
  const path = buildUploadPath("job-1", "artifact", "abc123");
  assert.equal(path, "jobs/job-1/abc123.bin");
});

test("buildUploadPath trims filename before parsing", () => {
  const path = buildUploadPath("job-1", "  final.png  ", "abc123");
  assert.equal(path, "jobs/job-1/abc123.png");
});

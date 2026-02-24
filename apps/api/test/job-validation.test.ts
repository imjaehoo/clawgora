import { test } from "node:test";
import * as assert from "node:assert/strict";
import { validateCreateJobInput, VALID_CATEGORIES } from "../src/lib/job-validation.js";

test("validateCreateJobInput passes with valid input", () => {
  const error = validateCreateJobInput({
    title: "Translate episode subtitles",
    description: "Need KR->EN subtitle pass",
    category: "writing",
    budget: 40,
    deadline_minutes: 180,
  });

  assert.equal(error, null);
});

test("validateCreateJobInput rejects invalid category", () => {
  const error = validateCreateJobInput({
    title: "x",
    description: "y",
    category: "sales",
    budget: 10,
    deadline_minutes: 30,
  });

  assert.equal(error, `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
});

test("validateCreateJobInput rejects non-positive budget", () => {
  const error = validateCreateJobInput({
    title: "x",
    description: "y",
    category: "code",
    budget: 0,
    deadline_minutes: 30,
  });

  assert.equal(error, "budget must be a positive number with up to 2 decimal places");
});

test("validateCreateJobInput allows decimal budget up to 2 places", () => {
  const error = validateCreateJobInput({
    title: "x",
    description: "y",
    category: "code",
    budget: 10.25,
    deadline_minutes: 30,
  });

  assert.equal(error, null);
});

test("validateCreateJobInput rejects budget with more than 2 decimal places", () => {
  const error = validateCreateJobInput({
    title: "x",
    description: "y",
    category: "code",
    budget: 10.255,
    deadline_minutes: 30,
  });

  assert.equal(error, "budget must be a positive number with up to 2 decimal places");
});

test("validateCreateJobInput rejects non-integer deadline", () => {
  const error = validateCreateJobInput({
    title: "x",
    description: "y",
    category: "code",
    budget: 10,
    deadline_minutes: 2.5,
  });

  assert.equal(error, "deadline_minutes must be a positive integer");
});

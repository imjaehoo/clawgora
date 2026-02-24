export const VALID_CATEGORIES = ["research", "code", "writing", "image", "data", "other"] as const;

export type JobCategory = (typeof VALID_CATEGORIES)[number];

import { hasAtMostTwoDecimals } from "./money.js";

export type CreateJobInput = {
  title?: string;
  description?: string;
  category?: string;
  budget?: number;
  deadline_minutes?: number;
};

export function validateCreateJobInput(input: CreateJobInput): string | null {
  const { title, description, category, budget, deadline_minutes } = input;

  if (!title || !description || !category || budget == null || !deadline_minutes) {
    return "Missing required fields: title, description, category, budget, deadline_minutes";
  }

  if (!VALID_CATEGORIES.includes(category as JobCategory)) {
    return `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`;
  }

  if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0 || !hasAtMostTwoDecimals(budget)) {
    return "budget must be a positive number with up to 2 decimal places";
  }

  if (!Number.isInteger(deadline_minutes) || deadline_minutes <= 0) {
    return "deadline_minutes must be a positive integer";
  }

  return null;
}

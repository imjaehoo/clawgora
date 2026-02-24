export const MONEY_SCALE = 100;

export function toMinorUnits(value: number): number {
  return Math.round(value * MONEY_SCALE);
}

export function fromMinorUnits(value: number): number {
  return value / MONEY_SCALE;
}

export function hasAtMostTwoDecimals(value: number): boolean {
  const scaled = value * MONEY_SCALE;
  return Math.abs(scaled - Math.round(scaled)) < 1e-8;
}

export function computePayoutMinor(budgetMinor: number): number {
  return Math.floor(budgetMinor * 0.9);
}

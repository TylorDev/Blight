import { describe, expect, it } from "vitest";
import { calculateFilledDiariesDiscount } from "../../src/Components/close-ticket-discount";

describe("calculateFilledDiariesDiscount", () => {
  it("applies a 4 percent discount to the filled diary unit price total", () => {
    expect(calculateFilledDiariesDiscount(10, 15_000)).toBe(144_000);
  });

  it("returns zero when quantity or unit price is zero", () => {
    expect(calculateFilledDiariesDiscount(0, 15_000)).toBe(0);
    expect(calculateFilledDiariesDiscount(10, 0)).toBe(0);
  });
});

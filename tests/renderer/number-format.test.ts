import { describe, expect, it } from "vitest";
import { formatThousands, normalizeThousandsInput, parseThousands } from "../../src/number-format";

describe("number-format", () => {
  it.each([
    ["10000", "10.000"],
    ["254000", "254.000"],
    ["4500100", "4.500.100"]
  ])("formats %s as %s", (input, output) => {
    expect(formatThousands(input)).toBe(output);
  });

  it("parses formatted values back to numbers", () => {
    expect(parseThousands("10.000")).toBe(10000);
  });

  it("allows empty input while typing", () => {
    expect(formatThousands("")).toBe("");
    expect(parseThousands("")).toBe(0);
  });

  it("removes non-numeric characters before formatting", () => {
    expect(normalizeThousandsInput("abc4.500,100xyz")).toBe("4.500.100");
  });
});

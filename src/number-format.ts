export function formatThousands(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

  if (digits === "") {
    return "";
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function normalizeThousandsInput(value: string): string {
  return formatThousands(value);
}

export function parseThousands(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? 0 : Number(digits);
}

export function calculateFilledDiariesDiscount(quantity: number, unitPrice: number) {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity <= 0 || unitPrice <= 0) {
    return 0;
  }

  return Math.trunc((Math.trunc(quantity) * Math.trunc(unitPrice) * 96) / 100);
}

export const DPP_FACTOR = 11 / 12;
export const VAT_RATE = 0.12;

export function calcTaxInclusive(subtotalInclusive: number) {
  const dpp = subtotalInclusive * DPP_FACTOR;
  const ppn = dpp * VAT_RATE;
  const total = subtotalInclusive;
  return { dpp, ppn, total };
}

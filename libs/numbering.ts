const ROMAN = ["", "I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
export function monthToRoman(month1to12: number) {
  return ROMAN[month1to12] ?? "";
}

export function makeInvoiceNo(running4: string, date: Date) {
  return `${running4}/INV-FDL/${monthToRoman(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function makeSJNo(running: string, date: Date) {
  const yy = String(date.getFullYear()).slice(-2);
  return `${running}/SJ/${monthToRoman(date.getMonth() + 1)}/${yy}`;
}

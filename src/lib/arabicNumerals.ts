const DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

/** Convert a number to Eastern Arabic (Indic) digits for mushaf markers. */
export function toArabicIndic(n: number): string {
  return String(n)
    .split('')
    .map((ch) => (/[0-9]/.test(ch) ? DIGITS[Number(ch)] : ch))
    .join('')
}

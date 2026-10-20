import mushafData from './mushaf-pages.json'
import { getSurah } from './quran'

export const MUSHAF_PAGE_COUNT = 604

/** Decorative Madani pages. */
export type MushafSpecial = 'fatihah' | 'baqarah' | 'midquran'

export const SPECIAL_PAGE: Record<number, MushafSpecial> = {
  1: 'fatihah',
  2: 'baqarah',
  282: 'midquran',
}

/** Surahs that do not open with a separate basmala line in the mushaf. */
const NO_BASMALA = new Set([1, 9])

export interface MushafSegment {
  /** Surah id */
  s: number
  /** Ayah number */
  a: number
  /** Uthmani words on this line for this ayah (no end glyph) */
  t: string
  /** True when ayah marker closes on this line */
  e?: boolean
}

export interface MushafLine {
  n: number
  segs: MushafSegment[]
}

export interface MushafPageData {
  p: number
  lines: MushafLine[]
}

/** Ornament drawn in an empty Madani line slot. */
export type LineDecoration =
  | { kind: 'surah'; surahId: number; withBasmala: boolean }
  | { kind: 'basmala'; surahId: number }
  | { kind: 'midquran'; surahId: number }

interface MushafFile {
  pageCount: number
  pages: MushafPageData[]
  ayahPage: Record<string, number>
}

const data = mushafData as MushafFile

const pagesByNumber = new Map<number, MushafPageData>()
for (const page of data.pages) {
  pagesByNumber.set(page.p, page)
}

export function getMushafPage(page: number): MushafPageData | null {
  if (page < 1 || page > MUSHAF_PAGE_COUNT) return null
  return pagesByNumber.get(page) ?? null
}

export function getSpecial(page: number): MushafSpecial | null {
  return SPECIAL_PAGE[page] ?? null
}

/** Madani page for a verse. Bismillah (ayah 0) uses the surah's first ayah page. */
export function getPageForAyah(surahId: number, ayah: number): number {
  const n = ayah <= 0 ? 1 : ayah
  const page = data.ayahPage[`${surahId}:${n}`]
  if (typeof page === 'number') return page
  return 1
}

export function clampPage(page: number): number {
  return Math.min(MUSHAF_PAGE_COUNT, Math.max(1, Math.round(page) || 1))
}

/** Human-readable span of content on a page, e.g. "1:1–1:7" or "2:5–2:16". */
export function getPageRangeLabel(page: number): string {
  const p = getMushafPage(page)
  if (!p || p.lines.length === 0) return ''

  let first: { s: number; a: number } | null = null
  let last: { s: number; a: number } | null = null
  for (const line of p.lines) {
    for (const seg of line.segs) {
      if (!first) first = { s: seg.s, a: seg.a }
      last = { s: seg.s, a: seg.a }
    }
  }
  if (!first || !last) return ''

  if (first.s === last.s && first.a === last.a) {
    return `${first.s}:${first.a}`
  }
  if (first.s === last.s) {
    return `${first.s}:${first.a}–${last.a}`
  }
  return `${first.s}:${first.a} – ${last.s}:${last.a}`
}

export function getPageSurahNames(page: number): string {
  const p = getMushafPage(page)
  if (!p) return ''
  const ids = new Set<number>()
  for (const line of p.lines) {
    for (const seg of line.segs) ids.add(seg.s)
  }
  return [...ids]
    .sort((a, b) => a - b)
    .map((id) => getSurah(id).nameSimple)
    .join(' · ')
}

export function surahBannerLabel(surahId: number): string {
  const s = getSurah(surahId)
  return `سُورَةُ ${s.nameArabic}`
}

/**
 * Place surah-name / basmala ornaments into empty Madani line slots
 * immediately above each surah that begins on this page.
 */
export function getLineDecorations(page: number): Map<number, LineDecoration> {
  const result = new Map<number, LineDecoration>()
  const p = getMushafPage(page)
  if (!p) return result

  const occupied = new Set(p.lines.map((l) => l.n))
  const empty = new Set<number>()
  for (let n = 1; n <= 15; n++) {
    if (!occupied.has(n)) empty.add(n)
  }

  const starts: { surahId: number; line: number }[] = []
  const seen = new Set<number>()
  for (const line of p.lines) {
    for (const seg of line.segs) {
      if (seg.a === 1 && !seen.has(seg.s)) {
        seen.add(seg.s)
        starts.push({ surahId: seg.s, line: line.n })
      }
    }
  }

  for (const start of starts) {
    const run: number[] = []
    for (let n = start.line - 1; n >= 1; n--) {
      if (!empty.has(n)) break
      run.unshift(n)
    }
    if (run.length === 0) continue

    const wantsBasmala = !NO_BASMALA.has(start.surahId)
    const isMid = page === 282 && start.surahId === 17

    if (run.length >= 2) {
      const nameLine = run[run.length - 2]!
      const basmalaLine = run[run.length - 1]!
      result.set(
        nameLine,
        isMid
          ? { kind: 'midquran', surahId: start.surahId }
          : { kind: 'surah', surahId: start.surahId, withBasmala: false },
      )
      if (wantsBasmala) {
        result.set(basmalaLine, { kind: 'basmala', surahId: start.surahId })
      }
    } else {
      const only = run[0]!
      if (isMid) {
        result.set(only, { kind: 'midquran', surahId: start.surahId })
      } else {
        result.set(only, {
          kind: 'surah',
          surahId: start.surahId,
          withBasmala: wantsBasmala,
        })
      }
    }
  }

  return result
}

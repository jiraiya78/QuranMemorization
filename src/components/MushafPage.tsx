import { useEffect, useMemo, useRef } from 'react'
import { BISMILLAH } from '../data/bismillah'
import {
  MUSHAF_PAGE_COUNT,
  clampPage,
  getLineDecorations,
  getMushafPage,
  getPageRangeLabel,
  getPageSurahNames,
  getSpecial,
  surahBannerLabel,
  type LineDecoration,
  type MushafSegment,
} from '../data/mushaf'
import { toArabicIndic } from '../lib/arabicNumerals'

const LINE_SLOTS = 15

interface Props {
  page: number
  activeSurahId: number
  activeAyah: number
  onPageChange: (page: number) => void
}

function isActiveSeg(seg: MushafSegment, surahId: number, ayah: number): boolean {
  if (ayah <= 0) return false
  return seg.s === surahId && seg.a === ayah
}

function BannerWing() {
  return <span className="mushaf-banner-wing" aria-hidden />
}

function BannerGem() {
  return <span className="mushaf-banner-gem" aria-hidden />
}

function LineOrnament({ deco }: { deco: LineDecoration }) {
  if (deco.kind === 'basmala') {
    return (
      <div className="mushaf-line-ornament is-basmala" aria-hidden>
        <span className="mushaf-ornament-basmala">{BISMILLAH.arabic}</span>
      </div>
    )
  }

  if (deco.kind === 'midquran') {
    return (
      <div className="mushaf-line-ornament is-midquran" aria-hidden>
        <div className="mushaf-surah-banner is-mid">
          <BannerWing />
          <BannerGem />
          <div className="mushaf-banner-core">
            <span className="mushaf-mid-label">منتصف القرآن</span>
            <span className="mushaf-ornament-title">{surahBannerLabel(deco.surahId)}</span>
          </div>
          <BannerGem />
          <BannerWing />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mushaf-line-ornament is-surah${deco.withBasmala ? ' with-basmala' : ''}`}
      aria-hidden
    >
      <div className="mushaf-surah-banner">
        <BannerWing />
        <BannerGem />
        <span className="mushaf-ornament-title">{surahBannerLabel(deco.surahId)}</span>
        <BannerGem />
        <BannerWing />
      </div>
      {deco.withBasmala ? (
        <span className="mushaf-ornament-basmala">{BISMILLAH.arabic}</span>
      ) : null}
    </div>
  )
}

export function MushafPage({ page, activeSurahId, activeAyah, onPageChange }: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const linesRootRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLElement | null>(null)

  const pageData = useMemo(() => getMushafPage(page), [page])
  const special = getSpecial(page)
  const rangeLabel = useMemo(() => getPageRangeLabel(page), [page])
  const surahNames = useMemo(() => getPageSurahNames(page), [page])
  const decorations = useMemo(() => getLineDecorations(page), [page])

  const linesByN = useMemo(() => {
    const map = new Map<
      number,
      NonNullable<typeof pageData>['lines'][number]
    >()
    if (pageData) {
      for (const line of pageData.lines) map.set(line.n, line)
    }
    return map
  }, [pageData])

  useEffect(() => {
    const node = activeRef.current
    const viewport = viewportRef.current
    if (!node || !viewport) return
    const nodeRect = node.getBoundingClientRect()
    const viewRect = viewport.getBoundingClientRect()
    const offset =
      nodeRect.top - viewRect.top - viewRect.height / 2 + nodeRect.height / 2
    viewport.scrollBy({ top: offset, behavior: 'smooth' })
  }, [activeSurahId, activeAyah, page])

  /**
   * Shared font-size on the lines root so row height (em) tracks it.
   * Keep ayah-list base size; only shrink when a Madani line would overflow.
   */
  useEffect(() => {
    const root = linesRootRef.current
    if (!root) return

    const fit = () => {
      const lines = [
        ...root.querySelectorAll<HTMLElement>(
          '.mushaf-line:not(.is-empty):not(.is-ornament)',
        ),
      ]
      if (lines.length === 0) return

      root.style.fontSize = ''
      const computed = Number.parseFloat(getComputedStyle(root).fontSize)
      if (!Number.isFinite(computed) || computed <= 0) return

      let lo = Math.max(12, computed * 0.72)
      let hi = computed
      let best = computed

      const overflows = () =>
        lines.some((line) => line.scrollWidth > line.clientWidth + 1)

      if (overflows()) {
        for (let i = 0; i < 14; i++) {
          const mid = (lo + hi) / 2
          root.style.fontSize = `${mid}px`
          if (overflows()) {
            hi = mid
          } else {
            best = mid
            lo = mid
          }
        }
        root.style.fontSize = `${best}px`
      }

      for (const line of lines) {
        const fill = line.scrollWidth / Math.max(1, line.clientWidth)
        line.classList.toggle('is-full', fill >= 0.9)
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    return () => ro.disconnect()
  }, [page, pageData, decorations])

  const slots = Array.from({ length: LINE_SLOTS }, (_, i) => i + 1)
  const centerPage = special === 'fatihah' || special === 'baqarah'

  return (
    <div className="mushaf-viewer">
      <div className="mushaf-page-chrome">
        <button
          type="button"
          className="mushaf-page-nav"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(clampPage(page - 1))}
        >
          ‹
        </button>
        <div className="mushaf-page-meta">
          <span className="mushaf-page-number">
            Page {page} / {MUSHAF_PAGE_COUNT}
          </span>
          {rangeLabel ? (
            <span className="mushaf-page-limits" title={surahNames}>
              {rangeLabel}
              {surahNames ? ` · ${surahNames}` : ''}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="mushaf-page-nav"
          disabled={page >= MUSHAF_PAGE_COUNT}
          aria-label="Next page"
          onClick={() => onPageChange(clampPage(page + 1))}
        >
          ›
        </button>
      </div>

      <div className="mushaf-viewport" ref={viewportRef}>
        <div
          className={`mushaf-sheet${special ? ` is-${special}` : ''}${centerPage ? ' is-centered' : ''}`}
          dir="rtl"
          lang="ar"
        >
          <div className="mushaf-sheet-frame">
            <div className="mushaf-lines" ref={linesRootRef}>
              {slots.map((n) => {
                const deco = decorations.get(n)
                if (deco) {
                  return (
                    <div
                      key={n}
                      className="mushaf-line is-ornament"
                      data-line={n}
                    >
                      <LineOrnament deco={deco} />
                    </div>
                  )
                }

                const line = linesByN.get(n)
                const segs = line?.segs ?? []
                if (segs.length === 0) {
                  return (
                    <div
                      key={n}
                      className="mushaf-line is-empty"
                      data-line={n}
                    />
                  )
                }

                return (
                  <div
                    key={n}
                    className={`mushaf-line${centerPage ? ' is-short' : ''}`}
                    data-line={n}
                  >
                    {segs.map((seg, idx) => {
                      const active = isActiveSeg(seg, activeSurahId, activeAyah)
                      const words = seg.t ? seg.t.split(/\s+/).filter(Boolean) : []
                      return (
                        <span
                          key={`${seg.s}:${seg.a}:${idx}`}
                          className={`mushaf-seg${active ? ' active' : ''}`}
                          data-ayah={`${seg.s}:${seg.a}`}
                        >
                          {words.map((word, wi) => (
                            <span
                              key={wi}
                              ref={
                                active && wi === 0
                                  ? (node) => {
                                      activeRef.current = node
                                    }
                                  : undefined
                              }
                              className="mushaf-word"
                            >
                              {word}
                            </span>
                          ))}
                          {seg.e ? (
                            <span
                              ref={
                                active && words.length === 0
                                  ? (node) => {
                                      activeRef.current = node
                                    }
                                  : undefined
                              }
                              className="mushaf-ayah-mark"
                              aria-label={`Ayah ${seg.a}`}
                            >
                              <span className="mushaf-ayah-mark-num">
                                {toArabicIndic(seg.a)}
                              </span>
                            </span>
                          ) : null}
                        </span>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            <footer className="mushaf-sheet-footer">
              <span>{toArabicIndic(page)}</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}

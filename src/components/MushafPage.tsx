import { useEffect, useMemo, useRef } from 'react'
import { BISMILLAH } from '../data/bismillah'
import {
  getLineDecorations,
  getMushafPage,
  getPageRangeLabel,
  getPageSurahNames,
  getSpecial,
  surahBannerLabel,
  type LineDecoration,
  type MushafSegment,
} from '../data/mushaf'
import { getSurah } from '../data/quran'
import { toArabicIndic } from '../lib/arabicNumerals'
import { useAyahSelectHandlers, type AyahRef } from '../lib/ayahSelect'
import { MushafPageChrome } from './MushafPageChrome'

const LINE_SLOTS = 15

interface Props {
  page: number
  activeSurahId: number
  activeAyah: number
  selectedSurahId?: number | null
  selectedAyah?: number | null
  onSelectAyah?: (ref: AyahRef) => void
  onPageChange: (page: number) => void
  /** When true, page chrome is rendered by the parent (e.g. fullscreen landscape). */
  hideChrome?: boolean
}

function isActiveSeg(seg: MushafSegment, surahId: number, ayah: number): boolean {
  if (ayah <= 0) return false
  return seg.s === surahId && seg.a === ayah
}

function MushafAyahSeg({
  seg,
  active,
  selected,
  onSelectAyah,
  setActiveNode,
}: {
  seg: MushafSegment
  active: boolean
  selected: boolean
  onSelectAyah?: (ref: AyahRef) => void
  setActiveNode?: (node: HTMLElement | null) => void
}) {
  const words = seg.t ? seg.t.split(/\s+/).filter(Boolean) : []
  /** Handlers go on children — parent uses `display:contents` and is not hit-testable. */
  const handlers = useAyahSelectHandlers(seg.s, seg.a, onSelectAyah)

  return (
    <span
      className={`mushaf-seg${active ? ' active' : ''}${selected ? ' selected' : ''}`}
      data-ayah={`${seg.s}:${seg.a}`}
    >
      {words.map((word, wi) => (
        <span
          key={wi}
          ref={active && wi === 0 ? setActiveNode : undefined}
          className="mushaf-word"
          {...handlers}
        >
          {word}
        </span>
      ))}
      {seg.e ? (
        <span
          ref={active && words.length === 0 ? setActiveNode : undefined}
          className="mushaf-ayah-mark"
          role="button"
          tabIndex={0}
          aria-label={`Select ayah ${seg.a}`}
          {...handlers}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelectAyah?.({ surahId: seg.s, ayah: seg.a })
            }
          }}
        >
          <span className="mushaf-ayah-mark-num">{toArabicIndic(seg.a)}</span>
        </span>
      ) : null}
    </span>
  )
}

function SurahBanner({
  surahId,
  mid,
}: {
  surahId: number
  mid?: boolean
}) {
  const meta = getSurah(surahId)
  return (
    <div className={`mushaf-surah-banner${mid ? ' is-mid' : ''}`} aria-hidden>
      <div className="mushaf-banner-pattern" />
      <div className="mushaf-banner-medallion" title={`${meta.versesCount} ayahs`}>
        <span className="mushaf-banner-medallion-num">{toArabicIndic(meta.versesCount)}</span>
        <span className="mushaf-banner-medallion-cap">آية</span>
      </div>
      <div className="mushaf-banner-cartouche">
        {mid ? <span className="mushaf-mid-label">منتصف القرآن</span> : null}
        <span className="mushaf-ornament-title">{surahBannerLabel(surahId)}</span>
      </div>
      <div className="mushaf-banner-medallion" title={`Surah ${surahId}`}>
        <span className="mushaf-banner-medallion-num">{toArabicIndic(surahId)}</span>
        <span className="mushaf-banner-medallion-cap">سورة</span>
      </div>
    </div>
  )
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
        <SurahBanner surahId={deco.surahId} mid />
      </div>
    )
  }

  return (
    <div
      className={`mushaf-line-ornament is-surah${deco.withBasmala ? ' with-basmala' : ''}`}
      aria-hidden
    >
      <SurahBanner surahId={deco.surahId} />
      {deco.withBasmala ? (
        <span className="mushaf-ornament-basmala">{BISMILLAH.arabic}</span>
      ) : null}
    </div>
  )
}

export function MushafPage({
  page,
  activeSurahId,
  activeAyah,
  selectedSurahId = null,
  selectedAyah = null,
  onSelectAyah,
  onPageChange,
  hideChrome = false,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const linesRootRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLElement | null>(null)

  const pageData = useMemo(() => getMushafPage(page), [page])
  const special = getSpecial(page)
  const rangeLabel = useMemo(() => getPageRangeLabel(page), [page])
  const surahNames = useMemo(() => getPageSurahNames(page), [page])
  const decorations = useMemo(() => getLineDecorations(page), [page])

  const linesByN = useMemo(() => {
    const map = new Map<number, NonNullable<typeof pageData>['lines'][number]>()
    if (pageData) {
      for (const line of pageData.lines) map.set(line.n, line)
    }
    return map
  }, [pageData])

  useEffect(() => {
    const root = linesRootRef.current
    if (!root) return

    const paintHighlights = () => {
      for (const old of root.querySelectorAll('.mushaf-line-highlight')) {
        old.remove()
      }

      const paintBand = (line: HTMLElement, selector: string, className: string) => {
        const pieces = [...line.querySelectorAll<HTMLElement>(selector)]
        if (pieces.length === 0) return

        const lineRect = line.getBoundingClientRect()
        let minL = Infinity
        let maxR = -Infinity
        for (const el of pieces) {
          const r = el.getBoundingClientRect()
          minL = Math.min(minL, r.left)
          maxR = Math.max(maxR, r.right)
        }
        if (!Number.isFinite(minL) || maxR <= minL) return

        const pad = Math.max(6, Number.parseFloat(getComputedStyle(line).fontSize) * 0.22)
        const left = Math.max(0, minL - lineRect.left - pad)
        const right = Math.min(lineRect.width, maxR - lineRect.left + pad)

        const band = document.createElement('div')
        band.className = className
        band.setAttribute('aria-hidden', 'true')
        band.style.left = `${left}px`
        band.style.width = `${Math.max(0, right - left)}px`
        line.insertBefore(band, line.firstChild)
      }

      for (const line of root.querySelectorAll<HTMLElement>(
        '.mushaf-line:not(.is-empty):not(.is-ornament)',
      )) {
        paintBand(
          line,
          '.mushaf-seg.selected .mushaf-word, .mushaf-seg.selected .mushaf-ayah-mark',
          'mushaf-line-highlight is-selected',
        )
        paintBand(
          line,
          '.mushaf-seg.active .mushaf-word, .mushaf-seg.active .mushaf-ayah-mark',
          'mushaf-line-highlight',
        )
      }
    }

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

      paintHighlights()
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    return () => ro.disconnect()
  }, [page, pageData, decorations, activeSurahId, activeAyah, selectedSurahId, selectedAyah])

  useEffect(() => {
    const root = linesRootRef.current
    const viewport = viewportRef.current
    if (!root || !viewport) return

    const id = window.requestAnimationFrame(() => {
      const node =
        root.querySelector<HTMLElement>(
          '.mushaf-seg.active .mushaf-word, .mushaf-seg.active .mushaf-ayah-mark',
        ) ?? activeRef.current
      if (!node) return
      const nodeRect = node.getBoundingClientRect()
      const viewRect = viewport.getBoundingClientRect()
      if (nodeRect.width <= 0 && nodeRect.height <= 0) return
      const offset =
        nodeRect.top - viewRect.top - viewRect.height / 2 + nodeRect.height / 2
      viewport.scrollBy({ top: offset, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [activeSurahId, activeAyah, page])

  const slots = Array.from({ length: LINE_SLOTS }, (_, i) => i + 1)
  const centerPage = special === 'fatihah' || special === 'baqarah'

  return (
    <div className="mushaf-viewer">
      {!hideChrome ? (
        <MushafPageChrome
          page={page}
          rangeLabel={rangeLabel}
          surahNames={surahNames}
          onPageChange={onPageChange}
        />
      ) : null}

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
                    <div key={n} className="mushaf-line is-ornament" data-line={n}>
                      <LineOrnament deco={deco} />
                    </div>
                  )
                }

                const line = linesByN.get(n)
                const segs = line?.segs ?? []
                if (segs.length === 0) {
                  return <div key={n} className="mushaf-line is-empty" data-line={n} />
                }

                return (
                  <div
                    key={n}
                    className={`mushaf-line${centerPage ? ' is-short' : ''}`}
                    data-line={n}
                  >
                    {segs.map((seg, idx) => {
                      const active = isActiveSeg(seg, activeSurahId, activeAyah)
                      const selected =
                        selectedSurahId != null &&
                        selectedAyah != null &&
                        seg.s === selectedSurahId &&
                        seg.a === selectedAyah
                      return (
                        <MushafAyahSeg
                          key={`${seg.s}:${seg.a}:${idx}`}
                          seg={seg}
                          active={active}
                          selected={selected}
                          onSelectAyah={onSelectAyah}
                          setActiveNode={
                            active
                              ? (node) => {
                                  activeRef.current = node
                                }
                              : undefined
                          }
                        />
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

export function useMushafPageMeta(page: number) {
  return useMemo(
    () => ({
      rangeLabel: getPageRangeLabel(page),
      surahNames: getPageSurahNames(page),
    }),
    [page],
  )
}

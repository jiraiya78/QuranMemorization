import { useEffect, useMemo, useRef, useState } from 'react'
import { BISMILLAH } from '../data/bismillah'
import {
  getLineDecorations,
  getMushafPage,
  getPageForAyah,
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
const ZOOM_MIN = 0.7
const ZOOM_MAX = 2.4

interface Props {
  page: number
  activeSurahId: number
  activeAyah: number
  selectedSurahId?: number | null
  selectedAyah?: number | null
  onSelectAyah?: (ref: AyahRef) => void
  /** Jump viewport to this surah's banner when `focusSurahKey` changes. */
  focusSurahId?: number | null
  focusSurahKey?: number
  /** Re-fit Madani lines when weight/family scale changes. */
  fitKey?: string | number
  /** Bumped by the player on every playlist move — forces a re-centre. */
  followKey?: number
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
    <div
      className={`mushaf-surah-banner${mid ? ' is-mid' : ''}`}
      data-surah-banner={surahId}
      aria-hidden
    >
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
      <div
        className="mushaf-line-ornament is-basmala"
        data-surah-start={deco.surahId}
        aria-hidden
      >
        <span className="mushaf-ornament-basmala">{BISMILLAH.arabic}</span>
      </div>
    )
  }

  if (deco.kind === 'midquran') {
    return (
      <div
        className="mushaf-line-ornament is-midquran"
        data-surah-start={deco.surahId}
        aria-hidden
      >
        <SurahBanner surahId={deco.surahId} mid />
      </div>
    )
  }

  return (
    <div
      className={`mushaf-line-ornament is-surah${deco.withBasmala ? ' with-basmala' : ''}`}
      data-surah-start={deco.surahId}
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
  focusSurahId = null,
  focusSurahKey = 0,
  fitKey = '',
  followKey = 0,
  onPageChange,
  hideChrome = false,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const linesRootRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLElement | null>(null)
  const scrolledFocusKeyRef = useRef(0)
  const baseFitRef = useRef(0)
  const paintedKeysRef = useRef('')
  const repaintRef = useRef<(() => void) | null>(null)
  const zoomRef = useRef(1)
  /** Read inside the fit closure, which no longer remounts on every ayah step. */
  const highlightStateRef = useRef({ activeSurahId, activeAyah, selectedSurahId, selectedAyah })
  highlightStateRef.current = { activeSurahId, activeAyah, selectedSurahId, selectedAyah }
  const [zoom, setZoom] = useState(1)
  zoomRef.current = zoom

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
    const viewport = viewportRef.current
    if (!root) return

    const publishFittedSize = (px: number) => {
      const reader = root.closest('.ayah-reader') as HTMLElement | null
      if (reader) reader.style.setProperty('--mushaf-fitted-size', `${px}px`)
    }

    const paintHighlights = () => {
      // Bail out BEFORE touching the DOM: the second caller in the same commit
      // must not wipe the bands that the first one just painted.
      const state = highlightStateRef.current
      const key = [
        page,
        state.activeSurahId,
        state.activeAyah,
        state.selectedSurahId ?? '',
        state.selectedAyah ?? '',
      ].join(':')
      if (key === paintedKeysRef.current) return
      paintedKeysRef.current = key

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

    const applySize = (basePx: number, zoomFactor: number) => {
      const px = Math.max(8, basePx * zoomFactor)
      root.style.fontSize = `${px}px`
      publishFittedSize(px)
      return px
    }

    const fit = () => {
      const lines = [
        ...root.querySelectorAll<HTMLElement>(
          '.mushaf-line:not(.is-empty):not(.is-ornament)',
        ),
      ]
      if (lines.length === 0) return

      // Measure at CSS default (zoom=1) so Madani lines stay intact.
      root.style.fontSize = ''
      const computed = Number.parseFloat(getComputedStyle(root).fontSize)
      if (!Number.isFinite(computed) || computed <= 0) return

      const narrow =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 900px) and (orientation: portrait)').matches
      const floor = Math.max(narrow ? 9 : 11, computed * (narrow ? 0.42 : 0.55))

      const overflows = () =>
        lines.some((line) => line.scrollWidth > line.clientWidth + 0.5)

      let best = 0

      // Fast path: most pages fit at exactly the size the previous one used, so
      // this avoids ~10 forced reflows right when the next ayah's audio starts.
      const previous = baseFitRef.current
      if (previous >= floor && previous <= computed) {
        root.style.fontSize = `${previous}px`
        if (!overflows()) best = previous
      }

      if (best === 0) {
        let lo = floor
        let hi = computed
        best = floor

        root.style.fontSize = `${floor}px`
        if (!overflows()) {
          for (let i = 0; i < 12; i++) {
            const mid = (lo + hi) / 2
            root.style.fontSize = `${mid}px`
            if (overflows()) {
              hi = mid
            } else {
              best = mid
              lo = mid
            }
          }
        }
      }

      baseFitRef.current = best
      applySize(best, zoomRef.current)

      for (const line of lines) {
        const fill = line.scrollWidth / Math.max(1, line.clientWidth)
        line.classList.toggle('is-full', fill >= 0.9 && zoomRef.current <= 1.01)
      }

      if (viewport) {
        viewport.classList.toggle('is-zoomed', zoomRef.current > 1.01)
      }

      // Geometry changed — force a repaint of highlight bands.
      paintedKeysRef.current = ''
      paintHighlights()
    }

    repaintRef.current = paintHighlights
    paintedKeysRef.current = ''
    fit()
    const ro = new ResizeObserver(() => fit())
    ro.observe(root)
    if (viewport) ro.observe(viewport)
    return () => {
      ro.disconnect()
      repaintRef.current = null
    }
    // Fit runs on page/size changes only — never on every ayah step (avoids reflow jitter).
  }, [page, pageData, decorations, fitKey])

  /** Ayah/selection changed on the same page: repaint bands only, no re-fit. */
  useEffect(() => {
    repaintRef.current?.()
  }, [activeSurahId, activeAyah, selectedSurahId, selectedAyah, page])

  /** Re-apply zoom without re-fitting the Madani base size. */
  useEffect(() => {
    const root = linesRootRef.current
    const viewport = viewportRef.current
    if (!root || baseFitRef.current <= 0) return
    const px = Math.max(8, baseFitRef.current * zoom)
    root.style.fontSize = `${px}px`
    const reader = root.closest('.ayah-reader') as HTMLElement | null
    if (reader) reader.style.setProperty('--mushaf-fitted-size', `${px}px`)
    viewport?.classList.toggle('is-zoomed', zoom > 1.01)

    for (const line of root.querySelectorAll<HTMLElement>(
      '.mushaf-line:not(.is-empty):not(.is-ornament)',
    )) {
      const fill = line.scrollWidth / Math.max(1, line.clientWidth)
      line.classList.toggle('is-full', fill >= 0.9 && zoom <= 1.01)
    }

    // Font size changed, so highlight band geometry must be re-measured.
    paintedKeysRef.current = ''
    repaintRef.current?.()
  }, [zoom])

  /** Pinch-to-zoom on the mushaf viewport. */
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    let startDist = 0
    let startZoom = 1

    const distance = (a: Touch, b: Touch) => {
      const dx = a.clientX - b.clientX
      const dy = a.clientY - b.clientY
      return Math.hypot(dx, dy)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      startDist = distance(e.touches[0]!, e.touches[1]!)
      startZoom = zoomRef.current
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || startDist <= 0) return
      e.preventDefault()
      const ratio = distance(e.touches[0]!, e.touches[1]!) / startDist
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, startZoom * ratio))
      setZoom(next)
    }

    const onTouchEnd = () => {
      startDist = 0
    }

    viewport.addEventListener('touchstart', onTouchStart, { passive: true })
    viewport.addEventListener('touchmove', onTouchMove, { passive: false })
    viewport.addEventListener('touchend', onTouchEnd)
    viewport.addEventListener('touchcancel', onTouchEnd)
    return () => {
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('touchend', onTouchEnd)
      viewport.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  useEffect(() => {
    setZoom(1)
  }, [page])

  /** After next/prev surah, pin the viewport to that surah's banner (once per focus key). */
  useEffect(() => {
    if (focusSurahId == null || focusSurahKey <= 0) return
    if (scrolledFocusKeyRef.current === focusSurahKey) return
    if (page !== getPageForAyah(focusSurahId, 1)) return

    const root = linesRootRef.current
    const viewport = viewportRef.current
    if (!root || !viewport) return

    let inner = 0
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        const banner = root.querySelector<HTMLElement>(
          `[data-surah-banner="${focusSurahId}"]`,
        )
        const target =
          banner ??
          root.querySelector<HTMLElement>(`[data-ayah^="${focusSurahId}:"]`)
        scrolledFocusKeyRef.current = focusSurahKey
        if (!target) {
          viewport.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        const tRect = target.getBoundingClientRect()
        const vRect = viewport.getBoundingClientRect()
        viewport.scrollBy({ top: tRect.top - vRect.top - 6, behavior: 'smooth' })
      })
    })
    return () => {
      window.cancelAnimationFrame(outer)
      window.cancelAnimationFrame(inner)
    }
  }, [focusSurahId, focusSurahKey, page])

  /**
   * Follow the recitation: keep the active ayah vertically centered, clamped at
   * the sheet edges (top at the start of the page, bottom at the end). While the
   * Basmala plays there is no ayah highlight, so aim at the surah header instead.
   */
  useEffect(() => {
    const root = linesRootRef.current
    const viewport = viewportRef.current
    if (!root || !viewport) return

    const id = window.requestAnimationFrame(() => {
      // The Basmala has no ayah highlight, so its "target" is the surah header.
      const targets =
        activeAyah > 0
          ? [
              ...root.querySelectorAll<HTMLElement>(
                '.mushaf-seg.active .mushaf-word, .mushaf-seg.active .mushaf-ayah-mark',
              ),
            ]
          : [...root.querySelectorAll<HTMLElement>(`[data-surah-start="${activeSurahId}"]`)]

      if (targets.length === 0) {
        const fallback =
          activeAyah > 0
            ? activeRef.current
            : root.querySelector<HTMLElement>(`[data-ayah^="${activeSurahId}:"]`)
        if (!fallback) return
        targets.push(fallback)
      }

      // Union of the ayah's words (an ayah can wrap over several Madani lines).
      let top = Infinity
      let bottom = -Infinity
      for (const el of targets) {
        const r = el.getBoundingClientRect()
        if (r.width <= 0 && r.height <= 0) continue
        top = Math.min(top, r.top)
        bottom = Math.max(bottom, r.bottom)
      }
      if (!Number.isFinite(top) || bottom <= top) return

      const viewRect = viewport.getBoundingClientRect()
      const usable = viewport.clientHeight
      const height = bottom - top
      // Taller than the screen: pin the start near the top, else centre it.
      const centered =
        height >= usable - 16
          ? top - viewRect.top + viewport.scrollTop - 8
          : (top + bottom) / 2 -
            (viewRect.top + usable / 2) +
            viewport.scrollTop

      const maxScroll = Math.max(0, viewport.scrollHeight - usable)
      const target = Math.min(maxScroll, Math.max(0, centered))
      if (Math.abs(target - viewport.scrollTop) < 2) return
      viewport.scrollTo({ top: target, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [activeSurahId, activeAyah, page, followKey])

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

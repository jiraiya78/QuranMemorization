import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react'
import { BISMILLAH } from '../data/bismillah'
import {
  getLineDecorations,
  getMushafPage,
  getPageForAyah,
  getPageRangeLabel,
  getPageSurahNames,
  getSpecial,
  surahBannerLabel,
  clampPage,
  type LineDecoration,
  type MushafSegment,
} from '../data/mushaf'
import { getSurah } from '../data/quran'
import { toArabicIndic } from '../lib/arabicNumerals'
import { useAyahSelectHandlers, type AyahRef } from '../lib/ayahSelect'
import type { PageFit } from '../types'
import { MushafPageChrome } from './MushafPageChrome'

const LINE_SLOTS = 15
const ZOOM_MIN = 0.7
const ZOOM_MAX = 2.4

/**
 * 100% text size sits at this share of the largest size that still fits the
 * Madani page, so the +/− control always has headroom while never spilling over
 * the page edge.
 */
const FIT_BASE_RATIO = 0.86
/** Horizontal swipe distance (px) that turns a page. */
const SWIPE_THRESHOLD = 56
/** Movement (px) before a touch is treated as a horizontal page drag. */
const DRAG_SLOP = 10
/** Page-transition durations. Keep in sync with the keyframes in index.css. */
const SLIDE_MS = 300
const TURN_MS = 340
/** Easing for the pan of a page across its spread — shared by both sheets. */
const PAN_EASE = 'cubic-bezier(0.3, 0.72, 0.25, 1)'
const TURN_EASE = 'cubic-bezier(0.32, 0.6, 0.3, 1)'
/** How far a turning leaf swings about its gutter, in degrees. */
const LEAF_ANGLE = 76
/** Angle the arriving page starts from when no leaf is available (buttons, remote). */
const LEAF_LAND = 58

/**
 * The Madani Mushaf is read right to left, so the book is a strip whose first
 * page sits on the far right and whose 604th page sits on the far left. Odd
 * pages are the right-hand page of their spread and even pages the left-hand
 * one, which makes the facing pairs:
 *
 *   spread 1 → [ 2 | 1 ]   spread 2 → [ 4 | 3 ]   …   spread 302 → [ 604 | 603 ]
 */
function pageIsRightSide(page: number): boolean {
  return page % 2 === 1
}

/**
 * Two pages face each other only when the lower number is odd (1↔2, 3↔4…), so
 * that step is a pan across the open book (`slide`). Every other step crosses
 * the spine into another spread and is a leaf turn (`turn`).
 *
 *   right page (odd)  + swipe left  → slide     + swipe right → turn
 *   left page  (even) + swipe left  → turn      + swipe right → slide
 */
function turnModeFor(from: number, to: number): 'slide' | 'turn' {
  return Math.min(from, to) % 2 === 1 ? 'slide' : 'turn'
}

/**
 * Swipe direction, in page deltas. The pages run right to left, so dragging the
 * strip leftward (`dx < 0`) uncovers the page sitting to the *right*, i.e. the
 * previous page, and dragging rightward advances to the next one.
 */
function pageDeltaFor(dx: number): 1 | -1 {
  return dx < 0 ? -1 : 1
}

/** Honour the OS "reduce motion" setting: pages then swap with no travel. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

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
  /** User text-size multiplier applied below the page cap. */
  fontScale?: number
  /** `width` scrolls a tall page; `screen` squeezes all 15 lines in at once. */
  pageFit?: PageFit
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
  fontScale = 1,
  pageFit = 'width',
  followKey = 0,
  onPageChange,
  hideChrome = false,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const linesRootRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLElement | null>(null)
  const scrolledFocusKeyRef = useRef(0)
  /** User-scaled base size (before pinch zoom). */
  const baseFitRef = useRef(0)
  /** Largest size that still fits the page — the hard cap for +/−. */
  const maxFitRef = useRef(0)
  /** Viewport budget the current fit was measured against (width, height, text width). */
  const fitBudgetRef = useRef({ width: -1, height: -1, text: -1 })
  const applyScaleRef = useRef<() => void>(() => {})
  const scaleRef = useRef(fontScale)
  scaleRef.current = fontScale
  const onPageChangeRef = useRef(onPageChange)
  onPageChangeRef.current = onPageChange
  const pageRef = useRef(page)
  pageRef.current = page
  const lastPageRef = useRef<number | null>(null)
  /** Set by the swipe handler so the next page render plays the matching entrance. */
  const pendingTurnRef = useRef<{
    dir: 1 | -1
    mode: 'slide' | 'turn'
    /** Where the incoming page starts, in px (negative = left of the viewport). */
    enterFrom?: number
  } | null>(null)
  /**
   * When the current page transition stops accepting input. A deadline, not a
   * flag: if the clone that drives the animation is torn down early (a fast
   * re-render, a hidden tab), paging must still recover on its own.
   */
  const animatingUntilRef = useRef(0)
  const animating = () => performance.now() < animatingUntilRef.current
  const animTimerRef = useRef(0)
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
      // Publish globally: the translation panel may live in the side rail,
      // outside this reader subtree, and still needs to track the Arabic size.
      document.documentElement.style.setProperty('--mushaf-fitted-size', `${px}px`)
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
      const next = `${px}px`
      // Only touch the DOM when the value really moves: writing the same size
      // still invalidates style for the whole tree, and in whole-page fit the
      // translation panel's height feeds back into the viewport height.
      if (root.style.fontSize === next) return px
      root.style.fontSize = next
      publishFittedSize(px)
      return px
    }

    const pageLines = () => [
      ...root.querySelectorAll<HTMLElement>(
        '.mushaf-line:not(.is-empty):not(.is-ornament)',
      ),
    ]

    /** Apply the user's text-size multiplier below the fitted page cap. */
    const applyUserScale = () => {
      const maxFit = maxFitRef.current
      if (maxFit <= 0) return

      const base = Math.max(8, Math.min(maxFit, maxFit * FIT_BASE_RATIO * scaleRef.current))
      baseFitRef.current = base
      applySize(base, zoomRef.current)

      for (const line of pageLines()) {
        const fill = line.scrollWidth / Math.max(1, line.clientWidth)
        line.classList.toggle('is-full', fill >= 0.9 && zoomRef.current <= 1.01)
      }
      viewport?.classList.toggle('is-zoomed', zoomRef.current > 1.01)
      viewport?.classList.toggle('is-screen-fit', pageFit === 'screen')

      // Geometry changed — force a repaint of highlight bands.
      paintedKeysRef.current = ''
      paintHighlights()
    }

    /**
     * Everything the fit depends on: the viewport box, plus the root's own
     * width (the A4 max-width is rem-based, so interface zoom changes it).
     */
    const fitBudget = () => ({
      width: viewport?.clientWidth ?? root.clientWidth,
      height: viewport?.clientHeight ?? 0,
      text: root.clientWidth,
    })

    const fit = () => {
      const lines = pageLines()
      if (lines.length === 0) return

      // Measure at scale 1 so the +/- control (not the CSS clamp) owns the size.
      root.style.fontSize = ''
      const savedScale = root.style.getPropertyValue('--font-scale')
      root.style.setProperty('--font-scale', '1')
      const natural = Number.parseFloat(getComputedStyle(root).fontSize)
      if (savedScale) root.style.setProperty('--font-scale', savedScale)
      else root.style.removeProperty('--font-scale')
      if (!Number.isFinite(natural) || natural <= 0) return

      const narrow =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 900px) and (orientation: portrait)').matches
      const floor = Math.max(narrow ? 8 : 10, natural * 0.35)
      const hiCap = natural * (pageFit === 'screen' ? 6 : 2.6)
      const sheet = root.closest('.mushaf-sheet') as HTMLElement | null

      const overflows = () =>
        lines.some((line) => line.scrollWidth > line.clientWidth + 0.5)

      const fitsPage = () => {
        if (overflows()) return false
        if (pageFit !== 'screen' || !viewport || !sheet) return true
        return sheet.getBoundingClientRect().height <= viewport.clientHeight + 1
      }

      let best = 0

      // Fast path: most pages fit at exactly the size the previous one used —
      // but only while the space budget is unchanged, so resizing wider grows
      // the page instead of keeping the old, smaller fit.
      const budget = fitBudget()
      const previous = maxFitRef.current
      const sameBudget =
        budget.width === fitBudgetRef.current.width &&
        budget.height === fitBudgetRef.current.height &&
        budget.text === fitBudgetRef.current.text
      if (sameBudget && previous >= floor && previous <= hiCap) {
        root.style.fontSize = `${previous}px`
        if (fitsPage()) best = previous
      }

      if (best === 0) {
        let lo = floor
        let hi = hiCap
        best = floor

        root.style.fontSize = `${floor}px`
        if (fitsPage()) {
          for (let i = 0; i < 14; i++) {
            const mid = (lo + hi) / 2
            root.style.fontSize = `${mid}px`
            if (fitsPage()) {
              best = mid
              lo = mid
            } else {
              hi = mid
            }
          }
        }
      }

      maxFitRef.current = best
      fitBudgetRef.current = budget
      applyUserScale()
    }

    applyScaleRef.current = applyUserScale
    repaintRef.current = paintHighlights
    paintedKeysRef.current = ''
    fit()

    // Re-fit only when the width budget (or the viewport height for whole-page
    // fit) actually changes. Watching the root's *height* would loop: fit()
    // measures at the page cap, then applies the smaller user size, which
    // resizes the root again.
    let lastWidth = -1
    let lastHeight = -1
    let lastTextWidth = -1
    let raf = 0
    /**
     * Re-fit on the next frame instead of inside the observer callback. A fit
     * that changes layout synchronously from ResizeObserver is what produces
     * "ResizeObserver loop completed with undelivered notifications", and in
     * whole-page fit the translation panel can echo the Arabic size back into
     * the viewport height. Deferring one frame coalesces the burst into a
     * single measurement pass.
     */
    const ro = new ResizeObserver(() => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const budget = fitBudget()
        if (
          budget.width === lastWidth &&
          budget.height === lastHeight &&
          budget.text === lastTextWidth
        ) {
          return
        }
        lastWidth = budget.width
        lastHeight = budget.height
        lastTextWidth = budget.text
        fit()
      })
    })
    ro.observe(root)
    if (viewport) ro.observe(viewport)

    // Web fonts can land after mount and change the line metrics.
    let cancelled = false
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) fit()
      })
    }

    return () => {
      cancelled = true
      if (raf) window.cancelAnimationFrame(raf)
      ro.disconnect()
      repaintRef.current = null
      applyScaleRef.current = () => {}
    }
    // Fit runs on page/size changes only — never on every ayah step (avoids reflow jitter).
  }, [page, pageData, decorations, fitKey, pageFit])

  /**
   * +/− text size: re-apply below the fitted page cap without re-measuring the
   * Madani lines, so the whole range works and nothing spills past the page.
   */
  useEffect(() => {
    scaleRef.current = fontScale
    applyScaleRef.current()
  }, [fontScale])

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
    document.documentElement.style.setProperty('--mushaf-fitted-size', `${px}px`)
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

  /**
   * Play the entrance half of a page change. The outgoing half (if any) was
   * already driven by the swipe handler; here the *new* page sweeps in from the
   * correct side so the direction of travel is unmistakable.
   *
   * A layout effect, not a passive one: the class has to be on the sheet before
   * the browser paints, otherwise the new page flashes at its final position.
   */
  useLayoutEffect(() => {
    const sheet = linesRootRef.current?.closest('.mushaf-sheet') as HTMLElement | null
    const previous = lastPageRef.current
    lastPageRef.current = page
    if (!sheet || previous == null || previous === page) return

    const dir: 1 | -1 = page > previous ? 1 : -1
    const pending = pendingTurnRef.current
    pendingTurnRef.current = null
    const mode = pending?.mode ?? turnModeFor(previous, page)
    const stage = stageRef.current

    // A swipe leaves inline transition state behind; the entrance is CSS-driven.
    sheet.style.transform = ''
    sheet.style.opacity = ''
    sheet.style.transition = ''
    sheet.style.transformOrigin = ''
    sheet.style.willChange = ''
    sheet.classList.remove('is-dragging', 'is-drag-next', 'is-drag-prev')
    sheet.classList.remove('is-slide-in', 'is-flip-in', 'is-leaf-land')
    // Pages run right to left, so the strip follows the finger: advancing
    // (dir +1) brings the new page in from the left, going back from the right.
    sheet.style.setProperty('--turn-dir', String(dir))
    // Shadow sweeps in from the gutter: the edge that faces the spine.
    const onRightSide = pageIsRightSide(page)
    sheet.style.setProperty('--shade-angle', onRightSide ? '90deg' : '270deg')
    // Hinge on the gutter. Used when this page has to act as its own leaf.
    sheet.style.setProperty('--turn-origin', onRightSide ? 'left center' : 'right center')
    sheet.style.setProperty(
      '--flip-from',
      `${(onRightSide ? -1 : 1) * LEAF_LAND}deg`,
    )
    // A swipe hands over the exact distance still to travel, so this page starts
    // butted up against the outgoing one instead of a full viewport away. A leaf
    // turn reveals this page underneath, so it must not travel at all.
    if (pending?.enterFrom != null) {
      sheet.style.setProperty('--enter-from', `${pending.enterFrom}px`)
    } else {
      sheet.style.removeProperty('--enter-from')
    }
    const dur = mode === 'slide' ? SLIDE_MS : TURN_MS
    if (prefersReducedMotion()) {
      stage?.classList.remove('is-paging')
      animatingUntilRef.current = 0
      return
    }
    // Force a reflow so a repeated turn replays the animation from the start.
    void sheet.offsetWidth

    sheet.classList.add(mode === 'slide' ? 'is-slide-in' : 'is-flip-in')
    /*
     * A swipe turn is carried by the clone of the outgoing page, so this page is
     * simply revealed. Buttons and the TV remote have no clone to work with (the
     * old page is already unmounted), so the arriving page lands like a leaf
     * itself. Without this a keyed turn showed nothing but a shadow fading.
     */
    if (mode === 'turn' && !pending) sheet.classList.add('is-leaf-land')
    // Reveal the paper plate behind the moving leaf until it has settled.
    stage?.classList.add('is-paging')
    animatingUntilRef.current = performance.now() + dur + 40
    window.clearTimeout(animTimerRef.current)
    animTimerRef.current = window.setTimeout(
      () => {
        sheet.classList.remove('is-slide-in', 'is-flip-in', 'is-leaf-land')
        stage?.classList.remove('is-paging')
      },
      dur + 20,
    )

    return () => window.clearTimeout(animTimerRef.current)
  }, [page])

  /**
   * Swipe paging with the page following the finger.
   *
   * A gesture only becomes a page drag once it is clearly horizontal, so normal
   * vertical reading and pinch zoom stay untouched. The pages form a strip that
   * runs right to left, so the sheet is dragged with the finger: swiping left
   * pulls in the page sitting to the right (the earlier page), swiping right
   * advances. On release the sheet keeps travelling (or springs back), the new
   * page is mounted while the sheet is off-screen/low-opacity, and the entrance
   * animation then sweeps it in from the far side. `turnModeFor` decides whether
   * that reads as panning across the spread or flipping a leaf.
   */
  useEffect(() => {
    const viewport = viewportRef.current
    const sheet = linesRootRef.current?.closest('.mushaf-sheet') as HTMLElement | null
    const stage = stageRef.current
    if (!viewport || !sheet) return

    let tracking = false
    let dragging = false
    let startX = 0
    let startY = 0
    let dx = 0
    let dy = 0
    let width = 0
    let frame = 0
    let paintedOffset = 0
    let settleTimer = 0
    let guardTimer = 0
    let ghostTimer = 0
    let reduce = false

    const clearInline = () => {
      sheet.style.transform = ''
      sheet.style.opacity = ''
      sheet.style.transition = ''
      sheet.style.transformOrigin = ''
      sheet.style.willChange = ''
      sheet.classList.remove('is-dragging', 'is-drag-next', 'is-drag-prev')
      stage?.classList.remove('is-paging')
    }

    /** Page that a drag in `dir` would land on (may be the current one at the ends). */
    const targetFor = (dir: 1 | -1) => clampPage(pageRef.current + dir)

    const paintDrag = () => {
      frame = 0
      const atEdge = targetFor(pageDeltaFor(dx)) === pageRef.current
      // Rubber-band at the first/last page instead of a dead stop.
      const damped = atEdge ? dx * 0.22 : dx
      const limit = width * 0.94
      const offset = Math.max(-limit, Math.min(limit, damped))
      paintedOffset = offset
      sheet.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`
      // Dragging right uncovers the next page, dragging left the previous one.
      sheet.classList.toggle('is-drag-next', offset > 0)
      sheet.classList.toggle('is-drag-prev', offset < 0)
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || animating()) {
        tracking = false
        return
      }
      // Recover from any transition that was interrupted before its cleanup ran
      // (a detach, a hidden tab). Cheap, and it keeps swiping self-healing.
      const stale = ['is-slide-in', 'is-flip-in', 'is-leaf-land']
      if (stale.some((cls) => sheet.classList.contains(cls))) {
        clearInline()
        sheet.classList.remove(...stale)
      }
      tracking = true
      dragging = false
      startX = e.touches[0]!.clientX
      startY = e.touches[0]!.clientY
      dx = 0
      dy = 0
      paintedOffset = 0
      width = viewport.clientWidth || sheet.clientWidth || 1
      reduce = prefersReducedMotion()
    }

    const onMove = (e: TouchEvent) => {
      if (!tracking || e.touches.length !== 1) return
      dx = e.touches[0]!.clientX - startX
      dy = e.touches[0]!.clientY - startY
      // Pinch-zoomed readers scroll sideways natively; never hijack the drag.
      if (zoomRef.current > 1.01) return
      if (!dragging) {
        if (Math.abs(dx) < DRAG_SLOP) return
        if (Math.abs(dx) < Math.abs(dy) * 1.2) {
          // Mostly vertical: leave it to native scrolling.
          tracking = false
          return
        }
        dragging = true
        if (!reduce) {
          sheet.style.transition = 'none'
          sheet.style.willChange = 'transform'
          sheet.classList.add('is-dragging')
          // Paper shows through the moment the page starts to lift.
          stage?.classList.add('is-paging')
        }
      }
      if (!frame && !reduce) frame = window.requestAnimationFrame(paintDrag)
    }

    const settleBack = () => {
      sheet.style.transition = 'transform 240ms cubic-bezier(0.22, 0.7, 0.28, 1)'
      sheet.style.transform = 'translate3d(0, 0, 0)'
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(clearInline, 250)
    }

    /**
     * Freeze the page that is leaving into an absolutely positioned clone.
     *
     * The clone is measured *after* the drag has moved the sheet, so its rect
     * already contains the finger offset; the copied inline transform must be
     * cleared or that offset counts twice (and the clone drifts out of step with
     * the page arriving next to it).
     *
     * A pan (`slide`) then travels the remaining distance with the finger, so the
     * two sheets tile the viewport like one strip. A leaf turn rotates the clone
     * about the gutter, sitting exactly over the page it is uncovering.
     */
    const spawnGhost = (
      mode: 'slide' | 'turn',
      offset: number,
      delta: number,
    ): HTMLElement | null => {
      if (!stage) return null
      const sheetRect = sheet.getBoundingClientRect()
      const stageRect = stage.getBoundingClientRect()
      const ghost = sheet.cloneNode(true) as HTMLElement
      ghost.classList.remove(
        'is-dragging',
        'is-drag-next',
        'is-drag-prev',
        'is-slide-in',
        'is-flip-in',
      )
      for (const el of ghost.querySelectorAll('[id]')) el.removeAttribute('id')
      ghost.removeAttribute('id')
      ghost.setAttribute('aria-hidden', 'true')
      ghost.classList.add('mushaf-ghost')
      // The rect already includes the drag offset. A panning sheet keeps it; a
      // turning leaf translates it back out (below) so it sits over the new page.
      ghost.style.top = `${sheetRect.top - stageRect.top}px`
      ghost.style.left = `${sheetRect.left - stageRect.left}px`
      ghost.style.width = `${sheetRect.width}px`
      ghost.style.height = `${sheetRect.height}px`
      ghost.style.transform = 'translate3d(0, 0, 0)'
      // The leaf hinges on its spine edge, exactly like the page it replaces.
      const hingeLeft = pageIsRightSide(pageRef.current)
      ghost.style.transformOrigin = hingeLeft ? 'left center' : 'right center'
      // It darkens from its free edge, the side that lifts off the page below.
      ghost.style.setProperty('--shade-angle', hingeLeft ? '270deg' : '90deg')
      ghost.style.willChange = 'transform, opacity'
      if (mode === 'turn') ghost.classList.add('is-turn')
      stage.appendChild(ghost)

      const dur = mode === 'slide' ? SLIDE_MS : TURN_MS
      ghost.style.transition =
        mode === 'slide'
          ? `transform ${dur}ms ${PAN_EASE}`
          : `transform ${dur}ms ${TURN_EASE}`
      // Flush the copied inline style so the run starts where the finger left off.
      void ghost.offsetWidth
      if (mode === 'slide') {
        ghost.style.transform = `translate3d(${delta}px, 0, 0)`
      } else {
        // The free edge always folds away from the reader, whichever side the
        // leaf is hinged on. That is the motion that reads correctly when a
        // right-hand page turns (602→603); mirroring it by hinge side keeps the
        // left-hand turn (603→602) from swinging towards the camera and
        // ballooning off-screen.
        //
        // `dir` needs no say here: a turn only ever happens from an even page
        // forwards or an odd page backwards, so parity already fixes it.
        ghost.style.transform = `translate3d(${-offset}px, 0, 0) rotateY(${(hingeLeft ? -1 : 1) * LEAF_ANGLE}deg)`
      }
      return ghost
    }

    /**
     * Commit a swipe: swap the page at once so the entrance starts in the same
     * frame, while the ghost carries the old page away. Both halves run together,
     * which is what makes the turn read as one movement.
     */
    const commitTurn = (dir: 1 | -1, mode: 'slide' | 'turn') => {
      const target = targetFor(dir)
      if (target === pageRef.current) {
        settleBack()
        return
      }
      const from = pageRef.current
      const offset = paintedOffset
      // Never let a stray copy of an older page linger under this one.
      stage?.querySelectorAll('.mushaf-ghost').forEach((el) => el.remove())
      // Panning continues for whatever is left of one viewport width; a leaf turn
      // uncovers a page that is already in place.
      const delta = dir * Math.max(0, width - Math.abs(offset))
      pendingTurnRef.current = {
        dir,
        mode,
        enterFrom: mode === 'slide' ? -delta : 0,
      }
      const ghost = spawnGhost(mode, offset, delta)
      // Accept input again as soon as the pair has settled, whether or not the
      // clone is still alive to report it.
      animatingUntilRef.current =
        performance.now() + (mode === 'slide' ? SLIDE_MS : TURN_MS) + 40
      onPageChangeRef.current(target)

      const dur = mode === 'slide' ? SLIDE_MS : TURN_MS
      let settled = false
      const settleGhost = () => {
        if (settled) return
        settled = true
        ghost?.remove()
      }
      // Retire the copy when its own travel ends, not on a guessed timer: a
      // throttled tab or a slow device would otherwise drop it mid-flight.
      ghost?.addEventListener('transitionend', settleGhost, { once: true })
      window.clearTimeout(ghostTimer)
      ghostTimer = window.setTimeout(settleGhost, dur * 2 + 200)
      // If the parent refused the move, never leave the page stranded.
      window.clearTimeout(guardTimer)
      guardTimer = window.setTimeout(() => {
        if (pageRef.current === from) {
          settleGhost()
          clearInline()
        }
      }, dur + 120)
    }

    const finish = () => {
      const wasTracking = tracking
      tracking = false
      if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
      if (!wasTracking) return
      if (!dragging) {
        // A tap that never became a drag.
        clearInline()
        return
      }
      dragging = false
      if (zoomRef.current > 1.01) {
        settleBack()
        return
      }
      const dir: 1 | -1 = pageDeltaFor(dx)
      const far = Math.abs(dx) >= SWIPE_THRESHOLD
      const flick = Math.abs(dx) > Math.abs(dy) * 1.4 && Math.abs(dx) > SWIPE_THRESHOLD * 0.7
      if (!(far || flick) || targetFor(dir) === pageRef.current) {
        settleBack()
        return
      }
      // Reduced motion: swap instantly, no travel, no paper reveal.
      if (reduce) {
        clearInline()
        onPageChangeRef.current(targetFor(dir))
        return
      }
      commitTurn(dir, turnModeFor(pageRef.current, targetFor(dir)))
    }

    const cancel = () => {
      const wasDragging = dragging
      tracking = false
      dragging = false
      if (frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
      if (wasDragging) settleBack()
    }

    viewport.addEventListener('touchstart', onStart, { passive: true })
    viewport.addEventListener('touchmove', onMove, { passive: true })
    viewport.addEventListener('touchend', finish)
    viewport.addEventListener('touchcancel', cancel)
    return () => {
      viewport.removeEventListener('touchstart', onStart)
      viewport.removeEventListener('touchmove', onMove)
      viewport.removeEventListener('touchend', finish)
      viewport.removeEventListener('touchcancel', cancel)
      if (frame) window.cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      window.clearTimeout(guardTimer)
      window.clearTimeout(ghostTimer)
      stage?.querySelectorAll('.mushaf-ghost').forEach((el) => el.remove())
      clearInline()
    }
  }, [])

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
  /** Page/ayah pair seen by the follow effect, to tell manual turns from playback. */
  const followSeenRef = useRef({ page, surah: activeSurahId, ayah: activeAyah })

  useEffect(() => {
    const root = linesRootRef.current
    const viewport = viewportRef.current
    if (!root || !viewport) return

    const seen = followSeenRef.current
    const expectedPage = getPageForAyah(activeSurahId, activeAyah)
    const manualTurn =
      seen.page !== page && seen.surah === activeSurahId && seen.ayah === activeAyah
    followSeenRef.current = { page, surah: activeSurahId, ayah: activeAyah }

    // Manual page turn / numpad jump: open at the top instead of yanking the
    // view back to the reciting ayah (which may not even be on this page).
    if (page !== expectedPage) {
      if (manualTurn) viewport.scrollTo({ top: 0 })
      return
    }

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

      <div className="mushaf-stage" ref={stageRef}>
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

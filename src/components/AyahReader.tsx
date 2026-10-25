import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { getBismillah, isBismillah } from '../data/bismillah'
import { getTranslationLabel } from '../data/quran'
import { getPageForAyah, pageHasSurah } from '../data/mushaf'
import { getActiveTranslation } from '../lib/activeTranslation'
import { useAyahSelectHandlers, type AyahRef } from '../lib/ayahSelect'
import type { Ayah, DisplayMode, PageFit, TranslationId } from '../types'
import { MushafPage, useMushafPageMeta } from './MushafPage'
import { MushafPageChrome } from './MushafPageChrome'
import { TranslationPanel } from './TranslationPanel'

interface Props {
  ayahs: Ayah[]
  activeAyah: number
  activeSurahId: number
  surahId: number
  surahName: string
  displayMode: DisplayMode
  translationId: TranslationId
  showTranslation: boolean
  pageNumber: number
  onPageChange: (page: number) => void
  selectedSurahId?: number | null
  selectedAyah?: number | null
  onSelectAyah?: (ref: AyahRef) => void
  focusSurahId?: number | null
  focusSurahKey?: number
  fitKey?: string | number
  fontScale?: number
  pageFit?: PageFit
  /** Bumped by the player on every playlist move — forces a re-centre. */
  followKey?: number
  chromeInHeader?: boolean
  headerActions?: ReactNode
  /** The side rail owns the translation panel. */
  hideTranslationPanel?: boolean
}

function AyahListItem({
  ayah,
  surahId,
  active,
  selected,
  showTranslation,
  onSelectAyah,
  setActiveNode,
}: {
  ayah: Ayah
  surahId: number
  active: boolean
  selected: boolean
  showTranslation: boolean
  onSelectAyah?: (ref: AyahRef) => void
  setActiveNode?: (node: HTMLElement | null) => void
}) {
  const handlers = useAyahSelectHandlers(surahId, ayah.number, onSelectAyah)

  return (
    <article
      ref={active ? setActiveNode : undefined}
      className={`ayah-block${active ? ' active' : ''}${selected ? ' selected' : ''}`}
      {...handlers}
    >
      <div className="ayah-meta">
        <span
          className="ayah-number ayah-number-hit"
          role="button"
          tabIndex={0}
          aria-label={`Select ayah ${ayah.number}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelectAyah?.({ surahId, ayah: ayah.number })
            }
          }}
        >
          {ayah.number}
        </span>
      </div>
      <p className="ayah-arabic">{ayah.arabic}</p>
      {showTranslation ? <p className="ayah-translation">{ayah.translation}</p> : null}
    </article>
  )
}

export function AyahReader({
  ayahs,
  activeAyah,
  activeSurahId,
  surahId,
  surahName,
  displayMode,
  translationId,
  showTranslation,
  pageNumber,
  onPageChange,
  selectedSurahId = null,
  selectedAyah = null,
  onSelectAyah,
  focusSurahId = null,
  focusSurahKey = 0,
  fitKey = '',
  fontScale = 1,
  pageFit = 'width',
  followKey = 0,
  chromeInHeader = false,
  headerActions,
  hideTranslationPanel = false,
}: Props) {
  const activeRef = useRef<HTMLElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const listFocusKeyRef = useRef(0)
  const setActiveNode = (node: HTMLElement | null) => {
    activeRef.current = node
  }
  const bismillah = useMemo(() => getBismillah(translationId), [translationId])
  const translationLabel = getTranslationLabel(translationId)

  const playbackPage = useMemo(
    () => getPageForAyah(activeSurahId, activeAyah),
    [activeSurahId, activeAyah],
  )

  /** Latest displayed page — read by the follow effect without re-triggering it. */
  const pageRef = useRef(pageNumber)
  pageRef.current = pageNumber

  /** Follow the recited ayah onto its Madani page — do not fight manual page buttons. */
  useEffect(() => {
    if (displayMode !== 'mushaf') return
    // The Basmala has no page of its own. Stay put when the surah is already on
    // screen (e.g. page-repeat); otherwise open the page where the surah starts.
    if (isBismillah(activeAyah) && pageHasSurah(pageRef.current, activeSurahId)) {
      return
    }
    onPageChange(playbackPage)
  }, [playbackPage, activeAyah, activeSurahId, displayMode, onPageChange])

  useEffect(() => {
    if (displayMode !== 'list') return
    if (focusSurahKey > 0 && focusSurahKey !== listFocusKeyRef.current) {
      listFocusKeyRef.current = focusSurahKey
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const node = activeRef.current
    const scroller = scrollRef.current
    if (!node || !scroller) return

    const nodeRect = node.getBoundingClientRect()
    const viewRect = scroller.getBoundingClientRect()
    if (nodeRect.width <= 0 && nodeRect.height <= 0) return

    // Center the ayah, or pin a tall block to the top, clamped to the list edges.
    const offsetInContent = nodeRect.top - viewRect.top + scroller.scrollTop
    const desired =
      nodeRect.height >= scroller.clientHeight - 16
        ? offsetInContent - 8
        : offsetInContent + nodeRect.height / 2 - scroller.clientHeight / 2
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const target = Math.min(maxScroll, Math.max(0, desired))
    if (Math.abs(target - scroller.scrollTop) < 2) return
    scroller.scrollTo({ top: target, behavior: 'smooth' })
  }, [activeAyah, activeSurahId, displayMode, focusSurahKey, surahId, followKey])

  /** New ayah starts collapsed again — long translations stay in their 1/4-screen box. */
  const activeTranslation = useMemo(
    () =>
      getActiveTranslation({ activeAyah, activeSurahId, surahId, ayahs, translationId }),
    [activeAyah, activeSurahId, ayahs, surahId, translationId],
  )

  const pageMeta = useMushafPageMeta(pageNumber)
  const showFloating = displayMode === 'mushaf' && showTranslation && !hideTranslationPanel

  return (
    <div
      className={`ayah-reader mode-${displayMode}${showFloating ? ' has-floating-translation' : ''}${chromeInHeader ? ' chrome-in-header' : ''}`}
    >
      <header className="reader-header">
        <div className="reader-header-row">
          <div className="reader-header-main">
            <h1>{surahName}</h1>
            {chromeInHeader && displayMode === 'mushaf' ? (
              <MushafPageChrome
                page={pageNumber}
                rangeLabel={pageMeta.rangeLabel}
                surahNames={pageMeta.surahNames}
                onPageChange={onPageChange}
                compact
              />
            ) : null}
          </div>
          {headerActions}
        </div>
      </header>

      <div className="ayah-scroll" ref={scrollRef}>
        {displayMode === 'mushaf' ? (
          <MushafPage
            page={pageNumber}
            activeSurahId={activeSurahId}
            activeAyah={activeAyah}
            selectedSurahId={selectedSurahId}
            selectedAyah={selectedAyah}
            onSelectAyah={onSelectAyah}
            focusSurahId={focusSurahId}
            focusSurahKey={focusSurahKey}
            fitKey={fitKey}
            fontScale={fontScale}
            pageFit={pageFit}
            followKey={followKey}
            onPageChange={onPageChange}
            hideChrome={chromeInHeader}
          />
        ) : (
          <div className="ayah-list">
            <article
              ref={isBismillah(activeAyah) ? setActiveNode : undefined}
              className={`ayah-block bismillah${isBismillah(activeAyah) ? ' active' : ''}`}
            >
              <div className="ayah-meta">
                <span className="ayah-number">﷽</span>
              </div>
              <p className="ayah-arabic">{bismillah.arabic}</p>
              {showTranslation ? (
                <p className="ayah-translation">{bismillah.translation}</p>
              ) : null}
            </article>

            {ayahs.map((ayah) => {
              const active = ayah.number === activeAyah && activeSurahId === surahId
              const selected =
                selectedSurahId === surahId && selectedAyah === ayah.number
              return (
                <AyahListItem
                  key={ayah.number}
                  ayah={ayah}
                  surahId={surahId}
                  active={active}
                  selected={selected}
                  showTranslation={showTranslation}
                  onSelectAyah={onSelectAyah}
                  setActiveNode={active ? setActiveNode : undefined}
                />
              )
            })}
          </div>
        )}
      </div>

      {showFloating && activeTranslation ? (
        <TranslationPanel
          text={activeTranslation}
          credit={translationLabel}
          resetKey={`${activeSurahId}:${activeAyah}:${translationId}`}
        />
      ) : null}
    </div>
  )
}

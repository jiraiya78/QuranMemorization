import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getBismillah, isBismillah } from '../data/bismillah'
import { getAyahs, getTranslationLabel } from '../data/quran'
import { getPageForAyah } from '../data/mushaf'
import { useAyahSelectHandlers, type AyahRef } from '../lib/ayahSelect'
import type { Ayah, DisplayMode, TranslationId } from '../types'
import { MushafPage, useMushafPageMeta } from './MushafPage'
import { MushafPageChrome } from './MushafPageChrome'

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
  chromeInHeader?: boolean
  headerActions?: ReactNode
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
  chromeInHeader = false,
  headerActions,
}: Props) {
  const activeRef = useRef<HTMLElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const listFocusKeyRef = useRef(0)
  const translationBodyRef = useRef<HTMLDivElement | null>(null)
  const [translationExpanded, setTranslationExpanded] = useState(false)
  const setActiveNode = (node: HTMLElement | null) => {
    activeRef.current = node
  }
  const bismillah = useMemo(() => getBismillah(translationId), [translationId])
  const translationLabel = getTranslationLabel(translationId)

  const playbackPage = useMemo(
    () => getPageForAyah(activeSurahId, activeAyah),
    [activeSurahId, activeAyah],
  )

  /** Follow the recited ayah onto its Madani page — do not fight manual page buttons. */
  useEffect(() => {
    if (displayMode !== 'mushaf') return
    onPageChange(playbackPage)
  }, [playbackPage, displayMode, onPageChange])

  useEffect(() => {
    if (displayMode !== 'list') return
    if (focusSurahKey > 0 && focusSurahKey !== listFocusKeyRef.current) {
      listFocusKeyRef.current = focusSurahKey
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeAyah, displayMode, focusSurahKey, surahId])

  /** New ayah starts collapsed again — long translations stay in their 1/4-screen box. */
  useEffect(() => {
    setTranslationExpanded(false)
    translationBodyRef.current?.scrollTo({ top: 0 })
  }, [activeAyah, activeSurahId, translationId])

  const activeTranslation = useMemo(() => {
    if (isBismillah(activeAyah)) return bismillah.translation
    const list =
      activeSurahId === surahId ? ayahs : getAyahs(activeSurahId, translationId)
    return list.find((a) => a.number === activeAyah)?.translation ?? ''
  }, [activeAyah, activeSurahId, ayahs, bismillah.translation, surahId, translationId])

  const pageMeta = useMushafPageMeta(pageNumber)
  const showFloating = displayMode === 'mushaf' && showTranslation

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
        <aside
          className={`floating-translation${translationExpanded ? ' is-expanded' : ''}`}
          dir="ltr"
          aria-live="polite"
        >
          <div className="floating-translation-head">
            <span className="floating-translation-label">Translation</span>
            <div className="floating-translation-tools">
              <span className="floating-translation-credit">{translationLabel}</span>
              <button
                type="button"
                className="floating-translation-toggle"
                aria-expanded={translationExpanded}
                aria-label={translationExpanded ? 'Shrink translation' : 'Expand translation'}
                title={translationExpanded ? 'Shrink' : 'Expand'}
                onClick={() => setTranslationExpanded((v) => !v)}
              >
                {translationExpanded ? '▾' : '▴'}
              </button>
            </div>
          </div>
          <div className="floating-translation-body" ref={translationBodyRef}>
            <p>{activeTranslation}</p>
          </div>
        </aside>
      ) : null}
    </div>
  )
}

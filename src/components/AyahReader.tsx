import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { BISMILLAH, isBismillah } from '../data/bismillah'
import { getAyahs, TRANSLATION_LABEL } from '../data/quran'
import { getPageForAyah } from '../data/mushaf'
import { useAyahSelectHandlers, type AyahRef } from '../lib/ayahSelect'
import type { Ayah, DisplayMode } from '../types'
import { MushafPage, useMushafPageMeta } from './MushafPage'
import { MushafPageChrome } from './MushafPageChrome'

interface Props {
  ayahs: Ayah[]
  activeAyah: number
  activeSurahId: number
  surahId: number
  surahName: string
  displayMode: DisplayMode
  pageNumber: number
  onPageChange: (page: number) => void
  selectedSurahId?: number | null
  selectedAyah?: number | null
  onSelectAyah?: (ref: AyahRef) => void
  chromeInHeader?: boolean
  headerActions?: ReactNode
}

function AyahListItem({
  ayah,
  surahId,
  active,
  selected,
  onSelectAyah,
  setActiveNode,
}: {
  ayah: Ayah
  surahId: number
  active: boolean
  selected: boolean
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
      <p className="ayah-translation">{ayah.translation}</p>
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
  pageNumber,
  onPageChange,
  selectedSurahId = null,
  selectedAyah = null,
  onSelectAyah,
  chromeInHeader = false,
  headerActions,
}: Props) {
  const activeRef = useRef<HTMLElement | null>(null)
  const setActiveNode = (node: HTMLElement | null) => {
    activeRef.current = node
  }

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
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeAyah, displayMode])

  const activeTranslation = useMemo(() => {
    if (isBismillah(activeAyah)) return BISMILLAH.translation
    const list = activeSurahId === surahId ? ayahs : getAyahs(activeSurahId)
    return list.find((a) => a.number === activeAyah)?.translation ?? ''
  }, [activeAyah, activeSurahId, ayahs, surahId])

  const pageMeta = useMushafPageMeta(pageNumber)
  const showFloating = displayMode === 'mushaf'

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

      <div className="ayah-scroll">
        {displayMode === 'mushaf' ? (
          <MushafPage
            page={pageNumber}
            activeSurahId={activeSurahId}
            activeAyah={activeAyah}
            selectedSurahId={selectedSurahId}
            selectedAyah={selectedAyah}
            onSelectAyah={onSelectAyah}
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
              <p className="ayah-arabic">{BISMILLAH.arabic}</p>
              <p className="ayah-translation">{BISMILLAH.translation}</p>
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
                  onSelectAyah={onSelectAyah}
                  setActiveNode={active ? setActiveNode : undefined}
                />
              )
            })}
          </div>
        )}
      </div>

      {showFloating && activeTranslation ? (
        <aside className="floating-translation" dir="ltr" aria-live="polite">
          <div className="floating-translation-head">
            <span className="floating-translation-label">Translation</span>
            <span className="floating-translation-credit">{TRANSLATION_LABEL}</span>
          </div>
          <p>{activeTranslation}</p>
        </aside>
      ) : null}
    </div>
  )
}

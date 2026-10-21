import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { BISMILLAH, isBismillah } from '../data/bismillah'
import { getAyahs, TRANSLATION_LABEL } from '../data/quran'
import { getPageForAyah } from '../data/mushaf'
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
  chromeInHeader?: boolean
  headerActions?: ReactNode
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
              return (
                <article
                  key={ayah.number}
                  ref={active ? setActiveNode : undefined}
                  className={`ayah-block${active ? ' active' : ''}`}
                >
                  <div className="ayah-meta">
                    <span className="ayah-number">{ayah.number}</span>
                  </div>
                  <p className="ayah-arabic">{ayah.arabic}</p>
                  <p className="ayah-translation">{ayah.translation}</p>
                </article>
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

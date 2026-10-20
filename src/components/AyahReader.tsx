import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BISMILLAH, isBismillah } from '../data/bismillah'
import { TRANSLATION_LABEL } from '../data/quran'
import { getPageForAyah } from '../data/mushaf'
import type { Ayah, DisplayMode } from '../types'
import { MushafPage } from './MushafPage'

interface Props {
  ayahs: Ayah[]
  activeAyah: number
  surahId: number
  surahName: string
  displayMode: DisplayMode
  headerActions?: ReactNode
}

export function AyahReader({
  ayahs,
  activeAyah,
  surahId,
  surahName,
  displayMode,
  headerActions,
}: Props) {
  const activeRef = useRef<HTMLElement | null>(null)
  const setActiveNode = (node: HTMLElement | null) => {
    activeRef.current = node
  }

  const playbackPage = useMemo(
    () => getPageForAyah(surahId, activeAyah),
    [surahId, activeAyah],
  )
  const [viewPage, setViewPage] = useState(playbackPage)

  useEffect(() => {
    setViewPage(playbackPage)
  }, [playbackPage])

  useEffect(() => {
    if (displayMode !== 'list') return
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeAyah, displayMode])

  const activeTranslation = useMemo(() => {
    if (isBismillah(activeAyah)) return BISMILLAH.translation
    return ayahs.find((a) => a.number === activeAyah)?.translation ?? ''
  }, [activeAyah, ayahs])

  const showFloating = displayMode === 'mushaf'

  return (
    <div
      className={`ayah-reader mode-${displayMode}${showFloating ? ' has-floating-translation' : ''}`}
    >
      <header className="reader-header">
        <div className="reader-header-row">
          <div>
            <h1>{surahName}</h1>
            <p className="translation-credit">{TRANSLATION_LABEL}</p>
          </div>
          {headerActions}
        </div>
      </header>

      <div className="ayah-scroll">
        {displayMode === 'mushaf' ? (
          <MushafPage
            page={viewPage}
            activeSurahId={surahId}
            activeAyah={activeAyah}
            onPageChange={setViewPage}
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
              const active = ayah.number === activeAyah
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
          <span className="floating-translation-label">Translation</span>
          <p>{activeTranslation}</p>
        </aside>
      ) : null}
    </div>
  )
}

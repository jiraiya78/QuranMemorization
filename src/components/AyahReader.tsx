import { useEffect, useMemo, useRef } from 'react'
import { BISMILLAH, isBismillah } from '../data/bismillah'
import { TRANSLATION_LABEL } from '../data/quran'
import { toArabicIndic } from '../lib/arabicNumerals'
import type { Ayah, DisplayMode } from '../types'

interface Props {
  ayahs: Ayah[]
  activeAyah: number
  surahName: string
  displayMode: DisplayMode
}

export function AyahReader({ ayahs, activeAyah, surahName, displayMode }: Props) {
  const activeRef = useRef<HTMLElement | null>(null)
  const setActiveNode = (node: HTMLElement | null) => {
    activeRef.current = node
  }

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeAyah, displayMode])

  const activeTranslation = useMemo(() => {
    if (isBismillah(activeAyah)) return BISMILLAH.translation
    return ayahs.find((a) => a.number === activeAyah)?.translation ?? ''
  }, [activeAyah, ayahs])

  return (
    <div className={`ayah-reader mode-${displayMode}`}>
      <header className="reader-header">
        <h1>{surahName}</h1>
        <p className="translation-credit">{TRANSLATION_LABEL}</p>
      </header>

      {displayMode === 'mushaf' ? (
        <div className="mushaf-page">
          <p
            ref={isBismillah(activeAyah) ? setActiveNode : undefined}
            className={`mushaf-bismillah${isBismillah(activeAyah) ? ' active' : ''}`}
          >
            {BISMILLAH.arabic}
          </p>

          <div className="mushaf-text" dir="rtl" lang="ar">
            {ayahs.map((ayah) => {
              const active = ayah.number === activeAyah
              return (
                <span
                  key={ayah.number}
                  ref={active ? setActiveNode : undefined}
                  className={`mushaf-ayah${active ? ' active' : ''}`}
                >
                  {ayah.arabic}
                  <span className="mushaf-ayah-mark" aria-label={`Ayah ${ayah.number}`}>
                    ۝{toArabicIndic(ayah.number)}
                  </span>
                </span>
              )
            })}
          </div>

          <p className="mushaf-translation" dir="ltr">
            {activeTranslation}
          </p>
        </div>
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
  )
}

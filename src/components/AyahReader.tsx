import { useEffect, useRef } from 'react'
import { BISMILLAH, isBismillah } from '../data/bismillah'
import { TRANSLATION_LABEL } from '../data/quran'
import type { Ayah } from '../types'

interface Props {
  ayahs: Ayah[]
  activeAyah: number
  surahName: string
}

export function AyahReader({ ayahs, activeAyah, surahName }: Props) {
  const activeRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeAyah])

  return (
    <div className="ayah-reader">
      <header className="reader-header">
        <h1>{surahName}</h1>
        <p className="translation-credit">{TRANSLATION_LABEL}</p>
      </header>
      <div className="ayah-list">
        <article
          ref={isBismillah(activeAyah) ? activeRef : undefined}
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
              ref={active ? activeRef : undefined}
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
    </div>
  )
}

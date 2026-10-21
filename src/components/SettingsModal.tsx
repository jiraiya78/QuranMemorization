import { useCallback, useEffect, useRef, useState } from 'react'
import { BISMILLAH, BISMILLAH_AYAH } from '../data/bismillah'
import { TRANSLATIONS } from '../data/quran'
import { RECITERS } from '../data/reciters'
import { getPlayableUrl } from '../lib/offlineCache'
import { FONT_SCALE_MAX, FONT_SCALE_MIN, FONT_SCALE_STEP } from '../lib/prefs'
import type {
  DisplayMode,
  FontId,
  FontWeight,
  MushafWidth,
  PhysicalNav,
  TranslationId,
} from '../types'

const FONTS: { id: FontId; label: string }[] = [
  { id: 'ibm', label: 'IBM Plex Sans' },
  { id: 'amiri', label: 'Amiri' },
  { id: 'noto', label: 'Noto Naskh' },
  { id: 'scheherazade', label: 'Scheherazade' },
]

/** Bismillah + Al-Fatihah 2–3 (two ayat after the opening basmala). */
const SAMPLE_CLIPS: { surahId: number; ayah: number }[] = [
  { surahId: 1, ayah: BISMILLAH_AYAH },
  { surahId: 1, ayah: 2 },
  { surahId: 1, ayah: 3 },
]

interface Props {
  open: boolean
  onClose: () => void
  displayMode: DisplayMode
  font: FontId
  fontWeight: FontWeight
  fontScale: number
  translationId: TranslationId
  showTranslation: boolean
  physicalNav: PhysicalNav
  mushafWidth: MushafWidth
  repeats: number
  reciterId: string
  onDisplayModeChange: (mode: DisplayMode) => void
  onFontChange: (font: FontId) => void
  onFontWeightChange: (weight: FontWeight) => void
  onFontScaleChange: (scale: number) => void
  onTranslationChange: (id: TranslationId) => void
  onShowTranslationChange: (show: boolean) => void
  onPhysicalNavChange: (value: PhysicalNav) => void
  onMushafWidthChange: (value: MushafWidth) => void
  onRepeatsChange: (n: number) => void
  onReciterChange: (id: string) => void
}

export function SettingsModal({
  open,
  onClose,
  displayMode,
  font,
  fontWeight,
  fontScale,
  translationId,
  showTranslation,
  physicalNav,
  mushafWidth,
  repeats,
  reciterId,
  onDisplayModeChange,
  onFontChange,
  onFontWeightChange,
  onFontScaleChange,
  onTranslationChange,
  onShowTranslationChange,
  onPhysicalNavChange,
  onMushafWidthChange,
  onRepeatsChange,
  onReciterChange,
}: Props) {
  const [samplePlaying, setSamplePlaying] = useState(false)
  const [sampleError, setSampleError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlsRef = useRef<string[]>([])
  const stopSampleRef = useRef<() => void>(() => {})

  const stopSample = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    for (const u of objectUrlsRef.current) URL.revokeObjectURL(u)
    objectUrlsRef.current = []
    setSamplePlaying(false)
  }, [])

  stopSampleRef.current = stopSample

  useEffect(() => {
    if (!open) stopSampleRef.current()
  }, [open])

  useEffect(() => () => stopSampleRef.current(), [])

  const playSample = useCallback(async () => {
    stopSample()
    setSampleError(null)
    setSamplePlaying(true)

    const audio = audioRef.current ?? new Audio()
    audioRef.current = audio

    let index = 0
    const playNext = async () => {
      const clip = SAMPLE_CLIPS[index]
      if (!clip) {
        setSamplePlaying(false)
        return
      }
      try {
        const url = await getPlayableUrl(reciterId, clip.surahId, clip.ayah)
        if (url.startsWith('blob:')) objectUrlsRef.current.push(url)
        audio.src = url
        audio.load()
        await audio.play()
      } catch {
        setSampleError('Could not play sample')
        setSamplePlaying(false)
      }
    }

    audio.onended = () => {
      index += 1
      void playNext()
    }
    audio.onerror = () => {
      setSampleError('Could not play sample')
      setSamplePlaying(false)
    }

    await playNext()
  }, [reciterId, stopSample])

  if (!open) return null

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-modal-header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="settings-close" aria-label="Close settings" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="settings-modal-body">
          <div className="field">
            <span className="field-label">Ayah layout</span>
            <div className="segmented">
              <button
                type="button"
                className={displayMode === 'mushaf' ? 'active' : ''}
                onClick={() => onDisplayModeChange('mushaf')}
              >
                Mushaf page
              </button>
              <button
                type="button"
                className={displayMode === 'list' ? 'active' : ''}
                onClick={() => onDisplayModeChange('list')}
              >
                Ayah list
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Translation</span>
            <select
              value={translationId}
              onChange={(e) => onTranslationChange(e.target.value as TranslationId)}
            >
              {TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="segmented segmented-toggle">
              <button
                type="button"
                className={showTranslation ? 'active' : ''}
                onClick={() => onShowTranslationChange(true)}
              >
                Show
              </button>
              <button
                type="button"
                className={!showTranslation ? 'active' : ''}
                onClick={() => onShowTranslationChange(false)}
              >
                Hide
              </button>
            </div>
            <p className="field-hint">
              {showTranslation
                ? 'Translation appears over the mushaf page and under each ayah in list view.'
                : 'Translation is hidden — Arabic only.'}
            </p>
          </div>

          <div className="field">
            <span className="field-label">Arabic font</span>
            <select value={font} onChange={(e) => onFontChange(e.target.value as FontId)}>
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <p
              className="font-preview"
              data-font={font}
              data-font-weight={fontWeight}
              dir="rtl"
              lang="ar"
              aria-label="Font sample"
            >
              {BISMILLAH.arabic}
            </p>
          </div>

          <div className="field">
            <span className="field-label">Font weight</span>
            <div className="segmented">
              <button
                type="button"
                className={fontWeight === 'regular' ? 'active' : ''}
                onClick={() => onFontWeightChange('regular')}
              >
                Regular
              </button>
              <button
                type="button"
                className={fontWeight === 'bold' ? 'active' : ''}
                onClick={() => onFontWeightChange('bold')}
              >
                Bold
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Text size</span>
            <div className="stepper">
              <button
                type="button"
                aria-label="Decrease text size"
                disabled={fontScale <= FONT_SCALE_MIN}
                onClick={() =>
                  onFontScaleChange(
                    Math.max(FONT_SCALE_MIN, Number((fontScale - FONT_SCALE_STEP).toFixed(1))),
                  )
                }
              >
                A−
              </button>
              <span className="stepper-value stepper-value-sm">{Math.round(fontScale * 100)}%</span>
              <button
                type="button"
                aria-label="Increase text size"
                disabled={fontScale >= FONT_SCALE_MAX}
                onClick={() =>
                  onFontScaleChange(
                    Math.min(FONT_SCALE_MAX, Number((fontScale + FONT_SCALE_STEP).toFixed(1))),
                  )
                }
              >
                A+
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Physical next / prev</span>
            <div className="segmented">
              <button
                type="button"
                className={physicalNav === 'ayah' ? 'active' : ''}
                onClick={() => onPhysicalNavChange('ayah')}
              >
                Ayah
              </button>
              <button
                type="button"
                className={physicalNav === 'surah' ? 'active' : ''}
                onClick={() => onPhysicalNavChange('surah')}
              >
                Surah
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Mushaf page width</span>
            <div className="segmented segmented-3">
              <button
                type="button"
                className={mushafWidth === 'auto' ? 'active' : ''}
                onClick={() => onMushafWidthChange('auto')}
              >
                Auto
              </button>
              <button
                type="button"
                className={mushafWidth === 'a4' ? 'active' : ''}
                onClick={() => onMushafWidthChange('a4')}
              >
                A4 max
              </button>
              <button
                type="button"
                className={mushafWidth === 'full' ? 'active' : ''}
                onClick={() => onMushafWidthChange('full')}
              >
                Full
              </button>
            </div>
            <p className="field-hint">
              Auto uses A4 width on landscape and desktop; full width on portrait phone.
            </p>
          </div>

          <div className="field">
            <span className="field-label">Repeats</span>
            <div className="stepper">
              <button
                type="button"
                aria-label="Decrease repeats"
                onClick={() => onRepeatsChange(Math.max(1, repeats - 1))}
              >
                −
              </button>
              <span className="stepper-value">{repeats}</span>
              <button
                type="button"
                aria-label="Increase repeats"
                onClick={() => onRepeatsChange(Math.min(99, repeats + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Reciter</span>
            <select
              value={reciterId}
              onChange={(e) => {
                stopSample()
                onReciterChange(e.target.value)
              }}
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <div className="reciter-sample-row">
              <button
                type="button"
                className="btn btn-ghost btn-sample"
                onClick={() => void (samplePlaying ? stopSample() : playSample())}
              >
                {samplePlaying ? '■ Stop sample' : '▶ Sample'}
              </button>
              <span className="field-hint">Bismillah + Al-Fatihah 2–3</span>
            </div>
            {sampleError ? <p className="field-error">{sampleError}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

import { FONT_SCALE_MAX, FONT_SCALE_MIN, FONT_SCALE_STEP } from '../lib/prefs'
import { RECITERS } from '../data/reciters'
import type { DisplayMode, FontId, PhysicalNav } from '../types'

const FONTS: { id: FontId; label: string }[] = [
  { id: 'ibm', label: 'IBM Plex Sans' },
  { id: 'amiri', label: 'Amiri' },
  { id: 'noto', label: 'Noto Naskh' },
  { id: 'scheherazade', label: 'Scheherazade' },
]

interface Props {
  open: boolean
  onClose: () => void
  displayMode: DisplayMode
  font: FontId
  fontScale: number
  physicalNav: PhysicalNav
  repeats: number
  reciterId: string
  onDisplayModeChange: (mode: DisplayMode) => void
  onFontChange: (font: FontId) => void
  onFontScaleChange: (scale: number) => void
  onPhysicalNavChange: (value: PhysicalNav) => void
  onRepeatsChange: (n: number) => void
  onReciterChange: (id: string) => void
}

export function SettingsModal({
  open,
  onClose,
  displayMode,
  font,
  fontScale,
  physicalNav,
  repeats,
  reciterId,
  onDisplayModeChange,
  onFontChange,
  onFontScaleChange,
  onPhysicalNavChange,
  onRepeatsChange,
  onReciterChange,
}: Props) {
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

          <label className="field">
            <span className="field-label">Arabic font</span>
            <select value={font} onChange={(e) => onFontChange(e.target.value as FontId)}>
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

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

          <label className="field">
            <span className="field-label">Reciter</span>
            <select value={reciterId} onChange={(e) => onReciterChange(e.target.value)}>
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SetupPanel } from './components/SetupPanel'
import { AyahReader } from './components/AyahReader'
import { PlayerDock } from './components/PlayerDock'
import { getAyahs, getSurah } from './data/quran'
import { usePlayer } from './hooks/usePlayer'
import {
  downloadSurah,
  isSurahCached,
  removeSurah,
} from './lib/offlineCache'
import { loadPrefs, savePrefs } from './lib/prefs'
import type { AppPrefs, DownloadStatus, FontId, RepeatMode, ThemeId } from './types'

export default function App() {
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs())
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')
  const [downloadProgress, setDownloadProgress] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const surah = useMemo(() => getSurah(prefs.surahId), [prefs.surahId])
  const ayahs = useMemo(() => getAyahs(prefs.surahId), [prefs.surahId])

  const onToast = useCallback((message: string) => {
    setToast(message)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    savePrefs(prefs)
    document.documentElement.dataset.theme = prefs.theme
    document.documentElement.dataset.font = prefs.font
  }, [prefs])

  useEffect(() => {
    let cancelled = false
    setDownloadStatus('idle')
    setDownloadProgress('')
    void isSurahCached(prefs.reciterId, prefs.surahId, surah.versesCount).then((ready) => {
      if (!cancelled && ready) setDownloadStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [prefs.reciterId, prefs.surahId, surah.versesCount])

  const player = usePlayer({
    surahId: prefs.surahId,
    versesCount: surah.versesCount,
    mode: prefs.mode,
    repeats: prefs.repeats,
    reciterId: prefs.reciterId,
    onToast,
  })

  const update = <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  const handleDownload = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setDownloadStatus('downloading')
    setDownloadProgress('Downloading…')
    try {
      await downloadSurah(
        prefs.reciterId,
        prefs.surahId,
        surah.versesCount,
        (done, total) => setDownloadProgress(`Downloading ${done}/${total}`),
        controller.signal,
      )
      setDownloadStatus('ready')
      setDownloadProgress('')
      setToast('Surah saved for offline')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setDownloadStatus('error')
      setDownloadProgress('')
      setToast(err instanceof Error ? err.message : 'Download failed')
      // clear partial
      await removeSurah(prefs.reciterId, prefs.surahId, surah.versesCount).catch(() => {})
      setDownloadStatus('idle')
    }
  }

  const handleRemove = async () => {
    await removeSurah(prefs.reciterId, prefs.surahId, surah.versesCount)
    setDownloadStatus('idle')
    setToast('Offline copy removed')
  }

  return (
    <div className="app-shell">
      <SetupPanel
        surahId={prefs.surahId}
        mode={prefs.mode}
        repeats={prefs.repeats}
        reciterId={prefs.reciterId}
        theme={prefs.theme}
        font={prefs.font}
        downloadStatus={downloadStatus}
        downloadProgress={downloadProgress}
        onSurahChange={(id) => {
          player.stop()
          update('surahId', id)
        }}
        onModeChange={(mode: RepeatMode) => {
          player.stop()
          update('mode', mode)
        }}
        onRepeatsChange={(n) => {
          player.stop()
          update('repeats', n)
        }}
        onReciterChange={(id) => {
          player.stop()
          update('reciterId', id)
        }}
        onThemeChange={(theme: ThemeId) => update('theme', theme)}
        onFontChange={(font: FontId) => update('font', font)}
        onDownload={() => void handleDownload()}
        onRemoveDownload={() => void handleRemove()}
        onPlay={() => player.play()}
        isPlaying={player.isPlaying}
      />

      <section className="reader-pane">
        <AyahReader
          ayahs={ayahs}
          activeAyah={player.currentAyah}
          surahName={`${surah.nameSimple} · ${surah.nameArabic}`}
        />
        <PlayerDock
          isPlaying={player.isPlaying}
          currentAyah={player.currentAyah}
          versesCount={surah.versesCount}
          repeatIndex={player.repeatIndex}
          totalRepeats={player.totalRepeats}
          onPrev={player.prev}
          onToggle={player.toggle}
          onNext={player.next}
        />
      </section>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

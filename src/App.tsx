import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SetupPanel } from './components/SetupPanel'
import { AyahReader } from './components/AyahReader'
import { PlayerDock } from './components/PlayerDock'
import { ReaderChrome } from './components/ReaderChrome'
import { getAdjacentSurahId, getAyahs, getSurah } from './data/quran'
import { usePlayer } from './hooks/usePlayer'
import { usePwaInstall } from './hooks/usePwaInstall'
import {
  downloadSurah,
  isSurahCached,
  removeSurah,
} from './lib/offlineCache'
import { loadPrefs, savePrefs } from './lib/prefs'
import type {
  AppPrefs,
  DisplayMode,
  DownloadStatus,
  FontId,
  RepeatMode,
  ThemeId,
} from './types'

const PORTRAIT_MOBILE_MQ = '(max-width: 900px) and (orientation: portrait)'

export default function App() {
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs())
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')
  const [downloadProgress, setDownloadProgress] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPortraitMobile, setIsPortraitMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(PORTRAIT_MOBILE_MQ).matches : false,
  )
  const abortRef = useRef<AbortController | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const pwa = usePwaInstall()

  const surah = useMemo(() => getSurah(prefs.surahId), [prefs.surahId])
  const ayahs = useMemo(() => getAyahs(prefs.surahId), [prefs.surahId])
  const prevSurahId = useMemo(() => getAdjacentSurahId(prefs.surahId, -1), [prefs.surahId])
  const nextSurahId = useMemo(() => getAdjacentSurahId(prefs.surahId, 1), [prefs.surahId])

  const onToast = useCallback((message: string) => {
    setToast(message)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT_MOBILE_MQ)
    const sync = () => setIsPortraitMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    savePrefs(prefs)
    document.documentElement.dataset.theme = prefs.theme
    document.documentElement.dataset.font = prefs.font
    document.documentElement.style.setProperty('--font-scale', String(prefs.fontScale))
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

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const player = usePlayer({
    surahId: prefs.surahId,
    versesCount: surah.versesCount,
    mode: prefs.mode,
    repeats: prefs.repeats,
    reciterId: prefs.reciterId,
    onToast,
  })

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${surah.nameSimple} · ${surah.nameArabic}`,
      artist: 'ReciteHelper',
      album: 'Juz Amma',
    })
  }, [surah])

  const update = <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  const goToSurah = (id: number) => {
    player.stop()
    update('surahId', id)
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
      await removeSurah(prefs.reciterId, prefs.surahId, surah.versesCount).catch(() => {})
      setDownloadStatus('idle')
    }
  }

  const handleRemove = async () => {
    await removeSurah(prefs.reciterId, prefs.surahId, surah.versesCount)
    setDownloadStatus('idle')
    setToast('Offline copy removed')
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await (shellRef.current ?? document.documentElement).requestFullscreen()
      }
    } catch {
      setToast('Fullscreen not available on this browser')
    }
  }

  const handleInstall = async () => {
    const ok = await pwa.install()
    if (ok) setToast('App installed')
    else if (!pwa.canInstall) {
      setToast('Use browser menu → Add to Home Screen / Install')
    }
  }

  const panelIsCollapsed = isPortraitMobile && panelCollapsed

  return (
    <div
      ref={shellRef}
      className={`app-shell${panelIsCollapsed ? ' panel-collapsed' : ''}${isFullscreen ? ' is-fullscreen' : ''}`}
    >
      <SetupPanel
        surahId={prefs.surahId}
        mode={prefs.mode}
        repeats={prefs.repeats}
        reciterId={prefs.reciterId}
        theme={prefs.theme}
        font={prefs.font}
        fontScale={prefs.fontScale}
        displayMode={prefs.displayMode}
        floatingTranslation={prefs.floatingTranslation}
        downloadStatus={downloadStatus}
        downloadProgress={downloadProgress}
        collapsed={panelIsCollapsed}
        onToggleCollapsed={() => setPanelCollapsed((v) => !v)}
        onSurahChange={goToSurah}
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
        onFontScaleChange={(scale) => update('fontScale', scale)}
        onDisplayModeChange={(mode: DisplayMode) => update('displayMode', mode)}
        onFloatingTranslationChange={(value) => update('floatingTranslation', value)}
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
          displayMode={prefs.displayMode}
          floatingTranslation={prefs.floatingTranslation}
          headerActions={
            <ReaderChrome
              isFullscreen={isFullscreen}
              canInstall={pwa.canInstall || !pwa.installed}
              onToggleFullscreen={() => void toggleFullscreen()}
              onInstall={() => void handleInstall()}
            />
          }
        />
        <PlayerDock
          isPlaying={player.isPlaying}
          currentAyah={player.currentAyah}
          versesCount={surah.versesCount}
          repeatIndex={player.repeatIndex}
          totalRepeats={player.totalRepeats}
          canPrevSurah={prevSurahId != null}
          canNextSurah={nextSurahId != null}
          onPrev={player.prev}
          onToggle={player.toggle}
          onNext={player.next}
          onPrevSurah={() => {
            if (prevSurahId != null) goToSurah(prevSurahId)
          }}
          onNextSurah={() => {
            if (nextSurahId != null) goToSurah(nextSurahId)
          }}
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

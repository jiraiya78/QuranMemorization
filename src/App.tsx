import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SetupPanel } from './components/SetupPanel'
import { AyahReader } from './components/AyahReader'
import { PlayerDock } from './components/PlayerDock'
import { ReaderChrome } from './components/ReaderChrome'
import { SettingsModal } from './components/SettingsModal'
import { getAdjacentSurahId, getAyahs, getSurah } from './data/quran'
import { usePlayer } from './hooks/usePlayer'
import { usePwaInstall } from './hooks/usePwaInstall'
import {
  downloadSurah,
  isSurahCached,
  removeSurah,
} from './lib/offlineCache'
import { clampAyahRange, loadPrefs, savePrefs } from './lib/prefs'
import type {
  AppPrefs,
  DisplayMode,
  DownloadStatus,
  FontId,
  PhysicalNav,
  RepeatMode,
  ThemeId,
} from './types'

const PORTRAIT_MOBILE_MQ = '(max-width: 900px) and (orientation: portrait)'
const FS_LANDSCAPE_MQ = '(orientation: landscape)'

export default function App() {
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs())
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')
  const [downloadProgress, setDownloadProgress] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [panelCollapsed, setPanelCollapsed] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fsPanelOpen, setFsPanelOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isPortraitMobile, setIsPortraitMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(PORTRAIT_MOBILE_MQ).matches : false,
  )
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(FS_LANDSCAPE_MQ).matches : false,
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

  const goToSurah = useCallback((id: number) => {
    const versesCount = getSurah(id).versesCount
    const range = clampAyahRange(1, versesCount, versesCount)
    setPrefs((p) => ({ ...p, surahId: id, ...range }))
  }, [])

  const goToSurahRef = useRef(goToSurah)
  goToSurahRef.current = goToSurah
  const prevSurahIdRef = useRef(prevSurahId)
  const nextSurahIdRef = useRef(nextSurahId)
  prevSurahIdRef.current = prevSurahId
  nextSurahIdRef.current = nextSurahId
  const playerStopRef = useRef<() => void>(() => {})

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
    const mq = window.matchMedia(FS_LANDSCAPE_MQ)
    const sync = () => setIsLandscape(mq.matches)
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
    const range = clampAyahRange(prefs.rangeFrom, prefs.rangeTo, surah.versesCount)
    if (range.rangeFrom !== prefs.rangeFrom || range.rangeTo !== prefs.rangeTo) {
      setPrefs((p) => ({ ...p, ...range }))
    }
  }, [prefs.rangeFrom, prefs.rangeTo, surah.versesCount])

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
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement)
      setIsFullscreen(active)
      if (!active) setFsPanelOpen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const handleSurahPrev = useCallback(() => {
    const id = prevSurahIdRef.current
    if (id != null) {
      playerStopRef.current()
      goToSurahRef.current(id)
    }
  }, [])

  const handleSurahNext = useCallback(() => {
    const id = nextSurahIdRef.current
    if (id != null) {
      playerStopRef.current()
      goToSurahRef.current(id)
    }
  }, [])

  const player = usePlayer({
    surahId: prefs.surahId,
    versesCount: surah.versesCount,
    mode: prefs.mode,
    repeats: prefs.repeats,
    rangeFrom: prefs.rangeFrom,
    rangeTo: prefs.rangeTo,
    pageNumber: prefs.pageNumber,
    reciterId: prefs.reciterId,
    physicalNav: prefs.physicalNav,
    onSurahPrev: handleSurahPrev,
    onSurahNext: handleSurahNext,
    onToast,
  })

  playerStopRef.current = player.stop

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${surah.nameSimple} · ${surah.nameArabic}`,
      artist: 'ReciteHelper',
      album: 'Quran',
    })
  }, [surah])

  const update = <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  const changeSurah = (id: number) => {
    player.stop()
    goToSurah(id)
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

  const setPageNumber = useCallback((page: number) => {
    setPrefs((p) => (p.pageNumber === page ? p : { ...p, pageNumber: page }))
  }, [])

  const panelIsCollapsed = isPortraitMobile && panelCollapsed
  const chromeInHeader = isFullscreen && isLandscape
  const shellClass = [
    'app-shell',
    panelIsCollapsed ? 'panel-collapsed' : '',
    isFullscreen ? 'is-fullscreen' : '',
    isFullscreen && fsPanelOpen ? 'fs-panel-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={shellRef} className={shellClass}>
      <SetupPanel
        surahId={prefs.surahId}
        mode={prefs.mode}
        rangeFrom={prefs.rangeFrom}
        rangeTo={prefs.rangeTo}
        versesCount={surah.versesCount}
        theme={prefs.theme}
        downloadStatus={downloadStatus}
        downloadProgress={downloadProgress}
        collapsed={panelIsCollapsed}
        onToggleCollapsed={() => setPanelCollapsed((v) => !v)}
        onSurahChange={changeSurah}
        onModeChange={(mode: RepeatMode) => {
          player.stop()
          update('mode', mode)
        }}
        onRangeFromChange={(n) => {
          player.stop()
          const range = clampAyahRange(n, prefs.rangeTo, surah.versesCount)
          setPrefs((p) => ({ ...p, ...range }))
        }}
        onRangeToChange={(n) => {
          player.stop()
          const range = clampAyahRange(prefs.rangeFrom, n, surah.versesCount)
          setPrefs((p) => ({ ...p, ...range }))
        }}
        onThemeChange={(theme: ThemeId) => update('theme', theme)}
        onDownload={() => void handleDownload()}
        onRemoveDownload={() => void handleRemove()}
        onPlay={() => player.play()}
        onOpenSettings={() => setSettingsOpen(true)}
        isPlaying={player.isPlaying}
      />

      <section className="reader-pane">
        <AyahReader
          ayahs={ayahs}
          activeAyah={player.currentAyah}
          activeSurahId={player.currentSurahId}
          surahId={prefs.surahId}
          surahName={`${surah.nameSimple} · ${surah.nameArabic}`}
          displayMode={prefs.displayMode}
          pageNumber={prefs.pageNumber}
          onPageChange={setPageNumber}
          chromeInHeader={chromeInHeader}
          headerActions={
            <ReaderChrome
              isFullscreen={isFullscreen}
              panelOpenInFullscreen={fsPanelOpen}
              canInstall={pwa.canInstall || !pwa.installed}
              onToggleFullscreen={() => void toggleFullscreen()}
              onTogglePanel={() => setFsPanelOpen((v) => !v)}
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
            if (prevSurahId != null) changeSurah(prevSurahId)
          }}
          onNextSurah={() => {
            if (nextSurahId != null) changeSurah(nextSurahId)
          }}
        />
      </section>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        displayMode={prefs.displayMode}
        font={prefs.font}
        fontScale={prefs.fontScale}
        physicalNav={prefs.physicalNav}
        repeats={prefs.repeats}
        reciterId={prefs.reciterId}
        onDisplayModeChange={(mode: DisplayMode) => update('displayMode', mode)}
        onFontChange={(font: FontId) => update('font', font)}
        onFontScaleChange={(scale) => update('fontScale', scale)}
        onPhysicalNavChange={(value: PhysicalNav) => update('physicalNav', value)}
        onRepeatsChange={(n) => {
          player.stop()
          update('repeats', n)
        }}
        onReciterChange={(id) => {
          player.stop()
          update('reciterId', id)
        }}
      />

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

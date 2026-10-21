import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SetupPanel } from './components/SetupPanel'
import { AyahReader } from './components/AyahReader'
import { PlayerDock } from './components/PlayerDock'
import { ReaderChrome } from './components/ReaderChrome'
import { SettingsModal } from './components/SettingsModal'
import { getPageForAyah } from './data/mushaf'
import { getAdjacentSurahId, getAyahs, getSurah } from './data/quran'
import { usePlayer } from './hooks/usePlayer'
import { usePwaInstall } from './hooks/usePwaInstall'
import type { AyahRef } from './lib/ayahSelect'
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
  FontWeight,
  MushafWidth,
  PhysicalNav,
  RepeatMode,
  ThemeId,
  TranslationId,
} from './types'

const PORTRAIT_MOBILE_MQ = '(max-width: 900px) and (orientation: portrait)'
const FS_LANDSCAPE_MQ = '(orientation: landscape)'

export default function App() {
  const [prefs, setPrefs] = useState<AppPrefs>(() => loadPrefs())
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')
  const [downloadProgress, setDownloadProgress] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? !window.matchMedia(PORTRAIT_MOBILE_MQ).matches : true,
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedAyah, setSelectedAyah] = useState<AyahRef | null>(null)
  const [focusSurahId, setFocusSurahId] = useState<number | null>(null)
  const [focusSurahKey, setFocusSurahKey] = useState(0)
  const [isPortraitMobile, setIsPortraitMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(PORTRAIT_MOBILE_MQ).matches : false,
  )
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(FS_LANDSCAPE_MQ).matches : false,
  )
  const abortRef = useRef<AbortController | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const pendingPlayFromRef = useRef<AyahRef | null>(null)
  const pwa = usePwaInstall()

  const surah = useMemo(() => getSurah(prefs.surahId), [prefs.surahId])
  const ayahs = useMemo(
    () => getAyahs(prefs.surahId, prefs.translationId),
    [prefs.surahId, prefs.translationId],
  )
  const prevSurahId = useMemo(() => getAdjacentSurahId(prefs.surahId, -1), [prefs.surahId])
  const nextSurahId = useMemo(() => getAdjacentSurahId(prefs.surahId, 1), [prefs.surahId])

  const onToast = useCallback((message: string) => {
    setToast(message)
  }, [])

  const goToSurah = useCallback((id: number) => {
    const versesCount = getSurah(id).versesCount
    const range = clampAyahRange(1, versesCount, versesCount)
    const pageNumber = getPageForAyah(id, 1)
    setPrefs((p) => ({ ...p, surahId: id, ...range, pageNumber }))
    setFocusSurahId(id)
    setFocusSurahKey((k) => k + 1)
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
    document.documentElement.dataset.fontWeight = prefs.fontWeight
    document.documentElement.dataset.mushafWidth = prefs.mushafWidth
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
      setIsFullscreen(Boolean(document.fullscreenElement))
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

  const handleSelectAyah = useCallback((ref: AyahRef) => {
    setSelectedAyah((prev) =>
      prev?.surahId === ref.surahId && prev?.ayah === ref.ayah ? null : ref,
    )
  }, [])

  const playFromSelection = useCallback(
    (ref: AyahRef) => {
      if (prefs.mode !== 'page' && ref.surahId !== prefs.surahId) {
        pendingPlayFromRef.current = ref
        const versesCount = getSurah(ref.surahId).versesCount
        const range = clampAyahRange(1, versesCount, versesCount)
        setPrefs((p) => ({ ...p, surahId: ref.surahId, ...range }))
        return
      }
      player.playFrom(ref.surahId, ref.ayah)
      setSelectedAyah(null)
    },
    [prefs.mode, prefs.surahId, player.playFrom],
  )

  useEffect(() => {
    const pending = pendingPlayFromRef.current
    if (!pending) return
    if (prefs.surahId !== pending.surahId) return
    pendingPlayFromRef.current = null
    player.playFrom(pending.surahId, pending.ayah)
    setSelectedAyah(null)
  }, [prefs.surahId, prefs.rangeFrom, prefs.rangeTo, prefs.mode, player.playFrom])

  const handleToggle = useCallback(() => {
    if (player.isPlaying) {
      player.pause()
      return
    }
    if (selectedAyah) {
      playFromSelection(selectedAyah)
      return
    }
    player.toggle()
  }, [playFromSelection, player.isPlaying, player.pause, player.toggle, selectedAyah])

  const update = <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  const changeSurah = (id: number) => {
    player.stop()
    setSelectedAyah(null)
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
    if (ok) {
      setToast('App installed')
      return
    }
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setToast('Safari: Share → Add to Home Screen')
    } else if (/Android/i.test(ua)) {
      setToast('Chrome menu (⋮) → Install app / Add to Home screen')
    } else {
      setToast('Chrome/Edge: install icon in the address bar, or menu → Install')
    }
  }

  const setPageNumber = useCallback((page: number) => {
    setPrefs((p) => (p.pageNumber === page ? p : { ...p, pageNumber: page }))
  }, [])

  const chromeInHeader = isFullscreen && isLandscape
  const shellClass = [
    'app-shell',
    panelOpen ? 'panel-open' : 'panel-hidden',
    isFullscreen ? 'is-fullscreen' : '',
    isPortraitMobile ? 'is-portrait-mobile' : '',
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
        onOpenSettings={() => setSettingsOpen(true)}
        showCloseChrome={isPortraitMobile}
        onClose={() => setPanelOpen(false)}
      />

      <section className="reader-pane">
        <AyahReader
          ayahs={ayahs}
          activeAyah={player.currentAyah}
          activeSurahId={player.currentSurahId}
          surahId={prefs.surahId}
          surahName={`${surah.nameSimple} · ${surah.nameArabic}`}
          displayMode={prefs.displayMode}
          translationId={prefs.translationId}
          showTranslation={prefs.showTranslation}
          pageNumber={prefs.pageNumber}
          onPageChange={setPageNumber}
          selectedSurahId={selectedAyah?.surahId ?? null}
          selectedAyah={selectedAyah?.ayah ?? null}
          onSelectAyah={handleSelectAyah}
          focusSurahId={focusSurahId}
          focusSurahKey={focusSurahKey}
          fitKey={`${prefs.font}:${prefs.fontWeight}:${prefs.fontScale}`}
          chromeInHeader={chromeInHeader}
          headerActions={
            <ReaderChrome
              isFullscreen={isFullscreen}
              panelOpen={panelOpen}
              canInstall={pwa.canInstall || !pwa.installed}
              onToggleFullscreen={() => void toggleFullscreen()}
              onTogglePanel={() => setPanelOpen((v) => !v)}
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
          onToggle={handleToggle}
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
        fontWeight={prefs.fontWeight}
        fontScale={prefs.fontScale}
        translationId={prefs.translationId}
        showTranslation={prefs.showTranslation}
        physicalNav={prefs.physicalNav}
        mushafWidth={prefs.mushafWidth}
        repeats={prefs.repeats}
        reciterId={prefs.reciterId}
        onDisplayModeChange={(mode: DisplayMode) => update('displayMode', mode)}
        onFontChange={(font: FontId) => update('font', font)}
        onFontWeightChange={(weight: FontWeight) => update('fontWeight', weight)}
        onFontScaleChange={(scale) => update('fontScale', scale)}
        onTranslationChange={(id: TranslationId) => update('translationId', id)}
        onShowTranslationChange={(show: boolean) => update('showTranslation', show)}
        onPhysicalNavChange={(value: PhysicalNav) => update('physicalNav', value)}
        onMushafWidthChange={(value: MushafWidth) => update('mushafWidth', value)}
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

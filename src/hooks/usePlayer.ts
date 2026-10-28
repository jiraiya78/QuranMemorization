import { useCallback, useEffect, useRef, useState } from 'react'
import { buildPlaylist } from '../lib/playlist'
import { getPlayableUrl } from '../lib/offlineCache'
import { BISMILLAH_AYAH } from '../data/bismillah'
import { getAyahsOnPage, getPageForAyah } from '../data/mushaf'
import type { PhysicalNav, RepeatMode } from '../types'

/** Silence between ayahs. Kept short — the next source is preloaded while the current one plays. */
const GAP_MS = 90

interface UsePlayerOptions {
  surahId: number
  versesCount: number
  mode: RepeatMode
  repeats: number
  rangeFrom: number
  rangeTo: number
  pageNumber: number
  reciterId: string
  physicalNav: PhysicalNav
  /** TV D-pad focus navigation owns the arrow keys. */
  remoteNav?: boolean
  onSurahPrev?: () => void
  onSurahNext?: () => void
  /** Page Up/Down or TV channel keys. */
  onPagePrev?: () => void
  onPageNext?: () => void
  /**
   * Start a page whose ayahs are not in the current queue (the user browsed into
   * another surah). App retargets surah/range and calls `playFrom`.
   */
  onPlayPage?: (surahId: number, ayah: number) => void
  onToast?: (message: string) => void
}

function findPrevIndex(list: { ayah: number; repeatIndex: number }[], from: number): number {
  const cur = list[from]
  if (!cur) return 0
  let i = from - 1
  while (i >= 0 && list[i].ayah === cur.ayah && list[i].repeatIndex === cur.repeatIndex) {
    i--
  }
  if (i < 0) return 0
  const targetAyah = list[i].ayah
  while (i > 0 && list[i - 1].ayah === targetAyah) i--
  return i
}

export function usePlayer({
  surahId,
  versesCount,
  mode,
  repeats,
  rangeFrom,
  rangeTo,
  pageNumber,
  reciterId,
  physicalNav,
  remoteNav = false,
  onSurahPrev,
  onSurahNext,
  onPagePrev,
  onPageNext,
  onPlayPage,
  onToast,
}: UsePlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlsRef = useRef<string[]>([])
  const indexRef = useRef(0)
  /** Resolved sources for upcoming playlist entries, filled while the current ayah plays. */
  const preloadRef = useRef(new Map<number, string>())
  const preloadingRef = useRef(new Set<number>())
  /** Spare element that buffers the next ayah so the following transition starts instantly. */
  const warmRef = useRef<HTMLAudioElement | null>(null)
  /** Page number only affects playlist in `page` mode — otherwise page nav must not reset playback. */
  const playlistPage = mode === 'page' ? pageNumber : 1
  /** Identity of the queue: a page turn (page mode) produces a different scope. */
  const scopeKey = [mode, surahId, versesCount, repeats, rangeFrom, rangeTo, playlistPage].join('|')
  const scopeKeyRef = useRef(scopeKey)
  scopeKeyRef.current = scopeKey
  const playlistRef = useRef(
    buildPlaylist({
      surahId,
      versesCount,
      mode,
      repeats,
      rangeFrom,
      rangeTo,
      pageNumber: playlistPage,
    }),
  )
  /** Scope the current playlist was built for. */
  const playlistScopeRef = useRef(scopeKey)
  /** Scope the track currently loaded in the audio element belongs to (null = nothing loaded). */
  const audioScopeRef = useRef<string | null>(null)
  /** Madani page the loaded track sits on — Play re-targets the browsed page. */
  const audioPageRef = useRef<number | null>(null)
  const playingRef = useRef(false)
  const gapTimerRef = useRef<number | null>(null)
  const physicalNavRef = useRef(physicalNav)
  const onSurahPrevRef = useRef(onSurahPrev)
  const onSurahNextRef = useRef(onSurahNext)
  const onPlayPageRef = useRef(onPlayPage)
  /** Page on screen — Play starts recitation here, not wherever it last stopped. */
  const pageNumberRef = useRef(pageNumber)
  /** Filled by the Media Session effect; called after every successful play(). */
  const bindMediaSessionRef = useRef<() => void>(() => {})
  physicalNavRef.current = physicalNav
  onSurahPrevRef.current = onSurahPrev
  onSurahNextRef.current = onSurahNext
  onPlayPageRef.current = onPlayPage
  pageNumberRef.current = pageNumber

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAyah, setCurrentAyah] = useState(0)
  const [currentSurahId, setCurrentSurahId] = useState(surahId)
  const [repeatIndex, setRepeatIndex] = useState(1)
  const [totalRepeats, setTotalRepeats] = useState(repeats)
  /** Bumped on every playlist move so the reader re-centres even for a repeated ayah. */
  const [followKey, setFollowKey] = useState(0)
  const [playlistLength, setPlaylistLength] = useState(playlistRef.current.length)
  /** True while a source is loaded — the Stop control is only useful then. */
  const [isLoaded, setIsLoaded] = useState(false)

  const revokeObjectUrls = () => {
    for (const u of objectUrlsRef.current) URL.revokeObjectURL(u)
    objectUrlsRef.current = []
  }

  const clearPreload = () => {
    preloadRef.current.clear()
    preloadingRef.current.clear()
    const warm = warmRef.current
    if (warm) {
      warm.removeAttribute('src')
      warm.load()
    }
  }

  const clearGap = () => {
    if (gapTimerRef.current != null) {
      window.clearTimeout(gapTimerRef.current)
      gapTimerRef.current = null
    }
  }

  const rebuildPlaylist = useCallback(() => {
    playlistRef.current = buildPlaylist({
      surahId,
      versesCount,
      mode,
      repeats,
      rangeFrom,
      rangeTo,
      pageNumber: playlistPage,
    })
    playlistScopeRef.current = scopeKey
    clearPreload()
    setPlaylistLength(playlistRef.current.length)
  }, [mode, playlistPage, rangeFrom, rangeTo, repeats, scopeKey, surahId, versesCount])

  const syncMeta = useCallback((index: number) => {
    const item = playlistRef.current[index]
    if (!item) return
    setCurrentAyah(item.ayah)
    setCurrentSurahId(item.surahId)
    setRepeatIndex(item.repeatIndex)
    setTotalRepeats(item.totalRepeats)
    setFollowKey((k) => k + 1)
  }, [])

  /**
   * Resolve (and buffer) the source for the next playlist entries while the
   * current ayah is still playing. Page crossings are the slowest case because
   * they also need a page render, so the audio must already be warm.
   */
  const warmUpcoming = useCallback(
    (fromIndex: number) => {
      const list = playlistRef.current
      for (let i = fromIndex + 1; i <= fromIndex + 2 && i < list.length; i++) {
        if (preloadRef.current.has(i) || preloadingRef.current.has(i)) continue
        const item = list[i]
        if (!item) continue
        preloadingRef.current.add(i)
        void getPlayableUrl(reciterId, item.surahId, item.ayah)
          .then((url) => {
            if (url.startsWith('blob:')) objectUrlsRef.current.push(url)
            preloadRef.current.set(i, url)
            // Only the immediate next track is buffered by an element.
            if (i !== fromIndex + 1) return
            const warm = warmRef.current ?? new Audio()
            warmRef.current = warm
            warm.preload = 'auto'
            warm.muted = true
            warm.src = url
            warm.load()
          })
          .catch(() => {
            // Preloading is best-effort: `goTo` falls back to a normal fetch.
          })
          .finally(() => {
            preloadingRef.current.delete(i)
          })
      }
    },
    [reciterId],
  )

  /** Load playlist index. Only starts audio when `shouldPlay` is true. */
  const goTo = useCallback(
    async (index: number, shouldPlay: boolean) => {
      clearGap()
      const list = playlistRef.current
      if (index < 0 || index >= list.length) {
        playingRef.current = false
        setIsPlaying(false)
        return
      }

      indexRef.current = index
      const item = list[index]
      syncMeta(index)

      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      const audio = audioRef.current

      try {
        // A warm source lets playback start in the same frame as the page switch.
        const preloaded = preloadRef.current.get(index)
        preloadRef.current.delete(index)
        const url = preloaded ?? (await getPlayableUrl(reciterId, item.surahId, item.ayah))
        if (!preloaded && url.startsWith('blob:')) objectUrlsRef.current.push(url)
        audio.src = url
        audio.load()
        audioScopeRef.current = playlistScopeRef.current
        audioPageRef.current = getPageForAyah(item.surahId, item.ayah)
        setIsLoaded(true)

        if (shouldPlay) {
          await audio.play()
          playingRef.current = true
          setIsPlaying(true)
          // Keep car / Bluetooth hosts subscribed after every source swap.
          bindMediaSessionRef.current()
        } else {
          audio.pause()
          playingRef.current = false
          setIsPlaying(false)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Playback failed'
        onToast?.(msg)
        if (shouldPlay) {
          gapTimerRef.current = window.setTimeout(() => {
            void goTo(index + 1, true)
          }, GAP_MS)
        }
      }
      warmUpcoming(index)
    },
    [onToast, reciterId, syncMeta, warmUpcoming],
  )

  useEffect(() => {
    // Never swap the queue under a track that is currently sounding: flipping to
    // another page must not make the running recitation jump to that page's ayah
    // list. The new page is picked up by `play`/`resume` (and by `stop`) instead.
    if (playingRef.current) return
    rebuildPlaylist()
    indexRef.current = 0
    syncMeta(0)
  }, [rebuildPlaylist, syncMeta])

  /** Cached sources belong to the previous reciter — start over on change. */
  useEffect(() => {
    clearPreload()
  }, [reciterId])

  useEffect(() => {
    const audio = audioRef.current ?? new Audio()
    audioRef.current = audio

    const onEnded = () => {
      if (!playingRef.current) return
      gapTimerRef.current = window.setTimeout(() => {
        void goTo(indexRef.current + 1, true)
      }, GAP_MS)
    }

    const onError = () => {
      if (!playingRef.current) return
      onToast?.('Could not play this ayah — skipping')
      gapTimerRef.current = window.setTimeout(() => {
        void goTo(indexRef.current + 1, true)
      }, GAP_MS)
    }

    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      clearGap()
      audio.pause()
      revokeObjectUrls()
    }
  }, [goTo, onToast])

  /**
   * First playlist index printed on `page`, or -1 when the page is not in the
   * current queue. The Basmala that opens the surah is kept so a page never
   * starts mid-flow.
   */
  const firstIndexOnPage = useCallback((page: number): number => {
    const list = playlistRef.current
    for (const target of getAyahsOnPage(page)) {
      let idx = list.findIndex(
        (item) => item.surahId === target.surahId && item.ayah === target.ayah,
      )
      if (idx < 0) continue
      // Prefer the first repeat of that ayah.
      while (idx > 0) {
        const prev = list[idx - 1]
        if (prev && prev.surahId === target.surahId && prev.ayah === target.ayah) idx -= 1
        else break
      }
      const item = list[idx]
      const head = idx > 0 ? list[idx - 1] : undefined
      if (item && head && head.ayah === BISMILLAH_AYAH && head.surahId === item.surahId) {
        idx -= 1
      }
      return idx
    }
    return -1
  }, [])

  /** Ask App to retarget surah/range for a page outside the queue. */
  const requestBrowsedPage = useCallback((): boolean => {
    const first = getAyahsOnPage(pageNumberRef.current)[0]
    const request = onPlayPageRef.current
    if (!first || !request) return false
    request(first.surahId, first.ayah)
    return true
  }, [])

  /** Play the page on screen (falls back to the top of the queue). */
  const play = useCallback(() => {
    rebuildPlaylist()
    const browsedIndex = firstIndexOnPage(pageNumberRef.current)
    if (browsedIndex >= 0) {
      void goTo(browsedIndex, true)
      return
    }
    if (requestBrowsedPage()) return
    void goTo(0, true)
  }, [firstIndexOnPage, goTo, rebuildPlaylist, requestBrowsedPage])

  /** Start (or restart) from a specific ayah in the current playlist. */
  const playFrom = useCallback(
    (targetSurahId: number, targetAyah: number) => {
      rebuildPlaylist()
      const list = playlistRef.current
      let idx = list.findIndex(
        (item) => item.surahId === targetSurahId && item.ayah === targetAyah,
      )
      if (idx < 0) {
        onToast?.('Selected ayah is outside the current play mode')
        return
      }
      // Prefer first repeat of that ayah
      while (idx > 0) {
        const prevItem = list[idx - 1]
        if (
          prevItem &&
          prevItem.surahId === targetSurahId &&
          prevItem.ayah === targetAyah
        ) {
          idx -= 1
        } else break
      }
      void goTo(idx, true)
    },
    [goTo, onToast, rebuildPlaylist],
  )

  const pause = useCallback(() => {
    clearGap()
    playingRef.current = false
    setIsPlaying(false)
    audioRef.current?.pause()
  }, [])

  /**
   * Play what the user is looking at. If the loaded track sits on another page
   * (or in a queue the user navigated away from), start from the top of the
   * browsed page instead of resurrecting the old one.
   */
  const resume = useCallback(() => {
    const browsed = pageNumberRef.current
    const browsedIndex = firstIndexOnPage(browsed)
    if (audioPageRef.current !== browsed) {
      if (browsedIndex >= 0) {
        void goTo(browsedIndex, true)
        return
      }
      if (requestBrowsedPage()) return
    }
    if (audioScopeRef.current !== scopeKeyRef.current) {
      rebuildPlaylist()
      const index = firstIndexOnPage(browsed)
      indexRef.current = Math.max(0, index)
      void goTo(Math.max(0, index), true)
      return
    }
    const audio = audioRef.current
    if (!audio?.src || audio.error || audio.ended) {
      // Finished queue: start the browsed page over, not its last ayah.
      void goTo(browsedIndex >= 0 ? browsedIndex : 0, true)
      return
    }
    playingRef.current = true
    setIsPlaying(true)
    void audio.play().catch(() => {
      // After skip-while-paused, some browsers need a fresh load
      void goTo(indexRef.current, true)
    })
  }, [firstIndexOnPage, goTo, rebuildPlaylist, requestBrowsedPage])

  const toggle = useCallback(() => {
    if (isPlaying) pause()
    else if (audioRef.current?.src) resume()
    else play()
  }, [isPlaying, pause, play, resume])

  const next = useCallback(() => {
    void goTo(indexRef.current + 1, playingRef.current)
  }, [goTo])

  const prev = useCallback(() => {
    const i = findPrevIndex(playlistRef.current, indexRef.current)
    void goTo(i, playingRef.current)
  }, [goTo])

  const stop = useCallback(() => {
    pause()
    clearPreload()
    if (audioRef.current) {
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    revokeObjectUrls()
    audioScopeRef.current = null
    audioPageRef.current = null
    setIsLoaded(false)
    // Point the idle queue at whatever is on screen, so the very next Play press
    // starts the browsed page rather than something played earlier.
    rebuildPlaylist()
    const browsedIndex = firstIndexOnPage(pageNumberRef.current)
    indexRef.current = Math.max(0, browsedIndex)
    syncMeta(Math.max(0, browsedIndex))
  }, [firstIndexOnPage, pause, rebuildPlaylist, syncMeta])

  // Physical buttons: car steering wheel / headset / TV remote / Bluetooth.
  //
  // Handlers are stable closures over refs so they never go stale. Media Session
  // is bound once, then *re-asserted* (without nulling) whenever audio actually
  // starts — some car browsers silently drop handlers after pause/stop, and
  // wiring `play` to a toggle used to pause when the host's play/pause state
  // disagreed with ours.
  const controlsRef = useRef({ next, prev, toggle, play, resume, pause, stop })
  controlsRef.current = { next, prev, toggle, play, resume, pause, stop }
  const remoteNavRef = useRef(remoteNav)
  remoteNavRef.current = remoteNav
  const onPagePrevRef = useRef(onPagePrev)
  const onPageNextRef = useRef(onPageNext)
  onPagePrevRef.current = onPagePrev
  onPageNextRef.current = onPageNext

  useEffect(() => {
    const physicalNext = () => {
      if (physicalNavRef.current === 'surah') onSurahNextRef.current?.()
      else controlsRef.current.next()
    }
    const physicalPrev = () => {
      if (physicalNavRef.current === 'surah') onSurahPrevRef.current?.()
      else controlsRef.current.prev()
    }
    /** Explicit play — never toggle. Hosts send `play` when they think we are paused. */
    const physicalPlay = () => {
      const controls = controlsRef.current
      if (playingRef.current) return
      if (audioRef.current?.src) controls.resume()
      else controls.play()
    }
    const physicalPause = () => {
      controlsRef.current.pause()
    }
    const physicalToggle = () => {
      if (playingRef.current) physicalPause()
      else physicalPlay()
    }

    const isTypingTarget = (target: HTMLElement | null) =>
      Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable),
      )

    const matches = (code: string, key: string, names: string[]) =>
      names.includes(code) || names.includes(key)

    const onKeyDown = (e: KeyboardEvent) => {
      // Car / Bluetooth hosts often deliver media keys with `target` set to the
      // window or document — those have no `.closest`, and throwing here used to
      // abort the whole handler (play/pause and next/prev looked "dead").
      const target = e.target instanceof HTMLElement ? e.target : null
      if (isTypingTarget(target)) return

      const code = e.code || ''
      const key = e.key || ''
      // Space/Enter on a focused control should activate it, not double-fire here.
      const onButton =
        target != null &&
        target.closest('button, [role="button"], a[href]') != null &&
        (code === 'Space' || key === ' ' || code === 'Enter' || key === 'Enter')

      // Media keys always win — cars send these even when a button is focused.
      if (
        matches(code, key, ['MediaPlayPause', 'MediaPlay', 'MediaPause']) ||
        code === 'Space' ||
        key === ' '
      ) {
        if (onButton) return
        e.preventDefault()
        if (matches(code, key, ['MediaPlay'])) physicalPlay()
        else if (matches(code, key, ['MediaPause'])) physicalPause()
        else physicalToggle()
        return
      }

      if (
        matches(code, key, [
          'MediaTrackNext',
          'MediaFastForward',
          'MediaTrackNextTrack',
          'AudioForward',
        ])
      ) {
        e.preventDefault()
        physicalNext()
        return
      }
      if (
        matches(code, key, [
          'MediaTrackPrevious',
          'MediaRewind',
          'MediaTrackPreviousTrack',
          'AudioRewind',
        ])
      ) {
        e.preventDefault()
        physicalPrev()
        return
      }

      // TV remotes: channel keys and Page Up/Down flip Madani pages.
      const inDialog = target?.closest('[role="dialog"]') != null
      if (inDialog) return

      if (matches(code, key, ['PageDown', 'ChannelDown'])) {
        e.preventDefault()
        onPageNextRef.current?.()
        return
      }
      if (matches(code, key, ['PageUp', 'ChannelUp'])) {
        e.preventDefault()
        onPagePrevRef.current?.()
        return
      }

      // Arrow keys drive D-pad focus navigation on TV; on car head units they
      // step ayah/surah. Leave them alone when spatial navigation owns the arrows.
      if (remoteNavRef.current) return
      if (code === 'ArrowRight' || code === 'ArrowDown') {
        e.preventDefault()
        physicalNext()
        return
      }
      if (code === 'ArrowLeft' || code === 'ArrowUp') {
        e.preventDefault()
        physicalPrev()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null
    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => physicalPlay()],
      ['pause', () => physicalPause()],
      ['stop', () => controlsRef.current.stop()],
      ['previoustrack', () => physicalPrev()],
      ['nexttrack', () => physicalNext()],
    ]
    // A few head units map seek buttons onto next/prev instead of scrubbing.
    const optionalHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['seekforward', () => physicalNext()],
      ['seekbackward', () => physicalPrev()],
    ]

    const bindMediaSession = () => {
      if (!ms) return
      for (const [action, handler] of [...actionHandlers, ...optionalHandlers]) {
        try {
          ms.setActionHandler(action, handler)
        } catch {
          // Unsupported action on this host — keep the rest.
        }
      }
    }
    bindMediaSessionRef.current = bindMediaSession
    bindMediaSession()

    // Re-assert after the element actually starts; some cars only keep the
    // binding while a real playback session is live. Create the element now so
    // the listener is in place before the first user Play press.
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    const onAudioPlay = () => bindMediaSession()
    audio.addEventListener('play', onAudioPlay)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      audio.removeEventListener('play', onAudioPlay)
      bindMediaSessionRef.current = () => {}
      if (ms) {
        for (const [action] of [...actionHandlers, ...optionalHandlers]) {
          try {
            ms.setActionHandler(action, null)
          } catch {
            // ignore
          }
        }
      }
    }
  }, [])

  // Also re-bind when our playing flag flips on — covers resume paths that do
  // not fire a fresh HTMLMediaElement `play` event on every host.
  useEffect(() => {
    if (!navigator.mediaSession) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    if (isPlaying) bindMediaSessionRef.current()
  }, [isPlaying])

  return {
    isPlaying,
    /** A source is loaded, so Stop has something to clear. */
    isLoaded,
    currentAyah,
    currentSurahId,
    repeatIndex,
    totalRepeats,
    playlistLength,
    followKey,
    play,
    playFrom,
    pause,
    toggle,
    next,
    prev,
    stop,
  }
}

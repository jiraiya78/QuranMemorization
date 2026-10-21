import { useCallback, useEffect, useRef, useState } from 'react'
import { buildPlaylist } from '../lib/playlist'
import { getPlayableUrl } from '../lib/offlineCache'
import type { PhysicalNav, RepeatMode } from '../types'

const GAP_MS = 300

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
  onSurahPrev?: () => void
  onSurahNext?: () => void
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
  onSurahPrev,
  onSurahNext,
  onToast,
}: UsePlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlsRef = useRef<string[]>([])
  const indexRef = useRef(0)
  /** Page number only affects playlist in `page` mode — otherwise page nav must not reset playback. */
  const playlistPage = mode === 'page' ? pageNumber : 1
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
  const playingRef = useRef(false)
  const gapTimerRef = useRef<number | null>(null)
  const physicalNavRef = useRef(physicalNav)
  const onSurahPrevRef = useRef(onSurahPrev)
  const onSurahNextRef = useRef(onSurahNext)
  physicalNavRef.current = physicalNav
  onSurahPrevRef.current = onSurahPrev
  onSurahNextRef.current = onSurahNext

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAyah, setCurrentAyah] = useState(0)
  const [currentSurahId, setCurrentSurahId] = useState(surahId)
  const [repeatIndex, setRepeatIndex] = useState(1)
  const [totalRepeats, setTotalRepeats] = useState(repeats)
  const [playlistLength, setPlaylistLength] = useState(playlistRef.current.length)

  const revokeObjectUrls = () => {
    for (const u of objectUrlsRef.current) URL.revokeObjectURL(u)
    objectUrlsRef.current = []
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
    setPlaylistLength(playlistRef.current.length)
  }, [mode, playlistPage, rangeFrom, rangeTo, repeats, surahId, versesCount])

  const syncMeta = useCallback((index: number) => {
    const item = playlistRef.current[index]
    if (!item) return
    setCurrentAyah(item.ayah)
    setCurrentSurahId(item.surahId)
    setRepeatIndex(item.repeatIndex)
    setTotalRepeats(item.totalRepeats)
  }, [])

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
        const url = await getPlayableUrl(reciterId, item.surahId, item.ayah)
        if (url.startsWith('blob:')) objectUrlsRef.current.push(url)
        audio.src = url
        audio.load()

        if (shouldPlay) {
          await audio.play()
          playingRef.current = true
          setIsPlaying(true)
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
    },
    [onToast, reciterId, syncMeta],
  )

  useEffect(() => {
    rebuildPlaylist()
    indexRef.current = 0
    syncMeta(0)
  }, [rebuildPlaylist, syncMeta])

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

  const play = useCallback(() => {
    rebuildPlaylist()
    void goTo(0, true)
  }, [goTo, rebuildPlaylist])

  const pause = useCallback(() => {
    clearGap()
    playingRef.current = false
    setIsPlaying(false)
    audioRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    const audio = audioRef.current
    if (!audio?.src || audio.error || audio.ended) {
      void goTo(indexRef.current, true)
      return
    }
    playingRef.current = true
    setIsPlaying(true)
    void audio.play().catch(() => {
      // After skip-while-paused, some browsers need a fresh load
      void goTo(indexRef.current, true)
    })
  }, [goTo])

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
    if (audioRef.current) {
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    revokeObjectUrls()
    indexRef.current = 0
    syncMeta(0)
  }, [pause, syncMeta])

  // Keyboard + Media Session (car / headset physical buttons)
  useEffect(() => {
    const physicalNext = () => {
      if (physicalNavRef.current === 'surah') onSurahNextRef.current?.()
      else next()
    }
    const physicalPrev = () => {
      if (physicalNavRef.current === 'surah') onSurahPrevRef.current?.()
      else prev()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.code === 'Space' || e.code === 'MediaPlayPause') {
        e.preventDefault()
        toggle()
        return
      }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'MediaTrackNext') {
        e.preventDefault()
        physicalNext()
        return
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'MediaTrackPrevious') {
        e.preventDefault()
        physicalPrev()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    const ms = navigator.mediaSession
    if (ms) {
      try {
        ms.setActionHandler('play', () => {
          if (playingRef.current) return
          if (audioRef.current?.src) resume()
          else play()
        })
        ms.setActionHandler('pause', () => {
          if (playingRef.current) pause()
        })
        ms.setActionHandler('previoustrack', () => physicalPrev())
        ms.setActionHandler('nexttrack', () => physicalNext())
      } catch {
        // Some browsers reject unsupported handlers
      }
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (ms) {
        try {
          ms.setActionHandler('play', null)
          ms.setActionHandler('pause', null)
          ms.setActionHandler('previoustrack', null)
          ms.setActionHandler('nexttrack', null)
        } catch {
          // ignore
        }
      }
    }
  }, [next, pause, play, prev, resume, toggle])

  useEffect(() => {
    if (!navigator.mediaSession) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  return {
    isPlaying,
    currentAyah,
    currentSurahId,
    repeatIndex,
    totalRepeats,
    playlistLength,
    play,
    pause,
    toggle,
    next,
    prev,
    stop,
  }
}

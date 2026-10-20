import { useCallback, useEffect, useRef, useState } from 'react'
import { buildPlaylist } from '../lib/playlist'
import { getPlayableUrl } from '../lib/offlineCache'
import type { RepeatMode } from '../types'

const GAP_MS = 300

interface UsePlayerOptions {
  surahId: number
  versesCount: number
  mode: RepeatMode
  repeats: number
  rangeFrom: number
  rangeTo: number
  reciterId: string
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
  reciterId,
  onToast,
}: UsePlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlsRef = useRef<string[]>([])
  const indexRef = useRef(0)
  const playlistRef = useRef(
    buildPlaylist({ surahId, versesCount, mode, repeats, rangeFrom, rangeTo }),
  )
  const playingRef = useRef(false)
  const gapTimerRef = useRef<number | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAyah, setCurrentAyah] = useState(0)
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

  const syncMeta = useCallback((index: number) => {
    const item = playlistRef.current[index]
    if (!item) return
    setCurrentAyah(item.ayah)
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
    playlistRef.current = buildPlaylist({
      surahId,
      versesCount,
      mode,
      repeats,
      rangeFrom,
      rangeTo,
    })
    setPlaylistLength(playlistRef.current.length)
    indexRef.current = 0
    syncMeta(0)
  }, [surahId, versesCount, mode, repeats, rangeFrom, rangeTo, syncMeta])

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
    playlistRef.current = buildPlaylist({
      surahId,
      versesCount,
      mode,
      repeats,
      rangeFrom,
      rangeTo,
    })
    setPlaylistLength(playlistRef.current.length)
    void goTo(0, true)
  }, [goTo, mode, rangeFrom, rangeTo, repeats, surahId, versesCount])

  const pause = useCallback(() => {
    clearGap()
    playingRef.current = false
    setIsPlaying(false)
    audioRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    if (!audioRef.current?.src) {
      void goTo(indexRef.current, true)
      return
    }
    playingRef.current = true
    setIsPlaying(true)
    void audioRef.current.play().catch(() => {
      onToast?.('Could not resume playback')
      setIsPlaying(false)
      playingRef.current = false
    })
  }, [goTo, onToast])

  const toggle = useCallback(() => {
    if (isPlaying) pause()
    else if (audioRef.current?.src && !audioRef.current.ended) resume()
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
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
        return
      }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'MediaTrackNext') {
        e.preventDefault()
        next()
        return
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'MediaTrackPrevious') {
        e.preventDefault()
        prev()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    const ms = navigator.mediaSession
    if (ms) {
      try {
        ms.setActionHandler('play', () => {
          if (!playingRef.current) resume()
        })
        ms.setActionHandler('pause', () => {
          if (playingRef.current) pause()
        })
        ms.setActionHandler('previoustrack', () => prev())
        ms.setActionHandler('nexttrack', () => next())
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
  }, [next, pause, prev, resume, toggle])

  useEffect(() => {
    if (!navigator.mediaSession) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  return {
    isPlaying,
    currentAyah,
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

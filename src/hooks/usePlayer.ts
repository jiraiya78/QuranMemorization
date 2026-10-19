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
  reciterId: string
  onToast?: (message: string) => void
}

export function usePlayer({
  surahId,
  versesCount,
  mode,
  repeats,
  reciterId,
  onToast,
}: UsePlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlsRef = useRef<string[]>([])
  const indexRef = useRef(0)
  const playlistRef = useRef(buildPlaylist(surahId, versesCount, mode, repeats))
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

  const playAt = useCallback(
    async (index: number) => {
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
        await audio.play()
        playingRef.current = true
        setIsPlaying(true)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Playback failed'
        onToast?.(msg)
        // skip to next
        gapTimerRef.current = window.setTimeout(() => {
          void playAt(index + 1)
        }, GAP_MS)
      }
    },
    [onToast, reciterId, syncMeta],
  )

  useEffect(() => {
    playlistRef.current = buildPlaylist(surahId, versesCount, mode, repeats)
    setPlaylistLength(playlistRef.current.length)
    indexRef.current = 0
    syncMeta(0)
  }, [surahId, versesCount, mode, repeats, syncMeta])

  useEffect(() => {
    const audio = audioRef.current ?? new Audio()
    audioRef.current = audio

    const onEnded = () => {
      if (!playingRef.current) return
      gapTimerRef.current = window.setTimeout(() => {
        void playAt(indexRef.current + 1)
      }, GAP_MS)
    }

    const onError = () => {
      onToast?.('Could not play this ayah — skipping')
      gapTimerRef.current = window.setTimeout(() => {
        void playAt(indexRef.current + 1)
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
  }, [onToast, playAt])

  const play = useCallback(() => {
    playlistRef.current = buildPlaylist(surahId, versesCount, mode, repeats)
    setPlaylistLength(playlistRef.current.length)
    void playAt(0)
  }, [mode, playAt, repeats, surahId, versesCount])

  const pause = useCallback(() => {
    clearGap()
    playingRef.current = false
    setIsPlaying(false)
    audioRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    if (!audioRef.current?.src) {
      void playAt(indexRef.current)
      return
    }
    playingRef.current = true
    setIsPlaying(true)
    void audioRef.current.play().catch(() => {
      onToast?.('Could not resume playback')
      setIsPlaying(false)
      playingRef.current = false
    })
  }, [onToast, playAt])

  const toggle = useCallback(() => {
    if (isPlaying) pause()
    else if (audioRef.current?.src && !audioRef.current.ended) resume()
    else play()
  }, [isPlaying, pause, play, resume])

  const next = useCallback(() => {
    void playAt(indexRef.current + 1)
  }, [playAt])

  const prev = useCallback(() => {
    const list = playlistRef.current
    const cur = list[indexRef.current]
    if (!cur) return
    // jump to previous distinct ayah start if possible
    let i = indexRef.current - 1
    while (i >= 0 && list[i].ayah === cur.ayah && list[i].repeatIndex === cur.repeatIndex) {
      i--
    }
    // go to start of previous ayah block
    if (i >= 0) {
      const targetAyah = list[i].ayah
      while (i > 0 && list[i - 1].ayah === targetAyah) i--
      void playAt(i)
    } else {
      void playAt(0)
    }
  }, [playAt])

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

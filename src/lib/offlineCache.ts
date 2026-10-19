import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { BISMILLAH_AUDIO_AYAH, BISMILLAH_AUDIO_SURAH } from '../data/bismillah'
import { getReciter, resolveAudioRef, streamAyahUrl } from '../data/reciters'

const DB_NAME = 'recitehelper-audio'
const STORE = 'ayahs'

interface AudioDB extends DBSchema {
  ayahs: {
    key: string
    value: {
      key: string
      blob: Blob
      reciterId: string
      surahId: number
      ayah: number
    }
  }
}

function cacheKey(reciterId: string, surahId: number, ayah: number): string {
  return `${reciterId}/${surahId}/${ayah}`
}

let dbPromise: Promise<IDBPDatabase<AudioDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AudioDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

async function ensureCached(
  db: IDBPDatabase<AudioDB>,
  reciterId: string,
  surahId: number,
  ayah: number,
  signal?: AbortSignal,
) {
  const key = cacheKey(reciterId, surahId, ayah)
  const existing = await db.get(STORE, key)
  if (existing) return
  const reciter = getReciter(reciterId)
  const url = streamAyahUrl(reciter, surahId, ayah)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Failed to download ${surahId}:${ayah} (${res.status})`)
  const blob = await res.blob()
  await db.put(STORE, { key, blob, reciterId, surahId, ayah })
}

export async function isSurahCached(reciterId: string, surahId: number, versesCount: number) {
  const db = await getDb()
  const basmala = await db.get(
    STORE,
    cacheKey(reciterId, BISMILLAH_AUDIO_SURAH, BISMILLAH_AUDIO_AYAH),
  )
  if (!basmala) return false
  for (let ayah = 1; ayah <= versesCount; ayah++) {
    const hit = await db.get(STORE, cacheKey(reciterId, surahId, ayah))
    if (!hit) return false
  }
  return true
}

export async function getPlayableUrl(
  reciterId: string,
  surahId: number,
  ayah: number,
): Promise<string> {
  const ref = resolveAudioRef(surahId, ayah)
  const db = await getDb()
  const hit = await db.get(STORE, cacheKey(reciterId, ref.surahId, ref.ayah))
  if (hit?.blob) {
    return URL.createObjectURL(hit.blob)
  }
  const reciter = getReciter(reciterId)
  return streamAyahUrl(reciter, ref.surahId, ref.ayah)
}

export async function downloadSurah(
  reciterId: string,
  surahId: number,
  versesCount: number,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const db = await getDb()
  const total = versesCount + 1

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  await ensureCached(db, reciterId, BISMILLAH_AUDIO_SURAH, BISMILLAH_AUDIO_AYAH, signal)
  onProgress?.(1, total)

  for (let ayah = 1; ayah <= versesCount; ayah++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    await ensureCached(db, reciterId, surahId, ayah, signal)
    onProgress?.(ayah + 1, total)
  }
}

export async function removeSurah(reciterId: string, surahId: number, versesCount: number) {
  const db = await getDb()
  for (let ayah = 1; ayah <= versesCount; ayah++) {
    await db.delete(STORE, cacheKey(reciterId, surahId, ayah))
  }
  // Keep shared Basmala audio — other surahs may still use it.
}

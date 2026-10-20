function buildPlaylist({ surahId, versesCount, mode, repeats, rangeFrom = 1, rangeTo = versesCount }) {
  const n = Math.max(1, Math.min(99, repeats))
  const items = []
  const basmala = (repeatIndex) => ({
    surahId,
    ayah: 0,
    repeatIndex,
    totalRepeats: n,
  })

  if (mode === 'ayah') {
    items.push(basmala(1))
    for (let ayah = 1; ayah <= versesCount; ayah++) {
      for (let r = 1; r <= n; r++) {
        items.push({ surahId, ayah, repeatIndex: r, totalRepeats: n })
      }
    }
  } else if (mode === 'range') {
    let from = Math.min(Math.max(1, rangeFrom), versesCount)
    let to = Math.min(Math.max(1, rangeTo), versesCount)
    if (from > to) [from, to] = [to, from]
    items.push(basmala(1))
    for (let r = 1; r <= n; r++) {
      for (let ayah = from; ayah <= to; ayah++) {
        items.push({ surahId, ayah, repeatIndex: r, totalRepeats: n })
      }
    }
  } else {
    for (let r = 1; r <= n; r++) {
      items.push(basmala(r))
      for (let ayah = 1; ayah <= versesCount; ayah++) {
        items.push({ surahId, ayah, repeatIndex: r, totalRepeats: n })
      }
    }
  }
  return items
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const ayahMode = buildPlaylist({ surahId: 114, versesCount: 3, mode: 'ayah', repeats: 2 })
assert(ayahMode[0].ayah === 0, 'ayah mode starts with bismillah')
assert(ayahMode.length === 7, 'ayah mode length')
assert(
  ayahMode.map((i) => `${i.ayah}:${i.repeatIndex}`).join(',') ===
    '0:1,1:1,1:2,2:1,2:2,3:1,3:2',
  'ayah mode order',
)

const surahMode = buildPlaylist({ surahId: 114, versesCount: 3, mode: 'surah', repeats: 2 })
assert(surahMode[0].ayah === 0, 'surah mode starts with bismillah')
assert(surahMode.length === 8, 'surah mode length')
assert(
  surahMode.map((i) => `${i.ayah}:${i.repeatIndex}`).join(',') ===
    '0:1,1:1,2:1,3:1,0:2,1:2,2:2,3:2',
  'surah mode order',
)

const rangeMode = buildPlaylist({
  surahId: 114,
  versesCount: 6,
  mode: 'range',
  repeats: 2,
  rangeFrom: 2,
  rangeTo: 4,
})
assert(rangeMode[0].ayah === 0, 'range starts with bismillah')
assert(
  rangeMode.map((i) => `${i.ayah}:${i.repeatIndex}`).join(',') ===
    '0:1,2:1,3:1,4:1,2:2,3:2,4:2',
  'range mode order',
)

console.log('playlist tests passed')

import https from 'https'
import fs from 'fs'
import path from 'path'

/** Fetch URL as a complete Buffer first — never decode partial UTF-8 chunks. */
function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          res.resume()
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            const buf = Buffer.concat(chunks)
            resolve(JSON.parse(buf.toString('utf8')))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

function assertNoReplacement(text, label) {
  if (text.includes('\uFFFD')) {
    throw new Error(`Replacement char U+FFFD found in ${label}`)
  }
}

const EDITIONS = {
  en: {
    id: 'en',
    label: 'The Clear Quran (Dr. Mustafa Khattab)',
    path: 'eng-mustafakhattaba',
  },
  ms: {
    id: 'ms',
    label: 'Bahasa Melayu (Sheikh Abdullah bin Muhammad Basmeih)',
    path: 'msa-abdullahmuhamma',
  },
}

const surahMeta = await get('https://api.quran.com/api/v4/chapters?language=en')
const surahs = surahMeta.chapters.map((c) => ({
  id: c.id,
  nameArabic: c.name_arabic,
  nameSimple: c.name_simple,
  versesCount: c.verses_count,
  translatedName: c.translated_name.name,
}))

const juzMeta = await get('https://api.quran.com/api/v4/juzs')
/** @type {Record<string, number[]>} */
const juzSurahIds = {}
for (const juz of juzMeta.juzs) {
  const ids = Object.keys(juz.verse_mapping || {})
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
  juzSurahIds[String(juz.juz_number)] = ids
}

const ayahs = {}
for (const s of surahs) {
  const ar = await get(
    `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${s.id}`,
  )
  const en = await get(
    `https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/${EDITIONS.en.path}/${s.id}.json`,
  )
  const ms = await get(
    `https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/${EDITIONS.ms.path}/${s.id}.json`,
  )
  ayahs[s.id] = ar.verses.map((v, i) => {
    const arabic = v.text_uthmani
    const enText = (en.chapter[i] && en.chapter[i].text) || ''
    const msText = (ms.chapter[i] && ms.chapter[i].text) || ''
    assertNoReplacement(arabic, `surah ${s.id} ayah ${i + 1}`)
    return {
      number: i + 1,
      arabic,
      en: enText,
      ms: msText,
    }
  })
  console.log('surah', s.id, ayahs[s.id].length)
}

const outDir = path.resolve('src/data')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'quran.json')
const payload = {
  surahs,
  ayahs,
  juzSurahIds,
  translations: {
    en: { id: 'en', label: EDITIONS.en.label },
    ms: { id: 'ms', label: EDITIONS.ms.label },
  },
}
fs.writeFileSync(outPath, JSON.stringify(payload))
console.log('wrote', outPath, fs.statSync(outPath).size)

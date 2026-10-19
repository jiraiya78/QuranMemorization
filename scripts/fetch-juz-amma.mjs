import https from 'https'
import fs from 'fs'
import path from 'path'

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

const surahMeta = await get('https://api.quran.com/api/v4/chapters?language=en')
const surahs = surahMeta.chapters
  .filter((c) => c.id >= 78 && c.id <= 114)
  .map((c) => ({
    id: c.id,
    nameArabic: c.name_arabic,
    nameSimple: c.name_simple,
    versesCount: c.verses_count,
    translatedName: c.translated_name.name,
  }))

const ayahs = {}
for (const s of surahs) {
  const ar = await get(
    `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${s.id}`,
  )
  const en = await get(
    `https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/eng-mustafakhattaba/${s.id}.json`,
  )
  ayahs[s.id] = ar.verses.map((v, i) => ({
    number: i + 1,
    arabic: v.text_uthmani,
    translation: (en.chapter[i] && en.chapter[i].text) || '',
  }))
  console.log('surah', s.id, ayahs[s.id].length)
}

const outDir = path.resolve('src/data')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'juzAmma.json')
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      surahs,
      ayahs,
      translation: 'The Clear Quran (Dr. Mustafa Khattab)',
    },
    null,
    2,
  ),
)
console.log('wrote', outPath, fs.statSync(outPath).size)

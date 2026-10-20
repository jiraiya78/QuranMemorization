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
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * @param {number} page
 */
async function fetchPage(page) {
  const url =
    `https://api.quran.com/api/v4/verses/by_page/${page}` +
    `?words=true&word_fields=text_uthmani,line_number&per_page=50`
  const data = await get(url)
  /** @type {Map<number, Array<{s:number,a:number,t:string,e?:boolean}>>} */
  const byLine = new Map()

  for (const verse of data.verses || []) {
    const [sStr, aStr] = String(verse.verse_key).split(':')
    const s = Number(sStr)
    const a = Number(aStr)
    /** @type {Map<number, {words: string[], ended: boolean}>} */
    const lineBuckets = new Map()

    for (const w of verse.words || []) {
      const line = Number(w.line_number)
      if (!Number.isFinite(line)) continue
      if (!lineBuckets.has(line)) lineBuckets.set(line, { words: [], ended: false })
      const bucket = lineBuckets.get(line)
      if (w.char_type_name === 'end') {
        bucket.ended = true
      } else {
        const text = w.text_uthmani || w.text || ''
        if (text) bucket.words.push(text)
      }
    }

    for (const [line, bucket] of lineBuckets) {
      if (!byLine.has(line)) byLine.set(line, [])
      const seg = {
        s,
        a,
        t: bucket.words.join(' '),
      }
      if (bucket.ended) seg.e = true
      if (seg.t || seg.e) byLine.get(line).push(seg)
    }
  }

  const lines = [...byLine.keys()]
    .sort((a, b) => a - b)
    .map((n) => ({
      n,
      segs: byLine.get(n),
    }))

  return { p: page, lines }
}

const PAGE_COUNT = 604
const outDir = path.resolve('src/data')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'mushaf-pages.json')

/** Resume support */
let pages = []
let ayahPage = {}
let startPage = 1
if (fs.existsSync(outPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'))
    if (Array.isArray(existing.pages) && existing.pages.length) {
      pages = existing.pages
      ayahPage = existing.ayahPage || {}
      startPage = pages.length + 1
      console.log(`Resuming from page ${startPage}`)
    }
  } catch {
    /* start fresh */
  }
}

for (let page = startPage; page <= PAGE_COUNT; page++) {
  let attempt = 0
  for (;;) {
    try {
      const built = await fetchPage(page)
      pages.push(built)
      for (const line of built.lines) {
        for (const seg of line.segs) {
          const key = `${seg.s}:${seg.a}`
          if (ayahPage[key] == null) ayahPage[key] = page
        }
      }
      if (page % 20 === 0 || page === PAGE_COUNT) {
        fs.writeFileSync(
          outPath,
          JSON.stringify({ pageCount: PAGE_COUNT, pages, ayahPage }),
        )
        console.log(`page ${page}/${PAGE_COUNT}`)
      }
      break
    } catch (err) {
      attempt += 1
      if (attempt >= 5) throw err
      console.warn(`retry page ${page} (${attempt}):`, err.message)
      await sleep(500 * attempt)
    }
  }
  await sleep(40)
}

fs.writeFileSync(outPath, JSON.stringify({ pageCount: PAGE_COUNT, pages, ayahPage }))
console.log('Wrote', outPath, 'pages', pages.length, 'ayahs', Object.keys(ayahPage).length)

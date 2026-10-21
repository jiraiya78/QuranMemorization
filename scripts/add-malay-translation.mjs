/**
 * Upgrade existing quran.json: rename `translation` → `en`, fetch Basmeih Malay → `ms`.
 * Prefer this over a full re-fetch when Uthmani Arabic is already good.
 */
import https from 'https'
import fs from 'fs'
import path from 'path'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'ReciteHelper/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects >= 5) {
            reject(new Error(`Too many redirects for ${url}`))
            res.resume()
            return
          }
          resolve(get(res.headers.location, redirects + 1))
          res.resume()
          return
        }
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

async function getWithRetry(url, attempts = 5) {
  let last
  for (let i = 0; i < attempts; i++) {
    try {
      return await get(url)
    } catch (e) {
      last = e
      await sleep(400 * (i + 1))
    }
  }
  throw last
}

const outPath = path.resolve('src/data/quran.json')
const data = JSON.parse(fs.readFileSync(outPath, 'utf8'))

const LABEL_EN = 'The Clear Quran (Dr. Mustafa Khattab)'
const LABEL_MS = 'Bahasa Melayu (Sheikh Abdullah bin Muhammad Basmeih)'
const MS_BASE =
  'https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/msa-abdullahmuhamma'

for (const s of data.surahs) {
  const key = String(s.id)
  const list = data.ayahs[key] ?? data.ayahs[s.id]
  if (!list) throw new Error(`Missing ayahs for surah ${s.id}`)

  const ms = await getWithRetry(`${MS_BASE}/${s.id}.json`)
  await sleep(80)

  data.ayahs[key] = list.map((a, i) => {
    const en = a.en ?? a.translation ?? ''
    const msText = (ms.chapter[i] && ms.chapter[i].text) || a.ms || ''
    return {
      number: a.number,
      arabic: a.arabic,
      en,
      ms: msText,
    }
  })
  console.log('surah', s.id, data.ayahs[key].length)
}

data.translations = {
  en: { id: 'en', label: LABEL_EN },
  ms: { id: 'ms', label: LABEL_MS },
}
delete data.translation

fs.writeFileSync(outPath, JSON.stringify(data))
console.log('wrote', outPath, fs.statSync(outPath).size)

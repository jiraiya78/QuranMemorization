# ReciteHelper

Landscape-first web app to help memorize **Juz Amma** (surahs 78–114).

## Features

- Pick a surah, reciter, and repeat mode (**Surah ×N** or **Ayah ×N**)
- Play with ayah highlight + English under each ayah (**The Clear Quran** by Dr. Mustafa Khattab), right-aligned
- Stream audio online; download a surah for offline playback
- Three themes and four Arabic fonts (default: IBM Plex Sans Arabic)
- Preferences saved in `localStorage` (no accounts)

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
npm test
```

Design spec: `docs/superpowers/specs/2026-10-19-recitehelper-juz-amma-design.md`

## Data

- Arabic: Quran.com Uthmani text  
- English: The Clear Quran (Mustafa Khattab) via open Quran API editions  
- Audio: [EveryAyah](https://everyayah.com) CDN  

Refresh bundled JSON:

```bash
npm run fetch-data
```

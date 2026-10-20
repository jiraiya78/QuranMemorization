# ReciteHelper

Landscape-first web app to help memorize the **full Quran** (30 juz / 114 surahs).

## Features

- All surahs, with optional **Juz** filter
- Repeat modes: Surah ×N, Ayah ×N, or range **A → B**
- Play with ayah highlight + English (**The Clear Quran**)
- Mushaf page or ayah-list layout
- Stream audio online; download a surah for offline playback
- Themes, Arabic fonts, text size, floating translation
- Keyboard / Media Session controls, fullscreen, PWA install

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

Refresh bundled Quran JSON (Arabic + Clear Quran):

```bash
npm run fetch-data
```

## Data

- Arabic: Quran.com Uthmani text  
- English: The Clear Quran (Mustafa Khattab)  
- Audio: [EveryAyah](https://everyayah.com) CDN  

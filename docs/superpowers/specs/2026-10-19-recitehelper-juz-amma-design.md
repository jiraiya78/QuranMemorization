# ReciteHelper — Juz Amma Memorization App

**Date:** 2026-10-19  
**Status:** Approved for implementation  
**Stack:** Vite + React + TypeScript (static SPA)

## Goal

Help the user memorize Juz Amma (surahs 78–114) with selectable repetition modes, ayah-synced recitation, English translation under each ayah, and optional offline download per reciter.

## Scope (v1)

In scope:

- Juz Amma only (surahs 78–114)
- Select surah, repetition count, repeat mode
- Play with ayah-level highlight
- English under each ayah (The Clear Quran), right-aligned
- Reciter selection + download surah audio for offline
- Three switchable themes; four switchable Arabic fonts
- No accounts; prefs and downloads in browser storage only
- Landscape-first UI for tablet/phone

Out of scope:

- Word-level highlight
- User accounts / cloud sync
- Full Quran beyond Juz Amma
- Recording / self-evaluation

## Architecture

Static SPA. No backend.

| Concern | Approach |
|--------|----------|
| Arabic + English text | Bundled JSON for Juz Amma |
| Audio | Stream from public ayah CDN; cache downloads locally |
| Highlight | Advance on ayah audio end / next start |
| Prefs | `localStorage` |
| Offline audio | Cache API / IndexedDB keyed by `reciter/surah/ayah` |

### Playback engine

1. Build playlist of ayah audio URLs for selected surah + reciter.
2. **Surah ×N:** play 1→end, repeat whole playlist N times.
3. **Ayah ×N:** for each ayah, play N times, then next.
4. On ayah change: scroll into view, highlight, show English under ayah.
5. ~300ms gap between ayahs.
6. If ayah cached, play from cache; else stream.

### Download

- Fetch all ayah files for current surah + reciter into cache.
- UI: Download → Downloading… → Offline ready · Remove.
- Interrupted download: clear partial, allow retry.

## UI

**Layout B — Split panel (landscape)**

- **Left:** brand, theme swatches, font picker, surah, mode, repeats, reciter, download, play
- **Right:** scrolling ayah list; active ayah highlighted; English right-aligned under Arabic
- **Bottom of reader:** prev / play-pause / next, repeat counter, ayah counter

### Themes (all switchable, persisted)

1. Emerald mihrab — deep forest + antique gold  
2. Night indigo — indigo night + soft gold  
3. Day mushaf — parchment reader + green sidebar  

### Fonts (all switchable, persisted)

Default: **IBM Plex Sans Arabic**  
Also: Amiri, Noto Naskh Arabic, Scheherazade New  

UI chrome: clean Latin sans (e.g. DM Sans / system).

## Reciters (v1)

- Mishary Al-Afasy  
- Mahmoud Khalil Al-Husary  
- Abdul Basit (Murattal)  
- Mohamed Siddiq El-Minshawi  

## Components

- `App` — shell, CSS variables for theme/font  
- `SetupPanel` — controls  
- `AyahReader` — text + highlight  
- `PlayerDock` — transport + counters  
- `PlaylistEngine` — repeat logic  
- `OfflineCache` — download / resolve URLs  
- `data/` — surahs, ayahs, translations, reciter catalog  

## Errors

- Stream failure → message + retry  
- Offline without cache → prompt to connect or download  
- Missing ayah audio → skip + toast, continue  

## Testing

- Unit: playlist order for both repeat modes  
- Manual: landscape, theme/font switch, download then offline play  

## Success criteria

- User can pick a Juz Amma surah, mode, repeats, and reciter, then play with synced highlight and Clear Quran English.  
- User can switch theme and Arabic font.  
- User can download a surah for offline playback.  
- Works well in landscape on tablet/phone with large Arabic type.

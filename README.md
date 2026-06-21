# RaiderRating

A Chrome extension that overlays Rate My Professors ratings **and** TTU grade distributions onto the Texas Tech Visual Schedule Builder.

No more switching tabs during registration — see professor ratings, difficulty scores, "would take again" percentages, and the actual A/B/C/D/F/W breakdown for each course right next to the professor's name.

## Install

[**Get RaiderRating on the Chrome Web Store**](https://chromewebstore.google.com/detail/raiderrating/mfkadoinfgjghmfooigphelfpdicdfek)

## How It Works

1. Install the extension from the Chrome Web Store
2. Go to [schedulebuilder.ttu.edu](https://schedulebuilder.ttu.edu) and search any course
3. Rating badges appear automatically next to each professor's name
4. Click a badge to open the details popup

### Rating badge

| Rating | Color |
|--------|-------|
| 4.0+ | Green |
| 3.0–3.9 | Yellow |
| Below 3.0 | Red |
| No ratings | Gray |
| Not on RMP | Gray (clickable when grade data exists) |

### Grade distribution

When grade data is available for that **specific professor + course combination**, the popup includes a **📊 View Grade Distribution** button. Clicking it shows:

- A combined A/B/C/D/F/W breakdown across all available semesters
- A per-semester breakdown for the four most recent terms

If grade data isn't available for that combination, the button simply isn't shown — the popup looks exactly like the original ratings-only version.

> **Note:** Grade distribution data currently covers most undergraduate courses. Graduate-level courses will be added in a future update.

## Project Structure

```
RaiderRating/
├── api/          # Express + TypeScript backend (RMP lookup + grade data)
├── extension/    # Plasmo + React Chrome extension
└── docs/         # Privacy policy (GitHub Pages)
```

### Backend (`api/`)

- **Stack:** Node.js, Express, TypeScript, Zod
- `GET /api/professors/lookup` & `POST /api/professors/batch` — Rate My Professors data (via their GraphQL API)
- `GET /api/grades/lookup` & `POST /api/grades/batch` — TTU grade distributions (loaded from a pre-built JSON file at startup)
- In-memory rating cache (24h TTL for found, 6h for not-found)
- Rate limiting, input validation, CORS
- Deployed on Railway

### Extension (`extension/`)

- **Stack:** Plasmo, React, TypeScript
- Content script detects professor names on the Schedule Builder via a MutationObserver
- Walks the DOM upward from each name to extract the surrounding course code
- Sends parallel batch lookups for ratings + grades
- Injects color-coded rating badges inline
- Click a badge → popup with rating details, RMP link, and (when available) grade distribution
- Toggle the whole thing on/off from the extension popup

## Privacy

RaiderRating does not collect any personal data. It only reads professor names already displayed on the schedule builder page, then fetches publicly available ratings and aggregate grade distributions. See our [Privacy Policy](https://lavneethora.github.io/RaiderRating/privacy-policy.html).

## License

Copyright Lavneet Hora 2026 <br>
All rights reserved. <br>
This software is not licensed for distribution, modification, or commercial use without explicit written permission from the author.

# RaiderRating

A Chrome extension that displays Rate My Professors ratings directly inside the Texas Tech University Visual Schedule Builder.

No more switching tabs during registration — see professor ratings, difficulty scores, and "would take again" percentages right next to their names.

## Install

[**Get RaiderRating on the Chrome Web Store**](https://chromewebstore.google.com/detail/raiderrating/mfkadoinfgjghmfooigphelfpdicdfek)

## How It Works

1. Install the extension from the Chrome Web Store
2. Navigate to [schedulebuilder.ttu.edu](https://schedulebuilder.ttu.edu) and refresh the page
3. Ratings appear automatically next to every professor's name

Click any rating badge to see full details and a direct link to their Rate My Professors page.

### Rating Colors

| Rating | Color |
|--------|-------|
| 4.0+   | Green |
| 3.0–3.9 | Yellow |
| Below 3.0 | Red |

## Project Structure

```
RaiderRating/
├── api/          # Express + TypeScript backend
├── extension/    # Plasmo + React Chrome extension
└── docs/         # Privacy policy (GitHub Pages)
```

### Backend (`api/`)

- **Stack:** Node.js, Express, TypeScript
- Queries the Rate My Professors GraphQL API
- In-memory caching with TTL (24h for found, 6h for not-found)
- Rate limiting, input validation, and batch lookups
- Deployed on Railway

### Extension (`extension/`)

- **Stack:** Plasmo, React, TypeScript
- Content script detects professor names on the Schedule Builder
- Sends batch lookups to the backend API
- Injects color-coded rating badges inline
- Toggle on/off from the popup

## Privacy

RaiderRating does not collect any personal data. It only reads professor names already displayed on the schedule builder page and fetches publicly available ratings. See our [Privacy Policy](https://lavneethora.github.io/RaiderRating/privacy-policy.html).

## License

MIT

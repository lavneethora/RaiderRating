# Changelog

All notable changes to RaiderRating.

## v1.4 — 2026-06-21

- **New:** Live server status indicator in the extension popup. See at a glance whether the RaiderRating service is online (green) or offline (red).

## v1.3 — 2026-06-21

- **New:** "Problem/Suggestions: Contact Us" link in the extension popup for user feedback.

## v1.2 — 2026-06-21

- **New:** Grade distribution viewer. Click the orange "📊 View Grade Distribution" button on a rating popup to see the A/B/C/D/F/W breakdown for that specific professor + course combination, across the most recent semesters.
- **New:** "Not on RMP" badges are now clickable when grade data exists for that professor + course — opens the grade modal directly.
- Popup version now reads from the manifest so it never falls out of sync.
- Backend: added `/api/grades/lookup` and `/api/grades/batch` endpoints. Existing RMP endpoints unchanged.

## v1.1 — 2026-05

- **Fix:** Name matching no longer returns the wrong professor when multiple instructors share the same last name or first name.
- "Not on RMP" badge styling now matches the other rating badges (size, padding, shape).

## v1.0 — 2026-05

- Initial release.
- Rate My Professors ratings injected inline on TTU Schedule Builder.
- Color-coded rating badges (green/yellow/red) with difficulty and "would take again" percentage.
- Click any badge to see full details and a direct link to the RMP page.
- Toggle on/off from the extension popup.

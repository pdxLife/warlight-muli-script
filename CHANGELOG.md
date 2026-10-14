# Changelog

## 3.12.0

- **Mail search**: a **Filter by player** box on your mail page shows only threads started or last answered by that player. If your mail spans several pages, the first search loads the rest, so it covers all of it.

## 3.11.0

- Games where it's your turn are sorted by how much time you have left before you're booted, most urgent first. Other games keep war.app's order. It can be turned off under Features → Dashboard.

## 3.10.0

- **Open Games filter** is back: a **Filter** link in the Open Games header hides Auto Games, coin games, games with a short boot time, and games whose name contains words you choose. It shows how many games are hidden and works on the dashboard and the View All page.
- Open Games you've joined (or been invited to) are highlighted with a **Joined** badge, on the dashboard and the View All page.

## 3.9.0

- Tab title on the dashboard shows how many games are waiting for your turn.
- While the dashboard tab is open in the background, My Games is re-checked every 5 minutes.
- New opt-in setting for a desktop notification when a game becomes your turn.

## 3.8.0

- New **Features** section in the settings menu: turn any individual feature off.
- Refreshing games fetches the dashboard once instead of once per table, and keeps the My Games and open-games counts up to date.
- A failed refresh no longer leaves the games table dimmed.
- The open games list scrolls back to the top when switching between Multi-Day, Real-Time and Both, as originally intended.
- Removed the dead open-games counter code; war.app now shows these counts itself.
- Renamed MDL to MTL (Multi-Template Ladder) throughout, following the ladder's rename, and switched its links and API calls to the canonical `www.warlight-mtl.com` address.

## 3.7.0

- Community level previews in forum posts are read from war.app's own level pages instead of maak.ch.
- MDL ladder stats and tables and the community level record count are now opt-in (new setting, off by default), so by default the script never contacts maak.ch.
- Each startup feature runs in isolation, so one broken feature no longer stops the rest of the script.
- Fixed a crash that stopped the script on level play-log pages.
- Fixed the community events count for more than 20 events, and parsing of the events feed's current format.
- Database calls return promises and log their errors; settings are cached after startup.
- An unreadable player data cookie is discarded instead of breaking player features.
- Icons are inlined into the script instead of hot-linked from imgur; the install icon is served from this repo.
- Removed the stale `.backup` copy of the script and the completed `plan.md`.

## 3.6.0

- Escape third-party data (MDL ladder, community levels, CLOT events, tournament inviter names, bookmarks) before rendering it; external URLs are restricted to `http(s)` and same-site paths.
- Bookmarks no longer accept `javascript:` URLs.
- Removed `validateUser()`, which sent the player name and id to maak.ch.
- Dropped moment.js; every `@require` is pinned with a sha256 hash.

## 3.5.0

- Updates now come from this repo instead of the upstream Greasy Fork script.
- Settings import validates the backup before clearing anything, and keeps tournament inviter data.
- Player data loads asynchronously instead of blocking the page.
- Fixed the post-setup reload delay, the IndexedDB support check, and a leaked `db` global.
- Blacklist counter uses a `MutationObserver` instead of polling every 500 ms.
- Added unit tests (`npm test`).

## 3.4.4

- Baseline fork of Muli's "Tidy up your Dashboard".

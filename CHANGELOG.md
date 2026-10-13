# Changelog

## Unreleased

- Renamed MDL to MTL throughout, following the ladder's rename.

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

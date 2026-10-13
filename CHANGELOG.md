# Changelog

## Unreleased

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

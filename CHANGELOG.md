# Changelog

## 3.14.0

- **Tournament player search and sort work again.** The toolbar was placed below the visible part of the Players tab; it now sits at the top right, above the list. Search results move to the top of the list instead of staying scattered where they were, and sorting uses war.app's row spacing (it used a fixed 34px and stacked rows on top of each other).
- **Removed Find Me** on tournament pages: it highlighted names on tabs you couldn't see. war.app's own **Find...** and **>** buttons on the Bracket tab do this now.
- **Block list search**: a search box on the Manage Block List page filters players by name, ignoring case and accents ("sana" finds "Šaňa"), and shows how many match. The player count above it keeps showing your whole list.

## 3.13.3

- The link to Muli's profile in the settings menu uses the profile ID alone, so it keeps working if the name changes.
- Works if war.app changes its domain again. Page detection no longer checks the domain, links are relative, page titles are trimmed using the site's own name, and bookmarks saved on war.app, warzone.com or warlight.net open on the domain you're using. The script now runs on all subdomains of war.app and warzone.com. Settings and bookmarks stay with each domain; move them with Export / Import.

## 3.13.2

- After the dashboard refreshes (R, the Refresh button, coming back to the tab, or the background turn check), the "+ Show N more open games" link and the "Past games / Create Game" links under My Games are back. Show more and the Multi-Day / Real-Time / Both buttons now also use the refreshed open games instead of the list from when the page first loaded.

## 3.13.1

- Credit the original author, Muli, in the script header, the README and the settings menu, with links to Muli's profile and the original forum thread.
- **Security:** making profile stat sections collapsible re-inserted the profile's text as HTML, so a player could put markup in their bio that ran on your page when you viewed their profile. The text now stays text.
- Saving a new right-column order reloads the dashboard, so the new order (and un-hidden tables) show right away.
- Refreshing the dashboard no longer nests a new table body inside the old one each time, and no longer fetches Past Games until you open that tab.
- Removed leftover code from the original script's old popup system, unused helpers, and selectors that no longer match anything on war.app.

## 3.13.0

Checked every feature against the current war.app and fixed what its redesign broke.

- **Fixed:** Bookmark and Find Me links, player search and sort, and "Invited by" on tournament pages. war.app now draws these pages client-side, so the script waits for them, and the links sit next to "Created by".
- **Fixed:** sorting tournament players by name compared their levels instead of their names, and Find Me missed names containing something like "L2".
- **Fixed:** "Invited by" never appeared, because it read the database before it was open.
- **Fixed:** the block list counter (war.app moved the page to /ManageBlockList).
- **Fixed:** total points earned (the level tooltip it read is now empty; it now uses the numbers on the Points page).
- **Fixed:** pressing R to refresh the dashboard no longer fires while you type in a text box, such as the Open Games filter keywords.
- **Fixed:** "Hide everything coin-related" now also hides the open tournaments table, and "Reset hidden threads" shows the threads again on forum pages.
- **Removed**, because the page or data they used is gone or war.app now does it itself: Rate Map link, Global win rate, Community events list on Ladders (war.app has a Community Events page), fixed-height tournament list, creator highlighting in tournament chat, clan creator banner and Load Creators (clan pages no longer show the creator), profile box styling, and the new-thread cleanup.

## 3.12.1

- Removed **Remember My Games filter**. war.app replaced the dropdown it worked with by its own Filter button, which already remembers your choice.
- Boot-time sorting now also applies after you pick a filter with war.app's Filter button.

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

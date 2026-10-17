# Changelog

## 3.20.0

- **New version notice.** Once a day the script checks GitHub for a newer version. When one is out, the version label in the bottom-right corner turns gold and reads "update available", and the settings menu shows "Version … is available" with an **Update** button (it opens the script, so Tampermonkey shows its update screen) and a **What's new** link to this changelog. If GitHub can't be reached it tries again an hour later. Turn it off under Features → Other.

## 3.19.0

- **Community event badges on My Games.** Games that belong to a community event get a small blue badge after their name, such as "Nations Cup 2026 · Group C" or "P/R League · Season 38 · Group A2", linking to the event on custom.wl-stats.com. They follow every refresh and war.app's own Filter. Turn them off under Features → Dashboard.
- **Community events on clan pages.** A clan page gets a "Community events" box below Clan Wars with the clan's squads in each current custom.wl-stats.com series and how they stand. Turn it off under Features → Clans.
- The panels find war.app's dialog and button art by file name on any page, so the clan page's box wears the same frame and blue buttons as the Ladders panel.

## 3.18.0

- **Community tournament stats on profiles.** Players custom.wl-stats.com knows get a "Community tournaments" box below the AWP World Tour one: games, wins and losses, tournaments, titles and finals, best placement, tournaments organized, and their record in their three most played formats. It links to their page on custom.wl-stats.com. Turn it off under Features → Profile.
- The profile boxes (Private Notes, AWP World Tour, Community tournaments) now always appear in that order, whichever site answers first.

## 3.17.0

- **Community series on the Ladders page.** Under the AWP row, the panel now has a row for each series custom.wl-stats.com is running or finished in the last 30 days: Clan Cup, Nations Cup, P/R League, Titled Tuesday and others. Each shows the current season, how far it is, its leader or winner and, when you're signed in, your line: your place, record and points, or your clan's or country's. Titled Tuesday shows when the next one starts, in your time zone, with a countdown.
- **Signups.** A series taking signups says "Signups open until …" in gold and links to signing up on custom.wl-stats.com, or says you're signed up.
- **Seasonal Ladder.** war.app's own Seasonal Ladder row gets the current season, its leader and your place along its bottom edge, instead of a second Seasonal Ladder button. Where that row is too narrow, the panel shows it as a row of its own.
- **Your standing on Community Events.** The cards on war.app's Community Events page get your line for the events you take part in: your country in Nations Cup, your clan in Clan Cup or Clan League, your AWP race rank. Turn it off under Features → Community.
- One site being down no longer hides the other's rows: AWP and custom.wl-stats.com are loaded side by side.

## 3.16.0

- **Community ladders & leagues on the Ladders page.** A panel below war.app's four ladders, drawn with war.app's own dialog, row and button art, shows the AWP World Tour race: how many players are in it, and your rank and points when you're signed in. The script loads the whole ranking and finds you in it itself, so your player ID isn't sent anywhere. Its buttons are war.app's blue instead of the ladders' green, so it's clear which part the script adds. The panel follows war.app's layout when the window is resized and scrolls on its own when the window is short. Turn it off under Features → Community. P/R League, Nations Cup, Clan League and the other series on custom.wl-stats.com will join it once that site offers the data.

## 3.15.0

- **AWP World Tour stats on profiles.** A player who has played on the AWP World Tour gets a box on their profile with their place in this year's race and in the 12-month ranking, games, wins and losses, tournaments, titles and best placement, and a link to their page on awp.wl-stats.com. This brings back the AWP integration from Muli's original script. Turn it off under Features → Profile.
- **custom.wl-stats.com link on tournaments.** Tournaments that custom.wl-stats.com has read (Titled Tuesday, War Gaming Live, and P/R League groups played as war.app tournaments) show "custom.wl-stats.com (series)" next to "Created by". Turn it off under Features → Tournaments.
- Both read plain JSON from the wl-stats sites, without your war.app login, and keep the answers for an hour. A player or tournament those sites don't know, or a site that's down, leaves the page as it was.
- The script now runs only on war.app. Every warzone.com and warlight.net address redirects to war.app before a page loads, so the warzone.com entry did nothing. Bookmarks saved with those old addresses still open on war.app.

## 3.14.5

- Private notes on profiles load more safely: the script now reads only your note from the notes page, instead of loading the whole page and running its scripts. If the notes can't be loaded, the box says so instead of showing "Loading…" forever.

## 3.14.4

- **Common Games no longer breaks war.app's own code on that page.** To set up the sortable table, the script swapped out war.app's jQuery, which stopped its cookie handling (your player data didn't load there) and Bootstrap from working. The table and Head-To-Head box work as before.
- The Head-To-Head win rate shows "–" instead of "NaN%" when none of your 1v1 games with that player has finished.

## 3.14.3

- **Removed** "Show who invited you", the "Highlight Tournament Invites" setting, and the dashboard's tournament table handling. war.app no longer shows tournaments or tournament invitations on the dashboard (they're only on the Tournaments page, without who invited you), so these had nothing left to work with. "Open Tournaments" is gone from the right-column sort menu too.

## 3.14.2

- The tournament player search box and Sort by menu can be clicked again. war.app makes the Players panel ignore the mouse, and the toolbar inherited that, so clicks went through to the list. Search also reacts to pasting now, not just typing.

## 3.14.1

- **Tournament Bookmark link and player search now appear when you open a tournament from the tournaments list.** war.app switches to the tournament without loading a new page, so the script never set them up; it only worked when the tournament's address was opened directly. Opening a second tournament the same way works too.

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

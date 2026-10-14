# Roadmap

Ordered by priority within each phase. Line numbers refer to `Tidy_up_your_Dashboard.user.js` at the time each item was written. The short version of what's open is in [What's left](#whats-left) at the end.

## Phase 1 — Real bugs

- [x] **Auto-update overwrites this fork.** `@downloadURL` / `@updateURL` (lines 17–18) point at the upstream Greasy Fork script #8936, so the next upstream release replaces this version. Point them at this repo's raw URL (or remove them) and give the script its own `@namespace` and `@name`. *(Done: URLs now point at this repo. The namespace was kept, because the name already differs from upstream and changing it would make Tampermonkey install a second copy.)*
- [x] **Import can wipe all data.** `importSettings()` (line 2102) clears every table before parsing the pasted string. A bad or truncated paste deletes all bookmarks and settings. Parse and validate first, then clear. *(Done. Import now also clears only the exported tables, so tournament inviter data survives.)*
- [x] **Reload fires immediately.** `window.setTimeout(window.location.reload(), 2000)` (line 2367) calls `reload()` right away. Use `setTimeout(() => location.reload(), 2000)`.
- [x] **IndexedDB support check never triggers.** `if (!"indexedDB" in window)` (line 521) evaluates as `(false) in window`. Also, `db = e.target.result` (line 559) assigns an undeclared global that can clash with site code.
- [x] **Blacklist counter polls forever.** It rebuilds the DOM every 500 ms (line 2996); other features use similar polling loops. Replace them with `MutationObserver`. *(Done for the blacklist. The only other loop was in `setupClanPageCreator`, removed in 3.13.0. Features for war.app's client-drawn pages now re-check from a `MutationObserver` (`whileOnTournament()`).)*
- [x] **Remove `async: false`** in `loadPlayerData()` (line 78). It blocks the main thread on first load each session.

## Phase 2 — Security and privacy

- [x] **Escape third-party data before inserting it as HTML.** MTL API player and clan names and icon URLs are concatenated into HTML (lines 439–454). Use `htmlEscape()` or build elements with `.text()` / `.attr()`. *(Done. Also covered: community level cards, the community-level record count, the CLOT event list, and the tournament inviter name, which was a live XSS from player names. Image and link URLs go through the new `safeUrl()`. The log dialog now sets its text with `.val()`.)*
- [x] **Reject `javascript:` bookmark URLs** (line 1512). Together with import, a shared settings backup could plant code that runs on click. Allow only `http(s):` and relative URLs. *(Done. Bookmarks are also sanitized when rendered, so stored or imported bad URLs render as `#`, and names are escaped.)*
- [x] **Remove `validateUser()` telemetry** (line 3643). It sends the username and player ID to maak.ch, and nothing depends on it. Remove it or make it opt-in. *(Removed, along with `setUserValid` / `setUserInvalid` / `pageIsLogin`.)*
- [ ] **Drop the maak.ch HTTP→HTTPS proxy** (line 209). *(Partly done: level previews now come from war.app, and the remaining maak.ch features (MTL, formerly MDL, and the record count) are opt-in and off by default. The MTL organizers have been asked to send `Access-Control-Allow-Origin` for war.app; awaiting their reply. If they agree, the MTL features can call warlight-mtl.com directly. The record count exists only in maak.ch's database.)* *(Originally blocked:)* warlight-mtl.com serves HTTPS but sends no CORS header, and every maak.ch endpoint (MDL proxy, community levels) answers JSONP only. Under `@grant none` the browser can't call these directly. JSONP also means maak.ch can run arbitrary script on war.app with your session. Fixing it means fetching through `GM_xmlhttpRequest` with `@connect`, which moves the script into the userscript sandbox. Track it under Phase 3.
- [x] **Update dependencies and pin them with hashes.** *(Partly done.)* moment is dropped, and every `@require` is pinned with `#sha256-` (the DataTables hashes were cross-checked with cdnjs, and jQuery with the official CDN build in the npm package). The jQuery, jQuery UI and DataTables major upgrades are deferred. war.app itself runs its own jQuery 1.x (its bundle contains 1.9.1, and the logged-in dashboard reported 1.11.3), so most DOM work never touches the `@require`d copy. The known CVEs in these versions need untrusted input passed to the vulnerable APIs, which this script doesn't do. (On Common Games the script used to hand its jQuery to the site as `window.$`; that was removed in 3.14.4.)

## Phase 3 — Maintainability

- [ ] **Split into modules.** Break the ~4,100-line file into modules (dashboard, forum, tournaments, clans, db, settings) and bundle them into a single `.user.js` with esbuild or `vite-plugin-monkey`. This also enables modern JS and linting.
- [x] **Promise-based IndexedDB wrapper.** Replace the hand-rolled `$.Deferred` counters and nested `ifSettingIsEnabled` callbacks. Load settings once at startup into a single object. *(Done. Every `Database` method still takes a callback but also returns a Promise, and errors are logged. Settings are cached at init. Import, export and first-run setup use `Promise.all`.)*
- [x] **Feature registry with isolation.** Use `{ name, match, run }` entries, each run inside its own try/catch, so one broken selector after a site redesign doesn't break every feature. *(Done via `runFeatures()` in `DOM_ContentReady` and `databaseReady`. This turned up two crashes: a call to the nonexistent `setupPlayerAttempDataTable` on level play-log pages, and `toWords` calling an undefined `intToEnglish`. A test now checks that every called function is defined.)*
- [ ] **Move off `@grant none`.** Use `GM_xmlhttpRequest` + `@connect` for the third-party APIs, which removes JSONP and the maak.ch proxy, and reach page globals through `unsafeWindow`. This also enables the jQuery 3 / jQuery UI 1.13 / DataTables 1.13 upgrades. It would also let settings and bookmarks live in Tampermonkey's storage (`GM_setValue`), which isn't tied to a domain: today IndexedDB is per origin, so `war.app` and `www.war.app` keep separate settings, and a future domain starts empty until the user imports a backup.
- [x] **Self-host the icons.** Icons are hot-linked from imgur (line 2709), which often blocks or deletes images. Inline them as SVG or data URIs. *(Done. Only 3 of the 7 were used; they're downscaled and inlined. The install icon is in `assets/`.)*
- [x] **Repo hygiene.** Delete `Tidy_up_your_Dashboard.user.js.backup` (git history already has it), move `plan.md` items into issues, and add a CHANGELOG. *(Done. Every `plan.md` item was already complete, so it was deleted rather than turned into issues.)*

### Upstream issue

- **The community events feed is malformed upstream.** *(Moot: the community events list was removed in 3.13.0, because war.app now has its own Community Events page and draws the Ladders page client-side.)*

## Phase 4 — Features

- [ ] **Read MTL data directly from www.warlight-mtl.com.** *(Waiting on the MTL organizers.)* They have been asked to add `Access-Control-Allow-Origin` (matching `https://war.app`, `https://www.war.app` and `https://www.warzone.com`, or `*`, plus `Vary: Origin`) to `/api/v1.0/players/<id>`, `/api/v1.0/players/?topk=10` and `/api/v1.0/games/?topk=10`. Once the header is live, the script will:
  1. Call those endpoints directly with plain JSON requests instead of maak.ch's JSONP relay, which also removes the code-execution risk for these features.
  2. Parse the response directly (no `response.data` string to decode).
  3. Move the three MTL features out of the maak.ch setting into regular Features switches (Profile, Forum, Community), on by default.
  4. Narrow and rename the maak.ch setting to cover only the community level record count.
  5. Update the tests.

  If they decline, the fallback is the `@grant GM_xmlhttpRequest` migration (Phase 3) with `@connect www.warlight-mtl.com`, or a relay you run yourself.
- [x] **Working open-games counter.** Decode `#AllOpenGamesData` or count table rows instead of only guarding the missing globals; the counter currently shows nothing. *(Done differently: war.app now renders these counts itself. The script's refresh used to leave them stale; it now copies the fresh counts in, using a single dashboard fetch for both tables. The dead counter code is removed.)*
- [x] **Turn notifications.** Show a desktop notification or a tab-title badge when it's your turn in a multi-day game, building on the existing refresh logic. *(Done. Rows are detected by their red "Your turn for …" line, checked against the logged-in dashboard. Includes a tab-title count, a 5-minute background check while the tab is unattended, and an opt-in desktop notification for newly waiting games.)*
- [x] **Per-feature toggles** in the settings menu for every feature, not just the current 10 settings. *(Done: a Features section with a switch for each feature that has a `section`.)*
- [ ] **Optional cross-browser sync** of settings and bookmarks via `GM_setValue` or a gist. This requires moving off `@grant none`, which needs care because the script relies on the page's `$.cookie`. *(Deferred until the `@grant` migration in Phase 3.)*

## Phase 5 — Features from the original script

Features described in the [original forum thread](https://war.app/Forum/106092-mulis-userscript-tidy-up-dashboard) that were lost over the years or broke with war.app's redesign. Twitch streams, the old Real-Time Ladder countdown and the AWP World Tour integration are left out, because the services behind them no longer exist in that form.

- [x] **Open Games filter.** Hide Auto Games, coin games, games with a short boot time, and games whose name contains chosen words. *(Done. A Filter link in the Open Games header, on the dashboard and the View All page. war.app now has its own "Hide All Lottery Games" button, so lottery games need no special case.)*
- [x] **Mark Open Games you've already joined.** *(Done. war.app has no marker for this, so rows are matched by your name in the seat tooltips, which read either the name or "<name>: Waiting for this player…". The name format was checked against the logged-in dashboard.)*
- [x] **Sort My Games by time left before you're booted.** *(Done. war.app's My Games label is the boot time plus your banked time, so time left is that label minus the "Your turn for …" duration. Only your-turn games are reordered, within the slots they already had, and the order is reapplied after each refresh.)*
- [x] **Open Games tab in the menu bar.** *(Covered by war.app: the Multi-Player menu now links to Open Games, so no userscript tab is needed.)*
- **Decline a tournament from the tournaments list page.** *(Not feasible. war.app sends a decline as a `DeclineTournament` message in its binary client protocol, not as a web request, so a userscript would have to call minified internals that change with every site build. Declining stays on the tournament page.)*
- **Hide tournaments with no games left.** *(Not feasible. Checked with an account in four tournaments: war.app no longer has tournament tables on the dashboard, and the Tournaments page's My Tournaments list shows only name, format and start time, nothing about your games or elimination. That only exists in war.app's binary client protocol, like declining.)*
- [x] **Search mail by player name.** *(Done. Filters `/Discussion/MyMail` by thread starter or last poster. The first search loads the other pages through `?Offset=`, so it covers the whole mailbox. Checked against a live mailbox.)*

## Phase 6 — Keeping up with war.app's redesign

war.app moved most pages to client-side rendering (`ujs_*` elements positioned from zero-size anchors) and dropped `#MainSiteContent` from every page. Every feature was checked against the live site.

- [x] **Fix what the redesign broke** (3.13.0). Tournament Bookmark link and player search wait for war.app to draw the page; "Invited by" ran before the database opened; the block list moved to `/ManageBlockList`; total points read an empty tooltip; "hide coins" used a wrong table id; "Reset hidden threads" used a dead selector; R refreshed while typing.
- [x] **Remove features whose page or data is gone, or that war.app now does itself** (3.13.0): Rate Map link, Global win rate, Community events list, fixed-height tournament list, creator highlighting in tournament chat, clan creator banner and Load Creators, profile box styling, new-thread cleanup, and the dead "Remember My Games filter" (3.12.1).
- [x] **Dead code cleanup** (3.13.1): the old popup system, unused helpers and stale selectors. Found along the way: making profile stat sections collapsible re-parsed the player's bio as HTML, a stored XSS (fixed, with a security test).
- [x] **Restore "Show more" and the My Games footer after a refresh** (3.13.2), by re-running war.app's exported `WL_MPDashInit` with fresh `#AllOpenGamesData`.
- [x] **Survive a domain change** (3.13.3): path-only page routing, relative links, titles trimmed with `og:site_name`, bookmarks from any of `SITE_HOSTS` open on the current domain, `@match` on all subdomains.
- [x] **Tournament player search and sort** (3.14.0): the toolbar was out of view, search left matches scattered, sort assumed the wrong row height. Find Me removed; war.app's Bracket tab has **Find...** and **>** for it.
- [x] **Common Games checked live** (3.14.4). Sorting and the head-to-head box worked, but the feature replaced war.app's jQuery on that page (`window.$ = $$$`, then `noConflict(true)` on the site's copy), which broke the cookie plugin, Bootstrap and player data there. It now uses `$$$` for DataTables only. The win rate also showed "NaN%" when no 1v1 game had finished.
- [x] **Remove the dashboard tournament features** (3.14.3). war.app dropped the dashboard's tournament and invitation tables, so "Show who invited you" (which displayed inviters captured from those rows), the invite highlighting setting and the right-column tournament table were dead. The `TournamentData` IndexedDB store is left in place, unused, to avoid a schema change.
- [x] **Tournament player toolbar clicks** (3.14.2). war.app's Players panel has `pointer-events: none`, which the toolbar inherited.
- [x] **Tournament features after in-page navigation** (3.14.1). Opening a tournament from the tournaments list switches the view without a page load, so the features never started; and on a second tournament war.app numbers its element ids. Tournament features now watch the page and find elements by name with an optional number.
- [x] **Block list search** (3.14.0), with accent-insensitive matching.
- [x] **Credit Muli** as the original author in the header, README and settings menu (3.13.1).
- [x] **QA checklist** in `QA.md` for a manual pass on the live site before each release.

## Phase 7 — AWP World Tour stats from wl-stats

awp.wl-stats.com and custom.wl-stats.com are run by this fork's maintainer, so permission isn't an issue. awp.wl-stats.com (FastAPI) already serves the data as JSON, keyed by war.app player ID: `GET /api/v1/players/{id}/stats` returns name, clan, level, games, wins, losses, win %, tournaments, titles, finals, best placement, points by year and per-template results. It only lacks a CORS header, so the script can't read it yet. This brings back the AWP World Tour integration from Muli's original script.

Decided: show the stats on profiles, include the player's rank, and turn the feature on by default.

### Server side (awp.wl-stats.com), to do first

- [ ] **Allow war.app to read the API.** Add `CORSMiddleware` with `allow_origin_regex=r"https://([a-z0-9-]+\.)?(war\.app|warzone\.com)"`, `allow_methods=["GET"]`, `allow_credentials=False` (so the site's own login cookies are never sent with these requests).
- [ ] **Cache headers.** `Cache-Control: public, max-age=3600` on `/api/v1/players/{id}/stats`.
- [ ] **Rank in the stats response.** Add the player's current AWP rank and 12-month rank to `/api/v1/players/{id}/stats`, so the script doesn't have to download `/api/v1/rankings` to find one player.

### Script side, once the header is live

- [ ] **"AWP World Tour stats" box on profiles** (Features → Profile, on by default): rank and 12-month rank, games, wins / losses and win %, tournaments, titles, best placement, and a link to the player's page on awp.wl-stats.com.
  - One request per profile, cached for an hour (sessionStorage); every request has a `.fail()` handler, and a player the site doesn't know, or a server that's down, leaves the profile unchanged.
  - Plain JSON over `fetch`/`$.ajax`, not JSONP, so the server can't run code on war.app; all values escaped, the link through `safeUrl()`.
  - Tests: rendering from a recorded API response, the unknown-player and failure cases, and a `security.test.js` case with an injection payload in the player name and clan.
  - Docs: README feature and privacy note (viewing a profile sends that player's ID to awp.wl-stats.com), CLAUDE.md third-party services list, a QA.md row, CHANGELOG.

### Later, optional

- [ ] **custom.wl-stats.com tournaments.** On a war.app tournament run through custom.wl-stats.com, show a "Managed on custom.wl-stats.com" link next to "Created by". Needs an endpoint that maps a war.app tournament ID to a custom.wl-stats.com tournament, with the same CORS setup.
- [ ] **MTL through wl-stats.** If the MTL organizers don't add CORS themselves (Phase 4), wl-stats could fetch MTL's public API server-side, cache it and serve it with CORS. That would remove the maak.ch JSONP relay for MTL without the `@grant` migration. Only with the MTL organizers' agreement, since it's their data and their server load.

## What's left

In suggested order:

1. **AWP World Tour stats on profiles** (Phase 7). Server changes on awp.wl-stats.com first (CORS, cache headers, rank in the stats response), then the script feature.
2. **Read MTL data directly** (Phase 4). Waiting on the MTL organizers to send CORS headers; the fallback is relaying it through wl-stats (Phase 7).
3. **custom.wl-stats.com tournament links** (Phase 7), optional.
4. **Move off `@grant none`** (Phase 3). No longer needed to reach wl-stats, and possibly not for MTL either; still the way to domain-independent storage and cross-browser sync, and to the jQuery / DataTables upgrades. The biggest change, and it needs a full QA pass.
5. **Optional cross-browser sync** (Phase 4), after the `@grant` move.
6. **Split into modules** (Phase 3), once the feature work settles.

Fragile spots to watch when war.app changes its layout (the QA checklist covers each): the tournament toolbar relies on the Players panel's 54px top border and its `pointer-events: none`, tournament features rely on war.app's `ujs_` element names, the "Show more" fix relies on `WL_MPDashInit` staying exported, and boot-time sorting relies on the "Your turn for …" text.

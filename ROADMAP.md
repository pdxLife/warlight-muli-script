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

  A third path is planned: MTL running on custom.wl-stats.com itself (on that site's roadmap, no date yet), which would also give it a row on the Ladders page (Phase 9).
- [x] **Working open-games counter.** Decode `#AllOpenGamesData` or count table rows instead of only guarding the missing globals; the counter currently shows nothing. *(Done differently: war.app now renders these counts itself. The script's refresh used to leave them stale; it now copies the fresh counts in, using a single dashboard fetch for both tables. The dead counter code is removed.)*
- [x] **Turn notifications.** Show a desktop notification or a tab-title badge when it's your turn in a multi-day game, building on the existing refresh logic. *(Done. Rows are detected by their red "Your turn for …" line, checked against the logged-in dashboard. Includes a tab-title count, a 5-minute background check while the tab is unattended, and an opt-in desktop notification for newly waiting games.)*
- [x] **Per-feature toggles** in the settings menu for every feature, not just the current 10 settings. *(Done: a Features section with a switch for each feature that has a `section`.)*
- [x] **Better Player Search** *(3.26.0)*: war.app's results (`ujs_PlayerSearchScene`, rows in `ujs_ResultsContainer` positioned by `bottom`, each with a profile link and "L65 <clan icon> name #1") are sorted (best match, level, name), filtered (hide L1–2, in a clan, minimum level) and tagged (You, AWP rank, Blocked from `/ManageBlockList`) by moving war.app's own rows, as on tournament pages. A pasted profile link or player ID opens the profile; recent searches are offered. Not done: a tag for players you have private notes on, since war.app has no page listing all your notes and checking each result's profile would take a request per row.
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

awp.wl-stats.com and custom.wl-stats.com are run by this fork's maintainer, so permission isn't an issue. awp.wl-stats.com (FastAPI) already serves the data as JSON, keyed by war.app player ID: `GET /api/v1/players/{id}/stats` returns name, clan, level, games, wins, losses, win %, tournaments, titles, finals, best placement, points by year and per-template results. It lacked a CORS header, so the script couldn't read it. This brings back the AWP World Tour integration from Muli's original script.

Decided: show the stats on profiles, include the player's rank, and turn the feature on by default.

### Server side (awp.wl-stats.com)

- [x] **Allow war.app to read the API.** `CORSMiddleware` on `/api/v1/` with `allow_methods=["GET"]` and `allow_credentials=False`, so the site's own login cookies are never sent with these requests. *(Done on both wl-stats sites, for `https://war.app` and its subdomains. warzone.com now only redirects to war.app, so it needs no entry.)*
- [x] **Cache headers.** `Cache-Control: public, max-age=3600` on `/api/v1/players/{id}/stats`.
- [x] **Rank in the stats response.** `/api/v1/players/{id}/stats` now has `rank` (this year's race, `null` if unranked), `rank_year`, `rank_12_months` and `page_url`.

### Script side

- [x] **"AWP World Tour stats" box on profiles** *(3.15.0)* (Features → Profile, on by default): rank and 12-month rank, games, wins / losses and win %, tournaments, titles, best placement, and a link to the player's page on awp.wl-stats.com.
  - One request per profile, cached for an hour (sessionStorage); every request has a `.fail()` handler, and a player the site doesn't know, or a server that's down, leaves the profile unchanged.
  - Plain JSON over `fetch`/`$.ajax`, not JSONP, so the server can't run code on war.app; all values escaped, the link through `safeUrl()`.
  - Tests: rendering from a recorded API response, the unknown-player and failure cases, and a `security.test.js` case with an injection payload in the player name and clan.
  - Docs: README feature and privacy note (viewing a profile sends that player's ID to awp.wl-stats.com), CLAUDE.md third-party services list, a QA.md row, CHANGELOG.

### Later, optional

- [x] **custom.wl-stats.com tournaments** *(3.15.0)*. On a war.app tournament that custom.wl-stats.com has read, "custom.wl-stats.com (series)" next to "Created by" links its page and series there, from `GET /api/v1/warapp-tournaments/{id}` (same CORS and cache). That covers Titled Tuesday, War Gaming Live and the P/R League groups played as war.app tournaments; tournaments custom runs itself create separate games, not a war.app tournament, so they have no war.app page to link from. Private clan tournaments answer 404 like unknown ones.
- [ ] **MTL through wl-stats.** If the MTL organizers don't add CORS themselves (Phase 4), wl-stats could fetch MTL's public API server-side, cache it and serve it with CORS. That would remove the maak.ch JSONP relay for MTL without the `@grant` migration. Only with the MTL organizers' agreement, since it's their data and their server load.

## Phase 8 — Idle helpers

War.app Idle came after Muli's script, which has no Idle features yet (on Idle pages it only adds its general styles and the version label). Idle is drawn entirely by war.app's client code (`ujs_*` elements, like tournament pages) and keeps its save in its own IndexedDB (`WZ`). The resource bars behind the ₩ / ₳ counters are war.app's own, not a script bug.

Ground rules for everything here:
- **Information and convenience only, no automation.** Nothing that upgrades, attacks, moves tanks or claims rewards for you: that would play the game for you, be unfair where Idle has challenges and rankings, and likely break war.app's rules.
- **Read what's on screen, not the game's internals.** war.app's client code is minified and renamed on every build; visible text and numbers are much sturdier. Use the same patterns as tournament pages: `ujsElement()` lookups, a `MutationObserver` that re-checks, absolutely positioned additions that don't enter war.app's layout, and `pointer-events: auto` on anything clickable.
- Each helper gets its own switch under a new "Idle" section in Features, plus tests from recorded Idle markup and a QA.md row.

From the Idle and Feature Requests forums (October 2026), the requests a script can help with on desktop, most asked first; many others are game rules or the phone app, which only war.app can change:

- [x] **Volume slider** *(3.25.0)*: Idle is loud in battles, challenges and auto-conquer, and a player wrote a userscript just to lower it. Idle plays its sounds with SoundManager 2 as HTML audio, often from elements outside the page, so the script scales every audio element's volume where it's set (`setupIdleVolume()`), leaving videos (ads) alone.
- [x] **Check big market purchases** *(3.25.0)*: a typo such as "121p" (Idle reads k, m, b, t, p, e, z) makes Idle buy as many as your money allows. The market's Purchase button already shows what it will buy ("Purchase 19M for ₩934M"); when that's less than the number typed, the script asks first (`idleMarketQuestion()`).
- [x] **Confirm before using powers and activating artifacts** *(3.25.0)*: players hit Time Warp by accident. Powers are the Use buttons in the Powers tab (`WziTabBodyIAPRow`), artifacts the Activate buttons on the AP tab's cards (`WziTabBodyAPArtifact`). war.app's buttons are links with a jQuery click handler, so a capturing click listener asks first and stops the click on Cancel (`idleActionQuestion()`).
- [x] **Warn when using a lower-rarity artifact** *(3.25.0)* (Feature Requests, 4 votes): in the artifact window (`WziArtifactsDialog`: equipped cards under `ujs_EquippedCard0..2`, the rest in `ujs_UnequippedContainer`, all in the page even when scrolled away), an equipped card with a higher-rarity unequipped copy gets a "Better: …" tag and both are outlined (`idleBetterCopies()`). Rarities from war.app's code: Poor, Common, Uncommon, Rare, Epic, Legendary, Insane. Battles use the equipped artifacts, chosen in this same window, so the tags cover them; war.app's code has no separate battle picker. Still open: Super Ascend (`SuperAscendDialog`), which needs an account with it unlocked to look at.
- [x] **See all artifacts at once, with sorting** *(3.25.0)*: war.app already has a Sort box; the script adds a "List" button next to it with every artifact in a compact list, by rarity or name, copies counted (`idleArtifactListHtml()`).
- [x] **Warning when Idle is open in another tab of this browser** *(3.25.0)*, against the lost-progress threads: a `BroadcastChannel` hello between Idle tabs, and both show the warning (`setupIdleTabWarning()`).

Still to ship, from the Idle and Feature Requests forums (October 2026), most wanted first:

- [x] **"View only" map** *(3.27.0)* (Feature Requests, 14 votes: "view only or double tap to conquer"). A stray click or tap conquers a territory and spends the armies you were saving. A switch near the map that blocks a click on the map (a press and release without moving) while it's on, so dragging to pan and zooming still work. Idle reads the map's input from `document.onpointerdown`/`onpointermove`/`onpointerup` and decides tap or drag itself; a capturing listener on `window` holds a press on the map (`#UjsWorldHolder`) back, passes it on once it moves more than 6px (a drag), and drops it if it's let go (a tap), with a short note at the click (`setupIdleViewOnlyMap()`).
- [ ] **Better-copy check in Super Ascend** (part of "Warning when using a lower-rarity artifact", and "Super Ascend: auto-select artifacts to keep"): the same "Better: …" tags where Super Ascend asks which artifacts to keep (`SuperAscendDialog`). Needs an account with Super Ascend unlocked to look at the screen.
- [x] **A scrollable log of Idle's pop-ups** *(3.27.0; checked against a copy of the pop-up's structure, still to see on a real one)* ("Log window instead of a lot of annoying balloons", 9 replies; "Put bonus pop-up info into a scrollable list"). Idle's balloons (`WziBalloon`: digs, powers, caches, markets, bonuses) appear over the map and vanish; the script could copy each one's text into a small panel with the last 100, so players can turn the balloons off and still see what happened.
- [x] **"Storage" for artifacts you never want used** *(3.27.0)* (Feature Requests, 2 votes): mark artifacts in the List view as stored; the artifact window then dims them and the confirmation before activating one says it's stored. Cards have no id of their own, so marks go by name and rarity.
- [ ] **A TODO note per level** (Feature Requests, 1 vote: "drop a single TODO on the map"). The map is a canvas, so a pin on a territory isn't possible; a short note box per level, kept in this browser, covers "what was I working towards".

Game-side, so only war.app can do them: hospital visibility on the map (19 votes), keeping a bonus selected while picking territories, a crafting "Deactivate" button, and protecting artifacts in the game itself. A Super Ascension leaderboard (Feature Requests, 3 votes; a long forum thread) would fit custom.wl-stats.com better than the script.

- [x] **Attention alerts** *(3.25.0)*: the tab title counts what Idle shows it's waiting on you for, read from its own elements (`ujs_UnclaimedPowersBtn`, `ujs_BattleIndicatorBtn`, `ujs_DailyBonusBtn`, `ujs_CoinWheelBtn`, each hidden with `display: none` until it applies) and texts ("Click Claim below to reveal it", "is ready to move"); an opt-in desktop notification for what's new while the tab is hidden (`setupIdleAttention()`). Originally: A tab-title count and an optional desktop notification when Idle needs you: a tank has finished its queued moves, a battle is ready, powers are waiting to be claimed, and similar. Same idea as the multiplayer "Your turn" alert, so Idle can sit in a background tab. First step: list which on-screen signals mark each of these states.
- [x] **Best next upgrade** *(3.25.0, army camps)*: an army camp's "?" box shows the next level's output (e.g. ₳5.86K → ₳6.48K/sec); camps with the same output gain the same, about 11%, so output ÷ upgrade cost ranks them without opening every box (`idleBestCamp()`). Mines make different resources and hospitals save armies, so they get no ranking. Originally: Next to each upgrade, show how long it takes to pay for itself (cost ÷ income gained) and highlight the best value. Needs the cost and the income gain of each upgrade from the screen; check which panels (army camps, mines, hospitals, mercenary camps, dig sites) show both.
- [x] **Time to afford** *(3.25.0)*: (cost − money) ÷ ₩/sec from `ujs_MoneyLabel`, beside each upgrade's output label, in the label's holder because war.app rewrites the label several times a second (`showIdleUpgradeHints()`). Originally: Next to each upgrade cost, show how long until you can afford it at the current ₩/sec or ₳/sec (both are shown in the top-right counters, e.g. "￦131 (1/sec)").
- [ ] ~~**Ascend helper.**~~ *Dropped (October 2026): the game shows only what an Ascend costs (100 AP), not what it would give, so there's nothing to compare.* Originally: Show what ascending now would give compared with waiting, e.g. in an hour, if the Ascend screen exposes enough numbers to estimate it. Check the Ascend and Super Ascend screens first; drop this if the gain isn't shown or can't be derived.

## Phase 9 — Community ladders & leagues on the Ladders page

Most players reach community events through war.app's Ladders page, which only lists war.app's own four ladders (1v1, Seasonal, 2v2, 3v3). war.app's Community Events page lists Clan League, Nations Cup, AWP World Tour, MTL, Clan Cup, Clan Teams Cup, Titled Tuesdays and Mod Tourneys, but only as links, without seasons or standings, and P/R League is missing. custom.wl-stats.com already holds the live seasons: it runs P/R League and Clan Cup itself and refreshes Nations Cup, Clan League, Titled Tuesday and the Seasonal Ladder often. Small Earth P/R League and War Gaming Live are finished and not running now.

Plan: a "Community ladders & leagues" panel below war.app's ladders, one row per series: its current season, the season's state, and your line in it. Later, a "You: …" line on war.app's Community Events cards too.

### Script side

- [x] **The panel, with an AWP World Tour row** *(3.16.0)*: this year's race, how many players are in it, and your rank and points. It loads awp.wl-stats.com's `/api/v1/rankings` (about 17 KB, every ranked player) and finds you in it locally, so no player ID is sent. It hangs below the ladders dialog inside war.app's clipping viewport, follows the dialog's size, and scrolls on its own when the window is short. It wears war.app's own dialog, row and button art, read from the ladders on the page, with war.app's blue button tint (`UIButton-242D9A`) instead of the ladders' green. Switch: Features → Community.
- [x] **custom.wl-stats.com rows** *(3.17.0)*: one row per series with its season, progress, leader or winner, Titled Tuesday's next start (local time, with a countdown) and your line. One request with your player ID, kept for 10 minutes; AWP and custom load side by side, so one being down doesn't hide the other. The endpoint's times have no zone and are read as UTC.
- [x] **Seasonal Ladder** *(3.17.0; a panel row since 3.21.0)*: first a line along the bottom edge of war.app's own Seasonal row, but signed in, war.app adds an "Unlocked: You may join this ladder" line there that the season line covered. Since 3.21.0 the season is a regular row in the panel, and war.app's rows are left alone.
- [x] **Two lists, side by side when wide** *(3.22.0)*: Players and Clans & nations (`CLAN_SERIES_KINDS`). The panel lives in war.app's full-width `#UjsCanvasHolder` instead of its 600px viewport, centered under the ladders, up to 1,040px wide; a container query puts the lists in two columns from 900px. Clan League leads the clan list (3.23.0).
- [x] **Clan League on the Ladders page between seasons** (server, done October 2026): `/api/v1/series` drops Clan League once its last season finished over 30 days ago (Clan League 19 ended 5 July 2026), so the clan list goes without its biggest event until the next season starts. custom.wl-stats.com now always lists Clan League, with its latest season when none is on.
- [x] **Signups highlight** *(3.17.0)*: "Signups open until …" in gold with a link to sign up, or "signed up".
- [x] **"You: …" on war.app's Community Events cards** *(3.17.0)*: each card whose title starts with a series' `warapp_event` gets your line at its top right (or open signups), and the AWP card gets your race rank. Hidden by a container query where a card is under 600px, which only happens in a narrow desktop window.
- [x] **Standings on every matching card, joined or not** *(3.23.0)*: two lines beside war.app's title and player count (the edition's state; leader or winner, Titled Tuesday's next start; the AWP race and a "Rankings: Top 16" link, 3.23.1), and beside "You can join!" your line or a link to the full standings (`communityEventHtml()`). Lines don't wrap, so they never run into war.app's description.
- [x] **Real standings for non-leader formats** (server, done October 2026; script 3.23.0): Nations Cup groups and Clan Cup knockouts have no single leader, so their cards show only the edition's state. custom.wl-stats.com now sends short standings in `/api/v1/series`, and the script shows them (`standingsHtml()`, in `seriesDetailHtml()`, so the Ladders panel, the Community Events cards and clan pages all show it in place of the leader or winner line): `current.standings = { label, entries: [{ name, url, place, group, points, wins, losses, clan }] }`, every field but `name` optional, at most 8 entries except Nations Cup's group leaders (all groups). For Clan Cup and Nations Cup the script shows only the stage (`current.stage`, e.g. "Round 2", "Qualifiers"), linking to it, not their squads or group leaders (3.23.3); the server needs to send `stage` at every stage while the cup runs. Titled Tuesday shows its last event, linked, and the next one, with no winner (3.23.3). AWP World Tour links to its rankings instead (3.23.1).
- [ ] **MTL row**, once MTL runs on custom.wl-stats.com (on its roadmap, no date yet). It then comes from the same endpoint as one more series.

### Server side (custom.wl-stats.com)

- [x] **`GET /api/v1/series?player={war.app player ID}`** *(live)* (`player` optional), with the same CORS and no-credentials setup as `/api/v1/warapp-tournaments`.
  - **Which series:** those whose current season or edition is taking signups or running, or finished in the last 30 days. Finished-and-idle series (Small Earth P/R League, War Gaming Live) are left out, and private clan tournaments never appear. Order: running, then signups, then recently finished.
  - **Each series:**
    - `slug`, `name`, `kind` (league, clan_cup, clan_league, nations_cup, events, ladder) and `url`.
    - `warapp_event`: the start of the title of war.app's Community Events card for this series ("Clan League", "Nations Cup", "Clan Cup", "Titled Tuesdays"), or null if there's no card.
    - `current`: the season or edition now on, or null.
      - `name`, `url` and `forum_url`.
      - `status`: "signups", "running" or "finished".
      - `signups_close_at`, `started_at` and `finished_at`.
      - `next_event_at`: the next event, for events series.
      - `players`: players, or teams/clans/countries for team series.
      - `progress`: `{ played, total }` games, or null.
      - `leader` while running, `winner` once finished, each `{ name, url }`.
    - `you`: only when `player` is given and takes part, otherwise null.
      - `as`: "player", "clan" or "nation"; `name`: the player, their clan or their country, as the series counts them.
      - `division` and `group` (null where the series has none), `place`, `of`.
      - `wins`, `losses` and `points` (null where not used).
      - `status`: "signed_up", "playing", "promoted", "relegated", "eliminated" or "champion".
      - `url`: the player's, clan's or country's page in that season.
  - **Cache:** `Cache-Control: public, max-age=600`.
  - **Tests:**
    - the CORS headers;
    - an unknown or absent player gives every `you` as null;
    - private clan tournaments never show;
    - a series finished more than 30 days ago is left out;
    - one case per `kind` that has a `you`.

## Phase 10 — More from custom.wl-stats.com

Three more places where custom.wl-stats.com's data helps on war.app. All follow Phase 7 and 9's rules: plain JSON with CORS, no war.app cookies, every value escaped, a 404 shows nothing.

- [x] **Community tournament stats on profiles** *(3.18.0)*: a "Community tournaments" box below the AWP one, from `/api/v1/players/{id}/stats` (already served with CORS): games and win %, tournaments, titles and finals, best placement, tournaments organized, and the three most played formats as rows of their own ("Clan league 33–31 (52%)"). Kept for an hour. The boxes keep the order Private Notes, AWP, Community whichever answers first (`placeProfileBox()`). Switch: Features → Profile.
  - Server, optional: `/api/v1/players/{id}/stats` sends no `Cache-Control`; `public, max-age=3600` as on AWP would let browsers and Cloudflare keep it too.
- [x] **Event badges on My Games** *(3.19.0)*. A small blue badge after a game's name on the dashboard, e.g. "P/R League S38", "Nations Cup · Group C" or "Titled Tuesday", linking to that event on custom, so it's clear which games count for what. Re-applied after every refresh, like boot-time sorting. My Games is plain HTML and each row links to its game, so matching by war.app game ID is sturdy.
  - **Server side** *(live)*: `GET /api/v1/players/{war.app player ID}/games` on custom.wl-stats.com, same CORS and no-credentials setup:
    - the player's community games still in play, from the war.app game IDs custom already stores (matches, league games, fixtures);
    - each: `game_id` (war.app's), `series` (name), `label` ("Season 38 · Group A2", "Round 2", …) and `url` (the event's page);
    - `Cache-Control: public, max-age=300`; the script keeps it 5 minutes too.
    - Tests: CORS; an unknown player gives an empty list; finished games and private clan tournaments never appear.
- [x] **Clan standings on clan pages** *(3.19.0)* (`/Clans/?ID=…`, drawn client-side as `ujs_ClanScene`): the clan's line in each current series, e.g. "Clan Cup II: still in, 3–1" or "Clan League 19: Division A, 4th of 6, 112 points", in a panel next to war.app's Core Info box. The clan's name comes from the page title ("Clan: Icelandic Turtles").
  - **Server side** *(live)*: a `clan` option on `/api/v1/series` (`?clan=Icelandic%20Turtles`), returning the same list with `you` as the clan's line (`as: "clan"`). The existing `/api/v1/clans/{name}/rankings` ranks players inside a clan and doesn't cover this.
  - Done as a "Community events" box below the left column's Clan Wars dialog (`ujs_ClanWarsSection`). The endpoint lists every squad, best first; Clan Cup shows only the best one (3.21.0), since a clan can enter up to five. With `clan`, the endpoint also lists the clan's series finished long ago (its last Clan League) and `titles` (`count`, `editions`; Clan League titles are top-division wins only), shown as a gold "🏆 Champion ×N" line (3.21.0). The page scrolls natively, so the box extends the scroll area and stays reachable for clans with short member lists. The clan's name is read from `ujs_ClanNameLabel`. In war.app's one-column layout Clan Members follows Clan Wars, so the box goes below the lowest dialog in its column (`placeBelowColumn()`, 3.20.1).

## Phase 11 — Updates and a home for the script

- [x] **New version notice** *(3.20.0)*: a daily check of the script's version on GitHub (raw.githubusercontent.com serves it to any site), the corner version label becomes a gold "Update to …" link to the `.user.js`, so Tampermonkey shows its update screen; nothing else on the page changes. Retries after an hour if GitHub can't be reached. Switch: Features → Other.
- [x] **AWP badges on My Games** *(3.21.0)*: from awp.wl-stats.com's `GET /api/v1/players/{id}/games` (same shape as custom's), in gold next to custom's blue. Both sites are asked side by side (`settleRequest()`), so one being down doesn't hide the other's badges.
- [ ] **A site on GitHub Pages** (`docs/` on `main`, plain HTML, no build), mainly to host the images for a forum post about the script: war.app's forum holds no media, and most of the images in Muli's original thread no longer load (deleted from imgur and postimg, or blocked as plain `http`).
  - Images in posts as PNG (or JPG): war.app's forum can't play video, and its phone app shows neither SVG nor GIF. About 700px wide, under about 1 MB each.
  - A home page with the Install button, the images with short captions and a link to the forum thread; interactive demos running the script's own functions on sample markup can come later.
  - [x] Skeleton: `docs/index.html` (Install button, feature cards, a screenshot, credit and the fan-project note), `docs/.nojekyll`, and test images in `docs/media/test/`. `PUBLISHING.md` is the step-by-step guide: turning on Pages, checking the site, testing images in a forum preview and the phone app, adding images later, and how it all works.
  - [x] Pages is on (`main` / `/docs`). In a forum preview in the browser, the PNG and GIF both show and the GIF animates. In war.app's phone app the PNG shows but the hand-encoded `test.gif` doesn't.
  - [x] Tested GIFs from gifski and ffmpeg, a single-frame GIF and a JPG in the phone app: only the JPG showed. The app shows no GIFs at all, so posts use PNG and JPG; motion is a PNG step strip in the post with a "See it in motion" link to an MP4 on the site.
  - [x] Tested an animated PNG (`media/test/test-apng.png`): it moves in browsers and shows as a still (its first frame) in war.app's phone app. Motion in posts is APNG, made with `tools/make_apng.py`, with a first frame that makes sense on its own.
  - [ ] Capture the stills and step strips on the maintainer's account, with other players' names blurred where they aren't public standings; MP4s for the site.
  - A line that it's a fan project, not affiliated with war.app; recordings made on the maintainer's account, with other players' names cropped where they aren't public.
- [ ] **The forum post**, in BBCode with the hosted images, once the media is ready.

## Phase 12 — A browser extension

The same code published as its own browser extension, so players install it from their browser's
store in one click, without a userscript manager. The userscript stays: it updates within minutes
of a push, and works in any manager.

What it gains:
- **One-click install and store updates** from the Chrome Web Store (Chrome and other Chromium browsers), Edge Add-ons and Firefox Add-ons.
- **MTL without maak.ch or CORS:** an extension may fetch sites that send no CORS headers, if the user grants that site (`host_permissions` for www.warlight-mtl.com). The MTL features would read warlight-mtl.com's JSON directly, and the maak.ch JSONP relay could go.
- **Settings that follow the player:** `storage.sync` keeps settings and bookmarks across the player's computers and across war.app's domains, which today's per-origin IndexedDB can't. This is Phase 4's "cross-browser sync".
- It replaces Phase 3's "move off `@grant none`" for the same goals.

What it costs:
- **Store review on every update**, from hours to a few days, instead of going live within minutes.
- **Fees:** the Chrome Web Store charges a one-time $5 developer fee; Firefox and Edge are free. Safari needs an Apple developer account ($99 a year) and is left out.
- **No code loaded from the web:** stores don't allow it, so jQuery, jQuery UI and DataTables are bundled into the extension. That needs the build step from Phase 3's "split into modules".
- **Two packages:** Manifest V3 for Chrome and Edge, with Firefox's small differences.

How it would run: a content script with `"world": "MAIN"` (Chrome 111+, Firefox 128+) runs in the page, the way the userscript does with `@grant none`, so war.app's own jQuery, cookies and Bootstrap stay reachable. Requests that need the extension's permissions go through a small background script.

- [ ] **Check the userscript in Violentmonkey** (open source; Chrome, Firefox, Edge) and name it in the README as an alternative to Tampermonkey. It uses only standard userscript features, so it should run unchanged.
- [ ] **Build step and modules** (Phase 3), producing both the `.user.js` and the extension from the same source.
- [ ] **Extension package**: manifest, content script in the main world, background script for MTL requests, `storage.sync` for settings, with the IndexedDB data moved over on first run.
- [ ] **Store listings**: Chrome Web Store, Edge Add-ons, Firefox Add-ons, with a privacy description listing the sites contacted (as in the README).
- Worth starting when players ask for a one-click install, or when the MTL data is wanted without maak.ch.

## What's left

In suggested order:

1. **The site and forum post** (Phase 11): the images, with motion as animated PNGs.
2. **Read MTL data directly** (Phase 4), or the MTL row through custom.wl-stats.com (Phase 9). Waiting on the MTL organizers to send CORS headers; the fallback is relaying it through wl-stats (Phase 7).
3. **A browser extension** (Phase 12), which would take over from moving off `@grant none` (Phase 3): MTL without maak.ch, synced settings, and the library upgrades. Start with the Violentmonkey check; the rest when players ask for a one-click install.
4. **More Idle helpers** (Phase 8): the Super Ascend better-copy check and level notes. 3.25.0 shipped eleven helpers; 3.27.0 added the "view only" map, the pop-up log and artifact storage.
5. **Cross-browser sync** (Phase 4), through the extension's `storage.sync`.
6. **Split into modules** (Phase 3), which the extension needs first.

Fragile spots to watch when war.app changes its layout (the QA checklist covers each): the tournament toolbar relies on the Players panel's 54px top border and its `pointer-events: none`, tournament features rely on war.app's `ujs_` element names, the "Show more" fix relies on `WL_MPDashInit` staying exported, boot-time sorting relies on the "Your turn for …" text, the Ladders panel relies on the `ujs_LaddersScene`, `ujs_DialogBackgroundForDropShadow_img`, `ujs_LadderContainer_img` and `ujs_OneVersusOneLadder_img` elements and on war.app's CDN serving the blue `UIButton-242D9A.png` (without them it falls back to a plain frame and a flat blue button), the clan box relies on `ujs_ClanScene`, `ujs_ClanNameLabel` and `ujs_ClanWarsSection`, the My Games badges on each row's `GameID=` link, the Community Events lines rely on `ujs_CommunityEventsScene`, `ujs_EventRow` and the card title being the first text in `ujs_vert`, and the wl-stats features rely on the response fields of `/api/v1/players/{id}/stats` (on both sites), `/api/v1/warapp-tournaments/{id}`, `/api/v1/series` (with `player` or `clan`) and `/api/v1/players/{id}/games` (on both sites).

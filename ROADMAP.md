# Roadmap

Ordered by priority. Line numbers refer to `Tidy_up_your_Dashboard.user.js` at the time of writing.

## Phase 1 — Real bugs

- [x] **Auto-update overwrites this fork.** `@downloadURL` / `@updateURL` (lines 17–18) point at the upstream Greasy Fork script #8936, so the next upstream release replaces this version. Point them at this repo's raw URL (or remove them) and give the script its own `@namespace` and `@name`. *(Done: URLs now point at this repo. The namespace was kept, because the name already differs from upstream and changing it would make Tampermonkey install a second copy.)*
- [x] **Import can wipe all data.** `importSettings()` (line 2102) clears every table before parsing the pasted string. A bad or truncated paste deletes all bookmarks and settings. Parse and validate first, then clear. *(Done. Import now also clears only the exported tables, so tournament inviter data survives.)*
- [x] **Reload fires immediately.** `window.setTimeout(window.location.reload(), 2000)` (line 2367) calls `reload()` right away. Use `setTimeout(() => location.reload(), 2000)`.
- [x] **IndexedDB support check never triggers.** `if (!"indexedDB" in window)` (line 521) evaluates as `(false) in window`. Also, `db = e.target.result` (line 559) assigns an undeclared global that can clash with site code.
- [x] **Blacklist counter polls forever.** It rebuilds the DOM every 500 ms (line 2996); other features use similar polling loops. Replace them with `MutationObserver`. *(Done for the blacklist. The only other loop, in `setupClanPageCreator`, stops after 40 attempts.)*
- [x] **Remove `async: false`** in `loadPlayerData()` (line 78). It blocks the main thread on first load each session.

## Phase 2 — Security and privacy

- [x] **Escape third-party data before inserting it as HTML.** MDL API player and clan names and icon URLs are concatenated into HTML (lines 439–454). Use `htmlEscape()` or build elements with `.text()` / `.attr()`. *(Done. Also covered: community level cards, the community-level record count, the CLOT event list, and the tournament inviter name, which was a live XSS from player names. Image and link URLs go through the new `safeUrl()`. The log dialog now sets its text with `.val()`.)*
- [x] **Reject `javascript:` bookmark URLs** (line 1512). Together with import, a shared settings backup could plant code that runs on click. Allow only `http(s):` and relative URLs. *(Done. Bookmarks are also sanitized when rendered, so stored or imported bad URLs render as `#`, and names are escaped.)*
- [x] **Remove `validateUser()` telemetry** (line 3643). It sends the username and player ID to maak.ch, and nothing depends on it. Remove it or make it opt-in. *(Removed, along with `setUserValid` / `setUserInvalid` / `pageIsLogin`.)*
- [ ] **Drop the maak.ch HTTP→HTTPS proxy** (line 209). *(Partly done: level previews now come from war.app, and the remaining maak.ch features (MDL and the record count) are opt-in and off by default. Next step: ask the MDL maintainers to send `Access-Control-Allow-Origin` for war.app, which would let MDL work without maak.ch. The record count exists only in maak.ch's database.)* *(Originally blocked:)* warlight-mtl.com serves HTTPS but sends no CORS header, and every maak.ch endpoint (MDL proxy, community levels) answers JSONP only. Under `@grant none` the browser can't call these directly. JSONP also means maak.ch can run arbitrary script on war.app with your session. Fixing it means fetching through `GM_xmlhttpRequest` with `@connect`, which moves the script into the userscript sandbox. Track it under Phase 3.
- [x] **Update dependencies and pin them with hashes.** *(Partly done.)* moment is dropped, and every `@require` is pinned with `#sha256-` (the DataTables hashes were cross-checked with cdnjs, and jQuery with the official CDN build in the npm package). The jQuery, jQuery UI and DataTables major upgrades are deferred. war.app itself runs jQuery 1.9.1, so most DOM work never touches the `@require`d copy. The known CVEs in these versions need untrusted input passed to the vulnerable APIs, which this script doesn't do. And on Common Games the script hands its jQuery to the site as `window.$`, so a jQuery 3 upgrade needs live testing.

## Phase 3 — Maintainability

- [ ] **Split into modules.** Break the ~4,300-line file into modules (dashboard, forum, tournaments, clans, db, settings) and bundle them into a single `.user.js` with esbuild or `vite-plugin-monkey`. This also enables modern JS and linting.
- [x] **Promise-based IndexedDB wrapper.** Replace the hand-rolled `$.Deferred` counters and nested `ifSettingIsEnabled` callbacks. Load settings once at startup into a single object. *(Done. Every `Database` method still takes a callback but also returns a Promise, and errors are logged. Settings are cached at init. Import, export and first-run setup use `Promise.all`.)*
- [x] **Feature registry with isolation.** Use `{ name, match, run }` entries, each run inside its own try/catch, so one broken selector after a site redesign doesn't break every feature. *(Done via `runFeatures()` in `DOM_ContentReady` and `databaseReady`. This turned up two crashes: a call to the nonexistent `setupPlayerAttempDataTable` on level play-log pages, and `toWords` calling an undefined `intToEnglish`. A test now checks that every called function is defined.)*
- [ ] **Move off `@grant none`.** Use `GM_xmlhttpRequest` + `@connect` for the third-party APIs, which removes JSONP and the maak.ch proxy, and reach page globals through `unsafeWindow`. This also enables the jQuery 3 / jQuery UI 1.13 / DataTables 1.13 upgrades, and the odd `jQuery.noConflict(true)` call in `setupCommonGamesDataTable()` should be revisited at the same time.
- [x] **Self-host the icons.** Icons are hot-linked from imgur (line 2709), which often blocks or deletes images. Inline them as SVG or data URIs. *(Done. Only 3 of the 7 were used; they're downscaled and inlined. The install icon is in `assets/`.)*
- [x] **Repo hygiene.** Delete `Tidy_up_your_Dashboard.user.js.backup` (git history already has it), move `plan.md` items into issues, and add a CHANGELOG. *(Done. Every `plan.md` item was already complete, so it was deleted rather than turned into issues.)*

### Upstream issue

- **The community events feed is malformed upstream.** Since its last edit (2026-08-31), `psenough/wl_clot` `hub/list.jsonp` has an entry missing its closing `}`, so the ladders page can't list events. The script now accepts the feed's anonymous `({...})` wrapper, so the list comes back once upstream fixes the file.

## Phase 4 — Features

- [ ] **Working open-games counter.** Decode `#AllOpenGamesData` or count table rows instead of only guarding the missing globals; the counter currently shows nothing.
- [ ] **Turn notifications.** Show a desktop notification or a tab-title badge when it's your turn in a multi-day game, building on the existing refresh logic.
- [ ] **Per-feature toggles** in the settings menu for every feature, not just the current 10 settings.
- [ ] **Optional cross-browser sync** of settings and bookmarks via `GM_setValue` or a gist. This requires moving off `@grant none`, which needs care because the script relies on the page's `$.cookie`.

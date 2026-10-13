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

- [ ] **Escape third-party data before inserting it as HTML.** MDL API player and clan names and icon URLs are concatenated into HTML (lines 439–454). Use `htmlEscape()` or build elements with `.text()` / `.attr()`.
- [ ] **Reject `javascript:` bookmark URLs** (line 1512). Together with import, a shared settings backup could plant code that runs on click. Allow only `http(s):` and relative URLs.
- [ ] **Remove `validateUser()` telemetry** (line 3643). It sends the username and player ID to maak.ch, and nothing depends on it. Remove it or make it opt-in.
- [ ] **Drop the maak.ch HTTP→HTTPS proxy** (line 209) if warlight-mtl.com now serves HTTPS with CORS. As it stands, maak.ch is a single point of failure.
- [ ] **Update dependencies and pin them with hashes.** jQuery 1.11.2 and moment 2.8.4 both have known security issues. moment is only used for log timestamps (line 162), so drop it. Add `#sha256=` integrity hashes to the remaining `@require` lines.

## Phase 3 — Maintainability

- [ ] **Split into modules.** Break the ~4,300-line file into modules (dashboard, forum, tournaments, clans, db, settings) and bundle them into a single `.user.js` with esbuild or `vite-plugin-monkey`. This also enables modern JS and linting.
- [ ] **Promise-based IndexedDB wrapper.** Replace the hand-rolled `$.Deferred` counters and nested `ifSettingIsEnabled` callbacks. Load settings once at startup into a single object.
- [ ] **Feature registry with isolation.** Use `{ name, match, run }` entries, each run inside its own try/catch, so one broken selector after a site redesign doesn't break every feature.
- [ ] **Self-host the icons.** Icons are hot-linked from imgur (line 2709), which often blocks or deletes images. Inline them as SVG or data URIs.
- [ ] **Repo hygiene.** Delete `Tidy_up_your_Dashboard.user.js.backup` (git history already has it), move `plan.md` items into issues, and add a CHANGELOG.

## Phase 4 — Features

- [ ] **Working open-games counter.** Decode `#AllOpenGamesData` or count table rows instead of only guarding the missing globals; the counter currently shows nothing.
- [ ] **Turn notifications.** Show a desktop notification or a tab-title badge when it's your turn in a multi-day game, building on the existing refresh logic.
- [ ] **Per-feature toggles** in the settings menu for every feature, not just the current 10 settings.
- [ ] **Optional cross-browser sync** of settings and bookmarks via `GM_setValue` or a gist. This requires moving off `@grant none`, which needs care because the script relies on the page's `$.cookie`.

# CLAUDE.md

Userscript for [war.app](https://war.app) (formerly Warzone), run through Tampermonkey. The whole script is the single file `Tidy_up_your_Dashboard.user.js`. There is no build step: the file in the repo is exactly what users install.

## Commands

```bash
npm install        # dev dependencies, only needed for tests
npm test           # node --test test/
npm run check      # syntax check of the userscript
```

To try changes on the live site, reinstall the script in Tampermonkey from the local file or from the raw GitHub URL.

## How the script is put together

- **Header:** `@grant none`, so the script runs in the page context. The site's own globals (`$.cookie`, `wljs_WaitDialogJS`, `CreateModal`, Bootstrap's `.modal()`) are available. Switching to any `GM_*` grant sandboxes the script and breaks these.
- **Two jQuerys:** `$` is the site's jQuery, which has the cookie plugin. `$$$` is the `@require`d jQuery 1.11.2 plus jQuery UI, used for the log dialog. `window.$` is reassigned to `$$$` on the Common Games page so DataTables works there.
- **Startup flow:** `DOM_ContentReady()` starts `loadPlayerData()` and runs a list of page features through `runFeatures()`. It then calls `Database.init()`, whose callback runs the menu setup, `checkVersion()` and `databaseReady()`, which is a second feature list for settings-driven features. Each feature is `{ name, match, run }` and runs in its own try/catch. Add new features as entries pointing at named top-level functions, not as inline blocks. List order is execution order.
- **Page routing:** done with the `pageIs*()` helpers, which match against `location.href` for both `war.app` and `warzone.com`.
- **Player data:** `loadPlayerData()` returns a jQuery promise, stored as `window.playerDataReady`. Anything that reads `WlPlayer` must wait on it. It rejects when the user is logged out.
- **Storage:** IndexedDB `TidyUpYourDashboard_v3`, wrapped by `window.Database` from `setupDatabase()`. Every method takes an optional callback and also returns a Promise; failures and callback exceptions are logged. Settings are cached at `init`, and `readIndex` on the Settings name index is served from the cache. Writes update the cache when issued, and callbacks still run asynchronously. Tables are listed in `Database.Table`; only `Database.Exports` tables are included in settings export and import. Player data is cached in the `muli_wl_player` cookie for 1 hour.
- **Third-party services:** maak.ch (proxy and API), warlight-mtl.com (MDL ladder), raw.githubusercontent.com (CLOT list), communitylevels.online. Any of these can be down, so every request needs a `.fail()` handler. maak.ch and warlight-mtl.com send no CORS headers, so under `@grant none` they can only be reached through maak.ch's JSONP endpoints, which run as code on war.app. Everything that calls maak.ch is reachable only through `setupMaakFeatures()`, behind the `useMaakServices` setting (off by default), and a test enforces this. Prefer war.app's own pages for new data. They're same-origin, so parse them with `DOMParser`, never `$(html)`, so their scripts and images stay inert.

## Tests

`test/harness.js` parses the userscript with acorn and evaluates individual top-level function declarations in a `vm` sandbox. Loading the whole file would run page setup. Each test passes in only the globals the function under test needs. Common ones are `$` (npm jQuery 1.11.2 bound to a jsdom window, via `createDom()` and `domGlobals()`), `log`, `Database` and `location`.

- `test/startup.test.js` checks statically that every called or feature-registered function exists. If it flags a new site or browser global, add that name to its allowlist.
- A function becomes testable once it is a **top-level `function` declaration**. Inline logic in `databaseReady()` or `DOM_ContentReady()` has to be extracted first, as was done with `setupBlacklistCounter()`.
- Values created in the sandbox come from another realm. Copy arrays with `Array.from` or a JSON round-trip before using `deepStrictEqual`.
- jsdom has no layout. The harness patches `offsetWidth` so jQuery's `:visible` respects `display: none`.

## Conventions

- When bumping the version, update `@version`, the `GM_info` fallback near the top of the script, and the version line in `README.md` together. A test checks that they match.
- `@downloadURL` and `@updateURL` must point at this repo's raw file, not Greasy Fork. Otherwise upstream releases overwrite this fork.
- Escape third-party and user-supplied strings with `htmlEscape()` before putting them into HTML. URLs from outside (API data, bookmarks) go through `htmlEscape(safeUrl(url))`; `safeUrl` allows only `http(s)://` and same-site `/` paths. `test/security.test.js` covers each renderer with an injection payload, so add a case there when adding a new one.
- Every `@require` must carry a `#sha256-` hash. A test enforces this.
- `ROADMAP.md` tracks planned work. Tick items off there when they land.

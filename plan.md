# Improve and Fix Userscript for war.app

Comprehensive audit identified several broken features, deprecated patterns, and fragile third-party integrations. All third-party APIs (maak.ch, warlight-mtl.com, CLOT GitHub, communitylevels.online) are still alive (HTTP 200). The war.app site still includes `$.cookie`/`$.removeCookie` in its `merged.js`, so cookie usage works. However, `system_linq_Enumerable` and `wljs_AllOpenGames` are no longer available as global JS variables, breaking the open games counter.

File: [Tidy_up_your_Dashboard.user.js](Tidy_up_your_Dashboard.user.js)

---

## 1. Fix Broken: Open Games Counter (CRITICAL)

The `updateOpenGamesCounter()` function (line ~3429) and `countGames()` (line ~3443) rely on two globals that no longer exist:
- `wljs_AllOpenGames` -- was a JS object, now the data is a binary hex blob in `<script type="text/plain" id="AllOpenGamesData">`
- `system_linq_Enumerable.Where` / `.ToArray` -- LINQ library removed from site JS

**Fix:** Guard both functions with existence checks. If the globals are unavailable, skip the counter update gracefully rather than throwing errors. Wrap in try/catch:

```js
function updateOpenGamesCounter() {
    if (typeof wljs_AllOpenGames === 'undefined' || typeof system_linq_Enumerable === 'undefined') {
        return;
    }
    // ... existing code ...
}
```

## 2. Fix Broken: `loadPlayerData()` Synchronous Ajax (line ~67)

`$.ajax` with `async: false` blocks the main thread and is deprecated by all major browsers (console warnings, may be removed in future). Also, if the profile URL selector `$(".dropdown-menu a[href*='Profile']")` returns nothing (not logged in), it will fail.

**Fix:**
- Add a guard: if the profile link element is not found, skip loading
- Replace `async: false` with proper async flow using callbacks/promises, or at minimum keep `async: false` but wrap in try/catch to prevent script crash

## 3. Fix: `loadClots()` uses `eval()` (line ~1170)

The CLOT data loads a JSONP-like response and uses `eval(response)` which is an XSS risk.

**Fix:** Replace `eval()` with safe JSON parsing. The response from the GitHub raw URL is text/JSONP -- parse it by stripping the callback wrapper and using `JSON.parse` instead of eval. Add try/catch around it (already partially there).

## 4. Modernize: Replace `.bind()` with `.on()` (3 locations)

`.bind()` is deprecated since jQuery 3 (script uses 1.11 but this is still best practice):
- Line ~1091: `$("#BookmarkTable").bind("contextmenu", ...)`
- Line ~2761: `$("#ForumTable").bind("contextmenu", ...)`
- Line ~3453: `$(document).bind("mousedown", ...)`

**Fix:** Replace `.bind(` with `.on(` and `.unbind(` with `.off(` everywhere.

## 5. Modernize: Add Defensive Error Handling for Third-Party APIs

All `$.ajax` calls to external services (maak.ch, warlight-mtl.com, GitHub) lack `.fail()` handlers in most cases, or have minimal error logging. If any API goes down, the script silently breaks.

**Fix:** Add `.fail()` with `log()` to every `$.ajax` call that doesn't have one:
- `loadMtlPlayer()` (line ~190) -- no fail handler
- `setupMtlProfile()` (line ~206) -- no fail handler
- `getMtlGamesTable()` (line ~316) -- no fail handler
- `getMtlPlayerTable()` (line ~358) -- no fail handler
- `loadCommunityLevelRecords()` (line ~2377) -- no fail handler
- `parseSPLevel()` (line ~3658) -- no fail handler
- `validateUser()` (line ~3077) -- no fail handler

## 6. Modernize: Guard Access to Site Globals

The script references several globals from the war.app site that may or may not be available:
- `wljs_WaitDialogJS` -- stubbed, then overwritten by site. Add guard before calling `.Start()`/`.Stop()`
- `CNCDialog`, `PopErrorDialog`, `ReportError` -- used in `WLError` handler. Wrap in `typeof` checks
- `wljs_AllOpenGames`, `system_linq_Enumerable` -- guard as described in item 1

**Fix:** Wrap all external global references in `typeof !== 'undefined'` checks.

## 7. Modernize: Replace `Array.prototype.unique` Monkey-Patch (line ~2197)

Global prototype modification is dangerous and can conflict with other scripts or site JS.

**Fix:** Replace with a local utility function `function uniqueArray(arr)` and update call sites.

## 8. Add `@grant GM_info` for Robustness (line ~4)

The script uses `GM_info.script.version` (lines 22, 1419, 3579) but has `@grant none`. While Tampermonkey often injects `GM_info` regardless, explicitly declaring it is more robust and follows best practices.

**Fix:** Keep `@grant none` (changing to `GM_info` would sandbox the script and break `$.cookie` access on the host page). Instead, wrap `GM_info` usage in a guard:

```js
var version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '3.4.4';
```

## Summary of Changes

- **2 broken features** fixed (open games counter, sync ajax guard)
- **1 security fix** (eval -> JSON.parse)
- **3 deprecated calls** updated (bind -> on)
- **7 API calls** get fail handlers
- **5+ global references** get safety guards
- **1 prototype pollution** cleaned up
- **1 Tampermonkey API** guarded

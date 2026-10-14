# Tidy Up Your Dashboard

A feature-rich userscript for [War.app](https://war.app) (formerly Warzone) that enhances the UI, adds search/sort capabilities, and brings quality-of-life improvements across the site.

> **Version:** 3.14.2  
> **Requires:** [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)  
> **Supported sites:** `war.app`, `warzone.com` and their subdomains

## Credits

Tidy Up Your Dashboard was created by [Muli](https://war.app/Profile?p=2211733141), who first released it in April 2015 and maintained it for years. This repository is a fork that keeps it working on today's war.app. The original script and its history are in [Muli's forum thread](https://www.warzone.com/Forum/106092).

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox) or a compatible userscript manager.
2. Open [`Tidy_up_your_Dashboard.user.js`](Tidy_up_your_Dashboard.user.js) and click **Raw** — your userscript manager will prompt to install.
3. Navigate to [war.app](https://war.app) and the script loads automatically.

## Features

### Dashboard

- **Redesigned layout** with fixed header, scrollable game area, and tabbed My / Open / Past games.
- **Quick refresh** — press **R** or click the refresh button to reload all game tables (throttled to prevent spam). One request refreshes both tables, and the My Games and open-games counts stay current.
- **Auto-refresh on tab focus** — optionally reload games when returning to the tab after 30+ seconds of inactivity.
- **Your-turn alerts** — the tab title shows how many games are waiting for you, e.g. `(2) Multi-Player Dashboard`. While the dashboard tab is open but not in focus, it re-checks your games every 5 minutes, and can show a desktop notification when a game becomes your turn (opt-in setting).
- **Open Games filter** — a **Filter** link in the Open Games header (dashboard and View All page) hides Auto Games, coin games, games with a boot time under a number of hours you set, and games whose name contains any of your keywords (whole words, comma-separated). The header shows how many games are hidden.
- **Boot-time sorting** — games where it's your turn are ordered by time left before you're booted (boot time plus bank, minus how long it's been your turn), most urgent first. Other games keep their place.
- **Joined games marked** — Open Games rows where you hold a seat (or are invited) get a green **Joined** badge.
- **Vacation banner** — displays a notice when your account is on vacation.
- **Clickable game rows** — entire rows are clickable, not just the link text.
- **Tournament invite highlighting** — optional colored background on tournament invite rows.
- **Forum thread hiding** — right-click any forum thread on the dashboard to hide it; hidden threads persist across sessions.
- **Tournament inviter capture** — records who invited you to each tournament for later display on the tournament page.
- **Sortable right-column tables** — reorder and toggle visibility of Bookmarks, Open Tournaments, Map of the Week, Forum, Clan Forum, Blog, and other sidebar blocks.

### Bookmarks

- **Custom bookmark table** in the dashboard sidebar.
- **Add / edit / delete / reorder** bookmarks with a modal dialog.
- **Quick-bookmark** forum threads, tournaments, and community levels directly from their pages.
- **Open in new window** option per bookmark.

### Tournaments

- **Player search & sort** — a toolbar at the top right of the Players tab: search players by name (matches move to the top of the list) and sort by wins, losses, or name.
- **Finding yourself in the bracket** is built into war.app now: use **Find...** and **>** on the Bracket tab.
- **Tournament inviter display** — shows who invited you next to "Created by" (data captured from the dashboard).
- **Bookmark link** — quick-save a tournament to your bookmarks.

### Clans

- **Clan list search** — live text filter on the `/Clans/List` page with match count.

### Profile

- **Collapsible stat sections** — click any section header to expand/collapse.
- **MTL ladder stats** *(opt-in, via maak.ch)* — shows your best/current rank and rating from the community [Multi-Template Ladder](https://www.warlight-mtl.com/) (MTL).
- **Community level records** *(opt-in, via maak.ch)* — displays your community level record count.
- **Private notes** — loads your private notes from the Discussion/Notes page directly onto your profile.
- **Cleaner layout** — collapses excessive blank lines.

### Forum

- **Auto-hide threads** — optionally hide Off-Topic and Idle category threads from forum listings.
- **Spammers Be Gone** — per-thread hide button (eye icon) on forum overview pages.
- **BBCode editor toolbar** — adds formatting buttons (bold, italic, code, image, quote, list, etc.) above reply textareas.
- **Tab key support** — inserts a tab character in textareas instead of moving focus.
- **Community level previews** — single-player level links in forum posts are expanded into info cards, read from the level's page on war.app.
- **MTL rankings in ladder threads** *(opt-in, via maak.ch)* — MTL-themed forum threads get a live rankings + recent games table below the reply area.

### Mail

- **Filter by player** — a search box on your mail page shows only threads started or last answered by a given player. The first search loads all pages of your mail, so it covers the whole mailbox.

### Maps & Levels

- **Map search** — text filter on the maps listing page with result count.
- **Level bookmarking** — quick-save link on community level pages.
- **Community levels banner** — points users to communitylevels.online for advanced searching.

### Common Games

- **DataTables integration** — sortable/searchable table on the Common Games page.
- **Head-to-Head summary** — shows 1v1 record (wins, losses, win rate) against the other player.

### Points

- **Total lifetime points** — calculates and displays your all-time earned points based on level thresholds.

### Block List

- **Player count** — shows how many players are on your block list with a live counter.
- **Search** — a search box above the list filters players by name, ignoring case and accents.

## Settings

Access settings via the **Muli's Userscript** entry in your account dropdown menu, or click the version label in the bottom-right corner.

| Setting | Default | Description |
|---------|---------|-------------|
| Fixed Window with Scrollable Games | On | Use tabbed layout with scrollable game area |
| Hide Icons in "My Games" | Off | Remove game type icons from the games list |
| Auto Refresh on Focus | Off | Reload games when returning to the tab after 30s |
| Highlight Tournament Invites | Off | Color tournament invite rows on the dashboard |
| Hide Coins Globally | Off | Remove coin-related UI elements site-wide |
| Use Default Boot Time Label | Off | Use the site's default boot time styling |
| Show Private Notes on Profile | On | Display private notes on your profile page |
| Auto-Hide Off-Topic Threads | Off | Automatically hide Off-Topic forum threads |
| Auto-Hide Idle Threads | Off | Automatically hide War.app Idle forum threads |
| Disable Right-Click Hide on Dashboard | Off | Disable the right-click-to-hide-thread feature |
| Desktop Notification When a Game Needs You | Off | Show a desktop notification when a game becomes your turn while the dashboard tab is open in the background. Your browser asks for permission when you turn it on. |
| Load MTL Ladder and Community Level Records (via maak.ch) | Off | Enables the features that load data from maak.ch, a server run by the original script author. Its responses run as code on war.app, so it is off by default. |

The settings menu also has a **Features** section with a switch for each individual feature, grouped by area (Dashboard, Forum, Tournaments, Profile, and so on), so you can turn off anything you don't want. Changes apply after **Close & Refresh**.

Settings also include **Import / Export** (Base64-encoded backup of bookmarks, settings, and hidden threads) and **Reset Hidden Threads**.

## Data Storage

- **IndexedDB** (`TidyUpYourDashboard_v3`) — bookmarks, settings, hidden forum threads, tournament inviter data.
- **Cookies** — cached player profile data (~1 hour TTL).


## If war.app changes its domain

The script doesn't depend on the domain: links are relative, page detection only looks at the path, and bookmarks saved on an older domain open on the current one. A new domain only needs a new `@match` line in the script header (and an entry in `SITE_HOSTS`).

Your browser keeps settings, bookmarks and hidden threads separately for each domain, so on a new domain the script starts empty. To bring them along, open the settings menu on the old domain and use **Export**, then use **Import** on the new one.

## Dependencies

Loaded via `@require` in the userscript header:

- [jQuery 1.11.2](https://jquery.com/)
- [jQuery UI 1.11.3](https://jqueryui.com/)
- [DataTables 1.10.21](https://datatables.net/)

## Development

```bash
git clone git@github.com:pdxLife/warlight-muli-script.git
cd warlight-muli-script
```

The script is a single file: `Tidy_up_your_Dashboard.user.js`. Edit it directly and reload in your userscript manager to test changes.

## License

This project is provided as-is for personal use with War.app.

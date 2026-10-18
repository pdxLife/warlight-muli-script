# Tidy Up Your Dashboard

A feature-rich userscript for [War.app](https://war.app) (formerly Warzone) that enhances the UI, adds search/sort capabilities, and brings quality-of-life improvements across the site.

> **Version:** 3.24.0  
> **Requires:** [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)  
> **Supported sites:** `war.app` and its subdomains (warzone.com and warlight.net now redirect there)

## Credits

Tidy Up Your Dashboard was created by [Muli](https://war.app/Profile?p=2211733141), who first released it in April 2015 and maintained it for years. This repository is a fork that keeps it working on today's war.app. The original script and its history are in [Muli's forum thread](https://war.app/Forum/106092).

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox) or a compatible userscript manager.
2. Open [`Tidy_up_your_Dashboard.user.js`](Tidy_up_your_Dashboard.user.js) and click **Raw** — your userscript manager will prompt to install.
3. Navigate to [war.app](https://war.app) and the script loads automatically.

The script is for war.app in a desktop browser. It doesn't run in war.app's phone app, and war.app sends phone browsers on most multiplayer pages to its app page. A narrow desktop window works: additions follow war.app's compact layout or step aside where there's no room.

## Features

### Dashboard

- **Redesigned layout** with fixed header, scrollable game area, and tabbed My / Open / Past games.
- **Quick refresh** — press **R** or click the refresh button to reload all game tables (throttled to prevent spam). One request refreshes both tables, and the My Games and open-games counts stay current.
- **Auto-refresh on tab focus** — optionally reload games when returning to the tab after 30+ seconds of inactivity.
- **Community event badges** — My Games rows that belong to a community event get a small badge in their top-right corner with the series' name, linking to that event: blue for [custom.wl-stats.com](https://custom.wl-stats.com) events ("Nations Cup", "P/R League", "Titled Tuesday"), gold for the [AWP World Tour](https://awp.wl-stats.com) ("AWP Tour"). Hover a badge for the details, e.g. "Nations Cup 2026 · Group C".
- **Your-turn alerts** — the tab title shows how many games are waiting for you, e.g. `(2) Multi-Player Dashboard`. While the dashboard tab is open but not in focus, it re-checks your games every 5 minutes, and can show a desktop notification when a game becomes your turn (opt-in setting).
- **Open Games filter** — a **Filter** link in the Open Games header (dashboard and View All page) hides Auto Games, coin games, games with a boot time under a number of hours you set, and games whose name contains any of your keywords (whole words, comma-separated). The header shows how many games are hidden.
- **Boot-time sorting** — games where it's your turn are ordered by time left before you're booted (boot time plus bank, minus how long it's been your turn), most urgent first. Other games keep their place.
- **Joined games marked** — Open Games rows where you hold a seat (or are invited) get a green **Joined** badge.
- **Vacation banner** — displays a notice when your account is on vacation.
- **Clickable game rows** — entire rows are clickable, not just the link text.
- **Forum thread hiding** — right-click any forum thread on the dashboard to hide it; hidden threads persist across sessions.
- **Sortable right-column tables** — reorder and toggle visibility of Bookmarks, Map of the Week, Forum, Clan Forum, Blog, and other sidebar blocks.

### Bookmarks

- **Custom bookmark table** in the dashboard sidebar.
- **Add / edit / delete / reorder** bookmarks with a modal dialog.
- **Quick-bookmark** forum threads, tournaments, and community levels directly from their pages.
- **Open in new window** option per bookmark.

### Tournaments

- **Player search & sort** — a toolbar at the top right of the Players tab: search players by name (matches move to the top of the list) and sort by wins, losses, or name.
- **Finding yourself in the bracket** is built into war.app now: use **Find...** and **>** on the Bracket tab.
- **Bookmark link** — quick-save a tournament to your bookmarks.
- **custom.wl-stats.com link** — on a tournament that [custom.wl-stats.com](https://custom.wl-stats.com) has read (Titled Tuesday, War Gaming Live and P/R League groups played as war.app tournaments), links its page there and its series, next to "Created by".

### Ladders

- **Community ladders & leagues** — a panel below war.app's four ladders on the Ladders page, in war.app's own style with blue buttons instead of green, in two lists: **Players** and **Clans & nations**. On a wide window it's wider than war.app's ladders and the two lists sit side by side. It shows the [AWP World Tour](https://awp.wl-stats.com) race and every series [custom.wl-stats.com](https://custom.wl-stats.com) is running or recently finished (P/R League, the Seasonal Ladder, Titled Tuesday; Clan League first among the clan series, then Clan Cup and Nations Cup): the current season, how far it is, its leader or winner, Titled Tuesday's next start in your time zone with a countdown, and your own line when you're signed in (your place, record and points, or your clan's or country's). A series taking signups says until when and links to signing up.
- **Standings on Community Events** — on war.app's Community Events page, each card for an event on [awp.wl-stats.com](https://awp.wl-stats.com) or [custom.wl-stats.com](https://custom.wl-stats.com) (AWP World Tour, Nations Cup, Clan Cup, Clan League, Titled Tuesdays) shows the current edition at the top right (running or finished, size, progress, leader or winner; the AWP race with a "Rankings: Top 16" link), and beside "You can join!" your place when you take part, or a link to the full standings or to signing up. Hidden when the cards are too narrow for it.

### Clans

- **Clan list search** — live text filter on the `/Clans/List` page with match count.
- **Community events on clan pages** — below the Clan Wars box, a "Community events" box with the clan's standing in each current custom.wl-stats.com series (Clan League first, then Clan Cup, …): place, record and points. For Clan Cup, where a clan can enter up to five squads, it shows the clan's best squad. The clan's last Clan League shows even when it finished long ago, and a clan that won Clan League or Clan Cup gets a gold "🏆 Champion ×N" line listing those editions.

### Profile

- **Collapsible stat sections** — click any section header to expand/collapse.
- **AWP World Tour stats** — for a player who has played on the [AWP World Tour](https://awp.wl-stats.com), a box with their place in this year's race and in the 12-month ranking, games and win rate, tournaments, titles and best placement, with a link to their page on awp.wl-stats.com.
- **Community tournament stats** — for a player [custom.wl-stats.com](https://custom.wl-stats.com) knows, a "Community tournaments" box below the AWP one: games and win rate, tournaments, titles, best placement, tournaments organized, and their record in their three most played formats (e.g. Clan league, Single elimination, Nations Cup), with a link to their page there.
- **MTL ladder stats** *(opt-in, via maak.ch)* — shows your best/current rank and rating from the community [Multi-Template Ladder](https://www.warlight-mtl.com/) (MTL).
- **Community level records** *(opt-in, via maak.ch)* — displays your community level record count.
- **Private notes** — on another player's profile, shows the private note you keep about them on war.app (the profile's "Private Notes" link). The notes are stored by war.app on your account; the script only displays them.
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
- **Filter by words** — threads with all the words you type, in the subject (the default) or in the first 15 words of each thread's opening message. Searching the first words opens every thread once (about half a minute for 400 threads) and keeps those words in this browser's storage on war.app, so later searches are instant.
- **Filter by date** — "Last post from … to …", either date optional. All the mail filters combine.

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
| Hide Coins Globally | Off | Remove coin-related UI elements site-wide |
| Use Default Boot Time Label | Off | Use the site's default boot time styling |
| Show Private Notes on Profile | On | Display private notes on your profile page |
| Auto-Hide Off-Topic Threads | Off | Automatically hide Off-Topic forum threads |
| Auto-Hide Idle Threads | Off | Automatically hide War.app Idle forum threads |
| Disable Right-Click Hide on Dashboard | Off | Disable the right-click-to-hide-thread feature |
| Desktop Notification When a Game Needs You | Off | Show a desktop notification when a game becomes your turn while the dashboard tab is open in the background. Your browser asks for permission when you turn it on. |
| Load MTL Ladder and Community Level Records (via maak.ch) | Off | Enables the features that load data from maak.ch, a server run by the original script author. Its responses run as code on war.app, so it is off by default. |

The menu is split into foldable sections by area: Dashboard, Tournaments, Ladders & community, Profile, Clans, Forum, Maps & levels, Other, Third-party data and Backup. Each holds that area's settings and a switch for each of its features, so you can turn off anything you don't want. Click a heading to fold or unfold it; the menu remembers which ones you left open. The search box at the top finds any setting or feature by name. The title links to the project's [website](https://pdxlife.github.io/warlight-muli-script/) and GitHub. Changes apply after **Close & Refresh**.

Settings also include **Import / Export** (Base64-encoded backup of bookmarks, settings, and hidden threads) and **Reset Hidden Threads**.

**Updates:** once a day the script checks GitHub for a newer version. When there is one, the small version label in the bottom-right corner turns into a gold **Update to …** link; clicking it opens Tampermonkey's update screen. Nothing else on the page changes. Tampermonkey also updates the script by itself on its own schedule.

## Data Storage

- **IndexedDB** (`TidyUpYourDashboard_v3`) — bookmarks, settings and hidden forum threads. (Its `TournamentData` store held captured tournament inviters and is no longer used.)
- **Cookies** — cached player profile data (~1 hour TTL).
- **Session storage** — AWP World Tour stats and custom.wl-stats.com tournament links, kept for an hour.

## Other sites the script contacts

- **GitHub** (raw.githubusercontent.com): once a day, the script reads its own file there to see whether a newer version is out. No player data is sent.
- **awp.wl-stats.com**: when you open a profile, the script asks it for that player's AWP World Tour stats, which sends the player's ID. On the Ladders page it loads the whole AWP ranking and finds your place in it on your side, so your ID isn't sent.
- **custom.wl-stats.com**: when you open a profile, the script asks it for that player's community tournament stats, which sends the player's ID. On the dashboard both wl-stats sites are asked which of your games belong to their events (your player ID, kept 5 minutes), and on a clan page it asks for that clan's series (the clan's name). When you open a tournament, the script asks whether that tournament has a page there, which sends the tournament's ID. On the Ladders and Community Events pages it asks for the current series, with your player ID when you're signed in, so it can show your place; that answer is kept for 10 minutes.

Both are plain data requests: no war.app cookies or login are sent, and nothing in the answer runs as code. Their switches are in Features (Dashboard, Profile, Tournaments, Clans and Community). maak.ch is contacted only if you turn on its setting.


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

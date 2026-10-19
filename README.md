# Tidy Up Your Dashboard

A feature-rich userscript for [War.app](https://war.app) (formerly Warzone) that enhances the UI, adds search/sort capabilities, and brings quality-of-life improvements across the site.

> **Version:** 3.41.3  
> **Requires:** [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)  
> **Supported sites:** `war.app` and its subdomains (warzone.com and warlight.net now redirect there)

## Credits

Tidy Up Your Dashboard was created by [Muli](https://war.app/Profile?p=2211733141), its original creator, who first released it in April 2015 and maintained it for years. This version is maintained by [KKND](https://war.app/Profile?p=2921525624): it keeps the script working on today's war.app and adds to it. If something breaks, tell KKND (in the [forum thread](https://war.app/Forum/897130-mulis-userscript-update), a war.app mail, or a [GitHub issue](https://github.com/pdxLife/warlight-muli-script/issues)), not Muli. The original script and its history are in [Muli's forum thread](https://war.app/Forum/106092).

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox) or a compatible userscript manager.
   - **Chrome, Edge, Brave and other Chrome-based browsers:** also open the extensions page (`chrome://extensions`, or `edge://extensions` in Edge), click **Details** on Tampermonkey and turn on **Allow User Scripts**. Without it, Tampermonkey shows the script as enabled but it doesn't run. Firefox doesn't need this.
2. Open [`Tidy_up_your_Dashboard.user.js`](Tidy_up_your_Dashboard.user.js) and click **Raw** — your userscript manager will prompt to install.
3. Navigate to [war.app](https://war.app) and the script loads automatically.

A step-by-step guide to every feature is on the website: https://pdxlife.github.io/warlight-muli-script/guide.html

The script is for war.app in a desktop browser; it's used in Firefox, Zen and Chrome. It doesn't run in war.app's phone app, and war.app sends phone browsers on most multiplayer pages to its app page. A narrow desktop window works: additions follow war.app's compact layout or step aside where there's no room.

## Features

### Dashboard

- **Redesigned layout** with fixed header, scrollable game area, and tabbed My / Open / Past games.
- **Quick refresh** — press **R** or click the refresh button to reload all game tables (throttled to prevent spam). One request refreshes both tables, and the My Games and open-games counts stay current.
- **Open Games refreshes by itself** every 5 minutes while it's on screen (not while your pointer is over it or the Filter panel is open). Change the minutes, or 0 for off, in the Open Games Filter panel.
- **Auto-refresh on tab focus** — optionally reload games when returning to the tab after 30+ seconds of inactivity.
- **Community event badges** — My Games rows that belong to a community event get a small badge in their top-right corner with the series' name, linking to that event: blue for [custom.wl-stats.com](https://custom.wl-stats.com) events ("Nations Cup", "P/R League", "Titled Tuesday"), gold for the [AWP World Tour](https://awp.wl-stats.com) ("AWP Tour"). Hover a badge for the details, e.g. "Nations Cup 2026 · Group C".
- **Your-turn alerts** — the tab title shows how many games are waiting for you, e.g. `(2) Multi-Player Dashboard`. While the dashboard tab is open but not in focus, it re-checks your games every 5 minutes, and can show a desktop notification when a game becomes your turn (opt-in setting).
- **Open Games filter** — a **Filter** link in the Open Games header (dashboard and View All page) hides Auto Games, coin games, games with a boot time under a number of hours you set, games whose name contains any of your keywords (whole words, comma-separated), games with fewer or more seats than you set, team games (or everything but team games), and games with settings you pick from a list (Commerce, local deployments, manual distribution, cards, wastelands, fog, no-split and more, read from the game's setting icons). The header shows how many games are hidden.
- **Boot-time sorting** — games where it's your turn are ordered by time left before you're booted (boot time plus bank, minus how long it's been your turn), most urgent first. Other games keep their place.
- **Joined games marked** — Open Games rows where you hold a seat (or are invited) get a green **Joined** badge.
- **Vacation banner** — displays a notice when your account is on vacation.
- **Chat button** — a **Chat** button opens war.app's chat rooms (Global, Clan, groups) without going through a game. With the scrollable layout, Chat and **Refresh (R)** sit on the My / Open / Past Games row, lined up with the Filter button below.
- **A game's chat from the dashboard** — **💬 Chat** on each game in My Games opens that game's Public (and Team) chat in a panel on the dashboard, where you can also write. It shows the last 20 messages; **Show all** loads the rest. The game loads hidden behind the dashboard, so it takes as long as opening the game, but you stay where you are.
- **Clickable game rows** — entire rows are clickable, not just the link text.
- **Forum thread hiding** — right-click any forum thread on the dashboard to hide it; hidden threads persist across sessions.
- **Sortable right-column tables** — reorder and toggle visibility of Bookmarks, Map of the Week, Forum, Clan Forum, Blog, and other sidebar blocks.

### Games

- **Notes in a game** — a **Notes** button next to war.app's Game button on a game's page (left of the Chat tab while the chat is open) opens your private notes for that game: general notes, which turns you move first on (odd or even; the panel then says "Turn 7: you move first"), and a note for each other player. Notes save as you type, only you see them, and the button shows a gold dot on games that have notes. They're kept with your settings, so Export / Import carries them.
- **Past Games filters** — a bar above the list on Past Games: search by game or player name, show only games in progress, your turn, lobbies, finished games or games you're out of (surrendered, booted…), only real-time or multi-day games, by map (by name, with a count per map), 1 v 1 or more than two players, players from–to, and reverse the order. The bar shows "12 of 25 shown". It filters the games on the current page; war.app's "Number per page" goes up to 200.
- **The whole chat in a game** — when a game's chat has older messages behind war.app's "Load Older Messages" or "Older Chat" button, the script presses it for you until the whole chat is there, then returns to the newest message. With war.app's App Settings → **Chat Dialog** checked, war.app loads a page at a time (the script keeps pressing, up to 20 times) and opens long chats (300+) in a dialog; unchecked, one press loads everything.
- **Read chat aloud** — a faint 🔊 at the left of each message in a game's chat reads it and the messages after it aloud, with your browser's own voice (who wrote it, then the text; links are read as "a link" and smileys as words). Click ■ to stop. With the setting **Read New Chat Messages Aloud** on, new messages from other players are read as they arrive, so you can listen while entering orders. Messages from players on your block list are never read.
- **Private chat list** — in a game, the Private button's "select the player you'd like to chat privately with" list shows the players still in the game first, A to Z, then a gold line and the players who are out (eliminated, booted, surrendered, removed or declined), dimmed. In big games you no longer scroll past players who left long ago.
- **Player pace in lobbies** — in a game's lobby, each player gets a line from their profile: multi-day games they're in, average multi-day turn, share of turns over a day, and boot rate. **Flag: avg turn > N h · booted > N %** marks slower or often-booted players with a red ⚠, so the host can remove them with war.app's Add/Remove Players. Real-time lobbies (boot time of an hour or less) show real-time turns instead, with a limit in minutes.
- **Ask before committing** (setting, off by default) — pressing Commit, or Autopilot's Run+Commit, first asks "Commit your orders for this turn?", so a stray click or tap doesn't send unfinished orders.

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
- **Standings on Community Events** — on war.app's Community Events page, each card for an event on [awp.wl-stats.com](https://awp.wl-stats.com) or [custom.wl-stats.com](https://custom.wl-stats.com) (AWP World Tour, Nations Cup, Clan Cup, Clan League, Titled Tuesdays) shows the current edition at the top right (running or finished, size, progress, leader or winner; the AWP race with a "Rankings: Top 16" link), and beside war.app's "You can join!" your place when you take part, or a link to the full standings or to signing up. Where you take part, "You can join!" itself becomes "You're in!", "You're signed up!", "You took part" or, on AWP World Tour, "You're in the race!". Hidden when the cards are too narrow for it.
- **Your rank on Quickmatch leaderboards** — on Quickmatch → Leaderboards, next to war.app's "Your rating: 1,309.8", your place: "Rank #104 of 190,968", for Global and for each template you pick. war.app only lists the players 50 at a time, so the script looks your rating up page by page, halving the range each time (about a dozen requests, a few seconds), and remembers the answer for 10 minutes. "≈" means your name wasn't on the page with your rating, so the rank counts the players rated above it.

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

### Chat rooms

On war.app's chat rooms (Global, Clan and your groups), a small bar right of the tabs (below them in a narrow window):

- **Search chat**: type a word or a player's name and only the messages that have it stay, with "N found"; clear the box to see everything.

- **Hide events** (on by default): war.app's automatic notices — "Joined the group", "Left the group", "Removed from the group due to inactivity", clan war rewards and territories — are taken out and the messages close up. The bar says how many are hidden; untick it to see them again.
- **Mute** a player without blocking them: hover their message and click 🔇. Their messages disappear from chat rooms and from game chats (where they become a faint "muted" line), and they never know. **Muted (N)** lists them, each with Unmute. Kept with your settings, so Export / Import carries the list.
- **Mentions**: messages with your name (or @name) are outlined in gold, in chat rooms and game chat; a chat tab you're not looking at shows "@2" for new messages that mention you.
- **Tagging**: type @ in a chat box (chat rooms or a game) and pick from the names of players in that chat, with the mouse, the arrows and Enter or Tab; the picked name goes in as "@Name ". While the list is open, Enter picks a name instead of sending. (Only war.app could notify the player you tag; the gold outline above is how they'd see it with this script.)
- **Read aloud**: hover a message and click 🔊 to hear it and the ones after it, as in game chat; hidden notices and muted players are skipped. With **Read New Chat Messages Aloud** on, new messages in the tab you're looking at are read as they arrive.

### Mail

- **Filter by player** — a search box on your mail page shows only threads started or last answered by a given player. The first search loads all pages of your mail, so it covers the whole mailbox.
- **Filter by words** — threads with all the words you type, in the subject (the default) or in the first 15 words of each thread's opening message. Searching the first words opens every thread once (about half a minute for 400 threads) and keeps those words in this browser's storage on war.app, so later searches are instant. The first time, a notice asks before reading, with a **Turn off** button; the setting "Mail: Search the First 15 Words of Each Thread" (Other) switches it back.
- **Filter by date** — "Last post from … to …", either date optional. All the mail filters combine.

### Player Search

- **Sorted results**: best match first (exact names, then names starting with what you typed, each by level), or by level, by name, or war.app's own order.
- **Filters**: hide level 1–2 accounts, only players in a clan, a minimum level.
- **Tags**: "You", the AWP World Tour rank ("AWP #1"), and "Blocked" for players on your block list.
- **Paste a profile link** or a player ID to open that profile; an empty search box offers your recent searches.

### Idle

Helpers for War.app Idle, in the settings menu's Idle section. They only inform and ask; nothing plays the game for you.

- **Volume slider** next to war.app's speaker icon, from 0 to 100%, for Idle's sounds only.
- **Big market purchases are checked**: when the number typed is more than your money allows (a typo like "121p", which Idle reads as 121 quadrillion, buys as many as your money allows), the script asks before buying.
- **Using a power or activating an artifact asks first**, naming it and how many you have, and saying when it would cost coins.
- **Better copies pointed out**: in the artifact window, an equipped artifact with a higher-rarity copy that isn't equipped gets a gold "Better: …" tag, and the better copy is outlined.
- **Artifact list**: a "List" button next to the artifact window's Sort box shows every artifact in a compact list, by rarity or name, with copies counted.
- **Second-tab warning** when Idle is open in another tab of the same browser, since two places at once can lose progress.
- **What a tech is missing, and its market cost**: in a tech's details box, beside each item you don't have enough of, "need 5 more ≈ ₩221M", at the cheapest of the level's markets, with the price rising as you buy the way Idle's markets do; with two or more items short, the total on the tech's name line ("all ≈ ₩248M", in red when it's more than your money). Items no market sells say so. Nothing is bought for you.
- **Time to afford** next to each upgrade you can't afford yet, and **"Best value"** on the army camp that adds the most armies per ₩.
- **Pop-up log**: a "Log" button left of the map's zoom buttons lists the last 100 pop-ups Idle showed on the map, newest first.
- **Artifact storage**: mark artifacts you never want used in the artifact List; they're dimmed and tagged "Stored", never suggested as a better copy, and activating one says so.
- **Tab-title count** of what Idle is waiting on you for (unclaimed powers, an artifact to claim, a tank ready to move, a battle, the daily bonus, the coin wheel), with an optional desktop notification while the tab is in the background.

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
| Ask Before Committing Orders | Off | In a game, Commit and Run+Commit ask first |
| Read New Chat Messages Aloud | Off | Reads new chat messages from other players aloud while a game or the chat rooms are open |
| Desktop Notification When a Game Needs You | Off | Show a desktop notification when a game becomes your turn while the dashboard tab is open in the background. Your browser asks for permission when you turn it on. |
| Load MTL Ladder and Community Level Records (via maak.ch) | Off | Enables the features that load data from maak.ch, a server run by the original script author. Its responses run as code on war.app, so it is off by default. |

The menu is split into foldable sections by area: Dashboard, Tournaments, Ladders & community, Profile, Clans, Forum, Maps & levels, Other, Third-party data and Backup. Each holds that area's settings and a switch for each of its features, so you can turn off anything you don't want. Click a heading to fold or unfold it; the menu remembers which ones you left open. The search box at the top finds any setting or feature by name. The title links to the project's [website](https://pdxlife.github.io/warlight-muli-script/) and GitHub. Changes apply after **Close & Refresh**.

Settings also include **Import / Export** (Base64-encoded backup of bookmarks, settings, and hidden threads) and **Reset Hidden Threads**.

**Updates:** once a day the script checks GitHub for a newer version. When there is one, the small version label in the bottom-right corner turns into a gold **Update to …** link; clicking it opens Tampermonkey's update screen. Nothing else on the page changes. Tampermonkey also updates the script by itself on its own schedule.

## Data Storage

- **IndexedDB** (`TidyUpYourDashboard_v3`) — bookmarks, settings (including notes in games, one row per game) and hidden forum threads. (Its `TournamentData` store held captured tournament inviters and is no longer used.)
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

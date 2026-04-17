# Tidy Up Your Dashboard

A feature-rich userscript for [War.app](https://war.app) (formerly Warzone) that enhances the UI, adds search/sort capabilities, and brings quality-of-life improvements across the site.

> **Version:** 3.4.4  
> **Requires:** [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/)  
> **Supported sites:** `war.app`, `warzone.com`

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox) or a compatible userscript manager.
2. Open [`Tidy_up_your_Dashboard.user.js`](Tidy_up_your_Dashboard.user.js) and click **Raw** — your userscript manager will prompt to install.
3. Navigate to [war.app](https://war.app) and the script loads automatically.

## Features

### Dashboard

- **Redesigned layout** with fixed header, scrollable game area, and tabbed My / Open / Past games.
- **Quick refresh** — press **R** or click the refresh button to reload all game tables (throttled to prevent spam).
- **Auto-refresh on tab focus** — optionally reload games when returning to the tab after 30+ seconds of inactivity.
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

- **Player search & sort** — search players by name and sort by wins, losses, or name in both classic HTML tables and UJS-rendered player lists.
- **Find Me** — button that highlights and scrolls to your name in brackets and player lists.
- **Tournament inviter display** — shows who invited you next to the host label (data captured from the dashboard).
- **Bookmark link** — quick-save a tournament to your bookmarks.
- **Creator highlighting in chat** — the tournament creator's messages are visually distinguished.
- **Tournament overview** — scrollable tournament list with fixed viewport height.

### Clans

- **Clan list search** — live text filter on the `/Clans/List` page with match count.
- **Load Creators** — on-demand batched fetching of clan creators with session caching; displays "by \<name\>" next to each clan.
- **Clan page creator banner** — when viewing a clan page, a styled banner shows who created the clan with a link to their profile.

### Profile

- **Collapsible stat sections** — click any section header to expand/collapse.
- **Global win rate** — calculated and appended next to your ranked games stats.
- **MDL ladder stats** — shows your best/current rank and rating from the community MDL ladder.
- **Community level records** — displays your record count from communitylevels.online.
- **Private notes** — loads your private notes from the Discussion/Notes page directly onto your profile.
- **Cleaner layout** — collapses excessive blank lines and applies background styling.

### Forum

- **Auto-hide threads** — optionally hide Off-Topic and Idle category threads from forum listings.
- **Spammers Be Gone** — per-thread hide button (eye icon) on forum overview pages.
- **BBCode editor toolbar** — adds formatting buttons (bold, italic, code, image, quote, list, etc.) above reply textareas.
- **Tab key support** — inserts a tab character in textareas instead of moving focus.
- **Community level previews** — single-player level links in forum posts are expanded into rich info cards via API.
- **MDL rankings in ladder threads** — MTL-themed forum threads get a live rankings + recent games table below the reply area.

### Maps & Levels

- **Map search** — text filter on the maps listing page with result count.
- **Rate Map link** — extra rating link on public map pages.
- **Level bookmarking** — quick-save link on community level pages.
- **Community levels banner** — points users to communitylevels.online for advanced searching.

### Ladders & Community Events

- **Community events listing** — loads CLOT (Community Lot Tournament) data from a GitHub-hosted hub; displays real-time ladders, multi-day events, and other community events with player counts.
- **Ladders page** — title updated to "Ladders & Community Events".

### Common Games

- **DataTables integration** — sortable/searchable table on the Common Games page.
- **Head-to-Head summary** — shows 1v1 record (wins, losses, win rate) against the other player.

### Points

- **Total lifetime points** — calculates and displays your all-time earned points based on level thresholds.

### Blacklist

- **Player count** — shows how many players are on your blacklist with a live counter.

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

Settings also include **Import / Export** (Base64-encoded backup of bookmarks, settings, and hidden threads) and **Reset Hidden Threads**.

## Data Storage

- **IndexedDB** (`TidyUpYourDashboard_v3`) — bookmarks, settings, hidden forum threads, tournament inviter data.
- **Cookies** — cached player profile data (~1 hour TTL).
- **Session Storage** — clan creator cache for the current browsing session.

## Dependencies

Loaded via `@require` in the userscript header:

- [jQuery 1.11.2](https://jquery.com/)
- [jQuery UI 1.11.3](https://jqueryui.com/)
- [DataTables 1.10.21](https://datatables.net/)
- [Moment.js 2.8.4](https://momentjs.com/)

## Development

```bash
git clone git@github.com:pdxLife/warlight-muli-script.git
cd warlight-muli-script
```

The script is a single file: `Tidy_up_your_Dashboard.user.js`. Edit it directly and reload in your userscript manager to test changes.

## License

This project is provided as-is for personal use with War.app.

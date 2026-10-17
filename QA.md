# UI QA checklist

A quick manual check of the script on the live site, about 10 minutes. Run it before each release and after war.app changes its layout. Unit tests (`npm test`) cover the logic; this covers what only shows on the real site.

## 1. Get the version to test

- **Released version:** Tampermonkey → Dashboard → Installed userscripts → click the script's **Last updated** date to install the latest version now. Accept the update if Tampermonkey asks you to confirm site permissions.
- **Local changes:** in Tampermonkey, open the script, paste in the local `Tidy_up_your_Dashboard.user.js`, and save.
- Reload war.app and check that the version in the settings menu title matches.

## 2. Keep the log open

- Press **Ctrl+Shift+2** on any war.app page to open the script's log. A broken feature logs `Feature "…" failed: …` there; the rest of the script keeps running, so the log is often the only sign.
- Keep the browser console open too (Cmd+Option+J in Chrome, Ctrl+Shift+J on Windows) and look for red errors.

## 3. Pages

| Page | Check |
|---|---|
| **Dashboard** `/MultiPlayer/` | "Filter" link and "N hidden" count in the Open Games header. Green "Joined" badge on open games you're in. Tab title starts with "(N)" when it's your turn. Your-turn games are ordered by time left before boot. Community games (Nations Cup, P/R League, …) have a blue badge on a line under their name (not a block over the row) that opens the event on custom.wl-stats.com, and AWP World Tour games a gold one that opens the tournament on awp.wl-stats.com; casual games have none. |
| Dashboard: press **R** | Both tables refresh. "+ Show N more open games" and "Past games / Create Game" are still there afterwards. |
| Dashboard: type "r" in the Open Games filter's keyword box | The games don't refresh. |
| Dashboard: "Show more", Multi-Day / Real-Time / Both | Rows change and the filter still applies to the new rows. |
| **Settings menu** (account dropdown → "Muli's Userscript") | Opens. Footer shows "Originally created by Muli · Forum thread", and both links open. Feature switches save after **Close & Refresh**. With an older version installed (e.g. paste in last release's file), the corner version label reads **Update to …** in gold; clicking it opens Tampermonkey's update screen. Nothing else on the page or in the menu changes. |
| **Open Games** `/MultiPlayer/OpenGames` | Filter link and Joined badges work here too. |
| **A tournament, opened from the tournaments list** (click it in `/MultiPlayer/Tournaments/`, then go back and open a second one) | Same checks as the row below, for both tournaments. war.app switches views here without loading a page. |
| **A tournament** `/MultiPlayer/Tournament?ID=…` | "Created by X \| Bookmark" on one line; Bookmark opens the add-bookmark dialog with the tournament's name. Players tab: the search box and sort sit at the top right, above the list. Click into the search box and type (don't just look at it), and pick a sort with the mouse. Searching moves matches to the top; sorting and clearing the search keep every row in its own place. The toolbar is gone on the other tabs. |
| **Tournament 66354** `/MultiPlayer/Tournament?ID=66354` (a Titled Tuesday) | "Created by … \| Bookmark \| custom.wl-stats.com (Titled Tuesday)" on one line; both links open custom.wl-stats.com. A tournament custom doesn't know shows no link and logs nothing. |
| **Ladders** `/Ladders` | "Community ladders & leagues" below the four ladders, framed like war.app's dialog, with a blue "AWP World Tour" button where the ladders have green ones: "2026 race · N players" and, when signed in, "You: #N · N points". The AWP World Tour button opens awp.wl-stats.com's rankings. Below it, a row per custom.wl-stats.com series (e.g. Clan Cup, Nations Cup, P/R League, Titled Tuesday): season, progress, leader or winner, and your line when you take part; Titled Tuesday's "Next:" is in your time zone. war.app's Seasonal Ladder row has "Season … · leader … · You: …" along its bottom edge, not overlapping its text. Signed out, there's no You line. Scroll the panel with the mouse wheel: the rows scroll, war.app's dialog doesn't. Resize the window: the panel keeps the dialog's width. In a narrow window (war.app's compact layout) the heading stays on one line, the Seasonal line moves into the panel as a row, and the rows scroll inside the panel. |
| **Community Events** `/MultiPlayer?CommunityEvents=1` | Signed in: your line at the top right of the cards for events you take part in (e.g. "Your country …: Group C · 2nd of 3 · …" on Nations Cup, "You: #N in the 2026 race" on AWP World Tour), clear of war.app's title and text. No line on cards for events you're not in, unless signups are open. |
| **A forum thread** | "Bookmark" link next to Reply. Formatting toolbar above the reply box. |
| **Forum overview** `/Forum/Forum` | The eye icon hides a thread. "Reset Hidden Threads" in the settings menu brings it back. |
| **Mail** `/Discussion/MyMail` | "Filter by player" narrows the list and shows "N of M threads". |
| **Someone else's profile** | "Private Notes" box after the feedback area: your note for a player you have one for, "You don't have any Private Notes." for one you don't. Clicking a stat heading collapses it. |
| **An AWP player's profile** (e.g. `/Profile?p=2921525624`) | "AWP World Tour" box in the left column, below Private Notes if they're shown: race and 12-month rank, games, tournaments, titles, best placement, and a link to awp.wl-stats.com. A player who never played AWP gets no box. |
| **A community player's profile** (e.g. `/Profile?p=2921525624`) | "Community tournaments" box below the AWP World Tour box: games, tournaments, titles, best placement, organized, and three format rows such as "Clan league 33–31 (52%)"; the link opens their custom.wl-stats.com page. Reload a few times: Private Notes, AWP World Tour and Community tournaments keep that order. A player custom doesn't know gets no box. |
| **Block list** `/ManageBlockList` | "You have N players on your block list." The search box narrows the list and shows "N matching" without changing the total. |
| **Common Games** ("Common Games" link on the profile of someone you've played) | Column headers sort the list. A Head-To-Head box above it shows 1v1 games, wins, losses and win rate. The account menu and its dropdowns still work on this page. |
| **Points** `/Points` | "In total, you've earned … points." |
| **Clans** `/Clans/List` | The search box filters clans. |
| **A clan in a community event** (e.g. `/Clans/?ID=33`) | "Community events" box below Clan Wars, framed like war.app's dialogs with blue buttons: one row per series the clan is in; Clan Cup shows only the clan's best squad ("1celandic Turtles: 1–0"). Scroll down to it; it stays reachable even for a clan with a short member list. In a narrower window, where war.app shows the clan page in one column (reload at that width), the box is below the member list, not over it. A clan in no current series gets no box. |
| **Maps** `/Maps` | Map search returns results. |

## 4. Narrow window

Repeat the dashboard, a tournament page and the Ladders page in a desktop browser window narrowed until war.app switches to its compact layout (it still uses the full layout at 700px), then widen it again. Overlapping or wrapped controls usually only show up there. Phones aren't covered: the script targets desktop browsers, and war.app sends phone browsers to its app page.

## 5. Reporting a problem

Copy what the Ctrl+Shift+2 log says, plus any console errors, and note the page URL and window width.

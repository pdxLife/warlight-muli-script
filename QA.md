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
| **Dashboard** `/MultiPlayer/` | "Filter" link and "N hidden" count in the Open Games header. Green "Joined" badge on open games you're in. Tab title starts with "(N)" when it's your turn. Your-turn games are ordered by time left before boot. |
| Dashboard: press **R** | Both tables refresh. "+ Show N more open games" and "Past games / Create Game" are still there afterwards. |
| Dashboard: type "r" in the Open Games filter's keyword box | The games don't refresh. |
| Dashboard: "Show more", Multi-Day / Real-Time / Both | Rows change and the filter still applies to the new rows. |
| **Settings menu** (account dropdown → "Muli's Userscript") | Opens. Footer shows "Originally created by Muli · Forum thread", and both links open. Feature switches save after **Close & Refresh**. |
| **Open Games** `/MultiPlayer/OpenGames` | Filter link and Joined badges work here too. |
| **A tournament, opened from the tournaments list** (click it in `/MultiPlayer/Tournaments/`, then go back and open a second one) | Same checks as the row below, for both tournaments. war.app switches views here without loading a page. |
| **A tournament** `/MultiPlayer/Tournament?ID=…` | "Created by X \| Bookmark" on one line; Bookmark opens the add-bookmark dialog with the tournament's name. Players tab: the search box and sort sit at the top right, above the list. Click into the search box and type (don't just look at it), and pick a sort with the mouse. Searching moves matches to the top; sorting and clearing the search keep every row in its own place. The toolbar is gone on the other tabs. |
| **Tournament 66354** `/MultiPlayer/Tournament?ID=66354` (a Titled Tuesday) | "Created by … \| Bookmark \| custom.wl-stats.com (Titled Tuesday)" on one line; both links open custom.wl-stats.com. A tournament custom doesn't know shows no link and logs nothing. |
| **Ladders** `/Ladders` | "Community ladders & leagues" below the four ladders, framed like war.app's dialog, with a blue "AWP World Tour" button where the ladders have green ones: "2026 race · N players" and, when signed in, "You: #N · N points". The AWP World Tour button opens awp.wl-stats.com's rankings. Signed out, there's no You line. Resize the window: the panel keeps the dialog's width. At phone width the heading stays on one line and the row scrolls inside the panel if it doesn't fit. |
| **A forum thread** | "Bookmark" link next to Reply. Formatting toolbar above the reply box. |
| **Forum overview** `/Forum/Forum` | The eye icon hides a thread. "Reset Hidden Threads" in the settings menu brings it back. |
| **Mail** `/Discussion/MyMail` | "Filter by player" narrows the list and shows "N of M threads". |
| **Someone else's profile** | "Private Notes" box after the feedback area: your note for a player you have one for, "You don't have any Private Notes." for one you don't. Clicking a stat heading collapses it. |
| **An AWP player's profile** (e.g. `/Profile?p=2921525624`) | "AWP World Tour" box in the left column, below Private Notes if they're shown: race and 12-month rank, games, tournaments, titles, best placement, and a link to awp.wl-stats.com. A player who never played AWP gets no box. |
| **Block list** `/ManageBlockList` | "You have N players on your block list." The search box narrows the list and shows "N matching" without changing the total. |
| **Common Games** ("Common Games" link on the profile of someone you've played) | Column headers sort the list. A Head-To-Head box above it shows 1v1 games, wins, losses and win rate. The account menu and its dropdowns still work on this page. |
| **Points** `/Points` | "In total, you've earned … points." |
| **Clans** `/Clans/List` | The search box filters clans. |
| **Maps** `/Maps` | Map search returns results. |

## 4. Narrow window

Repeat the dashboard and a tournament page with the window narrowed to phone width. war.app's layout changes there, and overlapping or wrapped controls usually only show up in that view.

## 5. Reporting a problem

Copy what the Ctrl+Shift+2 log says, plus any console errors, and note the page URL and window width.

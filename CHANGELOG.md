# Changelog

## 3.50.0

- **Game notes: war.app's link shortcut.** In war.app's chat, Ctrl+click (Cmd+click on a Mac) or Shift+click on a territory links it. With your notes open, the same click puts the territory's name into the notes, with the chat open or closed, and does nothing else in the game; keep the key held to add several. Plain clicks work as usual. The 🔗 in the notes stays.

## 3.49.1

- **Game notes: 🔗 works with the chat closed.** The notes' 🔗 now uses war.app's own "next territory click" hook: click it, then a territory on the map (or a bonus link), and its name goes into your notes; the click does nothing else in the game. It says "Click a territory or bonus" while it waits; click 🔗 again, or close the notes, to stop waiting. Before, it pressed the chat's link button, which war.app only listens to while the chat is open. If war.app renames that hook, it falls back to the chat's button.

## 3.49.0

- **Game notes: link territories, as in the chat.** While your notes are open, war.app's chat link button (🔗 next to Send) puts the territory or bonus you click into your notes, at the cursor, instead of into the chat; with the notes closed it goes to the chat as before. The notes have a 🔗 of their own, in their title line, that starts the same war.app link mode, so the chat doesn't need to be open (war.app needs it to have been opened once in the game). In the notes the link is the territory's name, e.g. "Elos".
- **Game notes: territory and bonus names you can click.** Under each notes box, a small button for every territory or bonus of the game's map that the box names, linked with 🔗 or typed (blue for territories, gold for bonuses). Clicking one highlights it on the map and moves the map to it, as a chat link does. It uses war.app's own game functions, whose names can change with a war.app update; the buttons then don't appear, and the notes work as before.

## 3.48.3

- **Updating: "Reload to finish updating".** Clicking the gold "Update to …" label opens Tampermonkey's update screen in a new tab (which Tampermonkey leaves empty afterwards; it can be closed), while the war.app tab keeps running the old version. The label now turns into "Reload to finish updating", and clicking it reloads war.app with the new version.

## 3.48.2

- **No Notes button in a lobby you haven't joined.** In a game's lobby that war.app still offers you ("Join Game"), the button sat in the bottom-left corner with nothing to note. It now shows once you've joined, and in games you're in, as before.

## 3.48.1

- **Ladders page: a set order for the players' list.** AWP World Tour, then the Multi-Template Ladder, P/R League, Titled Tuesday and the Seasonal Ladder, whatever order custom.wl-stats.com sends its series in. The clans' list is unchanged (Clan League, Clan Cup, Nations Cup).

## 3.48.0

- **Seasonal Ladder from custom.wl-stats.com's new ladders API.** The Seasonal Ladder moved out of custom's series list into its own API (`/api/v1/ladders/seasonal`); the Ladders page and the Community Events cards now read it there, with the same season, leader and your place ("146th of 219 · 9–6 · rating 2,634"). While the series list still has its old copy, that copy is used if the new API doesn't answer.
- **Multi-Template Ladder on the Ladders page and on Community Events.** A new row in Community ladders & leagues, and lines on war.app's "Multi Template Ladder (MTL)" card ("You're ranked!" or "You took part" instead of "You can join!"), from custom.wl-stats.com's copy of warlight-mtl.com: how many players are ranked, the leader and their rating, and your rank or "not ranked", your rating and your best rank. When warlight-mtl.com is down, it says so and how old the figures are.
- **MTL and Seasonal Ladder on profiles, without maak.ch.** A player's Ladders table (Ladder, Best Rank, Current Rank) gets two more rows: **MTL** at the top, above war.app's 1v1, 2v2 and 3v3 (best and current rank with rating), and **Seasonal Ladder** at the bottom (best final place over all seasons, "champion ×6" for champions, and this season's place). A player with no war.app ladder gets a Ladders table of their own. These come from custom.wl-stats.com and need no setting; the old MTL row via maak.ch is gone, and that setting is now "Load MTL Tables and Community Level Records (via maak.ch)", for the MTL tables on the Community page and in MTL threads and for community level records. Settings menu → Profile → "MTL and Seasonal Ladder in the Ladders table".

## 3.47.1

- **Fix: the settings menu froze after "Sort Right Column Tables", "Export Settings" or "Import Settings".** Those windows opened on top of the menu, and closing them left the menu unable to scroll or take clicks, with clicking outside it the only way out. Now the menu steps aside while one of them is open and comes back when it closes.

## 3.47.0

- **My Games: time left before you're booted.** After "Your turn for 14 minutes." each of your games now says "· boots in 2d 23h": its boot time, with any banked time, minus how long it has been your turn. That's also what the your-turn games are sorted by, so a game that became your turn a few minutes ago can come first when its boot is short. Games without a boot say nothing. Settings menu → Dashboard → "Time left before boot on your-turn games".
- **New setting, off by default: "Sort Your-Turn Games by How Long They Have Waited".** It sorts your-turn games by "Your turn for …", the longest first, instead of by time left. To keep war.app's own order, turn off "Sort your-turn games by time left before boot".

## 3.46.3

- **Settings menu:** the footer now reads "Maintained by KKND · Forum thread · Discord". The Discord link (https://discord.gg/sc99xHNuE) is the other place to tell KKND when something breaks, and the website, guide and README list it too.

## 3.46.2

- **Fix: the Notes button no longer shows up over the game's name.** When a game opened, the button appeared at once and then slid up to the title bar (war.app animates its buttons), sometimes to a spot that war.app's name and setting icons hadn't reached yet. It now stays hidden for a moment, until war.app has laid out the title bar, and then appears straight in its place after the setting icons, without sliding.

## 3.46.1

- **Fix: Open Games filter, a 1v1 set up as a team game.** Players often make a 1v1 a team game so its chat stays the same. Such a game, with teams of one player, now counts as **1 v 1** (and a bigger one with teams of one as **FFA**) instead of a team game, so "show only 1 v 1" keeps it and "hide team games" no longer hides it.

## 3.46.0

- **Open Games filter: 1 v 1 in Game type.** Two more choices: **show only 1 v 1** (two seats, no teams) and **hide 1 v 1**, next to team games and FFA.
- **Open Games filter: boot times in minutes, hours or days.** Each of "boot time under …" and "over …" has its own unit, so real-time players can hide 1-minute games ("under 3 minutes") or keep only real-time ones ("over 10 minutes" hidden). A filter saved in hours stays in hours.

## 3.45.0

- **Open Games filter: many more choices.** All of them read what war.app already shows on each game:
  - **Boot time over … hours**, next to "under": e.g. only games that boot within a day.
  - **Open seats left, from … to …**: "1 to 1" leaves games about to start; "from 3" leaves room to join with friends.
  - **Team size**: only teams of 2 (2v2, 2v2v2…), of 3, or of 4 or more. Random teams say their size; set teams are counted from the gaps war.app leaves between them. A team game whose size can't be told is hidden while this is set.
  - **Hide maps whose name contains** any of your words ("earth, europe"). Map names come from war.app's map list, loaded once a week, the same one Past Games uses; it's only loaded when this box has words.
  - **Hide games with a player you muted** (the script's Muted list from the chat tools), including players invited but not yet joined.
  - **More settings to hide**: less fog than normal (no or light fog) or more (dense, heavy, complete) besides "fog other than normal"; changed luck or rounding, changed kill rates, changed minimum armies per turn, extra armies per territory, army cap, commanders, multi-attack, mods, custom scenarios and practice games.
  - **Hide games with any of these cards**: each of war.app's 13 cards on its own, so a game with Blockade cards can go while one with only Reinforcement stays.
  - The settings and cards lists **fold**, and say how many boxes are ticked while folded ("(2 ticked)"). The **Filter** link has an arrow that turns down while the panel is open.

## 3.44.0

- **Open Games filter: FFA games.** The filter's "Team games" choice is now **Game type**, with two more options: **show only FFA** (free-for-all: three or more seats and no teams) and **hide FFA**. Show only team games and hide team games are as before, and a saved choice is kept. 1 v 1 games are neither, so "Players: from 2 to 2" still picks those.

## 3.43.1

- **Fix: Idle's Mines tab, "time to afford" over the ore rates.** A mine that makes two or three ores shows a rate for each, side by side, and the script put its "in 9h 34m" right after the first one, on top of the second. It now goes after the last rate, or on a small line just under the rates when there's no room beside them. Army camps and hospitals, with one rate, are unchanged.

## 3.43.0

- **Reorder bookmarks two ways.** Hover a bookmark in the dashboard's Bookmarks box and ▲ ▼ and a ⋮⋮ grip appear at its right end: click ▲ or ▼ to move it one place, or drag the grip and drop it where you want it. The new order is saved at once. The right-click menu (Edit, Move up, Move down) still works too.
- **Fix:** a bookmark at the very top of the list (order 0, as the default one is) had no right-click menu, so it couldn't be moved or edited from there, and moving the second bookmark to the top could fail without a word.

## 3.42.3

- **Ladder team proposals: the friend search is instant, even with thousands of friends.** It now reads the friend list war.app already downloads when the proposal opens, instead of stepping through war.app's pages one by one, which took about two minutes for 3,000 friends and started over each time. Nothing is stored: the list is kept only while the page is open, as war.app keeps its own. If war.app's list can't be read, the search still reads the pages as before.
- **Fix:** the search misread war.app's pager ("Friends 1 - 40 of 98" ran into the page buttons "1 2 3" as "of 98123") and so went on stepping through pages long after the last one.

## 3.42.2

- **Settings menu:** the footer says "Maintained by KKND · Forum thread", linking KKND's profile and the script's current thread ([Muli's Userscript update](https://war.app/Forum/897130-mulis-userscript-update)), where problems and ideas go. Muli, the original creator, stays in the credits in the README, on the website and in the guide.

## 3.42.1

- **Game notes: the Notes button is in the game's title bar**, right after the name and setting icons, and the notes open just below it. It used to sit by war.app's Game button, moving beside the Chat tab while the chat was open, and in a game you aren't in (where war.app shows the chat differently) it stayed put and covered the chat. Where the title bar has no room (a long name in a narrow window), it falls back to its old place.

## 3.42.0

- **Search your friends when proposing a ladder team.** On a team ladder (2v2, 3v3) → Join Ladder → Join with Team, war.app lists your friends 40 at a time, with no search. A **Search your friends** box now sits at the right of "Friends": type part of a name and it lists every match across all pages, best match first, with its level and page ("L59 A slice of pie · page 3", "locked" for friends who haven't unlocked the ladder). Click one to go to its page, where its name turns gold and its Select button is outlined; Select it as usual. The first search reads your friends by stepping through war.app's own pager (under a second for 98 friends) and puts the list back on the page you were on; the proposal itself is unchanged and is only sent by war.app's own button.

## 3.41.5

- **Ladders: the Community ladders panel no longer covers a ladder you open.** Opening one of war.app's own ladders (Seasonal, 1v1, 2v2, 3v3) from the Ladders page left the panel on top of it, because war.app switches to the ladder without loading a new page. The panel now goes away when you open a ladder and comes back when you return to Ladders, without loading the standings again.

## 3.41.4

- **Player Search: a better best match.** New accounts (L1–2) now come after everyone else, so an L1 with exactly the name you typed no longer comes before an L66 whose name starts with it. A tag at the start of a name ("[ BTF] consequence777") no longer stops it counting as starting with what you typed. Searching "conseq" now lists CONSEQUENCER (L66), [ BTF] consequence777 (L47), consequences, Consequence7777, then the L1–2 accounts.
- **Player Search: "Hide L1–2" is on at first.** Untick it to see new accounts; your choice is remembered as before.

## 3.41.3

- **Chat buttons stay behind war.app's popups.** In the chat rooms and game chat, the 🔊 read-aloud and 🔇 mute buttons of the messages behind war.app's player card (opened by clicking a name) showed through it. They now stay under the card and any other war.app popup over the chat, and work as before on the messages.

## 3.41.2

- **No second chat bell from the script's hidden games.** The dashboard's 💬 Chat panel and Past Games' "Find the maps" open games in a hidden frame, and war.app played its sounds there too: with the chat panel open, every new message in that game rang a second bell (and your-turn sounds played twice). Those hidden games are now silent.

## 3.41.1

- **Game notes: "you move first / second" is for the turn being played.** Right after a turn ends, while war.app replays it or its history is open ("Turn 2 of 2"), the notes could name the turn that had just finished ("Turn 2: you move first" while turn 3 was being played). They now take the highest of war.app's turn numbers, which is always the turn being played.

## 3.41.0

- **Open Games refreshes by itself** every 5 minutes while it's on screen on the dashboard, so new games show up without pressing R. It waits while your pointer is over the list or the Filter panel is open, so the list doesn't change under you, and doesn't run while another tab (My Games, Past Games) is shown or the browser tab is in the background. A refresh by R, the Refresh button or coming back to the tab starts the 5 minutes again. Change the minutes, or 0 to turn it off, at the bottom of the Open Games **Filter** panel; settings menu → Dashboard → "Refresh Open Games every few minutes" switches it off altogether.

## 3.40.0

- **Lobby: flag players who are booted often.** The limit box beside "Players" reads "Flag: avg turn > 24 h · booted > 10 %" (in a real-time lobby, "avg turn > 3 min"): a player whose boot rate on their profile is over the percentage gets the red ⚠ too, and hovering the line says why ("Flagged: booted over 10%"). 0 turns either limit off; both are remembered.

## 3.39.1

- **Past Games: the maps of all your games.** War.app shows most finished games with a picture of the game instead of the map's picture, so 3.39.0 left them out of the map list (156 of 200 games on one page). They're now counted under "Map not shown (156)", and **Find the maps of 156 games**, next to the map list, opens each of them in the background, about a second and a half each, to read its map from war.app's own data ("Finding maps: 22 of 156 · Stop"). Found maps are remembered in this browser for good, since a game's map never changes, so it's needed once per game.

## 3.39.0

- **Past Games: filter by map and by number of players** (more from "Search/Sort Functionality for Past Games"). A second row on the Past Games bar: **Any map** lists the maps of the games on the page, by name, with how many games each ("Medium Earth (5)"); **1 v 1** or **More than 2 players**; and **Players from … to …**. Map names come from war.app's own map list, read once a week (about 1.4 MB) and matched to each game by its thumbnail; a map that isn't in war.app's list shows as "Map 74965". They're remembered with the other choices. Not possible from the Past Games page: a game's settings (No-Split, cards…) and its map's size, which the rows don't carry; and FFA versus team games, since the rows don't mark teams.

## 3.38.1

- **Real-time lobbies show real-time pace.** In a lobby whose boot time is an hour or less, each player's line now gives their real-time numbers: "avg turn 3m 20s · 59% over 2 min · booted 3%" (no multi-day games count, which says nothing about a real-time game), and the limit box reads "Flag average turn over 3 min". Multi-day and real-time limits are remembered separately.
- **Past Games:** "Real-time" now includes games with a boot time of exactly one hour, the same rule as the lobby: up to an hour is real-time, longer is multi-day.
- **The version number shows in lobbies.** It used to stay hidden on every game page so it doesn't cover the game's own buttons; now it's hidden only once the game has started.

## 3.38.0

- **Player pace in a game's lobby** (Feature Requests: "Additional filters for joining open games"). War.app decides who may join, so the script can't keep anyone out, but in a lobby each player now gets a line from their profile: "in 7 games · avg turn 1d 13h · 40% over a day · booted 3%" (how many multi-day games they're in, their average multi-day turn, the share of their turns that took over a day, and their boot rate). Hover it for the long version; click it for the profile. **Flag average turn over 24 h**, at the right of "Players", marks slower players with a red ⚠ (0 turns it off), so the host can remove them with war.app's Add/Remove Players. The games count is war.app's own figure, which doesn't always update in time, so it's never flagged. The turn times cover all of a player's multi-day games, not each game's boot time. Settings menu → Games → "Player pace in game lobbies".

## 3.37.1

- **A game's chat from the dashboard opens faster.** The panel now shows the last 20 messages, with "Showing the last 20 messages of 57. Show all" above them. **Show all** shows the rest, and where the game keeps older messages behind war.app's "Load Older Messages", the panel loads them too ("Loading older messages…"), keeping your place if you've scrolled up. The hidden game no longer loads the whole chat by itself first, which is what made long chats slow to appear.
- **The game chat panel stays below war.app's header** in a short window; the header used to cover its top.

## 3.37.0

- **A game's chat from the dashboard** (Feature Requests: "Add Button to Open Chat from MP Dashboard"; from the thread, to check whether a game's chat concerns you without going into the game). Each game in My Games has a **💬 Chat** button at its bottom right. It opens a panel on the dashboard with that game's chat, Public and, in team games, Team, and a box to write in: Enter sends (Shift+Enter for a new line), and the message goes out through the game's own Send button, as if you'd written it in the game. The game loads in a hidden frame behind the dashboard, since war.app sends a game's chat only along with the game itself, so the chat takes as long to appear as the game does to load, but you stay on the dashboard. Muted players show as a faint "muted" line; block-listed messages are left out, as in the game. Where you can't write (a finished game, or not your game), the panel says it's read only. Click the button again, ✕ or Escape to close it. Private chat stays in the game ("Open game" in the panel). Settings menu → Dashboard → "Game chat from the dashboard".

## 3.36.1

- **Dashboard:** Chat and Refresh (R) stay lined up above the games when you switch to Open Games or Past Games. They lined up with the My Games table, which the dashboard moves aside but keeps "visible", so on the other tabs they sat about 20px too far right.
- **Past Games:** the "18 of 25 shown" count no longer touches or runs past the table's right edge.
- **Community Events:** a card's lines no longer run over war.app's own text. Each line gets only the room left beside war.app's text at its height, shortened with "…" (the full text shows on hover) or left out when there's almost none: on a narrow window, Titled Tuesday's "Next: …" line steps aside for its long description.

## 3.36.0

- **Idle: the "View only" switch is gone.** It stopped clicks on the map so you couldn't conquer by accident, but it also stopped you looking at anything, and Idle has no way to show a tile's contents without taking it. The Log button moves next to the zoom buttons in its place. If View only was on, the map simply takes clicks again.

## 3.35.2

- **Dashboard:** Refresh (R) is a blue button like Chat on every account. Some dashboards (seen on an account with no games) get a Refresh button from war.app without its button style, and it showed as a plain white box.

## 3.35.1

- **Dashboard:** Chat and Refresh (R) moved from the top of the right column to the My / Open / Past Games row, their right edge lined up with Filter: Default below. They used to stay where war.app first puts its Refresh button, because the dashboard's layout ran before the script's Refresh button existed.
- **Chat rooms:** the Search chat / Hide events / Muted bar sits a little higher, in line with the tabs' labels.

## 3.35.0

- **Chat button on the dashboard** (Feature Requests: "Add Button to Open Chat from MP Dashboard"). A **Chat** button next to Refresh opens the chat rooms directly.
- **Search a chat.** A "Search chat" box on the chat rooms' bar keeps only the messages with that word or player name ("9 found"); clear it to see everything.
- **@name suggestions** (Feature Requests: "Tagging Players in Public Chat"). Typing @ in a chat box, in the chat rooms or a game, lists the players in that chat; pick one with the mouse, the arrow keys and Enter or Tab, and "@Name " goes in. While the list is open Enter picks a name rather than sending your message. Players you tag see it outlined in gold if they use the script (3.33.0); notifying them otherwise is up to war.app.

## 3.34.0

- **Read aloud in the chat rooms too.** Hover a message in Global, Clan or a group chat and click 🔊: it and the messages after it are read with your browser's voice, as in game chat (3.31.0). Hidden notices and muted players are skipped. The setting, now called **Read New Chat Messages Aloud**, also reads new messages in the chat room tab you're looking at.

## 3.33.0

War.app's chat rooms (Global, Clan, groups), from the chat requests on the forum:

- **Hide events.** War.app's automatic notices ("Joined the group", "Left the group", "Removed from the group due to inactivity", clan war rewards and territories) are hidden and the chat closes up, so the conversation is readable. A bar right of the tabs says how many ("23 hidden"); untick **Hide events** to see them.
- **Mute a player** (Feature Requests: "Mute Button"). Hover a message and click 🔇: that player's messages are hidden in chat rooms and game chats, without blocking them, and they never know. **Muted (N)** on the bar lists them with Unmute.
- **Mentions** (Feature Requests: "Tagging Players in Public Chat"). Messages that mention you, by name or @name, are outlined in gold in chat rooms and game chat, and a chat tab you're not looking at shows "@1" for each new one.

## 3.32.0

- **Idle: what a tech is missing, and what it would cost at the market** (Feature Requests: "Ability to click a tech and pay for it from market", 71 votes). Idle helpers never buy for you, so the script shows the numbers instead: in a tech's details box, beside each item you're short of, "need 5 more ≈ ₩221M", priced at the cheapest market on the level that sells it. The estimate follows Idle's own market rule (each one bought raises the price by the same step), read from Idle's save in this browser, and matches Idle's market box: 30M Copper Bar ≈ ₩1.57B where Idle says ₩1.56B. With two or more items short, the tech's name line shows the total ("all ≈ ₩248M"), in red when it's more than your money. Items no market sells say "no market sells it".

## 3.31.0

- **Read chat aloud** (Feature Requests: "Dorex's quality of life updates: Text to speech", 33 votes). In a game's chat, a faint 🔊 at the left of each message reads it and every message after it aloud, with your browser's built-in voice: who wrote it, then the text, with links read as "a link" and smileys as words. ■ stops. A new setting, **Read New Chat Messages Aloud in Games** (off by default, settings → Games), reads new messages from other players as they arrive, so you can listen while entering orders. Messages hidden by your block list are never read. Chrome only speaks after you've clicked somewhere on the page.
- **The whole chat in a game** now ends on the newest message even when war.app takes a few seconds to draw a long chat.

## 3.30.0

Two more Feature Requests:

- **Private chat list: players still in the game first** ("Dorex's quality of life updates: Border in PMs", 84 votes). In a game, the Private button's list of players to chat with now shows the players still in the game first, A to Z, then a gold line and the players who are out (eliminated, booted, surrendered, removed or declined), dimmed. Handy in big diplomacy and mega games.
- **Ask before committing orders** ("Are you sure you want to commit your orders?", 27 votes). A new setting, off by default (settings menu → Games): pressing Commit, or Autopilot's Run+Commit, first asks "Commit your orders for this turn?". Cancel keeps your orders as they are.

## 3.29.1

- The **Notes** button in a game no longer covers the chat's message box when the chat is open: it moves up beside war.app's "Chat" tab, and the notes open above it. With the chat closed it's back next to the Game button.
- **Notes no longer keep the keyboard.** After typing a note, a click on the map (or anywhere outside the notes) hands the keyboard back to war.app, so its shortcuts work again; the notes stay open to read, and a click in them lets you type again. Clicking the Notes button itself no longer holds on to the keyboard either.

## 3.29.0

Two more Feature Requests:

- **Your rank on Quickmatch leaderboards** ("Leaderboards: Include Rank with Rating"). On Quickmatch → Leaderboards, next to "Your rating: 1,309.8", the script now shows your place: "Rank #104 of 190,968". It works for Global and for every template category. war.app lists players 50 at a time, so the script finds your rating by halving the range each time, about a dozen requests, and remembers the answer for 10 minutes.
- **The whole chat in a game** ("Showing more posts in game chat windows"). When a game's chat has older messages, the script presses war.app's "Load Older Messages" / "Older Chat" for you until the whole chat is loaded, then scrolls back to the newest message. Tip from the thread: with App Settings → Chat Dialog unchecked, one press loads everything.
## 3.28.0

Three of the most-voted Feature Requests on the forum:

- **Notes in a game** ("Provide Space for In-Game Notes", 188 votes). A **Notes** button next to war.app's Game button on a game's page opens your private notes for that game: general notes, which turns you move first on (odd or even, after which the panel says "Turn 7: you move first"), and a note per player. They save as you type, a gold dot on the button shows the game has notes, and typing in them doesn't trigger war.app's game shortcuts. They're stored with your settings, so Export / Import carries them.
- **Past Games filters** (Feature Requests: better filtering and sorting on Past Games). A bar above the list: search by game or player name; show only games in progress, your turn, lobbies, finished games or games you're out of; only real-time or multi-day games; reverse the order. "12 of 25 shown". It works on the page war.app shows, so set "Number per page" to 200 to filter more at once. The choices are remembered, the search isn't.
- **More Open Games filters** ("add more open games filters"). The Filter panel can now hide games with fewer or more seats than you choose, show only team games or hide them, and hide games with settings you tick: Commerce, local deployments, manual or automatic distribution, cards, wastelands, fog other than normal, no-split, overridden bonuses, attack-only / transfer-only, one army must stand guard, pure skill and banked boot time. Map size isn't shown in the list, so it can't be filtered yet.

## 3.27.0

More Idle helpers, from the forum:

- **"View only" map** (Feature Requests, 14 votes). A "View only" switch next to the map's zoom buttons. While it's on, a click or tap on the map does nothing, so a stray click can't conquer a territory and spend the armies you were saving; dragging to look around and zooming still work. A short note at the click says the map ignores clicks. Remembered in this browser.
- **A log of Idle's pop-ups.** A "Log" button next to the zoom buttons lists the pop-ups Idle showed on the map (what you captured, digs, powers, caches), newest first, with the time: the last 100 for this tab, with Clear. Useful when pop-ups close after a few seconds.
- **Artifact storage** (Feature Requests: "storage" for artifacts you never want used). In the artifact List, "store" marks an artifact as stored: it's dimmed and tagged "Stored" in the artifact window, it's never suggested as the "Better" copy, and activating it says you marked it as stored. Click "stored" to take it out.

## 3.26.0

Player Search (Community → Player Search), whose results came in no useful order:

- **Sort.** Results now come as **Best match**: exact names first, then names starting with what you typed, then the rest, each by level, highest first. Searching "tornado" puts the L65 tornado first instead of second among a dozen L2 accounts. Also by level, by name, or war.app's own order. Remembered for the next search. (Feature Requests: "Sort players by level in Player Search results".)
- **Filter.** "Hide L1–2" (mostly new or abandoned accounts), "In a clan" and a minimum level; the count says "24 of 64 shown".
- **Tags.** Next to each name: "You", the player's AWP World Tour rank ("AWP #1", linking to their AWP page), and "Blocked" for players on your block list.
- **Paste a profile link.** Pasting a profile link or a player ID into the search box and pressing Search opens that profile. Clicking into an empty search box offers your last 8 searches.

## 3.25.0

First helpers for War.app Idle, picked from what Idle players ask for on the forum. Each has its own switch in the settings menu's new Idle section.

- **Volume slider.** A slider next to war.app's speaker icon sets how loud Idle's sounds are (battles, challenges and auto-conquer can get noisy), from 0 to 100%, remembered in this browser. war.app's own mute button still works; ads are left alone.
- **Check big market purchases.** When the number typed into a market is more than your money allows, Idle quietly buys as many as it can, so a typo like "121p" for "1210" (121 quadrillion) spends all your money. The script now asks first: "You typed 121p (121 quadrillion), more than you can afford. This buys 19M Copper Bar for ₩934M, as many as your money allows. Buy them?" Orders you can afford go through as before.
- **Better artifact copies are pointed out.** In the artifact window ("View All"), an equipped artifact gets a gold "Better: Epic" tag when a higher-rarity copy of it isn't equipped, and that copy is outlined in gold, so you see it before playing on with the weaker one (a Feature Requests idea). It updates as you drag cards.
- **A list of all your artifacts.** A "List" button next to the artifact window's Sort box opens a compact list of every artifact, sorted by rarity or by name, with copies counted and equipped ones marked: the overview players asked for once the window has more cards than it shows at once.
- **Time to afford.** Next to each upgrade you can't afford yet (army camps, mines, hospitals), how long until you can at your current ₩/sec: "in 17h 31m", "in 1d 3h".
- **Best army camp for the money.** The army camp that adds the most armies per ₩ of its upgrade cost is marked "Best value" in gold. Each army camp upgrade adds about the same share of what the camp makes (about 11% at the levels checked), so the camp making the most per ₩ of its upgrade cost gains the most.
- **What Idle needs you for, in the tab title.** "(2) Idle" when there are unclaimed powers, an artifact to claim, a tank ready to move, a battle, the daily bonus or the coin wheel waiting, so Idle can sit in a background tab. An optional desktop notification ("Idle: Desktop Notification When Idle Needs You", off by default) says what's new while the tab is in the background.
- **A warning when Idle is open in another tab of this browser.** Playing Idle in two places can lose progress; war.app asks about other devices, and now both tabs say so when Idle is open twice in the same browser.
- **Confirm before using powers and artifacts.** Clicking Use on a power or Activate on an artifact asks first, naming it: "Use Time Warp? You have 5.", "Activate Draft Boost (Epic)?", and says when a power would cost coins because you have none left.

## 3.24.1

- **Community Events cards for events you're in no longer say "You can join!"**: war.app's green line reads "You're in!" while it's running, "You're signed up!" during signups, "You took part" once it's finished, and "You're in the race!" on AWP World Tour, each in its own colour so they stand out from war.app's green: gold when you're in, light blue when signed up, grey once it's over. Cards for events you're not in keep the green "You can join!".

## 3.24.0

- **Mail filters by words and by date.** Next to "Filter by player" on your mail page:
  - **Filter by words** finds threads with all the words you type, in any order. A menu next to it chooses where to look: **in subject** (the default) or **in first 15 words** of each thread's opening message.
  - **Last post from … to …** keeps the threads whose last post falls in that range; either date can be left empty.
  - The filters combine, and the count shows how many threads match.
- The first time you pick "in first 15 words", a notice explains that the script will open each of your mail threads once to read them (about half a minute for 400 threads, with progress shown) and keep those words in this browser, so later searches are instant and only new threads are read. **Continue** goes ahead; **Turn off** removes the option and deletes any stored words. It's on by default, and the new setting "Mail: Search the First 15 Words of Each Thread" (settings menu → Other) turns it back on or off.

## 3.23.3

- **Nations Cup and Clan Cup show their stage instead of names.** On the Ladders panel, the Community Events cards and clan pages, a running cup shows the stage it's in ("Qualifiers ›", "Round 2 ›"), linking to it on custom.wl-stats.com, instead of every group leader. It appears once custom.wl-stats.com sends the stage's name.
- **Titled Tuesday shows its last event and the next one, not the winner:** "Last: 91st Titled Tuesday - AUL · 20 players" (linking to that event) and "Next: Wed, Oct 21, 12:00 AM (in 3 days)". While one is being played it says "Now: …" with its progress. On its Community Events card the bottom link opens the whole series ("All events on custom.wl-stats.com ›").
- A card no longer shows two links to the same page: where the stage or the last event already links there, the bottom "Full standings" link is left out.

## 3.23.2

- The Website and GitHub links in the settings menu's title are a little bigger and centered on the title line.

## 3.23.1

- **The AWP World Tour card on Community Events links to the rankings** ("Rankings: Top 16 ›", the 16 who qualify for the AWP Tour Finals) instead of to the race leader's page. Signed in but not in the race, the card says "You: not in the 2026 race yet"; signed out, it has no bottom line.

## 3.23.0

- **The settings menu is reorganized into foldable sections**, one per area (Dashboard, Tournaments, Ladders & community, Profile, Clans, Forum, Maps & levels, Other, Third-party data, Backup). Each holds that area's settings and its feature switches together, with a count; the menu remembers which sections you left open and starts with Dashboard. Your existing choices carry over.
- **Search** at the top of the menu finds any setting or feature by name and opens its section.
- **Website and GitHub links** in the menu's title, and the website is the script's homepage in Tampermonkey's dashboard.
- **Community Events cards show each event's standings for everyone**, not only where you take part: at the top right, the current edition (running or finished, its size and progress) and its leader or winner, Titled Tuesday's next start, and for AWP World Tour the race's size and leader. Beside war.app's "You can join!" is your place when you take part, or a link to the full standings on custom.wl-stats.com or awp.wl-stats.com (or to sign up, while signups are open). The lines never wrap over war.app's text; a cut line shows in full when you hover it.
- **Standings for events with no single leader.** On the Ladders panel, the Community Events cards and clan pages, custom.wl-stats.com's short standings replace the "Leader:" or "Winner:" line: Clan League's and P/R League's top division ("Division A: 1. Optimum 141 · 2. MASTER Clan 116 · 3. Harmony 116"), every Nations Cup group leader ("Group leaders: A Spain 21 · B Poland B 15 · …"), and the round a running Clan Cup is in ("Quarterfinals ›"), linking to its bracket. AWP World Tour keeps its leader.
- **Clan League is back on the Ladders page and Community Events** between seasons, with its last season's final standings.
- **Clan League leads the clan lists**, being the biggest clan event: first under Clans & nations on the Ladders page and first in the Community events box on clan pages, then Clan Cup and Nations Cup.

## 3.22.0

- **Event badges on My Games moved to the game's top-right corner and say just the series:** "Nations Cup", "AWP Tour", "P/R League", "Titled Tuesday". The full label ("Nations Cup 2026 · Group C") shows when you hover the badge, and the game's name wraps before running under it.
- **The Community ladders & leagues panel has two lists:** Players (AWP World Tour, P/R League, Seasonal Ladder, Titled Tuesday) and Clans & nations (Clan Cup, Clan League, Nations Cup). On a wide window the panel is wider than war.app's ladders, up to about 1,040px, and the lists sit side by side, so all the series fit without scrolling; on a narrower one they stack at the ladders' width.

## 3.21.1

- Hovering an option in the Open Games filter no longer turns it into a blue, bold bar. The dashboard's hover style for the Multi-Day / Real-Time / Both buttons applied to every label in the Open Games header, including the filter's options.

## 3.21.0

- **AWP World Tour badges on My Games.** Games in an AWP World Tour event get a gold badge after their name, such as "AWP World Tour · Grand Slam - Timid Land · Round of 64", linking to the tournament on awp.wl-stats.com. custom.wl-stats.com's events keep their blue badges. If one site is down, the other's badges still show.
- **Event badges no longer cover the game in My Games.** The dashboard makes a game's whole cell clickable by stretching its links over it, and it stretched the badge too, into a block over the game's details. Badges now sit on a line of their own under the game's name.
- **The Seasonal Ladder is now a row in the Community ladders panel**, like the other series. Its line inside war.app's own Seasonal row covered war.app's "Unlocked: You may join this ladder" text when signed in.
- **Clan pages show the clan's last Clan League and its titles.** The Community events box now includes the latest Clan League the clan played, even if it finished long ago ("Clan League 19 · finished · Winner: Optimum", then the clan's division, place, record and points). A clan that won Clan League or Clan Cup gets a gold "🏆 Champion ×2: Clan League 19, Clan League 18" line, linking to each edition. Only winning the top division counts as a Clan League title.
- **Clan Cup on clan pages shows the clan's best squad** only. A clan can enter up to five squads, which made the box cluttered.
- The "Community events" box on clan pages no longer hides under the member list when war.app shows the clan page in one column (a narrower window). It now goes below whatever is lowest in its column; in the usual two-column layout it stays right under Clan Wars.

## 3.20.0

- **New version notice.** Once a day the script checks GitHub for a newer version. When one is out, the small version label in the bottom-right corner becomes a gold **Update to …** link; clicking it opens Tampermonkey's update screen. Nothing else on the page changes. If GitHub can't be reached it tries again an hour later. Turn it off under Features → Other.

## 3.19.0

- **Community event badges on My Games.** Games that belong to a community event get a small blue badge after their name, such as "Nations Cup 2026 · Group C" or "P/R League · Season 38 · Group A2", linking to the event on custom.wl-stats.com. They follow every refresh and war.app's own Filter. Turn them off under Features → Dashboard.
- **Community events on clan pages.** A clan page gets a "Community events" box below Clan Wars with the clan's squads in each current custom.wl-stats.com series and how they stand. Turn it off under Features → Clans.
- The panels find war.app's dialog and button art by file name on any page, so the clan page's box wears the same frame and blue buttons as the Ladders panel.

## 3.18.0

- **Community tournament stats on profiles.** Players custom.wl-stats.com knows get a "Community tournaments" box below the AWP World Tour one: games, wins and losses, tournaments, titles and finals, best placement, tournaments organized, and their record in their three most played formats. It links to their page on custom.wl-stats.com. Turn it off under Features → Profile.
- The profile boxes (Private Notes, AWP World Tour, Community tournaments) now always appear in that order, whichever site answers first.

## 3.17.0

- **Community series on the Ladders page.** Under the AWP row, the panel now has a row for each series custom.wl-stats.com is running or finished in the last 30 days: Clan Cup, Nations Cup, P/R League, Titled Tuesday and others. Each shows the current season, how far it is, its leader or winner and, when you're signed in, your line: your place, record and points, or your clan's or country's. Titled Tuesday shows when the next one starts, in your time zone, with a countdown.
- **Signups.** A series taking signups says "Signups open until …" in gold and links to signing up on custom.wl-stats.com, or says you're signed up.
- **Seasonal Ladder.** war.app's own Seasonal Ladder row gets the current season, its leader and your place along its bottom edge, instead of a second Seasonal Ladder button. Where that row is too narrow, the panel shows it as a row of its own.
- **Your standing on Community Events.** The cards on war.app's Community Events page get your line for the events you take part in: your country in Nations Cup, your clan in Clan Cup or Clan League, your AWP race rank. Turn it off under Features → Community.
- One site being down no longer hides the other's rows: AWP and custom.wl-stats.com are loaded side by side.

## 3.16.0

- **Community ladders & leagues on the Ladders page.** A panel below war.app's four ladders, drawn with war.app's own dialog, row and button art, shows the AWP World Tour race: how many players are in it, and your rank and points when you're signed in. The script loads the whole ranking and finds you in it itself, so your player ID isn't sent anywhere. Its buttons are war.app's blue instead of the ladders' green, so it's clear which part the script adds. The panel follows war.app's layout when the window is resized and scrolls on its own when the window is short. Turn it off under Features → Community. P/R League, Nations Cup, Clan League and the other series on custom.wl-stats.com will join it once that site offers the data.

## 3.15.0

- **AWP World Tour stats on profiles.** A player who has played on the AWP World Tour gets a box on their profile with their place in this year's race and in the 12-month ranking, games, wins and losses, tournaments, titles and best placement, and a link to their page on awp.wl-stats.com. This brings back the AWP integration from Muli's original script. Turn it off under Features → Profile.
- **custom.wl-stats.com link on tournaments.** Tournaments that custom.wl-stats.com has read (Titled Tuesday, War Gaming Live, and P/R League groups played as war.app tournaments) show "custom.wl-stats.com (series)" next to "Created by". Turn it off under Features → Tournaments.
- Both read plain JSON from the wl-stats sites, without your war.app login, and keep the answers for an hour. A player or tournament those sites don't know, or a site that's down, leaves the page as it was.
- The script now runs only on war.app. Every warzone.com and warlight.net address redirects to war.app before a page loads, so the warzone.com entry did nothing. Bookmarks saved with those old addresses still open on war.app.

## 3.14.5

- Private notes on profiles load more safely: the script now reads only your note from the notes page, instead of loading the whole page and running its scripts. If the notes can't be loaded, the box says so instead of showing "Loading…" forever.

## 3.14.4

- **Common Games no longer breaks war.app's own code on that page.** To set up the sortable table, the script swapped out war.app's jQuery, which stopped its cookie handling (your player data didn't load there) and Bootstrap from working. The table and Head-To-Head box work as before.
- The Head-To-Head win rate shows "–" instead of "NaN%" when none of your 1v1 games with that player has finished.

## 3.14.3

- **Removed** "Show who invited you", the "Highlight Tournament Invites" setting, and the dashboard's tournament table handling. war.app no longer shows tournaments or tournament invitations on the dashboard (they're only on the Tournaments page, without who invited you), so these had nothing left to work with. "Open Tournaments" is gone from the right-column sort menu too.

## 3.14.2

- The tournament player search box and Sort by menu can be clicked again. war.app makes the Players panel ignore the mouse, and the toolbar inherited that, so clicks went through to the list. Search also reacts to pasting now, not just typing.

## 3.14.1

- **Tournament Bookmark link and player search now appear when you open a tournament from the tournaments list.** war.app switches to the tournament without loading a new page, so the script never set them up; it only worked when the tournament's address was opened directly. Opening a second tournament the same way works too.

## 3.14.0

- **Tournament player search and sort work again.** The toolbar was placed below the visible part of the Players tab; it now sits at the top right, above the list. Search results move to the top of the list instead of staying scattered where they were, and sorting uses war.app's row spacing (it used a fixed 34px and stacked rows on top of each other).
- **Removed Find Me** on tournament pages: it highlighted names on tabs you couldn't see. war.app's own **Find...** and **>** buttons on the Bracket tab do this now.
- **Block list search**: a search box on the Manage Block List page filters players by name, ignoring case and accents ("sana" finds "Šaňa"), and shows how many match. The player count above it keeps showing your whole list.

## 3.13.3

- The link to Muli's profile in the settings menu uses the profile ID alone, so it keeps working if the name changes.
- Works if war.app changes its domain again. Page detection no longer checks the domain, links are relative, page titles are trimmed using the site's own name, and bookmarks saved on war.app, warzone.com or warlight.net open on the domain you're using. The script now runs on all subdomains of war.app and warzone.com. Settings and bookmarks stay with each domain; move them with Export / Import.

## 3.13.2

- After the dashboard refreshes (R, the Refresh button, coming back to the tab, or the background turn check), the "+ Show N more open games" link and the "Past games / Create Game" links under My Games are back. Show more and the Multi-Day / Real-Time / Both buttons now also use the refreshed open games instead of the list from when the page first loaded.

## 3.13.1

- Credit the original author, Muli, in the script header, the README and the settings menu, with links to Muli's profile and the original forum thread.
- **Security:** making profile stat sections collapsible re-inserted the profile's text as HTML, so a player could put markup in their bio that ran on your page when you viewed their profile. The text now stays text.
- Saving a new right-column order reloads the dashboard, so the new order (and un-hidden tables) show right away.
- Refreshing the dashboard no longer nests a new table body inside the old one each time, and no longer fetches Past Games until you open that tab.
- Removed leftover code from the original script's old popup system, unused helpers, and selectors that no longer match anything on war.app.

## 3.13.0

Checked every feature against the current war.app and fixed what its redesign broke.

- **Fixed:** Bookmark and Find Me links, player search and sort, and "Invited by" on tournament pages. war.app now draws these pages client-side, so the script waits for them, and the links sit next to "Created by".
- **Fixed:** sorting tournament players by name compared their levels instead of their names, and Find Me missed names containing something like "L2".
- **Fixed:** "Invited by" never appeared, because it read the database before it was open.
- **Fixed:** the block list counter (war.app moved the page to /ManageBlockList).
- **Fixed:** total points earned (the level tooltip it read is now empty; it now uses the numbers on the Points page).
- **Fixed:** pressing R to refresh the dashboard no longer fires while you type in a text box, such as the Open Games filter keywords.
- **Fixed:** "Hide everything coin-related" now also hides the open tournaments table, and "Reset hidden threads" shows the threads again on forum pages.
- **Removed**, because the page or data they used is gone or war.app now does it itself: Rate Map link, Global win rate, Community events list on Ladders (war.app has a Community Events page), fixed-height tournament list, creator highlighting in tournament chat, clan creator banner and Load Creators (clan pages no longer show the creator), profile box styling, and the new-thread cleanup.

## 3.12.1

- Removed **Remember My Games filter**. war.app replaced the dropdown it worked with by its own Filter button, which already remembers your choice.
- Boot-time sorting now also applies after you pick a filter with war.app's Filter button.

## 3.12.0

- **Mail search**: a **Filter by player** box on your mail page shows only threads started or last answered by that player. If your mail spans several pages, the first search loads the rest, so it covers all of it.

## 3.11.0

- Games where it's your turn are sorted by how much time you have left before you're booted, most urgent first. Other games keep war.app's order. It can be turned off under Features → Dashboard.

## 3.10.0

- **Open Games filter** is back: a **Filter** link in the Open Games header hides Auto Games, coin games, games with a short boot time, and games whose name contains words you choose. It shows how many games are hidden and works on the dashboard and the View All page.
- Open Games you've joined (or been invited to) are highlighted with a **Joined** badge, on the dashboard and the View All page.

## 3.9.0

- Tab title on the dashboard shows how many games are waiting for your turn.
- While the dashboard tab is open in the background, My Games is re-checked every 5 minutes.
- New opt-in setting for a desktop notification when a game becomes your turn.

## 3.8.0

- New **Features** section in the settings menu: turn any individual feature off.
- Refreshing games fetches the dashboard once instead of once per table, and keeps the My Games and open-games counts up to date.
- A failed refresh no longer leaves the games table dimmed.
- The open games list scrolls back to the top when switching between Multi-Day, Real-Time and Both, as originally intended.
- Removed the dead open-games counter code; war.app now shows these counts itself.
- Renamed MDL to MTL (Multi-Template Ladder) throughout, following the ladder's rename, and switched its links and API calls to the canonical `www.warlight-mtl.com` address.

## 3.7.0

- Community level previews in forum posts are read from war.app's own level pages instead of maak.ch.
- MDL ladder stats and tables and the community level record count are now opt-in (new setting, off by default), so by default the script never contacts maak.ch.
- Each startup feature runs in isolation, so one broken feature no longer stops the rest of the script.
- Fixed a crash that stopped the script on level play-log pages.
- Fixed the community events count for more than 20 events, and parsing of the events feed's current format.
- Database calls return promises and log their errors; settings are cached after startup.
- An unreadable player data cookie is discarded instead of breaking player features.
- Icons are inlined into the script instead of hot-linked from imgur; the install icon is served from this repo.
- Removed the stale `.backup` copy of the script and the completed `plan.md`.

## 3.6.0

- Escape third-party data (MDL ladder, community levels, CLOT events, tournament inviter names, bookmarks) before rendering it; external URLs are restricted to `http(s)` and same-site paths.
- Bookmarks no longer accept `javascript:` URLs.
- Removed `validateUser()`, which sent the player name and id to maak.ch.
- Dropped moment.js; every `@require` is pinned with a sha256 hash.

## 3.5.0

- Updates now come from this repo instead of the upstream Greasy Fork script.
- Settings import validates the backup before clearing anything, and keeps tournament inviter data.
- Player data loads asynchronously instead of blocking the page.
- Fixed the post-setup reload delay, the IndexedDB support check, and a leaked `db` global.
- Blacklist counter uses a `MutationObserver` instead of polling every 500 ms.
- Added unit tests (`npm test`).

## 3.4.4

- Baseline fork of Muli's "Tidy up your Dashboard".

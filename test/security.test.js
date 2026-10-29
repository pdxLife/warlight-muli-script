const { test } = require("node:test");
const assert = require("node:assert/strict");
const { source, createDom, load, domGlobals } = require("./harness");

const PAYLOAD = `"><img src=x onerror="alert(1)">'`;

function render(html) {
    const { dom } = createDom();
    const container = dom.window.document.createElement("div");
    container.innerHTML = html;
    return container;
}

function assertInert(container) {
    assert.equal(container.querySelectorAll("[onerror], script, img[src='x']").length, 0, container.innerHTML);
}

test("safeUrl allows only http(s) and same-site relative URLs", () => {
    const { safeUrl } = load(["safeUrl"]);
    for (const url of ["https://war.app/Forum/1", "http://example.com", "/MultiPlayer/", "  https://war.app  "]) {
        assert.equal(safeUrl(url), url.trim());
    }
    for (const url of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "\u0001javascript:alert(1)", "data:text/html,x", "//evil.example", "vbscript:x", "", null, undefined]) {
        assert.equal(safeUrl(url), "#", String(url));
    }
});

test("normalizeBookmarkUrl keeps web and relative URLs and prefixes the rest", () => {
    const { normalizeBookmarkUrl } = load(["normalizeBookmarkUrl"]);
    assert.equal(normalizeBookmarkUrl("https://war.app/Forum/1"), "https://war.app/Forum/1");
    assert.equal(normalizeBookmarkUrl("/Forum/1"), "/Forum/1");
    assert.equal(normalizeBookmarkUrl("war.app/Forum/1"), "https://war.app/Forum/1");
    assert.equal(normalizeBookmarkUrl("javascript:alert(1)"), "https://javascript:alert(1)");
});

test("the Community page's events lines and MTL top 10 escape API data", () => {
    const ctx = load(["communityPageEventsHtml", "communityPageEventHtml", "mtlTopHtml", "mtlYouHtml", "siteLink", "seriesLink", "seriesDetailHtml", "standingsHtml",
        "weeklyEventStatusHtml", "signupsHtml", "formatCount", "parseUtcTime", "formatEventTime", "timeUntil", "getRankText", "htmlEscape", "safeUrl"],
        { STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"], COMMUNITY_PAGE_SERIES: ["titled-tuesday", "pr-league", "seasonal-ladder", "clan-league", "nations-cup"], MTL_TOP_COUNT: 10 });
    const link = { name: PAYLOAD, url: "javascript:alert(1)" };
    const current = (extra) => ({ name: PAYLOAD, url: "javascript:alert(1)", players: PAYLOAD, progress: { played: PAYLOAD, total: PAYLOAD }, signups_close_at: PAYLOAD, next_event_at: PAYLOAD, ...extra });
    const series = [
        { slug: "titled-tuesday", kind: "events", name: PAYLOAD, url: "javascript:alert(1)", current: current({ status: "finished", winner: link }) },
        { slug: "seasonal-ladder", kind: "ladder", name: PAYLOAD, url: "javascript:alert(1)", current: current({ status: "signups", leader: link, standings: { label: PAYLOAD, entries: [{ name: PAYLOAD, url: "javascript:alert(1)", place: PAYLOAD, points: PAYLOAD }] } }) },
        { slug: "nations-cup", kind: "nations_cup", name: PAYLOAD, url: "javascript:alert(1)", current: current({ status: "running", stage: PAYLOAD }) },
        { slug: "pr-league", kind: "league", name: PAYLOAD, url: "javascript:alert(1)", current: current({ status: "running", leader: link }) },
        { slug: "clan-league", kind: "clan_league", name: PAYLOAD, url: "javascript:alert(1)", current: current({ status: "finished", winner: link }) }
    ];
    const player = { rank: 1, name: PAYLOAD, player_id: "5", rating: PAYLOAD, win_pct: PAYLOAD, url: "javascript:alert(1)" };
    const mtl = { ladder: { url: "javascript:alert(1)", site_up: false, copied_at: PAYLOAD, players: [player] }, mine: { ...player, rank: 40, best_rank: PAYLOAD } };
    const container = render(ctx.communityPageEventsHtml(series, 0) + ctx.mtlTopHtml(mtl, "6"));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.ok([...container.querySelectorAll("a")].every((a) => a.getAttribute("href") === "#" || a.getAttribute("href") === "https://www.warlight-mtl.com/"), container.innerHTML);
});

test("community level cards escape API data", () => {
    const ctx = load(["renderLevelRow", "htmlEscape", "safeUrl", "getTurnText"]);
    const row = ctx.renderLevelRow({
        ID: PAYLOAD, NAME: PAYLOAD, MAP_IMAGE: "javascript:alert(1)", LIKES: PAYLOAD, WINS: 1, ATTEMPTS: 2,
        CREATOR_CLAN_ID: 5, CREATOR_CLAN_NAME: PAYLOAD, CREATOR_CLAN_IMAGE: "data:x", CREATOR_ID: PAYLOAD, CREATOR_NAME: PAYLOAD,
        RECORD_HOLDER_CLAN_ID: 0, RECORD_HOLDER_NAME: PAYLOAD, RECORD_HOLDER_ID: 3, RECORD_TURNS: 4, WIN_RATE: PAYLOAD
    });
    const container = render(`<table>${row}</table>`);
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.deepEqual([...container.querySelectorAll("img")].map((img) => img.getAttribute("src")), ["#", "#"]);
});

test("bookmarks render stored names and URLs safely", () => {
    const { dom, $ } = createDom(`<table id="BookmarkTable"></table>`);
    const ctx = load(["refreshBookmarks", "makeBookmarksSortable", "htmlEscape", "safeUrl", "siteRelativeUrl"], {
        SITE_HOSTS: ["war.app", "warzone.com", "warlight.net"],
        ...domGlobals(dom, $),
        log: () => { },
        addCSS: () => { },
        wljs_WaitDialogJS: { Stop() { } },
        Database: {
            Table: { Bookmarks: "Bookmarks" },
            readAll: (table, cb) => cb([
                { id: 1, order: 1, name: PAYLOAD, url: "javascript:alert(document.cookie)", newWindow: false },
                { id: 2, order: PAYLOAD, name: "Forum", url: "/Forum/1", newWindow: true }
            ])
        }
    });
    ctx.refreshBookmarks();
    const table = dom.window.document.getElementById("BookmarkTable");
    assertInert(table);
    const links = [...table.querySelectorAll("tr td > a:first-child")];
    assert.deepEqual(links.map((a) => a.getAttribute("href")), ["#", "/Forum/1"]);
    assert.equal(links[0].textContent, PAYLOAD);
});

test("player data is no longer sent to maak.ch for validation", () => {
    assert.doesNotMatch(source, /wlpost\.php|validateUser|wlUserIsValid/);
});

test("every @require is pinned by hash and moment is gone", () => {
    const requires = source.match(/^\/\/ @require .*$/gm);
    assert.ok(requires.length > 0);
    for (const line of requires) {
        assert.match(line, /#sha256-[A-Za-z0-9+/]{43}=$/, line);
    }
    assert.doesNotMatch(source, /moment/);
});

test("profile text such as a player's bio stays text when stat sections are made collapsible", () => {
    const escaped = PAYLOAD.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const { dom, $ } = createDom(`<div class="container"><div class="my-2"><div class="fill bg-gray p-3"><big>Level 64</big><br>${escaped}<h3>Stats</h3>${escaped}</div></div></div>`);
    const ctx = load(["foldProfileStats"], { ...domGlobals(dom, $), addCSS: () => { } });
    ctx.foldProfileStats();
    assertInert(dom.window.document.body);
    assert.equal(dom.window.document.body.textContent.split(PAYLOAD).length - 1, 2);
});

test("AWP World Tour stats escape API data", () => {
    const ctx = load(["renderAwpStats", "htmlEscape", "safeUrl", "getRankText"]);
    const html = ctx.renderAwpStats({
        player_name: PAYLOAD, clan: PAYLOAD, page_url: "javascript:alert(1)", rank: PAYLOAD, rank_year: PAYLOAD, rank_12_months: PAYLOAD,
        stats: { games: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD, win_pct: PAYLOAD, tournaments: PAYLOAD, titles: PAYLOAD, finals: PAYLOAD, world_titles: PAYLOAD, best_placement: PAYLOAD }
    });
    const container = render(html);
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.equal(container.querySelector("a").getAttribute("href"), "#");
});

test("custom.wl-stats.com tournament links escape API data", () => {
    const ctx = load(["renderCustomTournamentLink", "htmlEscape", "safeUrl"]);
    const container = render(ctx.renderCustomTournamentLink({ name: PAYLOAD, url: "javascript:alert(1)", series: { name: PAYLOAD, url: "data:text/html,x" } }));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.deepEqual([...container.querySelectorAll("a")].map((a) => a.getAttribute("href")), ["#", "#"]);
    assert.equal(container.querySelector("a").getAttribute("title"), PAYLOAD);
});

test("the AWP World Tour row on the Ladders page escapes API data", () => {
    const ctx = load(["renderAwpLadderRow", "communityLadderRow", "awpStanding", "formatCount", "htmlEscape", "safeUrl"], { AWP_SITE: "https://awp.wl-stats.com" });
    const evil = { rank: PAYLOAD, player_id: PAYLOAD, player_name: PAYLOAD, points: PAYLOAD };
    const container = render(ctx.renderAwpLadderRow({ year: PAYLOAD, rankings: [evil, { ...evil, player_id: "5" }] }, "5"));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
});

test("custom.wl-stats.com series rows and Community Events lines escape API data", () => {
    const { $ } = createDom();
    const ctx = load(["renderSeriesLadderRow", "communityEventHtml", "awpEventLines", "seriesEventLines", "siteLink", "moreLinkHtml", "communityLadderRow", "seriesYouHtml", "standingParts", "seriesStatusHtml", "seriesDetailHtml", "standingsHtml", "weeklyEventStatusHtml", "seriesLink", "signupsHtml",
        "formatCount", "parseUtcTime", "formatEventTime", "timeUntil", "awpStanding", "getRankText", "htmlEscape", "safeUrl"], { $, AWP_SITE: "https://awp.wl-stats.com", STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"] });
    const link = { name: PAYLOAD, url: "javascript:alert(1)" };
    const evil = {
        name: PAYLOAD, kind: PAYLOAD, url: "javascript:alert(1)", warapp_event: "Evil",
        current: { name: PAYLOAD, url: "data:text/html,x", status: "signups", signups_close_at: PAYLOAD, next_event_at: PAYLOAD, players: PAYLOAD, progress: { played: PAYLOAD, total: PAYLOAD }, leader: link, winner: link,
            standings: { label: PAYLOAD, entries: [{ name: PAYLOAD, url: "javascript:alert(1)", group: PAYLOAD, place: PAYLOAD, points: PAYLOAD }, { name: PAYLOAD, url: "javascript:alert(1)", place: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD }] } },
        you: { as: "nation", name: PAYLOAD, division: PAYLOAD, group: PAYLOAD, place: PAYLOAD, of: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD, points: PAYLOAD, status: PAYLOAD, url: "javascript:alert(1)" }
    };
    const running = { ...evil, current: { ...evil.current, status: "running" } };
    const cup = { ...running, kind: "clan_cup" };
    const html = ctx.renderSeriesLadderRow(evil, 0) + ctx.renderSeriesLadderRow(running, 0) + ctx.renderSeriesLadderRow(cup, 0)
        + ctx.communityEventHtml("Evil event", { series: [evil], rankings: null, playerId: null })
        + ctx.communityEventHtml("Evil event", { series: [{ ...running, you: null }], rankings: null, playerId: null })
        + ctx.communityEventHtml("AWP World Tour", { series: [], rankings: { year: PAYLOAD, rankings: [{ rank: PAYLOAD, player_id: PAYLOAD, player_name: PAYLOAD, points: PAYLOAD }] }, playerId: null });
    const container = render(html);
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.ok([...container.querySelectorAll("a")].every((a) => a.getAttribute("href") === "#" || a.getAttribute("href").startsWith("https://awp.wl-stats.com/")), container.innerHTML);
});

test("custom.wl-stats.com ladders (Seasonal Ladder, MTL, profile rows) escape API data", () => {
    const { $ } = createDom();
    const ctx = load(["seasonalLadderSeries", "renderSeriesLadderRow", "renderMtlLadderRow", "mtlYouHtml", "mtlLeader", "mtlEventLines", "communityEventHtml", "awpEventLines", "seriesEventLines", "siteLink", "moreLinkHtml", "ladderProfileRows", "communityLadderRow", "seriesYouHtml", "standingParts", "seriesStatusHtml", "seriesDetailHtml",
        "standingsHtml", "weeklyEventStatusHtml", "seriesLink", "signupsHtml", "formatCount", "parseUtcTime", "formatEventTime", "timeUntil", "getRankText", "htmlEscape", "safeUrl"], { $, STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"] });
    const player = { rank: 1, name: PAYLOAD, player_id: "5", rating: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD, url: "javascript:alert(1)", best_rank: PAYLOAD, best_rating: PAYLOAD };
    const seasonal = ctx.seasonalLadderSeries({ name: PAYLOAD, url: "javascript:alert(1)", season: { name: PAYLOAD, url: "data:text/html,x", status: "running" }, players: [player] }, "5");
    const mtl = { ladder: { url: "javascript:alert(1)", site_up: false, copied_at: PAYLOAD, players: [player] }, mine: player };
    const html = ctx.renderSeriesLadderRow(seasonal, 0)
        + ctx.renderMtlLadderRow(mtl, "5")
        + ctx.communityEventHtml("Multi Template Ladder (MTL)", { series: [], rankings: null, mtl, playerId: "5" })
        + ctx.communityEventHtml("Multi Template Ladder (MTL)", { series: [], rankings: null, mtl, playerId: null })
        + "<table><tbody>" + ctx.ladderProfileRows({ ...player, rank: PAYLOAD }, { url: "javascript:alert(1)", seasons: [{ season: { status: "running" }, rank: PAYLOAD, rating: PAYLOAD, champion: true }] }).map((row) => "<tr><td>" + row.cells.join("</td><td>") + "</td></tr>").join("") + "</tbody></table>";
    const container = render(html);
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.ok([...container.querySelectorAll("a")].every((a) => a.getAttribute("href") === "#"), container.innerHTML);
});

test("custom.wl-stats.com profile stats escape API data", () => {
    const ctx = load(["renderCustomStats", "htmlEscape", "safeUrl", "getRankText"]);
    const container = render(ctx.renderCustomStats({
        stats: { games: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD, win_pct: PAYLOAD, tournaments: PAYLOAD, titles: PAYLOAD, finals: PAYLOAD, best_placement: PAYLOAD, organized: PAYLOAD,
            by_format: [{ label: PAYLOAD, played: 3, won: PAYLOAD, win_pct: PAYLOAD }] }
    }, "javascript:alert(1)"));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.equal(container.querySelector("a").getAttribute("href"), "#");
});

test("My Games badges and clan standings escape API data", () => {
    const ctx = load(["renderEventBadge", "renderClanSeriesRow", "communityLadderRow", "seriesStatusHtml", "seriesDetailHtml", "standingsHtml", "weeklyEventStatusHtml", "seriesLink", "timeUntil", "standingParts", "signupsHtml", "formatCount",
        "parseUtcTime", "formatEventTime", "getRankText", "htmlEscape", "safeUrl", "siteLink"], { STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"] });
    const badge = render(ctx.renderEventBadge({ game_id: PAYLOAD, series: PAYLOAD, label: PAYLOAD, url: "javascript:alert(1)" }));
    assertInert(badge);
    assert.ok(badge.textContent.includes(PAYLOAD));
    assert.equal(badge.querySelector("a").getAttribute("href"), "#");

    const squad = { as: "clan", name: PAYLOAD, squad: PAYLOAD, division: PAYLOAD, group: PAYLOAD, place: PAYLOAD, of: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD, points: PAYLOAD, status: PAYLOAD, url: "javascript:alert(1)" };
    const row = render(ctx.renderClanSeriesRow({ name: PAYLOAD, kind: PAYLOAD, url: "data:text/html,x", current: { name: PAYLOAD, status: "running", players: PAYLOAD, progress: { played: PAYLOAD, total: PAYLOAD } }, squads: [squad],
        titles: { count: PAYLOAD, editions: [{ name: PAYLOAD, url: "javascript:alert(1)" }] } }));
    assertInert(row);
    assert.ok(row.textContent.includes(PAYLOAD));
    assert.ok([...row.querySelectorAll("a")].every((a) => a.getAttribute("href") === "#"));
});

test("the update notice escapes the version read from GitHub", () => {
    const ctx = load(["renderUpdateLabel", "htmlEscape"], { version: "3.19.0", SCRIPT_URL: "https://raw.githubusercontent.com/x.user.js" });
    const container = render(ctx.renderUpdateLabel(PAYLOAD));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
});

test("the Idle artifact list escapes names read from the page", () => {
    const ctx = load(["idleArtifactListHtml", "idleBetterCopies", "htmlEscape"]);
    const card = (name, rarity, equipped) => ({ element: {}, name, rarity, rank: 1, equipped });
    const container = render(ctx.idleArtifactListHtml([card(PAYLOAD, PAYLOAD, true), card(PAYLOAD, PAYLOAD, false)], "name"));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
});

test("Player Search tags and recent searches escape what they show", () => {
    const ctx = load(["playerSearchTagsHtml", "htmlEscape"], { AWP_SITE: "https://awp.wl-stats.com" });
    const row = { id: PAYLOAD, name: PAYLOAD, level: 1 };
    const container = render(ctx.playerSearchTagsHtml(row, { me: PAYLOAD, year: PAYLOAD, awp: { [PAYLOAD]: { rank: PAYLOAD, points: PAYLOAD } }, blocked: { [PAYLOAD]: true } }));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
});

test("game notes escape the notes and the player names read from the page", () => {
    const ctx = load(["gameNotesHtml", "htmlEscape"]);
    const evil = "</textarea>" + PAYLOAD;
    const container = render(ctx.gameNotesHtml({ text: evil, firstMove: "", players: { [evil]: evil } }, [PAYLOAD]));
    assertInert(container);
    assert.equal(container.querySelector("textarea[name=text]").value, evil);
    assert.equal(container.querySelectorAll("textarea[data-player]").length, 2);
});

test("the dashboard's game chat panel escapes names, times and messages read from the game", () => {
    const ctx = load(["renderGameChatMessages", "htmlEscape"]);
    const container = render(ctx.renderGameChatMessages([{ name: PAYLOAD, time: PAYLOAD, text: PAYLOAD }], [], 20, true));
    assertInert(container);
    assert.equal(container.querySelector(".tuydGameChatText").textContent, PAYLOAD);
});

test("the Quickmatch stats table escapes game, player and template names", () => {
    const ctx = load(["quickmatchTableHtml", "quickmatchStats", "quickmatchResult", "pastGamePlayer", "pastGameResult", "quickmatchOpponents", "quickmatchResultText", "quickmatchRateText", "isQuickmatchGameName", "htmlEscape"]);
    const games = [{ id: PAYLOAD, name: "QM: " + PAYLOAD, state: 4, turn: 3, players: [{ id: 1, name: "Me", state: 4, team: -1 }, { id: 2, name: PAYLOAD, state: 7, team: -1 }] }];
    const stats = ctx.quickmatchStats(games, { id: "1" }, { [PAYLOAD]: { name: PAYLOAD, id: PAYLOAD } }, false);
    const container = render(ctx.quickmatchTableHtml(stats.templates, "templates", { open: PAYLOAD }) + ctx.quickmatchTableHtml(stats.opponents, "opponents", { open: "2" }));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
});

test("the Quickmatch Last games tab escapes game IDs, player and template names", () => {
    const ctx = load(["quickmatchRecentHtml", "pastGameDate", "safeUrl", "htmlEscape"]);
    const games = [{ id: PAYLOAD, result: "won", turn: 3, date: 0, template: PAYLOAD, opponents: [PAYLOAD, PAYLOAD] }, { id: "javascript:alert(1)", result: "booted", turn: 0, date: 0, template: null, opponents: [] }];
    const container = render(ctx.quickmatchRecentHtml(games, { query: "" }, 20));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    for (const link of container.querySelectorAll("a")) {
        assert.match(link.getAttribute("href"), /^\/MultiPlayer\?GameID=/);
    }
});

test("the Past Games list escapes game, player and map names", () => {
    const ctx = load(["pastGamesListHtml", "pastGamePlayer", "pastGameResult", "pastGameStatusText", "pastGameDate", "htmlEscape"]);
    const players = [{ id: 1, name: "Me", state: 4, team: -1 }, { id: 2, name: PAYLOAD, state: 7, team: -1 }, { id: 3, name: PAYLOAD, state: 4, team: -1 }];
    const games = [{ id: PAYLOAD, name: PAYLOAD, state: 4, turn: 3, date: 0, map: 1748, players: players }];
    const container = render(ctx.pastGamesListHtml(games, { id: "1" }, { 1748: { id: "737", name: PAYLOAD } }));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
});

test("the Past Tournaments search list escapes tournament, creator and clan names", () => {
    const ctx = load(["pastTournamentsListHtml", "pastTournamentKindText", "pastTournamentCoinsText", "pastTournamentBootText", "pastTournamentDate", "htmlEscape"], {
        PAST_TOURNAMENTS_STATES: ["Open", "In progress", "Finished", "Cancelled"],
        PAST_TOURNAMENTS_YOU: ["Not answered", "Joined", "Declined"]
    });
    const tournaments = [{ id: PAYLOAD, name: PAYLOAD, creator: PAYLOAD, clan: PAYLOAD, type: 0, players: 8, teamSize: 1, boot: 60000, realTime: true, fee: 5, prizes: [[1, 10]], state: 2, me: PAYLOAD, unread: true, starts: 0 }];
    const container = render(ctx.pastTournamentsListHtml(tournaments));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    for (const link of container.querySelectorAll("a")) {
        assert.match(link.getAttribute("href"), /^\/MultiPlayer\/Tournament\?ID=/);
    }
});

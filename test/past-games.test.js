const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Shaped like parsePastGamesData's games (names and ids are invented).
const pl = (id, name, state, extra = {}) => ({ id, name, state, team: -1, committed: false, ...extra });
const ME = { id: "7", name: null };
const GAMES = [
    { id: 1, name: "Nations' Cup R2 - Group C", state: 3, turn: 7, date: 846335988177, map: 1748, tournament: true, players: [pl(7, "Me", 2, { committed: true }), pl(8, "Alice", 2)] },
    { id: 2, name: "QM: Me vs Bob", state: 4, turn: 9, date: 846000000000, map: 70306, tournament: false, players: [pl(7, "Me", 4), pl(9, "Bob", 7)] },
    { id: 3, name: "Season LXXI: Carol vs Me", state: 2, turn: -1, date: 845000000000, map: 1748, tournament: false, players: [pl(10, "Carol", 2), pl(7, "Me", 2)] },
    { id: 4, name: "Big FFA", state: 3, turn: 12, date: 844000000000, map: 74965, tournament: false, players: [pl(7, "Me", 7), pl(10, "Carol", 2), pl(11, "Dan", 2), pl(12, "Eve", 3), pl(13, "Fay", 5)] },
    { id: 5, name: "MTL|Me vs Alice", state: 3, turn: 3, date: 843000000000, map: 1748, tournament: false, players: [pl(7, "Me", 2), pl(8, "Alice", 2, { committed: true })] },
    { id: 6, name: "Real-Time Ladder: Me vs Bob", state: 5, turn: -1, date: 842000000000, map: 2738, tournament: false, players: [pl(7, "Me", 2, { committed: true }), pl(9, "Bob", 2)] },
    { id: 7, name: "CW: Me vs Dan", state: 4, turn: 4, date: 841000000000, map: 1748, tournament: false, players: [pl(7, "Me", 8), pl(11, "Dan", 4)] },
    { id: 8, name: "P/R League Season 38 - Division A", state: 4, turn: 15, date: 840000000000, map: 1748, tournament: false, players: [pl(8, "Alice", 4), pl(9, "Bob", 3)] },
    { id: 9, name: "2 v 2 Ladder: Me and Alice vs Bob and Cy", state: 4, turn: 20, date: 839000000000, map: 1748, tournament: false, players: [pl(7, "Me", 9), pl(8, "Alice", 9), pl(9, "Bob", 9), pl(14, "Cy", 9)] }
];
const MAP_NAMES = { 1748: { id: "737", name: "Medium Earth" }, 74965: { id: "31916", name: "Elitist Africa 2.0" }, 70306: { id: "52000", name: "Small Earth" } };
const FUNCTIONS = ["pastGamePlayer", "pastGameState", "pastGameResult", "pastGameType", "pastGamePlayerCount", "pastGameStatusText", "pastGameMatches",
    "normalizePastGamesFilter", "pastGamesFilterIsSet", "pastGameMapOptions", "pastGameDate", "pastGamesListHtml", "isQuickmatchGameName", "htmlEscape", "setupPastGamesFilter"];

function pastGamesPage() {
    return `<table id="MyGamesTable" class="dataTable"><thead><tr><td colspan="3">Sort: <select id="Sort"><option value="3">Ended Date</option></select></td></tr></thead>`
        + `<tbody><tr class="GameRow" gameid="1"><td></td><td>war.app's own row</td></tr></tbody></table><div id="PagerContainer">1 - 25 of 9</div>`;
}

function setup({ loadPastGames } = {}) {
    const { dom, $ } = createDom(pastGamesPage(), "https://war.app/MultiPlayer/PastGames");
    const loads = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        Promise,
        addCSS: () => { },
        log: () => { },
        loadMapNames: (callback) => callback(MAP_NAMES),
        signedInPlayerId: () => $.Deferred().resolve("7").promise(),
        loadPastGames: loadPastGames || ((id, maxAge, onProgress) => {
            loads.push([id, maxAge]);
            onProgress(9, 9);
            return Promise.resolve({ time: Date.now(), games: GAMES });
        })
    });
    ctx.setupPastGamesFilter();
    const shownIds = () => Array.from($("#tuydPastResults .tuydPastList tbody tr").get().map((row) => /GameID=(\d+)/.exec($(row).find("a").attr("href"))[1]));
    const choose = async (name, value) => {
        const field = $(`#PastGamesFilterBar [name=${name}]`);
        if (field.is(":checkbox")) field.prop("checked", value); else field.val(value);
        field.trigger(name === "query" ? "input" : "change");
        await flush();
    };
    return { ctx, $, loads, shownIds, choose };
}

test("reads each game's state, your result and its kind from war.app's data", () => {
    const ctx = load(["pastGamePlayer", "pastGameState", "pastGameResult", "pastGameType", "pastGameStatusText", "isQuickmatchGameName"]);
    assert.deepEqual(GAMES.map((game) => ctx.pastGameState(game, ME)), ["running", "finished", "lobby", "out", "yourTurn", "running", "finished", "finished", "finished"]);
    assert.deepEqual(GAMES.map((game) => ctx.pastGameResult(game, ME)), [null, "won", null, "lost", null, null, "booted", null, "vote"]);
    assert.deepEqual(GAMES.map((game) => ctx.pastGameType(game)), ["tournament", "quickmatch", "seasonal", "other", "mtl", "ladder", "clanWar", "other", "ladder"]);
    assert.deepEqual(GAMES.map((game) => ctx.pastGameStatusText(game, ME)), ["Turn 8", "Won", "Lobby", "Surrendered", "Your turn", "Picking", "Booted", "Finished", "Ended by vote"]);
    assert.equal(ctx.pastGameStatusText({ ...GAMES[5], players: [pl(7, "Me", 2)] }, ME), "Your turn to pick");
    assert.equal(ctx.pastGameState(GAMES[0], { id: null, name: "Me" }), "running", "found by name when the ID isn't known");
});

test("war.app's list stays until a filter is set; then your whole history is searched", async () => {
    const { $, loads, shownIds, choose } = setup();
    assert.equal(loads.length, 0, "nothing is read before a search");
    assert.equal($("#tuydPastResults").css("display"), "none");
    await choose("state", "running");
    assert.deepEqual(JSON.parse(JSON.stringify(loads)), [["7", 600000]]);
    assert.equal($("#MyGamesTable > tbody").css("display"), "none");
    assert.equal($("#PagerContainer").css("display"), "none");
    assert.deepEqual(shownIds(), ["1", "5", "6"]);
    assert.equal($("#tuydPastResults .tuydPastHead").first().text(), "3 of 9 games · Back to war.app's list");
    await choose("state", "yourTurn");
    assert.deepEqual(shownIds(), ["5"]);
    await choose("state", "out");
    assert.deepEqual(shownIds(), ["4"]);
    await choose("state", "lobby");
    assert.deepEqual(shownIds(), ["3"]);
    $("#tuydPastResults .tuydPastBack").trigger("click");
    assert.equal($("#PastGamesFilterBar [name=state]").val(), "");
    assert.notEqual($("#MyGamesTable > tbody").css("display"), "none");
    assert.equal($("#tuydPastResults").css("display"), "none");
    assert.equal(loads.length, 1);
});

test("filters by your result and by kind of game, and searches game and player names", async () => {
    const { shownIds, choose } = setup();
    await choose("result", "won");
    assert.deepEqual(shownIds(), ["2"]);
    await choose("result", "lost");
    assert.deepEqual(shownIds(), ["4"]);
    await choose("result", "booted");
    assert.deepEqual(shownIds(), ["7"]);
    await choose("result", "vote");
    assert.deepEqual(shownIds(), ["9"]);
    await choose("result", "");
    await choose("type", "quickmatch");
    assert.deepEqual(shownIds(), ["2"]);
    await choose("type", "ladder");
    assert.deepEqual(shownIds(), ["6", "9"]);
    await choose("type", "other");
    assert.deepEqual(shownIds(), ["4", "8"]);
    await choose("type", "");
    await choose("query", "carol");
    assert.deepEqual(shownIds(), ["3", "4"]);
    await choose("query", "CUP");
    assert.deepEqual(shownIds(), ["1"]);
});

test("filters by number of players and by map, and lists oldest first", async () => {
    const { $, shownIds, choose } = setup();
    await choose("size", "more");
    assert.deepEqual(shownIds(), ["4", "9"], "a player who declined doesn't count");
    await choose("size", "oneVsOne");
    assert.deepEqual(shownIds(), ["1", "2", "3", "5", "6", "7", "8"]);
    await choose("size", "");
    await choose("minPlayers", "4");
    assert.deepEqual(shownIds(), ["4", "9"]);
    await choose("maxPlayers", "4");
    assert.deepEqual(shownIds(), ["4", "9"]);
    await choose("minPlayers", "");
    await choose("maxPlayers", "");
    const options = Array.from($("#PastGamesFilterBar [name=map] option").get().map((o) => o.value + "=" + o.textContent));
    assert.deepEqual(options, ["=Any map", "74965=Elitist Africa 2.0 (1)", "1748=Medium Earth (6)", "70306=Small Earth (1)", "2738=Map 2738 (1)"]);
    await choose("map", "1748");
    await choose("reversed", true);
    assert.deepEqual(shownIds(), ["9", "8", "7", "5", "3", "1"]);
    await choose("map", "");
    assert.deepEqual(shownIds(), ["9", "8", "7", "6", "5", "4", "3", "2", "1"], "oldest first is a filter of its own");
});

test("each game in the list has its link, date, map, the other players, your result and its turns", async () => {
    const { $, choose } = setup();
    await choose("query", "FFA");
    const cells = $("#tuydPastResults .tuydPastList tbody tr").first().children("td");
    assert.equal(cells.eq(0).find("a").attr("href"), "/MultiPlayer?GameID=4");
    assert.equal(cells.eq(0).find(".tuydPastMeta").text(), "2026-09-29 · Elitist Africa 2.0");
    assert.equal(cells.eq(1).text(), "Carol, Dan, Eve");
    assert.equal(cells.eq(2).text(), "Surrendered");
    assert.ok(cells.eq(2).hasClass("tuydPast-lost"));
    assert.equal(cells.eq(3).text(), "12");
    await choose("query", "QM");
    assert.equal($("#tuydPastResults .tuydPastList tbody td").eq(1).html(), "Bob");
    await choose("query", "Division A");
    assert.equal($("#tuydPastResults .tuydPastList tbody td").eq(1).html(), "<b>Alice</b>, Bob", "the winner in bold, in a game you didn't play");
});

test("shows 100 games at a time", async () => {
    const many = Array.from({ length: 230 }, (_, i) => ({ ...GAMES[1], id: 1000 + i }));
    const { $, shownIds, choose } = setup({ loadPastGames: () => Promise.resolve({ time: 0, games: many }) });
    await choose("type", "quickmatch");
    assert.equal(shownIds().length, 100);
    $("#tuydPastResults .tuydPastShowMore").trigger("click");
    assert.equal(shownIds().length, 200);
    assert.equal($("#tuydPastResults .tuydPastShowMore").text(), "Show 30 more");
});

test("says so when the games can't be read, and tries again on request", async () => {
    let attempts = 0;
    const { $, shownIds, choose } = setup({ loadPastGames: () => ++attempts === 1 ? Promise.reject(new Error("war.app's game list couldn't be read")) : Promise.resolve({ time: 0, games: GAMES }) });
    await choose("state", "lobby");
    assert.equal($("#tuydPastResults .tuydPastHead").text(), "Couldn't read your games. Try again · Back to war.app's list");
    await choose("state", "finished");
    assert.equal(attempts, 1, "not again on each change");
    $("#tuydPastResults .tuydPastRetry").trigger("click");
    await flush();
    assert.deepEqual(shownIds(), ["2", "7", "8", "9"]);
});

test("loadPastGames keeps every game for the session and reads again when it's too old or another player's", async () => {
    const { dom } = createDom("");
    const pages = [];
    const ctx = load(["loadPastGames"], {
        Promise,
        sessionStorage: dom.window.sessionStorage,
        PAST_GAMES_KEY: "tidyUpYourDashboard.pastGames",
        fetchPastGamesPage: () => { },
        fetchAllPastGames: (fetchPage, pageSize) => {
            pages.push(pageSize);
            return Promise.resolve([{ id: pages.length }]);
        }
    });
    const first = await ctx.loadPastGames("7", 60000);
    assert.equal(first.games[0].id, 1);
    assert.equal((await ctx.loadPastGames("7", 60000)).games[0].id, 1, "this session's copy");
    assert.equal((await ctx.loadPastGames("8", 60000)).games[0].id, 2, "another player's copy isn't used");
    assert.equal((await ctx.loadPastGames("8", 0)).games[0].id, 3, "too old");
    assert.deepEqual(pages, [200, 200, 200]);
});

test("recognizes the Past Games page", () => {
    const at = (url) => load(["pageIsPastGames"], { location: { href: url } });
    assert.ok(at("https://war.app/MultiPlayer/PastGames").pageIsPastGames());
    assert.ok(at("https://war.app/MultiPlayer/PastGames?Sort=1").pageIsPastGames());
    assert.ok(!at("https://war.app/MultiPlayer/").pageIsPastGames());
});

test("a chosen map stays in the list even when no game is on it, and filters are cleaned up", () => {
    const ctx = load(["pastGameMapOptions", "normalizePastGamesFilter", "pastGamesFilterIsSet"]);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.pastGameMapOptions([], MAP_NAMES, "74965"))), [{ key: "74965", name: "Elitist Africa 2.0", games: 0 }]);
    const filter = ctx.normalizePastGamesFilter({ state: "running", speed: "realTime", map: "unknown", type: "nonsense", result: "won", minPlayers: "-2" });
    assert.deepEqual(JSON.parse(JSON.stringify(filter)), { state: "running", result: "won", type: "", map: "", minPlayers: 0, maxPlayers: 0, size: "", reversed: false, query: "" });
    assert.equal(ctx.pastGamesFilterIsSet(ctx.normalizePastGamesFilter({ query: "  " })), false);
    assert.equal(ctx.pastGamesFilterIsSet(ctx.normalizePastGamesFilter({ reversed: true })), true);
});

test("war.app's map list gives each map's thumbnail folder, ID and name", () => {
    const { dom, $ } = createDom("");
    const html = `<table><tr><td>
        <div style="width: 210px"><a href="/Map/41539-"><img src="https://warappcdn.com/s3/Data/Thumbs/Maps/95065/22_Main.jpg" /></a><br /> ! <br /><font class="text-muted">by someone<br />Rated 3.35 / 5</font></div>
        <div style="width: 210px"><a href="/Map/737-Medium-Earth"><img src="https://warappcdn.com/s3/Data/Thumbs/Maps/1748/3_Main.jpg" /></a><br /> Medium Earth <br /><font class="text-muted">by Fizzer<br />Rated 4.19 / 5</font></div>
    </td></tr></table>`;
    const ctx = load(["parseMapList"], { ...domGlobals(dom, $), DOMParser: dom.window.DOMParser });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.parseMapList(html))), { 95065: { id: "41539", name: "!" }, 1748: { id: "737", name: "Medium Earth" } });
});

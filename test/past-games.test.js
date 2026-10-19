const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors a row of war.app's Past Games page (names and ids are invented).
function pastGameRow(id, name, { status = "Finished", boot = "3 days", players = ["Me", "Alice"], yourTurn = false, map = "1748", picture = "" } = {}) {
    return `<tr class="GameRow" gameid="${id}"><td style="width:142px"><span style="position: relative"><a href="/MultiPlayer?GameID=${id}&amp;From=PastGames"><img class="MyGamesGameThumbnail" src="https://warappcdn.com/s3/Data/Thumbs/${picture || "Maps/" + map + "/3_Fogged.jpg"}"></a><span class="BootTimeLabel">${boot}</span></span></td>`
        + `<td><a style="font-size: 17px; color: white" href="/MultiPlayer?GameID=${id}&amp;From=PastGames">${name}</a><br>`
        + (yourTurn ? `<span style="color: #FFFF00">Your turn for 2 hours</span><br>` : "")
        + `<div class="MyGamesGameBoxesRow">${players.map((title) => `<span class="MyGamesGameBox" title="${title}">&nbsp;</span>`).join("")}</div>`
        + `<p style="margin: -10px 0px -4px 0px">${status}</p></td></tr>`;
}

function pastGames(rows) {
    return `<table id="MyGamesTable" class="dataTable"><thead><tr><td colspan="3">Sort: <select id="Sort"><option value="3">Ended Date</option></select></td></tr></thead>`
        + `<tbody>${rows.join("")}</tbody></table>`;
}

const FUNCTIONS = ["parseBootTime", "pastGameState", "pastGameSpeed", "pastGameMapKey", "pastGamePlayers", "pastGameMapOptions", "pastGameMatches", "normalizePastGamesFilter", "orderPastGames", "applyPastGamesFilter", "setupPastGamesFilter"];
const MAP_NAMES = { 1748: { id: "737", name: "Medium Earth" }, 74965: { id: "31916", name: "Elitist Africa 2.0" } };

const ROWS = [
    pastGameRow("1", "Nations' Cup R2 - Group C", { status: "Turn 7.  Waiting on Alice for 2 minutes", boot: "4 days 13 hours" }),
    pastGameRow("2", "Quick 1v1", { status: "Finished", boot: "5 minutes", players: ["Me", "Bob"] }),
    pastGameRow("3", "Seasonal", { status: "Lobby" }),
    pastGameRow("4", "Big FFA", { status: "Surrendered", players: ["Me", "Carol: This player has surrendered", "Dan", "Eve"], map: "74965" }),
    pastGameRow("5", "My move", { status: "Turn 3", yourTurn: true }),
    pastGameRow("6", "Draft", { status: "Picking.  Waiting on Dave for 2 hours 30 minutes", picture: "Games/4542/45424572/Turn7f.jpg" })
];

function setup(rows, saved) {
    const { dom, $ } = createDom(pastGames(rows), "https://war.app/MultiPlayer/PastGames");
    const writes = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        addCSS: () => { },
        loadMapNames: (callback) => callback(MAP_NAMES),
        Database: {
            Table: { Settings: "Settings" },
            Row: { Settings: { Name: "name" } },
            readIndex: (table, row, value, callback) => callback(saved === undefined ? undefined : { name: value, value: saved }),
            update: (table, row) => writes.push(JSON.parse(JSON.stringify(row)))
        }
    });
    ctx.setupPastGamesFilter();
    const shownIds = () => Array.from($("#MyGamesTable tbody tr.GameRow").filter(function () {
        return !$(this).hasClass("tuyd-pastHidden");
    }).map(function () {
        return $(this).attr("gameid");
    }).get());
    const choose = (name, value) => {
        const field = $(`#PastGamesFilterBar [name=${name}]`);
        if (field.is(":checkbox")) field.prop("checked", value); else field.val(value);
        field.trigger(name === "query" ? "input" : "change");
    };
    return { ctx, $, writes, shownIds, choose };
}

test("reads each game's state from its status line", () => {
    const { ctx, $ } = setup(ROWS);
    const states = $("#MyGamesTable tr.GameRow").map(function () {
        return ctx.pastGameState(this);
    }).get();
    assert.deepEqual(Array.from(states), ["running", "finished", "lobby", "out", "yourTurn", "running"]);
});

test("filters by state, with your-turn games counted as in progress", () => {
    const { $, shownIds, choose } = setup(ROWS);
    assert.equal($("#PastGamesFilterCount").text(), "");
    choose("state", "running");
    assert.deepEqual(shownIds(), ["1", "5", "6"]);
    assert.equal($("#PastGamesFilterCount").text(), "3 of 6 shown");
    choose("state", "yourTurn");
    assert.deepEqual(shownIds(), ["5"]);
    choose("state", "out");
    assert.deepEqual(shownIds(), ["4"]);
    choose("state", "lobby");
    assert.deepEqual(shownIds(), ["3"]);
});

test("filters by speed and searches game and player names", () => {
    const { shownIds, choose } = setup(ROWS);
    choose("speed", "realTime");
    assert.deepEqual(shownIds(), ["2"]);
    choose("speed", "multiDay");
    assert.deepEqual(shownIds(), ["1", "3", "4", "5", "6"]);
    choose("speed", "");
    choose("query", "carol");
    assert.deepEqual(shownIds(), ["4"], "a player's name matches without the status after the colon");
    choose("query", "CUP");
    assert.deepEqual(shownIds(), ["1"]);
});

test("reverses the page and keeps the order when the site adds rows", async () => {
    const { $, shownIds, choose } = setup(ROWS.slice(0, 3));
    choose("reversed", true);
    assert.deepEqual(shownIds(), ["3", "2", "1"]);
    choose("reversed", false);
    assert.deepEqual(shownIds(), ["1", "2", "3"]);
    choose("reversed", true);
    $("#MyGamesTable tbody").html(ROWS.slice(3).join(""));
    await flush();
    assert.deepEqual(shownIds(), ["6", "5", "4"]);
});

test("saves state, speed and order but not the search, and starts from them", () => {
    const { writes, choose } = setup(ROWS);
    choose("query", "cup");
    assert.equal(writes.length, 0);
    choose("state", "finished");
    assert.deepEqual(writes.at(-1), { name: "pastGamesFilter", value: { state: "finished", speed: "", reversed: false, map: "", size: "", minPlayers: 0, maxPlayers: 0 } });

    const again = setup(ROWS, { state: "lobby", speed: "nonsense", reversed: true, query: "old" });
    assert.equal(again.$("#PastGamesFilterBar [name=query]").val(), "");
    assert.equal(again.$("#PastGamesFilterBar [name=speed]").val(), "");
    assert.deepEqual(again.shownIds(), ["3"]);
    assert.equal(again.$("#MyGamesTable tbody tr.GameRow").first().attr("gameid"), "6");
});

test("recognizes the Past Games page", () => {
    const at = (url) => load(["pageIsPastGames"], { location: { href: url } });
    assert.ok(at("https://war.app/MultiPlayer/PastGames").pageIsPastGames());
    assert.ok(at("https://war.app/MultiPlayer/PastGames?Sort=1").pageIsPastGames());
    assert.ok(!at("https://war.app/MultiPlayer/").pageIsPastGames());
});

test("a boot time of up to an hour is real-time, anything longer multi-day", () => {
    const { dom, $ } = createDom(pastGames([
        pastGameRow("1", "a", { boot: "5 minutes" }),
        pastGameRow("2", "b", { boot: "1 hour" }),
        pastGameRow("3", "c", { boot: "1 hour 30 minutes" }),
        pastGameRow("4", "d", { boot: "3 days" })
    ]), "https://war.app/MultiPlayer/PastGames");
    const ctx = load(["parseBootTime", "pastGameSpeed"], domGlobals(dom, $));
    assert.deepEqual(Array.from($("tr.GameRow").get().map((row) => ctx.pastGameSpeed(row))), ["realTime", "realTime", "multiDay", "multiDay"]);
});

test("the map list names this page's maps, with how many games each, and filters by one", () => {
    const { $, choose, shownIds } = setup(ROWS);
    const options = Array.from($("#PastGamesFilterBar [name=map] option").get().map((o) => o.value + "=" + o.textContent));
    assert.deepEqual(options, ["=Any map", "74965=Elitist Africa 2.0 (1)", "1748=Medium Earth (4)", "unknown=Map not shown (1)"]);
    choose("map", "74965");
    assert.deepEqual(shownIds(), ["4"]);
    choose("map", "unknown");
    assert.deepEqual(shownIds(), ["6"], "games showing a picture of the game instead of the map");
});

test("filters by number of players: 1 v 1, more than two, and from–to", () => {
    const { choose, shownIds } = setup(ROWS);
    choose("size", "more");
    assert.deepEqual(shownIds(), ["4"]);
    choose("size", "oneVsOne");
    assert.deepEqual(shownIds(), ["1", "2", "3", "5", "6"]);
    choose("size", "");
    choose("minPlayers", "3");
    assert.deepEqual(shownIds(), ["4"]);
    choose("minPlayers", "");
    choose("maxPlayers", "2");
    assert.deepEqual(shownIds(), ["1", "2", "3", "5", "6"]);
});

test("a saved map filter stays in the list even when this page has no game on that map", () => {
    const { dom, $ } = createDom("");
    const ctx = load(["pastGameMapKey", "pastGameMapOptions"], domGlobals(dom, $));
    const options = JSON.parse(JSON.stringify(ctx.pastGameMapOptions([], MAP_NAMES, "74965")));
    assert.deepEqual(options, [{ key: "74965", name: "Elitist Africa 2.0", games: 0 }]);
    assert.equal(JSON.parse(JSON.stringify(ctx.pastGameMapOptions([], {}, "5"))).at(0).name, "Map 5", "an unknown map is named by its number");
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

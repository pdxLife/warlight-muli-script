const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors the markup of war.app's /MultiPlayer/ dashboard.
function dashboard({ myGames, openGames, multiDay, realTime, both, myGamesCount = "", openGamesData = "" }) {
    return `<table id="MyGamesTable"><thead><tr><td><h2>My Games</h2> <span id="NumberOfMyGamesLabel">${myGamesCount}</span></td></tr></thead>
        <tbody>${myGames}</tbody></table>
        <table id="OpenGamesTable"><thead><tr><td>
            <label id="MultiDayRadio" class="btn btn-primary"><input type="radio" name="pace">Multi-Day (${multiDay})</label>
            <label id="RealTimeRadio" class="btn btn-primary"><input type="radio" name="pace">Real-Time (${realTime})</label>
            <label id="BothRadio" class="btn btn-primary active"><input type="radio" name="pace" checked>Both (${both})</label>
        </td></tr></thead>
        <tbody>${openGames}</tbody></table>
        <script type="text/plain" id="AllOpenGamesData">${openGamesData}</script>`;
}

// Stands in for war.app's WL_MPDashInit: it appends the My Games footer and, from the game list in
// #AllOpenGamesData (here just a count), a "Show more" row when not every open game is shown.
function fakeDashInit(dom, $, inits) {
    return (myGamesCount) => {
        const data = dom.window.document.getElementById("AllOpenGamesData").textContent;
        inits.push({ myGamesCount, data });
        $("#MyGamesTable > tbody").append(`<tr><td colspan="2"><a href="PastGames">Past games</a><a href="/MultiPlayer?CreateGame=1">Create Game</a></td></tr>`);
        const hidden = Number(data) - $("#OpenGamesTable > tbody > tr[gameid]").length;
        if (hidden > 0) {
            $("#OpenGamesTable > tbody").append(`<tr><td colspan="2"><a href="#" id="ShowMoreOpenGamesLink">+ Show ${hidden} more open games</a></td></tr>`);
        }
    };
}

function setup(serverHtml, { failRequest = false, withDashInit = true } = {}) {
    const { dom, $ } = createDom(dashboard({
        myGames: `<tr class="GameRow"><td>old my game</td></tr>`,
        openGames: `<tr class="GameRow" gameid="1"><td>old open game</td></tr>`,
        multiDay: 1, realTime: 1, both: 2, myGamesCount: "(1)", openGamesData: "1"
    }));
    const inits = [];
    const requests = [];
    $.ajax = (options) => {
        requests.push(options);
        const response = $.Deferred();
        return failRequest ? response.reject({ statusText: "error" }).promise() : response.resolve(serverHtml).promise();
    };
    const logs = [];
    const ctx = load(["fetchDashboard", "refreshMyGames", "refreshOpenGames", "refreshGameTable", "updateGameCounts", "rerunDashboardInit"], {
        ...domGlobals(dom, $),
        DOMParser: dom.window.DOMParser,
        log: (entry) => logs.push(entry),
        ...(withDashInit ? { WL_MPDashInit: fakeDashInit(dom, $, inits) } : {})
    });
    return { ctx, dom, $, requests, logs, inits };
}

const fresh = dashboard({
    myGames: `<tr class="GameRow"><td>new my game</td></tr><script>window.injected = true;</script>`,
    openGames: `<tr class="GameRow" gameid="2"><td>new open game A</td></tr><tr class="GameRow" gameid="3"><td>new open game B</td></tr>`,
    multiDay: 59, realTime: 9, both: 68, myGamesCount: "(3)", openGamesData: "5"
});

test("one dashboard fetch refreshes both tables and their counts", async () => {
    const { ctx, dom, $, requests } = setup(fresh);
    $("#MultiDayRadio input").prop("checked", true);

    const page = ctx.fetchDashboard();
    ctx.refreshMyGames(page);
    ctx.refreshOpenGames(page);
    await flush();

    assert.deepEqual(requests.map((r) => r.url), ["/MultiPlayer/"]);
    assert.equal($("#MyGamesTable .GameRow").text(), "new my game");
    assert.deepEqual($("#OpenGamesTable .GameRow").map((i, row) => $(row).text()).get(), ["new open game A", "new open game B"]);
    assert.equal($("#NumberOfMyGamesLabel").text(), "(3)");
    assert.equal($("#MultiDayRadio").text().trim(), "Multi-Day (59)");
    assert.equal($("#RealTimeRadio").text().trim(), "Real-Time (9)");
    assert.equal($("#BothRadio").text().trim(), "Both (68)");
    assert.equal($("#MultiDayRadio input").prop("checked"), true, "selected pace is kept");
    assert.equal($("#BothRadio").hasClass("active"), true);
    assert.equal(dom.window.document.querySelectorAll("#MyGamesTable script").length, 0);
});

test("refreshing a single table fetches the dashboard itself", async () => {
    const { ctx, $, requests } = setup(fresh);
    ctx.refreshMyGames();
    await flush();
    assert.equal(requests.length, 1);
    assert.equal($("#MyGamesTable .GameRow").text(), "new my game");
});

test("a failed refresh keeps the old rows, un-dims the table and logs", async () => {
    const { ctx, $, logs } = setup(fresh, { failRequest: true });
    ctx.refreshOpenGames();
    await flush();
    assert.equal($("#OpenGamesTable .GameRow").text(), "old open game");
    assert.equal($("#OpenGamesTable tbody").css("opacity"), "1");
    assert.ok(logs.some((l) => l.includes("Error refreshing #OpenGamesTable")));
});

test("refreshing replaces the rows without nesting another tbody", async () => {
    const { ctx, $, dom } = setup(fresh);
    ctx.refreshMyGames();
    await flush();
    ctx.refreshMyGames();
    await flush();
    assert.equal(dom.window.document.querySelectorAll("#MyGamesTable tbody").length, 1);
    assert.equal($("#MyGamesTable > tbody > tr.GameRow").text(), "new my game");
});

test("after a refresh, war.app's footer and Show more row come back once, from the fresh game list", async () => {
    const { ctx, dom, $, inits } = setup(fresh);
    const page = ctx.fetchDashboard();
    ctx.refreshMyGames(page);
    ctx.refreshOpenGames(page);
    await flush();
    assert.equal(dom.window.document.getElementById("AllOpenGamesData").textContent, "5");
    assert.deepEqual(inits.at(-1), { myGamesCount: 1, data: "5" });
    assert.equal($("#MyGamesTable a[href='PastGames']").length, 1);
    assert.equal($("#MyGamesTable > tbody > tr").last().find("a[href='PastGames']").length, 1, "the footer stays last");
    assert.equal($("#ShowMoreOpenGamesLink").length, 1);
    assert.equal($("#ShowMoreOpenGamesLink").text(), "+ Show 3 more open games");

    ctx.refreshMyGames();
    await flush();
    assert.equal($("#MyGamesTable a[href='PastGames']").length, 1);
    assert.equal($("#ShowMoreOpenGamesLink").length, 1);
});

test("refresh still works where war.app's dashboard init is missing", async () => {
    const { ctx, $, logs } = setup(fresh, { withDashInit: false });
    ctx.refreshMyGames();
    await flush();
    assert.equal($("#MyGamesTable .GameRow").text(), "new my game");
    assert.equal($("#ShowMoreOpenGamesLink").length, 0);
    assert.ok(!logs.some((l) => l.includes("Error re-running")));
});

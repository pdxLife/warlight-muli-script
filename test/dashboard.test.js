const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors the markup of war.app's /MultiPlayer/ dashboard.
function dashboard({ myGames, openGames, multiDay, realTime, both, myGamesCount = "" }) {
    return `<table id="MyGamesTable"><thead><tr><td><h2>My Games</h2> <span id="NumberOfMyGamesLabel">${myGamesCount}</span></td></tr></thead>
        <tbody>${myGames}</tbody></table>
        <table id="OpenGamesTable"><thead><tr><td>
            <label id="MultiDayRadio" class="btn btn-primary"><input type="radio" name="pace">Multi-Day (${multiDay})</label>
            <label id="RealTimeRadio" class="btn btn-primary"><input type="radio" name="pace">Real-Time (${realTime})</label>
            <label id="BothRadio" class="btn btn-primary active"><input type="radio" name="pace" checked>Both (${both})</label>
        </td></tr></thead>
        <tbody>${openGames}</tbody></table>`;
}

function setup(serverHtml, { failRequest = false } = {}) {
    const { dom, $ } = createDom(dashboard({
        myGames: `<tr class="GameRow"><td>old my game</td></tr>`,
        openGames: `<tr class="GameRow"><td>old open game</td></tr>`,
        multiDay: 1, realTime: 1, both: 2, myGamesCount: "(1)"
    }));
    const requests = [];
    $.ajax = (options) => {
        requests.push(options);
        const response = $.Deferred();
        return failRequest ? response.reject({ statusText: "error" }).promise() : response.resolve(serverHtml).promise();
    };
    const logs = [];
    const ctx = load(["fetchDashboard", "refreshMyGames", "refreshOpenGames", "refreshGameTable", "updateGameCounts"], {
        ...domGlobals(dom, $),
        DOMParser: dom.window.DOMParser,
        log: (entry) => logs.push(entry)
    });
    return { ctx, dom, $, requests, logs };
}

const fresh = dashboard({
    myGames: `<tr class="GameRow"><td>new my game</td></tr><script>window.injected = true;</script>`,
    openGames: `<tr class="GameRow"><td>new open game A</td></tr><tr class="GameRow"><td>new open game B</td></tr>`,
    multiDay: 59, realTime: 9, both: 68, myGamesCount: "(3)"
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

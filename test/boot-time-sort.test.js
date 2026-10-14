const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// Mirrors a My Games row on war.app's logged-in dashboard (names and ids are invented).
function gameRow(id, boot, status) {
    return `<tr class="GameRow" gameid="${id}"><td style="width:142px"><span style="position: relative"><a href="/MultiPlayer?GameID=${id}&amp;From=MPDashboard"><img class="MyGamesGameThumbnail" src="x.jpg"></a>`
        + (boot ? `<span class="BootTimeLabel" style="color: #00DD00">${boot}</span>` : "")
        + `</span></td><td><a style="font-size: 17px; color: white" href="/MultiPlayer?GameID=${id}&amp;From=MPDashboard">Game ${id}</a><br>`
        + `<div class="MyGamesGameBoxesRow"><span class="MyGamesGameBox" title="Alice: Waiting on this player to commit orders"><span class="MyGamesGameBoxDot">●</span></span></div>`
        + `<p style="margin: -10px 0px -4px 0px">Picking</p><div></div>${status}</td></tr>`;
}
const yourTurn = (elapsed) => `<span style="color: red">Your turn for ${elapsed}.</span> `;
const waiting = `<span style="color: #F5DEB3">Unread public chat messages.</span> `;

function setup(rows) {
    const { dom, $ } = createDom(`<table id="MyGamesTable"><thead><tr><td><h2>My Games</h2></td></tr></thead><tbody>${rows.join("")}`
        + `<tr><td colspan="2"><a href="PastGames">Past games</a></td></tr></tbody></table>`);
    const ctx = load(["parseBootTime", "bootMinutesLeft", "sortMyGamesByBootTime", "setupBootTimeSort"], domGlobals(dom, $));
    const order = () => Array.from($("#MyGamesTable tr.GameRow").map(function () {
        return $(this).attr("gameid");
    }).get());
    return { ctx, dom, $, order };
}

test("time left is the boot label minus how long it has been your turn", () => {
    const { ctx, $ } = setup([
        gameRow("1", "3 days", yourTurn("12 hours")),
        gameRow("2", "1 day 6 hours", yourTurn("2 hours 30 minutes")),
        gameRow("3", "5 minutes", yourTurn("1 minute 20 seconds")),
        gameRow("4", "Never", yourTurn("4 days")),
        gameRow("5", "3 days", waiting)
    ]);
    const left = (id) => ctx.bootMinutesLeft($(`tr[gameid=${id}]`)[0]);
    assert.equal(left("1"), 2 * 1440 + 12 * 60);
    assert.equal(left("2"), 27 * 60 + 30);
    assert.ok(Math.abs(left("3") - (3 + 40 / 60)) < 1e-9);
    assert.equal(left("4"), Infinity);
    assert.equal(left("5"), null);
});

test("your-turn games are ordered by time left and keep the slots they had", () => {
    const { ctx, order } = setup([
        gameRow("a", "3 days", yourTurn("1 hour")),
        gameRow("b", "3 days", waiting),
        gameRow("c", "Never", yourTurn("2 days")),
        gameRow("d", "1 day", yourTurn("23 hours")),
        gameRow("e", "2 days", waiting),
        gameRow("f", "12 hours", yourTurn("13 hours")),
        gameRow("g", "Never", yourTurn("1 hour"))
    ]);
    ctx.sortMyGamesByBootTime();
    assert.deepEqual(order(), ["f", "b", "d", "a", "e", "c", "g"]);
});

test("re-sorts after My Games is refreshed, not after other tables", () => {
    const { ctx, dom, $, order } = setup([gameRow("1", "1 day", yourTurn("1 hour")), gameRow("2", "1 day", yourTurn("2 hours"))]);
    ctx.setupBootTimeSort();
    assert.deepEqual(order(), ["2", "1"]);
    const refreshed = [gameRow("3", "3 days", yourTurn("1 hour")), gameRow("4", "1 day", yourTurn("1 hour"))].join("");
    $("#MyGamesTable tbody").html(refreshed);
    $(dom.window.document).trigger("tuyd:gamesRefreshed", ["#OpenGamesTable"]);
    assert.deepEqual(order(), ["3", "4"]);
    $(dom.window.document).trigger("tuyd:gamesRefreshed", ["#MyGamesTable"]);
    assert.deepEqual(order(), ["4", "3"]);
});

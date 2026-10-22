const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

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

function setup(rows, { byWaiting = false } = {}) {
    const { dom, $ } = createDom(`<table id="MyGamesTable"><thead><tr><td><h2>My Games</h2></td></tr></thead><tbody>${rows.join("")}`
        + `<tr><td colspan="2"><a href="PastGames">Past games</a></td></tr></tbody></table>`);
    const ctx = load(["parseBootTime", "myGameTurnSpan", "myGameTurnMinutes", "bootMinutesLeft", "sortMyGamesByBootTime", "setupBootTimeSort", "formatBootLeft", "showBootTimeLeft", "setupBootTimeLeft"], {
        ...domGlobals(dom, $),
        addCSS: () => { },
        ifSettingIsEnabled: (setting, positive) => {
            if (setting === "sortTurnsByWaiting" && byWaiting) {
                positive();
            }
        }
    });
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

test("re-sorts whenever My Games is re-drawn, by the script or by war.app", async () => {
    const { ctx, $, order } = setup([gameRow("1", "1 day", yourTurn("1 hour")), gameRow("2", "1 day", yourTurn("2 hours"))]);
    ctx.setupBootTimeSort();
    assert.deepEqual(order(), ["2", "1"]);
    $("#MyGamesTable tbody").html([gameRow("3", "3 days", yourTurn("1 hour")), gameRow("4", "1 day", yourTurn("1 hour"))].join(""));
    await flush();
    assert.deepEqual(order(), ["4", "3"]);
    // war.app's Filter button empties the table, shows "Loading..." and then appends the rows one by one.
    const tbody = $("#MyGamesTable tbody");
    tbody.children().remove();
    tbody.append('<tr><td colspan="2">Loading...</td></tr>');
    await flush();
    tbody.children().remove();
    tbody.append(gameRow("5", "2 days", yourTurn("1 hour")));
    tbody.append(gameRow("6", "2 days", waiting));
    tbody.append(gameRow("7", "5 hours", yourTurn("1 hour")));
    await flush();
    assert.deepEqual(order(), ["7", "6", "5"]);
});

test("with the setting on, your-turn games are sorted by how long they've waited, longest first", () => {
    const rows = [
        gameRow("a", "3 days", yourTurn("14 minutes")),
        gameRow("b", "6 days", yourTurn("2 days")),
        gameRow("c", "2 days", waiting),
        gameRow("d", "5 days", yourTurn("13 hours"))
    ];
    const urgent = setup(rows);
    urgent.ctx.setupBootTimeSort();
    assert.deepEqual(urgent.order(), ["a", "b", "c", "d"], "time left: 2d 23h, 4d, then 4d 11h");
    const waited = setup(rows, { byWaiting: true });
    waited.ctx.setupBootTimeSort();
    assert.deepEqual(waited.order(), ["b", "d", "c", "a"], "2 days, 13 hours, then 14 minutes; the waiting game keeps its slot");
});

test("time left reads as days and hours, hours and minutes, or minutes", () => {
    const { ctx } = setup([]);
    assert.equal(ctx.formatBootLeft(2 * 1440 + 23 * 60 + 46), "2d 23h");
    assert.equal(ctx.formatBootLeft(4 * 1440), "4d");
    assert.equal(ctx.formatBootLeft(4 * 60 + 10), "4h 10m");
    assert.equal(ctx.formatBootLeft(3 * 60), "3h");
    assert.equal(ctx.formatBootLeft(12.5), "12m");
    assert.equal(ctx.formatBootLeft(0.4), "now");
    assert.equal(ctx.formatBootLeft(-30), "now");
    assert.equal(ctx.formatBootLeft(Infinity), null, "no boot");
});

test("each your-turn game says how long until you're booted, and keeps saying it after a re-draw", async () => {
    const { ctx, $ } = setup([
        gameRow("1", "3 days", yourTurn("14 minutes")),
        gameRow("2", "Never", yourTurn("2 days")),
        gameRow("3", "2 days", waiting)
    ]);
    ctx.setupBootTimeLeft();
    const hint = (id) => $(`tr[gameid=${id}] .tuydBootLeft`);
    assert.equal(hint("1").text(), "· boots in 2d 23h");
    assert.equal(hint("1").prev().text().trim(), "Your turn for 14 minutes.", "right after war.app's own line");
    assert.equal(hint("2").length, 0, "a game without a boot");
    assert.equal(hint("3").length, 0, "not your turn");
    ctx.showBootTimeLeft();
    assert.equal($(".tuydBootLeft").length, 1, "a second pass doesn't add another");
    $("#MyGamesTable tbody").html(gameRow("4", "1 day", yourTurn("20 hours")));
    await flush();
    assert.equal(hint("4").text(), "· boots in 4h");
});

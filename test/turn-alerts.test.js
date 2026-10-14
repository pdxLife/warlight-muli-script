const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors a My Games row on war.app's logged-in dashboard (names and ids are invented).
function gameRow(id, name, status) {
    return `<tr class="GameRow" gameid="${id}"><td style="width:142px"><span style="position: relative"><a href="/MultiPlayer?GameID=${id}&amp;From=MPDashboard"><img class="MyGamesGameThumbnail" src="x.jpg"></a><span class="BootTimeLabel" style="color: #00DD00">3 days</span></span></td>`
        + `<td><a style="font-size: 17px; color: white" href="/MultiPlayer?GameID=${id}&amp;From=MPDashboard">${name}</a><br>`
        + `<div class="MyGamesGameBoxesRow"><span class="MyGamesGameBox" title="Alice: Waiting on this player to commit orders"><span class="MyGamesGameBoxDot">●</span></span></div>`
        + `<p>Picking</p>${status}</td></tr>`;
}
const yourTurn = (minutes) => `<span style="color: red">Your turn for ${minutes} minutes.</span>`;
const waiting = `<span>Waiting for Alice</span>`;

function myGames(rows) {
    return `<table id="MyGamesTable"><thead><tr><td><h2>My Games</h2></td></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function setup(rows, { permission = "granted", notificationsEnabled = true } = {}) {
    const { dom, $ } = createDom(myGames(rows));
    dom.window.document.title = "Multi-Player Dashboard - War.app";
    const notifications = [];
    function Notification(title, options) {
        notifications.push({ title, options });
    }
    Notification.permission = permission;
    const refreshes = [];
    const ctx = load(["findGamesAwaitingTurn", "updateTurnBadge", "notifyNewTurns", "setupTurnAlerts", "siteName"], {
        ...domGlobals(dom, $),
        Notification,
        TURN_CHECK_INTERVAL: 300000,
        Date,
        lastRefresh: new Date(0),
        log: () => { },
        setInterval: (fn, ms) => {
            const handle = setInterval(fn, ms);
            handle?.unref?.();
            return handle;
        },
        refreshMyGames: () => refreshes.push(true),
        ifSettingIsEnabled: (name, yes, no) => (name === "turnNotifications" && notificationsEnabled ? yes() : no && no())
    });
    const replaceRows = (newRows) => {
        $("#MyGamesTable tbody").html(newRows.join(""));
        $(dom.window.document).trigger("tuyd:gamesRefreshed", ["#MyGamesTable"]);
    };
    return { ctx, dom, $, notifications, refreshes, replaceRows };
}

test("finds games whose row says it is your turn", () => {
    const { ctx, dom } = setup([gameRow("1", "First game", yourTurn(0)), gameRow("2", "Second game", waiting), gameRow("3", "Third game", yourTurn(42))]);
    const games = JSON.parse(JSON.stringify(ctx.findGamesAwaitingTurn(dom.window.document)));
    assert.deepEqual(games, [
        { id: "1", name: "First game", href: "/MultiPlayer?GameID=1&From=MPDashboard" },
        { id: "3", name: "Third game", href: "/MultiPlayer?GameID=3&From=MPDashboard" }
    ]);
});

test("tab title shows how many games need you and clears when none do", () => {
    const { ctx, dom } = setup([]);
    ctx.updateTurnBadge([{ id: "1" }, { id: "2" }]);
    assert.equal(dom.window.document.title, "(2) Multi-Player Dashboard - War.app");
    ctx.updateTurnBadge([{ id: "1" }]);
    assert.equal(dom.window.document.title, "(1) Multi-Player Dashboard - War.app");
    ctx.updateTurnBadge([]);
    assert.equal(dom.window.document.title, "Multi-Player Dashboard - War.app");
});

test("only games that newly need you trigger a notification", async () => {
    const { ctx, dom, notifications, replaceRows } = setup([gameRow("1", "Already mine", yourTurn(5))]);
    ctx.setupTurnAlerts();
    assert.equal(dom.window.document.title, "(1) Multi-Player Dashboard - War.app");
    assert.equal(notifications.length, 0, "games already waiting at page load are not announced");

    replaceRows([gameRow("1", "Already mine", yourTurn(10)), gameRow("2", "New one", yourTurn(0))]);
    assert.deepEqual(notifications.map((n) => n.title), ["Your turn: New one"]);
    assert.equal(notifications[0].options.tag, "tuyd-turn-2");
    assert.equal(dom.window.document.title, "(2) Multi-Player Dashboard - War.app");

    replaceRows([gameRow("1", "Already mine", yourTurn(15)), gameRow("2", "New one", yourTurn(5))]);
    assert.equal(notifications.length, 1, "no repeat while the game keeps waiting");

    replaceRows([gameRow("2", "New one", waiting)]);
    replaceRows([gameRow("2", "New one", yourTurn(0))]);
    assert.equal(notifications.length, 2, "a game that becomes your turn again is announced again");
});

test("no desktop notification without the setting or browser permission", () => {
    for (const options of [{ notificationsEnabled: false }, { permission: "default" }, { permission: "denied" }]) {
        const { ctx, notifications, replaceRows, dom } = setup([], options);
        ctx.setupTurnAlerts();
        replaceRows([gameRow("9", "Game", yourTurn(0))]);
        assert.equal(notifications.length, 0, JSON.stringify(options));
        assert.equal(dom.window.document.title, "(1) Multi-Player Dashboard - War.app", "the title badge still works");
    }
});

test("checks in the background only while the tab is unattended", async (t) => {
    t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 10 * 60 * 1000 });
    const { ctx, dom, refreshes } = setup([]);
    let focused = true;
    Object.defineProperty(dom.window.document, "hidden", { configurable: true, get: () => false });
    dom.window.document.hasFocus = () => focused;
    ctx.setupTurnAlerts();

    t.mock.timers.tick(300000);
    assert.equal(refreshes.length, 0, "no background refresh while you are looking at the tab");

    focused = false;
    t.mock.timers.tick(300000);
    assert.equal(refreshes.length, 1);
    t.mock.timers.tick(300000);
    assert.equal(refreshes.length, 2);
});

test("other tables refreshing does not affect turn alerts", () => {
    const { ctx, $, dom, notifications } = setup([]);
    ctx.setupTurnAlerts();
    $("#MyGamesTable tbody").html(gameRow("5", "Game", yourTurn(0)));
    $(dom.window.document).trigger("tuyd:gamesRefreshed", ["#OpenGamesTable"]);
    assert.equal(notifications.length, 0);
    assert.equal(dom.window.document.title, "Multi-Player Dashboard - War.app");
});

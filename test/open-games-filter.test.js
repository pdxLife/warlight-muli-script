const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors an Open Games row on war.app's dashboard (names and ids are invented).
function openGameRow(id, name, { boot = "3 days", auto = false, coins = false } = {}) {
    const href = auto ? `/MultiPlayer?AutoGameID=wlnet_${id}&amp;From=MPDashboard` : `/MultiPlayer?GameID=${id}&amp;From=MPDashboard`;
    return `<tr class="GameRow" gameid="${id}"><td style="width:142px"><span style="position: relative"><a href="${href}"><img class="MyGamesGameThumbnail" src="x.jpg"></a><span class="BootTimeLabel" style="color: #00DD00">${boot}</span></span></td>`
        + `<td><a style="font-size: 17px; color: white" href="${href}">${name}</a><br>`
        + (coins ? `<font color="gold">Entry fee: 5 coins. Prize: 9 coins</font><br>` : "")
        + `<div class="MyGamesGameBoxesRow"><span class="MyGamesGameBox" title="Open Seat"><span class="MyGamesGameBoxOpenSeat">O</span></span></div><div></div></td></tr>`;
}

function openGames(rows) {
    return `<table id="OpenGamesTable" class="dataTable"><thead><tr><td colspan="2"><div style="float:left"><h2>Open Games&nbsp;</h2><a href="/MultiPlayer/OpenGames" id="ViewAllOpenGamesLink">View All</a> | <a href="/MultiPlayer?GameInviteCode=1">Have a code?</a></div></td></tr></thead>`
        + `<tbody>${rows.join("")}<tr><td colspan="2"><a href="#" id="ShowMoreOpenGamesLink">+ Show 35 more open games</a></td></tr></tbody></table>`;
}

const FUNCTIONS = ["parseBootTime", "parseFilterKeywords", "normalizeOpenGamesFilter", "openGameIsFiltered", "applyOpenGamesFilter", "readOpenGamesFilterForm", "setupOpenGamesFilter"];

function setup(rows, saved) {
    const { dom, $ } = createDom(openGames(rows));
    const writes = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        addCSS: () => { },
        Database: {
            Table: { Settings: "Settings" },
            Row: { Settings: { Name: "name" } },
            readIndex: (table, row, value, callback) => callback(saved === undefined ? undefined : { name: value, value: saved }),
            update: (table, row) => writes.push(JSON.parse(JSON.stringify(row)))
        }
    });
    ctx.setupOpenGamesFilter();
    const visibleIds = () => $("#OpenGamesTable tr.GameRow").filter(function () {
        return !$(this).hasClass("tuyd-filtered");
    }).map(function () {
        return $(this).attr("gameid");
    }).get();
    return { ctx, dom, $, writes, visibleIds };
}

const filter = (overrides) => ({ hideAutoGames: false, hideCoinGames: false, minBootHours: 0, keywords: [], ...overrides });

test("reads boot time labels in minutes", () => {
    const { ctx } = setup([]);
    assert.equal(ctx.parseBootTime("5 minutes"), 5);
    assert.equal(ctx.parseBootTime("1 day"), 1440);
    assert.equal(ctx.parseBootTime("3 days 15 hours"), 3 * 1440 + 15 * 60);
    assert.equal(ctx.parseBootTime("2 weeks"), 2 * 10080);
    assert.equal(ctx.parseBootTime(""), null);
});

test("stored filters are normalized, so bad imports fall back to defaults", () => {
    const { ctx } = setup([]);
    const normalize = (value) => JSON.parse(JSON.stringify(ctx.normalizeOpenGamesFilter(value)));
    assert.deepEqual(normalize(undefined), filter());
    assert.deepEqual(normalize({ hideAutoGames: "yes", minBootHours: -4, keywords: "rp" }), filter());
    assert.deepEqual(normalize({ hideCoinGames: true, minBootHours: "12", keywords: [" RP ", "", "Diplo"] }), filter({ hideCoinGames: true, minBootHours: 12, keywords: ["rp", "diplo"] }));
});

test("each filter hides only the games it targets", () => {
    const rows = [
        openGameRow("1", "Plain game"),
        openGameRow("2", "1 v 1 multi-day (Auto Game)", { auto: true }),
        openGameRow("3", "Coin game", { coins: true }),
        openGameRow("4", "Quick game", { boot: "5 minutes" }),
        openGameRow("5", "Hunger games RP/FFA")
    ];
    const { ctx, $, visibleIds } = setup(rows);
    const hiddenBy = (overrides) => {
        ctx.applyOpenGamesFilter(filter(overrides));
        return ["1", "2", "3", "4", "5"].filter((id) => visibleIds().indexOf(id) === -1);
    };
    assert.deepEqual(hiddenBy({}), []);
    assert.deepEqual(hiddenBy({ hideAutoGames: true }), ["2"]);
    assert.deepEqual(hiddenBy({ hideCoinGames: true }), ["3"]);
    assert.deepEqual(hiddenBy({ minBootHours: 24 }), ["4"]);
    assert.deepEqual(hiddenBy({ keywords: ["rp"] }), ["5"]);
    assert.equal($("#ShowMoreOpenGamesLink").closest("tr").hasClass("tuyd-filtered"), false);
});

test("keywords match whole words only", () => {
    const { ctx, visibleIds } = setup([openGameRow("1", "Sharp shooters"), openGameRow("2", "Hunger games RP/FFA"), openGameRow("3", "Star Wars: Clone War")]);
    ctx.applyOpenGamesFilter(filter({ keywords: ["rp", "star wars"] }));
    assert.deepEqual(Array.from(visibleIds()), ["1"]);
});

test("adds a Filter link and panel that start from the saved filter", () => {
    const { $, visibleIds } = setup([openGameRow("1", "Plain game"), openGameRow("2", "Auto", { auto: true })], { hideAutoGames: true, minBootHours: 6, keywords: ["rp", "diplo"] });
    assert.equal($("#OpenGamesFilterLink").length, 1);
    assert.equal($("#OpenGamesFilterCount").text(), "1 hidden");
    assert.deepEqual(Array.from(visibleIds()), ["1"]);
    const panel = $("#OpenGamesFilterPanel");
    assert.equal(panel.is(":visible"), false);
    $("#OpenGamesFilterLink").trigger("click");
    assert.equal(panel.is(":visible"), true);
    assert.equal(panel.find("[name=hideAutoGames]").prop("checked"), true);
    assert.equal(panel.find("[name=minBootHours]").val(), "6");
    assert.equal(panel.find("[name=keywords]").val(), "rp, diplo");
});

test("changing the panel saves the filter and applies it at once", () => {
    const { $, writes, visibleIds } = setup([openGameRow("1", "Plain game"), openGameRow("2", "Coin game", { coins: true })]);
    assert.equal($("#OpenGamesFilterCount").text(), "");
    $("#OpenGamesFilterPanel [name=hideCoinGames]").prop("checked", true).trigger("change");
    assert.deepEqual(Array.from(visibleIds()), ["1"]);
    assert.equal($("#OpenGamesFilterCount").text(), "1 hidden");
    $("#OpenGamesFilterPanel [name=keywords]").val(" Plain , ").trigger("change");
    assert.deepEqual(Array.from(visibleIds()), []);
    assert.deepEqual(writes.at(-1), { name: "openGamesFilter", value: filter({ hideCoinGames: true, keywords: ["plain"] }) });
});

test("rows the site renders later are filtered too", async () => {
    const { $, visibleIds } = setup([openGameRow("1", "Plain game")], { hideAutoGames: true });
    $("#OpenGamesTable tbody").append(openGameRow("2", "Auto", { auto: true }) + openGameRow("3", "Another plain game"));
    await flush();
    assert.deepEqual(Array.from(visibleIds()), ["1", "3"]);
    assert.equal($("#OpenGamesFilterCount").text(), "1 hidden");
});

test("does nothing on pages without the Open Games table", () => {
    const { dom, $ } = createDom("<div></div>");
    const ctx = load(FUNCTIONS, { ...domGlobals(dom, $), addCSS: () => assert.fail("should not run"), Database: { readIndex: () => assert.fail("should not run") } });
    ctx.setupOpenGamesFilter();
});

test("recognizes the View All open games page", () => {
    const at = (url) => load(["pageIsOpenGamesPage"], { location: { href: url } });
    assert.ok(at("https://war.app/MultiPlayer/OpenGames").pageIsOpenGamesPage());
    assert.ok(at("https://www.warzone.com/MultiPlayer/OpenGames?x=1").pageIsOpenGamesPage());
    assert.ok(!at("https://war.app/MultiPlayer/").pageIsOpenGamesPage());
    assert.ok(!at("https://war.app/MultiPlayer/OpenGamesArchive").pageIsOpenGamesPage());
});

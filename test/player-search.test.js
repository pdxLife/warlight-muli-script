const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// Mirrors a result row on war.app's /Community/PlayerSearch (recorded searching "tornado").
function resultRow(n, id, level, name, number, clanId) {
    return `<div id="ujs_empty${n ? "_" + n : ""}" style="left: 0px; bottom: ${2016 - n * 32}px;"><div id="ujs_empty${n ? "_" + n : ""}_img"></div>`
        + `<div id="ujs_Button${n ? "_" + n : ""}"><a class="btn ujsInner ujsBtnInner" href="/Profile?p=${id}&amp;u=${name}_${number}"></a></div>`
        + `<div id="ujs_Text_${n + 5}"><div id="ujs_Text_${n + 5}_tmp"><span style="max-width: 100%"><span style="color: yellow">L${level}</span> `
        + (clanId ? `<img src="https://warappcdn.com/s3/Data/Clans/${clanId}/Icon/1.png" width="21"> ` : "") + `${name} <span style="color: #444">#${number}</span></span></div></div></div>`;
}
const searchScene = (rows) => `<div id="ujs_PlayerSearchScene"><div id="ujs_Row"><textarea id="ujs_NameBox_input">tornado</textarea><a class="btn ujsInner ujsBtnInner" id="ujs_SearchBtn_btn" href="#"></a></div>`
    + `<div id="ujs_ResultsContainer"><div id="ujs_ResultsLabel" style="left: 263px; bottom: 2055px;"><div id="ujs_ResultsLabel_tmp">Returned ${rows.length} players</div></div>${rows.join("")}</div></div>`;
const tornadoes = [
    resultRow(0, "1132426003", 2, "tornado", 6), resultRow(1, "3678797622", 65, "tornado", 1, 33), resultRow(2, "1950247909", 2, "Tornado", 7),
    resultRow(3, "5", 26, "Tornado", 4), resultRow(4, "6", 17, "Tommy Tornado", 1), resultRow(5, "7", 8, "tornado king", 1, 12), resultRow(6, "8", 1, "Tornadodex", 1)
];
const FUNCTIONS = ["playerSearchRows", "playerSearchMatch", "sortPlayerSearchRows", "playerSearchFilter", "readPlayerSearchPrefs", "savePlayerSearchPrefs", "layoutPlayerSearch",
    "playerSearchToolbarHtml", "setupPlayerSearchSort", "playerSearchTagsHtml", "parseBlockList", "playerSearchProfileId", "rememberPlayerSearch", "setupPlayerSearchShortcuts", "htmlEscape", "pageIsPlayerSearch"];

function searchPage(rows = tornadoes, globals = {}) {
    const { dom, $ } = createDom(searchScene(rows), "https://war.app/Community/PlayerSearch");
    const timers = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $), location: dom.window.location, addCSS: () => {}, localStorage: dom.window.localStorage, DOMParser: dom.window.DOMParser,
        PLAYER_SEARCH_KEY: "tidyUpYourDashboard.playerSearch", AWP_SITE: "https://awp.wl-stats.com", setTimeout: (fn) => timers.push(fn), ...globals
    });
    const order = () => ctx.playerSearchRows().filter((row) => row.element.style.display !== "none")
        .sort((a, b) => parseInt(b.element.style.bottom, 10) - parseInt(a.element.style.bottom, 10)).map((row) => `L${row.level} ${row.name}`);
    const settle = async () => {
        await new Promise((resolve) => setImmediate(resolve));
        timers.splice(0).forEach((fn) => fn());
    };
    return { ctx, dom, $, order, settle };
}

test("reads each result's id, level, name and clan", () => {
    const { ctx } = searchPage();
    const rows = ctx.playerSearchRows();
    assert.equal(rows.length, 7);
    assert.deepEqual(JSON.parse(JSON.stringify(rows[1], ["id", "level", "name", "clanId"])), { id: "3678797622", level: 65, name: "tornado", clanId: "33" });
    assert.equal(rows[0].clanId, null);
    assert.ok(ctx.pageIsPlayerSearch());
});

test("best match puts exact names first, then names starting with the search, each by level", async () => {
    const { ctx, $, order, settle } = searchPage();
    ctx.setupPlayerSearchSort();
    await settle();
    assert.deepEqual(order(), ["L65 tornado", "L26 Tornado", "L2 tornado", "L2 Tornado", "L8 tornado king", "L1 Tornadodex", "L17 Tommy Tornado"]);
    assert.ok($("#ujs_ResultsContainer > #playerSearchTools").length, "the controls sit on war.app's results line");
    $("#playerSearchTools [name=sortBy]").val("level").trigger("change");
    assert.deepEqual(order(), ["L65 tornado", "L26 Tornado", "L17 Tommy Tornado", "L8 tornado king", "L2 tornado", "L2 Tornado", "L1 Tornadodex"]);
    $("#playerSearchTools [name=sortBy]").val("warapp").trigger("change");
    assert.deepEqual(order(), ["L2 tornado", "L65 tornado", "L2 Tornado", "L26 Tornado", "L17 Tommy Tornado", "L8 tornado king", "L1 Tornadodex"], "war.app's own order is kept as a choice");
});

test("filters hide low levels, players without a clan, or below a minimum level, and the count says so", async () => {
    const { ctx, $, dom, order, settle } = searchPage();
    ctx.setupPlayerSearchSort();
    await settle();
    $("#playerSearchTools [name=hideLow]").prop("checked", true).trigger("change");
    assert.deepEqual(order(), ["L65 tornado", "L26 Tornado", "L8 tornado king", "L17 Tommy Tornado"]);
    assert.equal($("#playerSearchTools .playerSearchCount").text(), "4 of 7 shown");
    $("#playerSearchTools [name=clanOnly]").prop("checked", true).trigger("change");
    assert.deepEqual(order(), ["L65 tornado", "L8 tornado king"]);
    $("#playerSearchTools [name=clanOnly]").prop("checked", false).trigger("change");
    $("#playerSearchTools [name=minLevel]").val("20").trigger("input");
    assert.deepEqual(order(), ["L65 tornado", "L26 Tornado"]);
    const stored = JSON.parse(dom.window.localStorage.getItem("tidyUpYourDashboard.playerSearch"));
    assert.deepEqual(stored, { sortBy: "match", hideLow: true, clanOnly: false, minLevel: 20 }, "remembered for the next search");
});

test("a new search's rows are sorted the same way", async () => {
    const { ctx, $, order, settle } = searchPage();
    ctx.setupPlayerSearchSort();
    await settle();
    $("#playerSearchTools [name=sortBy]").val("level").trigger("change");
    $("#ujs_ResultsContainer").children("[id^=ujs_empty]").remove();
    $("#ujs_ResultsContainer").append(resultRow(0, "11", 3, "kknd", 2) + resultRow(1, "2921525624", 61, "KKND", 1));
    await settle();
    assert.deepEqual(order(), ["L61 KKND", "L3 kknd"]);
});

test("tags show you, AWP World Tour ranks and blocked players", () => {
    const { ctx } = searchPage();
    const rows = ctx.playerSearchRows();
    const known = { me: "8", year: 2026, awp: { "3678797622": { rank: 1, points: 5765 } }, blocked: { "1950247909": true } };
    const text = (row) => { const div = createDom(ctx.playerSearchTagsHtml(row, known)).dom.window.document.body; return div.textContent; };
    assert.equal(text(rows[1]), "AWP #1");
    assert.match(ctx.playerSearchTagsHtml(rows[1], known), /href="https:\/\/awp\.wl-stats\.com\/players\/3678797622"/);
    assert.equal(text(rows[2]), "Blocked");
    assert.equal(text(rows[6]), "You");
    assert.equal(ctx.playerSearchTagsHtml(rows[0], known), "");
    const blocked = ctx.parseBlockList(`<ul><li id="ListItem_1"><a href="Profile?p=2916622252&u=x_1">x</a></li><li id="ListItem_2"><a href="/Profile?p=7329853444">y</a></li></ul><a href="/Profile?p=999">me</a>`);
    assert.deepEqual(Object.keys(blocked).sort(), ["2916622252", "7329853444"]);
});

test("a pasted profile link or player id opens the profile, and searches are remembered", () => {
    const { ctx, $, dom } = searchPage();
    assert.equal(ctx.playerSearchProfileId("https://war.app/Profile?p=3678797622&u=tornado_1"), "3678797622");
    assert.equal(ctx.playerSearchProfileId("3678797622"), "3678797622");
    assert.equal(ctx.playerSearchProfileId("tornado"), null);
    assert.equal(ctx.playerSearchProfileId("123"), null, "a short number is a name");
    ctx.setupPlayerSearchShortcuts();
    const pressed = [];
    $("#ujs_SearchBtn_btn").on("click", () => {
        pressed.push($("#ujs_NameBox_input").val());
        return false;
    });
    const click = () => dom.window.document.getElementById("ujs_SearchBtn_btn").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    click();
    $("#ujs_NameBox_input").val("KKND");
    click();
    $("#ujs_NameBox_input").val("Tornado");
    click();
    assert.deepEqual(pressed, ["tornado", "KKND", "Tornado"], "names search as before");
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem("tidyUpYourDashboard.playerSearch")).recent, ["Tornado", "KKND"], "newest first, one entry per name");
    $("#ujs_NameBox_input").val("").trigger("focus");
    assert.deepEqual($("#playerSearchRecent a").map((i, a) => $(a).text()).get(), ["Tornado", "KKND"]);
});

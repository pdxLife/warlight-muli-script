const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

test("total points add this level's progress from the Points page to the level's base", () => {
    const { dom, $ } = createDom(`<div class="container px-4"><h1>Current Status</h1>You are level 55 and are 94.47% of the way to level 56 (452,539 / 479,000)<br>In the last 30 days, you've earned 0 points.</div>`, "https://war.app/Points");
    const ctx = load(["displayTotalPointsEarned"], { ...domGlobals(dom, $), totalPointsPerLevel: { 55: 2092800, 56: 2571800 } });
    ctx.displayTotalPointsEarned();
    assert.match($(".container").text(), /In total, you've earned 2,545,339 points\./);
});

test("total points stay hidden when the Points page reads differently", () => {
    const { dom, $ } = createDom(`<div class="container px-4">Something else entirely</div>`, "https://war.app/Points");
    const ctx = load(["displayTotalPointsEarned"], { ...domGlobals(dom, $), totalPointsPerLevel: { 55: 2092800 } });
    ctx.displayTotalPointsEarned();
    assert.doesNotMatch($(".container").text(), /In total/);
});

test("tournament name comes from the page title, whatever the site calls itself", () => {
    const names = ["tournamentNameFromTitle", "stripSiteSuffix", "siteName"];
    const withSiteName = (meta) => {
        const { dom, $ } = createDom(meta);
        return load(names, domGlobals(dom, $));
    };
    const current = withSiteName(`<meta property="og:site_name" content="War.app">`);
    assert.equal(current.tournamentNameFromTitle("Tournament: phobia - 1v1 LD - War.app"), "phobia - 1v1 LD");
    assert.equal(current.tournamentNameFromTitle("Tournament: Cup - War.app - Better than Hasbro's RISK® game - Play Online Free"), "Cup");
    const renamed = withSiteName(`<meta property="og:site_name" content="War.Game">`);
    assert.equal(renamed.tournamentNameFromTitle("Tournament: Cup - War - Peace - War.Game"), "Cup - War - Peace");
    const noMeta = withSiteName("");
    assert.equal(noMeta.tournamentNameFromTitle("Tournament: Cup - War.app"), "Cup");
});

test("bookmarks saved on any of war.app's domains open on the current one", () => {
    const { siteRelativeUrl } = load(["siteRelativeUrl"], { SITE_HOSTS: ["war.app", "warzone.com", "warlight.net"] });
    assert.equal(siteRelativeUrl("https://www.warzone.com/Forum/106092?Offset=20#post"), "/Forum/106092?Offset=20#post");
    assert.equal(siteRelativeUrl("https://war.app/MultiPlayer/Tournament?ID=7"), "/MultiPlayer/Tournament?ID=7");
    assert.equal(siteRelativeUrl("http://warlight.net"), "/");
    assert.equal(siteRelativeUrl("https://www.war.app:443/Clans/List"), "/Clans/List");
    assert.equal(siteRelativeUrl("https://notwar.app/x"), "https://notwar.app/x");
    assert.equal(siteRelativeUrl("https://example.com/war.app"), "https://example.com/war.app");
    assert.equal(siteRelativeUrl("/Forum/1"), "/Forum/1");
    assert.equal(siteRelativeUrl("javascript:alert(1)"), "javascript:alert(1)", "left for safeUrl to reject");
});

// war.app swaps views in place: the URL changes and the scene is redrawn without a page load.
function tournamentApp(url) {
    const { dom, $ } = createDom(`<div id="ujs_Scene"></div>`, url);
    const controls = [];
    const ctx = load(["setupTournamentPage", "whileOnTournament", "tournamentInfoSlot", "currentTournamentId", "addTournamentPlayerControls", "ujsElement"], {
        ...domGlobals(dom, $),
        location: dom.window.location,
        setupUjsPlayerControls: () => {
            controls.push(true);
            $("[id^=ujs_PlayersTabContents][id$=_img]").last().append(`<div id="ujsPlayerToolbar"></div>`);
        }
    });
    const show = (path, html) => {
        dom.window.history.pushState({}, "", path);
        $("#ujs_Scene").html(html);
    };
    const tournament = (creator) => `<div id="ujs_CreatorLabel"><div id="ujs_CreatorLabel_tmp" class="ujsTextInner">Created by ${creator}</div></div>`
        + `<div id="ujs_PlayersTabContents"><div id="ujs_PlayersTabContents_img"></div><div id="ujs_PlayersContainer"></div></div>`;
    return { ctx, dom, $, controls, show, tournament };
}

test("tournament extras appear when war.app opens a tournament in place from its list", async () => {
    const { ctx, $, controls, show, tournament } = tournamentApp("https://war.app/MultiPlayer/Tournaments/");
    ctx.setupTournamentPage();
    show("/MultiPlayer/Tournaments/", `<div id="ujs_TournamentsScene">list</div>`);
    await flush();
    assert.equal($("#tournamentInfoSlot").length, 0);

    show("/MultiPlayer/Tournament?ID=7", tournament("Host A"));
    await flush();
    assert.equal($("#ujs_CreatorLabel_tmp > #tournamentInfoSlot").text(), "| Bookmark");
    assert.equal(controls.length, 1);
    assert.equal($("#ujsPlayerToolbar").attr("data-tournament-id"), "7");

    await flush();
    assert.equal($(".tournamentBookmark").length, 1, "nothing is added twice");
    assert.equal(controls.length, 1);
});

test("moving to another tournament in place replaces the previous tournament's extras", async () => {
    const { ctx, dom, $, controls, show, tournament } = tournamentApp("https://war.app/MultiPlayer/Tournament?ID=7");
    show("/MultiPlayer/Tournament?ID=7", tournament("Host A"));
    ctx.setupTournamentPage();
    await flush();
    assert.equal($("#tournamentInfoSlot").attr("data-tournament-id"), "7");

    // war.app may keep the same label node and only change the URL; the extras must still switch.
    dom.window.history.pushState({}, "", "/MultiPlayer/Tournament?ID=8");
    $("#ujs_Scene").append("<div>redraw</div>");
    await flush();
    assert.equal($("#tournamentInfoSlot").attr("data-tournament-id"), "8");
    assert.equal($("#tournamentInfoSlot").text(), "| Bookmark");
    assert.equal($(".tournamentBookmark").length, 1);
    assert.equal($("#ujsPlayerToolbar").attr("data-tournament-id"), "8");
    assert.equal(controls.length, 2);
});

test("finds war.app's elements when it numbers their ids on a second draw", async () => {
    const { ctx, $, controls, show } = tournamentApp("https://war.app/MultiPlayer/Tournaments/");
    ctx.setupTournamentPage();
    show("/MultiPlayer/Tournament?ID=8", `<div id="ujs_CreatorLabel_2"><div id="ujs_CreatorLabel_2_tmp" class="ujsTextInner">Created by B</div></div>`
        + `<div id="ujs_PlayersTabContents_2"><div id="ujs_PlayersTabContents_2_img"></div><div id="ujs_PlayersContainer_2"></div></div>`);
    await flush();
    assert.equal($("#ujs_CreatorLabel_2_tmp > #tournamentInfoSlot .tournamentBookmark").length, 1);
    assert.equal(controls.length, 1);
    assert.equal($("#ujs_PlayersTabContents_2_img > #ujsPlayerToolbar").length, 1);
});

test("tournament features do nothing on other pages", async () => {
    const { ctx, $, controls, show } = tournamentApp("https://war.app/MultiPlayer/");
    ctx.setupTournamentPage();
    show("/MultiPlayer/", `<div id="ujs_CreatorLabel"><div id="ujs_CreatorLabel_tmp">Created by X</div></div>`);
    await flush();
    assert.equal($("#tournamentInfoSlot").length, 0);
    assert.equal(controls.length, 0);
});

// Mirrors war.app's Players tab: rows absolutely positioned from the bottom, 52px apart, top row first.
function playersTab(players) {
    const rows = players.map(([name, wins, losses], i) => {
        const id = i === 0 ? "ujs_TournamentPlayersPlayer" : `ujs_TournamentPlayersPlayer_${i + 1}`;
        const bottom = 3 + (players.length - 1 - i) * 52;
        return `<div class="ujsGameObject" id="${id}" style="left: 0px; bottom: ${bottom}px;">`
            + `<div id="ujs_Text_${i}"><div class="ujsTextInner"><span><span style="color: yellow">L60</span> ${name} </span></div></div>`
            + `<div id="ujs_WinsLabel_${i}"><div class="ujsTextInner">${wins} wins</div></div>`
            + `<div id="ujs_LossesLabel_${i}"><div class="ujsTextInner">${losses} losses</div></div></div>`;
    }).join("");
    const { dom, $ } = createDom(`<div id="ujs_PlayersTabContents"><div id="ujs_PlayersTabContents_img"></div>`
        + `<div id="ujs_Viewport_3" style="overflow-y: auto"><div id="ujs_PlayersContainer">${rows}</div></div></div>`);
    const css = [];
    const ctx = load(["setupUjsPlayerControls", "layoutUjsPlayers", "getUjsPlayerRows", "getUjsPlayerName", "getUjsPlayerStat", "ujsElement"], {
        ...domGlobals(dom, $),
        addCSS: (rules) => css.push(rules),
        setTimeout: (fn) => fn(),
        clearTimeout: () => { }
    });
    const topToBottom = () => Array.from($("[id^=ujs_TournamentPlayersPlayer]").not(".ujs-player-hidden").toArray()
        .sort((a, b) => parseInt(b.style.bottom) - parseInt(a.style.bottom))
        .map((row) => ctx.getUjsPlayerName($(row)) + "@" + parseInt(row.style.bottom)));
    return { ctx, $, topToBottom, css };
}

test("the player toolbar sits inside the Players panel's background box and takes clicks", () => {
    const { ctx, $, css } = playersTab([["Ann", 1, 0]]);
    ctx.setupUjsPlayerControls();
    assert.equal($("#ujs_PlayersTabContents_img > #ujsPlayerToolbar").length, 1);
    // war.app gives the panel box pointer-events: none, which the toolbar would inherit.
    assert.match(css.join("\n"), /#ujsPlayerToolbar \{[^}]*pointer-events: auto/);
});

test("search moves matching players to the top of the list", () => {
    const { ctx, $, topToBottom } = playersTab([["Ann", 3, 0], ["Bob", 1, 2], ["Bobby", 2, 1], ["Cy", 0, 3]]);
    ctx.setupUjsPlayerControls();
    $("#ujsPlayerSearch").val("bob").trigger("input");
    assert.deepEqual(topToBottom(), ["Bob@159", "Bobby@107"]);
    $("#ujsPlayerSearch").val("").trigger("input");
    assert.deepEqual(topToBottom(), ["Ann@159", "Bob@107", "Bobby@55", "Cy@3"], "clearing the search restores war.app's order");
});

test("sorting reuses war.app's row spacing and combines with search", () => {
    const { ctx, $, topToBottom } = playersTab([["Ann", 3, 0], ["Bob", 1, 2], ["Bobby", 2, 1], ["Cy", 0, 3]]);
    ctx.setupUjsPlayerControls();
    $("#ujsPlayerSort").val("losses-desc").trigger("change");
    assert.deepEqual(topToBottom(), ["Cy@159", "Bob@107", "Bobby@55", "Ann@3"]);
    $("#ujsPlayerSort").val("name-desc").trigger("change");
    $("#ujsPlayerSearch").val("b").trigger("input");
    assert.deepEqual(topToBottom(), ["Bobby@159", "Bob@107"]);
});

test("tournament player names skip the level badge", () => {
    const { dom, $ } = createDom(`<div id="ujs_TournamentPlayersPlayer_2"><div id="ujs_RankLabel_2"><div class="ujsTextInner"></div></div>`
        + `<div id="ujs_Text_17"><div class="ujsTextInner" id="ujs_Text_17_tmp"><span style="max-width: 100%"><span style="color: yellow">L63</span> big poison L2 <img src="x.png"></span></div></div></div>`);
    const ctx = load(["getUjsPlayerName"], domGlobals(dom, $));
    assert.equal(ctx.getUjsPlayerName($("#ujs_TournamentPlayersPlayer_2")), "big poison L2");
});

test("typing in a text field doesn't count as the R refresh shortcut", () => {
    const { dom, $ } = createDom(`<input id="text"><textarea id="area"></textarea><select id="pick"></select><div id="plain"></div>`);
    const ctx = load(["isTypingTarget"], domGlobals(dom, $));
    const el = (id) => dom.window.document.getElementById(id);
    assert.equal(ctx.isTypingTarget(el("text")), true);
    assert.equal(ctx.isTypingTarget(el("area")), true);
    assert.equal(ctx.isTypingTarget(el("pick")), true);
    assert.equal(ctx.isTypingTarget({ isContentEditable: true, nodeType: 1 }), true);
    assert.equal(ctx.isTypingTarget(el("plain")), false);
    assert.equal(ctx.isTypingTarget(dom.window.document.body), false);
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const AWP_SITE = "https://awp.wl-stats.com";
const RANKINGS_URL = `${AWP_SITE}/api/v1/rankings`;

// Shaped like awp.wl-stats.com /api/v1/rankings, cut to five players.
const rankings = {
    year: 2026,
    rankings: [
        { rank: 1, player_id: "3678797622", player_name: "tornado", points: 5765 },
        { rank: 2, player_id: "58117225775", player_name: "Arsene Wenger", points: 3720 },
        { rank: 3, player_id: "7733320768", player_name: "CONSEQUENCER", points: 3265 },
        { rank: 4, player_id: "111", player_name: "Fourth", points: 900 },
        { rank: 144, player_id: "2921525624", player_name: "KKND", points: 55 }
    ]
};

const art = (path) => `border-image-source: url(&quot;https://warappcdn.com/ujs/${path}?v=6&quot;)`;

// Mirrors war.app's Ladders scene: the ladders dialog's background box inside a clipping viewport,
// with war.app's dialog, row and green button art.
const laddersScene = `<div id="ujs_LaddersScene"><div id="ujs_Viewport"><div id="ujs_Content"><div id="ujs_Section">`
    + `<div id="ujs_DialogBackgroundForDropShadow"><div id="ujs_DialogBackgroundForDropShadow_img" style="${art("Resources/DialogBacking.png")}"></div></div>`
    + `<div id="ujs_LadderContainer"><div id="ujs_LadderContainer_img" style="${art("Resources/DialogForeground.png")}"></div>`
    + `<div id="ujs_OneVersusOneLadder"><div id="ujs_OneVersusOneLadder_img" style="${art("WarLight/Shared/UI/Images/UIButton-198225.png")}"></div></div></div>`
    + `</div></div></div></div>`;

function laddersPage({ response = rankings, fail = false, playerId = "2921525624", url = "https://war.app/Ladders", html = laddersScene } = {}) {
    const { dom, $ } = createDom(html, url);
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        return (fail ? result.reject({ status: 0, statusText: "error" }) : result.resolve(response)).promise();
    };
    const logs = [];
    const ctx = load(["setupCommunityLadders", "renderCommunityLadders", "communityLadderRow", "renderAwpLadderRow", "laddersArt", "addCommunityLaddersStyles", "fitCommunityLadders", "signedInPlayerId", "fetchWlStats", "pageIsLadders", "ujsElement", "htmlEscape", "safeUrl"], {
        ...domGlobals(dom, $),
        location: dom.window.location,
        log: (entry) => logs.push(entry),
        addCSS: () => {},
        playerDataReady: playerId ? $.Deferred().resolve({ PlayerId: playerId }).promise() : $.Deferred().reject().promise(),
        AWP_SITE,
        WL_STATS_CACHE_MS: 60 * 60 * 1000
    });
    return { ctx, dom, $, requests, logs };
}

test("the Ladders page gets an AWP World Tour row with the race, its size and your place", async () => {
    const { ctx, $, requests } = laddersPage();
    ctx.setupCommunityLadders();
    await flush();
    assert.deepEqual(requests, [RANKINGS_URL]);
    assert.equal($("#ujs_Section > #communityLadders").length, 1, "hangs below the ladders dialog");
    const row = $("#communityLadders .communityLadder");
    assert.equal(row.length, 1);
    assert.equal(row.find(".communityLadderButton").text(), "AWP World Tour");
    assert.equal(row.find(".communityLadderButton").attr("href"), "https://awp.wl-stats.com/rankings");
    assert.match(row.text(), /2026 race · 5 players/);
    assert.equal(row.find(".communityLadderText").children().map((i, line) => $(line).text()).get().join(" | "), "2026 race · 5 players | You: #144 · 55 points");
    assert.ok(!row.text().includes("tornado"), "no top three");
});

test("a signed-in player outside the race is told so, and a signed-out visitor gets no you line", async () => {
    const outside = laddersPage({ playerId: "999" });
    outside.ctx.setupCommunityLadders();
    await flush();
    assert.match(outside.$("#communityLadders").text(), /You: not in the 2026 race yet/);

    const signedOut = laddersPage({ playerId: null });
    signedOut.ctx.setupCommunityLadders();
    await flush();
    assert.equal(signedOut.$("#communityLadders .communityLadder").length, 1);
    assert.ok(!signedOut.$("#communityLadders").text().includes("You:"));
});

test("war.app redrawing the scene brings the panel back once, without another request", async () => {
    const { ctx, $, requests } = laddersPage();
    ctx.setupCommunityLadders();
    await flush();
    $("#ujs_LaddersScene").replaceWith(laddersScene);
    await flush();
    assert.equal($("#communityLadders").length, 1);
    $("#ujs_Section").append("<div>redraw</div>");
    await flush();
    assert.equal($("#communityLadders").length, 1);
    assert.equal(requests.length, 1);
});

test("other pages get no panel and send no request", async () => {
    const { ctx, $, requests } = laddersPage({ url: "https://war.app/MultiPlayer/" });
    ctx.setupCommunityLadders();
    await flush();
    assert.equal($("#communityLadders").length, 0);
    assert.deepEqual(requests, []);
});

test("opening the Ladders page in place starts the panel then", async () => {
    const { ctx, dom, $, requests } = laddersPage({ url: "https://war.app/MultiPlayer/", html: `<div id="scene"></div>` });
    ctx.setupCommunityLadders();
    dom.window.history.pushState({}, "", "/Ladders");
    $("#scene").html(laddersScene);
    await flush();
    await flush();
    assert.deepEqual(requests, [RANKINGS_URL]);
    assert.equal($("#communityLadders").length, 1);
});

test("a failed rankings request leaves the page as it was and logs", async () => {
    const { ctx, $, logs } = laddersPage({ fail: true });
    ctx.setupCommunityLadders();
    await flush();
    assert.equal($("#communityLadders").length, 0);
    assert.ok(logs.some((entry) => entry.includes("Error loading the AWP World Tour rankings")));
});

test("the panel wears war.app's own dialog and row art, with war.app's blue button instead of the ladders' green", async () => {
    const { ctx, $ } = laddersPage();
    ctx.setupCommunityLadders();
    await flush();
    const style = $("#communityLadders")[0].style;
    assert.match(style.getPropertyValue("--tuyd-dialog"), /Resources\/DialogBacking\.png/);
    assert.match(style.getPropertyValue("--tuyd-row"), /Resources\/DialogForeground\.png/);
    assert.match(style.getPropertyValue("--tuyd-button"), /UIButton-242D9A\.png\?v=6/);
});

test("without war.app's art on the page the panel still shows, on its plain fallback look", async () => {
    const bare = `<div id="ujs_LaddersScene"><div id="ujs_Section"><div id="ujs_DialogBackgroundForDropShadow"><div id="ujs_DialogBackgroundForDropShadow_img"></div></div></div></div>`;
    const { ctx, $ } = laddersPage({ html: bare });
    ctx.setupCommunityLadders();
    await flush();
    assert.equal($("#communityLadders .communityLadder").length, 1);
    assert.equal($("#communityLadders")[0].style.getPropertyValue("--tuyd-button"), "");
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const CUSTOM_SITE = "https://custom.wl-stats.com";
const LADDER_URL = `${CUSTOM_SITE}/api/v1/ladders/seasonal`;
const PLAYER_URL = `${LADDER_URL}/players/3068919293`;
const seasonUrl = (warappId) => `${LADDER_URL}?warapp_id=${warappId}`;
const FUNCTIONS = ["setupSeasonalLadderCustom", "seasonalLadderView", "warappSeasonId", "fetchSeasonalLadder", "seasonalLadderUrl", "seasonalPlayerBoxHtml", "seasonalCareer",
    "addSeasonalLadderStyles", "addSeasonalLadderLink", "addSeasonalPlayerBox", "addTournamentButtonStyles", "warappArt", "pageIsLadderPlayer", "pageIsLadderSeason",
    "pageIsLadderSeasons", "ujsElement", "shownUjsElement", "settleRequest", "fetchWlStats", "htmlEscape", "safeUrl", "getRankText", "formatCount"];

const entry = (number, name, status, rank, wins, losses, champion = false) => ({
    season: { number, name, status, url: `${CUSTOM_SITE}/series/seasonal-ladder/seasons/${number}`, warapp_url: `https://war.app/LadderSeason?ID=${4031 + number}` },
    rank, rating: 3290, games: wins + losses, wins, losses, champion
});
// Shaped like custom.wl-stats.com /api/v1/ladders/seasonal and /api/v1/ladders/seasonal/players/3068919293.
const ladder = {
    name: "Seasonal Ladder", url: `${CUSTOM_SITE}/series/seasonal-ladder`,
    season: { number: 72, name: "Season LXXII", status: "running", url: `${CUSTOM_SITE}/series/seasonal-ladder/seasons/72`, warapp_url: "https://war.app/LadderSeason?ID=4205" }
};
const season39 = {
    ...ladder,
    season: { number: 39, name: "Season XXXIX", status: "finished", url: `${CUSTOM_SITE}/series/seasonal-ladder/seasons/39`, warapp_url: "https://war.app/LadderSeason?ID=4070" }
};
const player = {
    player_id: "3068919293", name: "RynoFury", url: `${CUSTOM_SITE}/series/seasonal-ladder/players/3068919293`,
    seasons: [entry(40, "Season XL", "finished", 12, 12, 8), entry(39, "Season XXXIX", "finished", 7, 14, 6), entry(38, "Season XXXVIII", "finished", 20, 10, 10)]
};

// The scenes as war.app draws them, recorded from /LadderPlayer, /LadderSeason and /LadderSeasons.
const scene = (name, title, body = "") => `<div id="ujs_${name}"><div id="ujs_TopBar"><div id="ujs_TopBar_img"></div><div id="ujs_HeaderLabel"><div id="ujs_HeaderLabel_tmp" class="ujsTextInner">${title}</div></div>`
    + `</div>${body}</div>`;
const nameRow = `<div id="ujs_NameRow"><div id="ujs_Button"><a id="ujs_Button_exLink" href="/Profile?p=3068919293&amp;u=RynoFury_1"></a></div></div>`;
const playerSection = (row) => `<div id="ujs_DialogBackgroundForDropShadow"><div id="ujs_DialogBackgroundForDropShadow_img"></div></div><div id="ujs_Content_2"><div id="ujs_Content_2_img"></div>${row}</div>`;
const playerScene = (title = "Season XXXIX Player", row = nameRow) => scene("LadderPlayerScene", title, playerSection(row));

function app(url, html, answers) {
    const { dom, $ } = createDom(html, url);
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        return (options.url in answers ? result.resolve(answers[options.url]) : result.reject({ status: 404, statusText: "Not Found" })).promise();
    };
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $), location: dom.window.location, sessionStorage: dom.window.sessionStorage, MutationObserver: dom.window.MutationObserver,
        log: () => { }, addCSS: () => { }, CUSTOM_SITE, WL_STATS_CACHE_MS: 3600000, SERIES_CACHE_MS: 600000
    });
    return { ctx, $, dom, requests };
}

const lines = ($) => $(".tuydSeasonalBox > div").map((i, div) => $(div).text()).get();

test("a past season's player view links the player on custom.wl-stats.com and adds their record", async () => {
    const { ctx, $, requests } = app("https://war.app/LadderPlayer?SeasonID=4070&PlayerID=689192", playerScene(), { [seasonUrl(4070)]: season39, [PLAYER_URL]: player });
    ctx.setupSeasonalLadderCustom();
    await flush();
    assert.deepEqual(requests, [seasonUrl(4070), PLAYER_URL]);
    assert.equal($("#ujs_HeaderLabel_tmp .tuydSeasonalLinkAnchor .tuydSeasonalLink").attr("href"), player.url);
    assert.equal($(".tuydSeasonalLink").text(), "custom.wl-stats.com");
    assert.deepEqual(lines($), ["custom.wl-stats.com", "Season XXXIX: 14 W, 6 L", "All 3 seasons: 36 W, 24 L", "Best: 7th (Season XXXIX)"]);
    assert.deepEqual($(".tuydSeasonalBox a").map((i, a) => $(a).attr("href")).get(), [player.seasons[1].season.url, player.url]);
    assert.ok($("#ujs_Content_2_img .tuydSeasonalBox").length, "above the panel's background, not under it");
    assert.ok(!/3,?290/.test($(".tuydSeasonalBox").text()), "custom's own ratings would contradict war.app's");
});

test("a player who won seasons shows how many instead of their best place", () => {
    const { seasonalPlayerBoxHtml } = load(["seasonalPlayerBoxHtml", "seasonalCareer", "warappSeasonId", "htmlEscape", "safeUrl", "getRankText", "formatCount"]);
    const html = seasonalPlayerBoxHtml({ url: "https://x", seasons: [entry(39, "Season XXXIX", "finished", 1, 19, 1, true), entry(30, "Season XXX", "finished", 1, 18, 2, true)] }, "4070");
    assert.match(html, /Seasons won: 2/);
    assert.doesNotMatch(html, /Best:/);
});

test("a player's only, running season has no best place yet", () => {
    const { seasonalPlayerBoxHtml } = load(["seasonalPlayerBoxHtml", "seasonalCareer", "warappSeasonId", "htmlEscape", "safeUrl", "getRankText", "formatCount"]);
    const html = seasonalPlayerBoxHtml({ url: "https://x", seasons: [entry(72, "Season LXXII", "running", null, 3, 0)] }, "4103");
    assert.match(html, /Season LXXII<\/a>: 3 W, 0 L/);
    assert.match(html, /1 season<\/a>: 3 W, 0 L/);
    assert.doesNotMatch(html, /Best:/);
});

test("the Profile button drawn after the scene still gets the view its link and record", async () => {
    const { ctx, $, requests } = app("https://war.app/LadderPlayer?SeasonID=4070&PlayerID=689192", playerScene(undefined, ""), { [seasonUrl(4070)]: season39, [PLAYER_URL]: player });
    ctx.setupSeasonalLadderCustom();
    await flush();
    assert.deepEqual(requests, []);
    $("#ujs_Content_2").append(nameRow);
    await flush();
    await flush();
    assert.equal($(".tuydSeasonalLink").length, 1);
    assert.equal($(".tuydSeasonalBox").length, 1);

    $("#ujs_LadderPlayerScene").append("<div>redraw</div>");
    await flush();
    assert.equal(requests.length, 2, "one load per view");
    assert.equal($(".tuydSeasonalLink").length, 1, "nothing is added twice");
});

test("war.app rewriting the title on a re-layout doesn't lose the button", async () => {
    const { ctx, $, requests } = app("https://war.app/LadderSeason?ID=4070", scene("LadderScene", "Seasonal Ladder"), { [seasonUrl(4070)]: season39 });
    ctx.setupSeasonalLadderCustom();
    await flush();
    $("#ujs_HeaderLabel_tmp").text("Seasonal Ladder");
    await flush();
    assert.equal($("#ujs_HeaderLabel_tmp .tuydSeasonalLink").attr("href"), season39.season.url);
    assert.equal($(".tuydSeasonalLink").length, 1);
    assert.deepEqual(requests, [seasonUrl(4070)], "no new load");
});

test("a player custom.wl-stats.com doesn't know gets the season's link and no box", async () => {
    const { ctx, $ } = app("https://war.app/LadderPlayer?SeasonID=4070&PlayerID=689192", playerScene(), { [seasonUrl(4070)]: season39 });
    ctx.setupSeasonalLadderCustom();
    await flush();
    assert.equal($(".tuydSeasonalLink").attr("href"), season39.season.url);
    assert.equal($(".tuydSeasonalBox").length, 0);
});

test("a season's view links that season, by its war.app ID, and the Seasons list the ladder", async () => {
    const cases = [
        ["https://war.app/LadderSeason?ID=4205", scene("LadderScene", "Seasonal Ladder"), { [seasonUrl(4205)]: ladder }, ladder.season.url, [seasonUrl(4205)]],
        ["https://war.app/LadderSeason?ID=4070", scene("LadderScene", "Seasonal Ladder"), { [seasonUrl(4070)]: season39 }, season39.season.url, [seasonUrl(4070)]],
        ["https://war.app/LadderSeasons", scene("LadderSeasonsScene", "Seasons"), { [LADDER_URL]: ladder }, ladder.url, [LADDER_URL]]
    ];
    for (const [url, html, answers, expected, asked] of cases) {
        const { ctx, $, requests } = app(url, html, answers);
        ctx.setupSeasonalLadderCustom();
        await flush();
        assert.equal($(".tuydSeasonalLink").attr("href"), expected, url);
        assert.deepEqual(requests, asked, url);
    }
});

test("a season custom.wl-stats.com hasn't read links the ladder, not its newest season", async () => {
    const { ctx, $, requests } = app("https://war.app/LadderSeason?ID=4041", scene("LadderScene", "Seasonal Ladder"), { [LADDER_URL]: ladder });
    ctx.setupSeasonalLadderCustom();
    await flush();
    assert.deepEqual(requests, [seasonUrl(4041), LADDER_URL]);
    assert.equal($(".tuydSeasonalLink").attr("href"), ladder.url);
});

test("war.app's other ladders share the scenes but get nothing", async () => {
    const cases = [
        ["https://war.app/LadderSeason?ID=0", scene("LadderScene", "1 v 1 Ladder")],
        ["https://war.app/LadderPlayer?SeasonID=0&PlayerID=689192", playerScene("Player in 1 v 1 Ladder")]
    ];
    for (const [url, html] of cases) {
        const { ctx, $, requests } = app(url, html, {});
        ctx.setupSeasonalLadderCustom();
        await flush();
        assert.deepEqual(requests, [], url);
        assert.equal($(".tuydSeasonalLink").length, 0);
    }
});

test("opening a player from a season adds to the new view, and a hidden scene is left alone", async () => {
    const { ctx, $, dom } = app("https://war.app/LadderSeason?ID=4070", scene("LadderScene", "Seasonal Ladder"), { [seasonUrl(4070)]: season39, [PLAYER_URL]: player });
    ctx.setupSeasonalLadderCustom();
    await flush();
    dom.window.history.pushState({}, "", "/LadderPlayer?SeasonID=4070&PlayerID=689192");
    $("#ujs_LadderScene").hide();
    $("body").append(playerScene());
    await flush();
    await flush();
    assert.equal($("#ujs_LadderScene .tuydSeasonalLink").attr("href"), season39.season.url);
    assert.equal($("#ujs_LadderPlayerScene .tuydSeasonalLink").attr("href"), player.url);
});

test("nothing is added when custom.wl-stats.com is down", async () => {
    const { ctx, $, dom } = app("https://war.app/LadderSeason?ID=4205", scene("LadderScene", "Seasonal Ladder"), {});
    ctx.setupSeasonalLadderCustom();
    await flush();
    assert.equal($(".tuydSeasonalLink").length, 0);
    assert.equal(dom.window.document.querySelector(".tuydSeasonalBox"), null);
});

test("the address's season goes by either name, and a missing one is no season", () => {
    const { warappSeasonId } = load(["warappSeasonId"]);
    assert.equal(warappSeasonId("https://war.app/LadderSeason?ID=4070"), "4070");
    assert.equal(warappSeasonId("https://war.app/LadderPlayer?SeasonID=4070&PlayerID=689192"), "4070");
    assert.equal(warappSeasonId("https://war.app/LadderSeasons"), null);
    assert.equal(warappSeasonId(null), null);
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const CUSTOM_SITE = "https://custom.wl-stats.com";
const AWP_SITE = "https://awp.wl-stats.com";
const gamesUrl = (id) => `${CUSTOM_SITE}/api/v1/players/${id}/games`;
const awpGamesUrl = (id) => `${AWP_SITE}/api/v1/players/${id}/games`;
// Recorded from awp.wl-stats.com /api/v1/players/2921525624/games.
const awpGames = { games: [{ game_id: 45474791, series: "AWP World Tour", label: "Grand Slam - Timid Land · Round of 64", url: "https://awp.wl-stats.com/tournaments/521" }] };

// Mirrors a My Games row on war.app's dashboard: a thumbnail link and the name link, both to the game.
const row = (id, name) => `<tr class="GameRow" gameid="${id}"><td><a href="/MultiPlayer?GameID=${id}&amp;From=MPDashboard"><img src="x.jpg"></a></td>`
    + `<td><a style="font-size: 17px" href="/MultiPlayer?GameID=${id}&amp;From=MPDashboard">${name}</a><br><span>Your turn for 2 hours</span></td></tr>`;
const myGames = (rows) => `<table id="MyGamesTable"><tbody>${rows.join("")}</tbody></table>`;

// Shaped like custom.wl-stats.com /api/v1/players/{id}/games: a cup fixture, a league game and an event.
const games = {
    games: [
        { game_id: 45419715, series: "Nations Cup", label: "Nations Cup 2026 · Group C", url: "https://custom.wl-stats.com/series/fixtures/3122" },
        { game_id: 45000001, series: "P/R League", label: "Season 38 · Group A2", url: "https://custom.wl-stats.com/series/pr-league/seasons/38" },
        { game_id: 45000002, series: "Titled Tuesday", label: "92nd Titled Tuesday - MME", url: "https://custom.wl-stats.com/tournaments/950" }
    ]
};

function dashboard({ rows, playerId = "2921525624", responses = { [gamesUrl("2921525624")]: games, [awpGamesUrl("2921525624")]: { games: [] } } } = {}) {
    const { dom, $ } = createDom(myGames(rows), "https://war.app/MultiPlayer/");
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        const response = responses[options.url];
        return (response === undefined ? result.reject({ status: 0, statusText: "error" }) : result.resolve(response)).promise();
    };
    const logs = [];
    const ctx = load(["setupEventBadges", "markEventGames", "renderEventBadge", "settleRequest", "signedInPlayerId", "fetchWlStats", "addCommunityLaddersStyles", "htmlEscape", "safeUrl"], {
        ...domGlobals(dom, $),
        log: (entry) => logs.push(entry),
        addCSS: () => {},
        playerDataReady: playerId ? $.Deferred().resolve({ PlayerId: playerId }).promise() : $.Deferred().reject().promise(),
        CUSTOM_SITE,
        AWP_SITE,
        WL_STATS_CACHE_MS: 60 * 60 * 1000,
        GAMES_CACHE_MS: 5 * 60 * 1000
    });
    return { ctx, dom, $, requests, logs };
}

const badges = ($) => $("#MyGamesTable tr.GameRow").map((i, tr) => $(tr).find(".tuydEventBadge").text() || "-").get();

test("community games on My Games get a badge after their name, linking to the event", async () => {
    const { ctx, $, requests } = dashboard({ rows: [row(45419715, "NC Group C"), row(1, "Casual game"), row(45000001, "PR S38 A2"), row(45000002, "TT")] });
    ctx.setupEventBadges();
    await flush();
    assert.deepEqual(requests, [gamesUrl("2921525624"), awpGamesUrl("2921525624")]);
    assert.deepEqual(badges($), ["Nations Cup 2026 · Group C", "-", "P/R League · Season 38 · Group A2", "92nd Titled Tuesday - MME"],
        "the series name is added only where the label lacks it");
    const badge = $("tr[gameid='45419715'] .tuydEventBadge");
    assert.equal(badge.attr("href"), "https://custom.wl-stats.com/series/fixtures/3122");
    assert.equal($("tr[gameid='45419715'] td:first-child .tuydEventBadge").length, 0, "not on the thumbnail");
    const line = badge.parent();
    assert.ok(line.hasClass("tuydEventBadgeLine"), "on a line of its own");
    assert.equal(line.prev().prop("tagName"), "BR", "right under the game's name");
    assert.equal(line.prev().prev().text(), "NC Group C");
    assert.equal($("tr[gameid='45419715'] td:nth-of-type(2) > a.tuydEventBadge").length, 0,
        "not a direct link of the cell, which the dashboard's clickable rows stretch over the whole cell");
});

test("badges come back when war.app or a refresh redraws My Games, once each", async () => {
    const { ctx, $ } = dashboard({ rows: [row(45419715, "NC Group C")] });
    ctx.setupEventBadges();
    await flush();
    $("#MyGamesTable tbody").html(row(45419715, "NC Group C") + row(45000001, "PR S38 A2"));
    await flush();
    assert.deepEqual(badges($), ["Nations Cup 2026 · Group C", "P/R League · Season 38 · Group A2"]);
    $("#MyGamesTable tbody").append("<tr><td>footer</td></tr>");
    await flush();
    assert.equal($(".tuydEventBadge").length, 2);
    assert.equal($(".tuydEventBadgeLine").length, 2);
});

test("a refreshed game list adds new games' badges and drops finished ones", async () => {
    const { ctx, dom, $ } = dashboard({ rows: [row(45419715, "NC"), row(45000001, "PR")] });
    ctx.setupEventBadges();
    await flush();
    $.ajax = (options) => $.Deferred().resolve(options.url.startsWith(AWP_SITE) ? { games: [] } : { games: [games.games[1]] }).promise();
    dom.window.sessionStorage.clear();
    $(dom.window.document).trigger("tuyd:gamesRefreshed", ["#MyGamesTable"]);
    await flush();
    assert.deepEqual(badges($), ["-", "P/R League · Season 38 · Group A2"]);
});

test("signed out, or with the site down, My Games is left as it was", async () => {
    const signedOut = dashboard({ rows: [row(45419715, "NC")], playerId: null });
    signedOut.ctx.setupEventBadges();
    await flush();
    assert.deepEqual(signedOut.requests, []);
    assert.equal(signedOut.$(".tuydEventBadge").length, 0);

    const down = dashboard({ rows: [row(45419715, "NC")], responses: {} });
    down.ctx.setupEventBadges();
    await flush();
    assert.equal(down.$(".tuydEventBadge").length, 0);
    assert.ok(down.logs.some((entry) => entry.includes("Error loading community games")));
    assert.ok(down.logs.some((entry) => entry.includes("Error loading AWP World Tour games")));
});

test("AWP World Tour games get a gold badge, next to custom.wl-stats.com's blue ones", async () => {
    const { ctx, $ } = dashboard({
        rows: [row(45419715, "NC Group C"), row(45474791, "AWP Grand Slam")],
        responses: { [gamesUrl("2921525624")]: games, [awpGamesUrl("2921525624")]: awpGames }
    });
    ctx.setupEventBadges();
    await flush();
    assert.deepEqual(badges($), ["Nations Cup 2026 · Group C", "AWP World Tour · Grand Slam - Timid Land · Round of 64"]);
    assert.ok($("tr[gameid='45474791'] .tuydEventBadge").hasClass("tuydEventBadgeAwp"));
    assert.ok(!$("tr[gameid='45419715'] .tuydEventBadge").hasClass("tuydEventBadgeAwp"));
    assert.equal($("tr[gameid='45474791'] .tuydEventBadge").attr("href"), "https://awp.wl-stats.com/tournaments/521");
});

test("with one site down, the other site's badges still show", async () => {
    const { ctx, $ } = dashboard({ rows: [row(45419715, "NC"), row(45474791, "AWP")], responses: { [awpGamesUrl("2921525624")]: awpGames } });
    ctx.setupEventBadges();
    await flush();
    assert.deepEqual(badges($), ["-", "AWP World Tour · Grand Slam - Timid Land · Round of 64"]);
});

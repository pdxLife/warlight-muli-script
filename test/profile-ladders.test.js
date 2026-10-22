const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const CUSTOM_SITE = "https://custom.wl-stats.com";
const FUNCTIONS = ["ladderProfileRows", "profileLaddersTable", "setupLadderProfileRows", "settleRequest", "fetchWlStats", "htmlEscape", "safeUrl", "getRankText", "formatCount"];

// war.app's Ladders table on a profile (recorded from /Profile?p=2921525624).
const warappLadders = `<h3>Ladders</h3><table cellpadding="2"><thead><tr><td>Ladder</td><td>Best Rank</td><td>Current Rank</td></tr></thead>`
    + `<tbody><tr><td><a href="/LadderPlayer?SeasonID=0&amp;PlayerID=215256">1 v 1</a></td><td>7th (2080)</td><td>Unranked (100)</td></tr></tbody></table><h3>Ranked Games</h3>`;

// Shaped like custom.wl-stats.com /api/v1/ladders/mtl/players/2921525624 and /api/v1/ladders/seasonal/players/2921525624.
const mtl = { rank: null, name: "KKND", player_id: "2921525624", rating: 1880, url: "https://custom.wl-stats.com/ladders/mtl/players/2921525624", best_rank: 6, best_rating: 1963 };
const season = (number, status, rank, rating, champion = false) => ({ season: { number, name: "Season " + number, status }, rank, rating, wins: 9, losses: 6, champion });
const seasonal = {
    player_id: "2921525624", name: "KKND", url: "https://custom.wl-stats.com/series/seasonal-ladder/players/2921525624",
    seasons: [season(71, "running", 146, 2634), season(40, "finished", 56, 3047), season(39, "finished", null, 1400), season(24, "finished", 47, 2900)]
};

function profile(html, answers) {
    const { dom, $ } = createDom(html, "https://war.app/Profile?p=2921525624");
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        return (options.url in answers ? result.resolve(answers[options.url]) : result.reject({ status: 404, statusText: "Not Found" })).promise();
    };
    const ctx = load(FUNCTIONS, { ...domGlobals(dom, $), location: dom.window.location, log: () => { }, CUSTOM_SITE, WL_STATS_CACHE_MS: 3600000, SERIES_CACHE_MS: 600000 });
    return { ctx, $, requests };
}
const MTL_URL = `${CUSTOM_SITE}/api/v1/ladders/mtl/players/2921525624`;
const SEASONAL_URL = `${CUSTOM_SITE}/api/v1/ladders/seasonal/players/2921525624`;
const cells = ($, row) => $(row).children("td").map((i, td) => $(td).text()).get().join(" | ");

test("a profile's Ladders table gets MTL and Seasonal Ladder rows after war.app's own", async () => {
    const { ctx, $, requests } = profile(warappLadders, { [MTL_URL]: mtl, [SEASONAL_URL]: seasonal });
    ctx.setupLadderProfileRows();
    await flush();
    assert.deepEqual(requests, [MTL_URL, SEASONAL_URL]);
    const rows = $("table tbody tr");
    assert.equal(rows.length, 3);
    assert.equal(cells($, rows[0]), "1 v 1 | 7th (2080) | Unranked (100)", "war.app's row stays first");
    assert.equal(cells($, rows[1]), "MTL | 6th (1963) | Unranked (1880)", "ratings written as war.app writes them");
    assert.equal(cells($, rows[2]), "Seasonal Ladder | 47th (2900) | 146th (2634)", "the best of all seasons, and this season's place");
    assert.equal($(rows[1]).find("a").attr("href"), "https://custom.wl-stats.com/ladders/mtl/players/2921525624");
    ctx.setupLadderProfileRows();
    await flush();
    assert.equal($("table tbody tr").length, 3, "not added twice");
});

test("champions are marked, and a player outside this season is told so", () => {
    const { ctx } = profile("", {});
    const rows = ctx.ladderProfileRows(null, { url: "https://x", seasons: [season(30, "finished", 1, 3700, true), season(31, "finished", 1, 3650, true), season(32, "finished", 4, 3400)] });
    assert.equal(rows.length, 1, "no MTL row without MTL figures");
    assert.equal(rows[0][1], "1st (3700) · champion ×2");
    assert.equal(rows[0][2], "Not in this season");
    assert.equal(ctx.ladderProfileRows({ rank: 12, rating: 1950, best_rank: 3, best_rating: 2001, url: "https://x" }, null)[0][2], "12th (1950)");
    assert.equal(ctx.ladderProfileRows(null, { seasons: [] }).length, 0);
});

test("without war.app ladders the player still gets a Ladders table, before Ranked Games", async () => {
    const { ctx, $ } = profile("<h3>Coin Leaderboard</h3><h3>Ranked Games</h3>", { [MTL_URL]: mtl });
    ctx.setupLadderProfileRows();
    await flush();
    assert.equal($("h3").map((i, h) => $(h).text()).get().join(" / "), "Coin Leaderboard / Ladders / Ranked Games");
    assert.equal(cells($, $("table tbody tr")[0]), "MTL | 6th (1963) | Unranked (1880)");
});

test("a player on neither ladder gets nothing", async () => {
    const { ctx, $ } = profile(warappLadders, {});
    ctx.setupLadderProfileRows();
    await flush();
    assert.equal($("table tbody tr").length, 1);
});

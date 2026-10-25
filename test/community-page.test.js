const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const AWP_SITE = "https://awp.wl-stats.com";
const CUSTOM_SITE = "https://custom.wl-stats.com";
const MTL_URL = `${CUSTOM_SITE}/api/v1/ladders/mtl`;

const FUNCTIONS = ["setupCommunityPageSummary", "communityPageEventsHtml", "communityPageEventHtml", "trimBlogPosts", "mtlTopHtml", "mtlYouHtml", "addMtlTopStyles",
    "setupMtlForumTop", "isMtlThreadTitle", "pageIsCommunityHome",
    "loadCommunityData", "settleRequest", "fetchWlStats", "signedInPlayerId", "withSeasonalLadder", "seasonalLadderSeries",
    "siteLink", "seriesLink", "seriesDetailHtml", "standingsHtml", "weeklyEventStatusHtml", "signupsHtml",
    "formatCount", "parseUtcTime", "formatEventTime", "timeUntil", "getRankText", "htmlEscape", "safeUrl"];

// Shaped like custom.wl-stats.com /api/v1/series, cut to the fields the script reads.
const titledTuesday = (current) => ({ slug: "titled-tuesday", name: "Titled Tuesday", kind: "events", url: "https://custom.wl-stats.com/series/titled-tuesday", current });
const series = {
    series: [
        { slug: "clan-cup", name: "Clan Cup", kind: "clan_cup", url: "https://custom.wl-stats.com/series/clan-cup",
            current: { name: "Clan Cup II", url: "https://custom.wl-stats.com/series/cups/3", status: "running", stage: "Round 2" } },
        { slug: "nations-cup", name: "Nations Cup", kind: "nations_cup", url: "https://custom.wl-stats.com/series/nations-cup",
            current: { name: "Nations Cup 2026", url: "https://custom.wl-stats.com/series/nations-cup/seasons/2026", status: "running", stage: "Qualifiers", players: 28 } },
        { slug: "pr-league", name: "P/R League", kind: "league", url: "https://custom.wl-stats.com/series/pr-league",
            current: { name: "Season 38", url: "https://custom.wl-stats.com/series/pr-league/seasons/38", status: "running", players: 51, progress: { played: 99, total: 161 },
                leader: { name: "Stales78", url: "https://custom.wl-stats.com/series/pr-league/players/7252844100" },
                standings: { label: "Division A", entries: [{ name: "Stales78", url: "https://custom.wl-stats.com/series/pr-league/players/7252844100", place: 1, wins: 3, losses: 0 }] } } },
        { slug: "clan-league", name: "Clan League", kind: "clan_league", url: "https://custom.wl-stats.com/series/clan-league",
            current: { name: "Clan League 19", url: "https://custom.wl-stats.com/series/clan-league/seasons/19", status: "finished", players: 18, progress: { played: 495, total: 495 },
                winner: { name: "Optimum", url: "https://custom.wl-stats.com/clans/Optimum" } } },
        { slug: "seasonal-ladder", name: "Seasonal Ladder", kind: "ladder", url: "https://custom.wl-stats.com/series/seasonal-ladder",
            current: { name: "Season LXXI", url: "https://custom.wl-stats.com/series/seasonal-ladder/seasons/71", status: "running", players: 248,
                leader: { name: "Eraserhead", url: "https://custom.wl-stats.com/series/seasonal-ladder/players/2979814301" } } },
        titledTuesday({ name: "92nd Titled Tuesday - TTU", url: "https://custom.wl-stats.com/tournaments/942", status: "finished", players: 21,
            next_event_at: "2026-10-27T19:00:18Z", winner: { name: "Pablo Platcasso", url: "https://custom.wl-stats.com/series/titled-tuesday/players/33146680727" } })
    ]
};

// Shaped like custom.wl-stats.com /api/v1/ladders/mtl, with twelve players.
const mtlPlayers = Array.from({ length: 12 }, (_, i) => ({
    rank: i + 1, name: i === 0 ? "Eraserhead" : `Player ${i + 1}`, player_id: String(100 + i), rating: 2313 - i * 50, win_pct: 79.0 - i,
    url: `https://custom.wl-stats.com/ladders/mtl/players/${100 + i}`
}));
const mtl = { name: "Multi Template Ladder", url: "https://custom.wl-stats.com/ladders/mtl", copied_at: "2026-10-25T01:42:34Z", site_up: true, players: mtlPlayers };
const mine = (rank) => ({ rank, rating: 1612, best_rank: 9, url: "https://custom.wl-stats.com/ladders/mtl/players/2921525624" });

// war.app's Community page, as served: blog posts with the (empty) Community Events box under them,
// forum posts beside them, then New Maps.
const communityPage = `<section class="container"><h1>Community</h1><div class="row">`
    + `<div class="col-sm-12 col-md-6 mb-2"><div class="bg-gray p-3 fill"><h2 class="text-medium">Recent Blog Posts</h2><table class="ml-3" id="blog"><tbody>`
    + Array.from({ length: 10 }, (_, i) => `<tr><td><span class="text-muted">●&nbsp;2026-10-0${i}:</span></td><td><a href="/blog/${i}">Post ${i}</a></td></tr>`).join("")
    + `<tr><td colspan="2"><a href="/blog">●&nbsp;Show All</a></td></tr></tbody></table>`
    + `<h2 class="text-medium pt-3">Community Events</h2><table class="ml-3" id="kenny"><tbody><tr><td colspan="2">List of community events is maintained by <a href="/Profile?p=635295275">Kenny</a></td></tr></tbody></table></div></div>`
    + `<div class="col-sm-12 col-md-6 mb-2"><div class="bg-gray p-3 fill"><h3 class="text-medium">Notable Forum Posts</h3></div></div>`
    + `</div></section><section id="maps" class="container">New Maps</section><section id="CommunityLevels" class="container"></section>`;

const thread = (title) => `<html><head><title>${title}</title></head><body><div id="PostsDiv"></div><div id="ReplyDiv"></div></body></html>`;

function page({ url = "https://war.app/Community", html = communityPage, playerId = "2921525624", seriesResponse = series, mtlResponse = mtl, myMtl = null, down = false } = {}) {
    const { dom, $ } = createDom(html, url);
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        if (down) {
            return result.reject({ status: 0, statusText: "error" }).promise();
        }
        const answers = { [MTL_URL]: mtlResponse, [`${MTL_URL}/players/${playerId}`]: myMtl };
        if (options.url.startsWith(`${CUSTOM_SITE}/api/v1/series`)) {
            return result.resolve(seriesResponse).promise();
        }
        if (options.url.startsWith(AWP_SITE)) {
            return result.resolve({ year: 2026, rankings: [] }).promise();
        }
        return (answers[options.url] ? result.resolve(answers[options.url]) : result.reject({ status: 404, statusText: "Not Found" })).promise();
    };
    const logs = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        location: dom.window.location,
        log: (entry) => logs.push(entry),
        addCSS: () => {},
        playerDataReady: playerId ? $.Deferred().resolve({ PlayerId: playerId }).promise() : $.Deferred().reject().promise(),
        AWP_SITE,
        CUSTOM_SITE,
        WL_STATS_CACHE_MS: 60 * 60 * 1000,
        SERIES_CACHE_MS: 10 * 60 * 1000,
        STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"],
        COMMUNITY_PAGE_SERIES: ["titled-tuesday", "pr-league", "seasonal-ladder", "clan-league", "nations-cup"],
        COMMUNITY_PAGE_BLOG_POSTS: 5,
        MTL_TOP_COUNT: 10
    });
    return { ctx, dom, $, requests, logs };
}

const lines = ($) => $("#tuydCommunityPageEvents tr").map((i, row) => $(row).text().replace(/\s+/g, " ").trim()).get();

test("the Community Events box lists Titled Tuesday, P/R League, the Seasonal Ladder, Clan League and Nations Cup, above war.app's line", async () => {
    const { ctx, $ } = page();
    ctx.setupCommunityPageSummary();
    await flush();
    const found = lines($);
    assert.equal(found.length, 5, "Clan Cup isn't listed");
    assert.match(found[0], /^● Titled Tuesday · Last winner: Pablo Platcasso \(92nd Titled Tuesday - TTU\)Next: .+ \(in \d+ days?\)$/);
    assert.equal(found[1], "● P/R League · Season 38 · 99/161 games · Leader: Stales78", "a leader, not the division's standings");
    assert.equal(found[2], "● Seasonal Ladder · Season LXXI · Leader: Eraserhead");
    assert.equal(found[3], "● Clan League 19 · finished · Winner: Optimum");
    assert.equal(found[4], "● Nations Cup 2026 · Qualifiers ›");
    assert.equal($("h2:contains('Community Events')").next().attr("id"), "tuydCommunityPageEvents");
    assert.equal($("#tuydCommunityPageEvents").next().attr("id"), "kenny", "war.app's own line stays, below");
    const links = $("#tuydCommunityPageEvents a").map((i, a) => `${$(a).text()} ${a.getAttribute("href")}`).get();
    assert.ok(links.includes("Pablo Platcasso https://custom.wl-stats.com/series/titled-tuesday/players/33146680727"));
    assert.ok(links.includes("92nd Titled Tuesday - TTU https://custom.wl-stats.com/tournaments/942"));
    assert.ok(links.includes("Season 38 https://custom.wl-stats.com/series/pr-league/seasons/38"));
    assert.ok(links.includes("Optimum https://custom.wl-stats.com/clans/Optimum"));
    assert.ok(links.includes("Qualifiers › https://custom.wl-stats.com/series/nations-cup/seasons/2026"));
});

test("a running Clan League shows its progress and leader, a series taking signups says so", () => {
    const { ctx, $ } = page();
    const html = ctx.communityPageEventsHtml([
        { slug: "clan-league", name: "Clan League", kind: "clan_league", url: "/cl", current: { name: "Clan League 20", url: "/cl/20", status: "running", progress: { played: 120, total: 495 }, leader: { name: "Optimum", url: "/o" } } },
        { slug: "pr-league", name: "P/R League", kind: "league", url: "/pr", current: { name: "Season 39", url: "/pr/39", status: "signups", signups_close_at: null } }
    ], 0);
    assert.deepEqual($("<div>").html(html).find("tr").map((i, row) => $(row).text().replace(/\s+/g, " ").trim()).get(),
        ["● P/R League · Season 39 · Signups open", "● Clan League 20 · 120/495 games · Leader: Optimum"]);
});

test("the blog list keeps its 5 latest posts and its Show All link once the events are in", async () => {
    const { ctx, $ } = page();
    ctx.setupCommunityPageSummary();
    await flush();
    const rows = $("#blog tr");
    assert.deepEqual(rows.filter((i, row) => row.style.display !== "none").map((i, row) => $(row).text().trim()).get(),
        ["●\u00a02026-10-00:Post 0", "●\u00a02026-10-01:Post 1", "●\u00a02026-10-02:Post 2", "●\u00a02026-10-03:Post 3", "●\u00a02026-10-04:Post 4", "●\u00a0Show All"]);

    const down = page({ down: true });
    down.ctx.setupCommunityPageSummary();
    await flush();
    assert.equal(down.$("#blog tr").filter((i, row) => row.style.display === "none").length, 0, "without the events, every post stays");
});

test("while a Titled Tuesday is being played it shows that event's progress instead of a winner", async () => {
    const running = { series: [titledTuesday({ name: "93rd Titled Tuesday", url: "https://custom.wl-stats.com/tournaments/943", status: "running", players: 20, progress: { played: 12, total: 19 }, winner: null })] };
    const { ctx, $ } = page({ seriesResponse: running });
    ctx.setupCommunityPageSummary();
    await flush();
    assert.deepEqual(lines($), ["● Titled Tuesday · Now: 93rd Titled Tuesday · 20 players · 12/19 games"]);
});

test("the MTL's top 10 goes above New Maps in two columns of five, with links to the full ladder and warlight-mtl.com", async () => {
    const { ctx, $ } = page();
    ctx.setupCommunityPageSummary();
    await flush();
    const box = $("#tuydMtlTop");
    assert.equal(box.next().attr("id"), "maps");
    assert.match(box.find(".text-muted").first().text(), /^Top 10 of 12 ranked$/);
    const columns = box.find(".tuydMtlTopTable");
    assert.equal(columns.length, 2);
    assert.deepEqual(columns.map((i, table) => $(table).find("tbody tr").length).get(), [5, 5]);
    assert.equal(columns.first().find("tbody tr").first().text(), "1Eraserhead2,31379%");
    assert.equal(columns.last().find("tbody tr").last().find("td").eq(1).text(), "Player 10");
    assert.equal(box.find("a:contains('Full ladder')").attr("href"), "https://custom.wl-stats.com/ladders/mtl");
    assert.equal(box.find("a:contains('warlight-mtl.com')").attr("href"), "https://www.warlight-mtl.com/");
});

test("a player ranked below the top 10 gets their line under it, and one in it has their row in bold", async () => {
    const below = page({ myMtl: mine(23) });
    below.ctx.setupCommunityPageSummary();
    await flush();
    assert.match(below.$("#tuydMtlTop").text(), /You: 23rd of 12 · rating 1,612 · best 9th/);

    const inside = page({ playerId: "103", myMtl: { ...mine(4), url: mtlPlayers[3].url } });
    inside.ctx.setupCommunityPageSummary();
    await flush();
    assert.equal(inside.$(".tuydMtlYou").text(), "4Player 42,16376%");
    assert.doesNotMatch(inside.$("#tuydMtlTop").text(), /You:/);
});

test("signed out, or not on the MTL, there's no you line", async () => {
    for (const options of [{ playerId: null }, { myMtl: null }]) {
        const { ctx, $ } = page(options);
        ctx.setupCommunityPageSummary();
        await flush();
        assert.equal($("#tuydMtlTop .tuydMtlTopTable").length, 2);
        assert.doesNotMatch($("#tuydMtlTop").text(), /You/);
    }
});

test("when warlight-mtl.com is down, the box says how old the figures are", async () => {
    const { ctx, $ } = page({ mtlResponse: { ...mtl, site_up: false } });
    ctx.setupCommunityPageSummary();
    await flush();
    assert.match($("#tuydMtlTop").text(), /Top 10 of 12 ranked · warlight-mtl.com is down; as of /);
});

test("with custom.wl-stats.com down the page stays as it was, and the failures are logged", async () => {
    const { ctx, $, dom, logs } = page({ down: true });
    const before = dom.window.document.body.innerHTML;
    ctx.setupCommunityPageSummary();
    await flush();
    assert.equal(dom.window.document.body.innerHTML, before);
    assert.ok(logs.some((entry) => /the MTL rankings/.test(entry)));
    assert.equal($("#tuydMtlTop").length, 0);
});

test("only the Community page itself matches, not the pages under it", () => {
    for (const [url, expected] of [["https://war.app/Community", true], ["https://war.app/Community/", true], ["https://war.app/community?x=1", true],
        ["https://war.app/Community/PlayerSearch", false], ["https://war.app/SinglePlayer/CommunityLevels", false], ["https://war.app/MultiPlayer?CommunityEvents=1", false]]) {
        const { ctx } = page({ url });
        assert.equal(Boolean(ctx.pageIsCommunityHome()), expected, url);
    }
});

test("MTL threads are told apart by the ladder's name, not by letters inside other words", () => {
    const { ctx } = page();
    for (const title of ["MTL season update - War.app", "[MDL] new templates", "Multi-Template Ladder discussion", "Multiday ladder ideas"]) {
        assert.ok(ctx.isMtlThreadTitle(title), title);
    }
    for (const title of ["Team TL vs Clan", "Multi-day games etiquette", "Seasonal Ladder LXXI", "html tips"]) {
        assert.ok(!ctx.isMtlThreadTitle(title), title);
    }
});

test("an MTL thread gets the top 10 below the reply box; other threads send no request", async () => {
    const mtlThread = page({ url: "https://war.app/Forum/1-mtl", html: thread("MTL season talk - War.app"), myMtl: mine(23) });
    mtlThread.ctx.setupMtlForumTop();
    await flush();
    assert.equal(mtlThread.$("#ReplyDiv").next().attr("id"), "tuydMtlTop");
    assert.equal(mtlThread.$("#tuydMtlTop .tuydMtlTopTable tbody tr").length, 10);
    assert.match(mtlThread.$("#tuydMtlTop").text(), /You: 23rd of 12/);
    assert.deepEqual(mtlThread.requests, [MTL_URL, `${MTL_URL}/players/2921525624`]);

    const other = page({ url: "https://war.app/Forum/2-other", html: thread("Free cache thread! - War.app") });
    other.ctx.setupMtlForumTop();
    await flush();
    assert.equal(other.$("#tuydMtlTop").length, 0);
    assert.deepEqual(other.requests, []);
});

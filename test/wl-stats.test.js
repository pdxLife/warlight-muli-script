const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const AWP_SITE = "https://awp.wl-stats.com";
const CUSTOM_SITE = "https://custom.wl-stats.com";
const WL_STATS_CACHE_MS = 60 * 60 * 1000;

// Recorded from awp.wl-stats.com /api/v1/players/2921525624/stats, with the per-template lists trimmed.
const awpPlayer = {
    player_id: "2921525624", player_name: "KKND", profile_url: "https://war.app/Profile?p=2921525624", is_member: true,
    level: 61, clan: "Icelandic Turtles", page_url: "https://awp.wl-stats.com/players/2921525624",
    rank: 144, rank_year: 2026, rank_12_months: 163,
    stats: { games: 123, wins: 64, losses: 59, win_pct: 52, tournaments: 58, titles: 1, finals: 1, world_titles: 0, best_placement: 1, points_by_year: { 2020: 430 }, by_template: [], by_tier: [] }
};

// From custom.wl-stats.com's own test of /api/v1/warapp-tournaments/{id}.
const customTournament = {
    warapp_tournament_id: 66354, id: 812, name: "1st Titled Tuesday - MME", url: "https://custom.wl-stats.com/tournaments/812",
    status: "finished", imported: true, series: { name: "Titled Tuesday", url: "https://custom.wl-stats.com/series/titled-tuesday" }
};

function fakeAjax($, responses, requests) {
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        const response = responses[options.url];
        if (response && response.httpError !== undefined) {
            result.reject({ status: response.httpError, statusText: "error" });
        } else if (response) {
            result.resolve(response);
        } else {
            result.reject({ status: 404, statusText: "Not Found" });
        }
        return result.promise();
    };
}

const profile = `<div class="container"><span id="FeedbackMsg"></span><h3>Ladders</h3></div>`;
const statsUrl = (id) => `${AWP_SITE}/api/v1/players/${id}/stats`;

function profilePage(responses, { html = profile, url = "https://war.app/Profile?p=2921525624" } = {}) {
    const { dom, $ } = createDom(html, url);
    const requests = [];
    const logs = [];
    fakeAjax($, responses, requests);
    const ctx = load(["setupAwpProfileStats", "renderAwpStats", "fetchWlStats", "htmlEscape", "safeUrl", "getRankText"], {
        ...domGlobals(dom, $), location: dom.window.location, log: (entry) => logs.push(entry), AWP_SITE, WL_STATS_CACHE_MS
    });
    return { ctx, dom, $, requests, logs };
}

test("a profile shows the player's AWP World Tour ranks and record after the feedback area", async () => {
    const { ctx, $, requests } = profilePage({ [statsUrl("2921525624")]: awpPlayer });
    ctx.setupAwpProfileStats();
    await flush();
    assert.deepEqual(requests, [statsUrl("2921525624")]);
    assert.equal($("#FeedbackMsg").next().attr("id"), "awpStats");
    const rows = $("#awpStats tr").map((i, row) => $(row).children().map((j, cell) => $(cell).text()).get().join(": ")).get();
    assert.deepEqual(rows, [
        "2026 race: #144",
        "Last 12 months: #163",
        "Games: 123 (64 W, 59 L, 52%)",
        "Tournaments: 58",
        "Titles: 1 (1 final)",
        "Best placement: 1st"
    ]);
    assert.equal($("#awpStats a").attr("href"), "https://awp.wl-stats.com/players/2921525624");
});

test("an unranked player with no games yet reads as such", async () => {
    const newcomer = { ...awpPlayer, rank: null, rank_12_months: null, stats: { games: 0, wins: 0, losses: 0, win_pct: 0, tournaments: 0, titles: 0, finals: 0, world_titles: 2, best_placement: null } };
    const { ctx, $ } = profilePage({ [statsUrl("2921525624")]: newcomer });
    ctx.setupAwpProfileStats();
    await flush();
    const text = $("#awpStats tr").map((i, row) => $(row).text()).get();
    assert.deepEqual(text, ["2026 raceUnranked", "Last 12 monthsUnranked", "GamesNone yet", "Tournaments0", "Titles0", "World titles2"]);
});

test("the box goes below the private notes when they're already shown", async () => {
    const { ctx, $ } = profilePage({ [statsUrl("2921525624")]: awpPlayer },
        { html: `<span id="FeedbackMsg"></span><div class="profileBox" id="privateNotes"></div>` });
    ctx.setupAwpProfileStats();
    await flush();
    assert.equal($("#privateNotes").next().attr("id"), "awpStats");
});

test("a player AWP doesn't know leaves the profile unchanged, without logging an error", async () => {
    const { ctx, $, logs } = profilePage({}, { url: "https://war.app/Profile?p=5" });
    ctx.setupAwpProfileStats();
    await flush();
    assert.equal($("#awpStats").length, 0);
    assert.deepEqual(logs, []);
});

test("a server that's down leaves the profile unchanged and logs", async () => {
    const { ctx, $, logs } = profilePage({ [statsUrl("2921525624")]: { httpError: 0 } });
    ctx.setupAwpProfileStats();
    await flush();
    assert.equal($("#awpStats").length, 0);
    assert.ok(logs.some((entry) => entry.includes("Error loading AWP World Tour stats")));
});

test("stats and unknown players are kept for an hour, failures are not", async () => {
    const { ctx, dom, requests } = profilePage({ [statsUrl("1")]: awpPlayer, [statsUrl("3")]: { httpError: 500 } });
    const fetchTwice = async (id) => {
        ctx.fetchWlStats(statsUrl(id));
        await flush();
        ctx.fetchWlStats(statsUrl(id));
        await flush();
    };
    await fetchTwice("1");
    await fetchTwice("2");
    await fetchTwice("3");
    assert.deepEqual(requests, [statsUrl("1"), statsUrl("2"), statsUrl("3"), statsUrl("3")]);

    let cached;
    ctx.fetchWlStats(statsUrl("2")).done((data) => { cached = data; });
    assert.equal(cached, null, "an unknown player resolves with null");

    const key = `tidyUpYourDashboard.wlStats:${statsUrl("1")}`;
    const entry = JSON.parse(dom.window.sessionStorage.getItem(key));
    dom.window.sessionStorage.setItem(key, JSON.stringify({ ...entry, at: Date.now() - WL_STATS_CACHE_MS - 1 }));
    ctx.fetchWlStats(statsUrl("1"));
    assert.equal(requests.at(-1), statsUrl("1"), "an hour-old answer is fetched again");
});

function tournamentApp(url, responses) {
    const { dom, $ } = createDom(`<div id="ujs_Scene"></div>`, url);
    const requests = [];
    const logs = [];
    fakeAjax($, responses, requests);
    const ctx = load(["setupCustomTournamentLink", "renderCustomTournamentLink", "fetchWlStats", "whileOnTournament", "tournamentInfoSlot", "currentTournamentId", "ujsElement", "htmlEscape", "safeUrl"], {
        ...domGlobals(dom, $), location: dom.window.location, log: (entry) => logs.push(entry), CUSTOM_SITE, WL_STATS_CACHE_MS
    });
    const show = (path, creator = "Host") => {
        dom.window.history.pushState({}, "", path);
        $("#ujs_Scene").html(`<div id="ujs_CreatorLabel"><div id="ujs_CreatorLabel_tmp" class="ujsTextInner">Created by ${creator}</div></div>`);
    };
    return { ctx, $, requests, logs, show };
}

const lookupUrl = (id) => `${CUSTOM_SITE}/api/v1/warapp-tournaments/${id}`;

test("a tournament read by custom.wl-stats.com links its page there and its series", async () => {
    const { ctx, $, requests, show } = tournamentApp("https://war.app/MultiPlayer/Tournaments/", { [lookupUrl(66354)]: customTournament });
    ctx.setupCustomTournamentLink();
    show("/MultiPlayer/Tournament?ID=66354");
    await flush();
    await flush();
    assert.deepEqual(requests, [lookupUrl(66354)]);
    assert.equal($("#tournamentInfoSlot").text(), " | custom.wl-stats.com (Titled Tuesday)");
    assert.deepEqual($("#tournamentInfoSlot a").map((i, a) => $(a).attr("href")).get(),
        ["https://custom.wl-stats.com/tournaments/812", "https://custom.wl-stats.com/series/titled-tuesday"]);

    $("#ujs_Scene").append("<div>redraw</div>");
    await flush();
    assert.equal($(".customTournamentLink").length, 1, "nothing is added twice");
    assert.equal(requests.length, 1, "one request per tournament");
});

test("a tournament without a series links only its page", () => {
    const { renderCustomTournamentLink } = load(["renderCustomTournamentLink", "htmlEscape", "safeUrl"]);
    const html = renderCustomTournamentLink({ ...customTournament, series: null });
    assert.equal((html.match(/<a /g) || []).length, 1);
});

test("other tournaments and other pages get no link and no error", async () => {
    const { ctx, $, requests, logs, show } = tournamentApp("https://war.app/MultiPlayer/", {});
    ctx.setupCustomTournamentLink();
    show("/MultiPlayer/");
    await flush();
    assert.deepEqual(requests, []);
    show("/MultiPlayer/Tournament?ID=5");
    await flush();
    await flush();
    assert.deepEqual(requests, [lookupUrl(5)]);
    assert.equal($(".customTournamentLink").length, 0);
    assert.deepEqual(logs, []);
});

test("an answer that arrives after you've moved to another tournament isn't shown there", async () => {
    const { ctx, $, show } = tournamentApp("https://war.app/MultiPlayer/Tournament?ID=66354", {});
    const answers = {};
    $.ajax = (options) => {
        answers[options.url] = $.Deferred();
        return answers[options.url].promise();
    };
    show("/MultiPlayer/Tournament?ID=66354");
    ctx.setupCustomTournamentLink();
    show("/MultiPlayer/Tournament?ID=9");
    await flush();
    answers[lookupUrl(66354)].resolve(customTournament);
    await flush();
    assert.equal($(".customTournamentLink").length, 0);
});

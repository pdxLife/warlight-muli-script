const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const CUSTOM_SITE = "https://custom.wl-stats.com";
const plain = (value) => JSON.parse(JSON.stringify(value));

// Recorded from custom.wl-stats.com /api/v1/clan-wars/clans/33, trimmed.
const CLAN = {
    clan: { id: 33, name: "Icelandic Turtles", url: "https://custom.wl-stats.com/ladders/clan-wars/clans/33" },
    updated: "2026-11-05T08:00:00Z",
    summary: { seasons_played: 37, seasons_won: 0, best_place: 11, best_place_season: 63, wins: 1802, played: 2705, free_wins: 130 },
    seasons: [
        { season: 88, in_play: true, place: 16, clans: 68, points: 27.34, wins: 35, played: 61, players: 11, lost_to_cap: null, lost_to_size: 7.7 },
        { season: 87, in_play: false, place: 15, clans: 74, points: 35.94, wins: 46, played: 61, players: 9, lost_to_cap: null, lost_to_size: 10.1 }
    ],
    players: [{ id: 787976, name: "tornado", wins: 531, played: 645, free_wins: 34, seasons: 35 }],
    opponents: [{ id: 662, name: "Myth Busters", games: 809, won: 395 }, { id: 345, name: null, games: 169, won: 129 }],
    templates: [{ id: 1399928, name: "Guiroma", games: 399, won: 282 }, { id: 1399927, name: "French Brawl", games: 330, won: 220 }]
};

// Recorded from custom.wl-stats.com /api/v1/clan-wars/players/3678797622, trimmed.
const PLAYER = {
    player: { id: 787976, name: "tornado", url: "https://custom.wl-stats.com/ladders/clan-wars/players/787976" },
    updated: "2026-11-05T08:00:00Z",
    summary: { wins: 963, played: 1233, free_wins: 37, seasons: 87, days: 1270, first_day: "2021-03-18", last_day: "2026-11-04", rating: 2063, rating_deviation: 78, score: 1907, rank: 1, ranked: 1020 },
    clans: [
        { id: 33, name: "Icelandic Turtles", first_season: 54, last_season: 88, seasons: 35, wins: 531, played: 645 },
        { id: 170, name: null, first_season: 1, last_season: 53, seasons: 52, wins: 432, played: 625 }
    ],
    templates: [
        { id: 1399927, name: "French Brawl", games: 410, won: 290, rating: 2039, rating_deviation: 80, score: 1878, rank: 1, ranked: 113 },
        { id: 1399928, name: "Guiroma", games: 351, won: 256, rating: 2004, rating_deviation: 88, score: 1828, rank: null, ranked: 154 },
        { id: 1070742, name: "Final Earth 2v2", games: 159, won: 129, rating: null, rating_deviation: null, score: null, rank: null, ranked: 119 },
        { id: 1544046, name: "Volcano Island", games: 142, won: 123, rating: 2128, rating_deviation: 92, score: 1945, rank: 1, ranked: 62 }
    ]
};

const HISTORY_FUNCTIONS = ["clanWarsWonLost", "clanWarsPercent", "findClanWarsTemplate", "clanWarsRatingText", "clanWarAllTimeNote", "clanWarsPoints",
    "renderClanWarsHistory", "renderClanWarsStats", "getRankText", "htmlEscape", "safeUrl"];

test("fetchClanWarsHistory asks custom.wl-stats.com, and gives null when custom has nothing or is down", async () => {
    const { $ } = createDom();
    const asked = [];
    let answer = $.Deferred().resolve(CLAN).promise();
    const logged = [];
    const ctx = load(["fetchClanWarsHistory"], { $, CUSTOM_SITE, log: (m) => logged.push(m), fetchWlStats: (url) => { asked.push(url); return answer; } });
    assert.equal((await ctx.fetchClanWarsHistory("clans", 33)).clan.id, 33);
    answer = $.Deferred().resolve(null).promise();
    assert.equal(await ctx.fetchClanWarsHistory("players", "3678797622"), null);
    answer = $.Deferred().reject({ statusText: "error" }).promise();
    assert.equal(await ctx.fetchClanWarsHistory("clans", 7), null);
    assert.deepEqual(asked, [CUSTOM_SITE + "/api/v1/clan-wars/clans/33", CUSTOM_SITE + "/api/v1/clan-wars/players/3678797622", CUSTOM_SITE + "/api/v1/clan-wars/clans/7"]);
    assert.equal(logged.length, 1);
});

test("a timeslot template's all-time line gives your record and rating and the clan's record, matched by id or else by name", () => {
    const ctx = load(HISTORY_FUNCTIONS);
    assert.equal(ctx.clanWarAllTimeNote(PLAYER, CLAN, 1399927, "French Brawl"), "All time: you 290–120, rating 2039 (1st); clan 220–110");
    assert.equal(ctx.clanWarAllTimeNote(PLAYER, CLAN, null, " guiroma "), "All time: you 256–95, rating 2004; clan 282–117", "no place, and no id when the clan hasn't played it this season");
    assert.equal(ctx.clanWarAllTimeNote(PLAYER, CLAN, 1070742, "Renamed"), "All time: you 129–30", "ratings are null for a while after custom restarts");
    assert.equal(ctx.clanWarAllTimeNote(null, CLAN, 1399928, "Guiroma"), "All time: clan 282–117");
    assert.equal(ctx.clanWarAllTimeNote(PLAYER, null, 5, "Unknown"), "");
    assert.equal(ctx.clanWarAllTimeNote(null, null, 5, "Unknown"), "");
});

test("a clan page's Clan Wars history gives its seasons, best finish, all-time record and latest seasons", () => {
    const ctx = load(HISTORY_FUNCTIONS);
    const { $ } = createDom();
    const box = $(ctx.renderClanWarsHistory(CLAN));
    assert.equal(box.attr("id"), "clanWarsHistory");
    assert.equal(box.find("h3").text(), "Clan Wars history");
    assert.deepEqual(box.children(".communityLaddersRows").children(".tuydCwLine").map((i, el) => $(el).text()).get(), [
        "37 seasons played. Best finish: 11th in Season 63.",
        "1802–903 all time (67%) · 130 free wins",
        "More on custom.wl-stats.com"
    ]);
    assert.deepEqual(box.find(".tuydCwRecordRow").map((i, el) => $(el).children().map((j, c) => $(c).text()).get().join(" | ")).get(), [
        "Season 88 (in play) | 16th of 68 · 27.3 points · 35–26",
        "Season 87 | 15th of 74 · 35.9 points · 46–15"
    ]);
    assert.equal(box.find("a").attr("href"), CLAN.clan.url);
    const champion = $(ctx.renderClanWarsHistory({ ...CLAN, summary: { ...CLAN.summary, seasons_played: 1, seasons_won: 1, best_place: 1, best_place_season: 88 }, seasons: [] }));
    assert.equal(champion.find(".tuydCwLine").first().text(), "1 season played, 1 won. Best finish: 1st in Season 88.");
    assert.equal(champion.find(".tuydCwRecordRow").length, 0);
});

test("the profile's Clan Wars box gives the rating and place, games without free wins, seasons, clans and top templates", () => {
    const ctx = load(HISTORY_FUNCTIONS);
    const { $ } = createDom();
    const box = $(ctx.renderClanWarsStats(PLAYER));
    assert.equal(box.attr("id"), "clanWarsStats");
    assert.deepEqual(box.find("tr").map((i, tr) => $(tr).children().map((j, td) => $(td).text()).get().join(" | ")).get(), [
        "Rating | 2063 ± 78, 1st of 1020",
        "Games | 1233 (926 W, 307 L, 75%) + 37 free wins",
        "Seasons | 87 (1270 days played)",
        "Clans | Icelandic Turtles (seasons 54–88), Clan 170 (seasons 1–53)",
        "French Brawl | 290–120 (71%), rating 2039 (1st)",
        "Guiroma | 256–95 (73%), rating 2004",
        "Final Earth 2v2 | 129–30 (81%)"
    ]);
    assert.deepEqual(box.find("td a").map((i, a) => $(a).attr("href")).get(), ["/Clans/?ID=33", "/Clans/?ID=170"]);
    assert.equal(box.children("a").attr("href"), PLAYER.player.url);
    const unrated = $(ctx.renderClanWarsStats({ ...PLAYER, summary: { ...PLAYER.summary, rating: null, rank: null }, clans: [PLAYER.clans[0]], templates: [] }));
    assert.deepEqual(unrated.find("td:first-child").map((i, td) => $(td).text()).get(), ["Games", "Seasons", "Clan"]);
    const inactive = $(ctx.renderClanWarsStats({ ...PLAYER, summary: { ...PLAYER.summary, rank: null } }));
    assert.equal(inactive.find("tr").first().text(), "Rating2063 ± 78, no place");
});

function clanWarHelpers(extra = []) {
    return load(["clanWarResult", "clanWarSide", "clanWarOpponents", "clanWarRecords", "clanWarRecordText", "renderClanWarRecords", ...HISTORY_FUNCTIONS, ...extra]);
}

const GAMES = {
    games: [
        { gameId: 1, day: 2, template: 1399927, winner: 33, clans: [{ clan: 33, players: [11] }, { clan: 662, players: [22] }] },
        { gameId: 2, day: 3, template: 1399927, winner: 662, clans: [{ clan: 33, players: [12] }, { clan: 662, players: [23] }] },
        { gameId: 3, day: 3, template: 9, winner: 33, clans: [{ clan: 33, players: [12] }, { clan: 5, players: [24] }] }
    ],
    players: { 22: { name: "Bob", clan: 662, clanName: "Myth Busters" } },
    templates: { 1399927: "French Brawl", 9: "Small Earth" }
};

test("the season records box puts each template's and opponent's all-time record beside this season's", () => {
    const ctx = clanWarHelpers();
    const { $ } = createDom();
    const records = ctx.clanWarRecords(GAMES, 33, null);
    assert.deepEqual(plain(records.templates.map((t) => t.id)), [1399927, 9]);
    assert.deepEqual(plain(records.opponents.map((o) => o.id)), [662, 5]);
    const rows = (html) => $(html).find(".tuydCwRecordRow").map((i, el) => $(el).children().map((j, c) => $(c).text()).get().join(" | ")).get();
    const box = $(ctx.renderClanWarRecords(records, 88, CLAN));
    assert.deepEqual(rows(box), [
        "French Brawl | 1–1 (50%) · 220–110 all time",
        "Small Earth | 1–0 (100%)",
        "Myth Busters | 1–1 (50%) · 395–414 all time",
        "Clan 5 | 1–0 (100%)"
    ]);
    assert.equal(box.find("a").attr("href"), CLAN.clan.url);
    const without = $(ctx.renderClanWarRecords(records, 88, null));
    assert.deepEqual(rows(without), ["French Brawl | 1–1 (50%)", "Small Earth | 1–0 (100%)", "Myth Busters | 1–1 (50%)", "Clan 5 | 1–0 (100%)"]);
    assert.equal(without.find("a").length, 0);
});

test("the clan's progress box adds its all-time best finish under this season's place", () => {
    const ctx = load(["renderClanWarProgress", "clanWarDuration", "clanWarResultText", "getRankText", "htmlEscape"]);
    const { $ } = createDom();
    const p = { season: 88, finished: null, clanName: "Turtles", place: 16, clans: 68, points: 27.3, pointsToday: 1, territories: { held: 3, byTonight: 0, nextAt: null, toGo: null } };
    const lines = (progress) => $(ctx.renderClanWarProgress(progress, 0)).find(".tuydCwLine").map((i, el) => $(el).text()).get();
    assert.deepEqual(lines({ ...p, history: CLAN.summary }).slice(0, 2), ["Turtles: 16th of 68 with 27.3 points (1.0 today)", "All time: best finish 11th (Season 63), 37 seasons played."]);
    assert.equal(lines({ ...p, history: { ...CLAN.summary, seasons_won: 2, best_place: 1 } })[1], "All time: best finish 1st (Season 63), 37 seasons played, 2 won.");
    assert.equal(lines({ ...p, history: { ...CLAN.summary, seasons_played: 1, best_place: null } })[1], "All time: 1 season played.");
    assert.equal(lines({ ...p, history: null }).length, 2);
});

function clanPage(history, withStandings) {
    const scene = `<div id="ujs_ClanScene"><div id="ujs_ClanWarsSection"><div id="ujs_DialogBackgroundForDropShadow_8"><div id="ujs_DialogBackgroundForDropShadow_8_img"></div>`
        + (withStandings ? '<div id="clanStandings" class="tuydCommunityPanel"></div>' : "") + "</div></div>"
        + `<div id="ujs_DialogBackgroundForDropShadow_9"><div id="ujs_DialogBackgroundForDropShadow_9_img"></div></div></div>`;
    const { dom, $ } = createDom(scene, "https://war.app/Clans/?ID=33");
    const rect = (x, y, w, h) => () => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h });
    dom.window.document.getElementById("ujs_DialogBackgroundForDropShadow_8_img").getBoundingClientRect = rect(200, 130, 454, 230);
    dom.window.document.getElementById("ujs_DialogBackgroundForDropShadow_9_img").getBoundingClientRect = rect(200, 370, 454, 1830);
    const asked = [];
    const ctx = load(["setupClanWarsHistory", "renderClanWarsHistory", "hangBelowColumn", "placeBelowColumn", "warappArt", "ujsElement", "pageIsClanPage", "clanWarUrlNumber",
        "clanWarsWonLost", "clanWarsPercent", "clanWarsPoints", "getRankText", "htmlEscape", "safeUrl"], {
        ...domGlobals(dom, $), location: dom.window.location,
        addClanWarStyles: () => { },
        fetchClanWarsHistory: (kind, id) => { asked.push(kind + "/" + id); return Promise.resolve(history); }
    });
    return { ctx, dom, $, asked, rect };
}

test("a clan page hangs the Clan Wars history below the column, above the community events panel, which moves down", async () => {
    const { ctx, dom, $, asked, rect } = clanPage(CLAN, true);
    const standings = dom.window.document.getElementById("clanStandings");
    ctx.setupClanWarsHistory();
    await flush();
    assert.deepEqual(asked, ["clans/33"]);
    const panels = $("#ujs_DialogBackgroundForDropShadow_8 > .tuydCommunityPanel").map((i, el) => el.id).get();
    assert.deepEqual(panels, ["clanWarsHistory", "clanStandings"]);
    assert.equal($("#clanWarsHistory").attr("data-clan"), "33");
    assert.equal($("#clanWarsHistory").css("top"), `${2200 - 360 + 10}px`);
    dom.window.document.getElementById("clanWarsHistory").getBoundingClientRect = rect(200, 2210, 454, 300);
    standings.getBoundingClientRect = rect(200, 2210, 454, 100);
    ctx.placeBelowColumn($(standings), $("#ujs_DialogBackgroundForDropShadow_8_img"), $("#ujs_ClanScene")[0]);
    assert.equal(standings.style.top, `${2510 - 360 + 10}px`, "the events panel goes below the history");
});

test("a clan with no Clan Wars history gets no panel", async () => {
    const { ctx, $, asked } = clanPage(null, false);
    ctx.setupClanWarsHistory();
    await flush();
    $("#ujs_ClanScene").append("<div></div>");
    await flush();
    assert.deepEqual(asked, ["clans/33"]);
    assert.equal($("#clanWarsHistory").length, 0);
});

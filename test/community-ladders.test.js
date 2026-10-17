const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

function render(html) {
    const { dom } = createDom();
    const container = dom.window.document.createElement("div");
    container.innerHTML = html;
    return container;
}

const AWP_SITE = "https://awp.wl-stats.com";
const CUSTOM_SITE = "https://custom.wl-stats.com";
const RANKINGS_URL = `${AWP_SITE}/api/v1/rankings`;
const seriesUrl = (playerId) => `${CUSTOM_SITE}/api/v1/series${playerId ? `?player=${playerId}` : ""}`;

const COMMUNITY_FUNCTIONS = ["setupCommunityLadders", "renderCommunityLadders", "communityLadderRow", "renderAwpLadderRow", "warappArt",
    "addCommunityLaddersStyles", "fitCommunityLadders", "signedInPlayerId", "fetchWlStats", "pageIsLadders", "pageIsCommunityEvents",
    "ujsElement", "htmlEscape", "safeUrl", "getRankText", "loadCommunityData", "formatCount", "parseUtcTime", "formatEventTime", "timeUntil",
    "seriesLink", "awpStanding", "signupsHtml", "seriesYouHtml", "standingParts", "seriesStatusHtml", "seriesDetailHtml", "renderSeriesLadderRow", "addSeasonalLadderLine", "renderSeasonalLadderLine",
    "setupCommunityEventsStanding", "communityEventLine"];

// Recorded from custom.wl-stats.com /api/v1/series?player=2921525624, trimmed to the fields the script reads.
const series = {
    series: [
        { slug: "clan-cup", name: "Clan Cup", kind: "clan_cup", url: "https://custom.wl-stats.com/series/clan-cup", warapp_event: "Clan Cup",
            current: { name: "Clan Cup II", url: "https://custom.wl-stats.com/series/cups/3", status: "running", signups_close_at: null, next_event_at: null, players: 23, progress: { played: 11, total: 15 }, leader: null, winner: null },
            you: null },
        { slug: "nations-cup", name: "Nations Cup", kind: "nations_cup", url: "https://custom.wl-stats.com/series/nations-cup", warapp_event: "Nations Cup",
            current: { name: "Nations Cup 2026", url: "https://custom.wl-stats.com/series/nations-cup/seasons/2026", status: "running", signups_close_at: null, next_event_at: null, players: 28, progress: null, leader: null, winner: null },
            you: { as: "nation", name: "Russia and Kazakhstan", division: null, group: "Group C", place: 2, of: 3, wins: 11, losses: 10, points: 11, status: "playing", url: "https://custom.wl-stats.com/series/nations-cup/players/2921525624" } },
        { slug: "pr-league", name: "P/R League", kind: "league", url: "https://custom.wl-stats.com/series/pr-league", warapp_event: null,
            current: { name: "Season 38", url: "https://custom.wl-stats.com/series/pr-league/seasons/38", status: "running", signups_close_at: null, next_event_at: null, players: 51, progress: { played: 77, total: 161 }, leader: { name: "Stales78", url: "https://custom.wl-stats.com/series/pr-league/players/7252844100" }, winner: null },
            you: null },
        { slug: "seasonal-ladder", name: "Seasonal Ladder", kind: "ladder", url: "https://custom.wl-stats.com/series/seasonal-ladder", warapp_event: null,
            current: { name: "Season LXXI", url: "https://custom.wl-stats.com/series/seasonal-ladder/seasons/71", status: "running", signups_close_at: null, next_event_at: null, players: 248, progress: null, leader: { name: "Eraserhead", url: "https://custom.wl-stats.com/series/seasonal-ladder/players/lad01" }, winner: null },
            you: null },
        { slug: "titled-tuesday", name: "Titled Tuesday", kind: "events", url: "https://custom.wl-stats.com/series/titled-tuesday", warapp_event: "Titled Tuesdays",
            current: { name: "91st Titled Tuesday - AUL", url: "https://custom.wl-stats.com/tournaments/941", status: "finished", signups_close_at: null, next_event_at: "2026-10-20T19:00:33", players: 20, progress: { played: 19, total: 19 }, leader: null, winner: { name: "CONSEQUENCER", url: "https://custom.wl-stats.com/series/titled-tuesday/players/7733320768" } },
            you: null }
    ]
};

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
    + `<div id="ujs_LadderContainer3"><div id="ujs_LadderContainer3_img"></div><div id="ujs_SeasonalLadder"><a id="ujs_SeasonalLadder_btn" href="/LadderSeasons"></a></div></div>`
    + `</div></div></div></div>`;

function laddersPage({ response = rankings, fail = false, seriesResponse = series, seriesFail = false, playerId = "2921525624", url = "https://war.app/Ladders", html = laddersScene } = {}) {
    const { dom, $ } = createDom(html, url);
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        const isSeries = options.url.startsWith(`${CUSTOM_SITE}/api/v1/series`);
        const failed = isSeries ? seriesFail : fail;
        return (failed ? result.reject({ status: 0, statusText: "error" }) : result.resolve(isSeries ? seriesResponse : response)).promise();
    };
    const logs = [];
    const ctx = load(COMMUNITY_FUNCTIONS, {
        ...domGlobals(dom, $),
        location: dom.window.location,
        log: (entry) => logs.push(entry),
        addCSS: () => {},
        playerDataReady: playerId ? $.Deferred().resolve({ PlayerId: playerId }).promise() : $.Deferred().reject().promise(),
        AWP_SITE,
        CUSTOM_SITE,
        WL_STATS_CACHE_MS: 60 * 60 * 1000,
        SERIES_CACHE_MS: 10 * 60 * 1000
    });
    return { ctx, dom, $, requests, logs };
}

test("the Ladders page gets an AWP World Tour row with the race, its size and your place", async () => {
    const { ctx, $, requests } = laddersPage();
    ctx.setupCommunityLadders();
    await flush();
    assert.deepEqual(requests, [RANKINGS_URL, seriesUrl("2921525624")]);
    assert.equal($("#ujs_Section > #communityLadders").length, 1, "hangs below the ladders dialog");
    const row = $("#communityLadders .communityLadder").first();
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
    assert.equal(signedOut.$("#communityLadders .communityLadder").first().find(".communityLadderText").text(), "2026 race · 5 players");
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
    assert.equal($(".tuydSeasonalLine").length, 1);
    assert.equal(requests.length, 2);
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
    assert.deepEqual(requests, [RANKINGS_URL, seriesUrl("2921525624")]);
    assert.equal($("#communityLadders").length, 1);
});

test("both sites down leave the page as it was and log", async () => {
    const { ctx, $, logs } = laddersPage({ fail: true, seriesFail: true });
    ctx.setupCommunityLadders();
    await flush();
    assert.equal($("#communityLadders").length, 0);
    assert.ok(logs.some((entry) => entry.includes("Error loading the AWP World Tour rankings")));
    assert.ok(logs.some((entry) => entry.includes("Error loading the custom.wl-stats.com series")));
});

test("one site down still shows the other's rows", async () => {
    const awpDown = laddersPage({ fail: true });
    awpDown.ctx.setupCommunityLadders();
    await flush();
    assert.deepEqual(awpDown.$(".communityLadder:not(.communityLadderNarrowOnly) .communityLadderButton").map((i, a) => awpDown.$(a).text()).get(), ["Clan Cup", "Nations Cup", "P/R League", "Titled Tuesday"]);

    const customDown = laddersPage({ seriesFail: true });
    customDown.ctx.setupCommunityLadders();
    await flush();
    assert.deepEqual(customDown.$(".communityLadderButton").map((i, a) => customDown.$(a).text()).get(), ["AWP World Tour"]);
    assert.equal(customDown.$(".tuydSeasonalLine").length, 0);
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
    assert.equal($("#communityLadders .communityLadder").length, 6);
    assert.equal($("#communityLadders")[0].style.getPropertyValue("--tuyd-button"), "");
});

const textOf = ($, el) => $(el).find(".communityLadderText").children().map((i, line) => $(line).text()).get();

test("each running series on custom.wl-stats.com gets a row after AWP, with its state and your line", async () => {
    const { ctx, $ } = laddersPage();
    ctx.setupCommunityLadders();
    await flush();
    const rows = $("#communityLadders .communityLadder").not(".communityLadderNarrowOnly");
    assert.deepEqual(rows.find(".communityLadderButton").map((i, a) => $(a).text()).get(), ["AWP World Tour", "Clan Cup", "Nations Cup", "P/R League", "Titled Tuesday"],
        "the Seasonal Ladder goes in war.app's own row instead");
    const narrow = $("#communityLadders .communityLadderNarrowOnly");
    assert.equal(narrow.find(".communityLadderButton").text(), "Seasonal Ladder", "a panel row stands in for it where war.app's row is too narrow");
    assert.deepEqual(textOf($, narrow), ["Season LXXI · running · 248 players", "Leader: Eraserhead"]);
    assert.deepEqual(textOf($, rows[1]), ["Clan Cup II · running · 23 clans · 11/15 matches"]);
    assert.deepEqual(textOf($, rows[2]), ["Nations Cup 2026 · running · 28 teams", "Your country Russia and Kazakhstan: Group C · 2nd of 3 · 11–10 · 11 points"]);
    assert.deepEqual(textOf($, rows[3]), ["Season 38 · running · 51 players · 77/161 games", "Leader: Stales78"]);
    assert.equal($(rows[2]).find(".communityLadderText a").attr("href"), "https://custom.wl-stats.com/series/nations-cup/players/2921525624");
    assert.equal($(rows[3]).find(".communityLadderButton").attr("href"), "https://custom.wl-stats.com/series/pr-league");
    const titled = textOf($, rows[4]);
    assert.equal(titled[0], "91st Titled Tuesday - AUL · finished · 20 players · 19/19 games");
    assert.match(titled[1], /^Winner: CONSEQUENCER · Next: .+ \((?:in \d+ (?:min|hours?|days?)|now)\)$/);
});

test("series times without a zone are UTC, and the countdown reads them that way", () => {
    const ctx = load(["parseUtcTime", "timeUntil"]);
    assert.equal(ctx.parseUtcTime("2026-10-20T19:00:33").toISOString(), "2026-10-20T19:00:33.000Z");
    assert.equal(ctx.parseUtcTime("2026-10-20T19:00:33+02:00").toISOString(), "2026-10-20T17:00:33.000Z");
    assert.equal(ctx.parseUtcTime("not a date"), null);
    const now = Date.parse("2026-10-17T19:00:33Z");
    assert.equal(ctx.timeUntil("2026-10-20T19:00:33", now), "in 3 days");
    assert.equal(ctx.timeUntil("2026-10-17T21:00:33", now), "in 2 hours");
    assert.equal(ctx.timeUntil("2026-10-17T19:20:33", now), "in 20 min");
    assert.equal(ctx.timeUntil("2026-10-17T18:00:00", now), "now");
});

test("a series taking signups says until when, and offers signing up unless you're in", () => {
    const ctx = load(COMMUNITY_FUNCTIONS.filter((name) => !/^setup/.test(name)), { CUSTOM_SITE, AWP_SITE });
    const open = { ...series.series[2], current: { ...series.series[2].current, name: "Season 39", status: "signups", signups_close_at: "2026-10-26T18:00:00", progress: null, leader: null } };
    const row = render(ctx.renderSeriesLadderRow(open, Date.parse("2026-10-17T00:00:00Z")));
    assert.match(row.querySelector(".communityLadderSignups").textContent, /^Signups open until .+/);
    assert.equal(row.querySelector(".communityLadderText > div:last-child a").textContent, "Sign up on custom.wl-stats.com");
    assert.equal(row.querySelector(".communityLadderText > div:last-child a").getAttribute("href"), "https://custom.wl-stats.com/series/pr-league/seasons/38");

    const signedUp = { ...open, you: { as: "player", name: "KKND", status: "signed_up", url: "https://custom.wl-stats.com/series/pr-league/players/1" } };
    assert.equal(render(ctx.renderSeriesLadderRow(signedUp, 0)).querySelector(".communityLadderText > div:last-child").textContent, "You: signed up");
});

test("a league player's line names division, group, place, record and a promotion", () => {
    const ctx = load(["seriesYouHtml", "standingParts", "htmlEscape", "safeUrl", "getRankText", "formatCount"]);
    const html = ctx.seriesYouHtml({ kind: "league", you: { as: "player", name: "KKND", division: "Division A", group: "A2", place: 1, of: 7, wins: 5, losses: 1, points: null, status: "promoted", url: "/x" } });
    assert.equal(render(html).textContent, "You: Division A · A2 · 1st of 7 · 5–1 · promoted");
    const ladder = ctx.seriesYouHtml({ kind: "ladder", you: { as: "player", name: "KKND", place: 12, of: 200, wins: 30, losses: 12, points: 1650, status: "playing", url: "/x" } });
    assert.equal(render(ladder).textContent, "You: 12th of 200 · 30–12 · rating 1,650");
});

test("war.app's own Seasonal Ladder row gets the current season along its bottom edge", async () => {
    const { ctx, $ } = laddersPage();
    ctx.setupCommunityLadders();
    await flush();
    const line = $("#ujs_LadderContainer3_img > .tuydSeasonalLine");
    assert.equal(line.length, 1);
    assert.equal(line.text(), "Season LXXI · 248 players · leader Eraserhead");
    assert.equal(line.find("a").first().attr("href"), "https://custom.wl-stats.com/series/seasonal-ladder/seasons/71");
});

test("with your place in the Seasonal Ladder, its line shows that instead of the player count", () => {
    const { $ } = createDom();
    const ctx = load(["renderSeasonalLadderLine", "seriesYouHtml", "standingParts", "seriesLink", "formatCount", "getRankText", "htmlEscape", "safeUrl"], { $ });
    const mine = { ...series.series[3], you: { as: "player", name: "KKND", place: 131, of: 218, wins: 9, losses: 6, points: 2637, status: "playing", url: "/x" } };
    assert.equal(render(ctx.renderSeasonalLadderLine(mine)).textContent, "Season LXXI · leader Eraserhead · You: 131st of 218 · rating 2,637",
        "the record is left out so the line fits beside war.app's button");
});

// Mirrors war.app's Community Events page: a card per event with a View button and a title.
const card = (n, title) => `<div id="ujs_EventRow${n}"><div id="ujs_EventRow${n}_img"></div><div id="ujs_Button${n}"><div class="ujsTextInner">View</div></div>`
    + `<div id="ujs_vert${n}"><div><div class="ujsTextInner">${title}</div></div><div><div class="ujsTextInner">~100 players</div></div></div></div>`;
const eventsScene = `<div id="ujs_CommunityEventsScene"><div id="ujs_Rows">${card("", "Clan League 19")}${card("_2", "Nations Cup 2026")}${card("_3", "AWP World Tour")}`
    + `${card("_4", "Multi Template Ladder (MTL)")}${card("_5", "Clan Cup")}${card("_6", "Titled Tuesdays")}</div></div>`;

test("Community Events cards get your line where you take part", async () => {
    const { ctx, $, requests } = laddersPage({ url: "https://war.app/MultiPlayer?CommunityEvents=1", html: eventsScene });
    ctx.setupCommunityEventsStanding();
    await flush();
    assert.deepEqual(requests, [RANKINGS_URL, seriesUrl("2921525624")]);
    const line = (id) => $(`#${id}_img > .tuydEventStanding`).text();
    assert.equal(line("ujs_EventRow_2"), "Your country Russia and Kazakhstan: Group C · 2nd of 3 · 11–10 · 11 points");
    assert.equal(line("ujs_EventRow_3"), "You: #144 in the 2026 race · 55 points");
    assert.equal($(".tuydEventStanding").length, 2, "no line where you don't take part");

    $("#ujs_Rows").append("<div>redraw</div>");
    await flush();
    assert.equal($(".tuydEventStanding").length, 2, "nothing is added twice");
});

test("signed out, Community Events cards only show open signups", async () => {
    const open = JSON.parse(JSON.stringify(series));
    open.series[0].current.status = "signups";
    open.series[0].current.signups_close_at = "2026-10-26T18:00:00";
    open.series.forEach((entry) => { entry.you = null; });
    const { ctx, $ } = laddersPage({ url: "https://war.app/MultiPlayer?CommunityEvents=1", html: eventsScene, playerId: null, seriesResponse: open });
    ctx.setupCommunityEventsStanding();
    await flush();
    assert.equal($(".tuydEventStanding").length, 1);
    assert.match($("#ujs_EventRow_5_img > .tuydEventStanding").text(), /^Signups open until /);
});

test("Community Events lines stay off other pages", async () => {
    const { ctx, $, requests } = laddersPage({ url: "https://war.app/MultiPlayer/", html: eventsScene });
    ctx.setupCommunityEventsStanding();
    await flush();
    assert.equal($(".tuydEventStanding").length, 0);
    assert.deepEqual(requests, []);
});

// Mirrors war.app's clan page: the clan's name label and the left column's Clan Wars dialog.
const clanScene = (name) => `<div id="ujs_ClanScene"><div id="ujs_ClanNameLabel"><div id="ujs_ClanNameLabel_tmp" class="ujsTextInner">${name}</div></div>`
    + `<div id="ujs_ClanWarsSection"><div id="ujs_DialogBackgroundForDropShadow_8"><div id="ujs_DialogBackgroundForDropShadow_8_img" style="${art("Resources/DialogBacking.png")}"></div></div></div></div>`;

// Shaped like custom.wl-stats.com /api/v1/series?clan=…: each clan series lists the clan's squads, best first.
const clanSeries = {
    series: [
        { ...series.series[0], you: { as: "clan", name: "Icelandic Turtles", place: null, of: 23, wins: 1, losses: 0, status: "playing", squad: "1celandic Turtles", url: "https://custom.wl-stats.com/clans/Icelandic%20Turtles" },
            squads: [
                { as: "clan", name: "Icelandic Turtles", place: null, of: 23, wins: 1, losses: 0, status: "playing", squad: "1celandic Turtles", url: "https://custom.wl-stats.com/clans/Icelandic%20Turtles" },
                { as: "clan", name: "Icelandic Turtles", place: null, of: 23, wins: 0, losses: 1, status: "eliminated", squad: "2celandic Turtles", url: "https://custom.wl-stats.com/clans/Icelandic%20Turtles" }
            ] },
        { ...series.series[2], you: null, squads: [] },
        { slug: "clan-league", name: "Clan League", kind: "clan_league", url: "https://custom.wl-stats.com/series/clan-league", warapp_event: "Clan League",
            current: { name: "Clan League 20", url: "https://custom.wl-stats.com/series/clan-league/seasons/20", status: "signups", signups_close_at: "2026-11-01T00:00:00", players: 14, progress: null, leader: null, winner: null },
            you: null, squads: [{ as: "clan", name: "Icelandic Turtles", division: "Division A", status: "signed_up", squad: "Icelandic Turtles", url: "/x" }] }
    ]
};
const clanUrl = (name) => `${CUSTOM_SITE}/api/v1/series?clan=${encodeURIComponent(name)}`;

function clanPage({ name = "Icelandic Turtles", response = clanSeries } = {}) {
    const { dom, $ } = createDom(`<div id="scene">${clanScene(name)}</div>`, "https://war.app/Clans/?ID=33");
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        return $.Deferred().resolve(response).promise();
    };
    const ctx = load([...COMMUNITY_FUNCTIONS, "setupClanStandings", "renderClanStandings", "renderClanSeriesRow", "placeBelowColumn", "pageIsClanPage"], {
        ...domGlobals(dom, $), location: dom.window.location, log: () => {}, addCSS: () => {},
        playerDataReady: $.Deferred().reject().promise(), AWP_SITE, CUSTOM_SITE, WL_STATS_CACHE_MS: 3600000, SERIES_CACHE_MS: 600000
    });
    return { ctx, dom, $, requests };
}

test("a clan page shows the clan's squads in each current series, below the Clan Wars dialog", async () => {
    const { ctx, $, requests } = clanPage();
    ctx.setupClanStandings();
    await flush();
    await flush();
    assert.deepEqual(requests, [clanUrl("Icelandic Turtles")]);
    assert.equal($("#ujs_DialogBackgroundForDropShadow_8 > #clanStandings").length, 1);
    assert.equal($("#clanStandings h3").text(), "Community events");
    const rows = $("#clanStandings .communityLadder");
    assert.deepEqual(rows.find(".communityLadderButton").map((i, a) => $(a).text()).get(), ["Clan Cup", "Clan League"], "series the clan isn't in are left out");
    assert.equal(textOf($, rows[0])[0], "Clan Cup II · running · 23 clans · 11/15 matches");
    const squadLines = $(rows[0]).find(".communityLadderYou").html().split("<br>").map((line) => $(`<div>${line}</div>`).text());
    assert.deepEqual(squadLines, ["1celandic Turtles: 1–0", "2celandic Turtles: 0–1 · eliminated"], "one line per squad, by squad name");
    assert.match(textOf($, rows[1])[0], /^Clan League 20 · Signups open until .+ · 14 clans$/);
    assert.equal(textOf($, rows[1])[1], "Icelandic Turtles: Division A · signed up");
    assert.match($("#clanStandings")[0].style.getPropertyValue("--tuyd-dialog"), /DialogBacking\.png/);
});

test("a clan in no current series gets no panel, and moving to another clan replaces it", async () => {
    const empty = clanPage({ response: { series: [{ ...series.series[2], you: null, squads: [] }] } });
    empty.ctx.setupClanStandings();
    await flush();
    await flush();
    assert.equal(empty.$("#clanStandings").length, 0);

    const { ctx, $, requests } = clanPage();
    ctx.setupClanStandings();
    await flush();
    await flush();
    $("#scene").html(clanScene("Optimum"));
    await flush();
    await flush();
    assert.deepEqual(requests, [clanUrl("Icelandic Turtles"), clanUrl("Optimum")]);
    assert.equal($("#clanStandings").attr("data-clan"), "Optimum");
    assert.equal($("#clanStandings").length, 1);
});

test("in war.app's one-column layout the clan box goes below Clan Members, not over it", async () => {
    const scene = `<div id="ujs_ClanScene"><div id="ujs_ClanNameLabel"><div id="ujs_ClanNameLabel_tmp">Icelandic Turtles</div></div>`
        + `<div id="ujs_ClanWarsSection"><div id="ujs_DialogBackgroundForDropShadow_8"><div id="ujs_DialogBackgroundForDropShadow_8_img"></div></div></div>`
        + `<div id="ujs_DialogBackgroundForDropShadow_9"><div id="ujs_DialogBackgroundForDropShadow_9_img"></div></div>`
        + `<div id="ujs_DialogBackgroundForDropShadow_2"><div id="ujs_DialogBackgroundForDropShadow_2_img"></div></div></div>`;
    const { dom, $ } = createDom(scene, "https://war.app/Clans/?ID=33");
    // Clan Wars at 130–360; Clan Members below it in the same column, to 2200; the Photo box above it.
    const rects = { ujs_DialogBackgroundForDropShadow_8_img: [200, 130, 454, 230], ujs_DialogBackgroundForDropShadow_9_img: [200, 370, 454, 1830], ujs_DialogBackgroundForDropShadow_2_img: [200, -400, 454, 230] };
    Object.entries(rects).forEach(([id, [x, y, w, h]]) => {
        dom.window.document.getElementById(id).getBoundingClientRect = () => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h });
    });
    $.ajax = () => $.Deferred().resolve(clanSeries).promise();
    const ctx = load([...COMMUNITY_FUNCTIONS, "setupClanStandings", "renderClanStandings", "renderClanSeriesRow", "placeBelowColumn", "pageIsClanPage"], {
        ...domGlobals(dom, $), location: dom.window.location, log: () => {}, addCSS: () => {},
        playerDataReady: $.Deferred().reject().promise(), AWP_SITE, CUSTOM_SITE, WL_STATS_CACHE_MS: 3600000, SERIES_CACHE_MS: 600000
    });
    ctx.setupClanStandings();
    await flush();
    await flush();
    assert.equal($("#clanStandings").css("top"), `${2200 - 360 + 10}px`, "10px below the lowest dialog under Clan Wars");
});

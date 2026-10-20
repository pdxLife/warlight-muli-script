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

const COMMUNITY_FUNCTIONS = ["setupCommunityLadders", "shownUjsElement", "renderCommunityLadders", "communityLadderRow", "renderAwpLadderRow", "warappArt",
    "addCommunityLaddersStyles", "fitCommunityLadders", "signedInPlayerId", "fetchWlStats", "pageIsLadders", "pageIsCommunityEvents",
    "ujsElement", "htmlEscape", "safeUrl", "getRankText", "loadCommunityData", "settleRequest", "formatCount", "parseUtcTime", "formatEventTime", "timeUntil",
    "seriesLink", "inClanSeriesOrder", "awpStanding", "signupsHtml", "seriesYouHtml", "standingParts", "seriesStatusHtml", "seriesDetailHtml", "standingsHtml", "weeklyEventStatusHtml", "renderSeriesLadderRow",
    "setupCommunityEventsStanding", "communityEventHtml", "awpEventLines", "seriesEventLines", "siteLink", "moreLinkHtml", "joinedEventLabel", "markJoinedEvent", "eventLineRoom", "fitEventLines"];

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
        SERIES_CACHE_MS: 10 * 60 * 1000,
        CLAN_SERIES_KINDS: ["clan_league", "clan_cup", "nations_cup"], STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"]
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
    assert.equal(requests.length, 2);
});

test("opening one of war.app's ladders takes the panel away, and coming back brings it back", async () => {
    const { ctx, dom, $, requests } = laddersPage();
    ctx.setupCommunityLadders();
    await flush();
    assert.equal($("#communityLadders").length, 1);
    // war.app hides the Ladders view and changes the address, without loading a page.
    dom.window.history.pushState({}, "", "/LadderSeasons");
    $("#ujs_LaddersScene").hide();
    $("body").append('<div id="ujs_LadderSeasonsScene"></div>');
    await flush();
    assert.equal($("#communityLadders").length, 0, "gone on the ladder");
    dom.window.history.pushState({}, "", "/Ladders");
    $("#ujs_LaddersScene").show();
    $("#ujs_LadderSeasonsScene").remove();
    await flush();
    assert.equal($("#communityLadders").length, 1, "back on the Ladders page");
    assert.equal(requests.length, 2, "without loading the standings again");
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
    assert.deepEqual(awpDown.$(".communityLadderButton").map((i, a) => awpDown.$(a).text()).get(), ["P/R League", "Seasonal Ladder", "Titled Tuesday", "Clan Cup", "Nations Cup"]);

    const customDown = laddersPage({ seriesFail: true });
    customDown.ctx.setupCommunityLadders();
    await flush();
    assert.deepEqual(customDown.$(".communityLadderButton").map((i, a) => customDown.$(a).text()).get(), ["AWP World Tour"]);
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
    const sections = $("#communityLadders .communityLaddersSection");
    assert.deepEqual(sections.find("h4").map((i, h) => $(h).text()).get(), ["Players", "Clans & nations"]);
    const names = (section) => $(section).find(".communityLadderButton").map((i, a) => $(a).text()).get();
    assert.deepEqual(names(sections[0]), ["AWP World Tour", "P/R League", "Seasonal Ladder", "Titled Tuesday"]);
    assert.deepEqual(names(sections[1]), ["Clan Cup", "Nations Cup"], "Nations Cup is a team event, so it goes with the clans");
    const rows = $("#communityLadders .communityLadder");
    assert.deepEqual(textOf($, rows[2]), ["Season LXXI · running · 248 players", "Leader: Eraserhead"]);
    assert.equal($(".tuydSeasonalLine").length, 0, "war.app's own Seasonal row is left alone: signed in, its Unlocked line fills it");
    assert.deepEqual(textOf($, rows[4]), ["Clan Cup II · running · 23 clans · 11/15 matches"]);
    assert.deepEqual(textOf($, rows[5]), ["Nations Cup 2026 · running · 28 teams", "Your country Russia and Kazakhstan: Group C · 2nd of 3 · 11–10 · 11 points"]);
    assert.deepEqual(textOf($, rows[1]), ["Season 38 · running · 51 players · 77/161 games", "Leader: Stales78"]);
    assert.equal($(rows[5]).find(".communityLadderText a").attr("href"), "https://custom.wl-stats.com/series/nations-cup/players/2921525624");
    assert.equal($(rows[1]).find(".communityLadderButton").attr("href"), "https://custom.wl-stats.com/series/pr-league");
    const titled = textOf($, rows[3]);
    assert.equal(titled[0], "Last: 91st Titled Tuesday - AUL · 20 players", "a weekly series names its last event, with no winner");
    assert.match(titled[1], /^Next: .+ \((?:in \d+ (?:min|hours?|days?)|now)\)$/);
    assert.equal($(rows[3]).find(".tuydMuted a").attr("href"), "https://custom.wl-stats.com/tournaments/941", "the last event links to its page");
});

test("Clan League leads the clans list, ahead of the cups the server lists first", async () => {
    const clanLeague = { slug: "clan-league", name: "Clan League", kind: "clan_league", url: "https://custom.wl-stats.com/series/clan-league", warapp_event: "Clan League",
        current: { name: "Clan League 19", url: "https://custom.wl-stats.com/series/clan-league/seasons/19", status: "finished", players: 18, progress: { played: 495, total: 495 },
            leader: null, winner: { name: "Optimum", url: "https://custom.wl-stats.com/clans/Optimum" }, next_event_at: null },
        you: { as: "clan", name: "Optimum", division: "A", group: null, place: 1, of: 6, wins: 39, losses: 16, points: 141, status: "champion", squad: "Optimum", url: "https://custom.wl-stats.com/clans/Optimum" } };
    const { ctx, $ } = laddersPage({ seriesResponse: { series: [...series.series, clanLeague] } });
    ctx.setupCommunityLadders();
    await flush();
    const clans = $("#communityLadders .communityLaddersSection").eq(1);
    assert.deepEqual(clans.find(".communityLadderButton").map((i, a) => $(a).text()).get(), ["Clan League", "Clan Cup", "Nations Cup"]);
    assert.deepEqual(textOf($, clans.find(".communityLadder")[0]), [
        "Clan League 19 · finished · 18 clans · 495/495 games",
        "Winner: Optimum",
        "Your clan Optimum: Division A · 1st of 6 · 39–16 · 141 points · champion"
    ]);
    assert.deepEqual($("#communityLadders .communityLaddersSection").eq(0).find(".communityLadderButton").map((i, a) => $(a).text()).get(),
        ["AWP World Tour", "P/R League", "Seasonal Ladder", "Titled Tuesday"], "the players list keeps its order");
});

test("a series' standings take the leader's place: a division's top three, group leaders, or the clans still in", () => {
    const { ctx, dom } = laddersPage();
    const text = (html) => { const div = dom.window.document.createElement("div"); div.innerHTML = html; return div.textContent; };
    const league = { kind: "clan_league", current: { status: "finished", winner: { name: "Optimum", url: "/o" }, next_event_at: null,
        standings: { label: "Division A", entries: [{ place: 1, name: "Optimum", url: "/o", points: 141 }, { place: 2, name: "MASTER Clan", url: "/m", points: 116 }, { place: 3, name: "Harmony", url: null, points: 116 }] } } };
    assert.equal(text(ctx.seriesDetailHtml(league, 0)), "Division A: 1. Optimum 141 · 2. MASTER Clan 116 · 3. Harmony 116", "no Winner: line next to them");
    const groups = { kind: "nations_cup", current: { status: "running", url: "https://custom.wl-stats.com/series/nations-cup/seasons/2026", leader: null, stage: "Qualifiers",
        standings: { label: "Group leaders", entries: [{ group: "A", name: "Spain", url: "/s", points: 21 }, { group: "B", name: "Poland B", url: "/p", points: 15 }] } } };
    assert.equal(text(ctx.seriesDetailHtml(groups, 0)), "Qualifiers ›", "a staged cup shows its stage, not its group leaders");
    assert.equal(text(ctx.seriesDetailHtml({ kind: "nations_cup", current: { ...groups.current, stage: null } }, 0)), "", "nothing until the server names the stage");
    const cup = { kind: "clan_cup", current: { status: "running", url: "https://custom.wl-stats.com/series/cups/3", leader: null, stage: "Quarterfinals", standings: { label: "Quarterfinals", entries: [{ name: "X", url: "/x" }] } } };
    const cupHtml = ctx.seriesDetailHtml(cup, 0);
    assert.equal(text(cupHtml), "Quarterfinals ›", "a knockout shows its round, not its squads");
    assert.match(cupHtml, /href="https:\/\/custom\.wl-stats\.com\/series\/cups\/3"/);
    const finishedCup = { kind: "clan_cup", current: { status: "finished", url: "/c", winner: { name: "Optimum", url: "/o" }, standings: { label: "Final", entries: [] } } };
    assert.equal(text(ctx.seriesDetailHtml(finishedCup, 0)), "Winner: Optimum");
    const live = { kind: "events", current: { name: "92nd Titled Tuesday - EUR", url: "/t/942", status: "running", players: 24, progress: { played: 5, total: 23 }, winner: null, leader: null, next_event_at: null } };
    assert.equal(text(ctx.seriesStatusHtml(live)), "Now: 92nd Titled Tuesday - EUR · 24 players · 5/23 games");
    const empty = { kind: "clan_league", current: { status: "running", leader: { name: "Optimum", url: "/o" }, standings: { label: "Division A", entries: [] } } };
    assert.equal(text(ctx.seriesDetailHtml(empty, 0)), "Leader: Optimum", "no entries, so the leader stays");
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
    const ctx = load(COMMUNITY_FUNCTIONS.filter((name) => !/^setup/.test(name)), { CUSTOM_SITE, AWP_SITE, STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"] });
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

// Mirrors war.app's Community Events page: a card per event with a View button and a title.
const card = (n, title) => `<div id="ujs_EventRow${n}"><div id="ujs_EventRow${n}_img"></div><div id="ujs_Button${n}"><div class="ujsTextInner">View</div></div>`
    + `<div id="ujs_vert${n}"><div><div class="ujsTextInner">${title}</div></div><div><div class="ujsTextInner">~100 players</div></div><div><div class="ujsTextInner">A community event</div></div>`
    + `<div><div class="ujsTextInner" style="width: 91px; color: rgb(0, 255, 0)">You can join!</div></div></div></div>`;
const eventsScene = `<div id="ujs_CommunityEventsScene"><div id="ujs_Rows">${card("", "Clan League 19")}${card("_2", "Nations Cup 2026")}${card("_3", "AWP World Tour")}`
    + `${card("_4", "Multi Template Ladder (MTL)")}${card("_5", "Clan Cup")}${card("_6", "Titled Tuesdays")}</div></div>`;

const eventLines = ($, id) => $(`#${id}_img`).find(".tuydEventLine").map((i, line) => $(line).text()).get();

test("Community Events cards show each event's standings, and your place where you take part", async () => {
    const { ctx, $, requests } = laddersPage({ url: "https://war.app/MultiPlayer?CommunityEvents=1", html: eventsScene });
    ctx.setupCommunityEventsStanding();
    await flush();
    assert.deepEqual(requests, [RANKINGS_URL, seriesUrl("2921525624")]);
    assert.deepEqual(eventLines($, "ujs_EventRow_2"), ["Running · 28 teams", "Your country Russia and Kazakhstan: Group C · 2nd of 3 · 11–10 · 11 points"],
        "war.app's title already names the edition, so the status starts after it");
    assert.equal($("#ujs_EventRow_2_img > .tuydEventMore").text(), "Your country Russia and Kazakhstan: Group C · 2nd of 3 · 11–10 · 11 points");
    assert.deepEqual(eventLines($, "ujs_EventRow_3"), ["2026 race · 5 players", "Rankings: Top 16 ›", "You: #144 · 55 points"]);
    assert.equal($("#ujs_EventRow_3_img a").first().attr("href"), "https://awp.wl-stats.com/rankings", "the rankings, not the leader's page");
    assert.deepEqual(eventLines($, "ujs_EventRow_5"), ["Clan Cup II · running · 23 clans · 11/15 matches", "Full standings on custom.wl-stats.com ›"]);
    assert.equal($("#ujs_EventRow_5_img > .tuydEventMore a").attr("href"), "https://custom.wl-stats.com/series/cups/3");
    const titled = eventLines($, "ujs_EventRow_6");
    assert.equal(titled[0], "Last: 91st Titled Tuesday - AUL · 20 players");
    assert.match(titled[1], /^Next: /);
    assert.equal(titled[2], "All events on custom.wl-stats.com ›", "the last event is linked above, so the bottom opens the series");
    assert.equal($("#ujs_EventRow_6_img > .tuydEventMore a").attr("href"), "https://custom.wl-stats.com/series/titled-tuesday");
    assert.equal($("#ujs_EventRow_4_img .tuydEventStanding").length, 0, "MTL isn't on the community sites yet");
    assert.equal($("#ujs_EventRow_img .tuydEventStanding").length, 0, "Clan League is left out while the series list has no season of it");
    assert.equal($("#ujs_EventRow_6_img .tuydEventLine").first().attr("title"), titled[0], "a cut line shows in full on hover");

    $("#ujs_Rows").append("<div>redraw</div>");
    await flush();
    assert.equal($(".tuydEventStanding").length, 4, "nothing is added twice");
});

test("a staged cup's card shows its stage as the link, without a second link to the same page", async () => {
    const staged = JSON.parse(JSON.stringify(series));
    staged.series.forEach((entry) => { entry.you = null; });
    staged.series[0].current.stage = "Round 2";
    const { ctx, $ } = laddersPage({ url: "https://war.app/MultiPlayer?CommunityEvents=1", html: eventsScene, playerId: null, seriesResponse: staged });
    ctx.setupCommunityEventsStanding();
    await flush();
    assert.deepEqual(eventLines($, "ujs_EventRow_5"), ["Clan Cup II · running · 23 clans · 11/15 matches", "Round 2 ›"]);
    assert.equal($("#ujs_EventRow_5_img .tuydEventStanding a").attr("href"), "https://custom.wl-stats.com/series/cups/3");
    assert.equal($("#ujs_EventRow_5_img .tuydEventMore").length, 0);
});

test("signed out, Community Events cards still show the standings, with links to the sites", async () => {
    const open = JSON.parse(JSON.stringify(series));
    open.series[0].current.status = "signups";
    open.series[0].current.signups_close_at = "2026-10-26T18:00:00";
    open.series.forEach((entry) => { entry.you = null; });
    const { ctx, $ } = laddersPage({ url: "https://war.app/MultiPlayer?CommunityEvents=1", html: eventsScene, playerId: null, seriesResponse: open });
    ctx.setupCommunityEventsStanding();
    await flush();
    assert.equal($(".tuydEventStanding").length, 4);
    const cup = eventLines($, "ujs_EventRow_5");
    assert.match(cup[0], /^Clan Cup II · Signups open until .+ · 23 clans · 11\/15 matches$/);
    assert.equal(cup[1], "Sign up on custom.wl-stats.com ›");
    assert.deepEqual(eventLines($, "ujs_EventRow_3"), ["2026 race · 5 players", "Rankings: Top 16 ›"], "signed out, no You line");
    assert.equal($("#ujs_EventRow_3_img .tuydEventMore").length, 0);
    assert.equal(eventLines($, "ujs_EventRow_2")[1], "Full standings on custom.wl-stats.com ›");
});

test("cards for events you take part in say so instead of war.app's \"You can join!\"", async () => {
    const joined = JSON.parse(JSON.stringify(series));
    joined.series[0].you = { as: "clan", name: "Icelandic Turtles", status: "signed_up", url: "/c" };
    joined.series.push({ slug: "clan-league", name: "Clan League", kind: "clan_league", url: "/s/cl", warapp_event: "Clan League",
        current: { name: "Clan League 19", url: "/s/cl/19", status: "finished", players: 18, winner: null, leader: null },
        you: { as: "clan", name: "Icelandic Turtles", division: "A", place: 4, of: 6, status: "finished", url: "/c" } });
    const { ctx, $ } = laddersPage({ url: "https://war.app/MultiPlayer?CommunityEvents=1", html: eventsScene, seriesResponse: joined });
    ctx.setupCommunityEventsStanding();
    await flush();
    const join = (id) => $(`#${id} [id^='ujs_vert'] .ujsTextInner`).last();
    assert.equal(join("ujs_EventRow_2").text(), "You're in!", "Nations Cup, running, your country is in");
    assert.equal(join("ujs_EventRow_3").text(), "You're in the race!");
    assert.equal(join("ujs_EventRow_5").text(), "You're signed up!");
    assert.equal(join("ujs_EventRow").text(), "You took part", "a finished season");
    assert.equal(join("ujs_EventRow_6").text(), "You can join!", "Titled Tuesday: not in it");
    assert.equal(join("ujs_EventRow_4").text(), "You can join!", "MTL is left alone");
    assert.equal(join("ujs_EventRow_2")[0].style.width, "auto", "war.app's fixed width doesn't cut the new text");
    assert.equal(join("ujs_EventRow_2")[0].style.color, "rgb(224, 192, 96)", "in: gold, not war.app's green");
    assert.equal(join("ujs_EventRow_3")[0].style.color, "rgb(224, 192, 96)");
    assert.equal(join("ujs_EventRow_5")[0].style.color, "rgb(108, 196, 240)", "signed up: light blue");
    assert.equal(join("ujs_EventRow")[0].style.color, "rgb(186, 187, 187)", "took part: grey");
    assert.equal(join("ujs_EventRow_6")[0].style.color, "rgb(0, 255, 0)", "You can join! keeps war.app's green");

    $("#ujs_EventRow_2 [id^='ujs_vert'] .ujsTextInner").last().text("You can join!");
    $("#ujs_Rows").append("<div>redraw</div>");
    await flush();
    assert.equal(join("ujs_EventRow_2").text(), "You're in!", "war.app redrawing the card gets it changed again");
});

test("signed out, every card keeps war.app's \"You can join!\"", async () => {
    const { ctx, $ } = laddersPage({ url: "https://war.app/MultiPlayer?CommunityEvents=1", html: eventsScene, playerId: null,
        seriesResponse: { series: series.series.map((entry) => ({ ...entry, you: null })) } });
    ctx.setupCommunityEventsStanding();
    await flush();
    assert.equal($(".ujsTextInner").filter((i, el) => $(el).text() === "You can join!").length, 6);
});

test("a signed-in player outside the AWP race is told so on its card", async () => {
    const { ctx, $ } = laddersPage({ url: "https://war.app/MultiPlayer?CommunityEvents=1", html: eventsScene, playerId: "999" });
    ctx.setupCommunityEventsStanding();
    await flush();
    assert.equal($("#ujs_EventRow_3_img > .tuydEventMore").text(), "You: not in the 2026 race yet");
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
        playerDataReady: $.Deferred().reject().promise(), AWP_SITE, CUSTOM_SITE, WL_STATS_CACHE_MS: 3600000, SERIES_CACHE_MS: 600000, CLAN_SERIES_KINDS: ["clan_league", "clan_cup", "nations_cup"], STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"]
    });
    return { ctx, dom, $, requests };
}

// Shaped like custom.wl-stats.com /api/v1/series?clan=Optimum: a finished Clan League the clan won,
// with its titles, next to a Clan Cup it's still in.
const optimum = {
    series: [
        { ...series.series[0], you: null, titles: { count: 0, editions: [] },
            squads: [{ as: "clan", name: "Optimum", place: null, of: 23, wins: 2, losses: 0, status: "playing", squad: "X", url: "/c" }] },
        { slug: "clan-league", name: "Clan League", kind: "clan_league", url: "https://custom.wl-stats.com/series/clan-league", warapp_event: "Clan League",
            current: { name: "Clan League 19", url: "https://custom.wl-stats.com/series/clan-league/seasons/19", status: "finished", players: 18, progress: null, leader: null,
                winner: { name: "Optimum", url: "https://custom.wl-stats.com/clans/Optimum" }, next_event_at: null },
            you: null,
            squads: [{ as: "clan", name: "Optimum", division: "A", group: null, place: 1, of: 6, wins: 39, losses: 16, points: 141, status: "champion", squad: "Optimum", url: "/o" }],
            titles: { count: 2, editions: [{ name: "Clan League 19", url: "https://custom.wl-stats.com/series/clan-league/seasons/19" }, { name: "Clan League 18", url: "https://custom.wl-stats.com/series/clan-league/seasons/18" }] } }
    ]
};

function clanPageWith(response) {
    return clanPage({ name: "Optimum", response });
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
    assert.deepEqual(rows.find(".communityLadderButton").map((i, a) => $(a).text()).get(), ["Clan League", "Clan Cup"], "Clan League leads; series the clan isn't in are left out");
    assert.equal(textOf($, rows[1])[0], "Clan Cup II · running · 23 clans · 11/15 matches");
    assert.equal($(rows[1]).find(".communityLadderYou").text(), "1celandic Turtles: 1–0", "Clan Cup shows only the clan's best squad");
    assert.match(textOf($, rows[0])[0], /^Clan League 20 · Signups open until .+ · 14 clans$/);
    assert.equal(textOf($, rows[0])[1], "Icelandic Turtles: Division A · signed up");
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
        playerDataReady: $.Deferred().reject().promise(), AWP_SITE, CUSTOM_SITE, WL_STATS_CACHE_MS: 3600000, SERIES_CACHE_MS: 600000, CLAN_SERIES_KINDS: ["clan_league", "clan_cup", "nations_cup"], STAGED_SERIES_KINDS: ["clan_cup", "nations_cup"]
    });
    ctx.setupClanStandings();
    await flush();
    await flush();
    assert.equal($("#clanStandings").css("top"), `${2200 - 360 + 10}px`, "10px below the lowest dialog under Clan Wars");
});

test("a clan page shows the clan's last Clan League, even long finished, and how many times it won", async () => {
    const { ctx, $ } = clanPageWith(optimum);
    ctx.setupClanStandings();
    await flush();
    await flush();
    const rows = $("#clanStandings .communityLadder");
    assert.deepEqual(rows.find(".communityLadderButton").map((i, a) => $(a).text()).get(), ["Clan League", "Clan Cup"]);
    assert.deepEqual(textOf($, rows[0]), [
        "Clan League 19 · finished · 18 clans",
        "Winner: Optimum",
        "Optimum: Division A · 1st of 6 · 39–16 · 141 points · champion🏆 Champion ×2: Clan League 19, Clan League 18"
    ]);
    assert.deepEqual($(rows[0]).find(".tuydClanTitles a").map((i, a) => $(a).attr("href")).get(),
        ["https://custom.wl-stats.com/series/clan-league/seasons/19", "https://custom.wl-stats.com/series/clan-league/seasons/18"]);
    assert.equal($(rows[1]).find(".tuydClanTitles").length, 0, "no title line for a clan that never won");
});

test("on a wide page the panel leaves war.app's 600px viewport and centers under the ladders, wider than the dialog", async () => {
    const html = `<div id="UjsCanvasHolder">${laddersScene}</div>`;
    const { ctx, dom, $ } = laddersPage({ html });
    const rect = (x, y, w, h) => () => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h });
    dom.window.document.getElementById("UjsCanvasHolder").getBoundingClientRect = rect(0, 72, 1400, 826);
    dom.window.document.getElementById("ujs_DialogBackgroundForDropShadow_img").getBoundingClientRect = rect(400, 122, 583, 374);
    ctx.setupCommunityLadders();
    await flush();
    const panel = $("#communityLadders");
    assert.equal(panel.parent().attr("id"), "UjsCanvasHolder");
    assert.equal(panel[0].style.width, "1040px", "two columns' worth, capped");
    assert.equal(panel[0].style.left, `${Math.round(400 + (583 - 1040) / 2)}px`, "centered on the ladders dialog");
    assert.equal(panel[0].style.top, `${496 - 72 + 10}px`, "10px below the dialog");
});

test("on a narrower page the panel keeps the dialog's width and its lists stack", async () => {
    const html = `<div id="UjsCanvasHolder">${laddersScene}</div>`;
    const { ctx, dom, $ } = laddersPage({ html });
    const rect = (x, y, w, h) => () => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h });
    dom.window.document.getElementById("UjsCanvasHolder").getBoundingClientRect = rect(0, 72, 739, 700);
    dom.window.document.getElementById("ujs_DialogBackgroundForDropShadow_img").getBoundingClientRect = rect(78, 122, 583, 374);
    ctx.setupCommunityLadders();
    await flush();
    assert.equal($("#communityLadders")[0].style.width, "583px");
    assert.equal($("#communityLadders")[0].style.left, "78px");
});

test("a line on an event card gets only the room beside war.app's text at its height", () => {
    const ctx = load(["eventLineRoom"]);
    const texts = [
        { top: 0, bottom: 18, right: 180 },
        { top: 18, bottom: 36, right: 140 },
        { top: 36, bottom: 54, right: 560 }
    ];
    assert.equal(ctx.eventLineRoom({ top: 6, bottom: 26 }, texts, 700), 700 - 180 - 16, "beside the title and the count, the wider one counts");
    assert.equal(ctx.eventLineRoom({ top: 26, bottom: 46 }, texts, 700), 700 - 560 - 16, "beside a long description, only what's left");
    assert.equal(ctx.eventLineRoom({ top: 80, bottom: 100 }, texts, 700), null, "nothing beside it, no limit");
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { source, createDom, load, domGlobals } = require("./harness");

const PAYLOAD = `"><img src=x onerror="alert(1)">'`;

function render(html) {
    const { dom } = createDom();
    const container = dom.window.document.createElement("div");
    container.innerHTML = html;
    return container;
}

function assertInert(container) {
    assert.equal(container.querySelectorAll("[onerror], script, img[src='x']").length, 0, container.innerHTML);
}

test("safeUrl allows only http(s) and same-site relative URLs", () => {
    const { safeUrl } = load(["safeUrl"]);
    for (const url of ["https://war.app/Forum/1", "http://example.com", "/MultiPlayer/", "  https://war.app  "]) {
        assert.equal(safeUrl(url), url.trim());
    }
    for (const url of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "\u0001javascript:alert(1)", "data:text/html,x", "//evil.example", "vbscript:x", "", null, undefined]) {
        assert.equal(safeUrl(url), "#", String(url));
    }
});

test("normalizeBookmarkUrl keeps web and relative URLs and prefixes the rest", () => {
    const { normalizeBookmarkUrl } = load(["normalizeBookmarkUrl"]);
    assert.equal(normalizeBookmarkUrl("https://war.app/Forum/1"), "https://war.app/Forum/1");
    assert.equal(normalizeBookmarkUrl("/Forum/1"), "/Forum/1");
    assert.equal(normalizeBookmarkUrl("war.app/Forum/1"), "https://war.app/Forum/1");
    assert.equal(normalizeBookmarkUrl("javascript:alert(1)"), "https://javascript:alert(1)");
});

test("MTL player, clan and game markup escapes API data", () => {
    const ctx = load(["getClanIcon", "getPlayerLink", "getPlayerGameString", "htmlEscape", "safeUrl"]);
    const evil = { player_id: PAYLOAD, player_name: PAYLOAD, clan_id: PAYLOAD, clan: PAYLOAD, clan_icon: "javascript:alert(1)" };
    const good = { player_id: 1, player_name: "Good", clan_id: 0 };

    const html = ctx.getClanIcon(evil) + ctx.getPlayerLink(evil) + ctx.getPlayerGameString(evil, good, 1);
    const container = render(html);
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.equal(container.querySelector("img").getAttribute("src"), "#");
});

test("community level cards escape API data", () => {
    const ctx = load(["renderLevelRow", "htmlEscape", "safeUrl", "getTurnText"]);
    const row = ctx.renderLevelRow({
        ID: PAYLOAD, NAME: PAYLOAD, MAP_IMAGE: "javascript:alert(1)", LIKES: PAYLOAD, WINS: 1, ATTEMPTS: 2,
        CREATOR_CLAN_ID: 5, CREATOR_CLAN_NAME: PAYLOAD, CREATOR_CLAN_IMAGE: "data:x", CREATOR_ID: PAYLOAD, CREATOR_NAME: PAYLOAD,
        RECORD_HOLDER_CLAN_ID: 0, RECORD_HOLDER_NAME: PAYLOAD, RECORD_HOLDER_ID: 3, RECORD_TURNS: 4, WIN_RATE: PAYLOAD
    });
    const container = render(`<table>${row}</table>`);
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.deepEqual([...container.querySelectorAll("img")].map((img) => img.getAttribute("src")), ["#", "#"]);
});

test("bookmarks render stored names and URLs safely", () => {
    const { dom, $ } = createDom(`<table id="BookmarkTable"></table>`);
    const ctx = load(["refreshBookmarks", "htmlEscape", "safeUrl", "siteRelativeUrl"], {
        SITE_HOSTS: ["war.app", "warzone.com", "warlight.net"],
        ...domGlobals(dom, $),
        log: () => { },
        wljs_WaitDialogJS: { Stop() { } },
        Database: {
            Table: { Bookmarks: "Bookmarks" },
            readAll: (table, cb) => cb([
                { id: 1, order: 1, name: PAYLOAD, url: "javascript:alert(document.cookie)", newWindow: false },
                { id: 2, order: PAYLOAD, name: "Forum", url: "/Forum/1", newWindow: true }
            ])
        }
    });
    ctx.refreshBookmarks();
    const table = dom.window.document.getElementById("BookmarkTable");
    assertInert(table);
    const links = [...table.querySelectorAll("tr td > a:first-child")];
    assert.deepEqual(links.map((a) => a.getAttribute("href")), ["#", "/Forum/1"]);
    assert.equal(links[0].textContent, PAYLOAD);
});

test("player data is no longer sent to maak.ch for validation", () => {
    assert.doesNotMatch(source, /wlpost\.php|validateUser|wlUserIsValid/);
});

test("every @require is pinned by hash and moment is gone", () => {
    const requires = source.match(/^\/\/ @require .*$/gm);
    assert.ok(requires.length > 0);
    for (const line of requires) {
        assert.match(line, /#sha256-[A-Za-z0-9+/]{43}=$/, line);
    }
    assert.doesNotMatch(source, /moment/);
});

test("profile text such as a player's bio stays text when stat sections are made collapsible", () => {
    const escaped = PAYLOAD.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const { dom, $ } = createDom(`<div class="container"><div class="my-2"><div class="fill bg-gray p-3"><big>Level 64</big><br>${escaped}<h3>Stats</h3>${escaped}</div></div></div>`);
    const ctx = load(["foldProfileStats"], { ...domGlobals(dom, $), addCSS: () => { } });
    ctx.foldProfileStats();
    assertInert(dom.window.document.body);
    assert.equal(dom.window.document.body.textContent.split(PAYLOAD).length - 1, 2);
});

test("AWP World Tour stats escape API data", () => {
    const ctx = load(["renderAwpStats", "htmlEscape", "safeUrl", "getRankText"]);
    const html = ctx.renderAwpStats({
        player_name: PAYLOAD, clan: PAYLOAD, page_url: "javascript:alert(1)", rank: PAYLOAD, rank_year: PAYLOAD, rank_12_months: PAYLOAD,
        stats: { games: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD, win_pct: PAYLOAD, tournaments: PAYLOAD, titles: PAYLOAD, finals: PAYLOAD, world_titles: PAYLOAD, best_placement: PAYLOAD }
    });
    const container = render(html);
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.equal(container.querySelector("a").getAttribute("href"), "#");
});

test("custom.wl-stats.com tournament links escape API data", () => {
    const ctx = load(["renderCustomTournamentLink", "htmlEscape", "safeUrl"]);
    const container = render(ctx.renderCustomTournamentLink({ name: PAYLOAD, url: "javascript:alert(1)", series: { name: PAYLOAD, url: "data:text/html,x" } }));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.deepEqual([...container.querySelectorAll("a")].map((a) => a.getAttribute("href")), ["#", "#"]);
    assert.equal(container.querySelector("a").getAttribute("title"), PAYLOAD);
});

test("the AWP World Tour row on the Ladders page escapes API data", () => {
    const ctx = load(["renderAwpLadderRow", "communityLadderRow", "awpStanding", "formatCount", "htmlEscape", "safeUrl"], { AWP_SITE: "https://awp.wl-stats.com" });
    const evil = { rank: PAYLOAD, player_id: PAYLOAD, player_name: PAYLOAD, points: PAYLOAD };
    const container = render(ctx.renderAwpLadderRow({ year: PAYLOAD, rankings: [evil, { ...evil, player_id: "5" }] }, "5"));
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
});

test("custom.wl-stats.com series rows, the Seasonal line and Community Events lines escape API data", () => {
    const { $ } = createDom();
    const ctx = load(["renderSeriesLadderRow", "renderSeasonalLadderLine", "communityEventLine", "communityLadderRow", "seriesYouHtml", "seriesLink", "signupsHtml",
        "formatCount", "parseUtcTime", "formatEventTime", "timeUntil", "awpStanding", "getRankText", "htmlEscape", "safeUrl"], { $ });
    const link = { name: PAYLOAD, url: "javascript:alert(1)" };
    const evil = {
        name: PAYLOAD, kind: PAYLOAD, url: "javascript:alert(1)", warapp_event: "Evil",
        current: { name: PAYLOAD, url: "data:text/html,x", status: "signups", signups_close_at: PAYLOAD, next_event_at: PAYLOAD, players: PAYLOAD, progress: { played: PAYLOAD, total: PAYLOAD }, leader: link, winner: link },
        you: { as: "nation", name: PAYLOAD, division: PAYLOAD, group: PAYLOAD, place: PAYLOAD, of: PAYLOAD, wins: PAYLOAD, losses: PAYLOAD, points: PAYLOAD, status: PAYLOAD, url: "javascript:alert(1)" }
    };
    const running = { ...evil, current: { ...evil.current, status: "running" } };
    const html = ctx.renderSeriesLadderRow(evil, 0) + ctx.renderSeriesLadderRow(running, 0) + ctx.renderSeasonalLadderLine(running)
        + ctx.communityEventLine("Evil event", { series: [evil], rankings: null, playerId: null });
    const container = render(html);
    assertInert(container);
    assert.ok(container.textContent.includes(PAYLOAD));
    assert.ok([...container.querySelectorAll("a")].every((a) => a.getAttribute("href") === "#"), container.innerHTML);
});

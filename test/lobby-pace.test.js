const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// The parts of a war.app profile the script reads (numbers from a real profile, October 2026).
const PROFILE = `<html><head><title>KKND - War.app - Better than Hasbro's RISK® game - Play Online Free</title></head><body>
    <div>Joined War.app: 2013-07-07 Currently in 7 multi-day games Played in 4636 multi-player games (68% real-time)
    Last seen less than 15 minutes ago Booted 224 times (3% of their last 100 games)</div>
    <h3>Play Speed</h3>
    <h5 style="margin-bottom: 3px">Multi-Day Games:</h5>
    &nbsp;&nbsp;<font class="text-muted">Average:</font> 1 day 13 hours<br />
    <table><tr><td><table>
        <tr><td align="right">&lt; 5 mins&nbsp;</td><td><div title="842"></div></td></tr>
        <tr><td align="right">5 - 30 mins&nbsp;</td><td><div title="840"></div></td></tr>
        <tr><td align="right">30 mins - 2 hrs&nbsp;</td><td><div title="732"></div></td></tr>
        <tr><td align="right">2 - 5 hrs&nbsp;</td><td><div title="529"></div></td></tr>
        <tr><td align="right">5 - 12 hrs&nbsp;</td><td><div title="835"></div></td></tr>
        <tr><td align="right">12 hrs - 1 day&nbsp;</td><td><div title="916"></div></td></tr>
        <tr><td align="right">1 day - 1 week&nbsp;</td><td><div title="2812"></div></td></tr>
        <tr><td align="right">&gt; 1 week&nbsp;</td><td><div title="274"></div></td></tr>
    </table></td></tr></table>
    <h5>Real-Time Games:</h5>&nbsp;&nbsp;<font class="text-muted">Average:</font> 2 minutes 26 seconds<br />
    <table><tr><td><table>
        <tr><td>&lt; 30 sec&nbsp;</td><td><div title="1540"></div></td></tr>
        <tr><td>30 sec - 1 min&nbsp;</td><td><div title="600"></div></td></tr>
        <tr><td>1 - 2 mins&nbsp;</td><td><div title="460"></div></td></tr>
        <tr><td>2 - 5 mins&nbsp;</td><td><div title="300"></div></td></tr>
        <tr><td>5 - 10 mins&nbsp;</td><td><div title="80"></div></td></tr>
        <tr><td>&gt; 10 mins&nbsp;</td><td><div title="20"></div></td></tr>
    </table></td></tr></table>
    </body></html>`;

test("war.app's durations become hours, and short", () => {
    const ctx = load(["durationHours", "shortDuration"]);
    assert.equal(ctx.durationHours("1 day 13 hours"), 37);
    assert.equal(ctx.durationHours("45 minutes"), 0.75);
    assert.equal(ctx.durationHours("2 days"), 48);
    assert.equal(ctx.durationHours(""), null);
    assert.equal(ctx.shortDuration("1 day 13 hours"), "1d 13h");
    assert.equal(ctx.shortDuration("9 hours 5 minutes"), "9h 5m");
});

const PACE_FUNCTIONS = ["parseProfilePace", "durationHours", "lobbyPaceText", "shortDuration"];
function loadPace(globals) {
    const { source } = require("./harness");
    const kinds = /var LOBBY_PACE_KINDS = \{[\s\S]*?\n\};/.exec(source)[0];
    const ctx = load(PACE_FUNCTIONS.concat(["lobbyGameKind"]), globals);
    require("node:vm").runInContext(kinds, ctx);
    return ctx;
}

test("a profile gives games in progress, boot rate, and multi-day and real-time pace", () => {
    const { dom, $ } = createDom(PROFILE);
    const ctx = loadPace(domGlobals(dom, $));
    const pace = JSON.parse(JSON.stringify(ctx.parseProfilePace(dom.window.document)));
    assert.deepEqual(pace, {
        games: 7,
        bootedPercent: 3,
        multiDay: { average: "1 day 13 hours", averageHours: 37, slowPercent: 40 },
        realTime: { average: "2 minutes 26 seconds", averageHours: 2 * (1 / 60) + 26 * (1 / 3600), slowPercent: 13 }
    });
});

test("a new player's profile without these numbers reads as such", () => {
    const { dom, $ } = createDom("<p>Joined War.app: 2026-10-01</p>");
    const ctx = loadPace(domGlobals(dom, $));
    const pace = ctx.parseProfilePace(dom.window.document);
    assert.equal(pace.games, null);
    assert.equal(pace.multiDay.averageHours, null);
    assert.equal(ctx.lobbyPaceText(pace, "multiDay"), "no multi-day turns yet");
    assert.equal(ctx.lobbyPaceText(pace, "realTime"), "no real-time turns yet");
});

test("the lobby line, for multi-day and real-time games", () => {
    const ctx = loadPace({});
    const pace = {
        games: 7,
        bootedPercent: 3,
        multiDay: { average: "1 day 13 hours", averageHours: 37, slowPercent: 40 },
        realTime: { average: "2 minutes 26 seconds", averageHours: 0.04, slowPercent: 13 }
    };
    assert.equal(ctx.lobbyPaceText(pace, "multiDay"), "in 7 games · avg turn 1d 13h · 40% over a day · booted 3%");
    assert.equal(ctx.lobbyPaceText(pace, "multiDay", true),
        "in 7 multi-day games, per their profile · average multi-day turn 1 day 13 hours · 40% of their multi-day turns took over a day · booted from 3% of their recent games");
    assert.equal(ctx.lobbyPaceText(pace, "realTime"), "avg turn 2m 26s · 13% over 2 min · booted 3%", "the multi-day games count says nothing about a real-time game");
});

test("a boot time in minutes is a real-time game", () => {
    const ctx = loadPace({});
    assert.equal(ctx.lobbyGameKind("3 minutes"), "realTime");
    assert.equal(ctx.lobbyGameKind("30 seconds"), "realTime");
    assert.equal(ctx.lobbyGameKind("100 days.  100 days banked plus 1 day banked each day"), "multiDay");
    assert.equal(ctx.lobbyGameKind("1 hour"), "realTime", "up to an hour is real-time");
    assert.equal(ctx.lobbyGameKind("1 hour 30 minutes"), "multiDay");
    assert.equal(ctx.lobbyGameKind("2 days"), "multiDay");
    assert.equal(ctx.lobbyGameKind(""), "multiDay");
});

test("profile links are built from war.app's game data, found by the players' names", () => {
    // Shaped like war.app's lobby data: minified field names, a player list, and your own entry without an ID.
    const data = {
        e1a: [
            { Gi: 2743, ag: 67, $a: 150854, Hh: { Ls: 1913288124, Ya: "Clan" }, Td: "Dom365" },
            { Gi: 2924, ag: 61, $a: 215256, Hh: { Ls: 1913288124, Bf: 33, Ya: "Icelandic Turtles" }, Td: "KKND" }
        ],
        Fa: { xB: { ag: 61, Gi: 2924, mS: 5, Tag: 1, Ya: "KKND" } }
    };
    const ctx = load(["lobbyProfileCandidates"]);
    const found = JSON.parse(JSON.stringify(ctx.lobbyProfileCandidates(data, ["KKND", "Dom365", "Nobody"])));
    assert.equal(found.KKND[0], "2921525624", "the largest ID is tried first");
    assert.ok(found.KKND.includes("296124"), "the level is a candidate too, and is ruled out by the profile's title");
    assert.equal(found.Dom365[0], "2715085443");
    assert.equal(found.Nobody, undefined);
});

test("the version label shows in a lobby and goes away once war.app turns it into the game", async () => {
    const { dom, $ } = createDom("", "https://war.app/MultiPlayer?GameID=1");
    dom.window.document.title = "Lobby - War.app";
    const css = [];
    const ctx = load(["addVersionLabel"], {
        ...domGlobals(dom, $),
        version: "3.38.1",
        createSelector: (selector, rule) => css.push(selector + " { " + rule + " }"),
        pageIsGame: () => true,
        pageIsExamineMap: () => false,
        pageIsDesignMap: () => false
    });
    ctx.addVersionLabel();
    const body = dom.window.document.body;
    assert.equal($(".versionLabel").text(), "3.38.1");
    assert.equal(body.classList.contains("tuydInGame"), false, "shown in the lobby");
    dom.window.document.title = "Multi-Player: Some game - War.app";
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(body.classList.contains("tuydInGame"), true, "hidden in the game");
    assert.ok(css.some((rule) => /body\.tuydInGame \.versionLabel \{ display: none/.test(rule)));
});

test("outside games the version label always shows", () => {
    const { dom, $ } = createDom("", "https://war.app/MultiPlayer/");
    const ctx = load(["addVersionLabel"], {
        ...domGlobals(dom, $),
        version: "3.38.1",
        createSelector: () => { },
        pageIsGame: () => false,
        pageIsExamineMap: () => false,
        pageIsDesignMap: () => false
    });
    ctx.addVersionLabel();
    assert.equal($(".versionLabel").length, 1);
    assert.equal(dom.window.document.body.classList.contains("tuydInGame"), false);
});

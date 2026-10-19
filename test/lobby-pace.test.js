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
    <table><tr><td><table><tr><td>&lt; 30 sec&nbsp;</td><td><div title="1540"></div></td></tr></table></td></tr></table>
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

test("a profile gives games in progress, boot rate, average turn and the share of turns over a day", () => {
    const { dom, $ } = createDom(PROFILE);
    const ctx = load(["parseProfilePace", "durationHours"], domGlobals(dom, $));
    const pace = JSON.parse(JSON.stringify(ctx.parseProfilePace(dom.window.document)));
    assert.deepEqual(pace, { games: 7, bootedPercent: 3, average: "1 day 13 hours", averageHours: 37, overADayPercent: 40 });
});

test("a new player's profile without these numbers reads as such", () => {
    const { dom, $ } = createDom("<p>Joined War.app: 2026-10-01</p>");
    const ctx = load(["parseProfilePace", "durationHours", "lobbyPaceText", "shortDuration"], domGlobals(dom, $));
    const pace = ctx.parseProfilePace(dom.window.document);
    assert.equal(pace.games, null);
    assert.equal(pace.averageHours, null);
    assert.equal(ctx.lobbyPaceText(pace), "no multi-day turns yet");
});

test("the lobby line", () => {
    const ctx = load(["lobbyPaceText", "shortDuration"]);
    assert.equal(ctx.lobbyPaceText({ games: 7, bootedPercent: 3, average: "1 day 13 hours", averageHours: 37, overADayPercent: 40 }),
        "in 7 games · avg turn 1d 13h · 40% over a day · booted 3%");
    assert.equal(ctx.lobbyPaceText({ games: 7, bootedPercent: 3, average: "1 day 13 hours", averageHours: 37, overADayPercent: 40 }, true),
        "in 7 multi-day games, per their profile · average multi-day turn 1 day 13 hours · 40% of their turns took over a day · booted from 3% of their recent games");
    assert.equal(ctx.lobbyPaceText({ games: 1, bootedPercent: null, average: null, averageHours: null, overADayPercent: null }), "in 1 game");
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

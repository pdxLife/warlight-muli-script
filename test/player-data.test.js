const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

const PROFILE_LINK = `<div class="dropdown-menu"><a href="/Profile?p=1234567890">Profile</a></div>`;
const PROFILE_PAGE = `
    <div>
        <a id="AccountDropDown"> Muli </a>
        <img id="MemberIcon">
        <a id="LevelLink" title="Progress to next: 1,234">L42</a>
        <span><img src="/Images/Vacation.png"> You are on vacation until 10/20/2026 12:00:00</span>
    </div>`;

function setup({ html = PROFILE_LINK, cookie } = {}) {
    const { dom, $ } = createDom(html);
    const cookies = cookie ? { muli_wl_player: cookie } : {};
    const ajaxCalls = [];
    let ajaxResult = $.Deferred();
    $.cookie = (name, value) => (value === undefined ? cookies[name] : (cookies[name] = value));
    $.ajax = (options) => {
        ajaxCalls.push(options);
        return ajaxResult.promise();
    };
    const parsed = [];
    class RecordingDOMParser extends dom.window.DOMParser {
        parseFromString(html, type) {
            parsed.push({ html, type });
            return super.parseFromString(html, type);
        }
    }
    const ctx = load(
        ["loadPlayerData", "removePlayerDataCookie", "getVacationEndDate", "extractPlayerId", "extractProfileId", "extractProfileToken"],
        { ...domGlobals(dom, $), DOMParser: RecordingDOMParser, log: () => { } }
    );
    return { ctx, dom, $, cookies, ajaxCalls, ajax: ajaxResult, parsed };
}

const state = (promise) => promise.state();

test("cached cookie resolves immediately without a request", () => {
    const { ctx, ajaxCalls } = setup({ cookie: JSON.stringify({ Name: "Muli", Level: "42" }) });
    const ready = ctx.loadPlayerData();
    assert.equal(state(ready), "resolved");
    assert.equal(ctx.WlPlayer.Name, "Muli");
    assert.equal(ajaxCalls.length, 0);
});

test("unreadable cookie is discarded and the profile is fetched again", () => {
    const { ctx, ajaxCalls, cookies } = setup({ cookie: "{not json" });
    ctx.$.removeCookie = (name) => { delete cookies[name]; };
    const ready = ctx.loadPlayerData();
    assert.equal(state(ready), "pending");
    assert.equal(ajaxCalls.length, 1);
    assert.equal(cookies.muli_wl_player, undefined);
});

test("missing profile link rejects so dependent features skip", () => {
    const { ctx, ajaxCalls } = setup({ html: "" });
    const ready = ctx.loadPlayerData();
    assert.equal(state(ready), "rejected");
    assert.equal(ajaxCalls.length, 0);
    assert.equal(ctx.WlPlayer, undefined);
});

test("profile is fetched asynchronously and parsed", () => {
    const { ctx, ajaxCalls, ajax, cookies } = setup();
    const ready = ctx.loadPlayerData();

    assert.equal(ajaxCalls.length, 1);
    assert.notEqual(ajaxCalls[0].async, false);
    assert.equal(ajaxCalls[0].url, "https://war.app/Profile?p=1234567890");
    assert.equal(state(ready), "pending");

    ajax.resolve(PROFILE_PAGE);
    assert.equal(state(ready), "resolved");
    const player = ctx.WlPlayer;
    assert.equal(player.Name, "Muli");
    assert.equal(player.PlayerId, "1234567890");
    assert.equal(player.ProfileId, "345678");
    assert.equal(player.isMember, true);
    assert.equal(player.OnVacationUntil.getTime(), new Date("10/20/2026 12:00:00").getTime());
    assert.equal(JSON.parse(cookies.muli_wl_player).Name, "Muli");
});

test("failed profile request rejects", () => {
    const { ctx, ajax } = setup();
    const ready = ctx.loadPlayerData();
    ajax.reject({ statusText: "error" });
    assert.equal(state(ready), "rejected");
    assert.equal(ctx.WlPlayer, undefined);
});

test("profile page is parsed with DOMParser", () => {
    const { ctx, ajax, parsed } = setup();
    ctx.loadPlayerData();
    ajax.resolve(PROFILE_PAGE);
    assert.deepEqual(parsed, [{ html: PROFILE_PAGE, type: "text/html" }]);
});

test("fields directly under body of a full profile document are found", () => {
    const { ctx, ajax } = setup();
    const ready = ctx.loadPlayerData();
    ajax.resolve(`<!DOCTYPE html>
        <html><head><title>Profile</title></head>
        <body>
            <a id="AccountDropDown">Muli</a>
            <a id="LevelLink" title="Progress to next: 99">L7</a>
            <img src="/Images/Vacation.png"> You are on vacation until 1/2/2027 03:04:05
        </body></html>`);
    assert.equal(state(ready), "resolved");
    const player = ctx.WlPlayer;
    assert.equal(player.Name, "Muli");
    assert.equal(player.isMember, false);
    assert.equal(player.OnVacationUntil.getTime(), new Date("1/2/2027 03:04:05").getTime());
});

test("getVacationEndDate reads a parsed document", () => {
    const { ctx, dom, $ } = setup();
    const parse = (html) => $(new dom.window.DOMParser().parseFromString(html, "text/html"));
    assert.equal(ctx.getVacationEndDate(parse(PROFILE_PAGE)).getTime(), new Date("10/20/2026 12:00:00").getTime());
    assert.equal(ctx.getVacationEndDate(parse(`<span><img src="/Images/Vacation.png"> Back soon</span>`)), null);
    assert.equal(ctx.getVacationEndDate(parse(`<a id="AccountDropDown">Muli</a>`)), null);
});

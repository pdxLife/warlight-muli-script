const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { source, load } = require("./harness");

const plain = (value) => JSON.parse(JSON.stringify(value));

test("htmlEscape escapes markup characters", () => {
    const { htmlEscape } = load(["htmlEscape"]);
    assert.equal(htmlEscape(`<img src=x onerror="a('b')">&`), "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
    assert.equal(htmlEscape(42), "42");
});

test("getRankText uses English ordinal suffixes", () => {
    const { getRankText } = load(["getRankText"]);
    const cases = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 11: "11th", 12: "12th", 13: "13th", 21: "21st", 102: "102nd", 111: "111th" };
    for (const [n, expected] of Object.entries(cases)) {
        assert.equal(getRankText(Number(n)), expected);
    }
});

test("getTurnText pluralises turns", () => {
    const { getTurnText } = load(["getTurnText"]);
    assert.equal(getTurnText(1), " in 1 turn");
    assert.equal(getTurnText(5), " in 5 turns");
});

test("getLevelId reads both level URL formats", () => {
    const { getLevelId } = load(["getLevelId"]);
    assert.equal(getLevelId("https://war.app/SinglePlayer/Level?ID=123"), "123");
    assert.equal(getLevelId("https://war.app/SinglePlayer?Level=456"), "456");
    assert.equal(getLevelId("https://war.app/SinglePlayer/Level?ID=789#comments"), "789");
    assert.equal(getLevelId("https://war.app/Forum"), undefined);
});

test("compareTable sorts by order", () => {
    const { compareTable } = load(["compareTable"]);
    const sorted = [{ order: 3 }, { order: 1 }, { order: 2 }].sort(compareTable);
    assert.deepEqual(sorted.map((t) => t.order), [1, 2, 3]);
});

test("player id helpers split the profile token", () => {
    const ctx = load(["extractPlayerId", "extractProfileId", "extractProfileToken"]);
    const url = "https://war.app/Profile?p=1234567890";
    assert.equal(ctx.extractPlayerId(url), "1234567890");
    assert.equal(ctx.extractProfileId(url), "345678");
    assert.deepEqual(plain(ctx.extractProfileToken(url)), ["12", "90"]);
    assert.equal(ctx.extractPlayerId("https://war.app/Profile"), null);
});

test("page detection matches war.app and warzone.com URLs", () => {
    const names = ["pageIsDashboard", "pageIsTournament", "pageIsBlacklistPage", "pageIsForumThread"];
    const at = (href) => load(names, { location: { href } });

    assert.ok(at("https://war.app/MultiPlayer/").pageIsDashboard());
    assert.ok(at("https://www.warzone.com/MultiPlayer/#").pageIsDashboard());
    assert.ok(!at("https://war.app/MultiPlayer/Tournament?ID=5").pageIsDashboard());
    assert.ok(at("https://war.app/MultiPlayer/Tournament?ID=5").pageIsTournament());
    assert.ok(at("https://war.app/ManageBlackList").pageIsBlacklistPage());
    assert.ok(at("https://war.app/ManageBlockList").pageIsBlacklistPage());
    assert.ok(at("https://war.app/Forum/12345-some-thread").pageIsForumThread());
    assert.ok(at("https://www.some-future-domain.example/Forum/12345-thread").pageIsForumThread(), "routing doesn't depend on the domain");
    assert.ok(!at("https://war.app/Profile/Forum/12345").pageIsForumThread());
});

test("userscript header updates from this repo and versions agree", () => {
    const header = source.slice(0, source.indexOf("// ==/UserScript=="));
    const raw = "https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js";
    assert.match(header, new RegExp(`@downloadURL ${raw}`));
    assert.match(header, new RegExp(`@updateURL ${raw}`));
    assert.doesNotMatch(header, /@(download|update)URL .*greasyfork/);

    const version = header.match(/@version (\S+)/)[1];
    assert.match(source, new RegExp(`GM_info\\.script\\.version : '${version.replace(/\./g, "\\.")}'`));
    const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
    assert.match(readme, new RegExp(`\\*\\*Version:\\*\\* ${version.replace(/\./g, "\\.")}`));
    const site = fs.readFileSync(path.join(__dirname, "..", "docs", "index.html"), "utf8");
    assert.match(site, new RegExp(`class="version"[^>]*>v${version.replace(/\./g, "\\.")}<`), "the site shows the current version");
});

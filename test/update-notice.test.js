const { test } = require("node:test");
const assert = require("node:assert/strict");
const { source, createDom, load, domGlobals, flush } = require("./harness");

const SCRIPT_URL = "https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js";
const CHANGELOG_URL = "https://github.com/pdxLife/warlight-muli-script/blob/main/CHANGELOG.md";
const KEY = "tidyUpYourDashboard.updateCheck";
const header = (v) => `// ==UserScript==\n// @name Tidy up your Dashboard - Modified \n// @version ${v}\n// ==/UserScript==\nvar x = 1;`;

function page({ running = "3.19.0", remote = header("3.20.0"), fail = false } = {}) {
    const { dom, $ } = createDom(`<div class="versionLabel">${running}</div><div id="userscriptMenu"><div class="modal-body"><div class="settingsListItem"></div></div></div>`);
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        return (fail ? result.reject({ status: 0, statusText: "error" }) : result.resolve(remote)).promise();
    };
    const logs = [];
    const ctx = load(["setupUpdateNotice", "latestScriptVersion", "parseScriptVersion", "compareVersions", "renderUpdateNotice", "htmlEscape"], {
        ...domGlobals(dom, $), localStorage: dom.window.localStorage, log: (entry) => logs.push(entry), createSelector: () => {},
        version: running, SCRIPT_URL, CHANGELOG_URL, UPDATE_CHECK_KEY: KEY, UPDATE_CHECK_MS: 24 * 60 * 60 * 1000, UPDATE_RETRY_MS: 60 * 60 * 1000
    });
    return { ctx, dom, $, requests, logs };
}

test("the script's update URL constant is the header's download URL", () => {
    const downloadUrl = /^\/\/\s*@downloadURL\s+(\S+)/m.exec(source)[1];
    assert.equal(downloadUrl, SCRIPT_URL);
    assert.match(source, new RegExp(`var SCRIPT_URL = "${SCRIPT_URL.replace(/[.]/g, "\\.")}";`));
});

test("versions compare by number, not as text", () => {
    const { compareVersions, parseScriptVersion } = load(["compareVersions", "parseScriptVersion"]);
    assert.equal(compareVersions("3.20.0", "3.19.0"), 1);
    assert.equal(compareVersions("3.9.0", "3.10.0"), -1);
    assert.equal(compareVersions("3.19", "3.19.0"), 0);
    assert.equal(compareVersions("4.0.0", "3.99.9"), 1);
    assert.equal(parseScriptVersion(header("3.20.1")), "3.20.1");
    assert.equal(parseScriptVersion("not a userscript"), null);
});

test("a newer version on GitHub turns the version label gold and puts an update button in the menu", async () => {
    const { ctx, $, requests } = page();
    ctx.setupUpdateNotice();
    await flush();
    assert.deepEqual(requests, [SCRIPT_URL]);
    assert.equal($(".versionLabel").text(), "3.19.0 · update available");
    assert.ok($(".versionLabel").hasClass("updateAvailable"));
    const notice = $("#userscriptMenu .modal-body > #updateNotice");
    assert.equal(notice.length, 1, "at the top of the menu");
    assert.equal($("#userscriptMenu .modal-body").children().first().attr("id"), "updateNotice");
    assert.match(notice.text(), /Version 3\.20\.0 is available \(you have 3\.19\.0\)/);
    assert.deepEqual(notice.find("a").map((i, a) => [$(a).text(), $(a).attr("href")]).get(),
        ["Update to 3.20.0", SCRIPT_URL, "What's new", CHANGELOG_URL]);
});

test("the same or an older version on GitHub shows nothing", async () => {
    for (const remote of [header("3.19.0"), header("3.18.2")]) {
        const { ctx, $ } = page({ remote });
        ctx.setupUpdateNotice();
        await flush();
        assert.equal($("#updateNotice").length, 0);
        assert.equal($(".versionLabel").text(), "3.19.0");
    }
});

test("GitHub is asked at most once a day, and the answer carries over to the next page", async () => {
    const first = page();
    first.ctx.setupUpdateNotice();
    await flush();
    const stored = first.dom.window.localStorage.getItem(KEY);

    const second = page();
    second.dom.window.localStorage.setItem(KEY, stored);
    second.ctx.setupUpdateNotice();
    await flush();
    assert.deepEqual(second.requests, [], "no request within the day");
    assert.equal(second.$("#updateNotice").length, 1, "the stored answer still shows the notice");

    const nextDay = page();
    nextDay.dom.window.localStorage.setItem(KEY, JSON.stringify({ ...JSON.parse(stored), at: Date.now() - 25 * 60 * 60 * 1000 }));
    nextDay.ctx.setupUpdateNotice();
    await flush();
    assert.deepEqual(nextDay.requests, [SCRIPT_URL]);
});

test("when GitHub can't be reached, it's logged, nothing shows, and it's tried again after an hour", async () => {
    const { ctx, dom, $, logs } = page({ fail: true });
    ctx.setupUpdateNotice();
    await flush();
    assert.equal($("#updateNotice").length, 0);
    assert.ok(logs.some((entry) => entry.includes("Error checking for a new version")));
    const stored = JSON.parse(dom.window.localStorage.getItem(KEY));
    assert.equal(stored.failed, true);

    const later = page();
    later.dom.window.localStorage.setItem(KEY, JSON.stringify({ ...stored, at: Date.now() - 61 * 60 * 1000 }));
    later.ctx.setupUpdateNotice();
    await flush();
    assert.deepEqual(later.requests, [SCRIPT_URL], "retried after an hour, not a day");
});

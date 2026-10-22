const { test } = require("node:test");
const assert = require("node:assert/strict");
const { source, createDom, load, domGlobals, flush } = require("./harness");

const SCRIPT_URL = "https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js";
const KEY = "tidyUpYourDashboard.updateCheck";
const header = (v) => `// ==UserScript==\n// @name Tidy up your Dashboard - Modified \n// @version ${v}\n// ==/UserScript==\nvar x = 1;`;

function page({ running = "3.19.0", remote = header("3.20.0"), fail = false } = {}) {
    const { dom, $ } = createDom(`<div class="versionLabel" data-toggle="modal" data-target="#userscriptMenu">${running}</div><div id="userscriptMenu"><div class="modal-body"><div class="settingsListItem"></div></div></div>`);
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        return (fail ? result.reject({ status: 0, statusText: "error" }) : result.resolve(remote)).promise();
    };
    const logs = [];
    const reloads = [];
    const ctx = load(["setupUpdateNotice", "latestScriptVersion", "parseScriptVersion", "compareVersions", "renderUpdateLabel", "renderReloadLabel", "htmlEscape"], {
        ...domGlobals(dom, $), localStorage: dom.window.localStorage, log: (entry) => logs.push(entry), createSelector: () => {},
        location: { reload: () => reloads.push(true) }, setTimeout: (fn) => fn(),
        version: running, SCRIPT_URL, UPDATE_CHECK_KEY: KEY, UPDATE_CHECK_MS: 24 * 60 * 60 * 1000, UPDATE_RETRY_MS: 60 * 60 * 1000
    });
    return { ctx, dom, $, requests, logs, reloads };
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

test("a newer version on GitHub turns only the corner label into a gold update link", async () => {
    const { ctx, $, requests } = page();
    ctx.setupUpdateNotice();
    await flush();
    assert.deepEqual(requests, [SCRIPT_URL]);
    const label = $(".versionLabel");
    assert.equal(label.length, 1);
    assert.equal(label.prop("tagName"), "A");
    assert.equal(label.text(), "Update to 3.20.0");
    assert.equal(label.attr("href"), SCRIPT_URL);
    assert.equal(label.attr("title"), "Version 3.20.0 is available (you have 3.19.0). Click to update.");
    assert.equal(label.attr("data-toggle"), undefined, "clicking updates instead of opening the menu");
    assert.ok(label.hasClass("updateAvailable"));
    assert.equal($("#userscriptMenu .modal-body").children().length, 1, "nothing is added to the menu");

    ctx.setupUpdateNotice();
    await flush();
    assert.equal($(".versionLabel").length, 1, "running it again changes nothing");
});

test("the same or an older version on GitHub shows nothing", async () => {
    for (const remote of [header("3.19.0"), header("3.18.2")]) {
        const { ctx, $ } = page({ remote });
        ctx.setupUpdateNotice();
        await flush();
        assert.equal($(".versionLabel").prop("tagName"), "DIV");
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
    assert.equal(second.$(".versionLabel").text(), "Update to 3.20.0", "the stored answer still shows the link");

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
    assert.equal($(".versionLabel").text(), "3.19.0");
    assert.ok(logs.some((entry) => entry.includes("Error checking for a new version")));
    const stored = JSON.parse(dom.window.localStorage.getItem(KEY));
    assert.equal(stored.failed, true);

    const later = page();
    later.dom.window.localStorage.setItem(KEY, JSON.stringify({ ...stored, at: Date.now() - 61 * 60 * 1000 }));
    later.ctx.setupUpdateNotice();
    await flush();
    assert.deepEqual(later.requests, [SCRIPT_URL], "retried after an hour, not a day");
});

test("after the update link is clicked, the label offers the reload that runs the new version", async () => {
    const { ctx, $, reloads } = page();
    ctx.setupUpdateNotice();
    await flush();
    const link = $(".versionLabel");
    link.on("click", (event) => event.preventDefault());
    link.trigger("click");
    const label = $(".versionLabel");
    assert.equal(label.length, 1);
    assert.equal(label.text(), "Reload to finish updating");
    assert.match(label.attr("title"), /reload war\.app to run it.*empty tab/);
    assert.equal(reloads.length, 0, "clicking Update itself doesn't reload");
    label.trigger("click");
    assert.equal(reloads.length, 1);
});

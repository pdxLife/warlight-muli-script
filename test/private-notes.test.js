const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// Mirrors a player's profile when you're signed in, and war.app's /Discussion/Notes?p=… page.
const profile = `<div class="container"><span id="FeedbackMsg"></span><a href="/Discussion/Notes?p=148963">Private Notes</a><a id="BlockListLink">+ Blocklist</a></div>`;
const notesPage = (note) => `<html><body><h1>Private Notes on "Rival"</h1><div id="PostForDisplay_0">${note}</div>`
    + `<script>window.notesPageScriptRan = true;</script><textarea></textarea></body></html>`;

function setup(response, { fail = false, html = profile } = {}) {
    const { dom, $ } = createDom(html, "https://war.app/Profile?p=1");
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const result = $.Deferred();
        return (fail ? result.reject({ statusText: "error" }) : result.resolve(response)).promise();
    };
    const logs = [];
    const ctx = load(["loadPrivateNotes"], { ...domGlobals(dom, $), DOMParser: dom.window.DOMParser, log: (entry) => logs.push(entry) });
    ctx.loadPrivateNotes();
    return { dom, $, requests, logs, box: () => $("#privateNotes .content") };
}

test("shows your note, with its formatting, after the feedback area", () => {
    const { dom, $, requests, box } = setup(notesPage("Plays <b>aggressive</b> openings<br>Good teammate"));
    assert.deepEqual(requests, ["https://war.app/Discussion/Notes?p=148963"]);
    assert.equal($("#FeedbackMsg").next().attr("id"), "privateNotes");
    assert.equal(box().find("b").text(), "aggressive");
    assert.equal(box().find("br").length, 1);
    assert.equal(dom.window.notesPageScriptRan, undefined, "the notes page's scripts never run");
    assert.equal(box().find("script").length, 0);
});

test("says so when there is no note for this player", () => {
    assert.equal(setup(notesPage("  ")).box().text(), "You don't have any Private Notes.");
    assert.equal(setup("<html><body><h1>Private Notes</h1></body></html>").box().text(), "You don't have any Private Notes.");
});

test("a failed request is shown and logged instead of loading forever", () => {
    const { box, logs } = setup("", { fail: true });
    assert.equal(box().text(), "Couldn't load your private notes.");
    assert.ok(logs.some((entry) => entry.includes("Error loading private notes")));
});

test("does nothing on a profile without a notes link", () => {
    const { $, requests } = setup(notesPage("x"), { html: `<div class="container"><span id="FeedbackMsg"></span></div>` });
    assert.equal($("#privateNotes").length, 0);
    assert.deepEqual(requests, []);
});

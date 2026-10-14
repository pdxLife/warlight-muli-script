const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors war.app's /ManageBlockList page (names and ids are invented).
const entry = (id, name) => `<li id="ListItem_${id}"> (<a href="#" onclick="RemoveClicked(this); return false;" id="RemoveLink_${id}">remove</a>)&nbsp;&nbsp;&nbsp;<a href="Profile?p=${id}">${name}</a> </li>`;

function setup(entries = [entry(1, "a"), entry(2, "b"), entry(3, "c")]) {
    const { dom, $ } = createDom(`<div id="AutoContainer"><h1>Manage Block List</h1><p>Your "block list" is ...</p><ul>${entries.join("")}</ul></div>`);
    const ctx = load(["setupBlacklistCounter"], domGlobals(dom, $));
    ctx.setupBlacklistCounter();
    const count = () => Number($("#numBlacklisted b").text());
    return { $, count };
}

test("shows the initial number of blocked players once, above the list", () => {
    const { $, count } = setup();
    assert.equal($("#numBlacklisted").length, 1);
    assert.equal($("#numBlacklisted").next().is("ul"), true);
    assert.equal(count(), 3);
});

test("updates when players are hidden, added or removed", async () => {
    const { $, count } = setup();

    $("li[id^=ListItem_]").first().hide();
    await flush();
    assert.equal(count(), 2);

    $("#AutoContainer ul").append(entry(4, "d"));
    await flush();
    assert.equal(count(), 3);

    $("li[id^=ListItem_]").last().remove();
    await flush();
    assert.equal(count(), 2);
});

test("adds nothing when the block list is empty", () => {
    const { $ } = setup([]);
    assert.equal($("#numBlacklisted").length, 0);
});

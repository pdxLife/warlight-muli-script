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

function setupWithSearch(entries) {
    const { dom, $ } = createDom(`<div id="AutoContainer"><h1>Manage Block List</h1><ul>${entries.join("")}</ul></div>`);
    const ctx = load(["setupBlacklistCounter", "setupBlockListSearch", "filterBlockList", "foldForSearch"], { ...domGlobals(dom, $), addCSS: () => { } });
    ctx.setupBlacklistCounter();
    ctx.setupBlockListSearch();
    const search = (text) => $("#BlockListSearchInput").val(text).trigger("input");
    const shownNames = () => Array.from($("li[id^=ListItem_]").filter(function () {
        return !$(this).hasClass("tuyd-filtered") && this.style.display !== "none";
    }).map(function () {
        return $(this).find("a[href*='Profile']").text();
    }).get());
    return { $, search, shownNames, count: () => Number($("#numBlacklisted b").text()) };
}

test("search filters the block list by name, ignoring case and accents", () => {
    const { $, search, shownNames } = setupWithSearch([entry(1, "Šaňa SK-CZ"), entry(2, "AK-47"), entry(3, "Alexander the Great"), entry(4, "sana")]);
    assert.equal($("#BlockListSearch").next().is("ul"), true);
    search("SANA");
    assert.deepEqual(shownNames(), ["Šaňa SK-CZ", "sana"]);
    assert.equal($("#BlockListSearchCount").text(), "2 matching");
    search("remove");
    assert.deepEqual(shownNames(), [], "the (remove) link text is not searched");
    search("");
    assert.equal(shownNames().length, 4);
    assert.equal($("#BlockListSearchCount").text(), "");
});

test("searching doesn't change the block list count, removing a player does", async () => {
    const { $, search, count } = setupWithSearch([entry(1, "Ace"), entry(2, "Advait"), entry(3, "Bob")]);
    search("ad");
    await flush();
    assert.equal(count(), 3);
    $("#ListItem_2").hide();
    await flush();
    assert.equal(count(), 2);
    search("ad");
    assert.equal($("#BlockListSearchCount").text(), "0 matching", "removed players aren't counted as matches");
});

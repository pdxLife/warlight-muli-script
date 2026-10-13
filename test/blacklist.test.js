const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

function setup() {
    const { dom, $ } = createDom(`<div id="MainSiteContent"><ul><li>a</li><li>b</li><li>c</li></ul></div>`);
    const ctx = load(["setupBlacklistCounter"], domGlobals(dom, $));
    ctx.setupBlacklistCounter();
    const count = () => Number($("#numBlacklisted b").text());
    return { $, count };
}

test("shows the initial number of blacklisted players once", () => {
    const { $, count } = setup();
    assert.equal($("#numBlacklisted").length, 1);
    assert.equal(count(), 3);
});

test("updates when players are hidden, added or removed", async () => {
    const { $, count } = setup();

    $("#MainSiteContent li").first().hide();
    await flush();
    assert.equal(count(), 2);

    $("#MainSiteContent ul").append("<li>d</li>");
    await flush();
    assert.equal(count(), 3);

    $("#MainSiteContent li").last().remove();
    await flush();
    assert.equal(count(), 2);
});

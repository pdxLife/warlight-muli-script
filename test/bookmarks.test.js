const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./harness");

test("a bookmark dropped between two others gets an order between theirs", () => {
    const ctx = load(["bookmarkOrderBetween"]);
    assert.equal(ctx.bookmarkOrderBetween(1, 2), 1.5);
    assert.equal(ctx.bookmarkOrderBetween(null, 2), 1, "to the top: half the first one's");
    assert.equal(ctx.bookmarkOrderBetween(5, null), 6, "to the bottom: one more than the last");
    assert.equal(ctx.bookmarkOrderBetween(null, null), 1, "the only bookmark");
    assert.ok(ctx.bookmarkOrderBetween(null, 0.0001) > 0, "never 0, which the right-click menu treats as no bookmark");
});

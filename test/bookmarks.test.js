const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./harness");

test("a bookmark dropped between two others gets an order between theirs", () => {
    const ctx = load(["bookmarkOrderBetween"]);
    assert.equal(ctx.bookmarkOrderBetween(1, 2), 1.5);
    assert.equal(ctx.bookmarkOrderBetween(null, 2), 1, "to the top: half the first one's");
    assert.equal(ctx.bookmarkOrderBetween(5, null), 6, "to the bottom: one more than the last");
    assert.equal(ctx.bookmarkOrderBetween(null, null), 1, "the only bookmark");
    assert.equal(ctx.bookmarkOrderBetween(null, 0), -1, "above a bookmark with order 0, the first one saved");
});

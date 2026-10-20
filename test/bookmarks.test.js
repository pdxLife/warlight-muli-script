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

test("a bookmark moved one place gets an order between its new neighbours", () => {
    const ctx = load(["bookmarkStepOrder", "bookmarkOrderBetween"]);
    const bookmarks = [{ id: 7, order: 10 }, { id: 3, order: 0 }, { id: 9, order: 5 }];
    assert.equal(ctx.bookmarkStepOrder(bookmarks, 9, -1), -1, "to the top, above order 0");
    assert.equal(ctx.bookmarkStepOrder(bookmarks, 7, -1), 2.5, "between 0 and 5");
    assert.equal(ctx.bookmarkStepOrder(bookmarks, 3, 1), 7.5, "between 5 and 10");
    assert.equal(ctx.bookmarkStepOrder(bookmarks, 9, 1), 11, "to the bottom");
    assert.equal(ctx.bookmarkStepOrder(bookmarks, 3, -1), null, "already first");
    assert.equal(ctx.bookmarkStepOrder(bookmarks, 7, 1), null, "already last");
    assert.equal(ctx.bookmarkStepOrder(bookmarks, 42, 1), null, "unknown bookmark");
    assert.deepEqual(bookmarks.map((b) => b.order), [10, 0, 5], "the list itself is left alone");
});

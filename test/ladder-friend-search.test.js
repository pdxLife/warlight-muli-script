const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./harness");

test("a friend row reads as name, level and whether the ladder is locked for them", () => {
    const ctx = load(["ladderFriendFromRow"]);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.ladderFriendFromRow("Select  L64 Swisster "))), { name: "Swisster", level: 64, locked: false });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.ladderFriendFromRow("Locked L40 goodluck"))), { name: "goodluck", level: 40, locked: true });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.ladderFriendFromRow("Select L59 A slice of pie"))), { name: "A slice of pie", level: 59, locked: false });
    assert.equal(ctx.ladderFriendFromRow("Friends 1 - 40 of 98"), null);
});

test("matches come best first, as in Player Search, and an empty search finds nothing", () => {
    const ctx = load(["ladderFriendMatches", "playerSearchMatch"]);
    const friends = [
        { name: "Swisster", level: 64, page: 1 }, { name: "Wini", level: 64, page: 1 }, { name: "A slice of pie", level: 59, page: 3 },
        { name: "pip", level: 62, page: 1 }, { name: "Pie Eater", level: 20, page: 2 }
    ];
    assert.deepEqual(Array.from(ctx.ladderFriendMatches(friends, "pie").map((f) => f.name)), ["Pie Eater", "A slice of pie"], "a name starting with the search comes first");
    assert.deepEqual(Array.from(ctx.ladderFriendMatches(friends, "WINI").map((f) => f.page)), [1]);
    assert.deepEqual(Array.from(ctx.ladderFriendMatches(friends, "  ")), []);
});

test("war.app's pager says which friends are shown and how many there are", () => {
    const ctx = load(["ladderFriendsPagerState"]);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.ladderFriendsPagerState("Friends 81 - 98 of 98<< Prev123"))), { first: 81, last: 98, total: 98 });
    assert.equal(ctx.ladderFriendsPagerState(""), null);
});

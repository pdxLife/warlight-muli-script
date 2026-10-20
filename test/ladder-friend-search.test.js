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

// A GetFriends answer laid out as war.app sends it (October 2026): per friend, some ids and their clan,
// a date ending in 0x42, the level, the name with its length, then another date or -MaxValue.
// The names are invented.
function friendsAnswer(friends) {
    const hex = (bytes) => bytes.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const int = (n) => [n & 255, n >> 8 & 255, n >> 16 & 255, n >> 24 & 255];
    const text = (s) => { const b = Array.from(Buffer.from(s, "utf8")); return [1, b.length, ...b]; };
    const date = [0x00, 0x60, 0x69, 0xAD, 0xD1, 0x9D, 0x68, 0x42];
    const none = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xEF, 0xFF];
    let bytes = [0xF2, 0x80, 0x39, 0xF1, 0x47, 0x5A, 0x04, 0x00, ...int(friends.length)];
    friends.forEach((f, i) => {
        bytes = bytes.concat(int(150000 + i), [1], int(33), ...(f.clan ? [text(f.clan)] : [[0]]), int(31), [1, 1, 1, 0], date, int(f.level), text(f.name), f.seen === false ? none : date, int(8670), [0x0B, 0, 0, 1]);
    });
    return hex(bytes);
}

test("war.app's friend list answer gives every friend's name and level, in war.app's order", () => {
    const ctx = load(["parseFriendsList"], { TextDecoder });
    const answer = friendsAnswer([
        { name: "Alpha", level: 64, clan: "Some Clan" }, { name: "Bravo Two", level: 57 }, { name: "Çharlie ☆", level: 3, seen: false },
        { name: "(deleted)", level: 59 }, { name: "Echo", level: 100, clan: "Echo Clan" }
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.parseFriendsList(answer))), [
        { name: "Alpha", level: 64 }, { name: "Bravo Two", level: 57 }, { name: "Çharlie ☆", level: 3 }, { name: "(deleted)", level: 59 }, { name: "Echo", level: 100 }
    ], "clan names and other text in the answer aren't taken for friends");
    assert.deepEqual(Array.from(ctx.parseFriendsList("not hex")), []);
    assert.deepEqual(Array.from(ctx.parseFriendsList("")), []);
});

test("a proposal's friends leave out you and anyone already in it, 40 to a page", () => {
    const ctx = load(["ladderFriendsFromList"], { LADDER_FRIENDS_PER_PAGE: 40 });
    const list = Array.from({ length: 85 }, (_, i) => ({ name: "F" + i, level: 50 }));
    list.splice(10, 0, { name: "Me", level: 61 });
    const friends = Array.from(ctx.ladderFriendsFromList(list, "Me", ["F3"]));
    assert.equal(friends.length, 84);
    assert.equal(friends.find((f) => f.name === "F0").page, 1);
    assert.equal(friends.find((f) => f.name === "F40").page, 1, "F3 and you are left out, so F40 moves up to page 1");
    assert.equal(friends.find((f) => f.name === "F41").page, 2);
    assert.equal(friends.find((f) => f.name === "F84").page, 3);
});

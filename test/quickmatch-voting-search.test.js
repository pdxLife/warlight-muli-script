const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./harness");

const plain = (value) => JSON.parse(JSON.stringify(value));

test("a Quickmatch Voting row reads as name, rank, votes and your votes", () => {
    const ctx = load(["quickmatchVotingTemplate"]);
    assert.deepEqual(plain(ctx.quickmatchVotingTemplate(" Four Castles  FFA Commerce ", "Rank: 3 (fixed)  ")),
        { name: "Four Castles FFA Commerce", rank: 3, fixed: true, votes: null, yourVotes: 0 });
    assert.deepEqual(plain(ctx.quickmatchVotingTemplate("duel lotto 1.0", "Rank: 26  57 votes")),
        { name: "duel lotto 1.0", rank: 26, fixed: false, votes: 57, yourVotes: 0 });
    assert.deepEqual(plain(ctx.quickmatchVotingTemplate("French Brawl", "35 votes\nYour votes: 3")),
        { name: "French Brawl", rank: null, fixed: false, votes: 35, yourVotes: 3 });
    assert.deepEqual(plain(ctx.quickmatchVotingTemplate("New one", "1 vote")).votes, 1);
    assert.equal(ctx.quickmatchVotingTemplate("  ", "Rank: 1"), null);
});

test("the info line of a match says rank, votes and your votes", () => {
    const ctx = load(["quickmatchVotingInfo"]);
    assert.equal(ctx.quickmatchVotingInfo({ rank: 3, fixed: true, votes: null, yourVotes: 0 }), "Rank 3 (fixed)");
    assert.equal(ctx.quickmatchVotingInfo({ rank: 26, fixed: false, votes: 57, yourVotes: 2 }), "Rank 26 · 57 votes · your votes: 2");
    assert.equal(ctx.quickmatchVotingInfo({ rank: null, fixed: false, votes: 1, yourVotes: 0 }), "1 vote");
});

test("the search matches every word in a template's name, in any order, and keeps war.app's order", () => {
    const ctx = load(["quickmatchVotingMatches"]);
    const templates = [
        { name: "Small Earth 1v1 Auto Dist", page: 1 },
        { name: "Four Castles FFA Commerce", page: 1 },
        { name: "Volcano Island 1v1", page: 4 },
        { name: "Commerce FFA Europe", page: 9 }
    ];
    const names = (query) => Array.from(ctx.quickmatchVotingMatches(templates, query).map((t) => t.name));
    assert.deepEqual(names("1V1"), ["Small Earth 1v1 Auto Dist", "Volcano Island 1v1"]);
    assert.deepEqual(names("ffa  commerce"), ["Four Castles FFA Commerce", "Commerce FFA Europe"]);
    assert.deepEqual(names("commerce europe"), ["Commerce FFA Europe"]);
    assert.deepEqual(names("2v2"), []);
    assert.deepEqual(names("   "), []);
});

test("war.app's Quickmatch Voting pager says which templates are shown and on which page", () => {
    const ctx = load(["ladderFriendsPagerState", "ujsPageOf"]);
    const state = ctx.ladderFriendsPagerState("Templates 26 - 50 of 238");
    assert.deepEqual(plain(state), { first: 26, last: 50, total: 238 });
    assert.equal(ctx.ujsPageOf(state, 25), 2);
    assert.equal(ctx.ujsPageOf(ctx.ladderFriendsPagerState("Templates 226 - 238 of 238"), 25), 10);
    assert.equal(ctx.ujsPageOf(null, 25), 1);
});

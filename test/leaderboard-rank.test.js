const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const FUNCTIONS = ["parseQuickmatchLeaderboard", "leaderboardRequestBody", "parseYourRating", "findLeaderboardRank", "leaderboardRankText", "watchQuickmatchLeaderboardRequests"];
const ctx = load(FUNCTIONS, { TextDecoder, Uint8Array, Float64Array, Number, Promise, log: () => { } });

const hexOf = (bytes) => Buffer.from(bytes).toString("hex").toUpperCase();
const int = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return [...b]; };
const text = (s) => { const b = Buffer.from(s, "utf8"); return [1, b.length, ...b]; };
const double = (x) => { const b = Buffer.alloc(8); b.writeDoubleLE(x); return [...b]; };

// Encodes rows the way war.app's GetQuickmatchLeaderboards answers (names and numbers are invented).
function leaderboardHex(rows, total) {
    const bytes = [0xF2, 0x80, 0x39, 0xF1, 0x47, 0x5A, ...int(5), 1, ...int(rows.length)];
    for (const row of rows) {
        bytes.push(1, 1);
        if (row.clan) bytes.push(1, ...int(7), ...int(9), ...text(row.clan)); else bytes.push(0);
        bytes.push(1, ...int(3), 0, ...int(row.level || 60), ...text(row.name), ...int(1), ...int(2), ...int(row.number || 1), ...int(4), ...double(row.rating));
    }
    return hexOf([...bytes, ...int(total)]);
}

test("reads names, numbers and ratings from war.app's leaderboard answer", () => {
    const hex = leaderboardHex([
        { name: "Alpha", number: 3, rating: 3001.2137, clan: "Twelve" },
        { name: "René Ü", rating: 2991.01 },
        { name: "Gamma • apex", rating: 1500.56, clan: "Myth Busters" }
    ], 190968);
    const result = JSON.parse(JSON.stringify(ctx.parseQuickmatchLeaderboard(hex)));
    assert.equal(result.total, 190968);
    assert.deepEqual(result.rows.map((row) => [row.name, row.number, Math.round(row.rating * 100) / 100]), [["Alpha", 3, 3001.21], ["René Ü", 1, 2991.01], ["Gamma • apex", 1, 1500.56]]);
    assert.equal(ctx.parseQuickmatchLeaderboard("not hex"), null);
    assert.equal(ctx.parseQuickmatchLeaderboard(hex.slice(0, -10)), null, "a cut-off answer reads as nothing rather than as wrong rows");
});

test("patches the offset and count at the end of war.app's request", () => {
    const template = "F20039F1475A0400000011" + "0106476C6F62616C" + "32000000" + "32000000";
    assert.equal(ctx.leaderboardRequestBody(template, 1050, 50), "F20039F1475A0400000011" + "0106476C6F62616C" + "1A040000" + "32000000");
});

test("reads your rating from war.app's label", () => {
    assert.equal(ctx.parseYourRating("Your rating: 1,309.8"), 1309.8);
    assert.equal(ctx.parseYourRating("Your rating: 175.3"), 175.3);
    assert.equal(ctx.parseYourRating("Quickmatch"), null);
});

function ladder(ratings, names = []) {
    const rows = ratings.map((rating, i) => ({ name: names[i] || "P" + i, rating }));
    const requests = [];
    const fetchPage = (offset, count) => {
        requests.push(offset);
        return Promise.resolve({ total: rows.length, rows: rows.slice(offset, offset + count) });
    };
    return { fetchPage, requests };
}

test("finds your rank with a binary search over the pages", async () => {
    const ratings = Array.from({ length: 1000 }, (v, i) => 3000 - i * 2.5);
    const names = [];
    names[733] = "Me";
    const { fetchPage, requests } = ladder(ratings, names);
    const result = JSON.parse(JSON.stringify(await ctx.findLeaderboardRank(fetchPage, Math.round(ratings[733] * 10) / 10, "Me", 50)));
    assert.deepEqual(result, { rank: 734, total: 1000, exact: true });
    assert.ok(requests.length <= 6, `${requests.length} requests`);
    assert.equal(ctx.leaderboardRankText(result), "Rank #734 of 1,000");
});

test("counts players above your rating when your name isn't on the page", async () => {
    const { fetchPage } = ladder([2000, 1900, 1800.04, 1800.01, 1800, 1700]);
    const result = JSON.parse(JSON.stringify(await ctx.findLeaderboardRank(fetchPage, 1800, "Me", 2)));
    assert.deepEqual(result, { rank: 3, total: 6, exact: false }, "ratings shown as 1,800.0 tie");
    assert.equal(ctx.leaderboardRankText(result), "Rank ≈ #3 of 6");
});

test("handles the first page, the last page and an unreadable page", async () => {
    assert.equal((await ctx.findLeaderboardRank(ladder([2000, 1900, 1800], ["A", "Me"]).fetchPage, 1900, "Me", 50)).rank, 2);
    assert.equal((await ctx.findLeaderboardRank(ladder([2000, 1900, 1800, 100], ["A", "B", "C", "Me"]).fetchPage, 100, "Me", 2)).rank, 4);
    assert.equal(await ctx.findLeaderboardRank(() => Promise.resolve(null), 100, "Me", 50), null);
    assert.equal(ctx.leaderboardRankText(null), "");
});

test("sees war.app's own leaderboard requests and lets them through", () => {
    const seen = [];
    const sent = [];
    class FakeXhr {
        open(method, url) { this.url = url; }
        send(body) { sent.push(body); }
    }
    const sandbox = load(["watchQuickmatchLeaderboardRequests"], { XMLHttpRequest: FakeXhr, log: () => { } });
    sandbox.watchQuickmatchLeaderboardRequests((url, body) => seen.push([url, body]));
    const leaderboard = new FakeXhr();
    leaderboard.open("POST", "https://war.app/Services?m=GetQuickmatchLeaderboards&js=1");
    leaderboard.send("ABCD");
    const other = new FakeXhr();
    other.open("POST", "https://war.app/Services?m=GameRefresh&js=1");
    other.send("EF01");
    assert.deepEqual(seen, [["https://war.app/Services?m=GetQuickmatchLeaderboards&js=1", "ABCD"]]);
    assert.deepEqual(sent, ["ABCD", "EF01"]);
});

test("recognizes the Quickmatch page", () => {
    const at = (url) => load(["pageIsQuickmatch"], { location: { href: url } });
    assert.ok(at("https://war.app/MultiPlayer?Quickmatch=1").pageIsQuickmatch());
    assert.ok(at("https://war.app/MultiPlayer/?Quickmatch=1").pageIsQuickmatch());
    assert.ok(!at("https://war.app/MultiPlayer?GameID=1").pageIsQuickmatch());
});

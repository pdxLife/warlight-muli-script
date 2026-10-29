const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { source, createDom, load, domGlobals, flush } = require("./harness");

const EPOCH = Date.UTC(2000, 0, 1);
const DAY = 86400000;
const plain = (value) => JSON.parse(JSON.stringify(value));

// Writes war.app's Clan War answers the way ujs.js reads them (names and ids are invented).
function writer() {
    const bytes = [];
    const w = {
        byte(b) { bytes.push(b & 255); return w; },
        bool(v) { return w.byte(v ? 1 : 0); },
        short(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); bytes.push(...b); return w; },
        int(n) { const b = Buffer.alloc(4); b.writeInt32LE(n); bytes.push(...b); return w; },
        double(x) { const b = Buffer.alloc(8); b.writeDoubleLE(x); bytes.push(...b); return w; },
        date(ms) { return w.double(ms - EPOCH); },
        text(s) {
            if (s === null) return w.bool(false);
            w.bool(true);
            const b = Buffer.from(s, "utf8");
            let n = b.length;
            while (n >= 128) { bytes.push((n & 127) | 128); n >>= 7; }
            bytes.push(n, ...b);
            return w;
        },
        optionalInt(n) { return n === null ? w.bool(false) : w.bool(true).int(n); },
        items(list, write) { w.bool(true).int(list.length); list.forEach((item) => write(w.bool(true), item)); return w; },
        map(entries, write) { w.bool(true).int(entries.length); entries.forEach(([key, value]) => write(w.int(key), value)); return w; },
        hex() { return Buffer.from(bytes).toString("hex").toUpperCase(); }
    };
    return w;
}

function answer(op, body) {
    const w = writer().short(242 | 0x8000).int(1514664249).int(7).int(op).byte(0).byte(0).bool(true);
    body(w);
    return w.hex();
}

const writeClan = (w, c) => w.int(0).int(0).date(EPOCH).int(c.icon || 0).int(c.id).bool(false).bool(false).text(c.name).bool(false).int(0).text(null);
const writeStanding = (w, s) => w.int(s.clan).int(88).bool(false).int(0).int(s.participantsToday || 0).double(s.pointsToday).int(s.winsToday || 0).double(0)
    .optionalInt(s.rank === undefined ? null : s.rank).bool(false).text(null).double(s.pointsBefore);
const writeSeason = (w, s) => (s.finished === null ? w.date(s.started).int(0).bool(false) : w.date(s.started).int(0).bool(true).date(s.finished)).int(s.id).date(EPOCH).text(JSON.stringify(s.settings)).bool(false).int(0);
const writePlayer = (w, p) => {
    if (p.clan) w.bool(true).int(p.clan).int(0).text(p.clanName); else w.bool(false);
    return w.bool(false).bool(false).int(0).text(p.name).int(0).int(0).int(0);
};
const writePlayers = (w, players) => w.map(Object.entries(players).map(([id, p]) => [Number(id), p]), (w, p) => writePlayer(w.bool(true), p));
const writeGame = (w, g) => w.optionalInt(g.gameId).int(1).text(JSON.stringify(g.sides)).optionalInt(g.day).int(0).int(g.template).int(0).optionalInt(g.winner);

const SEASON = {
    id: 88, started: Date.UTC(2026, 9, 16), finished: null,
    settings: { MapID: 28543, PointsPerTerritory: [3, 5, 7], MinutesBetweenTimeslots: 240, MinutesTimeslotsTakeToStart: 10, Rewards: [{ RankMin: 1, RankMax: 1, Type: "FreeCoins", Value: 9000 }] }
};

function parsers() {
    return load(["hexBytes", "binaryReader", "readServiceReply", "readClanWarParts", "parseClanWarReply", "parseClanWarGamesReply", "parseClanWarMapReply", "parseMapDetailsSummary"],
        { TextDecoder, Uint8Array, DataView });
}

test("parseClanWarReply reads the standings, clan names, timeslot times and season settings", () => {
    const hex = answer(305, (w) => {
        w.bool(false);
        w.items([{ clan: 33, pointsToday: 1.5, pointsBefore: 13.5, winsToday: 2, participantsToday: 3 }, { clan: 7, pointsToday: 0, pointsBefore: 40, rank: 1 }], writeStanding);
        w.items([{ id: 33, name: "Turtles" }, { id: 7, name: "Ünïcode ✓" }], writeClan);
        w.date(Date.UTC(2026, 9, 16)).date(Date.UTC(2026, 9, 29, 10, 29));
        w.items([], () => { }).items([], () => { });
        writeSeason(w.bool(true), SEASON);
    });
    const war = plain(parsers().parseClanWarReply(hex));
    assert.equal(war.timeslot, null);
    assert.deepEqual(war.standings.map((s) => [s.clan, s.points, s.pointsToday, s.winsToday, s.participantsToday, s.rank]), [[33, 15, 1.5, 2, 3, null], [7, 40, 0, 0, 0, 1]]);
    assert.deepEqual(war.clans.map((c) => [c.id, c.name]), [[33, "Turtles"], [7, "Ünïcode ✓"]]);
    assert.equal(war.firstTimeslot, Date.UTC(2026, 9, 16));
    assert.equal(war.now, Date.UTC(2026, 9, 29, 10, 29));
    assert.deepEqual(war.season, SEASON);
});

test("parseClanWarGamesReply reads each game's sides, day and winner, the players with their clans and the template names", () => {
    const hex = answer(308, (w) => {
        w.items([{ clan: 33 }], (w) => w.int(33).int(88).int(12).text(null).int(3).int(40).int(2).double(1.6).double(0));
        w.items([
            { gameId: 501, day: null, template: 9, winner: 33, sides: { 33: { Num: 57, Players: [11] }, 7: { Num: 30, Players: [22] } } },
            { gameId: null, day: 4, template: 9, winner: 33, sides: { 33: { Num: 57, Players: [12] } } },
            { gameId: 502, day: null, template: 10, winner: null, sides: { 33: { Num: 57, Players: [13] }, 7: { Num: 30, Players: [23] } } }
        ], writeGame);
        writePlayers(w, { 11: { name: "Ann", clan: 33, clanName: "Turtles" }, 22: { name: "Bob", clan: 7, clanName: "Hares" } });
        w.map([[9, "Small Earth"], [10, "Biomes"]], (w, name) => w.text(name));
        w.int(35);
    });
    const games = plain(parsers().parseClanWarGamesReply(hex));
    assert.equal(games.total, 35);
    assert.deepEqual(games.days, [{ clan: 33, day: 12, wins: 2, points: 1.6 }]);
    assert.deepEqual(games.games, [
        { gameId: 501, day: null, template: 9, winner: 33, clans: [{ clan: 7, players: [22] }, { clan: 33, players: [11] }] },
        { gameId: null, day: 4, template: 9, winner: 33, clans: [{ clan: 33, players: [12] }] },
        { gameId: 502, day: null, template: 10, winner: null, clans: [{ clan: 7, players: [23] }, { clan: 33, players: [13] }] }
    ]);
    assert.deepEqual(games.players, { 11: { name: "Ann", clan: 33, clanName: "Turtles" }, 22: { name: "Bob", clan: 7, clanName: "Hares" } });
    assert.deepEqual(games.templates, { 9: "Small Earth", 10: "Biomes" });
});

test("parseClanWarMapReply reads which clan took each territory and when", () => {
    const hex = answer(306, (w) => {
        w.items([{ id: 33, name: "Turtles" }], writeClan);
        w.items([], () => { });
        writePlayers(w, {});
        w.items([{ clan: 33, at: Date.UTC(2026, 9, 28), territory: 14 }, { clan: 7, at: Date.UTC(2026, 9, 29), territory: 3 }],
            (w, t) => w.int(t.clan).int(88).date(t.at).text(null).int(t.territory));
        w.bool(false);
    });
    const map = plain(parsers().parseClanWarMapReply(hex));
    assert.deepEqual(map.territories, [{ clan: 33, at: Date.UTC(2026, 9, 28), territory: 14 }, { clan: 7, at: Date.UTC(2026, 9, 29), territory: 3 }]);
    assert.equal(map.season, null);
});

test("parseMapDetailsSummary reads the map's id and territory count past its bonuses and distributions", () => {
    const hex = answer(73, (w) => {
        w.map([[1, null]], (w) => w.bool(true).int(5).bool(true).int(2).byte(9).byte(9).int(3).text("Bonus").bool(true).int(1).int(4));
        w.date(EPOCH).int(0);
        w.map([[1, 0], [2, 1]], (w, type) => {
            w.bool(true).byte(type);
            if (type === 0) w.bool(false);
            else w.bool(true).int(1).short(4).text("North").bool(true).int(1).int(4).short(1);
            w.text("Distribution").int(0).text(null);
        });
        w.bool(false).int(0).int(28543).date(EPOCH).bool(false).byte(0).bool(true).int(236);
    });
    const { parseMapDetailsSummary } = parsers();
    assert.deepEqual(plain(parseMapDetailsSummary(hex)), { id: 28543, territories: 236 });
    assert.deepEqual(plain(parseMapDetailsSummary(hex + "0000")), { id: 28543, territories: 236 });
});

test("the Clan War parsers return null for an error, another answer, a cut-off answer or extra bytes", () => {
    const { parseClanWarMapReply } = parsers();
    const good = answer(306, (w) => w.items([], () => { }).items([], () => { }).bool(false).items([], () => { }).bool(false));
    assert.deepEqual(plain(parseClanWarMapReply(good)), { clans: [], territories: [], season: null });
    assert.equal(parseClanWarMapReply(good.slice(0, -2)), null);
    assert.equal(parseClanWarMapReply(good + "00"), null);
    assert.equal(parseClanWarMapReply(good.replace(/^(.{20})32010000/, "$133010000")), null);
    assert.equal(parseClanWarMapReply(writer().short(242 | 0x8000).int(1514664249).int(7).int(306).byte(0).byte(5).bool(false).hex()), null);
    assert.equal(parseClanWarMapReply("not hex"), null);
});

const le = (n) => { const b = Buffer.alloc(4); b.writeInt32LE(n); return b.toString("hex").toUpperCase(); };
const EXTRAS = "00" + "0105" + "3234322E30" + le(1) + le(2) + "0000000000000040" + "0000000000000840" + le(3);
const ACCOUNT = "01" + le(5) + "01" + "0E" + Buffer.from("me@example.com").toString("hex").toUpperCase();
const request = (op, args) => "F200" + "39F1475A" + le(4) + le(op) + EXTRAS + ACCOUNT + args;

test("serviceRequestParts finds war.app's account part before each Clan War request's arguments", () => {
    const ctx = load(["serviceRequestParts", "serviceRequest", "hexBytes", "littleEndianHex", "binaryReader"], { TextDecoder, Uint8Array, DataView });
    vm.runInContext(source.match(/^var CLAN_WAR_ARGUMENT_BYTES = \{[\s\S]*?^\};/m)[0], ctx);
    const { serviceRequestParts, serviceRequest } = ctx;
    const expected = { head: "F20039F1475A" + le(4), extras: EXTRAS, account: ACCOUNT };
    assert.deepEqual(plain(serviceRequestParts(request(305, "00"))), expected);
    assert.deepEqual(plain(serviceRequestParts(request(305, "01" + le(88)).toLowerCase())), expected);
    assert.deepEqual(plain(serviceRequestParts(request(306, le(88)))), expected);
    assert.deepEqual(plain(serviceRequestParts(request(308, le(1) + "00" + le(0) + le(25)))), expected);
    assert.deepEqual(plain(serviceRequestParts(request(308, le(88) + "01" + le(33) + le(0) + le(2147483647)))), expected);
    assert.equal(serviceRequestParts(request(73, le(1))), null);
    assert.equal(serviceRequestParts(request(305, "00").replace("39F1475A", "39F1475B")), null);
    assert.equal(serviceRequestParts(request(305, "00").replace(ACCOUNT, "00")), null);
    assert.equal(serviceRequestParts(null), null);
    assert.equal(serviceRequest(expected, 308, "AB", true), "F20039F1475A" + le(4) + le(308) + EXTRAS + ACCOUNT + "AB");
    assert.equal(serviceRequest(expected, 73, "AB", false), "F20039F1475A" + le(4) + le(73) + EXTRAS + "AB");
});

function helpers(extra = [], globals = {}) {
    return load(["clanWarRanking", "clanWarTerritoryCount", "clanWarRewardText", "clanWarRewards", "clanWarPlaces", "getRankText", "findYourClanWarClan", "clanWarResult",
        "clanWarSide", "clanWarOpponents", "clanWarNextTimeslot", "clanWarOpenTimeslot", "clanWarDuration", "utcMidnight", "utcDay", "clanWarProgress", "clanWarPlayerStats",
        "clanWarPlayerNote", "clanWarResultText", "clanWarRecords", "clanWarRecordText", "clanWarTemplateNote", "clanWarCountdownText", ...extra], {
        DAY_MS: DAY,
        CLAN_WAR_REWARD_TEXTS: { FreeCoins: "# coins", UncommonArtifact: "# uncommon artifact", EveryPower: "# of every Idle power", APBoost: "AP received from levels increased by %" },
        ...globals
    });
}

test("clanWarTerritoryCount counts territories bought with the season's rising costs, repeating the last one", () => {
    const { clanWarTerritoryCount } = helpers();
    const costs = [3, 5, 7, 9, 10, 15];
    assert.deepEqual(plain(clanWarTerritoryCount(0, costs)), { count: 0, next: 3 });
    assert.deepEqual(plain(clanWarTerritoryCount(14.8, costs)), { count: 2, next: 15 });
    assert.deepEqual(plain(clanWarTerritoryCount(15, costs)), { count: 3, next: 24 });
    assert.deepEqual(plain(clanWarTerritoryCount(80, costs)), { count: 8, next: 94 });
    assert.deepEqual(plain(clanWarTerritoryCount(80, [])), { count: 0, next: null });
    assert.deepEqual(plain(clanWarTerritoryCount(80, undefined)), { count: 0, next: null });
});

test("clanWarRewards groups rank rewards by places and sorts win rewards, in war.app's wording", () => {
    const { clanWarRewards, clanWarPlaces } = helpers();
    const rewards = plain(clanWarRewards({
        Rewards: [
            { NumWins: 5, Type: "APBoost", Value: 0.15, Duration: 21 },
            { RankMin: 3, RankMax: 5, Type: "FreeCoins", Value: 4000 },
            { NumWins: 2, Type: "UncommonArtifact", Value: 2 },
            { RankMin: 3, RankMax: 5, Type: "UncommonArtifact", Value: 1 },
            { RankMin: 1, RankMax: 1, Type: "EveryPower", Value: 3 },
            { RankMin: 2, RankMax: 2, Type: "SomethingNew", Value: 1 },
            null
        ]
    }));
    assert.deepEqual(rewards, {
        rank: [
            { min: 1, max: 1, texts: ["3 of every Idle power"] },
            { min: 2, max: 2, texts: ["SomethingNew"] },
            { min: 3, max: 5, texts: ["4000 coins", "1 uncommon artifact"] }
        ],
        wins: [{ wins: 2, text: "2 uncommon artifacts" }, { wins: 5, text: "AP received from levels increased by 15% for three weeks" }]
    });
    assert.deepEqual(plain(clanWarRewards({})), { rank: [], wins: [] });
    assert.equal(clanWarPlaces(1, 1), "1st");
    assert.equal(clanWarPlaces(10, 20), "10th–20th");
});

test("findYourClanWarClan matches war.app's points line to one clan, using the clans shown when points tie", () => {
    const { findYourClanWarClan } = helpers();
    const standings = [
        { clan: 33, points: 14.85, pointsToday: 1.6, pointsBefore: 13.25 },
        { clan: 40, points: 14.85, pointsToday: 1.6, pointsBefore: 13.25 },
        { clan: 7, points: 40, pointsToday: 0, pointsBefore: 40 }
    ];
    const label = "Your clan has earned 14.8 points (1.6 estimated today plus 13.3 from previous days)";
    assert.equal(findYourClanWarClan(standings, label, [7, 33]), 33);
    assert.equal(findYourClanWarClan(standings, label, []), null);
    assert.equal(findYourClanWarClan(standings, "Your clan has earned 40 points (0 estimated today plus 40 from previous days)", []), 7);
    assert.equal(findYourClanWarClan(standings, "You are not in a clan", [7]), null);
});

test("Clan War timeslot times: the next one, whether one is open, and how long until", () => {
    const { clanWarNextTimeslot, clanWarOpenTimeslot, clanWarDuration } = helpers();
    const first = Date.UTC(2026, 9, 16);
    assert.equal(clanWarNextTimeslot(first, 240, Date.UTC(2026, 9, 29, 10, 29)), Date.UTC(2026, 9, 29, 12));
    assert.equal(clanWarNextTimeslot(first, 240, Date.UTC(2026, 9, 29, 12)), Date.UTC(2026, 9, 29, 12));
    assert.equal(clanWarNextTimeslot(first, 0, Date.UTC(2026, 9, 29, 12)), null);
    assert.deepEqual(plain(clanWarOpenTimeslot(first, 240, 10, Date.UTC(2026, 9, 29, 12, 4))), { started: Date.UTC(2026, 9, 29, 12), closes: Date.UTC(2026, 9, 29, 12, 10) });
    assert.equal(clanWarOpenTimeslot(first, 240, 10, Date.UTC(2026, 9, 29, 12, 10)), null);
    assert.equal(clanWarDuration(90 * 60000 + 20000), "1 h 30 min");
    assert.equal(clanWarDuration(2 * 3600000), "2 h");
    assert.equal(clanWarDuration(5 * 60000), "5 min");
    assert.equal(clanWarDuration(10000), "less than a minute");
    assert.equal(clanWarDuration(-5000), "less than a minute");
});

const NOW = Date.UTC(2026, 9, 29, 10, 29);
const WAR = {
    timeslot: null,
    firstTimeslot: Date.UTC(2026, 9, 16),
    now: NOW,
    season: {
        id: 88, started: Date.UTC(2026, 9, 16, 3), finished: null,
        settings: {
            PointsPerTerritory: [3, 5, 7], MinutesBetweenTimeslots: 240, MinutesTimeslotsTakeToStart: 10,
            Rewards: [
                { RankMin: 1, RankMax: 1, Type: "FreeCoins", Value: 9000 },
                { RankMin: 2, RankMax: 3, Type: "FreeCoins", Value: 4000 },
                { NumWins: 2, Type: "UncommonArtifact", Value: 1 },
                { NumWins: 5, Type: "FreeCoins", Value: 100 }
            ]
        }
    },
    standings: [
        { clan: 7, points: 40, pointsToday: 0, pointsBefore: 40, winsToday: 0, rank: null },
        { clan: 33, points: 14.8, pointsToday: 1.6, pointsBefore: 13.2, winsToday: 2, rank: null },
        { clan: 9, points: 20, pointsToday: 2, pointsBefore: 18, winsToday: 1, rank: null },
        { clan: 5, points: 9.5, pointsToday: 0, pointsBefore: 9.5, winsToday: 0, rank: null }
    ],
    clans: [{ id: 7, name: "Hares" }, { id: 33, name: "Turtles" }, { id: 9, name: "Owls" }]
};
const GAMES = {
    games: [
        { gameId: 1, day: null, template: 9, winner: 33, clans: [{ clan: 33, players: [11] }, { clan: 7, players: [22] }] },
        { gameId: 2, day: null, template: 10, winner: 9, clans: [{ clan: 33, players: [12] }, { clan: 9, players: [23] }] },
        { gameId: null, day: null, template: 9, winner: 33, clans: [{ clan: 33, players: [13] }] },
        { gameId: 4, day: 3, template: 9, winner: 33, clans: [{ clan: 33, players: [11] }, { clan: 9, players: [24] }] },
        { gameId: 5, day: null, template: 10, winner: null, clans: [{ clan: 33, players: [14] }, { clan: 7, players: [25] }] }
    ],
    players: { 11: { name: "Ann", clan: 33, clanName: "Turtles" }, 12: { name: "Cid", clan: 33, clanName: "Turtles" }, 22: { name: "Bob", clan: 7, clanName: "Hares" }, 24: { name: "Dee", clan: 9, clanName: "Owls" } },
    templates: { 9: "Small Earth", 10: "Biomes" }
};

test("clanWarProgress works out your clan's place, rewards, wins, territories, season end and today's games", () => {
    const { clanWarProgress } = helpers();
    const map = { territories: [
        { clan: 33, at: Date.UTC(2026, 9, 20) }, { clan: 33, at: Date.UTC(2026, 9, 26) },
        { clan: 7, at: Date.UTC(2026, 9, 28) }, { clan: 7, at: Date.UTC(2026, 9, 29) }, { clan: 9, at: Date.UTC(2026, 9, 29) }
    ] };
    const p = plain(clanWarProgress({ war: WAR, clan: 33, playerId: "11", games: GAMES, map, mapTerritories: 17 }));
    assert.deepEqual(p, {
        season: 88, finished: null, clan: 33, clanName: "Turtles", place: 3, clans: 4, points: 14.8, pointsToday: 1.6,
        bracket: { places: "2nd–3rd", texts: ["4000 coins"], belowPlace: 4, lead: 14.8 - 9.5 },
        better: { places: "1st", texts: ["9000 coins"], place: 1, gap: 40 - 14.8 },
        wins: { total: 3, today: 2, next: { wins: 5, text: "100 coins" }, count: 2 },
        today: [{ id: 11, name: "Ann", result: "won" }, { id: 12, name: "Cid", result: "lost" }, { id: 13, name: "13", result: "free" }, { id: 14, name: "14", result: "playing" }],
        you: { result: "won", template: "Small Earth", opponents: ["Hares"] },
        territories: { held: 2, byTonight: 0, nextAt: 15, toGo: 15 - 14.8 },
        seasonEnd: { left: 12, total: 17, pace: 1, days: 3, daysLeft: 12, ends: Date.UTC(2026, 10, 10) },
        timeslot: { open: false, next: Date.UTC(2026, 9, 29, 12) }
    });
});

test("clanWarProgress manages without games or the map, and leaves the forecast and timeslot out once the season is over", () => {
    const { clanWarProgress } = helpers();
    const bare = plain(clanWarProgress({ war: WAR, clan: 33, playerId: null, games: null, map: null, mapTerritories: null }));
    assert.equal(bare.wins, undefined);
    assert.equal(bare.you, undefined);
    assert.equal(bare.seasonEnd, undefined);
    assert.deepEqual(bare.territories, { held: 2, byTonight: 0, nextAt: 15, toGo: 15 - 14.8 });
    const finished = { ...WAR, season: { ...WAR.season, finished: NOW }, standings: WAR.standings.map((s, i) => ({ ...s, rank: [1, 3, 2, 4][i] })) };
    const done = plain(clanWarProgress({ war: finished, clan: 33, playerId: 99, games: GAMES, map: { territories: [] }, mapTerritories: 17 }));
    assert.equal(done.place, 3);
    assert.equal(done.timeslot, undefined);
    assert.equal(done.seasonEnd, undefined);
    assert.deepEqual(done.you, { result: null });
    const open = { ...WAR, timeslot: { info: { started: false, starts: NOW + 300000 } } };
    assert.deepEqual(plain(clanWarProgress({ war: open, clan: 33 })).timeslot, { open: true, closes: NOW + 300000 });
    assert.equal(clanWarProgress({ war: WAR, clan: 404 }), null);
});

test("clanWarPlayerStats and clanWarPlayerNote give each player's win rate and today's result", () => {
    const { clanWarPlayerStats, clanWarPlayerNote } = helpers();
    const stats = plain(clanWarPlayerStats(GAMES, 33));
    assert.deepEqual(stats, {
        11: { wins: 2, finished: 2, today: "won" },
        12: { wins: 0, finished: 1, today: "lost" },
        13: { wins: 1, finished: 1, today: "free" },
        14: { wins: 0, finished: 0, today: "playing" }
    });
    assert.deepEqual(plain(clanWarPlayerNote(stats[11])), ["100% won", "today: won"]);
    assert.deepEqual(plain(clanWarPlayerNote({ wins: 1, finished: 3, today: null })), ["33% won"]);
    assert.deepEqual(plain(clanWarPlayerNote(stats[14])), ["today: playing"]);
    assert.deepEqual(plain(clanWarPlayerNote(undefined)), []);
});

test("clanWarRecords counts played games by template, for you and the clan, and by opponent, leaving out free wins", () => {
    const { clanWarRecords, clanWarRecordText, clanWarTemplateNote } = helpers();
    const records = plain(clanWarRecords(GAMES, 33, 11));
    assert.deepEqual(records.templates, [
        { name: "Small Earth", won: 2, lost: 0, you: { won: 2, lost: 0 } },
        { name: "Biomes", won: 0, lost: 1, you: { won: 0, lost: 0 } }
    ]);
    assert.deepEqual(records.opponents, [
        { name: "Owls", won: 1, lost: 1 },
        { name: "Hares", won: 1, lost: 0 }
    ]);
    assert.equal(clanWarRecordText({ won: 2, lost: 1 }), "2–1 (67%)");
    assert.equal(clanWarRecordText({ won: 0, lost: 0 }), "0–0");
    assert.equal(clanWarTemplateNote(records.templates[0]), "This season: you 2–0, clan 2–0");
    assert.equal(clanWarTemplateNote(records.templates[1]), "This season: you haven't played it, clan 0–1");
    assert.equal(clanWarTemplateNote(undefined), "This season: no games yet");
    const unnamed = plain(clanWarRecords({ ...GAMES, players: {}, templates: {} }, 33, null));
    assert.deepEqual(unnamed.opponents.map((o) => o.name), ["Clan 9", "Clan 7"]);
    assert.deepEqual(unnamed.templates.map((t) => t.name), ["Template 9", "Template 10"]);
});

test("clanWarCountdownText counts down to the next timeslot, says when one is open, and when you've played today", () => {
    const { clanWarCountdownText } = helpers();
    const schedule = { season: 88, clan: 33, first: Date.UTC(2026, 9, 16), minutes: 240, join: 10, finished: false, playedOn: null };
    assert.equal(clanWarCountdownText(schedule, NOW), "Clan War in 1 h 31 min");
    assert.equal(clanWarCountdownText(schedule, Date.UTC(2026, 9, 29, 12, 4)), "Clan War: timeslot open for 6 min");
    assert.equal(clanWarCountdownText({ ...schedule, playedOn: "2026-10-29" }, NOW), "Clan War: played today ✓");
    assert.equal(clanWarCountdownText({ ...schedule, playedOn: "2026-10-28" }, NOW), "Clan War in 1 h 31 min");
    assert.equal(clanWarCountdownText({ ...schedule, finished: true }, NOW), "");
    assert.equal(clanWarCountdownText({ ...schedule, clan: null }, NOW), "");
    assert.equal(clanWarCountdownText(null, NOW), "");
});

test("renderClanWarProgress writes the box with a live countdown to the next timeslot", () => {
    const { clanWarProgress, renderClanWarProgress } = helpers(["renderClanWarProgress", "htmlEscape"]);
    const { $ } = createDom();
    const p = clanWarProgress({ war: WAR, clan: 33, playerId: 99, games: GAMES, map: null, mapTerritories: null });
    const box = $(renderClanWarProgress(p, NOW));
    assert.equal(box.attr("id"), "tuydClanWarProgress");
    assert.equal(box.find("h3").text(), "Your clan in Season 88");
    const lines = box.find(".tuydCwLine").map((i, el) => $(el).text()).get();
    assert.deepEqual(lines, [
        "Turtles: 3rd of 4 with 14.8 points (1.6 today)",
        "Rank rewards for 2nd–3rd: 4000 coins. 4th is 5.3 points behind.",
        "Next up, 1st: 9000 coins. 25.2 points short of 1st.",
        "3 wins this season (2 today). Next win reward at 5: 100 coins (2 more)",
        "2 territories on the map. Next at 15.0 points (0.2 more).",
        "You haven't played today. Next timeslot in 1 h 31 min.",
        "Today: Ann won · Cid lost · 13 free win · 14 playing (4 played, 2 won)"
    ]);
    assert.equal(Number(box.find(".tuydCwCountdown").attr("data-at")), Date.UTC(2026, 9, 29, 12));
});

test("setupClanWarCountdown puts the countdown next to My Games and drops it when there's nothing to count down to", async () => {
    const { dom, $ } = createDom('<h2>My Games <span id="NumberOfMyGamesLabel">(7)</span></h2>');
    let schedule = { season: 88, clan: 33, first: Date.UTC(2026, 9, 16), minutes: 240, join: 10, finished: false, playedOn: null };
    const intervals = [];
    const ctx = helpers(["setupClanWarCountdown", "addClanWarStyles", "addCommunityLaddersStyles"], {
        ...domGlobals(dom, $),
        Date: class extends Date { static now() { return NOW; } },
        readClanWarSchedule: () => schedule,
        addCSS: () => { },
        setInterval: (fn) => intervals.push(fn)
    });
    ctx.setupClanWarCountdown();
    assert.equal($("#NumberOfMyGamesLabel").next("#tuydClanWarCountdown").text(), "Clan War in 1 h 31 min");
    assert.equal($("#tuydClanWarCountdown").attr("href"), "/Clans/War");
    schedule = { ...schedule, playedOn: "2026-10-29" };
    $(dom.window.document).trigger("tuyd:gamesRefreshed");
    assert.equal($("#tuydClanWarCountdown").text(), "Clan War: played today ✓");
    schedule = null;
    intervals[0]();
    assert.equal($("#tuydClanWarCountdown").length, 0);
});

test("setupClanWarPlayers adds each player's win rate and today's result to war.app's player rows", async () => {
    const row = (n, p) => `<div id="ujs_hamburger${n}"><a href="/Profile?p=${p}">Player</a></div>`;
    const { dom, $ } = createDom(`<div id="ujs_ClanWarPlayersScene">${row("", "991112")}${row("_2", "991202")}${row("_3", "999902")}</div>`, "https://war.app/Clans/War?ID=88&PlayersFromClan=33");
    const asked = [];
    const ctx = helpers(["setupClanWarPlayers", "clanWarUrlNumber", "ujsElement", "gamePlayerId", "extractPlayerId", "addClanWarStyles"], {
        ...domGlobals(dom, $),
        location: dom.window.location,
        fetchClanWarGames: (season, clan) => { asked.push([season, clan]); return Promise.resolve(GAMES); },
        addCSS: () => { },
        addCommunityLaddersStyles: () => { },
        log: () => { }
    });
    ctx.setupClanWarPlayers();
    await flush();
    await flush();
    assert.deepEqual(asked, [[88, 33]]);
    const notes = () => $(".tuydCwPlayerNote").map((i, el) => $(el).parent().attr("id") + ": " + $(el).children().map((j, line) => $(line).text()).get().join(" / ")).get();
    assert.deepEqual(notes(), ["ujs_hamburger: 100% won / today: won", "ujs_hamburger_2: 0% won / today: lost"]);
    $("#ujs_ClanWarPlayersScene").append(row("_4", "991302"));
    await flush();
    assert.deepEqual(notes().slice(-1), ["ujs_hamburger_4: 100% won / today: free win"]);
    assert.deepEqual(asked, [[88, 33]]);
});

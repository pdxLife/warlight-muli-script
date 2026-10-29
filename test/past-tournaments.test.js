const { test } = require("node:test");
const assert = require("node:assert/strict");
const { source, createDom, load, domGlobals, flush } = require("./harness");

// Writes war.app's GetMyTournaments answers the way ujs.js reads them (names and ids are invented).
function writer() {
    const bytes = [];
    const w = {
        byte(b) { bytes.push(b & 255); return w; },
        bool(v) { return w.byte(v ? 1 : 0); },
        short(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); bytes.push(...b); return w; },
        int(n) { const b = Buffer.alloc(4); b.writeInt32LE(n); bytes.push(...b); return w; },
        double(x) { const b = Buffer.alloc(8); b.writeDoubleLE(x); bytes.push(...b); return w; },
        text(s) {
            if (s === null) return w.bool(false);
            w.bool(true);
            const b = Buffer.from(s, "utf8");
            let n = b.length;
            while (n >= 128) { bytes.push((n & 127) | 128); n >>= 7; }
            bytes.push(n, ...b);
            return w;
        },
        hex() { return Buffer.from(bytes).toString("hex").toUpperCase(); }
    };
    return w;
}

const DAY = 86400000;

function tournament(id, extra = {}) {
    return {
        id, name: "Tournament " + id, creator: "Ann", clan: null, type: 0, joined: 8, rounds: 3, teamSize: 1, teamsPerGame: 2,
        boot: 3 * DAY, realTime: false, fee: null, prizes: [], state: 2, me: 1, unread: false, starts: 9000 * DAY, settings: false, ...extra
    };
}

function writeTournament(w, t) {
    w.double(0).bool(t.unread);
    if (t.fee === null) w.bool(false);
    else {
        w.bool(true).int(0).int(t.fee).bool(false).bool(true).int(t.prizes.length);
        t.prizes.forEach(([place, coins]) => w.int(place).int(coins));
        w.bool(true).short(3);
    }
    w.bool(false);
    if (t.creator === null) w.bool(false);
    else {
        w.bool(true);
        if (t.clan) w.bool(true).int(1).int(2).text(t.clan); else w.bool(false);
        w.bool(true).int(5).bool(false).int(0).text(t.creator).int(0).int(0).int(0);
    }
    w.double(t.boot).byte(1).bool(false).int(1748).int(3).text(t.name).int(t.joined).int(t.rounds);
    if (t.me === null) w.bool(false); else w.bool(true).int(t.me);
    w.bool(t.realTime);
    if (t.starts === null) w.bool(false); else w.bool(true).double(t.starts);
    if (t.settings) {
        w.bool(true).bool(true).double(1).bool(true).int(0).text("x").bool(false).bool(false).bool(true).int(2).double(0.7).bool(false).int(0).bool(false).bool(false)
            .double(0).bool(false).double(0).int(5).byte(1).bool(false).bool(false).int(0).double(0.6).bool(false).bool(true).byte(1);
    } else w.bool(false);
    w.byte(t.state).int(t.teamSize);
    if (t.teamsPerGame === null) w.bool(false); else w.bool(true).int(t.teamsPerGame);
    w.int(t.id).byte(t.type);
}

function reply(total, tournaments, { extras = false, open = null } = {}) {
    const w = writer().short(242 | 0x8000).int(1514664249).int(4).int(88);
    if (extras) {
        w.byte(1).bool(true).int(1).int(3).text("x").bool(true).int(5).text("abc")
            .bool(true).text("a").text("b").int(1).bool(true).text("s").int(1).double(2).text("t").text("u").int(3)
            .bool(true).int(1).int(2).bool(true).int(1).text("z")
            .bool(true).bool(true).double(1).bool(false);
    } else w.byte(0);
    w.byte(0).bool(true).int(total);
    if (open) {
        w.bool(true).int(open.length);
        open.forEach((t) => writeTournament(w.bool(true), t));
    } else w.bool(false);
    w.double(8.9e11).bool(true).int(tournaments.length);
    tournaments.forEach((t) => writeTournament(w.bool(true), t));
    return w.hex();
}

const le = (n) => { const b = Buffer.alloc(4); b.writeInt32LE(n); return b.toString("hex").toUpperCase(); };
const TEMPLATE = "F200" + "39F1475A" + le(12) + "58000000" + "0A0B0C0D0E0F" + "01" + le(0) + le(30) + le(0) + le(30);
const requestArgs = (body) => ({ filter: Buffer.from(body.slice(-32, -24), "hex").readInt32LE(), count: Buffer.from(body.slice(-24, -16), "hex").readInt32LE(), sort: Buffer.from(body.slice(-16, -8), "hex").readInt32LE(), offset: Buffer.from(body.slice(-8), "hex").readInt32LE() });

function parse(hex) {
    const { parseMyTournamentsReply } = load(["parseMyTournamentsReply"], { TextDecoder, Uint8Array, DataView });
    return JSON.parse(JSON.stringify(parseMyTournamentsReply(hex)));
}

test("parseMyTournamentsReply reads the total and each tournament, past war.app's extras and the game settings", () => {
    const page = parse(reply(1638, [
        tournament(9101, { name: "93rd Titled Tuesday - RCO", creator: "Ann", clan: "Clan X", fee: 50, prizes: [[2, 215], [1, 500]], unread: true, settings: true }),
        tournament(9100, { name: "Round of friends", type: 2, joined: 5, rounds: 1, me: 2, realTime: true, boot: 5 * 60000, creator: null, state: 1, starts: null }),
        tournament(9099, { name: "Teams", teamSize: 2, teamsPerGame: null, rounds: 2, me: null, state: 0 })
    ], { extras: true }));
    assert.equal(page.total, 1638);
    assert.deepEqual(page.tournaments, [
        { id: 9101, name: "93rd Titled Tuesday - RCO", creator: "Ann", clan: "Clan X", type: 0, players: 8, teamSize: 1, boot: 3 * DAY, realTime: false, fee: 50, prizes: [[1, 500], [2, 215]], state: 2, me: 1, unread: true, starts: 9000 * DAY },
        { id: 9100, name: "Round of friends", creator: "", clan: "", type: 2, players: 5, teamSize: 1, boot: 300000, realTime: true, fee: null, prizes: [], state: 1, me: 2, unread: false, starts: null },
        { id: 9099, name: "Teams", creator: "Ann", clan: "", type: 0, players: 8, teamSize: 2, boot: 3 * DAY, realTime: false, fee: null, prizes: [], state: 0, me: null, unread: false, starts: 9000 * DAY }
    ]);
});

test("parseMyTournamentsReply returns null for an error, another answer, a cut-off answer or extra bytes", () => {
    const good = reply(1, [tournament(5)]);
    assert.equal(parse(good).tournaments.length, 1);
    assert.equal(parse(good.slice(0, -10)), null);
    assert.equal(parse(good + "00"), null);
    assert.equal(parse(good.replace(/^(.{20})58000000/, "$159000000")), null);
    assert.equal(parse(writer().short(242 | 0x8000).int(1514664249).int(4).int(88).byte(0).byte(5).bool(false).hex()), null);
    assert.equal(parse("not hex"), null);
    assert.equal(parse(""), null);
});

test("myTournamentsRequest asks for another part of the list in war.app's own request, and refuses anything else", () => {
    const { myTournamentsRequest } = load(["myTournamentsRequest"]);
    const body = myTournamentsRequest(TEMPLATE.toLowerCase(), 0, 4000, 2000);
    assert.equal(body.slice(0, -34), TEMPLATE.slice(0, -34));
    assert.deepEqual(requestArgs(body), { filter: 0, count: 2000, sort: 0, offset: 4000 });
    assert.equal(myTournamentsRequest(TEMPLATE.replace("58000000", "59000000"), 0, 0, 30), null);
    assert.equal(myTournamentsRequest(TEMPLATE.replace("39F1475A", "39F1475B"), 0, 0, 30), null);
    assert.equal(myTournamentsRequest(TEMPLATE.slice(0, -34) + "00" + TEMPLATE.slice(-32), 0, 0, 30), null);
    assert.equal(myTournamentsRequest("F200", 0, 0, 30), null);
    assert.equal(myTournamentsRequest(null, 0, 0, 30), null);
});

// war.app's list, newest first, answered `count` at a time from `offset`.
function server(list) {
    const calls = [];
    const fetchPage = (offset, count) => {
        calls.push([offset, count]);
        return Promise.resolve({ total: list.length, tournaments: list.slice(offset, offset + count).map((t) => ({ ...t })) });
    };
    return { calls, fetchPage };
}

function reader() {
    const saves = [];
    const { readPastTournaments } = load(["readPastTournaments"], { Promise, PAST_TOURNAMENTS_CHUNK: 2000 });
    const read = (stored, fetchPage, chunk) => readPastTournaments(stored, fetchPage, (value) => saves.push(JSON.parse(JSON.stringify(value))), chunk)
        .then((value) => JSON.parse(JSON.stringify(value)));
    return { read, saves };
}

const ids = (value) => value.tournaments.map((t) => t.id);

test("readPastTournaments reads the whole list in chunks, saving after each one", async () => {
    const { calls, fetchPage } = server([5, 4, 3, 2, 1].map((id) => ({ id, state: 2 })));
    const { read, saves } = reader();
    const value = await read(null, fetchPage, 2);
    assert.deepEqual(calls, [[0, 2], [2, 2], [4, 2]]);
    assert.deepEqual(saves.map((s) => [s.complete, s.next, s.tournaments.length]), [[false, 2, 2], [false, 4, 4], [true, 0, 5]]);
    assert.deepEqual(ids(value), [5, 4, 3, 2, 1]);
    assert.equal(value.total, 5);
});

test("readPastTournaments goes on from where an earlier read stopped, then picks up tournaments added since", async () => {
    const { calls, fetchPage } = server([6, 5, 4, 3, 2, 1].map((id) => ({ id, state: 2 })));
    const { read } = reader();
    const value = await read({ complete: false, next: 2, total: 5, tournaments: [{ id: 5, state: 2 }, { id: 4, state: 2 }] }, fetchPage, 2);
    assert.deepEqual(calls, [[2, 2], [4, 2], [0, 100]]);
    assert.deepEqual(ids(value), [6, 5, 4, 3, 2, 1]);
    assert.equal(value.complete, true);
});

test("once complete, readPastTournaments reads down to the oldest running tournament, updating it and dropping deleted ones", async () => {
    const list = [];
    for (let id = 300; id >= 151; id--) {
        if (id !== 295) list.push({ id, state: 2, name: "new " + id });
    }
    const storedList = [];
    for (let id = 298; id >= 152; id--) storedList.push({ id, state: id === 290 ? 1 : 2, name: "old " + id });
    storedList.push({ id: 100, state: 2, name: "old 100" });
    const { calls, fetchPage } = server(list);
    const { read, saves } = reader();
    const value = await read({ complete: true, next: 0, total: 148, tournaments: storedList }, fetchPage);
    assert.deepEqual(calls, [[0, 100]], "300 down to 200 covers the newest stored (298) and the running one (290)");
    const byId = Object.fromEntries(value.tournaments.map((t) => [t.id, t]));
    assert.ok(byId[300] && byId[299], "new tournaments are added");
    assert.equal(byId[295], undefined, "a tournament war.app no longer lists is dropped");
    assert.equal(byId[290].state, 2, "the running tournament has its new state");
    assert.equal(byId[199].name, "old 199", "older tournaments aren't read again");
    assert.ok(byId[100], "tournaments below what was read are kept");
    assert.equal(value.total, 149);
    assert.equal(saves.length, 1);
});

test("readPastTournaments stops on a failed request, keeping the chunks read before it", async () => {
    const { read, saves } = reader();
    let n = 0;
    const fetchPage = (offset, count) => ++n === 2 ? Promise.reject(new Error("down")) : Promise.resolve({ total: 6, tournaments: [{ id: 6 - offset }, { id: 5 - offset }].slice(0, count) });
    await assert.rejects(read(null, fetchPage, 2), /down/);
    assert.deepEqual(saves.map((s) => [s.complete, s.next, s.tournaments.length]), [[false, 2, 2]]);
});

test("pastTournamentSeries groups tournaments by the start of their names", () => {
    const { pastTournamentSeries } = load(["pastTournamentSeries"]);
    const names = ["93rd Titled Tuesday - RCO", "94th Titled Tuesday - Guiroma", "{95th} Titled Tuesday: Biomes", "Rise of Rome 1 v 1 - Week 4", "Rise of Rome 1v1 - Week 5", "Rise of Rome 1v1: finals",
        "WGL Season 3", "WGL S4 finals", "WGL qualifiers", "The big one", "The small one", "The third one", "rt fun", "rt more", "rt again", "Lonely name"];
    const series = pastTournamentSeries(names.map((name, i) => ({ id: i + 1, name })));
    assert.deepEqual(Object.values(series), ["Titled Tuesday", "Titled Tuesday", "Titled Tuesday", "Rise of Rome 1v1", "Rise of Rome 1v1", "Rise of Rome 1v1", "WGL", "WGL", "WGL", "", "", "", "", "", "", ""]);
});

test("normalizePastTournamentsFilter keeps known values only, and pastTournamentMatches applies each filter", () => {
    const { normalizePastTournamentsFilter, pastTournamentMatches } = load(["normalizePastTournamentsFilter", "pastTournamentMatches", "pastTournamentDate"]);
    const normal = normalizePastTournamentsFilter({ type: "nope", minPlayers: "-3", maxPlayers: "16", from: "2024-13", to: "2024-12-31", unread: "yes", query: 5 });
    assert.deepEqual(JSON.parse(JSON.stringify(normal)), { query: "", series: "", creator: "", type: "", teams: "", minPlayers: 0, maxPlayers: 16, speed: "", coins: "", you: "", state: "", unread: false, from: "", to: "2024-12-31", reversed: false });
    const day = (date) => Date.parse(date) - Date.UTC(2000, 0, 1);
    const list = [
        { id: 1, name: "Titled Tuesday 1", creator: "Ann", clan: "Clan X", type: 0, players: 16, teamSize: 1, realTime: true, fee: 50, prizes: [[1, 500]], state: 2, me: 1, unread: true, starts: day("2024-05-01") },
        { id: 2, name: "Friends RR", creator: "Bob", clan: "", type: 2, players: 5, teamSize: 1, realTime: false, fee: null, prizes: [], state: 1, me: 2, unread: false, starts: day("2025-01-02") },
        { id: 3, name: "Team cup", creator: "Ann", clan: "", type: 1, players: 32, teamSize: 2, realTime: false, fee: 0, prizes: [], state: 0, me: 0, unread: false, starts: null }
    ];
    const series = { 1: "Titled Tuesday", 2: "", 3: "" };
    const match = (filter) => list.filter((t) => pastTournamentMatches(t, normalizePastTournamentsFilter(filter), series)).map((t) => t.id);
    assert.deepEqual(match({}), [1, 2, 3]);
    assert.deepEqual(match({ query: "clan x" }), [1]);
    assert.deepEqual(match({ query: "BOB" }), [2]);
    assert.deepEqual(match({ series: "Titled Tuesday" }), [1]);
    assert.deepEqual(match({ creator: "Ann" }), [1, 3]);
    assert.deepEqual(match({ type: "roundRobin" }), [2]);
    assert.deepEqual(match({ type: "double" }), [3]);
    assert.deepEqual(match({ teams: "teams" }), [3]);
    assert.deepEqual(match({ teams: "solo" }), [1, 2]);
    assert.deepEqual(match({ minPlayers: 10, maxPlayers: 20 }), [1]);
    assert.deepEqual(match({ speed: "realTime" }), [1]);
    assert.deepEqual(match({ speed: "multiDay" }), [2, 3]);
    assert.deepEqual(match({ coins: "free" }), [2, 3]);
    assert.deepEqual(match({ coins: "fee" }), [1]);
    assert.deepEqual(match({ coins: "prize" }), [1]);
    assert.deepEqual(match({ you: "joined" }), [1]);
    assert.deepEqual(match({ you: "declined" }), [2]);
    assert.deepEqual(match({ you: "unanswered" }), [3]);
    assert.deepEqual(match({ you: "notDeclined" }), [1, 3]);
    assert.deepEqual(match({ state: "running" }), [2]);
    assert.deepEqual(match({ state: "open" }), [3]);
    assert.deepEqual(match({ unread: true }), [1]);
    assert.deepEqual(match({ from: "2024-06-01" }), [2], "a tournament with no start date doesn't match a date range");
    assert.deepEqual(match({ to: "2024-05-01" }), [1]);
});

test("a tournament's kind, coins, boot time and start date read as text", () => {
    const ctx = load(["pastTournamentKindText", "pastTournamentCoinsText", "pastTournamentBootText", "pastTournamentDate"]);
    assert.equal(ctx.pastTournamentKindText({ type: 0, players: 16, teamSize: 1 }), "16-player single elimination");
    assert.equal(ctx.pastTournamentKindText({ type: 1, players: 32, teamSize: 2 }), "32-player double elimination, teams of 2");
    assert.equal(ctx.pastTournamentKindText({ type: 2, players: 5, teamSize: 1 }), "Round robin, 5 players");
    assert.equal(ctx.pastTournamentCoinsText({ fee: null, prizes: [] }), "");
    assert.equal(ctx.pastTournamentCoinsText({ fee: 0, prizes: [] }), "Free");
    assert.equal(ctx.pastTournamentCoinsText({ fee: 1500, prizes: [[1, 5000], [2, 215], [3, 10], [11, 1], [22, 1]] }), "Entry 1,500 · 1st 5,000 · 2nd 215 · 3rd 10 · 11th 1 · 22nd 1");
    assert.equal(ctx.pastTournamentBootText(5 * 60000), "5 minutes");
    assert.equal(ctx.pastTournamentBootText(60000), "1 minute");
    assert.equal(ctx.pastTournamentBootText(90 * 60000), "1.5 hours");
    assert.equal(ctx.pastTournamentBootText(3 * DAY), "3 days");
    assert.equal(ctx.pastTournamentDate({ starts: 0 }), "2000-01-01");
    assert.equal(ctx.pastTournamentDate({ starts: null }), "");
});

test("pastTournamentsCsv has a row for each tournament, with every column, and keeps names from becoming formulas", () => {
    const ctx = load(["pastTournamentsCsv", "csvCell", "pastTournamentBootText", "pastTournamentCoinsText", "pastTournamentDate"], {
        PAST_TOURNAMENTS_STATES: ["Open", "In progress", "Finished", "Cancelled"],
        PAST_TOURNAMENTS_YOU: ["Not answered", "Joined", "Declined"]
    });
    const csv = ctx.pastTournamentsCsv([
        { id: 9101, name: "93rd Titled Tuesday - RCO", creator: "Ann", clan: "Clan, X", type: 0, players: 16, teamSize: 1, boot: 5 * 60000, realTime: true, fee: 1500, prizes: [[1, 5000], [2, 215]], state: 2, me: 1, unread: true, starts: 0 },
        { id: 9100, name: "=HYPERLINK(\"x\")", creator: "", clan: "", type: 2, players: 5, teamSize: 2, boot: 3 * DAY, realTime: false, fee: null, prizes: [], state: 1, me: 2, unread: false, starts: null },
        { id: 9099, name: "Free one", creator: "Bob", clan: "", type: 1, players: 8, teamSize: 1, boot: 3 * DAY, realTime: false, fee: 0, prizes: [], state: 0, me: null, unread: false, starts: null }
    ], { 9101: "Titled Tuesday" }, "https://war.app");
    assert.ok(csv.endsWith("\r\n"));
    assert.deepEqual(csv.trim().split("\r\n"), [
        "Tournament ID,Tournament,Series,Creator,Clan,Kind,Players,Team size,Boot time,Real-time,Entry fee,Prizes,You,State,Start date,Unread chat,Link",
        '9101,93rd Titled Tuesday - RCO,Titled Tuesday,Ann,"Clan, X",Single elimination,16,1,5 minutes,Yes,1500,"1st 5,000; 2nd 215",Joined,Finished,2000-01-01,Yes,https://war.app/MultiPlayer/Tournament?ID=9101',
        `9100,"'=HYPERLINK(""x"")",,,,Round robin,5,2,3 days,No,,,Declined,In progress,,No,https://war.app/MultiPlayer/Tournament?ID=9100`,
        "9099,Free one,,Bob,,Double elimination,8,1,3 days,No,0,,,Open,,No,https://war.app/MultiPlayer/Tournament?ID=9099"
    ]);
});

const SCENE = `<div id="UjsCanvasHolder"><div id="ujs_PastTournamentsScene"><div id="ujs_MyTournamentsTopBar"><div id="ujs_FilterTournamentsBtn"></div></div></div></div>`;
const LIST = [
    tournament(9103, { name: "Titled Tuesday 3", me: 1 }),
    tournament(9102, { name: "Titled Tuesday 2", me: 2 }),
    tournament(9101, { name: "Titled Tuesday 1", me: 0, state: 1 })
];

function screen({ setting = false, record = null, template = null, list = LIST, html = SCENE, url = "https://war.app/MultiPlayer/Tournaments/Past" } = {}) {
    const { dom, $ } = createDom(html, url);
    const db = { updates: [], deletes: [], record };
    const Database = {
        Table: { Settings: "Settings", TournamentData: "TournamentData" },
        Row: { TournamentData: { Id: "tournamentId" } },
        update: (table, value) => { db.updates.push([table, JSON.parse(JSON.stringify(value))]); return Promise.resolve(); },
        delete: (table, key) => { db.deletes.push([table, key]); return Promise.resolve(); },
        readIndex: (table, index, key) => Promise.resolve(db.record && db.record.tournamentId === key ? db.record : undefined)
    };
    const requests = [];
    const downloads = [];
    const fetch = (url, options) => {
        requests.push({ url, ...requestArgs(options.body) });
        const args = requestArgs(options.body);
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(reply(list.length, list.slice(args.offset, args.offset + args.count))) });
    };
    const ctx = load(["setupPastTournamentsSearch", "pastTournamentsKey", "normalizePastTournamentsFilter", "pastTournamentSeries", "pastTournamentOptions", "pastTournamentMatches",
        "pastTournamentDate", "pastTournamentsListHtml", "pastTournamentKindText", "pastTournamentCoinsText", "pastTournamentBootText", "readPastTournaments", "fetchMyTournaments",
        "myTournamentsRequest", "parseMyTournamentsReply", "pastTournamentsCsv", "csvCell", "htmlEscape", "ujsElement", "shownUjsElement", "warappArt", "addCommunityLaddersStyles", "addTournamentButtonStyles", "formatCount"], {
        ...domGlobals(dom, $),
        window: dom.window,
        Database,
        fetch,
        location: { origin: "https://war.app" },
        downloadText: (name, text, type) => downloads.push({ name, text, type }),
        addCSS: () => { },
        log: () => { },
        Promise, TextDecoder, Uint8Array, DataView,
        setTimeout: (fn) => setTimeout(fn, 0),
        readSettingValue: (name, fallback, callback) => callback(name === "pastTournamentsSearch" ? setting : fallback),
        signedInPlayerId: () => $.Deferred().resolve("10712").promise(),
        lastMyTournamentsRequest: template,
        PAST_TOURNAMENTS_CHUNK: 2000,
        PAST_TOURNAMENTS_STATES: ["Open", "In progress", "Finished", "Cancelled"],
        PAST_TOURNAMENTS_YOU: ["Not answered", "Joined", "Declined"]
    });
    ctx.setupPastTournamentsSearch();
    const settle = async () => {
        for (let i = 0; i < 5; i++) {
            await flush();
            await new Promise((resolve) => setTimeout(resolve, 1));
        }
    };
    return { $, ctx, db, requests, downloads, settle };
}

test("with the setting off, Search offers to turn it on, and turning it on waits for war.app's request, then reads the list", async () => {
    const { $, ctx, db, requests, downloads, settle } = screen();
    await settle();
    assert.equal($("#ujs_MyTournamentsTopBar > .tuydPtOpen").text(), "Search");
    assert.deepEqual(db.deletes, [["TournamentData", "pastTournaments:10712"]], "a list left from before is deleted");
    $(".tuydPtOpen").trigger("click");
    assert.equal($("#tuydPtSearch").parent().attr("id"), "UjsCanvasHolder");
    assert.match($("#tuydPtSearch .tuydPtOffer").text(), /reads your whole list from war\.app/);
    $("#tuydPtSearch .tuydPtOn").trigger("click");
    assert.deepEqual(db.updates[0], ["Settings", { name: "pastTournamentsSearch", value: true }]);
    await settle();
    assert.equal(requests.length, 0);
    assert.match($("#tuydPtSearch .tuydPtStatus").text(), /^Waiting for war\.app's list/);

    ctx.lastMyTournamentsRequest = TEMPLATE;
    $(ctx.document).trigger("tuyd:myTournamentsRequest");
    await settle();
    assert.deepEqual(requests, [{ url: "/Services?m=GetMyTournaments&js=1", filter: 0, count: 2000, sort: 0, offset: 0 }]);
    const saved = db.updates.filter(([table]) => table === "TournamentData");
    assert.equal(saved.length, 1);
    assert.equal(saved[0][1].tournamentId, "pastTournaments:10712");
    assert.equal(saved[0][1].value.complete, true);
    assert.equal($("#tuydPtSearch .tuydPtStatus").text(), "3 tournaments · Rescan · Turn off");
    assert.equal($("#tuydPtSearch .tuydPtList tbody tr").length, 3);
    assert.equal($("#tuydPtSearch .tuydPtList a").first().attr("href"), "/MultiPlayer/Tournament?ID=9103");

    $("#tuydPtSearch [name=you]").val("declined").trigger("change");
    assert.equal($("#tuydPtSearch .tuydPtHead").first().text(), "1 of 3 tournaments CSV");
    assert.equal($("#tuydPtSearch .tuydPtList a").text(), "Titled Tuesday 2");
    $("#tuydPtSearch .tuydPtCsv").trigger("click");
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0].name, "past-tournaments.csv");
    assert.equal(downloads[0].type, "text/csv;charset=utf-8");
    assert.deepEqual(downloads[0].text.trim().split("\r\n").map((line) => line.split(",")[0]), ["Tournament ID", "9102"], "only the tournaments shown");
    $("#tuydPtSearch [name=you]").val("").trigger("change");
    $("#tuydPtSearch [name=reversed]").prop("checked", true).trigger("change");
    $("#tuydPtSearch .tuydPtCsv").trigger("click");
    assert.deepEqual(downloads[1].text.trim().split("\r\n").slice(1).map((line) => line.split(",")[0]), ["9101", "9102", "9103"], "in the order shown");
    $("#tuydPtSearch [name=query]").val("nothing like it").trigger("input");
    assert.equal($("#tuydPtSearch .tuydPtCsv").length, 0, "no CSV when nothing matches");

    $("#tuydPtSearch .tuydPtOff").trigger("click");
    assert.deepEqual(db.updates.at(-1), ["Settings", { name: "pastTournamentsSearch", value: false }]);
    assert.deepEqual(db.deletes.at(-1), ["TournamentData", "pastTournaments:10712"]);
    assert.equal($("#tuydPtSearch .tuydPtOffer").length, 1);
});

test("with the setting on, opening Past Tournaments goes on reading a list that isn't complete yet", async () => {
    const record = { tournamentId: "pastTournaments:10712", value: { complete: false, next: 1, total: 3, tournaments: [{ ...parse(reply(3, LIST.slice(0, 1))).tournaments[0] }] } };
    const { $, db, requests, settle } = screen({ setting: true, record, template: TEMPLATE });
    await settle();
    assert.deepEqual(requests.map((r) => [r.offset, r.count]), [[1, 2000], [0, 100]]);
    assert.equal(db.deletes.length, 0);
    const saved = db.updates.filter(([table]) => table === "TournamentData").at(-1)[1].value;
    assert.equal(saved.complete, true);
    assert.deepEqual(saved.tournaments.map((t) => t.id), [9103, 9102, 9101]);
    $(".tuydPtOpen").trigger("click");
    await settle();
    assert.equal($("#tuydPtSearch .tuydPtList tbody tr").length, 3);
    $(".tuydPtOpen").trigger("click");
    assert.equal($("#tuydPtSearch").length, 0, "Search closes the panel again");
});

test("the panel closes and the button goes when war.app leaves Past Tournaments", async () => {
    const { $, settle } = screen({ setting: true, template: TEMPLATE });
    await settle();
    $(".tuydPtOpen").trigger("click");
    assert.equal($("#tuydPtSearch").length, 1);
    $("#ujs_PastTournamentsScene").remove();
    await settle();
    assert.equal($("#tuydPtSearch").length, 0);
});

test("war.app's request is told apart from others, and the script's own requests use fetch so they aren't taken for it", () => {
    const { dom } = createDom();
    const sent = [];
    const XHR = function () { };
    XHR.prototype.open = function () { };
    XHR.prototype.send = function (body) { sent.push(body); };
    const events = [];
    dom.window.document.addEventListener("tuyd:myTournamentsRequest", () => events.push(1));
    const ctx = load(["watchMyTournamentsRequests"], { XMLHttpRequest: XHR, document: dom.window.document, Event: dom.window.Event, lastMyTournamentsRequest: null });
    ctx.watchMyTournamentsRequests();
    const other = new XHR();
    other.open("POST", "/Services?m=GetMyGames&js=1");
    other.send("AA");
    assert.equal(ctx.lastMyTournamentsRequest, null);
    const mine = new XHR();
    mine.open("POST", "/Services?m=GetMyTournaments&js=1");
    mine.send(TEMPLATE);
    assert.equal(ctx.lastMyTournamentsRequest, TEMPLATE);
    assert.deepEqual(sent, ["AA", TEMPLATE]);
    assert.equal(events.length, 1);
});

test("turning off the feature also stops watching war.app's requests: both use the same name", () => {
    const name = source.match(/^var PAST_TOURNAMENTS_FEATURE = "([^"]+)";$/m)[1];
    assert.ok(source.includes(`{ name: "${name}", section: "Tournaments", match: pageHasUjsScenes, run: setupPastTournamentsSearch }`));
    assert.match(source, /if \(disabledFeatures\(\)\.indexOf\(PAST_TOURNAMENTS_FEATURE\) === -1\) \{\s+watchMyTournamentsRequests\(\);/);
});

test("parseMyTournamentsReply also returns the open tournaments the Tournaments page's answer carries", () => {
    const page = parse(reply(4, [tournament(9101)], { open: [tournament(9200, { name: "Open one", me: null, state: 0 }), tournament(9201, { teamSize: 3 })] }));
    assert.deepEqual(page.tournaments.map((t) => t.id), [9101]);
    assert.deepEqual(page.open.map((t) => [t.id, t.teamSize]), [[9200, 1], [9201, 3]]);
    assert.deepEqual(parse(reply(1, [tournament(5)])).open, []);
});

test("Not finished keeps open and running tournaments", () => {
    const { normalizePastTournamentsFilter, pastTournamentMatches } = load(["normalizePastTournamentsFilter", "pastTournamentMatches", "pastTournamentDate"]);
    const filter = normalizePastTournamentsFilter({ state: "notFinished" });
    assert.deepEqual([0, 1, 2, 3].filter((state) => pastTournamentMatches({ id: 1, name: "x", state, prizes: [] }, filter, {})), [0, 1]);
});

const TOURNAMENTS_SCENE = (cards = "") => `<div id="UjsCanvasHolder"><div id="ujs_TournamentsScene">
    <div id="ujs_MyTournaments"><div id="ujs_MyTournamentsTopBar"><div id="ujs_Spacer"></div></div><div id="ujs_MyTournamentsContainer"></div></div>
    <div id="ujs_OpenTournaments"><div id="ujs_OpenTournamentsTopBar"><div id="ujs_Spacer_2"></div></div><div id="ujs_OpenTournamentsContainer">${cards}</div></div>
</div></div>`;

test("on the Tournaments page, Search opens the panel on the tournaments not finished yet, reading only when it opens", async () => {
    const list = [tournament(9103, { state: 2 }), tournament(9102, { state: 1 }), tournament(9101, { state: 0 })];
    const record = { tournamentId: "pastTournaments:10712", value: { complete: true, next: 0, total: 3, checkedAt: 0, tournaments: parse(reply(3, list)).tournaments } };
    const { $, requests, settle } = screen({ setting: true, record, template: TEMPLATE, list, html: TOURNAMENTS_SCENE(), url: "https://war.app/MultiPlayer/Tournaments/" });
    await settle();
    assert.equal($("#ujs_MyTournamentsTopBar > .tuydPtOpen").text(), "Search");
    assert.equal(requests.length, 0, "nothing is read just for coming to the Tournaments page");
    $(".tuydPtOpen").trigger("click");
    await settle();
    assert.equal($("#tuydPtSearch [name=state]").val(), "notFinished");
    assert.deepEqual($("#tuydPtSearch .tuydPtList a").map((i, a) => $(a).attr("href").split("=")[1]).get(), ["9102", "9101"]);
    assert.deepEqual(requests.map((r) => [r.filter, r.offset, r.count]), [[0, 0, 100]]);
    $("#tuydPtSearch [name=query]").val("Tournament 9102").trigger("input");
    $(".tuydPtOpen").trigger("click");
    $(".tuydPtOpen").trigger("click");
    assert.equal($("#tuydPtSearch [name=query]").val(), "Tournament 9102", "a reopened panel shows the filters still in use");
    assert.equal($("#tuydPtSearch .tuydPtList tbody tr").length, 1);
});

// An Open Tournaments card as war.app draws it (names and ids are invented).
const CARD = (n, { id, name, by = "Ann", info = "16-player single elimination tournament. (5 spaces left)", coins = null, boot = "3 days", red = false, height = 104 }) => {
    const sfx = n > 1 ? "_" + n : "";
    return `<div id="ujs_TournamentInfoControl${sfx}" style="left: 3px; bottom: 0px;"><div id="ujs_TournamentInfoControl${sfx}_img" style="width: 600px; height: ${height}px;"></div>`
        + `<a id="ujs_TournamentInfoControl${sfx}_btn" href="/MultiPlayer/Tournament?ID=${id}"></a>`
        + `<div id="ujs_MapThumbnailContainer${sfx}"><div id="ujs_MapThumbnail${sfx}"><div id="ujs_BootTimeLabel${sfx}"><div id="ujs_BootTimeLabel${sfx}_tmp" style="color: ${red ? "rgb(255, 0, 0)" : "rgb(0, 255, 0)"};">${boot}</div></div></div></div>`
        + `<div id="ujs_Vert${sfx}"><div id="ujs_TournamentNameLabel${sfx}"><div id="ujs_TournamentNameLabel${sfx}_tmp"><span style="max-width: 100%">${name}<span style="color: #898989"> by ${by}</span></span></div></div>`
        + `<div id="ujs_InfoLabel${sfx}"><div id="ujs_InfoLabel${sfx}_tmp">${info}</div></div>`
        + `<div id="ujs_CoinsLabel${sfx}"${coins === null ? ' style="display: none"' : ""}><div id="ujs_CoinsLabel${sfx}_tmp">${coins || ""}</div></div></div></div>`;
};

// Stacks the cards from the top as war.app does: each `bottom` is the space below it, 9px between cards.
function stacked(cards) {
    const heights = cards.map((card) => card.height || 104);
    let below = 8;
    const bottoms = [];
    for (let i = cards.length - 1; i >= 0; i--) {
        bottoms[i] = below;
        below += heights[i] + 9;
    }
    return cards.map((card, i) => CARD(i + 1, card).replace('bottom: 0px;', `bottom: ${bottoms[i]}px;`)).join("");
}

const OPEN = [
    { id: 201, name: "Advanced Brawl SE", by: "t7soldier", info: "64-player double elimination tournament. (32 spaces left)", coins: "Entry fee: Free!  1st place prize: 100 coins.  2nd place prize: 43 coins.", boot: "1 day 12 hours", height: 118 },
    { id: 202, name: "Strategic 2v2", by: "Bob", info: "64-player single elimination tournament. (44 spaces left)", coins: "Entry fee: Free!  1st place prize: 200 coins." },
    { id: 203, name: "Scouse War", by: "FarkitMan", info: "32-player double elimination tournament. (29 spaces left)", coins: "Entry fee: 1,200 coins.  1st place prize: up to 2,540 coins.", height: 118 },
    { id: 204, name: "Speedy RR", by: "Cy", info: "Round robin tournament", boot: "5 minutes", red: true },
    { id: 205, name: "Quiet one", by: "Dee", info: "8-player single elimination tournament. (7 spaces left)" },
    { id: 206, name: "Big teams", by: "Eve", info: "16-player single elimination tournament. (12 spaces left)" }
];

test("openTournamentFromCard reads a card's name, creator, kind, players, coins and speed", () => {
    const { dom, $ } = createDom(TOURNAMENTS_SCENE(stacked(OPEN)));
    const ctx = load(["openTournamentFromCard", "openTournamentCards"], { ...domGlobals(dom, $) });
    const cards = ctx.openTournamentCards().map((card) => JSON.parse(JSON.stringify(ctx.openTournamentFromCard(card))));
    assert.deepEqual(cards[0], { id: 201, name: "Advanced Brawl SE", creator: "t7soldier", clan: "", type: 1, players: 64, teamSize: null, realTime: false, fee: 0, prizes: [[1, 100], [2, 43]] });
    assert.deepEqual([cards[2].fee, cards[2].prizes], [1200, [[1, 2540]]]);
    assert.deepEqual([cards[3].type, cards[3].players, cards[3].realTime, cards[3].fee], [2, null, true, null]);
    assert.equal(cards[4].creator, "Dee");
    ctx.openTournamentCards()[2].style.display = "none";
    assert.equal(ctx.openTournamentFromCard(ctx.openTournamentCards()[2]).fee, 1200, "a card the filter hid still reads in full");
});

test("layoutOpenTournaments moves the cards that match up in war.app's order, each at its own height, and puts them back", () => {
    const { dom, $ } = createDom(TOURNAMENTS_SCENE(stacked(OPEN)));
    const ctx = load(["layoutOpenTournaments", "openTournamentCards"], { ...domGlobals(dom, $) });
    const cards = ctx.openTournamentCards();
    const before = cards.map((card) => card.style.bottom);
    const keep = new Set(["ujs_TournamentInfoControl_3", "ujs_TournamentInfoControl_5"]);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.layoutOpenTournaments(cards, (card) => keep.has(card.id)))), { shown: 2, total: 6 });
    assert.equal(cards[2].style.bottom, before[0], "the first match, as tall as the first card, takes its place");
    assert.equal(Number.parseFloat(cards[4].style.bottom), Number.parseFloat(before[0]) - 9 - 104, "the next one sits 9px below it");
    assert.deepEqual(cards.map((card) => card.style.display), ["none", "none", "", "none", "", "none"]);
    ctx.layoutOpenTournaments(cards, null);
    assert.deepEqual(cards.map((card) => card.style.bottom), before);
    assert.deepEqual(cards.map((card) => card.style.display), ["", "", "", "", "", ""]);
});

function openScreen({ cards = OPEN, saved = null, template = TEMPLATE, open = [] } = {}) {
    const { dom, $ } = createDom(TOURNAMENTS_SCENE(stacked(cards)), "https://war.app/MultiPlayer/Tournaments/");
    const storage = dom.window.localStorage;
    if (saved) storage.setItem("tidyUpYourDashboard.openTournamentsFilter", JSON.stringify(saved));
    const requests = [];
    const fetch = (url, options) => {
        requests.push(requestArgs(options.body));
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(reply(1, [tournament(9101)], { open })) });
    };
    const ctx = load(["setupOpenTournamentsFilter", "openTournamentFromCard", "openTournamentCards", "normalizeOpenTournamentsFilter", "normalizePastTournamentsFilter",
        "openTournamentsFilterActive", "openTournamentMatches", "pastTournamentMatches", "pastTournamentDate", "layoutOpenTournaments", "fetchMyTournaments", "myTournamentsRequest",
        "parseMyTournamentsReply", "addTournamentButtonStyles", "ujsElement", "shownUjsElement", "warappArt"], {
        ...domGlobals(dom, $),
        window: dom.window,
        localStorage: storage,
        fetch,
        addCSS: () => { },
        log: () => { },
        Promise, TextDecoder, Uint8Array, DataView,
        setTimeout: (fn) => setTimeout(fn, 0),
        lastMyTournamentsRequest: template,
        OPEN_TOURNAMENTS_FILTER_KEY: "tidyUpYourDashboard.openTournamentsFilter",
        OPEN_TOURNAMENTS_FILTER_MIN: 6
    });
    ctx.setupOpenTournamentsFilter();
    const settle = async () => {
        for (let i = 0; i < 5; i++) {
            await flush();
            await new Promise((resolve) => setTimeout(resolve, 1));
        }
    };
    const shown = () => ctx.openTournamentCards().filter((card) => card.style.display !== "none").map((card) => $(card).find("a").attr("href").split("=")[1]);
    return { $, storage, requests, settle, shown };
}

test("Open Tournaments gets no Filter button with fewer than 6 tournaments", async () => {
    const { $, settle } = openScreen({ cards: OPEN.slice(0, 5) });
    await settle();
    assert.equal($(".tuydOtOpen").length, 0);
});

test("Filter on Open Tournaments hides the cards that don't match, remembers the filter, and Clear shows them all", async () => {
    const { $, storage, requests, settle, shown } = openScreen();
    await settle();
    assert.equal($("#ujs_OpenTournamentsTopBar > .tuydOtOpen").text(), "Filter");
    assert.equal(shown().length, 6);
    $(".tuydOtOpen").trigger("click");
    assert.equal($("#tuydOtFilter").parent().attr("id"), "ujs_OpenTournamentsTopBar");
    assert.equal($("#tuydOtFilter .tuydOtCount").text(), "6 open tournaments");
    $("#tuydOtFilter [name=coins]").val("fee").trigger("change");
    assert.deepEqual(shown(), ["203"]);
    assert.equal($("#tuydOtFilter .tuydOtCount").text(), "1 of 6 shown");
    assert.ok($(".tuydOtOpen").hasClass("tuydOtActive"));
    $("#tuydOtFilter [name=coins]").val("").trigger("change");
    $("#tuydOtFilter [name=speed]").val("realTime").trigger("change");
    assert.deepEqual(shown(), ["204"]);
    $("#tuydOtFilter [name=speed]").val("").trigger("change");
    $("#tuydOtFilter [name=query]").val("bob").trigger("input");
    assert.deepEqual(shown(), ["202"]);
    $("#tuydOtFilter [name=query]").val("").trigger("input");
    $("#tuydOtFilter [name=type]").val("double").trigger("change");
    assert.deepEqual(shown(), ["201", "203"]);
    $("#tuydOtFilter [name=maxPlayers]").val("40").trigger("input");
    assert.deepEqual(shown(), ["203"]);
    assert.deepEqual(JSON.parse(storage.getItem("tidyUpYourDashboard.openTournamentsFilter")), { query: "", type: "double", teams: "", speed: "", coins: "", minPlayers: 0, maxPlayers: 40 });
    $("#tuydOtFilter .tuydOtClear").trigger("click");
    assert.equal(shown().length, 6);
    assert.equal($("#tuydOtFilter [name=type]").val(), "");
    $("#ujs_MyTournaments").trigger("mousedown");
    assert.equal($("#tuydOtFilter").length, 0, "a click elsewhere closes it");
    await settle();
    assert.deepEqual(requests.map((r) => [r.filter, r.count]), [[8, 2147483647]], "opening it reads war.app's list once, for team sizes");
});

test("the teams filter uses team sizes from war.app's list, and a saved filter applies when the page opens", async () => {
    const open = OPEN.map((card) => tournament(card.id, { teamSize: card.id === 206 ? 2 : 1, type: card.id === 204 ? 2 : 0 }));
    const { $, settle, shown } = openScreen({ saved: { teams: "teams" }, open });
    await settle();
    assert.deepEqual(shown(), ["206"]);
    assert.ok($(".tuydOtOpen").hasClass("tuydOtActive"));
    assert.match($(".tuydOtOpen").attr("title"), /^Showing 1 of 6 open tournaments/);
});

test("with war.app's list unread, the teams filter leaves every card in", async () => {
    const { settle, shown } = openScreen({ saved: { teams: "teams" }, template: null });
    await settle();
    assert.equal(shown().length, 6);
});

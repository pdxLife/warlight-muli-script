const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Writes war.app's Past Games data the way its pager answers (names and ids are invented).
function writer() {
    const bytes = [];
    const w = {
        byte(b) { bytes.push(b & 255); return w; },
        bool(v) { return w.byte(v ? 1 : 0); },
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

function writeGame(w, { id, name, state = 4, turn = 5, players = [], settings = false, tournament = false, teams = null }) {
    w.int(0).double(259200000).text(null).int(0).int(0).double(259200000).byte(4).int(id).bool(false).double(8.9e11).int(1748).int(3).bool(false).text(name).int(turn);
    if (teams) { w.bool(true).int(teams.length); teams.forEach((t) => w.int(t)); } else w.bool(false);
    w.bool(true).int(players.length);
    players.forEach((p) => w.bool(true).bool(true).int(17).bool(true).bool(false).int(0x7fffffff).bool(false).text(p.name).int(p.id).byte(p.state).int(p.team ?? -1).bool(false));
    w.bool(false).bool(false).bool(false).bool(false);
    if (settings) {
        w.bool(true).bool(true).double(1).bool(true).int(0).text("x").bool(false).bool(false).bool(true).int(2).double(0.7).bool(false).int(0).bool(false).bool(false)
            .double(0).bool(false).double(0).int(5).byte(1).bool(false).bool(false).int(0).double(0.6).bool(false).bool(true).byte(1);
    } else w.bool(false);
    w.int(state).bool(false).double(0);
    if (tournament) {
        w.bool(true).bool(true).int(1).int(2).bool(true).int(3).bool(true).int(1).int(1).int(5).bool(true).byte(0).byte(1).byte(0).int(33000);
    } else w.bool(false);
    w.double(0);
}

function page(total, games) {
    const w = writer().int(total).int(games.length);
    games.forEach((game) => writeGame(w, game));
    return w.hex();
}

const ME = { id: 7, name: "Me" };
const p = (id, name, state, team = -1) => ({ id, name, state, team });

function parse(hex) {
    const { parsePastGamesData } = load(["parsePastGamesData"], { TextDecoder, Uint8Array, DataView });
    return JSON.parse(JSON.stringify(parsePastGamesData(hex)));
}

test("parsePastGamesData reads each game's id, name, state, turn and players, past settings and tournament data", () => {
    const hex = page(4796, [
        { id: 101, name: "QM: Me vs Ann", turn: 9, players: [p(7, "Me", 4), p(8, "Ann", 7)] },
        { id: 102, name: "Cup: Round of 16 ✓", state: 3, turn: -1, players: [p(7, "Me", 2), p(9, "Bø", 2)], settings: true, tournament: true },
        { id: 103, name: "QM: 2v2", players: [p(7, "Me", 4, 1), p(8, "Ann", 7, 0), p(10, "Cy", 4, 1), p(11, "Di", 7, 0)], teams: [0, 1] }
    ]);
    const data = parse(hex);
    assert.equal(data.total, 4796);
    assert.deepEqual(data.games.map((g) => [g.id, g.name, g.state, g.turn]), [[101, "QM: Me vs Ann", 4, 9], [102, "Cup: Round of 16 ✓", 3, -1], [103, "QM: 2v2", 4, 5]]);
    assert.deepEqual(data.games[0].players, [{ id: 7, name: "Me", state: 4, team: -1 }, { id: 8, name: "Ann", state: 7, team: -1 }]);
    assert.deepEqual(data.games[2].players.map((pl) => pl.team), [1, 0, 1, 0]);
});

test("parsePastGamesData returns null for anything that isn't exactly war.app's layout", () => {
    const hex = page(1, [{ id: 101, name: "QM: Me vs Ann", players: [p(7, "Me", 4), p(8, "Ann", 7)] }]);
    assert.equal(parse(hex.slice(0, -2)), null);
    assert.equal(parse(hex + "00"), null);
    assert.equal(parse("<html>Sign in</html>"), null);
    assert.equal(parse(""), null);
    assert.deepEqual(parse(page(0, [])), { total: 0, games: [] });
});

test("fetchAllPastGames reads page after page until the total, keeping each game once", async () => {
    const { fetchAllPastGames } = load(["fetchAllPastGames"], { Promise });
    const pages = { 0: [1, 2], 2: [2, 3], 4: [4] };
    const offsets = [];
    const games = await fetchAllPastGames((offset, count) => {
        offsets.push([offset, count]);
        return Promise.resolve({ total: 5, games: pages[offset].map((id) => ({ id })) });
    }, 2);
    assert.deepEqual(offsets, [[0, 2], [2, 2], [4, 2]]);
    assert.deepEqual(Array.from(games, (g) => g.id), [1, 2, 3, 4]);
    await assert.rejects(fetchAllPastGames(() => Promise.resolve(null), 2), /couldn't be read/);
});

const STATS_FUNCTIONS = ["isQuickmatchGameName", "quickmatchPlayer", "quickmatchResult", "quickmatchOpponents", "quickmatchStats", "quickmatchResultText", "quickmatchRateText", "quickmatchRecordText"];

const GAMES = [
    { id: 1, name: "QM: Me vs Ann", state: 4, turn: 8, players: [p(7, "Me", 4), p(8, "Ann", 7)] },
    { id: 2, name: "QM: Bo vs Me", state: 4, turn: 12, players: [p(9, "Bo", 4), p(7, "Me", 7)] },
    { id: 3, name: "QM: Me vs Ann", state: 4, turn: 2, players: [p(7, "Me", 8), p(8, "Ann", 4)] },
    { id: 4, name: "QM: Me vs Bo", state: 3, turn: 4, players: [p(7, "Me", 2), p(9, "Bo", 2)] },
    { id: 5, name: "QM: 2v2", state: 4, turn: 0, players: [p(7, "Me", 4, 1), p(8, "Ann", 7, 0), p(10, "Cy", 4, 1), p(11, "Di", 7, 0)] },
    { id: 6, name: "Seasonal: Me vs Ann", state: 4, turn: 6, players: [p(7, "Me", 4), p(8, "Ann", 7)] },
    { id: 7, name: "QM: Me vs Ann", state: 4, turn: 6, players: [p(7, "Me", 9), p(8, "Ann", 9)] },
    { id: 8, name: "QM: my own game", state: 4, turn: 6, players: [p(7, "Me", 4), p(8, "Ann", 7)] }
];
const TEMPLATES = { 1: { name: "Strategic 1v1", id: 1070738 }, 2: { name: "Strategic 1v1", id: 1070738 }, 3: { name: "Guiroma", id: 1070739 }, 8: { none: true } };

function stats(countBoots) {
    const ctx = load(STATS_FUNCTIONS);
    return JSON.parse(JSON.stringify(ctx.quickmatchStats(GAMES, { id: "7", name: null }, TEMPLATES, countBoots)));
}

test("quickmatchStats counts Quickmatch games only, leaves boot losses out unless asked, and groups by template and opponent", () => {
    const s = stats(false);
    assert.deepEqual([s.wins, s.losses, s.bootLosses, s.votes, s.playing, s.games.length], [2, 1, 1, 1, 1, 5]);
    assert.equal(s.rate, 2 / 3);
    assert.deepEqual(s.templates.map((t) => [t.name, t.templateId, t.wins, t.losses, t.games.length]), [
        ["Strategic 1v1", 1070738, 1, 1, 2], [null, null, 1, 0, 2], ["Guiroma", 1070739, 0, 0, 1]
    ]);
    assert.equal(s.templates[0].averageTurns, 10);
    assert.deepEqual(s.opponents.map((o) => [o.name, o.wins, o.losses, o.games.length]), [
        ["Ann", 2, 0, 4], ["Bo", 0, 1, 1], ["Di", 1, 0, 1]
    ]);
    assert.deepEqual(s.games.map((g) => g.id), [1, 2, 3, 5, 7]);
    assert.deepEqual(s.games[3].opponents, ["Ann", "Di"]);
});

test("quickmatchStats counts boot losses as losses when asked", () => {
    const s = stats(true);
    assert.deepEqual([s.wins, s.losses, s.bootLosses], [2, 2, 1]);
    assert.deepEqual(s.templates.find((t) => t.name === "Guiroma").losses, 1);
});

test("quickmatchStats finds you by name when your player ID isn't known", () => {
    const ctx = load(STATS_FUNCTIONS);
    const s = ctx.quickmatchStats(GAMES, { id: null, name: "Me" }, {}, false);
    assert.equal(s.wins, 3);
});

function settingsLike(name, extra) {
    const settings = { Dg: false, su: { val: -2147483647 }, Te: { val: 1070736 }, mi: { val: 0 }, Qi: "Small Earth 1v1 Auto Dist", Ya: name, um: "This game was created by the Quickmatch system" };
    for (let i = 0; i < 20; i++) settings["f" + i] = i;
    return Object.assign(settings, extra);
}

test("gameTemplateFromData finds the template's name and ID next to the game's name", () => {
    const { gameTemplateFromData } = load(["gameTemplateFromData"], { Set });
    const data = { Qd: 1, Map: {}, Q2: { aa: 1, Pha: settingsLike("QM: Me vs Ann") }, e1a: [{ Td: "QM: Me vs Ann" }] };
    assert.deepEqual(JSON.parse(JSON.stringify(gameTemplateFromData(data, "QM: Me vs Ann"))), { name: "Small Earth 1v1 Auto Dist", id: 1070736 });
    const twoIds = { Q2: { Pha: settingsLike("QM: Me vs Ann", { cq: { val: 335779 } }) } };
    assert.deepEqual(JSON.parse(JSON.stringify(gameTemplateFromData(twoIds, "QM: Me vs Ann"))), { name: "Small Earth 1v1 Auto Dist", id: null });
});

test("gameTemplateFromData waits for the game and tells a game that isn't a Quickmatch game", () => {
    const { gameTemplateFromData } = load(["gameTemplateFromData"], { Set });
    assert.equal(gameTemplateFromData({ Qd: 1 }, "QM: Me vs Ann"), null);
    assert.deepEqual(JSON.parse(JSON.stringify(gameTemplateFromData({ Q2: { Pha: settingsLike("QM: my own game", { um: "", Qi: "" }) } }, "QM: my own game"))), { none: true });
    assert.equal(gameTemplateFromData({ Q2: { Pha: settingsLike("QM: Me vs Ann", { Kj: "A second text" }) } }, "QM: Me vs Ann"), null);
});

test("the CSV lists every Quickmatch game, quoting where needed and keeping spreadsheet formulas inert", () => {
    const ctx = load(["csvCell", "quickmatchCsv", ...STATS_FUNCTIONS]);
    assert.equal(ctx.csvCell('He said "hi", then left'), '"He said ""hi"", then left"');
    assert.equal(ctx.csvCell("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
    assert.equal(ctx.csvCell("-1"), "'-1");
    assert.equal(ctx.csvCell(null), "");
    const lines = ctx.quickmatchCsv(GAMES, { id: "7" }, TEMPLATES, "https://war.app").trim().split("\r\n");
    assert.equal(lines[0], "Game ID,Game,Result,Turns,Template,Template ID,Opponents,Link");
    assert.deepEqual(lines.slice(1).map((line) => line.split(",").slice(0, 3).join(",")), [
        "1,QM: Me vs Ann,Won", "2,QM: Bo vs Me,Lost", "3,QM: Me vs Ann,Booted", "4,QM: Me vs Bo,In progress", "5,QM: 2v2,Won", "7,QM: Me vs Ann,Ended by vote"
    ]);
    assert.equal(lines[1], "1,QM: Me vs Ann,Won,8,Strategic 1v1,1070738,Ann,https://war.app/MultiPlayer?GameID=1");
    assert.match(lines[5], /,Ann; Di,/);
});

test("the copied summary has the record and the top named templates and opponents", () => {
    const ctx = load(["quickmatchSummaryText", ...STATS_FUNCTIONS]);
    const text = ctx.quickmatchSummaryText(ctx.quickmatchStats(GAMES, { id: "7" }, TEMPLATES, false), 2);
    assert.equal(text, "Quickmatch: 2W - 1L (66.7%), 5 games\n\nTop templates:\nStrategic 1v1: 1W - 1L (50.0%)\n\nTop opponents:\nAnn: 2W - 0L (100.0%)\nBo: 0W - 1L (0.0%)");
});

function table(kind, view) {
    const ctx = load(["quickmatchTableHtml", "htmlEscape", ...STATS_FUNCTIONS]);
    const s = ctx.quickmatchStats(GAMES, { id: "7" }, TEMPLATES, false);
    const { dom, $ } = createDom(ctx.quickmatchTableHtml(s[kind], kind, view));
    return { $, rows: () => Array.from($("tr.tuydQmRow").map(function () { return $(this).find("td").map(function () { return $(this).text(); }).get().join("|"); }).get()) };
}

test("the templates tab shows each template's record, unread games last among equals, and links the template", () => {
    const { $, rows } = table("templates", {});
    assert.deepEqual(rows(), ["Strategic 1v1 #1070738|2|1|1|50.0%|~10", "Template not read yet|2|1|0|100.0%|~6", "Guiroma #1070739|1|0|0|–|–"]);
    assert.equal($(".tuydQmTemplateLink").first().attr("href"), "/MultiPlayer?TemplateID=1070738");
    assert.equal($("thead td").first().text(), "Template");
});

test("the table sorts, filters, limits and lists the games of the open row", () => {
    assert.deepEqual(table("templates", { sort: { key: "name", descending: false } }).rows().map((r) => r.split("|")[0]), ["Guiroma #1070739", "Strategic 1v1 #1070738", "Template not read yet"]);
    assert.deepEqual(table("opponents", { query: "b" }).rows().map((r) => r.split("|")[0]), ["Bo"]);
    const limited = table("opponents", { limit: 2 });
    assert.equal(limited.rows().length, 2);
    assert.equal(limited.$(".tuydQmAll").text(), "Show all 3");
    const open = table("opponents", { open: "8" });
    assert.equal(open.$("tr.tuydQmGames").text(), "Won in 8 on Strategic 1v1 · Booted on Guiroma · Won · Ended by vote");
    assert.equal(open.$("tr.tuydQmGames a").first().attr("href"), "/MultiPlayer?GameID=1");
    assert.match(table("templates", { query: "nothing" }).$("tbody").text(), /Nothing matches/);
});

function panel({ cached, view, ajax } = {}) {
    const { dom, $ } = createDom(`<div><table id="MyGamesTable" class="dataTable"><thead></thead><tbody></tbody></table></div>`, "https://war.app/MultiPlayer/PastGames");
    const storage = dom.window.localStorage;
    if (cached) storage.setItem("tidyUpYourDashboard.quickmatchGames", JSON.stringify(cached));
    if (view) storage.setItem("tidyUpYourDashboard.quickmatchView", JSON.stringify(view));
    storage.setItem("tidyUpYourDashboard.quickmatchTemplates", JSON.stringify(TEMPLATES));
    const requests = [];
    if (ajax) {
        $.ajax = (options) => {
            requests.push(options);
            return $.Deferred().resolve(ajax(options)).promise();
        };
    }
    const ctx = load(["setupQuickmatchStats", "readQuickmatchView", "storedQuickmatchTemplates", "quickmatchTableHtml", "fetchAllPastGames", "parsePastGamesData", "gameTemplateFromData", "htmlEscape", ...STATS_FUNCTIONS], {
        ...domGlobals(dom, $),
        localStorage: storage,
        addCSS: () => { },
        log: () => { },
        Promise, TextDecoder, Uint8Array, DataView, Set,
        signedInPlayerId: () => $.Deferred().resolve("7").promise(),
        QUICKMATCH_GAMES_KEY: "tidyUpYourDashboard.quickmatchGames",
        QUICKMATCH_TEMPLATES_KEY: "tidyUpYourDashboard.quickmatchTemplates",
        QUICKMATCH_VIEW_KEY: "tidyUpYourDashboard.quickmatchView",
        GAME_TEMPLATE_FRAME_ID: "tuydGameTemplateFrame"
    });
    ctx.setupQuickmatchStats();
    return { $, storage, requests };
}

test("the Quickmatch panel shows the record from the last scan and opens to the templates", () => {
    const { $ } = panel({ cached: { time: Date.now(), games: GAMES } });
    assert.equal($("#tuydQuickmatchStats").next().attr("id"), "MyGamesTable");
    assert.equal($(".tuydQmRecord").text(), "2 W – 1 L (66.7%) · 5 games · 1 in progress · 1 boot loss left out");
    assert.equal($(".tuydQmBody").css("display"), "none");
    $(".tuydQmToggle").trigger("click");
    assert.notEqual($(".tuydQmBody").css("display"), "none");
    assert.equal($(".tuydQmTable tr.tuydQmRow").length, 3);
    assert.equal($(".tuydQmTemplateStatus").text(), "The template isn't known yet for 2 games. Read them");
    $("[name=countBoots]").prop("checked", true).trigger("change");
    assert.match($(".tuydQmRecord").text(), /^2 W – 2 L \(50\.0%\)/);
    $("[data-tab=opponents]").trigger("click");
    assert.equal($(".tuydQmTable thead td").first().text(), "Opponent");
    $(".tuydQmRow").first().trigger("click");
    assert.equal($("tr.tuydQmGames").length, 1);
});

test("the Quickmatch panel reads Past Games when it's opened without a recent scan", async () => {
    const hex = page(2, [GAMES[0], GAMES[5]].map((g) => ({ ...g })));
    const { $, storage, requests } = panel({ ajax: () => hex });
    assert.equal($(".tuydQmToggle").text(), "Count my Quickmatch games");
    $(".tuydQmToggle").trigger("click");
    await flush();
    assert.deepEqual(JSON.parse(JSON.stringify(requests.map((r) => [r.url, r.type, r.data]))), [["/MultiPlayer/PastGames", "POST", { Offset: 0, Sort: 3, PerPage: 200 }]]);
    assert.equal($(".tuydQmRecord").text(), "1 W – 0 L (100.0%) · 1 game");
    assert.deepEqual(JSON.parse(storage.getItem("tidyUpYourDashboard.quickmatchGames")).games.map((g) => g.id), [1]);
});

test("the Quickmatch panel says so when war.app's answer can't be read", async () => {
    const { $ } = panel({ ajax: () => "<html></html>", view: { open: true } });
    await flush();
    assert.equal($(".tuydQmStatus").text(), "Couldn't read your Past Games. Try Rescan later.");
});

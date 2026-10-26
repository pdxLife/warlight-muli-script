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

function writeGame(w, { id, name, state = 4, turn = 5, players = [], settings = false, tournament = false, teams = null, date = 8.9e11, map = 1748 }) {
    w.int(0).double(259200000).text(null).int(0).int(0).double(259200000).byte(4).int(id).bool(false).double(date).int(map).int(3).bool(false).text(name).int(turn);
    if (teams) { w.bool(true).int(teams.length); teams.forEach((t) => w.int(t)); } else w.bool(false);
    w.bool(true).int(players.length);
    players.forEach((p) => w.bool(true).bool(true).int(17).bool(true).bool(!!p.committed).int(0x7fffffff).bool(false).text(p.name).int(p.id).byte(p.state).int(p.team ?? -1).bool(false));
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

test("parsePastGamesData reads each game's id, name, state, turn, date, map and players, past settings and tournament data", () => {
    const hex = page(4796, [
        { id: 101, name: "QM: Me vs Ann", turn: 9, players: [p(7, "Me", 4), p(8, "Ann", 7)], date: 846335988177, map: 70306 },
        { id: 102, name: "Cup: Round of 16 ✓", state: 3, turn: -1, players: [{ ...p(7, "Me", 2), committed: true }, p(9, "Bø", 2)], settings: true, tournament: true },
        { id: 103, name: "QM: 2v2", players: [p(7, "Me", 4, 1), p(8, "Ann", 7, 0), p(10, "Cy", 4, 1), p(11, "Di", 7, 0)], teams: [0, 1] }
    ]);
    const data = parse(hex);
    assert.equal(data.total, 4796);
    assert.deepEqual(data.games.map((g) => [g.id, g.name, g.state, g.turn, g.date, g.map, g.tournament]), [
        [101, "QM: Me vs Ann", 4, 9, 846335988177, 70306, false],
        [102, "Cup: Round of 16 ✓", 3, -1, 8.9e11, 1748, true],
        [103, "QM: 2v2", 4, 5, 8.9e11, 1748, false]
    ]);
    assert.deepEqual(data.games[0].players, [{ id: 7, name: "Me", state: 4, team: -1, committed: false }, { id: 8, name: "Ann", state: 7, team: -1, committed: false }]);
    assert.deepEqual(data.games[1].players.map((pl) => pl.committed), [true, false]);
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
    const progress = [];
    const games = await fetchAllPastGames((offset, count) => {
        offsets.push([offset, count]);
        return Promise.resolve({ total: 5, games: pages[offset].map((id) => ({ id })) });
    }, 2, (done, total) => progress.push(done + "/" + total));
    assert.deepEqual(offsets, [[0, 2], [2, 2], [4, 2]]);
    assert.deepEqual(progress, ["2/5", "4/5", "5/5"]);
    assert.deepEqual(Array.from(games, (g) => g.id), [1, 2, 3, 4]);
    await assert.rejects(fetchAllPastGames(() => Promise.resolve(null), 2), /couldn't be read/);
});

const STATS_FUNCTIONS = ["isQuickmatchGameName", "pastGamePlayer", "pastGameResult", "quickmatchResult", "quickmatchOpponents", "quickmatchStats", "quickmatchResultText", "quickmatchRateText", "quickmatchRecordText"];

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

// Mirrors war.app's Quickmatch screen: the main scene's Settings dialog and the Templates scene's rows.
const TEMPLATE_ROW = (n, name, rating) => {
    const suffix = n > 1 ? "_" + n : "";
    return `<div id="ujs_TemplatesSceneTemplate${suffix}"><div id="ujs_Hamburger${suffix}"><div id="ujs_InfoVert${suffix}">`
        + `<div id="ujs_TemplateNameLabel${suffix}"><div id="ujs_TemplateNameLabel${suffix}_tmp">${name}</div></div>`
        + `<div id="ujs_YourRatingLabel${suffix}"><div id="ujs_YourRatingLabel${suffix}_tmp">Your rating: ${rating}</div></div></div></div></div>`;
};
const QUICKMATCH_SCREEN = `<div id="UjsCanvasHolder"><div id="ujs_QuickmatchScene"><div id="ujs_Viewport"><div id="ujs_Content">
    <div id="ujs_SettingsContainer">
        <div id="ujs_DialogBackgroundForDropShadow_3"><div id="ujs_DialogBackgroundForDropShadow_3_img"></div></div>
        <div id="ujs_Header_3"><div id="ujs_HeaderText_3"><div id="ujs_HeaderText_3_tmp">Settings</div></div></div>
        <div id="ujs_WinsLabel"><div id="ujs_WinsLabel_tmp">You've won 2 quickmatch games (rank 35)</div></div>
    </div></div></div></div>
    <div id="ujs_TemplatesScene" style="display: none"><div id="ujs_TemplatesContainer">
        ${TEMPLATE_ROW(1, "Strategic 1v1", "1,309.8")}${TEMPLATE_ROW(2, "Guiroma", "364.48")}${TEMPLATE_ROW(3, "Biomes of Americas 1 v 1", "337.73")}
    </div></div></div>`;

function screen({ cached, ajax, sessionCopy } = {}) {
    const { dom, $ } = createDom(QUICKMATCH_SCREEN, "https://war.app/MultiPlayer?Quickmatch=1");
    dom.window.Range.prototype.getBoundingClientRect = () => ({ left: 0, right: 140, width: 140 });
    const storage = dom.window.localStorage;
    if (cached) storage.setItem("tidyUpYourDashboard.quickmatchGames", JSON.stringify(cached));
    if (sessionCopy) dom.window.sessionStorage.setItem("tidyUpYourDashboard.pastGames", JSON.stringify(sessionCopy));
    storage.setItem("tidyUpYourDashboard.quickmatchTemplates", JSON.stringify(TEMPLATES));
    const requests = [];
    if (ajax) {
        $.ajax = (options) => {
            requests.push(options);
            return $.Deferred().resolve(ajax(options)).promise();
        };
    }
    const ctx = load(["setupQuickmatchStats", "storedQuickmatchGames", "readQuickmatchView", "storedQuickmatchTemplates", "quickmatchTableHtml", "loadPastGames",
        "fetchPastGamesPage", "fetchAllPastGames", "parsePastGamesData", "gameTemplateFromData", "htmlEscape", "gamePlayerId", "ujsElement", "shownUjsElement", "warappArt",
        "addCommunityLaddersStyles", ...STATS_FUNCTIONS], {
        ...domGlobals(dom, $),
        window: dom.window,
        localStorage: storage,
        addCSS: () => { },
        log: () => { },
        Promise, TextDecoder, Uint8Array, DataView, Set,
        setTimeout: (fn) => fn(),
        signedInPlayerId: () => $.Deferred().resolve("10712").promise(),
        QUICKMATCH_GAMES_KEY: "tidyUpYourDashboard.quickmatchGames",
        QUICKMATCH_TEMPLATES_KEY: "tidyUpYourDashboard.quickmatchTemplates",
        QUICKMATCH_VIEW_KEY: "tidyUpYourDashboard.quickmatchView",
        PAST_GAMES_KEY: "tidyUpYourDashboard.pastGames",
        GAME_TEMPLATE_FRAME_ID: "tuydGameTemplateFrame"
    });
    ctx.setupQuickmatchStats();
    const showTemplates = async () => {
        $("#ujs_QuickmatchScene").hide();
        $("#ujs_TemplatesScene").show();
        await flush();
    };
    return { $, storage, requests, showTemplates, sessionStorage: dom.window.sessionStorage };
}

test("the Settings dialog's header has your Quickmatch record and a Stats button", () => {
    const { $, requests } = screen({ cached: { player: "7", time: Date.now(), games: GAMES } });
    assert.equal(requests.length, 0, "a recent scan isn't read again");
    assert.equal($("#tuydQmSummary").parent().attr("id"), "ujs_SettingsContainer");
    assert.equal($(".tuydQmSummaryRecord").text(), "2 W – 1 L (66.7%)");
    assert.equal($(".tuydQmSummaryRecord").attr("title"), "5 finished Quickmatch games · 1 in progress · 1 boot loss left out (Muli's Userscript)");
    assert.equal($(".tuydQmStatsButton").text(), "Stats");
});

test("each template on the Templates screen shows your record there, and unplayed ones nothing", async () => {
    const { $, showTemplates } = screen({ cached: { player: "7", time: Date.now(), games: GAMES } });
    await showTemplates();
    assert.equal($("#ujs_YourRatingLabel").children(".tuydQmTemplateRecord").text(), "· 1 W – 1 L (50.0%)");
    assert.equal($("#ujs_YourRatingLabel_2").children(".tuydQmTemplateRecord").text(), "· 0 W – 0 L (–)");
    assert.equal($("#ujs_YourRatingLabel_3").children(".tuydQmTemplateRecord").length, 0);
    assert.equal($("#ujs_YourRatingLabel").children(".tuydQmTemplateRecord")[0].style.left, "148px", "after the rating's text");
    assert.equal($("#tuydQmSummary").length, 0, "the main scene is hidden");
});

test("the Stats dialog lists templates and opponents, counts boot losses when asked, and closes with the scene", async () => {
    const { $, showTemplates } = screen({ cached: { player: "7", time: Date.now(), games: GAMES } });
    $(".tuydQmStatsButton").trigger("click");
    assert.equal($("#tuydQmStats").parent().attr("id"), "UjsCanvasHolder");
    assert.ok($("#tuydQmStats").hasClass("tuydCommunityPanel"));
    assert.equal($("#tuydQmStats .tuydQmTable tr.tuydQmRow").length, 3);
    assert.equal($("#tuydQmStats .tuydQmTemplateStatus").text(), "The template isn't known yet for 2 games. Read them");
    $("#tuydQmStats [name=countBoots]").prop("checked", true).trigger("change");
    assert.match($("#tuydQmStats .tuydQmRecordLine").text(), /^2 W – 2 L \(50\.0%\)/);
    assert.equal($(".tuydQmSummaryRecord").text(), "2 W – 2 L (50.0%)");
    $("#tuydQmStats [data-tab=opponents]").trigger("click");
    assert.equal($("#tuydQmStats .tuydQmTable thead td").first().text(), "Opponent");
    $("#tuydQmStats .tuydQmRow").first().trigger("click");
    assert.equal($("#tuydQmStats tr.tuydQmGames").length, 1);
    $("#tuydQmStats .tuydQmClose").trigger("click");
    assert.equal($("#tuydQmStats").length, 0);
    $(".tuydQmStatsButton").trigger("click");
    await showTemplates();
    assert.equal($("#tuydQmStats").length, 0);
});

test("without a recent scan the Quickmatch screen reads Past Games and keeps its Quickmatch games", async () => {
    const hex = page(2, [GAMES[0], GAMES[5]].map((g) => ({ ...g })));
    const { $, storage, requests, sessionStorage } = screen({ cached: { player: "7", time: Date.now() - 11 * 60 * 1000, games: GAMES }, ajax: () => hex });
    await flush();
    assert.deepEqual(JSON.parse(JSON.stringify(requests.map((r) => [r.url, r.type, r.data]))), [["/MultiPlayer/PastGames", "POST", { Offset: 0, Sort: 3, PerPage: 200 }]]);
    assert.equal($(".tuydQmSummaryRecord").text(), "1 W – 0 L (100.0%)");
    assert.deepEqual(JSON.parse(storage.getItem("tidyUpYourDashboard.quickmatchGames")).games.map((g) => g.id), [1]);
    assert.equal(JSON.parse(storage.getItem("tidyUpYourDashboard.quickmatchGames")).player, "7", "kept under the ID war.app's game data uses, not the profile link's");
    assert.equal(JSON.parse(sessionStorage.getItem("tidyUpYourDashboard.pastGames")).games.length, 2, "every game is kept for Past Games");
});

test("the Quickmatch screen uses this session's copy of Past Games, and ignores another player's games", async () => {
    const { $, requests } = screen({
        cached: { player: "8", time: Date.now(), games: GAMES },
        sessionCopy: { player: "7", time: Date.now() - 60 * 1000, games: [GAMES[1], GAMES[5]] }
    });
    await flush();
    assert.equal(requests.length, 0);
    assert.equal($(".tuydQmSummaryRecord").text(), "0 W – 1 L (0.0%)");
});

test("the Quickmatch screen says so when war.app's answer can't be read", async () => {
    const { $ } = screen({ ajax: () => "<html></html>" });
    await flush();
    assert.equal($(".tuydQmSummaryRecord").text(), "Couldn't read your games");
    $(".tuydQmStatsButton").trigger("click");
    assert.equal($("#tuydQmStats .tuydQmStatus").text(), "Couldn't read your games. Try Rescan later.");
});

test("your own profile shows your Quickmatch record under war.app's ratings, others' profiles nothing", () => {
    const profile = (url, folded) => {
        const lines = "Global: 1309.77<br> Real-time: 1313.54<br>";
        const { dom, $ } = createDom(`<div class="p-3"><h3>Quickmatch</h3>${folded ? `<div class="exp">${lines}</div>` : lines}<h3>Single-player stats</h3></div>`, url);
        dom.window.localStorage.setItem("tidyUpYourDashboard.quickmatchGames", JSON.stringify({ player: "7", time: Date.now(), games: GAMES }));
        dom.window.localStorage.setItem("tidyUpYourDashboard.quickmatchTemplates", JSON.stringify(TEMPLATES));
        const ctx = load(["setupQuickmatchProfileRecord", "storedQuickmatchGames", "storedQuickmatchTemplates", "readQuickmatchView", "extractPlayerId", "gamePlayerId", ...STATS_FUNCTIONS], {
            ...domGlobals(dom, $),
            localStorage: dom.window.localStorage,
            location: dom.window.location,
            signedInPlayerId: () => $.Deferred().resolve("10712").promise(),
            QUICKMATCH_GAMES_KEY: "tidyUpYourDashboard.quickmatchGames",
            QUICKMATCH_TEMPLATES_KEY: "tidyUpYourDashboard.quickmatchTemplates",
            QUICKMATCH_VIEW_KEY: "tidyUpYourDashboard.quickmatchView"
        });
        ctx.setupQuickmatchProfileRecord();
        return $;
    };
    const own = profile("https://war.app/Profile?p=10712&u=Me");
    assert.equal(own("#tuydQmProfileRecord").text(), "Record: 2 W – 1 L (66.7%) in 5 games");
    assert.equal(own("#tuydQmProfileRecord").next().next().text(), "Single-player stats");
    const folded = profile("https://war.app/Profile?p=10712&u=Me", true);
    assert.equal(folded("#tuydQmProfileRecord").parent().attr("class"), "exp");
    assert.equal(profile("https://war.app/Profile?p=10812&u=Ann")("#tuydQmProfileRecord").length, 0);
});

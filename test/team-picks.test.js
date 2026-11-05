const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

const FUNCTIONS = ["teamPicksState", "copyTeammatePicks", "teamPicksReplaceQuestion", "teamPicksHtml", "teamPicksSpot", "setupTeamPicksCopy", "ujsElement", "shownUjsElement", "htmlEscape"];

function Pick(player, territory, index) {
    this.$a = player;
    this.nc = territory;
    this.e8 = index;
}

function idMap(entries) {
    return {
        Ra: () => entries.map(([key, value]) => ({ Na: key, fa: value })),
        Aa: (key) => (entries.find(([id]) => id === key) || [])[1]
    };
}

// Mirrors the parts of war.app's UJS_Hooks this reads, with its minified names as of war.app 6.07.
function fakeHooks({ phase = 5, committed = false, active = true, sent = [[2, { qqa: [7, 3, 9] }]], own = [], names = { 1: "Me", 2: "Ally", 3: "Other ally" } } = {}) {
    const calls = [];
    const turn = {
        ac: own.map((territory, index) => ({ Pb: new Pick(1, territory, index) })),
        H0: (orders) => calls.push(["H0", orders]),
        nv: () => calls.push(["nv"]),
        commit: () => calls.push(["commit"])
    };
    const players = idMap(Object.entries(names).map(([id, name]) => [Number(id), { Wd: () => name }]));
    turn.ta = { xf: () => (active ? turn : {}) };
    const links = {
        kb: () => ({ Xa: phase, qb: players }),
        uc: () => ({ eb: () => 1, lh: committed }),
        zd: { em: sent ? idMap(sent) : null }
    };
    return { hooks: { ya: links, Od: turn, xDd: function () { }, pxd: Pick }, calls };
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("a teammate's committed picks are read in their order, with their name and your own picks", () => {
    const ctx = load(FUNCTIONS);
    const { hooks } = fakeHooks({ own: [4, 5], sent: [[2, { qqa: [7, 3, 9] }], [3, { qqa: [] }], [1, { qqa: [8] }]] });
    assert.deepStrictEqual(plain(ctx.teamPicksState(hooks)), { self: 1, own: [4, 5], teammates: [{ id: 2, name: "Ally", picks: [7, 3, 9] }] });
});

test("picks a teammate sent as orders are read when war.app sends no pick list", () => {
    const ctx = load(FUNCTIONS);
    const { hooks } = fakeHooks({ sent: [[2, { qqa: null, ac: [new Pick(2, 6, 0), { nc: 99 }, new Pick(2, 2, 1)] }]] });
    assert.deepStrictEqual(plain(ctx.teamPicksState(hooks).teammates), [{ id: 2, name: "Ally", picks: [6, 2] }]);
});

test("nothing to copy outside picking, after committing, away from your own orders, or before a teammate commits", () => {
    const ctx = load(FUNCTIONS);
    assert.equal(ctx.teamPicksState(fakeHooks({ phase: 3 }).hooks), null, "a turn after picking");
    assert.equal(ctx.teamPicksState(fakeHooks({ committed: true }).hooks), null, "you committed");
    assert.equal(ctx.teamPicksState(fakeHooks({ active: false }).hooks), null, "viewing history or a teammate's orders");
    assert.equal(ctx.teamPicksState(fakeHooks({ sent: [] }).hooks), null, "no teammate committed");
    assert.equal(ctx.teamPicksState(fakeHooks({ sent: null }).hooks), null, "a game without teams");
    assert.equal(ctx.teamPicksState(undefined), null, "outside a game");
});

test("renamed war.app data reads as nothing to copy, not an error", () => {
    const ctx = load(FUNCTIONS);
    const renamed = fakeHooks().hooks;
    delete renamed.Od.H0;
    assert.equal(ctx.teamPicksState(renamed), null);
    const throwing = fakeHooks().hooks;
    throwing.ya.kb = () => { throw new TypeError("x is undefined"); };
    assert.equal(ctx.teamPicksState(throwing), null);
    const noClass = fakeHooks().hooks;
    delete noClass.pxd;
    assert.equal(ctx.teamPicksState(noClass), null);
});

test("copying loads the picks as yours, in order, and never commits", () => {
    const ctx = load(FUNCTIONS);
    const { hooks, calls } = fakeHooks();
    ctx.copyTeammatePicks(hooks, 1, [7, 3, 9]);
    assert.deepStrictEqual(calls.map((call) => call[0]), ["H0", "nv"]);
    const orders = calls[0][1];
    assert.ok(orders.every((order) => order instanceof Pick));
    assert.deepStrictEqual(plain(orders), [{ $a: 1, nc: 7, e8: 0 }, { $a: 1, nc: 3, e8: 1 }, { $a: 1, nc: 9, e8: 2 }]);
});

test("replacing picks you already made asks first", () => {
    const ctx = load(FUNCTIONS);
    const ally = { name: "Ally", picks: [7, 3, 9] };
    assert.equal(ctx.teamPicksReplaceQuestion([], ally), null);
    assert.equal(ctx.teamPicksReplaceQuestion([7, 3, 9], ally), null, "already the same picks");
    assert.equal(ctx.teamPicksReplaceQuestion([4], ally), "Replace your 1 pick with Ally's 3? Nothing is committed: you can still change them before you commit.");
    assert.match(ctx.teamPicksReplaceQuestion([3, 7, 9], ally), /^Replace your 3 picks with Ally's 3\?/, "same picks in another order");
});

test("the buttons sit left of war.app's Orders panel, level with its top", () => {
    const ctx = load(FUNCTIONS);
    assert.deepStrictEqual(plain(ctx.teamPicksSpot({ left: 822, top: 112, width: 200, height: 325 }, 150)), { left: 664, top: 112 });
    assert.deepStrictEqual(plain(ctx.teamPicksSpot({ left: 100, top: 112, width: 200, height: 325 }, 150)), { left: 8, top: 112 });
    assert.equal(ctx.teamPicksSpot({ left: 0, top: 0, width: 0, height: 0 }, 150), null);
    assert.equal(ctx.teamPicksSpot(null, 150), null);
});

function setup(fake, { answer = true, panel = '<div id="ujs_OrdersList"><div id="ujs_OrdersList_pch"></div></div>' } = {}) {
    const { dom, $ } = createDom(panel, "https://war.app/MultiPlayer?GameID=123");
    const intervals = [];
    const questions = [];
    const errors = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        UJS_Hooks: fake.hooks,
        addCSS: () => { },
        setInterval: (fn) => intervals.push(fn),
        setTimeout: () => 1,
        clearTimeout: () => { },
        confirm: (question) => { questions.push(question); return answer; },
        logError: (entry) => errors.push(entry)
    });
    ctx.setupTeamPicksCopy();
    const tick = () => intervals.forEach((fn) => fn());
    return { $, tick, questions, errors };
}

test("a Copy button per teammate appears while picking and fills in your picks on click", () => {
    const fake = fakeHooks({ sent: [[2, { qqa: [7, 3, 9] }], [3, { qqa: [5] }]] });
    const { $, tick, questions } = setup(fake);
    tick();
    const buttons = $("#tuydTeamPicks .tuydTeamPicksBtn");
    assert.deepStrictEqual(buttons.get().map((button) => button.textContent), ["Copy Ally's picks", "Copy Other ally's picks"]);
    buttons.eq(0).trigger("click");
    assert.deepStrictEqual(questions, [], "no picks of your own to replace");
    assert.deepStrictEqual(fake.calls.map((call) => call[0]), ["H0", "nv"]);
    assert.deepStrictEqual(plain(fake.calls[0][1]).map((order) => order.nc), [7, 3, 9]);
    assert.match($("#tuydTeamPicks .tuydTeamPicksBtn").eq(0).text(), /^Copied: check, then commit$/);
});

test("declining the replace question leaves your picks alone", () => {
    const fake = fakeHooks({ own: [4] });
    const { $, tick, questions } = setup(fake, { answer: false });
    tick();
    $("#tuydTeamPicks .tuydTeamPicksBtn").trigger("click");
    assert.equal(questions.length, 1);
    assert.deepStrictEqual(fake.calls, []);
});

test("the buttons go when there's nothing to copy or no Orders panel", () => {
    const fake = fakeHooks();
    const { $, tick } = setup(fake);
    tick();
    assert.equal($("#tuydTeamPicks .tuydTeamPicksBtn").length, 1);
    fake.hooks.ya.uc = () => ({ eb: () => 1, lh: true });
    tick();
    assert.equal($("#tuydTeamPicks").length, 0, "after committing");
    const hidden = setup(fakeHooks(), { panel: '<div style="display: none"><div id="ujs_OrdersList_pch"></div></div>' });
    hidden.tick();
    assert.equal(hidden.$("#tuydTeamPicks").length, 0);
});

test("a war.app error while copying is logged and nothing else happens", () => {
    const fake = fakeHooks();
    fake.hooks.Od.H0 = () => { throw new Error("broken"); };
    const { $, tick, errors } = setup(fake);
    tick();
    $("#tuydTeamPicks .tuydTeamPicksBtn").trigger("click");
    assert.equal(errors.length, 1);
    assert.equal($("#tuydTeamPicks .tuydTeamPicksBtn").text(), "Copy Ally's picks");
});

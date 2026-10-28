const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const FUNCTIONS = ["shownUjsElement", "gameNotesButtonSpot", "gameNotesTitleSpot", "gameTitleBarRects", "gameNotesButtonSettled", "gameLobbyNotJoined", "openGameChatTabRect", "gameNotesKey", "normalizeGameNotes", "gameNotesEmpty", "gamePlayerNames", "gameTurnNumber", "gameFirstMoveText", "gameNotesHtml", "chatLinkAdded", "insertAtCursor", "gameMapPlaces", "notesPlaces", "highlightPlace", "gameLive", "canHighlightPlaces", "readGameNotesPanel", "setupGameNotes", "htmlEscape"];

// Mirrors the bits of war.app's game page the notes read (names are invented).
const GAME_PAGE = `<div id="ujs_GameNameLabel">Test cup: Game 2</div>
    <div id="ujs_TurnNumberLabel"><div id="ujs_TurnNumberLabel_tmp">Turn 3</div></div>
    <div id="ujs_PlayerNameContainer_3"><span>L61</span>  <span>Me</span><div id="ujs_PlayerNameContainer_3_tmp"></div></div>
    <div id="ujs_PlayerNameContainer_4"><span>L58</span>  <span>Alice</span></div>`;

function setup(stored, url = "https://war.app/MultiPlayer?GameID=123", { html = GAME_PAGE, title } = {}) {
    const { dom, $ } = createDom(html, url);
    if (title) {
        dom.window.document.title = title;
    }
    const settings = new Map(stored ? [["gameNotes:123", { name: "gameNotes:123", value: stored }]] : []);
    const timers = [];
    const intervals = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        location: dom.window.location,
        innerHeight: 768,
        addEventListener: () => { },
        GAME_NOTES_SETTLE_MS: 500,
        GAME_NOTES_SETTLE_MAX_MS: 3000,
        addCSS: () => { },
        setTimeout: (fn) => { timers.push(fn); return timers.length; },
        clearTimeout: () => { },
        setInterval: (fn) => intervals.push(fn) - 1,
        clearInterval: (id) => { if (id != null) { intervals[id] = null; } },
        playerDataReady: $.Deferred().resolve({ Name: "Me" }).promise(),
        Database: {
            Table: { Settings: "Settings" },
            Row: { Settings: { Name: "name" } },
            readIndex: (table, row, value, callback) => callback(settings.get(value)),
            update: (table, row) => { settings.set(row.name, JSON.parse(JSON.stringify(row))); return Promise.resolve(); },
            delete: (table, key) => { settings.delete(key); return Promise.resolve(); }
        }
    });
    ctx.setupGameNotes();
    const runTimers = () => timers.splice(0).forEach((fn) => fn());
    const runIntervals = () => intervals.slice().forEach((fn) => fn && fn());
    return { ctx, $, dom, settings, runTimers, runIntervals };
}

test("lists the other players without their level", () => {
    const { ctx } = setup();
    assert.deepEqual(Array.from(ctx.gamePlayerNames("Me")), ["Alice"]);
    assert.deepEqual(Array.from(ctx.gamePlayerNames("")), ["Me", "Alice"]);
});

test("says who moves first this turn", () => {
    const { ctx } = setup();
    assert.equal(ctx.gameTurnNumber(), 3);
    assert.equal(ctx.gameFirstMoveText("odd", 3), "Turn 3: you move first");
    assert.equal(ctx.gameFirstMoveText("even", 3), "Turn 3: you move second");
    assert.equal(ctx.gameFirstMoveText("even", 4), "Turn 4: you move first");
    assert.equal(ctx.gameFirstMoveText("", 4), "");
});

test("the turn being played is the highest of war.app's turn labels, whichever view is shown", () => {
    const turn = (html) => {
        const { dom, $ } = createDom(html);
        return load(["gameTurnNumber"], domGlobals(dom, $)).gameTurnNumber();
    };
    const label = (id, text, hidden) => `<div id="ujs_${id}"${hidden ? ' style="display: none"' : ""}><span id="ujs_${id}_tmp">${text}</span></div>`;
    assert.equal(turn(label("TurnNumberLabel", "Turn 3") + label("TurnNumberLabel_3", "Turn 2")), 3, "the replay of the turn that just finished is a turn behind");
    assert.equal(turn(label("TurnNumberLabel_3", "Turn 2") + label("HistoryInfoLabel", "Turn 2 of 2")), 3, "Turn 2 of 2 in the history: turn 3 is being played");
    assert.equal(turn(label("TurnNumberLabel", "Turn 4", true) + label("HistoryInfoLabel", "History: Game Start")), 4, "history open at the start");
    assert.equal(turn(label("HistoryInfoLabel", "Turn x of y", true)), null);
});

test("stored notes are normalized, so bad imports fall back to empty notes", () => {
    const { ctx } = setup();
    const notes = JSON.parse(JSON.stringify(ctx.normalizeGameNotes({ text: 5, firstMove: "third", players: { Alice: "ally", Bob: " ", Cy: 3 } })));
    assert.deepEqual(notes, { text: "", firstMove: "", players: { Alice: "ally" }, name: "" });
    assert.ok(ctx.gameNotesEmpty(ctx.normalizeGameNotes(null)));
    assert.ok(!ctx.gameNotesEmpty(ctx.normalizeGameNotes({ firstMove: "odd" })));
});

test("the Notes button opens a panel with general, move-order and player notes, and saves them", async () => {
    const { $, settings, runTimers } = setup();
    assert.equal($("#tuydGameNotesBtn").hasClass("tuydHasNotes"), false);
    $("#tuydGameNotesBtn").trigger("click");
    const panel = $("#tuydGameNotes");
    assert.equal(panel.length, 1);
    assert.deepEqual(Array.from(panel.find("textarea[data-player]").map((i, el) => $(el).attr("data-player")).get()), ["Alice"]);
    panel.find("textarea[name=text]").val("Take Africa first").trigger("input");
    panel.find("select[name=firstMove]").val("odd").trigger("change");
    assert.equal(panel.find(".tuydGameNotesTurn").text(), "Turn 3: you move first");
    panel.find("textarea[data-player='Alice']").val("Agreed no attacks until turn 10").trigger("input");
    runTimers();
    await flush();
    assert.deepEqual(settings.get("gameNotes:123").value, {
        text: "Take Africa first", firstMove: "odd", players: { Alice: "Agreed no attacks until turn 10" }, name: "Test cup: Game 2"
    });
    assert.equal(panel.find(".tuydGameNotesSaved").text(), "Saved");
    assert.equal($("#tuydGameNotesBtn").hasClass("tuydHasNotes"), true);
});

test("saved notes come back, players no longer on the page included, and clearing them deletes the row", async () => {
    const { $, settings, runTimers } = setup({ text: "Old plan", firstMove: "even", players: { Bob: "Left the game" } });
    assert.equal($("#tuydGameNotesBtn").hasClass("tuydHasNotes"), true);
    $("#tuydGameNotesBtn").trigger("click");
    const panel = $("#tuydGameNotes");
    assert.equal(panel.find("textarea[name=text]").val(), "Old plan");
    assert.equal(panel.find("select[name=firstMove]").val(), "even");
    assert.equal(panel.find("textarea[data-player='Bob']").val(), "Left the game");
    panel.find("textarea").val("").trigger("input");
    panel.find("select[name=firstMove]").val("").trigger("change");
    $("#tuydGameNotes .tuydGameNotesClose").trigger("click");
    await flush();
    assert.equal($("#tuydGameNotes").length, 0);
    assert.equal(settings.has("gameNotes:123"), false, "closing saves straight away");
    runTimers();
});

test("keys typed in the notes don't reach war.app's hotkeys, but the Notes button lets them through", () => {
    const { $, dom } = setup();
    let keys = 0;
    let pointers = 0;
    $(dom.window.document).on("keydown", () => keys++).on("pointerdown", () => pointers++);
    $("#tuydGameNotesBtn").trigger("click");
    $("#tuydGameNotes textarea").first().trigger("keydown").trigger("pointerdown");
    assert.equal(keys, 0);
    $("#tuydGameNotesBtn").trigger("keydown").trigger("pointerdown");
    assert.equal(keys, 1, "a focused Notes button doesn't swallow war.app's shortcuts");
    assert.equal(pointers, 0, "nor does a click on it reach the map");
});

test("a click outside the notes hands the keyboard back to war.app, and the notes stay open", () => {
    const { $, dom } = setup();
    const document = dom.window.document;
    $("body").append('<div id="UjsWorldHolder"><canvas></canvas></div>');
    $("#tuydGameNotesBtn").trigger("click");
    const box = $("#tuydGameNotes textarea[name=text]")[0];
    box.focus();
    assert.equal(document.activeElement, box);
    box.dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true }));
    assert.equal(document.activeElement, box, "a click inside the notes keeps typing there");
    $("#UjsWorldHolder canvas")[0].dispatchEvent(new dom.window.MouseEvent("pointerdown", { bubbles: true }));
    assert.notEqual(document.activeElement, box);
    assert.equal($("#tuydGameNotes").length, 1);
});

test("clicking Notes doesn't leave the button holding the keyboard", () => {
    const { $, dom } = setup();
    const button = $("#tuydGameNotesBtn")[0];
    button.focus();
    $(button).trigger("click");
    assert.notEqual(dom.window.document.activeElement, button);
});

test("the Notes button sits next to war.app's Game button, and left of the Chat tab while the chat is open", () => {
    const { ctx } = setup();
    const spot = (...args) => JSON.parse(JSON.stringify(ctx.gameNotesButtonSpot(...args)));
    assert.deepEqual(spot(null, 768, 56), { left: 96, bottom: 10, onChat: false });
    assert.deepEqual(spot({ left: 372, bottom: 451, height: 17 }, 768, 50), { left: 314, bottom: 317, onChat: true });
    assert.deepEqual(spot({ left: 20, bottom: 451, height: 17 }, 768, 50), { left: 8, bottom: 317, onChat: true });
});

test("a closed chat doesn't move the button", () => {
    const { ctx, $ } = setup();
    $("body").append('<div id="ujs_Chat" style="display: none"><div id="ujs_ChatTab"></div></div><div id="ujs_ChatCollapseButton"><a id="ujs_ChatCollapseButton_btn"></a></div>');
    assert.equal(ctx.openGameChatTabRect(), null);
    assert.equal($("#tuydGameNotesBtn").hasClass("tuydOnChat"), false);
});

test("the Notes button goes in the title bar after the setting icons, when there's room", () => {
    const ctx = load(["gameNotesTitleSpot"]);
    const bar = { left: 0, top: 72, right: 1024, bottom: 102, width: 1024, height: 30 };
    const icons = { left: 225, right: 354 };
    // Measured on a finished NC 26 game, October 2026: name to 223px, icons to 354px.
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.gameNotesTitleSpot(bar, icons, [3, 36, 225, 240], 52, 18))), { left: 364, top: 78, barBottom: 102 });
    assert.equal(ctx.gameNotesTitleSpot(bar, icons, [400], 52, 18), null, "war.app's clock or buttons right after the icons leave no room");
    assert.equal(ctx.gameNotesTitleSpot({ ...bar, right: 400, width: 400 }, icons, [], 52, 18), null, "a narrow window");
    assert.equal(ctx.gameNotesTitleSpot(null, icons, [], 52, 18), null, "no title bar (a lobby)");
});

test("the Notes button waits, hidden, until war.app has laid out the title bar", () => {
    const ctx = load(["gameNotesButtonSettled"], { GAME_NOTES_SETTLE_MS: 500 });
    const waiting = { key: null, since: 0, until: 3000 };
    assert.equal(ctx.gameNotesButtonSettled(waiting, "title:120:80", true, 0), false, "a first spot isn't trusted");
    assert.equal(ctx.gameNotesButtonSettled(waiting, "title:364:80", true, 300), false, "the name and icons grew: a new spot");
    assert.equal(ctx.gameNotesButtonSettled(waiting, "title:364:80", true, 700), false);
    assert.equal(ctx.gameNotesButtonSettled(waiting, "title:364:80", true, 850), true, "the same spot for half a second");
    const icons = { key: null, since: 0, until: 3000 };
    assert.equal(ctx.gameNotesButtonSettled(icons, "title:120:80", false, 0), false);
    assert.equal(ctx.gameNotesButtonSettled(icons, "title:120:80", false, 1500), false, "setting icons not drawn yet: keep waiting");
    assert.equal(ctx.gameNotesButtonSettled(icons, "title:120:80", false, 3000), true, "but never more than a few seconds");
});

test("the Notes button starts hidden on a game page", () => {
    const { $ } = setup();
    assert.ok($("#tuydGameNotesBtn").hasClass("tuydNotesWaiting"));
});

test("Notes are set up on war.app's client-drawn pages, which can open a game without a page load", () => {
    const at = (url, html = "") => {
        const { dom, $ } = createDom(html, url);
        return load(["pageIsGame", "pageIsQuickmatch", "pageIsIdle", "pageCanOpenGame"], { ...domGlobals(dom, $), location: dom.window.location }).pageCanOpenGame();
    };
    const holder = '<div id="UjsCanvasHolder"></div>';
    assert.ok(at("https://war.app/MultiPlayer?GameID=45571006"));
    assert.ok(at("https://war.app/MultiPlayer?Quickmatch=1", holder));
    assert.ok(at("https://war.app/MultiPlayer/Tournament?ID=5", holder));
    assert.ok(!at("https://war.app/MultiPlayer/"), "the dashboard opens games with a page load");
    assert.ok(!at("https://war.app/Idle/Play", holder), "Idle never opens a game");
});

test("a game opened from Quickmatch without a page load gets its Notes button and notes", () => {
    const { $, dom, runIntervals } = setup({ text: "Old plan", firstMove: "", players: {} }, "https://war.app/MultiPlayer?Quickmatch=1", { html: "" });
    assert.equal($("#tuydGameNotesBtn").css("display"), "none");
    dom.window.history.pushState(null, "", "/MultiPlayer?GameID=123");
    $("body").append(GAME_PAGE);
    runIntervals();
    assert.notEqual($("#tuydGameNotesBtn").css("display"), "none");
    assert.ok($("#tuydGameNotesBtn").hasClass("tuydHasNotes"));
    dom.window.history.pushState(null, "", "/MultiPlayer?Quickmatch=1");
    runIntervals();
    assert.equal($("#tuydGameNotesBtn").css("display"), "none", "back on Quickmatch, no button");
});

test("in a lobby war.app still offers you to join, there's no Notes button", async () => {
    const join = `<div id="ujs_JoinBtn"><a id="ujs_JoinBtn_btn" class="ujsBtnInner"></a><div id="ujs_Text_9"><div id="ujs_Text_9_tmp" class="ujsTextInner">Join Game</div></div></div>`;
    const { $, runTimers } = setup(null, undefined, { html: GAME_PAGE + join, title: "Lobby - Modern Warfare Remastered II* - War.app" });
    assert.ok($("#tuydGameNotesBtn").hasClass("tuydNotesOutsider"));
    $("#ujs_JoinBtn").remove();
    await flush();
    runTimers();
    assert.ok(!$("#tuydGameNotesBtn").hasClass("tuydNotesOutsider"), "joined: the button comes back");
    const inGame = setup(null, undefined, { html: GAME_PAGE + join, title: "Turn 3 - Modern Warfare - War.app" });
    assert.ok(!inGame.$("#tuydGameNotesBtn").hasClass("tuydNotesOutsider"), "only lobbies; a started game's own buttons don't count");
});

test("war.app's chat link text is recognised, and words go in at the cursor with spaces around them", () => {
    const { ctx } = setup();
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.chatLinkAdded("hi", "hi <a t_11735>Elos</a>"))), { kind: "territory", id: "11735", name: "Elos" });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.chatLinkAdded("", "<a b_42>Northern Bonus</a>"))), { kind: "bonus", id: "42", name: "Northern Bonus" });
    assert.equal(ctx.chatLinkAdded("hi", "hi there"), null, "typing");
    assert.equal(ctx.chatLinkAdded("hello", "help <a t_1>X</a>"), null, "not an addition to the same text");
    assert.equal(ctx.chatLinkAdded(undefined, "<a t_1>X</a>"), null, "a chat box not seen before");
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.insertAtCursor("Take then hold", 5, 5, "Elos"))), { value: "Take Elos then hold", caret: 10 });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.insertAtCursor("Take", 4, 4, "Elos"))), { value: "Take Elos", caret: 9 });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.insertAtCursor("", 0, 0, "Elos"))), { value: "Elos", caret: 4 });
    assert.equal(ctx.insertAtCursor("Take X now", 5, 6, "Elos").value, "Take Elos now", "replaces a selection");
});

test("while the notes are open, a territory linked in the chat goes into the notes, not the chat", () => {
    const chat = `<div id="ujs_SendChatInput"><textarea id="ujs_SendChatInput_input" class="ujsInner ujsInputField"></textarea></div>`
        + `<div id="ujs_LinkButton"><a id="ujs_LinkButton_btn" class="ujsBtnInner" href="#"></a></div>`;
    const { $, runIntervals, runTimers } = setup(null, undefined, { html: GAME_PAGE + chat });
    const box = $("#ujs_SendChatInput_input")[0];
    box.value = "gg ";
    $("#tuydGameNotesBtn").trigger("click");
    const notes = $("#tuydGameNotes textarea[name=text]")[0];
    notes.value = "Take first";
    notes.setSelectionRange(5, 5);
    $(notes).trigger("focusin");
    let pressed = 0;
    $("#ujs_LinkButton_btn").on("click", () => { pressed++; });
    $("#tuydGameNotes .tuydGameNotesLink").trigger("click");
    assert.equal(pressed, 1, "the notes' link button presses war.app's own");
    box.value = "gg <a t_11735>Elos</a>";
    runIntervals();
    assert.equal(box.value, "gg ", "the link is taken back out of the chat box");
    assert.equal(notes.value, "Take Elos first");
    runTimers();
    $("#tuydGameNotesBtn").trigger("click");
    assert.equal($("#tuydGameNotes").length, 0);
    box.value = "gg <a t_1>Ruth</a>";
    runIntervals();
    assert.equal(box.value, "gg <a t_1>Ruth</a>", "with the notes closed, links stay in the chat");
});

test("without war.app's chat, the notes' link button says what to do", () => {
    const { $ } = setup();
    $("#tuydGameNotesBtn").trigger("click");
    $("#tuydGameNotes .tuydGameNotesLink").trigger("click");
    assert.equal($("#tuydGameNotes .tuydGameNotesSaved").text(), "Open the chat once to link territories");
});

// Shaped like war.app's game data and game object on a game page (window.UJS_Hooks), with invented places.
function fakeHooks(calls) {
    const dict = (entries) => ({ keys: Object.keys(entries).map(Number), Aa: (id) => entries[id] });
    const territory = (name) => ({ Ya: name, lh: () => ({ x: 1, y: 2, name }) });
    return {
        za: { Map: {
            Ia: dict({ 1: territory("Sudan"), 2: territory("South Sudan"), 3: territory("Elos"), 4: territory("Western Sahara") }),
            pd: dict({ 10: { Ya: "Maghreb" }, 11: { Ya: "Western Sahara" } })
        } },
        Sd: { ta: {
            nv: (id) => calls.push("highlight " + id), Au: (bonus) => calls.push("highlight bonus " + bonus.Ya),
            Xb: { xI: (at) => calls.push("move to " + at.name), wQa: (bonus) => calls.push("move to bonus " + bonus.Ya) }
        } }
    };
}

test("the territories and bonuses a note names are found, longest names first, territories over bonuses", () => {
    const { ctx } = setup();
    const places = ctx.gameMapPlaces(fakeHooks([]));
    assert.equal(places.length, 6);
    const named = (text) => Array.from(ctx.notesPlaces(text, places).map((place) => place.kind + ":" + place.name));
    assert.deepEqual(named("Take Elos, then south sudan; hold Maghreb"), ["territory:Elos", "territory:South Sudan", "bonus:Maghreb"], "in the note's order, any case");
    assert.deepEqual(named("Sudan and South Sudan"), ["territory:Sudan", "territory:South Sudan"], "Sudan inside South Sudan isn't counted again");
    assert.deepEqual(named("Western Sahara"), ["territory:Western Sahara"], "a territory over a bonus of the same name");
    assert.deepEqual(named("Elosian Elos Elos"), ["territory:Elos"], "whole words, each place once");
    assert.equal(ctx.gameMapPlaces({}).length, 0);
});

test("a place's button shows it on war.app's map the way a chat link does, and nothing happens without war.app's game", () => {
    const calls = [];
    const { ctx } = setup();
    const hooks = fakeHooks(calls);
    assert.equal(ctx.highlightPlace(hooks, { kind: "territory", id: 3, name: "Elos" }), true);
    assert.equal(ctx.highlightPlace(hooks, { kind: "bonus", id: 10, name: "Maghreb" }), true);
    assert.deepEqual(calls, ["highlight 3", "move to Elos", "highlight bonus Maghreb", "move to bonus Maghreb"]);
    assert.equal(ctx.canHighlightPlaces(hooks), true);
    assert.equal(ctx.canHighlightPlaces({ Sd: { ta: {} } }), false, "war.app renamed its functions");
    assert.equal(ctx.highlightPlace({ Sd: { ta: {} } }, { kind: "territory", id: 3, name: "Elos" }), false);
});

test("the notes show a button for each place they name, which highlights it", () => {
    const calls = [];
    const { ctx, $ } = setup({ text: "Take Elos first", firstMove: "", players: {} });
    ctx.UJS_Hooks = fakeHooks(calls);
    $("#tuydGameNotesBtn").trigger("click");
    const row = () => $("#tuydGameNotes textarea[name=text]").next(".tuydNotesPlaces");
    assert.deepEqual(row().find(".tuydNotesPlace").map((i, a) => $(a).text()).get(), ["Elos"]);
    const notes = $("#tuydGameNotes textarea[name=text]");
    notes.val("Take Elos first, then Maghreb").trigger("input");
    assert.deepEqual(row().find(".tuydNotesPlace").map((i, a) => $(a).text()).get(), ["Elos", "Maghreb"]);
    assert.ok(row().find(".tuydNotesPlace").last().hasClass("tuydNotesBonus"));
    row().find(".tuydNotesPlace").first().trigger("click");
    assert.deepEqual(calls, ["highlight 3", "move to Elos"]);
});

test("place names from war.app's game data stay text in their buttons", () => {
    const PAYLOAD = `"><img src=x onerror="alert(1)">`;
    const { ctx, $ } = setup({ text: "Go " + PAYLOAD, firstMove: "", players: {} });
    const hooks = fakeHooks([]);
    hooks.za.Map.Ia = { keys: [9], Aa: () => ({ Ya: PAYLOAD, lh: () => ({}) }) };
    ctx.UJS_Hooks = hooks;
    $("#tuydGameNotesBtn").trigger("click");
    const button = $("#tuydGameNotes .tuydNotesPlace");
    assert.equal(button.length, 1);
    assert.equal(button.text(), PAYLOAD);
    assert.equal($("#tuydGameNotes img").length, 0);
});

// Mirrors war.app's Live object: AKc / zKc set the one-shot callback for the next territory click or bonus
// link click, first calling the one they replace with null; a click hands the callback the place.
function fakeLive() {
    const live = {
        c$: null, b$: null,
        AKc(cb) { const old = this.c$; this.c$ = null; if (old) old(null); this.c$ = cb; },
        zKc(cb) { const old = this.b$; this.b$ = null; if (old) old(null); this.b$ = cb; },
        clickTerritory(name) { const cb = this.c$; this.c$ = null; return cb ? !!cb({ Ya: name }) : false; },
        clickBonus(name) { const cb = this.b$; this.b$ = null; return cb ? !!cb({ Ya: name }) : false; }
    };
    return live;
}

test("with war.app's click hook, the notes' 🔗 takes the next territory or bonus clicked, chat open or not", () => {
    const { ctx, $, runTimers } = setup();
    const live = fakeLive();
    ctx.UJS_Hooks = { Sd: { ta: { Nh: live } } };
    $("#tuydGameNotesBtn").trigger("click");
    const notes = $("#tuydGameNotes textarea[name=text]")[0];
    notes.value = "Take first";
    notes.setSelectionRange(5, 5);
    $(notes).trigger("focusin");
    const link = $("#tuydGameNotes .tuydGameNotesLink");
    link.trigger("click");
    assert.ok(link.hasClass("tuydLinking"));
    assert.equal($("#tuydGameNotes .tuydGameNotesSaved").text(), "Click a territory or bonus");
    assert.equal(live.clickTerritory("Elos"), true, "war.app is told the click is taken, so it does nothing else with it");
    assert.equal(notes.value, "Take Elos first");
    assert.equal(live.c$, null, "one click only");
    assert.equal(live.b$, null, "the bonus hook is let go too");
    assert.ok(!link.hasClass("tuydLinking"));
    runTimers();
    link.trigger("click");
    assert.equal(live.clickBonus("Maghreb"), true);
    assert.match(notes.value, /Maghreb/);
    link.trigger("click");
    link.trigger("click");
    assert.equal(live.c$, null, "a second click on 🔗 lets war.app have its clicks back");
    link.trigger("click");
    $("#tuydGameNotes .tuydGameNotesClose").trigger("click");
    assert.equal(live.c$, null, "and so does closing the notes");
    assert.equal(live.clickTerritory("Ruth"), false);
});

test("as in war.app's chat, Ctrl/Cmd+click or Shift+click puts a territory in the open notes, without the 🔗", () => {
    const { ctx, $, dom } = setup();
    const live = fakeLive();
    ctx.UJS_Hooks = { Sd: { ta: { Nh: live } } };
    const key = (type, init) => dom.window.document.dispatchEvent(new dom.window.KeyboardEvent(type, { bubbles: true, ...init }));
    key("keydown", { key: "Shift", shiftKey: true });
    assert.equal(live.c$, null, "with the notes closed, the keys are war.app's");
    key("keyup", { key: "Shift" });
    $("#tuydGameNotesBtn").trigger("click");
    const notes = $("#tuydGameNotes textarea[name=text]")[0];
    notes.value = "Hold";
    notes.setSelectionRange(4, 4);
    $(notes).trigger("focusin");
    key("keydown", { key: "Control", ctrlKey: true });
    assert.equal(typeof live.c$, "function", "holding Ctrl waits for a click");
    assert.equal(live.clickTerritory("Elos"), true);
    assert.equal(live.clickTerritory("Cortius"), true, "still held: the next click is taken too");
    assert.equal(notes.value, "Hold Elos Cortius");
    key("keyup", { key: "Control" });
    assert.equal(live.c$, null, "letting go gives war.app its clicks back");
    assert.equal(live.clickTerritory("Ruth"), false);
    key("keydown", { key: "Meta", metaKey: true });
    assert.equal(live.clickBonus("Maghreb"), true, "Cmd on a Mac, and bonus links");
    key("keyup", { key: "Meta" });
    assert.match(notes.value, /Maghreb$/);
    key("keydown", { key: "Shift", shiftKey: true });
    $("#tuydGameNotes .tuydGameNotesClose").trigger("click");
    assert.equal(live.c$, null, "closing the notes lets go too");
});

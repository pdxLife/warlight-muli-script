const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const FUNCTIONS = ["shownUjsElement", "gameNotesButtonSpot", "gameNotesTitleSpot", "gameTitleBarRects", "gameNotesButtonSettled", "gameLobbyNotJoined", "openGameChatTabRect", "gameNotesKey", "normalizeGameNotes", "gameNotesEmpty", "gamePlayerNames", "gameTurnNumber", "gameFirstMoveText", "gameNotesHtml", "readGameNotesPanel", "setupGameNotes", "htmlEscape"];

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
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        location: dom.window.location,
        innerHeight: 768,
        GAME_NOTES_SETTLE_MS: 500,
        GAME_NOTES_SETTLE_MAX_MS: 3000,
        addCSS: () => { },
        setTimeout: (fn) => { timers.push(fn); return timers.length; },
        clearTimeout: () => { },
        setInterval: () => { },
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
    return { ctx, $, dom, settings, runTimers };
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

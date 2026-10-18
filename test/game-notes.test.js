const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const FUNCTIONS = ["shownUjsElement", "gameNotesButtonSpot", "openGameChatTabRect", "gameNotesKey", "normalizeGameNotes", "gameNotesEmpty", "gamePlayerNames", "gameTurnNumber", "gameFirstMoveText", "gameNotesHtml", "readGameNotesPanel", "setupGameNotes", "htmlEscape"];

// Mirrors the bits of war.app's game page the notes read (names are invented).
const GAME_PAGE = `<div id="ujs_GameNameLabel">Test cup: Game 2</div>
    <div id="ujs_TurnNumberLabel"><div id="ujs_TurnNumberLabel_tmp">Turn 3</div></div>
    <div id="ujs_PlayerNameContainer_3"><span>L61</span>  <span>Me</span><div id="ujs_PlayerNameContainer_3_tmp"></div></div>
    <div id="ujs_PlayerNameContainer_4"><span>L58</span>  <span>Alice</span></div>`;

function setup(stored, url = "https://war.app/MultiPlayer?GameID=123") {
    const { dom, $ } = createDom(GAME_PAGE, url);
    const settings = new Map(stored ? [["gameNotes:123", { name: "gameNotes:123", value: stored }]] : []);
    const timers = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        location: dom.window.location,
        innerHeight: 768,
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

test("keys typed in the notes don't reach war.app's hotkeys", () => {
    const { $, dom } = setup();
    let reached = 0;
    $(dom.window.document).on("keydown pointerdown", () => reached++);
    $("#tuydGameNotesBtn").trigger("click");
    $("#tuydGameNotes textarea").first().trigger("keydown").trigger("pointerdown");
    $("#tuydGameNotesBtn").trigger("pointerdown");
    assert.equal(reached, 0);
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

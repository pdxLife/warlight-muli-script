const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// Mirrors war.app's My Games rows: a game, and an Auto Game still in its lobby (no GameID yet).
const ROWS = `<table id="MyGamesTable"><tbody>
    <tr class="GameRow" gameid="45487618"><td><a href="/MultiPlayer?GameID=45487618&amp;From=MPDashboard"><img></a></td>
        <td><a href="/MultiPlayer?GameID=45487618&amp;From=MPDashboard">NC 26 Regio Coquus: Game 3</a><br><div class="MyGamesGameBoxesRow"></div></td></tr>
    <tr class="GameRow" gameid="45470754"><td><a href="/MultiPlayer?AutoGameID=wlnet_S1v1RT&amp;From=MPDashboard"><img></a></td>
        <td><a href="/MultiPlayer?AutoGameID=wlnet_S1v1RT&amp;From=MPDashboard">1 v 1 real-time (Auto Game)</a></td></tr>
</tbody></table>`;

function message(n, bottom, name, time, text, blocked) {
    return `<div class="ujsGameObject" id="ujs_ChatMessage_${n}" style="bottom: ${bottom}px;">`
        + `<div id="ujs_PlayerNameLabel_${n}"><span id="ujs_PlayerNameLabel_${n}_tmp">${name}</span></div>`
        + `<div id="ujs_TimestampLabel_${n}"><span id="ujs_TimestampLabel_${n}_tmp">${time}</span></div>`
        + `<div id="ujs_MessageLabel_${n}"><span id="ujs_MessageLabel_${n}_tmp">${text}</span></div>`
        + `<div id="ujs_BlacklistLabel_${n}"${blocked ? "" : ' style="display: none;"'}><span id="ujs_BlacklistLabel_${n}_tmp">blocked</span></div></div>`;
}

// Mirrors a game page's chat: public tab with a hidden Send box (a finished game), team tab hidden.
function gamePage({ open = true, canSend = false, team = false, older = false } = {}) {
    return `<div id="ujs_LiveChat"><div id="ujs_ChatCollapseButton"><a id="ujs_ChatCollapseButton_btn" href="#"></a></div>
        <div id="ujs_Chat"${open ? "" : ' style="display: none;"'}>
        <div id="ujs_TabsContainer"${team ? "" : ' style="display: none;"'}><div id="ujs_PublicChatTab"></div><div id="ujs_TeamChatTab"${team ? "" : ' style="display: none;"'}></div></div>
        <div id="ujs_ChatTab">${older ? '<div id="ujs_LoadOlderMessagesBtn"><a id="ujs_LoadOlderMessagesBtn_btn" href="#"></a></div>' : ""}${message(2, 0, "KKND", "2026-10-18 22:23:53", "gg")}${message(1, 36, "baldwin", "2026-10-17 20:28:48", "Every step is tough.")}${message(3, 72, "Spammer", "2026-10-17 10:00:00", "buy gold", true)}
            <div id="ujs_SendChatContainer"${canSend ? "" : ' style="display: none;"'}><textarea id="ujs_SendChatInput_input"></textarea></div></div>
        <div id="ujs_ChatTab_2" style="display: none;"><div id="ujs_SendChatContainer_2"><textarea id="ujs_SendChatInput_2_input"></textarea></div></div>
        </div></div>`;
}

const STATE_FUNCTIONS = ["shownUjsElement", "chatMessages", "gameChatFrameState"];

test("My Games chat buttons go on games, not on Auto Game lobbies", () => {
    const { dom, $ } = createDom(ROWS, "https://war.app/MultiPlayer/");
    const ctx = load(["myGamesChatTargets"], domGlobals(dom, $));
    const targets = Array.from(ctx.myGamesChatTargets()).map((t) => ({ id: t.id, name: t.name, cell: t.cell.cellIndex }));
    assert.deepEqual(JSON.parse(JSON.stringify(targets)), [{ id: "45487618", name: "NC 26 Regio Coquus: Game 3", cell: 1 }]);
});

test("the hidden game's chat is read oldest first, without block-listed messages", () => {
    const { dom, $ } = createDom(gamePage(), "https://war.app/MultiPlayer/");
    const ctx = load(STATE_FUNCTIONS, domGlobals(dom, $));
    const state = ctx.gameChatFrameState(dom.window.document);
    assert.equal(state.ready, true);
    assert.equal(state.open, true);
    assert.equal(state.hasTeam, false);
    assert.equal(state.public.canSend, false, "a finished game hides its Send box");
    assert.equal(state.public.older, null);
    assert.deepEqual(JSON.parse(JSON.stringify(state.public.messages.map((m) => [m.name, m.time, m.text]))),
        [["baldwin", "2026-10-17 20:28:48", "Every step is tough."], ["KKND", "2026-10-18 22:23:53", "gg"]]);
});

test("a closed chat, a team tab and a Send box are told apart", () => {
    const closed = createDom(gamePage({ open: false }), "https://war.app/MultiPlayer/");
    const ctx = load(STATE_FUNCTIONS, domGlobals(closed.dom, closed.$));
    assert.equal(ctx.gameChatFrameState(closed.dom.window.document).open, false);
    const team = createDom(gamePage({ team: true, canSend: true }), "https://war.app/MultiPlayer/");
    const teamCtx = load(STATE_FUNCTIONS, domGlobals(team.dom, team.$));
    const state = teamCtx.gameChatFrameState(team.dom.window.document);
    assert.equal(state.hasTeam, true);
    assert.equal(state.public.canSend, true);
    assert.equal(state.team.canSend, false, "the team tab's box counts only while that tab is shown");
});

test("a chat with older messages in the game names its Load Older Messages button", () => {
    const { dom, $ } = createDom(gamePage({ older: true }), "https://war.app/MultiPlayer/");
    const ctx = load(STATE_FUNCTIONS, domGlobals(dom, $));
    assert.equal(ctx.gameChatFrameState(dom.window.document).public.older, "ujs_LoadOlderMessagesBtn");
});

test("only the newest messages are shown at first, with a way to show all", () => {
    const ctx = load(["renderGameChatMessages", "htmlEscape"]);
    const messages = Array.from({ length: 25 }, (_, i) => ({ name: "Ann", time: "t" + i, text: "m" + i }));
    const limited = ctx.renderGameChatMessages(messages, [], 20, false);
    assert.equal((limited.match(/tuydGameChatMsg/g) || []).length, 20);
    assert.doesNotMatch(limited, />m4</);
    assert.match(limited, />m5</);
    assert.match(limited, /Showing the last 20 messages of 25\. <a href="#" class="tuydGameChatShowAll">Show all/);
    assert.match(ctx.renderGameChatMessages(messages.slice(0, 5), [], 20, true), /Showing the last 5 messages\. <a/, "older messages still in the game count too");
    assert.doesNotMatch(ctx.renderGameChatMessages(messages.slice(0, 5), [], 20, false), /Show all/);
    assert.equal((ctx.renderGameChatMessages(messages, [], Infinity, false).match(/tuydGameChatMsg/g) || []).length, 25);
});

test("shownUjsElement works on elements of another document, such as the hidden game", () => {
    const { dom, $ } = createDom("", "https://war.app/MultiPlayer/");
    const other = createDom('<div id="a"><span id="b"></span></div><div style="display: none"><span id="c"></span></div>');
    const ctx = load(["shownUjsElement"], domGlobals(dom, $));
    assert.equal(ctx.shownUjsElement(other.dom.window.document.getElementById("b")), true);
    assert.equal(ctx.shownUjsElement(other.dom.window.document.getElementById("c")), false);
    assert.equal(ctx.shownUjsElement(null), false);
});

test("muted players' messages become a faint line, and an empty chat says so", () => {
    const ctx = load(["renderGameChatMessages", "htmlEscape"]);
    const html = ctx.renderGameChatMessages([{ name: "Ann", time: "t1", text: "hi" }, { name: "Bo", time: "t2", text: "spam" }], ["Bo"], 20, false);
    assert.match(html, /Ann/);
    assert.doesNotMatch(html, /spam/);
    assert.match(html, /tuydGameChatMutedMsg">muted</);
    assert.match(ctx.renderGameChatMessages([], [], 20, false), /No messages yet/);
});

test("the script knows when it runs inside the dashboard's hidden game, and does nothing there", () => {
    const framed = load(["inScriptFrame"], { GAME_CHAT_FRAME_ID: "tuydGameChatFrame", GAME_TEMPLATE_FRAME_ID: "tuydGameTemplateFrame", frameElement: { id: "tuydGameChatFrame" } });
    assert.equal(framed.inScriptFrame(), true);
    const top = load(["inScriptFrame"], { GAME_CHAT_FRAME_ID: "tuydGameChatFrame", GAME_TEMPLATE_FRAME_ID: "tuydGameTemplateFrame", frameElement: null });
    assert.equal(top.inScriptFrame(), false);
});

test("the script's hidden copy of a game plays no sounds", async () => {
    let muted = 0;
    function HTMLMediaElement() { }
    HTMLMediaElement.prototype.play = () => { throw new Error("a hidden game played a sound"); };
    const intervals = [];
    const ctx = load(["muteScriptFrame"], {
        HTMLMediaElement,
        soundManager: { mute: () => muted++ },
        setInterval: (fn) => intervals.push(fn)
    });
    ctx.muteScriptFrame();
    await new HTMLMediaElement().play();
    assert.equal(muted, 1, "war.app's sound manager is muted");
    intervals[0]();
    assert.equal(muted, 2, "and kept muted, in case war.app turns it back on");
});

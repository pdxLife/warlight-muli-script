const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors war.app's chat tab: each message has the sender, a timestamp, the text and a block-list
// label shown only for blocked players (names and texts are invented).
function chatMessage(n, bottom, name, time, text, blocked) {
    return `<div class="ujsGameObject" id="ujs_ChatMessage${n ? "_" + n : ""}" style="left: 1px; bottom: ${bottom}px;">`
        + `<div id="ujs_PlayerNameLabel_${n}"><div id="ujs_PlayerNameLabel_${n}_tmp">${name}</div></div>`
        + `<div id="ujs_TimestampLabel_${n}"><div id="ujs_TimestampLabel_${n}_tmp">${time}</div></div>`
        + `<div id="ujs_RightCol_${n}"><div id="ujs_MessageLabel_${n}"><div id="ujs_MessageLabel_${n}_tmp">${text}</div></div>`
        + `<div id="ujs_BlacklistLabel_${n}" ${blocked ? "" : 'style="display: none"'}><div id="ujs_BlacklistLabel_${n}_tmp">** hidden due to block list</div></div></div></div>`;
}

const CHAT = `<div id="ujs_ChatTab"><div id="ujs_Viewport_4"><div id="ujs_Content_5">`
    + chatMessage(3, 140, "Ann", "2026-10-16 19:57:38", "Hello all.")
    + chatMessage(2, 100, "Troll", "2026-10-16 20:00:00", "spam", true)
    + chatMessage(1, 60, "Me", "2026-10-16 20:01:00", "Hi Ann :)")
    + chatMessage(0, 1, "Bo", "2026-10-16 20:02:00", "See https://example.com/x now")
    + `</div></div></div>`;

const FUNCTIONS = ["shownUjsElement", "chatMessages", "chatSpeechText", "speechChunks", "newChatMessages", "chatEventLabel", "chatRoomRows", "chatRoomSpeechMessages", "setupChatSpeech"];

function setup(autoRead, html = CHAT, url = "https://war.app/MultiPlayer?GameID=1") {
    const { dom, $ } = createDom(html, url);
    const spoken = [];
    let cancels = 0;
    const timers = [];
    class Utterance { constructor(text) { this.text = text; } }
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        addCSS: () => { },
        speechSynthesis: { speak: (u) => spoken.push(u), cancel: () => cancels++ },
        SpeechSynthesisUtterance: Utterance,
        setTimeout: (fn) => { timers.push(fn); return timers.length; },
        playerDataReady: $.Deferred().resolve({ Name: "Me" }).promise(),
        ifSettingIsEnabled: (name, yes) => { if (name === "readNewChatAloud" && autoRead) yes(); }
    });
    ctx.setupChatSpeech();
    const tick = async () => { await flush(); timers.splice(0).forEach((fn) => fn()); };
    return { ctx, $, dom, spoken, tick, cancels: () => cancels };
}

test("reads a tab's messages oldest first and leaves out blocked players", () => {
    const { ctx, $ } = setup(false);
    assert.deepEqual(Array.from(ctx.chatMessages($("#ujs_ChatTab")[0]).map((m) => m.name + ": " + m.text)), ["Ann: Hello all.", "Me: Hi Ann :)", "Bo: See https://example.com/x now"]);
});

test("says who wrote it, and reads links and smileys as words", () => {
    const { ctx } = setup(false);
    assert.equal(ctx.chatSpeechText({ name: "Bo", text: "See https://example.com/x now :) ok" }), "Bo: See a link now smiley ok");
    assert.equal(ctx.chatSpeechText({ name: "Ann", text: ":D;) 3:)" }), "Ann: :D;) 3:)", "only smileys standing on their own");
});

test("splits long text into pieces Chrome reads in full", () => {
    const { ctx } = setup(false);
    const chunks = Array.from(ctx.speechChunks("First one. " + "word ".repeat(60).trim() + "! Last?", 100));
    assert.equal(chunks[0], "First one.");
    assert.ok(chunks.every((c) => c.length <= 100), chunks.join("|"));
    assert.equal(chunks.join(" "), "First one. " + "word ".repeat(60).trim() + "! Last?");
});

test("only messages added at the newest end are new", () => {
    const { ctx } = setup(false);
    const m = (text) => ({ name: "A", time: "t", text });
    let result = ctx.newChatMessages([m("1"), m("2")], undefined);
    assert.equal(result.fresh.length, 0, "what's there at first is history");
    result = ctx.newChatMessages([m("0"), m("1"), m("2")], result.lastKey);
    assert.equal(result.fresh.length, 0, "older messages loaded above aren't new");
    result = ctx.newChatMessages([m("0"), m("1"), m("2"), m("3"), m("4")], result.lastKey);
    assert.deepEqual(Array.from(result.fresh.map((x) => x.text)), ["3", "4"]);
});

test("a 🔊 on each message reads from there to the newest, and a second click stops", () => {
    const { $, spoken, cancels } = setup(false);
    assert.equal($(".tuydSpeak").length, 3);
    $("#ujs_ChatMessage_1 > .tuydSpeak").trigger("click");
    assert.deepEqual(spoken.map((u) => u.text), ["Me: Hi Ann smiley", "Bo: See a link now"]);
    assert.equal($("#ujs_ChatMessage_1 > .tuydSpeak").text(), "■");
    $("#ujs_ChatMessage_1 > .tuydSpeak").trigger("click");
    assert.equal($("#ujs_ChatMessage_1 > .tuydSpeak").text(), "🔊");
    assert.ok(cancels() >= 2);
    spoken.length = 0;
    $("#ujs_ChatMessage_3 > .tuydSpeak").trigger("click");
    spoken[spoken.length - 1].onend();
    assert.equal($(".tuydSpeaking").length, 0, "the button resets after the last message");
});

test("with the setting on, new messages from others are read aloud, yours and old ones aren't", async () => {
    const { $, spoken, tick } = setup(true);
    assert.equal(spoken.length, 0);
    $("#ujs_Content_5").prepend(chatMessage(9, 180, "Old", "2026-10-15 10:00:00", "from before"));
    await tick();
    assert.equal(spoken.length, 0);
    $("#ujs_ChatMessage").css("bottom", "40px");
    $("#ujs_Content_5").append(chatMessage(5, 20, "Me", "2026-10-16 20:03:00", "mine") + chatMessage(6, 1, "Cy", "2026-10-16 20:04:00", "Attack now."));
    await tick();
    assert.deepEqual(spoken.map((u) => u.text), ["Cy: Attack now."]);
});

test("does nothing in a browser without speech", () => {
    const { dom, $ } = createDom(CHAT);
    const ctx = load(FUNCTIONS, { ...domGlobals(dom, $), addCSS: () => assert.fail("should not run") });
    ctx.setupChatSpeech();
    assert.equal($(".tuydSpeak").length, 0);
});

// Mirrors war.app's chat room rows (see chat-tools.test.js): the notice is bold italic, and one row is
// hidden the way the script hides a muted player's.
function roomRow(n, bottom, name, text, extra = "") {
    return `<div class="ujsGameObject" id="ujs_ChatRoomMessageControl_${n}" style="bottom: ${bottom}px;${extra}">`
        + `<div id="ujs_LeftCol_${n}"><div id="ujs_PlayerName_${n}"><div class="ujsInner ujsTextInner">${name}</div></div></div>`
        + `<div id="ujs_BubbleImage_${n}"><div class="ujsInner ujsImgInner"></div><div id="ujs_Message_${n}"><div class="ujsInner ujsTextInner" style="${/Joined/.test(text) ? "font-style: italic; font-weight: bold;" : ""}">${text}</div></div></div></div>`;
}

const ROOM = `<div id="ujs_ChatRoomTab"><div id="ujs_ChatContainer">`
    + roomRow(1, 100, "Ann", "First.") + roomRow(2, 75, "Bo", "Joined the group") + roomRow(3, 50, "Muted Guy", "spam", " display: none;")
    + roomRow(4, 25, "Cy", "Second.") + roomRow(5, 0, "Me", "Mine.") + `</div></div>`;

test("chat rooms: a 🔊 on hover reads from there to the newest, skipping notices and hidden rows", () => {
    const { $, spoken } = setup(false, ROOM, "https://war.app/MultiPlayer?ChatRoom=1");
    assert.equal($("#ujs_ChatRoomMessageControl_2 > .tuydSpeak").length, 0, "no button on a notice");
    assert.ok($("#ujs_ChatRoomMessageControl_1 > .tuydSpeak").hasClass("tuydSpeakRoom"));
    $("#ujs_ChatRoomMessageControl_1 > .tuydSpeak").trigger("click");
    assert.deepEqual(spoken.map((u) => u.text), ["Ann: First.", "Cy: Second.", "Me: Mine."]);
});

test("chat rooms: with the setting on, only the tab you're looking at is read", async () => {
    const html = ROOM + `<div id="ujs_ChatRoomTab_2" style="display: none"><div id="ujs_ChatContainer_2">${roomRow(9, 0, "Zed", "Old.")}</div></div>`;
    const { $, spoken, tick } = setup(true, html, "https://war.app/MultiPlayer?ChatRoom=1");
    $("#ujs_ChatContainer_2").append(roomRow(10, -25, "Zed", "Unseen tab."));
    $("#ujs_ChatContainer").append(roomRow(11, -25, "Dee", "New here."));
    await tick();
    assert.deepEqual(spoken.map((u) => u.text), ["Dee: New here."]);
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const EVENT_STYLE = "font-style: italic; font-weight: bold;";

// Mirrors war.app's chat room: tab buttons, and tabs of message rows stacked by `bottom`, newest at 0
// (names and texts are invented; the event notices are war.app's wording).
function roomRow(n, bottom, name, text, event) {
    return `<div class="ujsGameObject" id="ujs_ChatRoomMessageControl_${n}" style="left: 0px; bottom: ${bottom}px;">`
        + `<div class="ujsGameObject ujsPCH" id="ujs_LeftCol_${n}"><div id="ujs_PlayerName_${n}"><div class="ujsInner ujsTextInner">${name}</div></div></div>`
        + `<div class="ujsGameObject ujsImg" id="ujs_BubbleImage_${n}"><div class="ujsInner ujsImgInner" style="width: 120px;"></div>`
        + `<div id="ujs_Message_${n}"><div class="ujsInner ujsTextInner" style="${event ? EVENT_STYLE : ""}">${text}</div></div></div></div>`;
}

function room(tabs) {
    return tabs.map((t, i) => `<div class="ujsGameObject" id="ujs_TabData_${t.id}"><a class="btn ujsInner ujsBtnInner" id="ujs_TabData_${t.id}_btn" href="#"></a><div>${t.name}</div></div>`).join("")
        + tabs.map((t, i) => `<div class="ujsGameObject" id="ujs_ChatRoomTab${i ? "_" + (i + 1) : ""}" ${t.hidden ? 'style="display: none"' : ""}><div id="ujs_ChatContainer_${i}">${t.rows.join("")}</div></div>`).join("");
}

const GROUP_ROWS = [
    roomRow(1, 125, "Ann", "hello"),
    roomRow(2, 100, "Bo", "Joined the group", true),
    roomRow(3, 75, "Cy", "hi KKND, ready?"),
    roomRow(4, 50, "Bo", "Removed from the group due to inactivity", true),
    roomRow(5, 25, "Ann", "@kknd where are you"),
    roomRow(6, 0, "KKND", "here, KKND")
];

const FUNCTIONS = ["shownUjsElement", "chatEventLabel", "chatMentions", "chatRoomRows", "stackChatRows", "readMutedPlayers", "saveMutedPlayers", "chatToolsCss", "confirmMute", "setupChatRoomTools"];

function setupRoom(tabs, settings = {}) {
    const { dom, $ } = createDom(room(tabs), "https://war.app/MultiPlayer?ChatRoom=1");
    const stored = new Map(Object.entries(settings).map(([k, v]) => [k, { name: k, value: v }]));
    const timers = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        addCSS: () => { },
        confirm: () => true,
        setTimeout: (fn) => { timers.push(fn); return timers.length; },
        playerDataReady: $.Deferred().resolve({ Name: "KKND" }).promise(),
        Database: {
            Table: { Settings: "Settings" },
            Row: { Settings: { Name: "name" } },
            readIndex: (table, row, value, callback) => callback(stored.get(value)),
            update: (table, row) => stored.set(row.name, JSON.parse(JSON.stringify(row)))
        }
    });
    ctx.setupChatRoomTools();
    const tick = async () => { await flush(); timers.splice(0).forEach((fn) => fn()); await flush(); };
    const shown = (tab) => Array.from($(tab).find("[id^='ujs_ChatRoomMessageControl']").get().filter((row) => row.style.display !== "none")
        .sort((a, b) => parseFloat(b.style.bottom) - parseFloat(a.style.bottom)).map((row) => $(row).find("[id^='ujs_Message'] .ujsTextInner").text() + "@" + row.style.bottom));
    return { ctx, $, dom, stored, tick, shown };
}

test("war.app's notices are the bold italic messages", () => {
    const { dom } = createDom(`<i id="a" style="${EVENT_STYLE}"></i><i id="b" style="font-style: italic;"></i><i id="c"></i>`);
    const ctx = load(["chatEventLabel"]);
    assert.deepEqual(["a", "b", "c"].map((id) => ctx.chatEventLabel(dom.window.document.getElementById(id))), [true, false, false]);
});

test("a mention is your name as a word, with or without @", () => {
    const ctx = load(["chatMentions"]);
    assert.ok(ctx.chatMentions("hi KKND, ready?", "KKND"));
    assert.ok(ctx.chatMentions("@kknd where are you", "KKND"));
    assert.ok(ctx.chatMentions("Rex Imperator said so", "Rex Imperator"));
    assert.ok(!ctx.chatMentions("KKNDx is someone else", "KKND"));
    assert.ok(!ctx.chatMentions("anything", ""));
});

test("hides the notices and slides the rest down without gaps, and shows the count", async () => {
    const { $, tick, shown } = setupRoom([{ id: "0", name: "Global", rows: [] }, { id: "-346", name: "group", rows: GROUP_ROWS }]);
    await tick();
    assert.deepEqual(shown("#ujs_ChatRoomTab_2"), ["hello@75px", "hi KKND, ready?@50px", "@kknd where are you@25px", "here, KKND@0px"]);
    assert.equal($("#tuydChatTools .tuydEventCount").text(), "(2 hidden)");
});

test("turning Hide events off puts war.app's positions back, and is remembered", async () => {
    const { $, tick, shown, stored } = setupRoom([{ id: "-346", name: "group", rows: GROUP_ROWS }]);
    await tick();
    $("#tuydChatTools [name=hideEvents]").prop("checked", false).trigger("change");
    await tick();
    assert.equal(shown("#ujs_ChatRoomTab").length, 6);
    assert.deepEqual(shown("#ujs_ChatRoomTab").map((s) => s.split("@").pop()), ["125px", "100px", "75px", "50px", "25px", "0px"]);
    assert.equal(stored.get("hideChatEvents").value, false);
});

test("starts with events shown when that was chosen before", async () => {
    const { tick, shown } = setupRoom([{ id: "-346", name: "group", rows: GROUP_ROWS }], { hideChatEvents: false });
    await tick();
    assert.equal(shown("#ujs_ChatRoomTab").length, 6);
});

test("muting hides a player's messages, the list shows them, and unmuting brings them back", async () => {
    const { $, tick, shown, stored } = setupRoom([{ id: "-346", name: "group", rows: GROUP_ROWS }]);
    await tick();
    assert.equal($("#ujs_ChatRoomMessageControl_6 > .tuydMute").length, 0, "no mute button on your own messages");
    assert.equal($("#ujs_ChatRoomMessageControl_2 > .tuydMute").length, 0, "nor on notices");
    $("#ujs_ChatRoomMessageControl_1 > .tuydMute").trigger("click");
    await tick();
    assert.deepEqual(shown("#ujs_ChatRoomTab"), ["hi KKND, ready?@25px", "here, KKND@0px"]);
    assert.deepEqual(stored.get("mutedChatPlayers").value, ["Ann"]);
    assert.equal($("#tuydChatTools .tuydMutedLink").text(), "Muted (1)");
    $("#tuydChatTools .tuydMutedLink").trigger("click");
    assert.equal($("#tuydMutedList span").text(), "Ann");
    $("#tuydMutedList .tuydUnmute").trigger("click");
    await tick();
    assert.equal(shown("#ujs_ChatRoomTab").length, 4);
    assert.deepEqual(stored.get("mutedChatPlayers").value, []);
});

test("marks messages that mention you, and counts new ones on a tab you're not looking at", async () => {
    const { $, tick } = setupRoom([{ id: "0", name: "Global", rows: [roomRow(9, 0, "Zed", "hello all")] }, { id: "-346", name: "group", hidden: true, rows: GROUP_ROWS }]);
    await tick();
    assert.deepEqual(Array.from($(".tuydMention").map((i, row) => row.id).get()), ["ujs_ChatRoomMessageControl_3", "ujs_ChatRoomMessageControl_5"], "not your own message");
    assert.equal($(".tuydMentionCount").length, 0, "messages there before don't count");
    $("#ujs_ChatRoomTab_2 [id^='ujs_ChatContainer']").append(roomRow(7, -25, "Dee", "KKND?") + roomRow(8, -50, "Dee", "nothing"));
    $("#ujs_ChatRoomTab_2 [id^='ujs_ChatRoomMessageControl']").each(function () { this.style.bottom = (parseFloat(this.style.bottom) + 50) + "px"; });
    await tick();
    assert.equal($("#ujs_TabData_-346 .tuydMentionCount").text(), "@1");
    $("#ujs_ChatRoomTab_2").show();
    await tick();
    assert.equal($(".tuydMentionCount").length, 0, "opening the tab clears it");
});

test("game chat: muted messages turn into a faint line and mentions are marked", async () => {
    const message = (n, bottom, name, text) => `<div class="ujsGameObject" id="ujs_ChatMessage_${n}" style="bottom: ${bottom}px;">`
        + `<div id="ujs_PlayerNameLabel_${n}"><div id="ujs_PlayerNameLabel_${n}_tmp">${name}</div></div><div id="ujs_TimestampLabel_${n}"><div id="ujs_TimestampLabel_${n}_tmp">t</div></div>`
        + `<div id="ujs_RightCol_${n}"><div id="ujs_MessageLabel_${n}"><div id="ujs_MessageLabel_${n}_tmp">${text}</div></div><div id="ujs_BlacklistLabel_${n}" style="display: none"></div></div></div>`;
    const { dom, $ } = createDom(`<div id="ujs_ChatTab">${message(1, 50, "Ann", "spam")}${message(2, 25, "Bo", "KKND attack now")}${message(3, 0, "KKND", "ok")}</div>`, "https://war.app/MultiPlayer?GameID=1");
    const timers = [];
    const ctx = load(["shownUjsElement", "chatMessages", "chatEventLabel", "chatMentions", "readMutedPlayers", "saveMutedPlayers", "chatToolsCss", "confirmMute", "setupGameChatTools"], {
        ...domGlobals(dom, $),
        addCSS: () => { },
        confirm: () => true,
        setTimeout: (fn) => { timers.push(fn); return 1; },
        playerDataReady: $.Deferred().resolve({ Name: "KKND" }).promise(),
        Database: { Table: { Settings: "Settings" }, Row: { Settings: { Name: "name" } }, readIndex: (t, r, v, cb) => cb(v === "mutedChatPlayers" ? { value: ["Ann"] } : undefined), update: () => { } }
    });
    ctx.setupGameChatTools();
    await flush();
    timers.splice(0).forEach((fn) => fn());
    assert.ok($("#ujs_ChatMessage_1").hasClass("tuydMutedMessage"));
    assert.ok($("#ujs_ChatMessage_2").hasClass("tuydMention"));
    assert.ok(!$("#ujs_ChatMessage_3").hasClass("tuydMention"));
    assert.equal($("#ujs_ChatMessage_3 > .tuydMute").length, 0);
    assert.equal($("#ujs_ChatMessage_2 > .tuydMute").length, 1);
});

test("recognizes the chat room page", () => {
    const at = (url) => load(["pageIsChatRoom"], { location: { href: url } });
    assert.ok(at("https://war.app/MultiPlayer?ChatRoom=1").pageIsChatRoom());
    assert.ok(!at("https://war.app/MultiPlayer?GameID=1").pageIsChatRoom());
});

test("the search box narrows a chat to messages with the word or player, and counts them", async () => {
    const { $, tick, shown } = setupRoom([{ id: "-346", name: "group", rows: GROUP_ROWS }]);
    await tick();
    $("#tuydChatTools [name=chatSearch]").val("ann").trigger("input");
    await tick();
    assert.deepEqual(shown("#ujs_ChatRoomTab"), ["hello@25px", "@kknd where are you@0px"]);
    assert.equal($("#tuydChatTools .tuydSearchCount").text(), "2 found");
    $("#tuydChatTools [name=chatSearch]").val("READY").trigger("input");
    await tick();
    assert.deepEqual(shown("#ujs_ChatRoomTab"), ["hi KKND, ready?@0px"]);
    $("#tuydChatTools [name=chatSearch]").val("").trigger("input");
    await tick();
    assert.equal(shown("#ujs_ChatRoomTab").length, 4);
    assert.equal($("#tuydChatTools .tuydSearchCount").text(), "");
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors war.app's in-game chat tab with its "Load Older Messages" button (texts are invented).
const CHAT = `<div id="ujs_Chat"><div id="ujs_ChatTab"><div id="ujs_ScrollView_3"><div id="ujs_Viewport_3"><div class="messages"><p>newest</p></div>
    <div class="ujsGameObject ujsBtn" id="ujs_LoadOlderMessagesBtn" style="left: 123px;"><a class="btn ujsInner ujsBtnInner" id="ujs_LoadOlderMessagesBtn_btn" href="#"></a></div>
    </div></div></div>
    <div id="ujs_ChatTab_2"><div class="ujsGameObject ujsBtn" id="ujs_LoadOlderMessagesBtn_2" style="display: none;"><a class="btn ujsInner ujsBtnInner" id="ujs_LoadOlderMessagesBtn_2_btn" href="#"></a></div></div></div>`;

function setup(onPress) {
    const { dom, $ } = createDom(CHAT, "https://war.app/MultiPlayer?GameID=1");
    const timers = [];
    let now = 0;
    const ctx = load(["shownUjsElement", "olderChatButtons", "setupFullGameChat"], {
        ...domGlobals(dom, $),
        WeakMap,
        Date: { now: () => now },
        setTimeout: (fn) => { timers.push(fn); return timers.length; }
    });
    let presses = 0;
    $("#ujs_LoadOlderMessagesBtn_btn").on("click", () => { presses++; onPress($, presses); });
    $("#ujs_LoadOlderMessagesBtn_2_btn").on("click", () => assert.fail("a hidden button is never pressed"));
    ctx.setupFullGameChat();
    const tick = async () => { await flush(); now += 2000; timers.splice(0).forEach((fn) => fn()); };
    return { ctx, $, tick, presses: () => presses };
}

test("only shown older-messages buttons count", () => {
    const { ctx } = setup(() => { });
    assert.deepEqual(Array.from(ctx.olderChatButtons().map((b) => b.id)), ["ujs_LoadOlderMessagesBtn"]);
});

test("presses Load Older Messages until the chat stops growing", async () => {
    const { $, tick, presses } = setup(($, n) => {
        $(".messages").prepend(`<p>older ${n}</p>`.repeat(n < 3 ? 100 : 0));
    });
    for (let i = 0; i < 6; i++) await tick();
    assert.equal(presses(), 3, "the third press added nothing, so it stops");
});

test("stops when war.app hides the button", async () => {
    const { $, tick, presses } = setup(($) => {
        $(".messages").prepend("<p>older</p>");
        $("#ujs_LoadOlderMessagesBtn").hide();
    });
    for (let i = 0; i < 4; i++) await tick();
    assert.equal(presses(), 1);
});

test("presses at most 20 times", async () => {
    const { tick, presses } = setup(($, n) => $(".messages").prepend(`<p>${n}</p>`));
    for (let i = 0; i < 30; i++) await tick();
    assert.equal(presses(), 20);
});

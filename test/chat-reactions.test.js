const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// Mirrors war.app's game chat (ujs_ChatMessage) and chat room (ujs_ChatRoomMessageControl) messages.
// The bubble is a .ujsPCH element with a transparent click-catcher (<id>_pch); its text and links sit inside it.
const gameMessage = (n) => `<div class="ujsGameObject" id="ujs_ChatMessage_${n}">
    <div class="ujsGameObject" id="ujs_LeftCol_${n}"><div class="ujsGameObject ujsText" id="ujs_PlayerNameLabel_${n}"><div class="ujsInner ujsTextInner" id="ujs_PlayerNameLabel_${n}_tmp">KKND</div></div></div>
    <div class="ujsGameObject ujsPCH ujsImg" id="ujs_RightCol_${n}"><a class="btn ujsInner ujsBtnInner ujsPCHInner" id="ujs_RightCol_${n}_pch"></a>
        <div class="ujsGameObject ujsText" id="ujs_MessageLabel_${n}"><div class="ujsInner ujsTextInner" id="ujs_MessageLabel_${n}_tmp">attack <u><span class="ujsTMPLink" id="link_${n}">Sparta</span></u> now</div></div>
        <div class="ujsGameObject" id="ujs_ReactionsRow_${n}"><div class="ujsGameObject ujsPCH" id="ujs_Reaction_${n}"><a class="btn ujsInner ujsBtnInner ujsPCHInner" id="ujs_Reaction_${n}_pch"></a></div></div>
    </div></div>`;
const roomMessage = (n) => `<div class="ujsGameObject" id="ujs_ChatRoomMessageControl_${n}">
    <div class="ujsGameObject ujsPCH" id="ujs_LeftCol_${n}"><a class="btn ujsInner ujsBtnInner ujsPCHInner" id="ujs_LeftCol_${n}_pch"></a><div class="ujsGameObject ujsText" id="ujs_PlayerName_${n}"><div class="ujsInner ujsTextInner" id="ujs_PlayerName_${n}_tmp">Fizzer</div></div></div>
    <div class="ujsGameObject ujsPCH ujsImg" id="ujs_BubbleImage_${n}"><a class="btn ujsInner ujsBtnInner ujsPCHInner" id="ujs_BubbleImage_${n}_pch"></a>
        <div class="ujsGameObject ujsText" id="ujs_Message_${n}"><div class="ujsInner ujsTextInner" id="ujs_Message_${n}_tmp">hello all</div></div>
        <div class="ujsGameObject ujsBtn" id="ujs_ViewBtn_${n}"><a class="btn ujsInner ujsBtnInner" id="ujs_ViewBtn_${n}_btn"></a><div class="ujsGameObject ujsText" id="ujs_Text_${n}"><div class="ujsInner ujsTextInner" id="ujs_Text_${n}_tmp">View</div></div></div>
    </div></div>`;
// A bubble war.app uses elsewhere, outside a chat message.
const otherBubble = `<div class="ujsGameObject ujsPCH" id="ujs_RightCol_99"><a class="btn ujsInner ujsBtnInner ujsPCHInner" id="ujs_RightCol_99_pch"></a></div>`;

function page() {
    const { dom, $ } = createDom(gameMessage(3) + gameMessage(4) + roomMessage(97) + otherBubble, "https://war.app/MultiPlayer?GameID=1");
    const ctx = load(["chatReactionBubble", "setupChatAltClickReact"], domGlobals(dom, $));
    const el = (id) => dom.window.document.getElementById(id);
    return { dom, $, ctx, el };
}

test("a click on a chat message's bubble or text is a reaction click", () => {
    const { ctx, el } = page();
    assert.equal(ctx.chatReactionBubble(el("ujs_RightCol_3_pch")), el("ujs_RightCol_3"));
    assert.equal(ctx.chatReactionBubble(el("ujs_MessageLabel_3_tmp")), el("ujs_RightCol_3"));
    assert.equal(ctx.chatReactionBubble(el("ujs_BubbleImage_97_pch")), el("ujs_BubbleImage_97"));
    assert.equal(ctx.chatReactionBubble(el("ujs_Message_97_tmp")), el("ujs_BubbleImage_97"));
});

test("links, names, reaction counts and buttons in a message are left alone", () => {
    const { ctx, el } = page();
    assert.equal(ctx.chatReactionBubble(el("link_3")), null);
    assert.equal(ctx.chatReactionBubble(el("ujs_PlayerNameLabel_3_tmp")), null);
    assert.equal(ctx.chatReactionBubble(el("ujs_LeftCol_97_pch")), null);
    assert.equal(ctx.chatReactionBubble(el("ujs_Reaction_3_pch")), null);
    assert.equal(ctx.chatReactionBubble(el("ujs_ViewBtn_97_btn")), null);
    assert.equal(ctx.chatReactionBubble(el("ujs_Text_97_tmp")), null);
    assert.equal(ctx.chatReactionBubble(el("ujs_RightCol_99_pch")), null);
});

function click(dom, element, altKey) {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, altKey }));
}

test("war.app's handler sees an Alt-click on a message, not a plain or double click", () => {
    const { dom, $, ctx, el } = page();
    let opened = 0;
    $(el("ujs_RightCol_3_pch")).on("click", () => opened++);
    ctx.setupChatAltClickReact();

    click(dom, el("ujs_RightCol_3_pch"), false);
    click(dom, el("ujs_RightCol_3_pch"), false);
    assert.equal(opened, 0);
    click(dom, el("ujs_RightCol_3_pch"), true);
    assert.equal(opened, 1);
});

test("a chat room message's text needs Alt too", () => {
    const { dom, ctx, el } = page();
    let opened = 0;
    el("ujs_BubbleImage_97").addEventListener("click", () => opened++);
    ctx.setupChatAltClickReact();
    click(dom, el("ujs_Message_97_tmp"), false);
    assert.equal(opened, 0);
    click(dom, el("ujs_Message_97_tmp"), true);
    assert.equal(opened, 1);
});

test("links and names in a message still work with a plain click", () => {
    const { dom, $, ctx, el } = page();
    let linkClicks = 0, nameClicks = 0;
    $(el("link_3")).on("click", () => linkClicks++);
    $(el("ujs_LeftCol_97_pch")).on("click", () => nameClicks++);
    ctx.setupChatAltClickReact();
    click(dom, el("link_3"), false);
    click(dom, el("ujs_LeftCol_97_pch"), false);
    assert.equal(linkClicks, 1);
    assert.equal(nameClicks, 1);
});

test("Alt-click right after selecting text still reacts, though war.app skips clicks while text is selected", () => {
    const { dom, ctx, el } = page();
    ctx.setupChatAltClickReact();
    dom.window.getSelection().selectAllChildren(el("ujs_Message_97_tmp"));
    let collapsed = null;
    el("ujs_BubbleImage_97").addEventListener("click", () => { collapsed = dom.window.getSelection().isCollapsed; });
    click(dom, el("ujs_Message_97_tmp"), true);
    assert.equal(collapsed, true);
});

test("a plain click leaves a selection alone", () => {
    const { dom, ctx, el } = page();
    ctx.setupChatAltClickReact();
    dom.window.getSelection().selectAllChildren(el("ujs_Message_97_tmp"));
    click(dom, el("ujs_Message_97_tmp"), false);
    assert.equal(dom.window.getSelection().isCollapsed, false);
});

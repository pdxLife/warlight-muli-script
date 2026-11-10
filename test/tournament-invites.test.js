const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// A My Tournaments card as war.app draws it, with the YourTurnLabel's inner HTML given.
function card(suffix, yourTurn) {
    const n = suffix ? "_" + suffix : "";
    return `<div class="ujsGameObject ujsBtn ujsImg" id="ujs_TournamentInfoControl${n}">
        <div class="ujsInner ujsImgInner" id="ujs_TournamentInfoControl${n}_img"></div>
        <a class="btn ujsInner ujsBtnInner" href="/MultiPlayer/Tournament?ID=1${suffix}" id="ujs_TournamentInfoControl${n}_btn"></a>
        <div class="ujsGameObject" id="ujs_Vert${n}">
            <div class="ujsGameObject ujsText" id="ujs_CoinsLabel${n}"><div class="ujsInner ujsTextInner" id="ujs_CoinsLabel${n}_tmp">Entry fee: Free!  1st place prize: 42 coins.</div></div>
            <div class="ujsGameObject ujsText" id="ujs_YourTurnLabel${n}"><div class="ujsInner ujsTextInner" id="ujs_YourTurnLabel${n}_tmp">${yourTurn}</div></div>
        </div>
    </div>`;
}

const INVITE = '<span style="max-width: 100%"><span style="color: #F2C250">Waiting for you to join or decline.</span> </span>';
const INVITE_AND_CHAT = '<span style="max-width: 100%"><span style="color: #F2C250">Waiting for you to join or decline.</span> \n<span style="color: #F5DEB3">Unread public chat messages.</span> </span>';
const CHAT = '<span style="max-width: 100%"><span style="color: #F5DEB3">Unread public chat messages.</span> </span>';

function setup(html) {
    const { dom, $ } = createDom(`<div id="ujs_MyTournamentsContainer">${html}</div>`, "https://war.app/MultiPlayer/Tournaments/");
    const ctx = load(["isTournamentInviteText", "markTournamentInvites", "setupTournamentInviteHighlight"], { ...domGlobals(dom, $), addCSS() {} });
    return { dom, $, ctx };
}

test("isTournamentInviteText matches only war.app's invitation line", () => {
    const { ctx } = setup("");
    assert.equal(ctx.isTournamentInviteText("Waiting for you to join or decline."), true);
    assert.equal(ctx.isTournamentInviteText("  Waiting for you to join or decline. "), true);
    assert.equal(ctx.isTournamentInviteText("Waiting for you to join or decline"), true);
    assert.equal(ctx.isTournamentInviteText("Unread public chat messages."), false);
    assert.equal(ctx.isTournamentInviteText("Waiting for you to join or decline. Unread public chat messages."), false);
    assert.equal(ctx.isTournamentInviteText("Waiting for players to join"), false);
    assert.equal(ctx.isTournamentInviteText(""), false);
    assert.equal(ctx.isTournamentInviteText(null), false);
});

test("an invitation's card is outlined and its line becomes the badge", () => {
    const { $, ctx } = setup(card("", INVITE) + card("2", CHAT) + card("3", ""));
    ctx.markTournamentInvites($("body")[0]);
    assert.deepEqual($(".tuydTournamentInvite").map(function () { return this.id; }).get(), ["ujs_TournamentInfoControl"]);
    const badges = $(".tuydTournamentInviteBadge");
    assert.equal(badges.length, 1);
    assert.equal(badges.text(), "Waiting for you to join or decline.");
    assert.equal(badges.children().length, 0);
});

test("only the invitation span is the badge when unread chat follows it", () => {
    const { $, ctx } = setup(card("4", INVITE_AND_CHAT));
    ctx.markTournamentInvites($("body")[0]);
    assert.equal($("#ujs_TournamentInfoControl_4").hasClass("tuydTournamentInvite"), true);
    assert.deepEqual($(".tuydTournamentInviteBadge").map(function () { return $(this).text(); }).get(), ["Waiting for you to join or decline."]);
});

test("the invitation text in other labels doesn't count", () => {
    const { $, ctx } = setup(card("", CHAT).replace("Entry fee: Free!  1st place prize: 42 coins.", INVITE));
    ctx.markTournamentInvites($("body")[0]);
    assert.equal($(".tuydTournamentInvite, .tuydTournamentInviteBadge").length, 0);
});

test("a card war.app redraws without the invitation loses its highlight", () => {
    const { $, ctx } = setup(card("", INVITE));
    ctx.markTournamentInvites($("body")[0]);
    $("#ujs_YourTurnLabel_tmp").html(CHAT);
    ctx.markTournamentInvites($("body")[0]);
    assert.equal($(".tuydTournamentInvite, .tuydTournamentInviteBadge").length, 0);
});

test("cards war.app draws later are highlighted too", async () => {
    const { $, ctx } = setup(card("", CHAT));
    ctx.setupTournamentInviteHighlight();
    assert.equal($(".tuydTournamentInvite").length, 0);
    $("#ujs_MyTournamentsContainer").append(card("5", INVITE));
    await flush();
    assert.equal($("#ujs_TournamentInfoControl_5").hasClass("tuydTournamentInvite"), true);
    assert.equal($("#ujs_TournamentInfoControl_5 .tuydTournamentInviteBadge").length, 1);
});

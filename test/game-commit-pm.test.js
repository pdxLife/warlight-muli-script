const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

test("asks before Commit and Run+Commit, and a No keeps the click from war.app", () => {
    const { dom, $ } = createDom(`<div class="ujsBtn" id="ujs_CommitBtn"><a class="btn ujsInner ujsBtnInner" id="ujs_CommitBtn_btn" href="#"></a></div>
        <div class="ujsBtn" id="ujs_RunAndCommitBtn_2"><a class="btn ujsInner ujsBtnInner" id="ujs_RunAndCommitBtn_2_btn" href="#"></a></div>
        <div class="ujsBtn" id="ujs_ModifyOrdersBtn"><a class="btn ujsInner ujsBtnInner" id="ujs_ModifyOrdersBtn_btn" href="#"></a></div>`, "https://war.app/MultiPlayer?GameID=1");
    const questions = [];
    let answer = false;
    const ctx = load(["commitQuestion", "setupCommitConfirm"], { ...domGlobals(dom, $), confirm: (q) => { questions.push(q); return answer; } });
    ctx.setupCommitConfirm();
    const reached = [];
    $(dom.window.document).on("click", "a.ujsBtnInner", function () { reached.push(this.id); });
    const click = (id) => dom.window.document.getElementById(id).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    click("ujs_CommitBtn_btn");
    click("ujs_RunAndCommitBtn_2_btn");
    assert.deepEqual(questions, ["Commit your orders for this turn?", "Let Autopilot make your orders and commit them?"]);
    assert.deepEqual(reached, []);
    answer = true;
    click("ujs_CommitBtn_btn");
    click("ujs_ModifyOrdersBtn_btn");
    assert.deepEqual(reached, ["ujs_CommitBtn_btn", "ujs_ModifyOrdersBtn_btn"]);
    assert.equal(questions.length, 3, "other buttons don't ask");
});

test("the commit question is off unless turned on", () => {
    const { source } = require("./harness");
    assert.match(source, /id: 'confirmCommit',\s*text: '[^']+',\s*selected: false,/);
});

// Mirrors war.app's "Please select the player you'd like to chat privately with." list and its
// Players panel (names are invented).
function privateChatPage(names, statuses) {
    const rows = names.map((name, i) => `<div class="ujsGameObject ujsBtn ujsImg" id="ujs_Button_${i + 3}" style="left: 3px; bottom: ${3 + (names.length - 1 - i) * 33}px;">`
        + `<div class="ujsInner ujsImgInner" id="ujs_Button_${i + 3}_img" style="width: 269px; height: 30px;"></div><a class="btn ujsInner ujsBtnInner" id="ujs_Button_${i + 3}_btn" href="#"></a>`
        + `<div class="ujsGameObject ujsText" id="ujs_Text_${i + 70}"><div class="ujsInner ujsTextInner" id="ujs_Text_${i + 70}_tmp">${name}</div></div></div>`).join("");
    const players = Object.entries(statuses).map(([name, status], i) => `<div id="ujs_PlayersSummaryPlayer_${i + 3}"><div id="ujs_PlayerNameContainer_${i + 3}">L60  ${name}</div>`
        + `<div id="ujs_PlayerStatusLabel_${i + 3}"><div id="ujs_PlayerStatusLabel_${i + 3}_tmp">${status}</div></div></div>`).join("");
    return `<div id="ujs_PromptFromList"><div id="ujs_Content_8"><div class="ujsGameObject ujsText" id="ujs_Text_99"><div class="ujsInner ujsTextInner" id="ujs_Text_99_tmp">Please select the player you'd like to chat privately with.</div></div>${rows}</div></div>${players}`;
}

const PM_FUNCTIONS = ["gameOutPlayers", "privateChatRows", "orderPrivateChatRows", "setupPrivateChatList"];

function listed($) {
    return Array.from($("#ujs_Content_8 > .ujsBtn").get().sort((a, b) => parseFloat(b.style.bottom) - parseFloat(a.style.bottom)).map((row) => $(row).find(".ujsTextInner").text() + ($(row).hasClass("tuydPmOut") ? " (out)" : "") + ($(row).children(".tuydPmDivider").length ? " ↑line" : "")));
}

test("reads who is out from the Players panel", () => {
    const { dom, $ } = createDom(privateChatPage([], { Me: "10 armies per turn", Ann: "", Bo: "Eliminated", Cy: "Booted", Di: "Surrendered", Ed: "Pending surrender" }));
    const ctx = load(PM_FUNCTIONS, domGlobals(dom, $));
    assert.deepEqual(Array.from(ctx.gameOutPlayers()), ["Bo", "Cy", "Di"]);
});

test("puts players still in the game first, A to Z, then a line and the players who are out", () => {
    const { dom, $ } = createDom(privateChatPage(["zed", "Bo", "ann", "Cy", "Di"], { zed: "", Bo: "Eliminated", ann: "", Cy: "", Di: "Booted" }));
    const ctx = load(PM_FUNCTIONS, domGlobals(dom, $));
    const rows = () => ctx.privateChatRows($("#ujs_Text_99")[0]);
    assert.equal(rows().length, 5, "the prompt itself isn't a row");
    assert.equal(ctx.orderPrivateChatRows(rows(), ctx.gameOutPlayers()), true);
    assert.deepEqual(listed($), ["ann", "Cy", "zed", "Bo (out) ↑line", "Di (out)"]);
    assert.deepEqual(Array.from($("#ujs_Content_8 > .ujsBtn").map((i, row) => row.style.bottom).get()).sort(), ["135px", "3px", "36px", "69px", "102px"].sort(), "the rows only trade places");
    assert.equal(ctx.orderPrivateChatRows(rows(), ctx.gameOutPlayers()), false, "a second pass changes nothing");
    assert.equal($(".tuydPmDivider").length, 1);
});

test("with nobody out there is no line, only the A to Z order", () => {
    const { dom, $ } = createDom(privateChatPage(["Cy", "ann", "Bo"], { Cy: "", ann: "", Bo: "" }));
    const ctx = load(PM_FUNCTIONS, domGlobals(dom, $));
    ctx.orderPrivateChatRows(ctx.privateChatRows($("#ujs_Text_99")[0]), ctx.gameOutPlayers());
    assert.deepEqual(listed($), ["ann", "Bo", "Cy"]);
});

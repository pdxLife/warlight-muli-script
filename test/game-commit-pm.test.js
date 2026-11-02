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

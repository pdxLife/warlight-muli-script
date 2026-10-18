const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

const IDLE_NUMBER_SUFFIXES = { k: [1e3, "thousand"], m: [1e6, "million"], b: [1e9, "billion"], t: [1e12, "trillion"], p: [1e15, "quadrillion"], e: [1e18, "quintillion"], z: [1e21, "sextillion"] };

// Mirrors war.app Idle's market dialog once a resource is selected (recorded on Fort Harbor).
function marketDialog(typed, purchaseLabel) {
    return `<div id="ujs_WziMarketDialog">`
        + `<div id="ujs_WziMarketDialogRow"><div id="ujs_NameLabel_125"><div id="ujs_NameLabel_125_tmp">Tin Bar</div></div><a class="btn ujsInner ujsBtnInner" id="ujs_SelectBtn_32_btn" href="#">Select</a></div>`
        + `<div id="ujs_NameLabel_124"><div id="ujs_NameLabel_124_tmp">Copper Bar</div></div>`
        + `<div id="ujs_NumToBuyBox"><textarea id="ujs_NumToBuyBox_input" class="ujsInner ujsInputField">${typed}</textarea></div>`
        + `<div id="ujs_PurchaseBtn_32"><a class="btn ujsInner ujsBtnInner" id="ujs_PurchaseBtn_32_btn" href="#"></a><div id="ujs_Text_2_85"><div id="ujs_Text_2_85_tmp">${purchaseLabel}</div></div></div>`
        + `</div>`;
}

// Mirrors the AP tab's artifact cards and the Powers tab's rows.
const artifactCard = `<div id="ujs_WziTabBodyAPArtifact_2"><div id="ujs_Name_2"><div id="ujs_Name_2_tmp">Time Warp</div></div><div id="ujs_Rarity_2"><div id="ujs_Rarity_2_tmp">Rare</div></div>`
    + `<div id="ujs_ActivateBtn_2"><a class="btn ujsInner ujsBtnInner" id="ujs_ActivateBtn_2_btn" href="#"></a><div>Activate</div></div></div>`;
const powerRow = (name, have) => `<div id="ujs_WziTabBodyIAPRow_${have}"><div>${name}</div><div id="ujs_UseBtn_${have}"><a class="btn ujsInner ujsBtnInner" id="ujs_UseBtn_${have}_btn" href="#"></a><div>Use MAXED!</div></div>`
    + `<div>${have} / 5</div><div>Advance time by one hour</div></div>`;

function idlePage(html, answers = []) {
    const { dom, $ } = createDom(html, "https://war.app/Idle/Play");
    const asked = [];
    const ctx = load(["pageIsIdle", "parseIdleNumber", "idleNumberWords", "idleMarketQuestion", "setupIdleMarketCheck", "idleActionQuestion", "setupIdleActionConfirm"], {
        ...domGlobals(dom, $),
        location: dom.window.location,
        IDLE_NUMBER_SUFFIXES,
        confirm: (question) => {
            asked.push(question);
            return answers.length ? answers.shift() : true;
        }
    });
    // war.app's buttons are links with a jQuery click handler.
    const pressed = [];
    $("a.ujsBtnInner").on("click", function () {
        pressed.push(this.id);
        return false;
    });
    const click = (id) => dom.window.document.getElementById(id).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    return { ctx, $, asked, pressed, click };
}

test("Idle numbers are read the way Idle reads them", () => {
    const { ctx } = idlePage("");
    assert.equal(ctx.parseIdleNumber("1210"), 1210);
    assert.equal(ctx.parseIdleNumber(" 1,210 "), 1210);
    assert.equal(ctx.parseIdleNumber("1.5k"), 1500);
    assert.equal(ctx.parseIdleNumber("121p"), 121e15);
    assert.equal(ctx.parseIdleNumber("18M"), 18e6);
    assert.equal(ctx.parseIdleNumber("12j"), null, "not a suffix Idle knows");
    assert.equal(ctx.parseIdleNumber("lots"), null);
    assert.equal(ctx.idleNumberWords("121p"), "121 quadrillion");
    assert.equal(ctx.idleNumberWords("1210"), "1210");
    assert.ok(ctx.pageIsIdle());
});

test("a market order bigger than the money allows asks first, and No stops the purchase", () => {
    const { ctx, $, asked, pressed, click } = idlePage(marketDialog("121p", "Purchase 18M for ￦886M"), [false, true]);
    assert.match(ctx.idleMarketQuestion($("#ujs_WziMarketDialog")), /^You typed 121p \(121 quadrillion\), more than you can afford\.\n\nThis buys 18M Copper Bar for ￦886M/);
    ctx.setupIdleMarketCheck();
    click("ujs_PurchaseBtn_32_btn");
    assert.equal(asked.length, 1);
    assert.deepEqual(pressed, [], "No: Idle never sees the click");
    click("ujs_PurchaseBtn_32_btn");
    assert.deepEqual(pressed, ["ujs_PurchaseBtn_32_btn"], "Yes: the purchase goes ahead");
});

test("a market order of what was typed goes through without a question", () => {
    const { ctx, asked, pressed, click } = idlePage(marketDialog("1210", "Purchase 1.21K for ￦57K"));
    ctx.setupIdleMarketCheck();
    click("ujs_PurchaseBtn_32_btn");
    assert.deepEqual(asked, []);
    assert.deepEqual(pressed, ["ujs_PurchaseBtn_32_btn"]);
    click("ujs_SelectBtn_32_btn");
    assert.deepEqual(asked, [], "other market buttons are left alone");
});

test("activating an artifact or using a power asks first, naming it", () => {
    const { ctx, $, asked, pressed, click } = idlePage(artifactCard + powerRow("Time Warp", 5) + powerRow("Supercharge Mine", 0), [false, true, false]);
    assert.equal(ctx.idleActionQuestion($("#ujs_ActivateBtn_2_btn")[0]), "Activate Time Warp (Rare)?");
    assert.equal(ctx.idleActionQuestion($("#ujs_UseBtn_5_btn")[0]), "Use Time Warp? You have 5.");
    assert.equal(ctx.idleActionQuestion($("#ujs_UseBtn_0_btn")[0]), "Use Supercharge Mine? You have none left, so this costs coins.");
    ctx.setupIdleActionConfirm();
    click("ujs_ActivateBtn_2_btn");
    click("ujs_UseBtn_5_btn");
    click("ujs_UseBtn_0_btn");
    assert.equal(asked.length, 3);
    assert.deepEqual(pressed, ["ujs_UseBtn_5_btn"], "only the one answered Yes went through");
});

test("the volume slider scales Idle's sounds and remembers the level, leaving videos alone", () => {
    const { dom, $ } = createDom(`<span id="SoundContainer"></span>`, "https://war.app/Idle/Play");
    const { HTMLMediaElement, HTMLAudioElement } = dom.window;
    const native = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    const nativeVolume = (el) => native.get.call(el);
    dom.window.localStorage.setItem("tidyUpYourDashboard.idleVolume", "0.5");
    const ctx = load(["idleVolumeLevel", "setupIdleVolume"], {
        ...domGlobals(dom, $), HTMLMediaElement, HTMLAudioElement, localStorage: dom.window.localStorage,
        IDLE_VOLUME_KEY: "tidyUpYourDashboard.idleVolume", addCSS: () => {}
    });
    ctx.setupIdleVolume();
    const sound = new dom.window.Audio();
    sound.volume = 0.8;
    assert.equal(sound.volume, 0.8, "Idle reads back what it set");
    assert.equal(nativeVolume(sound), 0.4, "the browser plays it at half");
    const video = dom.window.document.createElement("video");
    video.volume = 0.8;
    assert.equal(nativeVolume(video), 0.8, "ads and other videos keep their volume");

    assert.equal($("#SoundContainer + #idleVolume input").val(), "50", "next to war.app's speaker");
    sound.play();
    $("#idleVolume input").val("20").trigger("input");
    assert.ok(Math.abs(nativeVolume(sound) - 0.16) < 1e-9, "a sound already playing follows the slider");
    assert.equal($("#idleVolume").text(), "20%");
    assert.equal(dom.window.localStorage.getItem("tidyUpYourDashboard.idleVolume"), "0.2");
    const fresh = new dom.window.Audio();
    fresh.play();
    assert.ok(Math.abs(nativeVolume(fresh) - 0.2) < 1e-9, "a sound Idle never set a volume on plays at the slider's level");
    Object.defineProperty(HTMLMediaElement.prototype, "volume", native);
});

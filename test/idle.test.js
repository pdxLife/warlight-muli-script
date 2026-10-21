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
    const ctx = load(["pageIsIdle", "parseIdleNumber", "idleNumberWords", "idleMarketQuestion", "setupIdleMarketCheck", "idleActionQuestion", "setupIdleActionConfirm", "idleStoredArtifacts"], {
        ...domGlobals(dom, $),
        location: dom.window.location,
        localStorage: dom.window.localStorage,
        IDLE_STORED_KEY: "tidyUpYourDashboard.idleStoredArtifacts",
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

// Mirrors Idle's artifact window ("View All"): the equipped row, then the rest in a scroll view.
const artifactCardHtml = (n, name, rarity) => `<div id="ujs_WziArtifactCard_${n}"><div id="ujs_WziArtifactCard_${n}_img"></div>`
    + `<div id="ujs_Name_${n}"><div id="ujs_Name_${n}_tmp">${name}</div></div><div id="ujs_Rarity_${n}"><div id="ujs_Rarity_${n}_tmp">${rarity}</div></div></div>`;
const artifactsDialog = (equipped, others) => `<div id="ujs_WziArtifactsDialog"><div id="ujs_AutoSortToggle"><input type="checkbox" id="ujs_AutoSortToggle_toggle"></div>`
    + equipped.map(([name, rarity], i) => `<div id="ujs_EquippedCardContainer${i || ""}"><div id="ujs_EquippedCard${i}"><div id="ujs_dragCard_${i}">${artifactCardHtml(i + 1, name, rarity)}</div></div></div>`).join("")
    + `<div id="ujs_ScrollView_8"><div id="ujs_Viewport_11"><div id="ujs_UnequippedContainer">`
    + others.map(([name, rarity], i) => `<div id="ujs_dragCard_${i + 10}">${artifactCardHtml(i + 10, name, rarity)}</div>`).join("") + `</div></div></div></div>`;

function artifactPage(html) {
    const { dom, $ } = createDom(html, "https://war.app/Idle/Play");
    const timers = [];
    const ctx = load(["idleRarityRank", "idleArtifactCards", "idleBetterCopies", "idleArtifactListHtml", "markIdleArtifacts", "setupIdleArtifactHelpers", "htmlEscape",
        "idleStoredArtifacts", "toggleIdleStoredArtifact"], {
        ...domGlobals(dom, $), addCSS: () => {}, setTimeout: (fn) => timers.push(fn), localStorage: dom.window.localStorage, IDLE_STORED_KEY: "tidyUpYourDashboard.idleStoredArtifacts"
    });
    const settle = async () => {
        await new Promise((resolve) => setImmediate(resolve));
        timers.splice(0).forEach((fn) => fn());
    };
    return { ctx, dom, $, settle };
}

test("an equipped artifact with a better unequipped copy is tagged, and the better copy outlined", async () => {
    const { ctx, $, settle } = artifactPage(artifactsDialog([["Draft Boost", "Epic"], ["Idle Time", "Uncommon"]],
        [["Idle Time", "Rare"], ["Idle Time", "Epic"], ["Draft Boost", "Rare"], ["Army Cache", "Common"]]));
    assert.equal(ctx.idleRarityRank("Insane"), 6);
    assert.equal(ctx.idleRarityRank("Poor"), 0);
    ctx.setupIdleArtifactHelpers();
    await settle();
    assert.equal($(".tuydBetterTag").length, 1, "Draft Boost is already the best copy");
    assert.equal($("#ujs_WziArtifactCard_2_img .tuydBetterTag").text(), "Better: Epic", "the best one found, not just a better one");
    assert.equal($("#ujs_WziArtifactCard_2_img .tuydBetterTag").attr("title"), "You have Epic Idle Time that isn't equipped");
    assert.ok($("#ujs_WziArtifactCard_11_img").hasClass("tuydBetterCopy"));
    assert.ok(!$("#ujs_WziArtifactCard_10_img").hasClass("tuydBetterCopy"));

    // Dragging the Epic onto the equipped row: war.app redraws the cards.
    $("#ujs_WziArtifactsDialog").replaceWith(artifactsDialog([["Draft Boost", "Epic"], ["Idle Time", "Epic"]], [["Idle Time", "Rare"], ["Idle Time", "Uncommon"]]));
    await settle();
    assert.equal($(".tuydBetterTag").length, 0, "nothing left to warn about");
    assert.equal($(".tuydBetterCopy").length, 0);
});

test("the List button shows every artifact, by rarity or by name, with copies counted and the weaker equipped one flagged", async () => {
    const { ctx, $, settle } = artifactPage(artifactsDialog([["Idle Time", "Uncommon"]], [["Army Cache", "Epic"], ["Idle Time", "Rare"], ["Cache Boost", "Common"]]));
    ctx.setupIdleArtifactHelpers();
    await settle();
    assert.equal($("#ujs_AutoSortToggle > #idleArtifactListBtn").text(), "List", "next to war.app's Sort box");
    $("#idleArtifactListBtn").trigger("click");
    const rows = () => $("#idleArtifactList tr").map((i, tr) => $(tr).find("td").map((j, td) => $(td).text()).get().join(" | ")).get();
    assert.equal($("#idleArtifactList .idleArtifactListHead").text().split("Sort")[0], "All artifacts (4)");
    assert.deepEqual(rows(), ["Army Cache | Epic |  | store", "Idle Time ×2 | Rare |  | store", "Idle Time ×2 | Uncommon | equipped | store", "Cache Boost | Common |  | store"]);
    assert.ok($("#idleArtifactList tr").eq(2).hasClass("idleArtifactLower"));
    $("#idleArtifactList [data-sort=name]").trigger("click");
    assert.deepEqual(rows(), ["Army Cache | Epic |  | store", "Cache Boost | Common |  | store", "Idle Time ×2 | Rare |  | store", "Idle Time ×2 | Uncommon | equipped | store"]);
    $("#ujs_WziArtifactsDialog").remove();
    await settle();
    assert.equal($("#idleArtifactList").length, 0, "closing war.app's window closes the list");
});

test("a second Idle tab in the same browser warns in both tabs", () => {
    const channels = [];
    class FakeChannel {
        constructor(name) {
            this.name = name;
            channels.push(this);
        }
        postMessage(data) {
            channels.filter((c) => c !== this && c.name === this.name).forEach((c) => c.onmessage && c.onmessage({ data }));
        }
    }
    const tab = () => {
        const { dom, $ } = createDom("", "https://war.app/Idle/Play");
        const ctx = load(["setupIdleTabWarning", "showIdleTabWarning"], { ...domGlobals(dom, $), location: dom.window.location, addCSS: () => {}, BroadcastChannel: FakeChannel });
        return { ctx, $ };
    };
    const first = tab();
    first.ctx.setupIdleTabWarning();
    assert.equal(first.$("#idleTabWarning").length, 0, "alone, no warning");
    const second = tab();
    second.ctx.setupIdleTabWarning();
    assert.match(second.$("#idleTabWarning").text(), /also open in another tab of this browser/);
    assert.equal(first.$("#idleTabWarning").length, 1, "the tab already open is told too");
    first.$("#idleTabWarning button").trigger("click");
    assert.equal(first.$("#idleTabWarning").length, 0, "Got it closes it");
});

// Mirrors Idle's money counter and army camp rows (recorded on Fort Harbor).
const moneyCounter = (text) => `<div id="ujs_MoneyContainer"><div id="ujs_MoneyLabel"><div id="ujs_MoneyLabel_tmp" class="ujsTextInner">${text}</div></div></div>`;
const campRow = (n, name, cost, output) => `<div id="ujs_WziTabBodyArmyCampRow${n ? "_" + n : ""}"><div id="ujs_NameLabel_${n}"><div id="ujs_NameLabel_${n}_tmp">${name}</div></div>`
    + `<div id="ujs_UpgradeBtnContainer_${n}"><div id="ujs_UpgradeBtn_${n}"><a class="btn ujsInner ujsBtnInner" id="ujs_UpgradeBtn_${n}_btn" href="#"></a><div id="ujs_Text_5${n}"><div id="ujs_Text_5${n}_tmp">Upgrade ￦${cost}</div></div></div></div>`
    + `<div id="ujs_ArmiesPerSecondLabel_${n}"><div id="ujs_ArmiesPerSecondLabel_${n}_tmp">₳${output} / sec</div></div></div>`;

function upgradePage(html) {
    const { dom, $ } = createDom(html, "https://war.app/Idle/Play");
    const ctx = load(["formatIdleWait", "parseIdleMoney", "parseIdleNumber", "idleUpgradeRows", "idleBestCamp", "idlePanelRight", "showIdleUpgradeHints"], { ...domGlobals(dom, $), IDLE_NUMBER_SUFFIXES });
    return { ctx, $ };
}

test("waits read as seconds, minutes, hours or days", () => {
    const { ctx } = upgradePage("");
    assert.equal(ctx.formatIdleWait(20.2), "in 21s");
    assert.equal(ctx.formatIdleWait(600), "in 10m");
    assert.equal(ctx.formatIdleWait(3600 * 19.5), "in 19h 30m");
    assert.equal(ctx.formatIdleWait(3600 * 3), "in 3h");
    assert.equal(ctx.formatIdleWait(3600 * 50), "in 2d 2h");
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.parseIdleMoney("￦1.18B (171K/sec)"))), { money: 1.18e9, rate: 171000 });
    assert.equal(ctx.parseIdleMoney("₳357.6M (45K/sec)"), null, "armies aren't money");
});

test("upgrades you can't afford yet say when you can, and the best army camp for the money is marked", () => {
    const { ctx, $ } = upgradePage(moneyCounter("￦1.18B (171K/sec)") + campRow(2, "Gislic", "12B", "5.86K") + campRow(3, "Vindertion", "8.8B", "4.7K")
        + campRow(4, "Dawnwardize", "18B", "5.86K") + campRow(5, "Cheap", "1B", "400"));
    ctx.showIdleUpgradeHints();
    const hint = (n) => $(`#ujs_ArmiesPerSecondLabel_${n} > .idleUpgradeHint`);
    assert.equal(hint(2).text(), "in 17h 35m", "(12B − 1.18B) ÷ 171K/sec");
    assert.equal(hint(3).text(), "in 12h 23m · Best value", "4.7K for 8.8B beats 5.86K for 12B or 18B and 400 for 1B");
    assert.ok(hint(3).hasClass("idleBestValue"));
    assert.equal(hint(5).length, 0, "affordable now and not the best value: nothing added");
    assert.equal($(".idleBestValue").length, 1);
    ctx.showIdleUpgradeHints();
    assert.equal($(".idleUpgradeHint").length, 3, "a second pass updates the hints instead of adding more");
    $("#ujs_ArmiesPerSecondLabel_3_tmp").html("<span>₳4.7K</span> / sec");
    ctx.showIdleUpgradeHints();
    assert.equal(hint(3).text(), "in 12h 23m · Best value", "war.app rewriting its label leaves the hint, which sits beside it");
});

// Mirrors a Mines row: two ores side by side, each with its own "/s" label (recorded on Fort Harbor).
const mineRow = (n, cost, outputs) => `<div id="ujs_WziTabBodyMineRow_${n}"><div id="ujs_NameLabel_${n}"><div id="ujs_NameLabel_${n}_tmp">Neutinoclar</div></div>`
    + `<div id="ujs_UpgradeBtnContainer_${n}"><div id="ujs_UpgradeBtn_${n}"><a class="btn ujsInner ujsBtnInner" id="ujs_UpgradeBtn_${n}_btn" href="#"></a><div id="ujs_Text_5${n}"><div id="ujs_Text_5${n}_tmp">Upgrade ￦${cost}</div></div></div></div>`
    + outputs.map((output, i) => `<div id="ujs_Rate_${n}_${i}"><div id="ujs_Rate_${n}_${i}_tmp">${output}/s</div></div>`).join("") + `</div>`;

test("a mine making several ores gets its hint after the last one, not over the second", () => {
    const { ctx, $ } = upgradePage(moneyCounter("￦7.65B (318K/sec)") + mineRow(7, "18B", ["1.04", "1.04"]));
    $("#ujs_Rate_7_0").append('<span class="idleUpgradeHint">in 9h 2m</span>');
    ctx.showIdleUpgradeHints();
    assert.equal($(".idleUpgradeHint").length, 1);
    assert.equal($("#ujs_Rate_7_1 > .idleUpgradeHint").text(), "in 9h 3m", "(18B − 7.65B) ÷ 318K/sec, beside the second ore");
    assert.equal($("#ujs_Rate_7_0 > .idleUpgradeHint").length, 0, "a hint left over the first ore is moved");
});

test("the tab title counts what Idle is waiting on you for, and a background tab gets a notification", async () => {
    const { dom, $ } = createDom(`<div id="ujs_UnclaimedPowersBtn" style="display: none"></div><div id="ujs_BattleIndicatorBtn" style="display: none"></div>`
        + `<div id="ujs_DailyBonusBtn"></div><div id="dialog" style="display: none"><div class="ujsTextInner">You found an artifact!  Click Claim below to reveal it</div></div>`, "https://war.app/Idle/Play");
    dom.window.document.title = "Idle - War.app";
    Object.defineProperty(dom.window.document, "hidden", { value: false, configurable: true });
    const notifications = [];
    const intervals = [];
    const ctx = load(["idleAttentionItems", "setupIdleAttention"], {
        ...domGlobals(dom, $),
        setInterval: (fn) => intervals.push(fn),
        ifSettingIsEnabled: (name, yes) => name === "idleNotifications" && yes(),
        Notification: Object.assign(function (title, options) {
            notifications.push([title, options.body]);
        }, { permission: "granted" })
    });
    ctx.setupIdleAttention();
    assert.deepEqual(Array.from(ctx.idleAttentionItems()), ["The daily bonus"]);
    assert.equal(dom.window.document.title, "(1) Idle - War.app");
    assert.deepEqual(notifications, [], "the tab is in front: no notification");

    Object.defineProperty(dom.window.document, "hidden", { value: true, configurable: true });
    $("#ujs_UnclaimedPowersBtn").show();
    $("#dialog").show();
    intervals.forEach((fn) => fn());
    assert.equal(dom.window.document.title, "(3) Idle - War.app");
    assert.deepEqual(notifications, [["War.app Idle needs you", "Unclaimed powers, An artifact to claim"]], "only what's new");
    intervals.forEach((fn) => fn());
    assert.equal(notifications.length, 1, "nothing new, no second notification");
    $("#ujs_UnclaimedPowersBtn, #ujs_DailyBonusBtn, #dialog").hide();
    intervals.forEach((fn) => fn());
    assert.equal(dom.window.document.title, "Idle - War.app");
});

test("a stored artifact is dimmed and tagged, never suggested as the better copy, and its activation says so", async () => {
    const { ctx, $, dom, settle } = artifactPage(artifactsDialog([["Idle Time", "Uncommon"]], [["Idle Time", "Rare"], ["Idle Time", "Epic"]]));
    ctx.setupIdleArtifactHelpers();
    await settle();
    assert.equal($("#ujs_WziArtifactCard_1_img .tuydBetterTag").text(), "Better: Epic");
    $("#idleArtifactListBtn").trigger("click");
    $("#idleArtifactList .idleStoreToggle[data-artifact='Idle Time|Epic']").trigger("click");
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem("tidyUpYourDashboard.idleStoredArtifacts")), ["Idle Time|Epic"]);
    assert.ok($("#ujs_WziArtifactCard_11").hasClass("tuydStoredCopy"), "the whole card is dimmed");
    assert.equal($("#ujs_dragCard_11 > .tuydStoredTag").text(), "Stored", "the tag sits beside the card, not dimmed with it");
    assert.equal($("#ujs_WziArtifactCard_1_img .tuydBetterTag").text(), "Better: Rare", "the stored Epic isn't suggested; the Rare is");
    assert.equal($("#idleArtifactList .idleStoreToggle[data-artifact='Idle Time|Epic']").text(), "stored");
    $("#idleArtifactList .idleStoreToggle[data-artifact='Idle Time|Epic']").trigger("click");
    assert.equal($(".tuydStoredTag").length, 0, "out of storage again");
});

test("a stored artifact's Activate question says it's stored", () => {
    const { ctx, $ } = idlePage(artifactCard);
    ctx.localStorage.setItem("tidyUpYourDashboard.idleStoredArtifacts", JSON.stringify(["Time Warp|Rare"]));
    assert.equal(ctx.idleActionQuestion($("#ujs_ActivateBtn_2_btn")[0]), "Activate Time Warp (Rare)? You marked it as stored.");
});

// Mirrors one of Idle's pop-ups (WziBalloon: a header, then rows with a label and a close button).
const balloon = (n, title, text, hidden) => { const k = n ? "_" + n : ""; return `<div id="ujs_WziBalloon${k}" style="${hidden ? "display: none" : ""}"><div id="ujs_HeadeContainer${k}"><div id="ujs_Header${k}"><div id="ujs_Header${k}_tmp">${title}</div></div></div>`
    + `<div id="ujs_Content${k}"><div id="ujs_Row${k}"><div id="ujs_Label${k}"><div id="ujs_Label${k}_tmp">${text}</div><div id="ujs_GameObject${k}"><div id="ujs_CloseBtn${k}"><div>×</div></div></div></div></div></div></div>`; };

test("Idle's pop-ups are listed, newest first, kept for the tab, and cleared on request", async () => {
    const { dom, $ } = createDom(`<div id="ujs_MagnifyingButtonsContainer"></div>` + balloon(0, "Dig Site", "You found an Epic artifact!"), "https://war.app/Idle/Play");
    const timers = [];
    const ctx = load(["idleBalloonEntry", "idleLogEntries", "idleLogHtml", "setupIdlePopupLog", "htmlEscape"], {
        ...domGlobals(dom, $), addCSS: () => {}, setTimeout: (fn) => timers.push(fn), WeakSet, IDLE_LOG_KEY: "tidyUpYourDashboard.idleLog"
    });
    const settle = async () => {
        await new Promise((resolve) => setImmediate(resolve));
        timers.splice(0).forEach((fn) => fn());
    };
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.idleBalloonEntry($("#ujs_WziBalloon")[0]))), { title: "Dig Site", text: "You found an Epic artifact!" }, "the close button's × isn't part of it");
    ctx.setupIdlePopupLog();
    assert.equal($("#ujs_MagnifyingButtonsContainer > #idleLogBtn").text(), "Log 1", "next to the zoom buttons");
    $("body").append(balloon(2, "Cache", "+₳5M armies", true));
    await settle();
    assert.equal($("#idleLogBtn").text(), "Log 1", "a hidden pop-up isn't logged yet");
    $("#ujs_WziBalloon_2").show();
    await settle();
    $("#idleLogBtn").trigger("click");
    const entries = () => $("#idleLog .idleLogEntry").map((i, e) => $(e).text().replace(/^\d\d:\d\d /, "")).get();
    assert.deepEqual(entries(), ["Cache +₳5M armies", "Dig Site You found an Epic artifact!"]);
    $("#ujs_WziBalloon_2").attr("data-x", "1");
    await settle();
    assert.equal(entries().length, 2, "the same pop-up isn't logged twice");
    assert.equal(JSON.parse(dom.window.sessionStorage.getItem("tidyUpYourDashboard.idleLog")).length, 2, "kept for this tab");
    $("#idleLog .idleLogClear").trigger("click");
    assert.deepEqual(entries(), []);
    assert.match($("#idleLog").text(), /will be listed here/);
});

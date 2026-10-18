const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

test("finds the @name being typed right before the caret", () => {
    const ctx = load(["mentionQuery"]);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.mentionQuery("hello @ki", 9))), { start: 6, text: "ki" });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.mentionQuery("@Rex Im", 7))), { start: 0, text: "Rex Im" }, "names can have spaces");
    assert.equal(ctx.mentionQuery("mail@example", 12), null, "an @ inside a word isn't a tag");
    assert.equal(ctx.mentionQuery("no tag here", 11), null);
});

test("suggests names that start with what's typed first, then names containing it, never you", () => {
    const ctx = load(["mentionCandidates"]);
    const names = ["Kitty Hawk", "kombinaciya", "Rex Imperator", "KKND", "Kitty Hawk", "Mr Kite"];
    assert.deepEqual(Array.from(ctx.mentionCandidates(names, "ki", "KKND")), ["Kitty Hawk", "Mr Kite"]);
    assert.deepEqual(Array.from(ctx.mentionCandidates(names, "", "kknd")), ["Kitty Hawk", "kombinaciya", "Rex Imperator", "Mr Kite"]);
});

test("puts the picked name in place of what was typed", () => {
    const ctx = load(["insertMention"]);
    const next = JSON.parse(JSON.stringify(ctx.insertMention("hello @ki and more", 9, { start: 6, text: "ki" }, "Kitty Hawk")));
    assert.deepEqual(next, { value: "hello @Kitty Hawk  and more", caret: 18 });
});

function setupSuggest(names) {
    const { dom, $ } = createDom(`<textarea id="ujs_SendChatText_3_input"></textarea><textarea id="other"></textarea>`, "https://war.app/MultiPlayer?ChatRoom=1");
    const ctx = load(["mentionQuery", "mentionCandidates", "insertMention", "setupChatMentionSuggest"], {
        ...domGlobals(dom, $),
        Event: dom.window.Event,
        addCSS: () => { },
        setTimeout: () => 1
    });
    ctx.setupChatMentionSuggest((el) => !!el && /^ujs_SendChatText(?:_\d+)?_input$/.test(el.id), () => names);
    const box = dom.window.document.getElementById("ujs_SendChatText_3_input");
    const type = (value) => { box.value = value; box.setSelectionRange(value.length, value.length); box.dispatchEvent(new dom.window.Event("input", { bubbles: true })); };
    const key = (k, type = "keydown") => { const e = new dom.window.KeyboardEvent(type, { key: k, bubbles: true, cancelable: true }); box.dispatchEvent(e); return e; };
    return { $, dom, box, type, key };
}

test("typing @ shows names; Tab or Enter picks one, and that Enter doesn't reach war.app", () => {
    const { $, dom, box, type, key } = setupSuggest(["Kitty Hawk", "Rex Imperator"]);
    let reached = 0;
    box.addEventListener("keydown", () => reached++);
    box.addEventListener("keyup", () => reached++);
    type("hi @");
    assert.deepEqual(Array.from($("#tuydMentionList div").map((i, e) => $(e).text()).get()), ["Kitty Hawk", "Rex Imperator"]);
    key("ArrowDown");
    assert.equal($("#tuydMentionList .tuydActive").text(), "Rex Imperator");
    const enter = key("Enter");
    key("Enter", "keyup");
    assert.equal(enter.defaultPrevented, true);
    assert.equal(box.value, "hi @Rex Imperator ");
    assert.equal(reached, 0, "war.app sees neither the arrow nor the Enter");
    assert.equal($("#tuydMentionList").length, 0);
    type("hi @Rex Imperator and @ki");
    key("Tab");
    assert.equal(box.value, "hi @Rex Imperator and @Kitty Hawk ");
    type("plain text");
    assert.equal(key("Enter").defaultPrevented, false, "without the list, Enter is war.app's");
    assert.equal(reached, 1);
});

test("Escape closes the list, and other boxes get no suggestions", () => {
    const { $, dom, type, key } = setupSuggest(["Kitty Hawk"]);
    type("@k");
    key("Escape");
    assert.equal($("#tuydMentionList").length, 0);
    const other = dom.window.document.getElementById("other");
    other.value = "@k";
    other.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    assert.equal($("#tuydMentionList").length, 0);
});

function dashboard(html, scrollGames) {
    const { dom, $ } = createDom(html, "https://war.app/MultiPlayer/");
    const later = [];
    load(["setupDashboardChatLink"], {
        ...domGlobals(dom, $),
        addCSS: () => { },
        window: { addEventListener: () => { } },
        setTimeout: (fn) => { later.push(fn); return 1; },
        ifSettingIsEnabled: (name, yes, no) => (name === "scrollGames" && scrollGames ? yes : no)()
    }).setupDashboardChatLink();
    return { $, later };
}

test("with the scrollable dashboard, Chat and Refresh go together on the My / Open / Past Games row", () => {
    const { $ } = dashboard(`<div class="gameButtonCol"><div id="switchGameRadio"></div></div><div class="SideColumn"><a id="refreshAll" class="btn btn-primary">Refresh (R)</a></div>`, true);
    assert.deepEqual(Array.from($("#tuydDashButtons").children().map((i, e) => e.id).get()), ["tuydChatLink", "refreshAll"]);
    assert.equal($("#tuydDashButtons").parent().hasClass("gameButtonCol"), true);
    assert.equal($(".SideColumn #refreshAll").length, 0);
    assert.ok($("#tuydChatLink").hasClass("btn-primary"));
    assert.equal($("#tuydChatLink").attr("href"), "/MultiPlayer?ChatRoom=1");
});

test("without it, Chat sits next to Refresh; it waits for the script's Refresh button to appear", () => {
    let { $, later } = dashboard(`<div><a id="refreshAll" class="btn btn-primary">Refresh (R)</a></div>`, false);
    assert.equal($("#tuydChatLink").next().attr("id"), "refreshAll");
    ({ $, later } = dashboard(`<div id="side"><a id="RefreshBtn2" class="btn btn-primary">Refresh (F5)</a></div>`, false));
    assert.equal($("#tuydChatLink").length, 0, "waits while the script may still replace war.app's button");
    $("#RefreshBtn2").attr("id", "refreshAll");
    later.splice(0).forEach((fn) => fn());
    assert.equal($("#tuydChatLink").next().attr("id"), "refreshAll");
    ({ $, later } = dashboard(`<table id="MyGamesTable"><thead><tr><td><h2>My Games</h2><span id="NumberOfMyGamesLabel">(6)</span></td></tr></thead></table>`, false));
    for (let i = 0; i < 60 && later.length; i++) later.splice(0).forEach((fn) => fn());
    assert.equal($("#tuydChatLink").prev().attr("id"), "NumberOfMyGamesLabel");
});

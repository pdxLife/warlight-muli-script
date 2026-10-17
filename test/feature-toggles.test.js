const { test } = require("node:test");
const assert = require("node:assert/strict");
const { functionSources, createDom, load, domGlobals, flush } = require("./harness");

const KEY = "tidyUpYourDashboard.disabledFeatures";

function setup() {
    const { dom, $ } = createDom(`<div id="userscriptMenu"><div class="modal-body"></div></div>`);
    const updates = [];
    const Database = {
        Table: { Settings: "Settings" },
        Row: { Settings: { Name: "name" } },
        stored: undefined,
        update(table, value) {
            updates.push(value);
            this.stored = value;
            return Promise.resolve();
        },
        readIndex(table, row, name, cb) {
            cb(this.stored);
        }
    };
    const ctx = load([...functionSources.keys()], {
        ...domGlobals(dom, $),
        localStorage: dom.window.localStorage,
        DISABLED_FEATURES_KEY: KEY,
        Database,
        logData: ""
    });
    return { ctx, dom, $, updates, Database };
}

test("toggleable features have unique names and a section", () => {
    const { ctx } = setup();
    const features = ctx.toggleableFeatures();
    const names = features.map((f) => f.name);
    assert.ok(features.length >= 20, `only ${features.length} toggleable features`);
    assert.equal(new Set(names).size, names.length, "feature names are storage keys and must be unique");
    for (const feature of features) {
        assert.equal(typeof feature.run, "function", feature.name);
    }
});

test("core features have no switch", () => {
    const { ctx } = setup();
    const names = ctx.toggleableFeatures().map((f) => f.name);
    for (const core of ["dashboard", "dashboard loader", "global styles", "private notes", "hide coins", "maak.ch features"]) {
        assert.ok(!names.includes(core), core);
    }
});

test("runFeatures skips features the user turned off, but never core ones", () => {
    const { ctx, dom } = setup();
    dom.window.localStorage.setItem(KEY, JSON.stringify(["Map search", "core"]));
    const ran = [];
    ctx.runFeatures([
        { name: "Map search", section: "Tournaments", run: () => ran.push("Map search") },
        { name: "Trophies", section: "Profile", run: () => ran.push("Trophies") },
        { name: "core", run: () => ran.push("core") }
    ]);
    assert.deepEqual(ran, ["Trophies", "core"]);
});

test("a corrupt stored list is treated as nothing disabled", () => {
    const { ctx, dom } = setup();
    dom.window.localStorage.setItem(KEY, "{not json");
    assert.deepEqual(Array.from(ctx.disabledFeatures()), []);
});

const MENU_SECTIONS = [["Dashboard", "Dashboard"], ["Tournaments", "Tournaments"], ["Community", "Ladders & community"], ["Profile", "Profile"], ["Clans", "Clans"],
    ["Forum", "Forum"], ["Maps & levels", "Maps & levels"], ["Other", "Other"], ["Third-party data", "Third-party data"]];
const SETTINGS = [
    { id: "scrollGames", text: "Fixed Window with Scrollable Games", section: "Dashboard", help: "x" },
    { id: "hideOffTopic", text: "Automatically Hide Off-Topic Threads", section: "Forum" },
    { id: "useMaakServices", text: "Load MTL Ladder (via maak.ch)", section: "Third-party data" }
];

function menu({ open = undefined } = {}) {
    const { ctx, dom, $, updates } = setup();
    ctx.MENU_SECTIONS = MENU_SECTIONS;
    ctx.MENU_SECTIONS_KEY = "tidyUpYourDashboard.menuSections";
    if (open) dom.window.localStorage.setItem(ctx.MENU_SECTIONS_KEY, JSON.stringify(open));
    $("#userscriptMenu .modal-body").append('<input id="menuSearch">' + ctx.renderMenuSections(SETTINGS, ctx.toggleableFeatures(), ctx.disabledFeatures(), ctx.openMenuSections(), (s) => s.help ? "<img class='help-icon'>" : ""));
    ctx.setupMenuSections();
    return { ctx, dom, $, updates };
}

test("the menu groups each area's settings and feature switches into one foldable section", () => {
    const { $ } = menu();
    const sections = $("#userscriptMenu .menuSection");
    const headings = sections.map((i, el) => $(el).children(".menuSectionHeader").contents().first().text()).get();
    assert.deepEqual(headings.slice(0, 3), ["Dashboard", "Tournaments", "Ladders & community"]);
    assert.ok(headings.includes("Forum") && headings.includes("Third-party data"));
    const dashboard = $(".menuSection[data-section='Dashboard']");
    assert.equal(dashboard.find(".settingsListItem").first().text(), "Fixed Window with Scrollable Games", "settings first, then the area's features");
    assert.ok(dashboard.find(".featureToggle[data-feature='Open Games filter']").length);
    assert.equal(dashboard.find(".menuSectionCount").text(), String(dashboard.find(".settingsListItem").length));
    assert.ok($(".menuSection[data-section='Forum'] #hideOffTopic").length, "a setting sits in its own area's section");
    assert.deepEqual($(".menuSection.open").map((i, el) => $(el).attr("data-section")).get(), ["Dashboard"], "only Dashboard starts open");
});

test("folding a section is remembered for next time", () => {
    const { $, dom } = menu();
    $(".menuSection[data-section='Forum'] > .menuSectionHeader").trigger("click");
    $(".menuSection[data-section='Dashboard'] > .menuSectionHeader").trigger("click");
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem("tidyUpYourDashboard.menuSections")), ["Forum"]);
    const again = menu({ open: ["Forum"] });
    assert.deepEqual(again.$(".menuSection.open").map((i, el) => again.$(el).attr("data-section")).get(), ["Forum"]);
});

test("searching shows only matching switches, in their sections opened, and clearing puts it back", () => {
    const { ctx, $ } = menu();
    const menuEl = $("#userscriptMenu");
    ctx.filterMenu(menuEl, "hide");
    assert.ok(menuEl.hasClass("menuSearching"));
    const forum = $(".menuSection[data-section='Forum']");
    assert.ok(forum.hasClass("menuSectionMatch"), "a section with a match opens while searching");
    assert.ok(!forum.find("#hideOffTopic").closest(".settingsListItem").hasClass("menuItemHidden"));
    assert.ok($("#scrollGames").closest(".settingsListItem").hasClass("menuItemHidden"), "non-matching switches are hidden");
    assert.ok($(".menuSection[data-section='Third-party data']").hasClass("menuSectionHidden"), "a section with no match is hidden");

    ctx.filterMenu(menuEl, "tournaments");
    const tournaments = $(".menuSection[data-section='Tournaments']");
    assert.equal(tournaments.find(".settingsListItem.menuItemHidden").length, 0, "a matching heading shows all of its switches");
    assert.ok(tournaments.hasClass("menuHeadingMatch"), "and its buttons");
    assert.ok(!$(".menuSection[data-section='Dashboard']").hasClass("menuHeadingMatch"));

    ctx.filterMenu(menuEl, "");
    assert.ok(!menuEl.hasClass("menuSearching"));
    assert.equal($(".menuItemHidden, .menuSectionHidden, .menuSectionMatch").length, 0);
    assert.deepEqual($(".menuSection.open").map((i, el) => $(el).attr("data-section")).get(), ["Dashboard"], "the folding is as it was");
});

test("menu switches reflect and save the disabled list", async () => {
    const { ctx, dom, $, updates } = menu();
    dom.window.localStorage.setItem(KEY, JSON.stringify(["Trophies"]));
    $("#userscriptMenu .modal-body").empty().append(ctx.renderMenuSections(SETTINGS, ctx.toggleableFeatures(), ctx.disabledFeatures(), ["Dashboard"], () => ""));

    assert.equal($(".featureToggle[data-feature='Trophies']").prop("checked"), false);
    assert.equal($(".featureToggle[data-feature='Map search']").prop("checked"), true);

    $(".featureToggle[data-feature='Trophies']").prop("checked", true);
    $(".featureToggle[data-feature='Map search']").prop("checked", false);
    await ctx.storeFeatureToggles();

    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(KEY)), ["Map search"]);
    assert.deepEqual(JSON.parse(JSON.stringify(updates.at(-1))), { name: "disabledFeatures", value: ["Map search"] });
});

test("the localStorage mirror is re-synced from the database", async () => {
    const { ctx, dom, Database } = setup();
    dom.window.localStorage.setItem(KEY, JSON.stringify(["Stale"]));

    Database.stored = { name: "disabledFeatures", value: ["Map search"] };
    ctx.syncDisabledFeatures();
    await flush();
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(KEY)), ["Map search"]);

    Database.stored = undefined;
    ctx.syncDisabledFeatures();
    await flush();
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(KEY)), []);
});

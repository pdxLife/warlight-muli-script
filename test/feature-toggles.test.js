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

test("menu switches reflect and save the disabled list", async () => {
    const { ctx, dom, $, updates } = setup();
    dom.window.localStorage.setItem(KEY, JSON.stringify(["Trophies"]));
    $("#userscriptMenu .modal-body").append(ctx.renderFeatureToggles());

    assert.equal($(".featureToggle[data-feature='Trophies']").prop("checked"), false);
    assert.equal($(".featureToggle[data-feature='Map search']").prop("checked"), true);
    assert.ok($(".featureSection").filter((i, el) => $(el).text() === "Tournaments").length);

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

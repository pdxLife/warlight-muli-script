const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64");

function settle(result, cb) {
    if (typeof cb === "function") cb();
    return Promise.resolve(result);
}

function fakeDatabase() {
    const calls = { clear: [], add: [], update: [] };
    return {
        calls,
        Table: { Bookmarks: "Bookmarks", Settings: "Settings", BlacklistedForumThreads: "BlacklistedForumThreads", TournamentData: "TournamentData", QuickmatchTemplates: "QuickmatchTemplates" },
        Exports: { Bookmarks: "Bookmarks", Settings: "Settings", BlacklistedForumThreads: "BlacklistedForumThreads" },
        clear: (table, cb) => settle(calls.clear.push(table), cb),
        add: (table, value, cb) => settle(calls.add.push({ table, value }), cb),
        update: (table, value, key, cb) => settle(calls.update.push({ table, value }), cb)
    };
}

function setupImport(backup) {
    const { dom, $ } = createDom(`<textarea id="importSettingsBox"></textarea>`);
    $.fn.modal = function () { return this; };
    $("#importSettingsBox").val(backup);
    const Database = fakeDatabase();
    const modals = [];
    const reloads = [];
    const ctx = load(["importSettings", "parseSettingsBackup"], {
        ...domGlobals(dom, $),
        Database,
        log: () => { },
        CreateModal: (...args) => modals.push(args),
        wljs_WaitDialogJS: { Start() { }, Stop() { } },
        location: { reload: () => reloads.push(true) }
    });
    return { ctx, Database, modals, reloads };
}

for (const [label, backup] of Object.entries({
    "garbage text": "definitely not a backup",
    "truncated backup": encode([{ table: "Bookmarks", data: [] }]).slice(0, 10),
    "unknown table": encode([{ table: "TournamentData", data: [] }]),
    "wrong shape": encode({ table: "Bookmarks", data: [] })
})) {
    test(`importSettings rejects ${label} without touching the database`, async () => {
        const { ctx, Database, modals, reloads } = setupImport(backup);
        ctx.importSettings();
        await flush();
        assert.deepEqual(Database.calls.clear, []);
        assert.deepEqual(Database.calls.add, []);
        assert.equal(modals.length, 1);
        assert.equal(reloads.length, 0);
    });
}

test("importSettings replaces only exported tables with the backup contents", async () => {
    const backup = encode([
        { table: "Bookmarks", data: [{ name: "A", order: 0 }] },
        { table: "Settings", data: [{ name: "scrollGames", value: true }] }
    ]);
    const { ctx, Database, modals, reloads } = setupImport(backup);
    ctx.importSettings();
    await flush();
    assert.deepEqual(Database.calls.clear.sort(), ["BlacklistedForumThreads", "Bookmarks", "Settings"]);
    assert.deepEqual(Database.calls.add.map((c) => c.table), ["Bookmarks", "Settings"]);
    assert.equal(modals.length, 0);
    assert.equal(reloads.length, 1);
});

test("importSettings reports a failed write instead of hanging", async () => {
    const { ctx, Database, modals, reloads } = setupImport(encode([{ table: "Bookmarks", data: [{ name: "A" }] }]));
    Database.add = () => Promise.reject(new Error("ConstraintError"));
    ctx.importSettings();
    await flush();
    assert.equal(modals.length, 1);
    assert.equal(reloads.length, 0);
});

test("setupSettingsDatabase reloads two seconds after saving defaults", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const { dom, $ } = createDom();
    const Database = fakeDatabase();
    const reloads = [];
    const ctx = load(["setupSettingsDatabase"], {
        ...domGlobals(dom, $),
        Database,
        userscriptSettings: [{ id: "scrollGames", selected: true }, { id: "hideCoinsGlobally", selected: false }],
        wljs_WaitDialogJS: { Start() { } },
        setTimeout: (...args) => setTimeout(...args),
        location: { reload: () => reloads.push(true) }
    });

    ctx.setupSettingsDatabase();
    await flush();
    assert.deepEqual(Database.calls.update.map((c) => c.value.name), ["scrollGames", "hideCoinsGlobally"]);
    assert.equal(ctx.sessionStorage.getItem("showUserscriptMenu"), "true");
    assert.equal(reloads.length, 0);
    t.mock.timers.tick(1999);
    assert.equal(reloads.length, 0);
    t.mock.timers.tick(1);
    assert.equal(reloads.length, 1);
});

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { IDBFactory } = require("fake-indexeddb");
const { load } = require("./harness");

function openDatabase(globals = {}) {
    const logs = [];
    const ctx = load(["setupDatabase"], { indexedDB: new IDBFactory(), log: (entry) => logs.push(String(entry)), ...globals });
    ctx.setupDatabase();
    const ready = new Promise((resolve) => ctx.Database.init(resolve));
    return { ctx, logs, ready };
}

const call = (fn, ...args) => new Promise((resolve) => fn(...args, (result) => resolve(Array.isArray(result) ? Array.from(result) : result)));

test("init opens the database without leaking db onto window", async () => {
    const { ctx, ready } = openDatabase();
    await ready;
    assert.equal(Object.prototype.hasOwnProperty.call(ctx, "db"), false);
    assert.equal(ctx.Database.db, undefined);
});

test("init reports when IndexedDB is unavailable", () => {
    const logs = [];
    const ctx = load(["setupDatabase"], { log: (entry) => logs.push(String(entry)) });
    ctx.setupDatabase();
    let called = false;
    ctx.Database.init(() => { called = true; });
    assert.equal(called, false);
    assert.ok(logs.includes("IndexedDB not supported"));
});

test("settings round-trip through update and readIndex", async () => {
    const { ctx, ready } = openDatabase();
    await ready;
    const { Database } = ctx;
    await call(Database.update, Database.Table.Settings, { name: "scrollGames", value: true }, undefined);
    await call(Database.update, Database.Table.Settings, { name: "scrollGames", value: false }, undefined);
    const setting = await call(Database.readIndex, Database.Table.Settings, Database.Row.Settings.Name, "scrollGames");
    assert.equal(setting.value, false);
    const missing = await call(Database.readIndex, Database.Table.Settings, Database.Row.Settings.Name, "nope");
    assert.equal(missing, undefined);
});

test("bookmarks can be added, listed, deleted and cleared", async () => {
    const { ctx, ready } = openDatabase();
    await ready;
    const { Database } = ctx;
    await call(Database.add, Database.Table.Bookmarks, { name: "A", url: "https://war.app/a", order: 0 });
    await call(Database.add, Database.Table.Bookmarks, { name: "B", url: "https://war.app/b", order: 1 });

    let bookmarks = await call(Database.readAll, Database.Table.Bookmarks);
    assert.deepEqual(bookmarks.map((b) => b.name), ["A", "B"]);
    assert.ok(bookmarks.every((b) => typeof b.id === "number"));

    await call(Database.delete, Database.Table.Bookmarks, bookmarks[0].id);
    bookmarks = await call(Database.readAll, Database.Table.Bookmarks);
    assert.deepEqual(bookmarks.map((b) => b.name), ["B"]);

    await call(Database.clear, Database.Table.Bookmarks);
    assert.equal((await call(Database.readAll, Database.Table.Bookmarks)).length, 0);
});

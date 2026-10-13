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

test("methods return promises as well as calling callbacks", async () => {
    const { ctx, ready } = openDatabase();
    await ready;
    const { Database } = ctx;
    await Database.add(Database.Table.Bookmarks, { name: "A", order: 0 });
    const bookmarks = await Database.readAll(Database.Table.Bookmarks);
    assert.equal(bookmarks.length, 1);
    assert.equal((await Database.read(Database.Table.Bookmarks, bookmarks[0].id)).name, "A");
});

test("settings saved earlier are cached at init", async () => {
    const indexedDB = new IDBFactory();
    const first = openDatabase({ indexedDB });
    await first.ready;
    await first.ctx.Database.update("Settings", { name: "scrollGames", value: true }, undefined);

    const second = openDatabase({ indexedDB });
    await second.ready;
    const { Database } = second.ctx;
    const setting = await Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "scrollGames");
    assert.equal(setting.value, true);
});

test("settings reads see writes issued before them and return copies", async () => {
    const { ctx, ready } = openDatabase();
    await ready;
    const { Database } = ctx;
    const name = Database.Row.Settings.Name;
    Database.update(Database.Table.Settings, { name: "tableSort", value: [{ id: 1 }] }, undefined);
    const read = await Database.readIndex(Database.Table.Settings, name, "tableSort");
    assert.equal(read.value[0].id, 1);

    read.value[0].id = 99;
    assert.equal((await Database.readIndex(Database.Table.Settings, name, "tableSort")).value[0].id, 1);

    Database.clear(Database.Table.Settings);
    assert.equal(await Database.readIndex(Database.Table.Settings, name, "tableSort"), undefined);
});

test("settings callbacks still run asynchronously", async () => {
    const { ctx, ready } = openDatabase();
    await ready;
    const { Database } = ctx;
    const order = [];
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "x", () => order.push("callback"));
    order.push("after call");
    await new Promise(setImmediate);
    assert.deepEqual(order, ["after call", "callback"]);
});

test("errors in callbacks and failed requests are logged", async () => {
    const { ctx, logs, ready } = openDatabase();
    await ready;
    const { Database } = ctx;
    Database.readAll(Database.Table.Bookmarks, () => { throw new Error("boom"); });
    await assert.rejects(Database.readAll("NoSuchTable"));
    await new Promise(setImmediate);
    assert.ok(logs.some((l) => l.includes("readAll Bookmarks") && l.includes("boom")), logs.join("\n"));
    assert.ok(logs.some((l) => l.includes("readAll NoSuchTable")), logs.join("\n"));
});

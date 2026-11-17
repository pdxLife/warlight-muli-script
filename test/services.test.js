const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { source, load } = require("./harness");

const le = (n) => { const b = Buffer.alloc(4); b.writeInt32LE(n); return b.toString("hex").toUpperCase(); };
const request = (op) => "F200" + "39F1475A" + le(4) + le(op) + "00";

function services() {
    const ctx = load(["noteServiceOp", "serviceOp", "serviceName"]);
    vm.runInContext(source.match(/^var WARAPP_SERVICE_OPS = \{[\s\S]*?^\};/m)[0] + "\nvar seenServiceOps = {};", ctx);
    return ctx;
}

test("serviceOp gives war.app's current message numbers, and the ones war.app's own requests carry", () => {
    const ctx = services();
    assert.equal(ctx.serviceOp("GetClanWar"), 311);
    assert.equal(ctx.serviceOp("GetMyTournaments"), 90);
    assert.equal(ctx.serviceName(314), "GetClanWarGames");
    assert.equal(ctx.serviceOp("NoSuchCall"), null);
    ctx.noteServiceOp("GetClanWar", request(311).toLowerCase());
    assert.equal(ctx.serviceOp("GetClanWarMap"), 312);
    ctx.noteServiceOp("GetClanWars", request(322));
    assert.equal(ctx.serviceOp("GetClanWarGames"), 314, "a call the table doesn't list says nothing about the table");
    ctx.noteServiceOp("GetClanWar", "not hex");
    ctx.noteServiceOp("GetClanWar", request(311).replace("39F1475A", "39F1475B"));
    assert.equal(ctx.serviceOp("GetClanWar"), 311);
});

test("after war.app renumbers its messages, serviceOp only gives the numbers it has seen war.app use", () => {
    const ctx = services();
    ctx.noteServiceOp("GetClanWar", request(320));
    assert.equal(ctx.serviceOp("GetClanWar"), 320);
    assert.equal(ctx.serviceName(320), "GetClanWar");
    assert.equal(ctx.serviceOp("GetClanWarGames"), null);
    assert.equal(ctx.serviceName(314), null);
    ctx.noteServiceOp("GetClanWarGames", request(323));
    assert.equal(ctx.serviceOp("GetClanWarGames"), 323);
});

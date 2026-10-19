const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./harness");

const MINUTE = 60 * 1000;

test("Open Games refreshes once the minutes have passed, while it's on screen and you're not reading it", () => {
    const ctx = load(["openGamesRefreshDue"]);
    assert.equal(ctx.openGamesRefreshDue(5 * MINUTE, 0, 5, true, false), true);
    assert.equal(ctx.openGamesRefreshDue(4 * MINUTE, 0, 5, true, false), false, "not yet");
    assert.equal(ctx.openGamesRefreshDue(9 * MINUTE, 0, 5, false, false), false, "another tab is shown, or the dashboard tab is hidden");
    assert.equal(ctx.openGamesRefreshDue(9 * MINUTE, 0, 5, true, true), false, "the pointer is over the list, or the Filter panel is open");
    assert.equal(ctx.openGamesRefreshDue(99 * MINUTE, 0, 0, true, false), false, "0 turns it off");
});

test("the interval is 5 minutes until you choose another", () => {
    const store = new Map();
    const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
    const ctx = load(["openGamesRefreshMinutes"], { localStorage, OPEN_GAMES_REFRESH_KEY: "tidyUpYourDashboard.openGamesRefreshMinutes" });
    assert.equal(ctx.openGamesRefreshMinutes(), 5);
    store.set("tidyUpYourDashboard.openGamesRefreshMinutes", "2");
    assert.equal(ctx.openGamesRefreshMinutes(), 2);
    store.set("tidyUpYourDashboard.openGamesRefreshMinutes", "0");
    assert.equal(ctx.openGamesRefreshMinutes(), 0);
});

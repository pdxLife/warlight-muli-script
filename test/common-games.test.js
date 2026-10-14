const { test } = require("node:test");
const assert = require("node:assert/strict");
const { source, createDom, load, domGlobals } = require("./harness");

// Mirrors war.app's /CommonGames?p=… table (names are invented).
function commonGames(rows) {
    return `<h1>${rows.length} Common Games with Rival</h1><table class="dataTable"><thead><tr><td>Name</td><td>Date Started</td><td>Teams</td><td>Your state</td></tr></thead><tbody>`
        + rows.map(([teams, state], i) => `<tr><td><a href="/MultiPlayer?GameID=${i}">Game ${i}</a></td><td>1/${i + 1}/2026</td><td>${teams}</td><td>${state}</td></tr>`).join("")
        + `</tbody></table>`;
}

function headToHead(rows) {
    const { dom, $ } = createDom(commonGames(rows), "https://war.app/CommonGames?p=1");
    const ctx = load(["setupCommonGamesHead2Head"], { ...domGlobals(dom, $), addCSS: () => { } });
    ctx.setupCommonGamesHead2Head();
    return Array.from($(".head2head tbody tr").map(function () {
        return $(this).find("td").last().text();
    }).get());
}

test("head-to-head counts finished 1v1 games only", () => {
    assert.deepEqual(headToHead([["1v1", "Won"], ["1v1", "Won"], ["1v1", "Lost"], ["1v1", "Playing"], ["1v1", "Ended by vote"], ["2v2", "Won"]]),
        ["5", "2", "1", "66.67%"]);
});

test("head-to-head has no win rate while no 1v1 game has finished", () => {
    assert.deepEqual(headToHead([["1v1", "Playing"], ["2v2", "Lost"]]), ["1", "0", "0", "–"]);
});

test("the Common Games feature leaves war.app's jQuery in place", () => {
    assert.doesNotMatch(source, /window\.\$ = \$\$\$/);
    assert.doesNotMatch(source, /jQuery\.noConflict\(true\);\s*\n\s*var dataTable/);
    assert.match(source, /run: setupCommonGamesDataTable \}/);
});

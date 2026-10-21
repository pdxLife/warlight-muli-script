const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush } = require("./harness");

// Mirrors an Open Games row on war.app's dashboard (names and ids are invented).
// seats: each seat's hover text, "|" for the gap war.app leaves between set teams. icons: "File.png" or ["File.png", "hover text"].
function openGameRow(id, name, { boot = "3 days", auto = false, coins = false, seats = ["Open Seat"], icons = [], map = null } = {}) {
    const href = auto ? `/MultiPlayer?AutoGameID=wlnet_${id}&amp;From=MPDashboard` : `/MultiPlayer?GameID=${id}&amp;From=MPDashboard`;
    return `<tr class="GameRow" gameid="${id}"><td style="width:142px"><span style="position: relative"><a href="${href}"><img class="MyGamesGameThumbnail" src="${map ? `https://warappcdn.com/s3/Data/Thumbs/Maps/${map}/90_Fogged.jpg` : "x.jpg"}"></a><span class="BootTimeLabel" style="color: #00DD00">${boot}</span></span></td>`
        + `<td><a style="font-size: 17px; color: white" href="${href}">${name}</a><br>`
        + (coins ? `<font color="gold">Entry fee: 5 coins. Prize: 9 coins</font><br>` : "")
        + `<div class="MyGamesGameBoxesRow">${seats.map((title) => title === "|" ? "&nbsp;&nbsp;" : `<span class="MyGamesGameBox" title="${title}">${title === "Open Seat" ? '<span class="MyGamesGameBoxOpenSeat">O</span>' : "&nbsp;"}</span>`).join("")}</div>`
        + `<div>${icons.map((icon) => [].concat(icon)).map(([file, title = file]) => `<img src="https://warappcdn.com/UJS/Resources/GameInfoIcons/${file}" width="18" height="18" title="${title}">`).join("")}</div></td></tr>`;
}

function openGames(rows) {
    return `<table id="OpenGamesTable" class="dataTable"><thead><tr><td colspan="2"><div style="float:left"><h2>Open Games&nbsp;</h2><a href="/MultiPlayer/OpenGames" id="ViewAllOpenGamesLink">View All</a> | <a href="/MultiPlayer?GameInviteCode=1">Have a code?</a>`
        + `<br>4 games are being hidden due to prerequisites. <a href="/MultiPlayer/FilteredOpenGames">View Them</a></div></td></tr></thead>`
        + `<tbody>${rows.join("")}<tr><td colspan="2"><a href="#" id="ShowMoreOpenGamesLink">+ Show 35 more open games</a></td></tr></tbody></table>`;
}

const FUNCTIONS = ["parseBootTime", "parseFilterKeywords", "normalizeOpenGamesFilter", "openGameIsFiltered", "applyOpenGamesFilter", "readOpenGamesFilterForm", "setupOpenGamesFilter", "openGameSettingIcons", "openGameCards", "openGameIcons", "openGameHasSetting", "openGameTeamSize", "openGamePlayers", "nameHasKeyword", "htmlEscape"];

function setup(rows, saved, { muted = [], maps = {} } = {}) {
    const { dom, $ } = createDom(openGames(rows));
    const writes = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        addCSS: () => { },
        readMutedPlayers: (callback) => callback(muted),
        loadMapNames: (callback) => callback(maps),
        Database: {
            Table: { Settings: "Settings" },
            Row: { Settings: { Name: "name" } },
            readIndex: (table, row, value, callback) => callback(saved === undefined ? undefined : { name: value, value: saved }),
            update: (table, row) => writes.push(JSON.parse(JSON.stringify(row)))
        }
    });
    ctx.setupOpenGamesFilter();
    const visibleIds = () => $("#OpenGamesTable tr.GameRow").filter(function () {
        return !$(this).hasClass("tuyd-filtered");
    }).map(function () {
        return $(this).attr("gameid");
    }).get();
    return { ctx, dom, $, writes, visibleIds };
}

const filter = (overrides) => ({ hideAutoGames: false, hideCoinGames: false, minBootHours: 0, maxBootHours: 0, keywords: [], mapWords: [], minPlayers: 0, maxPlayers: 0, minOpenSeats: 0, maxOpenSeats: 0, teamGames: "", teamSize: "", hideMuted: false, hideSettings: [], ...overrides });

test("reads boot time labels in minutes", () => {
    const { ctx } = setup([]);
    assert.equal(ctx.parseBootTime("5 minutes"), 5);
    assert.equal(ctx.parseBootTime("1 day"), 1440);
    assert.equal(ctx.parseBootTime("3 days 15 hours"), 3 * 1440 + 15 * 60);
    assert.equal(ctx.parseBootTime("2 weeks"), 2 * 10080);
    assert.equal(ctx.parseBootTime(""), null);
});

test("stored filters are normalized, so bad imports fall back to defaults", () => {
    const { ctx } = setup([]);
    const normalize = (value) => JSON.parse(JSON.stringify(ctx.normalizeOpenGamesFilter(value)));
    assert.deepEqual(normalize(undefined), filter());
    assert.deepEqual(normalize({ hideAutoGames: "yes", minBootHours: -4, keywords: "rp" }), filter());
    assert.deepEqual(normalize({ hideCoinGames: true, minBootHours: "12", keywords: [" RP ", "", "Diplo"] }), filter({ hideCoinGames: true, minBootHours: 12, keywords: ["rp", "diplo"] }));
});

test("each filter hides only the games it targets", () => {
    const rows = [
        openGameRow("1", "Plain game"),
        openGameRow("2", "1 v 1 multi-day (Auto Game)", { auto: true }),
        openGameRow("3", "Coin game", { coins: true }),
        openGameRow("4", "Quick game", { boot: "5 minutes" }),
        openGameRow("5", "Hunger games RP/FFA")
    ];
    const { ctx, $, visibleIds } = setup(rows);
    const hiddenBy = (overrides) => {
        ctx.applyOpenGamesFilter(filter(overrides));
        return ["1", "2", "3", "4", "5"].filter((id) => visibleIds().indexOf(id) === -1);
    };
    assert.deepEqual(hiddenBy({}), []);
    assert.deepEqual(hiddenBy({ hideAutoGames: true }), ["2"]);
    assert.deepEqual(hiddenBy({ hideCoinGames: true }), ["3"]);
    assert.deepEqual(hiddenBy({ minBootHours: 24 }), ["4"]);
    assert.deepEqual(hiddenBy({ keywords: ["rp"] }), ["5"]);
    assert.equal($("#ShowMoreOpenGamesLink").closest("tr").hasClass("tuyd-filtered"), false);
});

test("stored seat, team and setting filters are normalized", () => {
    const { ctx } = setup([]);
    const normalize = (value) => JSON.parse(JSON.stringify(ctx.normalizeOpenGamesFilter(value)));
    assert.deepEqual(normalize({ minPlayers: "3.7", maxPlayers: -2, teamGames: "maybe", hideSettings: ["Commerce.png", "evil.png"] }),
        filter({ minPlayers: 3, hideSettings: ["Commerce.png"] }));
    assert.deepEqual(normalize({ teamGames: "none", hideSettings: "Commerce.png" }), filter({ teamGames: "none" }));
    assert.deepEqual(normalize({ teamGames: "ffa" }), filter({ teamGames: "ffa" }));
    assert.deepEqual(normalize({ teamGames: "noffa" }), filter({ teamGames: "noffa" }));
    assert.deepEqual(normalize({ teamGames: "1v1" }), filter({ teamGames: "1v1" }));
    assert.deepEqual(normalize({ teamGames: "no1v1" }), filter({ teamGames: "no1v1" }));
});

test("filters by seat count, team games and game settings", () => {
    const rows = [
        openGameRow("1", "1v1", { seats: ["Alice", "Open Seat"], icons: ["AutoDist.png"] }),
        openGameRow("2", "3v3", { seats: ["Bob", "Open Seat", "Open Seat", "Open Seat", "Open Seat", "Open Seat"], icons: ["Teams.png", "Cards.png"] }),
        openGameRow("3", "FFA", { seats: ["Cy", "Open Seat", "Open Seat", "Open Seat"], icons: ["Commerce.png", "LocalDeployment.png"] })
    ];
    const { ctx, visibleIds } = setup(rows);
    const shownBy = (overrides) => {
        ctx.applyOpenGamesFilter(filter(overrides));
        return Array.from(visibleIds());
    };
    assert.deepEqual(shownBy({ minPlayers: 3 }), ["2", "3"]);
    assert.deepEqual(shownBy({ maxPlayers: 4 }), ["1", "3"]);
    assert.deepEqual(shownBy({ minPlayers: 3, maxPlayers: 4 }), ["3"]);
    assert.deepEqual(shownBy({ teamGames: "only" }), ["2"]);
    assert.deepEqual(shownBy({ teamGames: "none" }), ["1", "3"]);
    assert.deepEqual(shownBy({ teamGames: "ffa" }), ["3"], "FFA: 3+ seats, no teams");
    assert.deepEqual(shownBy({ teamGames: "noffa" }), ["1", "2"]);
    assert.deepEqual(shownBy({ teamGames: "1v1" }), ["1"], "1 v 1: two seats, no teams");
    assert.deepEqual(shownBy({ teamGames: "no1v1" }), ["2", "3"]);
    const unknown = setup([openGameRow("4", "No seats shown", { seats: [] })]);
    unknown.ctx.applyOpenGamesFilter(filter({ teamGames: "ffa" }));
    assert.deepEqual(Array.from(unknown.visibleIds()), ["4"], "without seat boxes it can't tell, so it stays");
    assert.deepEqual(shownBy({ hideSettings: ["LocalDeployment.png", "Cards.png"] }), ["1"]);
});

test("the panel reads and restores the seat, team and setting filters", () => {
    const { $, writes, visibleIds } = setup([
        openGameRow("1", "1v1", { seats: ["A", "Open Seat"] }),
        openGameRow("2", "Teams", { seats: ["A", "B", "C", "Open Seat"], icons: ["Teams.png", "Wastelands.png"] })
    ], { teamGames: "only", hideSettings: ["Fog.png"] });
    const panel = $("#OpenGamesFilterPanel");
    assert.equal(panel.find("[name=teamGames]").val(), "only");
    assert.equal(panel.find("[name=hideSetting][value='Fog.png']").prop("checked"), true);
    assert.deepEqual(Array.from(visibleIds()), ["2"]);
    panel.find("[name=hideSetting][value='Wastelands.png']").prop("checked", true).trigger("change");
    assert.deepEqual(Array.from(visibleIds()), []);
    panel.find("[name=teamGames]").val("").trigger("change");
    panel.find("[name=maxPlayers]").val("2").trigger("change");
    assert.deepEqual(Array.from(visibleIds()), ["1"]);
    assert.deepEqual(writes.at(-1).value, filter({ maxPlayers: 2, hideSettings: ["Wastelands.png", "Fog.png"] }));
});

test("keywords match whole words only", () => {
    const { ctx, visibleIds } = setup([openGameRow("1", "Sharp shooters"), openGameRow("2", "Hunger games RP/FFA"), openGameRow("3", "Star Wars: Clone War")]);
    ctx.applyOpenGamesFilter(filter({ keywords: ["rp", "star wars"] }));
    assert.deepEqual(Array.from(visibleIds()), ["1"]);
});

test("adds a Filter link and panel that start from the saved filter", () => {
    const { $, visibleIds } = setup([openGameRow("1", "Plain game"), openGameRow("2", "Auto", { auto: true })], { hideAutoGames: true, minBootHours: 6, keywords: ["rp", "diplo"] });
    assert.equal($("#OpenGamesFilterLink").length, 1);
    assert.equal($("a[href*='GameInviteCode']").next().attr("id"), "OpenGamesFilterLink", "the link stays on the first header line");
    assert.equal($("#OpenGamesFilterCount").text(), "1 hidden");
    assert.deepEqual(Array.from(visibleIds()), ["1"]);
    const panel = $("#OpenGamesFilterPanel");
    assert.equal(panel.is(":visible"), false);
    $("#OpenGamesFilterLink").trigger("click");
    assert.equal(panel.is(":visible"), true);
    assert.equal(panel.find("[name=hideAutoGames]").prop("checked"), true);
    assert.equal(panel.find("[name=minBootHours]").val(), "6");
    assert.equal(panel.find("[name=keywords]").val(), "rp, diplo");
});

test("changing the panel saves the filter and applies it at once", () => {
    const { $, writes, visibleIds } = setup([openGameRow("1", "Plain game"), openGameRow("2", "Coin game", { coins: true })]);
    assert.equal($("#OpenGamesFilterCount").text(), "");
    $("#OpenGamesFilterPanel [name=hideCoinGames]").prop("checked", true).trigger("change");
    assert.deepEqual(Array.from(visibleIds()), ["1"]);
    assert.equal($("#OpenGamesFilterCount").text(), "1 hidden");
    $("#OpenGamesFilterPanel [name=keywords]").val(" Plain , ").trigger("change");
    assert.deepEqual(Array.from(visibleIds()), []);
    assert.deepEqual(writes.at(-1), { name: "openGamesFilter", value: filter({ hideCoinGames: true, keywords: ["plain"] }) });
});

test("rows the site renders later are filtered too", async () => {
    const { $, visibleIds } = setup([openGameRow("1", "Plain game")], { hideAutoGames: true });
    $("#OpenGamesTable tbody").append(openGameRow("2", "Auto", { auto: true }) + openGameRow("3", "Another plain game"));
    await flush();
    assert.deepEqual(Array.from(visibleIds()), ["1", "3"]);
    assert.equal($("#OpenGamesFilterCount").text(), "1 hidden");
});

test("does nothing on pages without the Open Games table", () => {
    const { dom, $ } = createDom("<div></div>");
    const ctx = load(FUNCTIONS, { ...domGlobals(dom, $), addCSS: () => assert.fail("should not run"), Database: { readIndex: () => assert.fail("should not run") } });
    ctx.setupOpenGamesFilter();
});

test("recognizes the View All open games page", () => {
    const at = (url) => load(["pageIsOpenGamesPage"], { location: { href: url } });
    assert.ok(at("https://war.app/MultiPlayer/OpenGames").pageIsOpenGamesPage());
    assert.ok(at("https://www.warzone.com/MultiPlayer/OpenGames?x=1").pageIsOpenGamesPage());
    assert.ok(!at("https://war.app/MultiPlayer/").pageIsOpenGamesPage());
    assert.ok(!at("https://war.app/MultiPlayer/OpenGamesArchive").pageIsOpenGamesPage());
});

function setupJoined(rows, player) {
    const { dom, $ } = createDom(openGames(rows));
    const ctx = load(["openGameHasPlayer", "markJoinedOpenGames", "setupJoinedOpenGames"], {
        ...domGlobals(dom, $),
        addCSS: () => { },
        playerDataReady: $.Deferred().resolve(player).promise()
    });
    ctx.setupJoinedOpenGames();
    const joinedIds = () => Array.from($("#OpenGamesTable tr.tuyd-joined").map(function () {
        return $(this).attr("gameid");
    }).get());
    return { $, joinedIds };
}

test("marks open games that have you in a seat", () => {
    const { joinedIds } = setupJoined([
        openGameRow("1", "Not joined", { seats: ["Alice", "Open Seat"] }),
        openGameRow("2", "Joined", { seats: ["Alice", "Me Myself", "Open Seat"] }),
        openGameRow("3", "Invited", { seats: ["Me Myself: Waiting for this player to join or decline the game", "Open Seat"] }),
        openGameRow("4", "Similar name", { seats: ["Me Myself and I", "Me", "Open Seat"] })
    ], { Name: "Me Myself" });
    assert.deepEqual(joinedIds(), ["2", "3"]);
});

test("marks joined games in rows the site renders later", async () => {
    const { $, joinedIds } = setupJoined([openGameRow("1", "First", { seats: ["Open Seat"] })], { Name: "Me" });
    $("#OpenGamesTable tbody").append(openGameRow("2", "Second", { seats: ["Me", "Open Seat"] }));
    await flush();
    assert.deepEqual(joinedIds(), ["2"]);
});

test("marks nothing without a player name", () => {
    const { joinedIds } = setupJoined([openGameRow("1", "Game", { seats: ["", "Open Seat"] })], { Name: null });
    assert.deepEqual(joinedIds(), []);
});

test("fog level, cards and the newer setting icons are read from war.app's hover texts", () => {
    const rows = [
        openGameRow("1", "Light", { icons: [["Fog.png", "Fog level: Light Fog"], ["Cards.png", "Reinforcement Card, Emergency Blockade Card"]] }),
        openGameRow("2", "Complete", { icons: [["Fog.png", "Fog level: Complete Fog"], ["Cards.png", "Blockade Card, Bomb Card"]] }),
        openGameRow("3", "Plain", { icons: [["Commander.png", "Commanders"], ["MinArmies.png", "Minimum armies per turn is 0 (normally 5)"]] })
    ];
    const { ctx, visibleIds } = setup(rows);
    const shownBy = (overrides) => {
        ctx.applyOpenGamesFilter(filter(overrides));
        return Array.from(visibleIds());
    };
    assert.deepEqual(shownBy({ hideSettings: ["Fog.png#less"] }), ["2", "3"]);
    assert.deepEqual(shownBy({ hideSettings: ["Fog.png#more"] }), ["1", "3"]);
    assert.deepEqual(shownBy({ hideSettings: ["Fog.png"] }), ["3"], "any fog other than normal, as before");
    assert.deepEqual(shownBy({ hideSettings: ["card:Blockade"] }), ["1", "3"], "Emergency Blockade isn't Blockade");
    assert.deepEqual(shownBy({ hideSettings: ["card:Emergency Blockade"] }), ["2", "3"]);
    assert.deepEqual(shownBy({ hideSettings: ["Commander.png"] }), ["1", "2"]);
    assert.deepEqual(shownBy({ hideSettings: ["MinArmies.png", "card:Bomb"] }), ["1"]);
});

test("boot time over, open seats left and team size", () => {
    const rows = [
        openGameRow("1", "Fast 2v2", { boot: "5 minutes", seats: ["Ann", "Bo", "|", "Open Seat", "Open Seat"], icons: [["Teams.png", "Team Game"]] }),
        openGameRow("2", "Random 3s", { boot: "1 day", seats: ["Cy", "Open Seat", "Open Seat", "Open Seat", "Open Seat", "Open Seat"], icons: [["Teams.png", "Team Game (random teams of 3)"]] }),
        openGameRow("3", "Almost full FFA", { boot: "3 days", seats: ["Di", "Ed", "Fa", "Open Seat"] }),
        openGameRow("4", "4v4", { boot: "2 days", seats: ["Gi", "Open Seat", "Open Seat", "Open Seat", "|", "Open Seat", "Open Seat", "Open Seat", "Open Seat"], icons: [["Teams.png", "Team Game"]] }),
        openGameRow("5", "Teams, no gaps", { seats: ["Open Seat", "Open Seat"], icons: [["Teams.png", "Team Game"]] })
    ];
    const { ctx, visibleIds } = setup(rows);
    const shownBy = (overrides) => {
        ctx.applyOpenGamesFilter(filter(overrides));
        return Array.from(visibleIds());
    };
    assert.deepEqual(shownBy({ maxBootHours: 24 }), ["1", "2"], "1 day is not over 24 hours; 3 days is");
    assert.deepEqual(shownBy({ minBootHours: 1, maxBootHours: 48 }), ["2", "4"]);
    assert.deepEqual(shownBy({ maxOpenSeats: 1 }), ["3"], "about to start");
    assert.deepEqual(shownBy({ minOpenSeats: 5 }), ["2", "4"], "room for a group");
    assert.deepEqual(shownBy({ teamSize: "2" }), ["1"], "set teams are counted from war.app's gaps between seats");
    assert.deepEqual(shownBy({ teamSize: "3" }), ["2"], "random teams say their size");
    assert.deepEqual(shownBy({ teamSize: "4" }), ["4"], "4 or more");
});

test("games with a muted player and maps by name can be hidden", () => {
    const rows = [
        openGameRow("1", "With Rude", { seats: ["Rude Player: Waiting for this player to join or decline the game", "Open Seat"], map: "16114" }),
        openGameRow("2", "Clean", { seats: ["Nice", "Open Seat"], map: "737" }),
        openGameRow("3", "Unknown map", { seats: ["Open Seat", "Open Seat"], map: "999" })
    ];
    const maps = { "16114": { id: "1", name: "Small Earth" }, "737": { id: "2", name: "Medium Europe" } };
    const { ctx, visibleIds } = setup(rows, undefined, { muted: ["rude player"], maps });
    const shownBy = (overrides, extra) => {
        ctx.applyOpenGamesFilter(filter(overrides), extra);
        return Array.from(visibleIds());
    };
    assert.deepEqual(shownBy({ hideMuted: true }, { muted: ["rude player"] }), ["2", "3"], "an invited player counts, in any case");
    assert.deepEqual(shownBy({ hideMuted: true }, { muted: [] }), ["1", "2", "3"]);
    assert.deepEqual(shownBy({ mapWords: ["earth"] }, { maps }), ["2", "3"], "a map war.app's list doesn't know stays");
    assert.deepEqual(shownBy({ mapWords: ["europe", "earth"] }, { maps }), ["3"]);
    assert.deepEqual(shownBy({ mapWords: ["earth"] }, {}), ["1", "2", "3"], "before the map names load, nothing is hidden by map");
});

test("the new choices are kept, checked and restored", () => {
    const { ctx } = setup([]);
    const normalize = (value) => JSON.parse(JSON.stringify(ctx.normalizeOpenGamesFilter(value)));
    assert.deepEqual(normalize({ maxBootHours: "48", minOpenSeats: "1.9", maxOpenSeats: -3, teamSize: "3", hideMuted: true, mapWords: [" Earth ", ""], hideSettings: ["Fog.png#more", "card:Bomb", "card:Joker", "KillRate.png"] }),
        filter({ maxBootHours: 48, minOpenSeats: 1, teamSize: "3", hideMuted: true, mapWords: ["earth"], hideSettings: ["Fog.png#more", "card:Bomb", "KillRate.png"] }));
    assert.equal(normalize({ teamSize: "5" }).teamSize, "");
    const saved = { maxBootHours: 12, mapWords: ["earth"], minOpenSeats: 2, teamSize: "2", hideMuted: true, hideSettings: ["card:Spy", "Fog.png#less"] };
    const { $, writes } = setup([openGameRow("1", "Game", { map: "16114" })], saved, { maps: { "16114": { id: "1", name: "Small Earth" } } });
    const panel = $("#OpenGamesFilterPanel");
    assert.equal(panel.find("[name=maxBootHours]").val(), "12");
    assert.equal(panel.find("[name=mapWords]").val(), "earth");
    assert.equal(panel.find("[name=minOpenSeats]").val(), "2");
    assert.equal(panel.find("[name=teamSize]").val(), "2");
    assert.equal(panel.find("[name=hideMuted]").prop("checked"), true);
    assert.equal(panel.find("[name=hideSetting][value='card:Spy']").prop("checked"), true);
    assert.equal(panel.find("[name=hideSetting][value='Fog.png#less']").prop("checked"), true);
    assert.ok($("#OpenGamesTable tr.GameRow").hasClass("tuyd-filtered"), "the saved map words hide Small Earth once the names load");
    panel.find("[name=teamSize]").val("").trigger("change");
    assert.equal(writes[writes.length - 1].value.teamSize, "");
    assert.equal(writes[writes.length - 1].value.maxBootHours, 12);
});

test("the setting and card groups fold, say how many are ticked, and the Filter link's arrow follows the panel", () => {
    const { $ } = setup([openGameRow("1", "Game")], { hideSettings: ["Commerce.png", "Fog.png#less", "card:Bomb"] });
    const panel = $("#OpenGamesFilterPanel");
    const ticked = (group) => panel.find(`details[data-group=${group}] .tuydFilterTicked`).text();
    assert.equal(panel.find("details").length, 2);
    assert.equal(panel.find("details[open]").length, 0, "folded at first");
    assert.equal(ticked("settings"), "(2 ticked)");
    assert.equal(ticked("cards"), "(1 ticked)");
    panel.find("[value='card:Bomb']").prop("checked", false).trigger("change");
    assert.equal(ticked("cards"), "");
    const link = $("#OpenGamesFilterLink");
    assert.equal(link.find(".tuydFilterArrow").length, 1);
    assert.ok(!link.hasClass("tuydFilterOpen"));
    link.trigger("click");
    assert.ok(link.hasClass("tuydFilterOpen"));
    assert.equal(link.attr("aria-expanded"), "true");
    link.trigger("click");
    assert.ok(!link.hasClass("tuydFilterOpen"));
});

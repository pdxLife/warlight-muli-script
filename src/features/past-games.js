// A profile link's p= (2921525624) is the player's ID (215256) with two more digits at each end; war.app's
// game data has the ID itself.
function gamePlayerId(playerId) {
    var match = /^\d{5,}$/.exec(String(playerId || ""));
    return match ? match[0].slice(2, -2) : null;
}

function pastGamePlayer(game, me) {
    return game.players.filter(function (player) {
        return me.id ? String(player.id) === String(me.id) : player.name === me.name;
    })[0] || null;
}

// A game's state in war.app's data: 2 lobby, 3 playing, 4 finished, 5 picking. A player's: 2 playing,
// 3 eliminated, 4 won, 5 declined, 6 removed by the host, 7 surrendered, 8 booted, 9 ended by vote.
// Past Games also lists games you created or run without playing in them.
function pastGameState(game, me) {
    if (game.state === 2) {
        return "lobby";
    }
    if (game.state === 4) {
        return "finished";
    }
    var mine = pastGamePlayer(game, me);
    if (mine && mine.state !== 2) {
        return "out";
    }
    return mine && !mine.committed ? "yourTurn" : "running";
}

function pastGameResult(game, me) {
    var mine = pastGamePlayer(game, me);
    return mine && { 3: "lost", 4: "won", 7: "lost", 8: "booted", 9: "vote" }[mine.state] || null;
}

// war.app's data marks tournament games; the other kinds are told apart by the names war.app gives them.
function pastGameType(game) {
    var name = String(game.name || "");
    if (game.tournament) {
        return "tournament";
    }
    if (isQuickmatchGameName(name)) {
        return "quickmatch";
    }
    if (/^Season [IVXLC]+: /.test(name)) {
        return "seasonal";
    }
    if (/^(?:\d+ v \d+|Real-Time) Ladder: /.test(name)) {
        return "ladder";
    }
    if (/^MTL\|/.test(name)) {
        return "mtl";
    }
    return /^CW: /.test(name) ? "clanWar" : "other";
}

function pastGamePlayerCount(game) {
    return game.players.filter(function (player) {
        return player.state !== 5 && player.state !== 6;
    }).length;
}

function pastGameStatusText(game, me) {
    var mine = pastGamePlayer(game, me);
    var out = mine && { 3: "Eliminated", 4: "Won", 5: "Declined", 6: "Removed by the host", 7: "Surrendered", 8: "Booted", 9: "Ended by vote" }[mine.state];
    if (out) {
        return out;
    }
    if (game.state === 2 || game.state === 4) {
        return game.state === 2 ? "Lobby" : "Finished";
    }
    if (mine && !mine.committed) {
        return game.state === 5 ? "Your turn to pick" : "Your turn";
    }
    if (game.state === 5) {
        return "Picking";
    }
    // A game's turn counts the turns played, so war.app shows the one being played as the next.
    return game.turn >= 0 ? "Turn " + (game.turn + 1) : "In progress";
}

// war.app's map list (Ajax/EnumerateMaps, every map at once): each map's thumbnail folder, ID and name.
// war.app's game data names a game's map by the same folder.
function parseMapList(html) {
    var maps = {};
    $(new DOMParser().parseFromString(html, "text/html")).find("img").each(function () {
        var folder = /\/Thumbs\/Maps\/(\d+)\//.exec($(this).attr("src") || "");
        var box = $(this).closest("div");
        var link = /\/Map\/(\d+)/.exec(box.find("a").first().attr("href") || "");
        var name = box.clone().children("font, a, img").remove().end().text().replace(/\s+/g, " ").trim();
        if (folder && link && name) {
            maps[folder[1]] = { id: link[1], name: name };
        }
    });
    return maps;
}

function pastGameMatches(game, filter, me) {
    var state = pastGameState(game, me);
    if (filter.state === "running" ? state !== "running" && state !== "yourTurn" : filter.state && state !== filter.state) {
        return false;
    }
    if ((filter.result && pastGameResult(game, me) !== filter.result) || (filter.type && pastGameType(game) !== filter.type)
        || (filter.map && String(game.map) !== filter.map)) {
        return false;
    }
    var players = pastGamePlayerCount(game);
    if ((filter.minPlayers && players < filter.minPlayers) || (filter.maxPlayers && players > filter.maxPlayers)
        || (filter.size === "oneVsOne" && players !== 2) || (filter.size === "more" && players <= 2)) {
        return false;
    }
    var query = String(filter.query || "").trim().toLowerCase();
    return !query || [game.name].concat(game.players.map(function (player) {
        return player.name;
    })).some(function (name) {
        return String(name || "").toLowerCase().indexOf(query) !== -1;
    });
}

function normalizePastGamesFilter(value) {
    value = value || {};
    var count = function (number) {
        number = parseInt(number, 10);
        return number > 0 ? number : 0;
    };
    var oneOf = function (choice, choices) {
        return choices.indexOf(choice) !== -1 ? choice : "";
    };
    return {
        state: oneOf(value.state, ["running", "yourTurn", "lobby", "finished", "out"]),
        result: oneOf(value.result, ["won", "lost", "booted", "vote"]),
        type: oneOf(value.type, ["quickmatch", "tournament", "seasonal", "ladder", "mtl", "clanWar", "other"]),
        map: /^\d+$/.test(String(value.map || "")) ? String(value.map) : "",
        minPlayers: count(value.minPlayers),
        maxPlayers: count(value.maxPlayers),
        size: oneOf(value.size, ["oneVsOne", "more"]),
        reversed: value.reversed === true,
        query: typeof value.query === "string" ? value.query : ""
    };
}

function pastGamesFilterIsSet(filter) {
    return !!(filter.state || filter.result || filter.type || filter.map || filter.minPlayers || filter.maxPlayers
        || filter.size || filter.reversed || String(filter.query || "").trim());
}

var MAP_NAMES_KEY = "tidyUpYourDashboard.mapNames";

// Map names by thumbnail folder, kept for a week: the list is one request of about 1.4 MB.
function loadMapNames(callback) {
    try {
        var cached = JSON.parse(localStorage.getItem(MAP_NAMES_KEY));
        if (cached && cached.maps && Date.now() - cached.at < 7 * 24 * 60 * 60 * 1000) {
            callback(cached.maps);
            return;
        }
    } catch (e) {
        // An unreadable cache is loaded again.
    }
    $.ajax({ url: "/Ajax/EnumerateMaps?Filter=__all&Sort=1&PerPage=100000&Offset=0", dataType: "text" }).done(function (html) {
        var maps = parseMapList(html);
        try {
            localStorage.setItem(MAP_NAMES_KEY, JSON.stringify({ at: Date.now(), maps: maps }));
        } catch (e) {
            // Without storage the names are loaded again next time.
        }
        callback(maps);
    }).fail(function () {
        log("Past Games: couldn't load war.app's map list for map names");
        callback({});
    });
}

// The maps of your games, by name, with how many games each. Maps missing from war.app's map list
// (unpublished ones) come last, by number.
function pastGameMapOptions(games, maps, selected) {
    var counts = {};
    games.forEach(function (game) {
        counts[game.map] = (counts[game.map] || 0) + 1;
    });
    if (selected && !counts[selected]) {
        counts[selected] = 0;
    }
    return Object.keys(counts).map(function (key) {
        return { key: key, name: maps[key] ? maps[key].name : null, games: counts[key] };
    }).sort(function (a, b) {
        return (a.name === null) - (b.name === null) || (a.name === null ? Number(a.key) - Number(b.key) : a.name.localeCompare(b.name));
    }).map(function (option) {
        option.name = option.name === null ? "Map " + option.key : option.name;
        return option;
    });
}

// war.app's game dates count milliseconds from the start of 2000.
function pastGameDate(game) {
    return new Date(Date.UTC(2000, 0, 1) + game.date).toISOString().slice(0, 10);
}

function pastGamesListHtml(games, me, maps) {
    var rows = games.map(function (game) {
        var others = game.players.filter(function (player) {
            return player !== pastGamePlayer(game, me) && player.state !== 5 && player.state !== 6;
        });
        var names = others.slice(0, 8).map(function (player) {
            return player.state === 4 ? "<b>" + htmlEscape(player.name) + "</b>" : htmlEscape(player.name);
        }).join(", ") + (others.length > 8 ? " and " + (others.length - 8) + " more" : "");
        var meta = [pastGameDate(game)];
        if (maps[game.map]) {
            meta.push(maps[game.map].name);
        }
        var result = pastGameResult(game, me);
        return '<tr><td><a href="/MultiPlayer?GameID=' + htmlEscape(game.id) + '">' + htmlEscape(game.name || "Game " + game.id) + "</a>"
            + '<div class="tuydPastMeta">' + htmlEscape(meta.join(" · ")) + "</div></td>"
            + '<td title="' + htmlEscape(others.map(function (player) {
                return player.name;
            }).join(", ")) + '">' + names + "</td>"
            + '<td class="tuydPastResult' + (result ? " tuydPast-" + result : "") + '">' + htmlEscape(pastGameStatusText(game, me)) + "</td>"
            + "<td>" + (game.turn > 0 ? game.turn : "") + "</td></tr>";
    }).join("");
    return '<table class="tuydPastList"><thead><tr><td>Game</td><td>Players</td><td>Result</td><td title="Number of turns played">Turns</td></tr></thead><tbody>' + rows + "</tbody></table>";
}

// The filters search your whole history: the first search reads every page of Past Games (loadPastGames),
// and while any filter is set, the games that match replace war.app's table.
function setupPastGamesFilter() {
    var table = $("#MyGamesTable");
    if (!table.length) {
        return;
    }
    addCSS(`
        #PastGamesFilterBar td { padding: 6px 8px 10px; }
        #PastGamesFilterBar input, #PastGamesFilterBar select { display: inline-block; width: auto; margin-right: 8px; background: #222; color: #ddd; border: 1px solid #555; padding: 1px 4px; }
        #PastGamesFilterBar input[type=search] { width: 220px; max-width: 100%; }
        #PastGamesFilterBar input[type=number] { width: 52px; margin-right: 4px; }
        #PastGamesFilterBar select[name=map] { max-width: 220px; }
        #PastGamesFilterBar .tuydPastRow { margin-top: 6px; }
        #PastGamesFilterBar label { font-weight: normal; margin: 0 8px 0 0; }
        #PastGamesFilterBar input[type=checkbox] { margin: 0 4px 0 0; vertical-align: middle; }
        #tuydPastResults { margin: 4px 0 16px; color: #ccc; }
        #tuydPastResults .tuydPastHead { margin: 4px 8px 8px; color: #999; }
        #tuydPastResults .tuydPastList { width: 100%; }
        #tuydPastResults .tuydPastList td { padding: 5px 8px; border-top: 1px solid #333; vertical-align: top; }
        #tuydPastResults .tuydPastList thead td { color: #999; border-top: 0; }
        #tuydPastResults .tuydPastList td:last-child { text-align: right; }
        #tuydPastResults .tuydPastList a { color: #fff; }
        #tuydPastResults .tuydPastMeta { color: #888; font-size: 12px; }
        #tuydPastResults .tuydPastResult { white-space: nowrap; }
        #tuydPastResults .tuydPast-won { color: #7c7; }
        #tuydPastResults .tuydPast-lost, #tuydPastResults .tuydPast-booted { color: #e77; }
        #tuydPastResults .tuydPastMore { margin: 8px; }
    `);
    var bar = $(`<tr id="PastGamesFilterBar"><td colspan="3">
        <input type="search" name="query" placeholder="Game or player name">
        <select name="state">
            <option value="">All games</option>
            <option value="running">In progress</option>
            <option value="yourTurn">Your turn</option>
            <option value="lobby">Lobby</option>
            <option value="finished">Finished</option>
            <option value="out" title="Games still going that you were eliminated, booted or surrendered from, or declined">You're out</option>
        </select>
        <select name="result">
            <option value="">Any result</option>
            <option value="won">Won</option>
            <option value="lost">Eliminated or surrendered</option>
            <option value="booted">Booted</option>
            <option value="vote">Ended by vote</option>
        </select>
        <select name="type">
            <option value="">Any kind of game</option>
            <option value="quickmatch">Quickmatch</option>
            <option value="tournament">Tournament</option>
            <option value="seasonal">Seasonal Ladder</option>
            <option value="ladder" title="1 v 1, 2 v 2, 3 v 3 and Real-Time Ladder">Other ladders</option>
            <option value="mtl">MTL</option>
            <option value="clanWar">Clan War</option>
            <option value="other">Other games</option>
        </select>
        <label><input type="checkbox" name="reversed">Oldest first</label>
        <div class="tuydPastRow">
            <select name="map" title="The maps of your games"><option value="">Any map</option></select>
            <select name="size">
                <option value="">Any number of players</option>
                <option value="oneVsOne">1 v 1</option>
                <option value="more">More than 2 players</option>
            </select>
            <label>Players from <input type="number" name="minPlayers" min="0" step="1"> to <input type="number" name="maxPlayers" min="0" step="1"></label>
        </div>
    </td></tr>`).appendTo(table.children("thead").first());
    var results = $('<div id="tuydPastResults"></div>').insertAfter(table).hide();
    var filter = normalizePastGamesFilter({});
    var me = { id: null, name: null };
    var games = null;
    var loading = false;
    var failed = false;
    var progress = "";
    var maps = {};
    var mapsLoading = false;
    var limit = 100;
    var fillMaps = function () {
        var select = bar.find("[name=map]");
        select.children("option").not("[value='']").remove();
        pastGameMapOptions(games || [], maps, filter.map).forEach(function (option) {
            select.append($("<option>").val(option.key).text(option.name + " (" + option.games + ")"));
        });
        select.val(filter.map);
    };
    var load = function () {
        if (games || loading) {
            return;
        }
        loading = true;
        if (!mapsLoading) {
            mapsLoading = true;
            loadMapNames(function (names) {
                maps = names;
                fillMaps();
                render();
            });
        }
        Promise.resolve(signedInPlayerId()).then(function (id) {
            me.id = gamePlayerId(id);
            me.name = !me.id && window.WlPlayer ? WlPlayer.Name : null;
            return loadPastGames(me.id, 10 * 60 * 1000, function (done, total) {
                progress = done.toLocaleString("en-US") + " of " + total.toLocaleString("en-US");
                render();
            });
        }).then(function (loaded) {
            games = loaded.games;
            loading = false;
            fillMaps();
            render();
        }, function (error) {
            log("Past Games: " + (error && error.message || error && error.statusText || error));
            loading = false;
            failed = true;
            render();
        });
    };
    var render = function () {
        var set = pastGamesFilterIsSet(filter);
        table.children("tbody").toggle(!set);
        $("#PagerContainer").toggle(!set);
        results.toggle(set);
        if (!set) {
            return;
        }
        var back = '<a href="#" class="tuydPastBack">Back to war.app\'s list</a>';
        if (!games) {
            if (!failed) {
                load();
            }
            results.html('<div class="tuydPastHead">' + (failed ? 'Couldn\'t read your games. <a href="#" class="tuydPastRetry">Try again</a>'
                : "Reading your games" + (progress ? ": " + htmlEscape(progress) : "") + "…") + " · " + back + "</div>");
            return;
        }
        var shown = games.filter(function (game) {
            return pastGameMatches(game, filter, me);
        });
        if (filter.reversed) {
            shown.reverse();
        }
        results.html('<div class="tuydPastHead">' + shown.length.toLocaleString("en-US") + " of " + games.length.toLocaleString("en-US")
            + " games · " + back + "</div>"
            + (shown.length ? pastGamesListHtml(shown.slice(0, limit), me, maps) : '<div class="tuydPastHead">No game matches.</div>')
            + (shown.length > limit ? '<div class="tuydPastMore"><a href="#" class="tuydPastShowMore">Show ' + Math.min(100, shown.length - limit) + " more</a></div>" : ""));
    };
    bar.on("input change", "input, select", function () {
        filter = normalizePastGamesFilter({
            query: bar.find("[name=query]").val(),
            state: bar.find("[name=state]").val(),
            result: bar.find("[name=result]").val(),
            type: bar.find("[name=type]").val(),
            reversed: bar.find("[name=reversed]").prop("checked"),
            map: bar.find("[name=map]").val(),
            size: bar.find("[name=size]").val(),
            minPlayers: bar.find("[name=minPlayers]").val(),
            maxPlayers: bar.find("[name=maxPlayers]").val()
        });
        limit = 100;
        render();
    }).on("focus", "[name=map]", load);
    results.on("click", ".tuydPastBack", function (event) {
        event.preventDefault();
        bar.find("input[type=search], input[type=number], select").val("");
        bar.find("[name=reversed]").prop("checked", false);
        filter = normalizePastGamesFilter({});
        render();
    }).on("click", ".tuydPastRetry", function (event) {
        event.preventDefault();
        failed = false;
        render();
    }).on("click", ".tuydPastShowMore", function (event) {
        event.preventDefault();
        limit += 100;
        render();
    });
}

var PAST_GAMES_KEY = "tidyUpYourDashboard.pastGames";

// war.app's Past Games pager posts Offset, Sort and PerPage to the page and gets its games back as hex: the
// total, then the games in the order ujs.js reads them (GameInfo, GameInfoPlayer, GameInfoSettings and the
// tournament info). Integers and doubles are little-endian, a bool or enum is a byte, a text is a "has value"
// byte, a 7-bit length and UTF-8, a list is a count (-1 for none), and an optional value has a "has value"
// byte first. Only the fields used here are kept. If war.app changes the layout, this returns null.
function parsePastGamesData(hex) {
    hex = String(hex || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
        return null;
    }
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    var view = new DataView(bytes.buffer);
    var decoder = new TextDecoder("utf-8", { fatal: true });
    var p = 0;
    var need = function (n) {
        if (p + n > bytes.length) {
            throw new Error("Past Games data ends early");
        }
    };
    var byte = function () {
        need(1);
        return bytes[p++];
    };
    var bool = function () {
        return byte() !== 0;
    };
    var int = function () {
        need(4);
        p += 4;
        return view.getInt32(p - 4, true);
    };
    var double = function () {
        need(8);
        p += 8;
        return view.getFloat64(p - 8, true);
    };
    var text = function () {
        if (!bool()) {
            return null;
        }
        var length = 0;
        var shift = 0;
        var b;
        do {
            b = byte();
            length |= (b & 127) << shift;
            shift += 7;
        } while (b & 128 && shift < 35);
        need(length);
        p += length;
        return decoder.decode(bytes.subarray(p - length, p));
    };
    var list = function (item) {
        var count = int();
        var items = [];
        for (var i = 0; i < count; i++) {
            items.push(item());
        }
        return items;
    };
    var player = function () {
        if (!bool()) {
            return null;
        }
        if (bool()) {
            int();
        }
        bool();
        var committed = bool();
        int();
        bool();
        var name = text();
        var id = int();
        var state = byte();
        var team = int();
        bool();
        return { id: id, name: name, state: state, team: team, committed: committed };
    };
    var settings = function () {
        if (bool()) {
            double();
        }
        bool();
        int();
        text();
        bool();
        bool();
        if (bool()) {
            int();
        }
        double();
        bool();
        int();
        bool();
        bool();
        double();
        bool();
        double();
        int();
        byte();
        bool();
        bool();
        int();
        double();
        bool();
        bool();
        byte();
    };
    var tournament = function () {
        if (bool()) {
            int();
            int();
            if (bool()) {
                int();
            }
            if (bool()) {
                list(function () {
                    int();
                    int();
                });
            }
            if (bool()) {
                need(2);
                p += 2;
            }
        }
        byte();
        int();
    };
    var game = function () {
        int();
        double();
        text();
        int();
        int();
        double();
        byte();
        var id = int();
        bool();
        var date = double();
        var map = int();
        int();
        if (bool()) {
            int();
        }
        var name = text();
        var turn = int();
        if (bool()) {
            list(int);
        }
        var players = bool() ? list(player) : [];
        bool();
        bool();
        bool();
        bool();
        if (bool()) {
            settings();
        }
        var state = int();
        bool();
        double();
        var inTournament = bool();
        if (inTournament) {
            tournament();
        }
        double();
        return {
            id: id,
            name: name || "",
            state: state,
            turn: turn,
            date: date,
            map: map,
            tournament: inTournament,
            players: players.filter(Boolean)
        };
    };
    try {
        var total = int();
        var games = list(game);
        return p === bytes.length ? { total: total, games: games } : null;
    } catch (e) {
        return null;
    }
}

// Reads every page of Past Games, newest first. A game that ends during the scan moves up a page, so
// games are kept once by ID.
function fetchAllPastGames(fetchPage, pageSize, onProgress) {
    var games = [];
    var seen = {};
    var next = function (offset) {
        return fetchPage(offset, pageSize).then(function (page) {
            if (!page) {
                throw new Error("war.app's game list couldn't be read");
            }
            page.games.forEach(function (game) {
                if (!seen[game.id]) {
                    seen[game.id] = true;
                    games.push(game);
                }
            });
            if (onProgress) {
                onProgress(Math.min(offset + page.games.length, page.total), page.total, games);
            }
            return page.games.length && offset + page.games.length < page.total ? next(offset + page.games.length) : games;
        });
    };
    return next(0);
}

// Brings `games`, an earlier read of Past Games (newest first), up to date from Past Games' first pages: new and
// changed games go in front. It reads on until a page has a finished game it already knew and it has seen every
// game that was still running. With no known game after `maxPages` it gives null: a full read is needed.
function updatePastGames(games, fetchPage, pageSize, maxPages) {
    var known = {};
    games.forEach(function (game) {
        known[game.id] = game;
    });
    var running = games.filter(function (game) {
        return game.state !== 4;
    });
    var fresh = [];
    var seen = {};
    var reachedKnown = false;
    var next = function (offset, pages) {
        return fetchPage(offset, pageSize).then(function (page) {
            if (!page) {
                throw new Error("war.app's game list couldn't be read");
            }
            page.games.forEach(function (game) {
                if (!seen[game.id]) {
                    seen[game.id] = true;
                    fresh.push(game);
                }
                if (known[game.id] && known[game.id].state === 4) {
                    reachedKnown = true;
                }
            });
            var end = !page.games.length || offset + page.games.length >= page.total;
            var caughtUp = reachedKnown && running.every(function (game) {
                return seen[game.id];
            });
            if (!end && !caughtUp && pages + 1 < maxPages) {
                return next(offset + page.games.length, pages + 1);
            }
            if (!end && !reachedKnown) {
                return null;
            }
            return fresh.concat(games.filter(function (game) {
                return !seen[game.id];
            }));
        });
    };
    return next(0, 0);
}

function fetchPastGamesPage(offset, count) {
    return Promise.resolve($.ajax({
        url: "/MultiPlayer/PastGames",
        type: "POST",
        data: { Offset: offset, Sort: 3, PerPage: count },
        dataType: "text"
    })).then(parsePastGamesData);
}

// Every game in your Past Games, newest first: a request per 200 games, about 8 seconds for 5,000. Kept for
// this tab's session and read again when older than `maxAge`; Past Games and Quickmatch share it.
function cachedPastGames(playerId, maxAge) {
    try {
        var cached = JSON.parse(sessionStorage.getItem(PAST_GAMES_KEY));
        if (cached && cached.player === playerId && Array.isArray(cached.games) && Date.now() - cached.time < maxAge) {
            return { time: cached.time, games: cached.games };
        }
    } catch (e) {
        // An unreadable copy is read again.
    }
    return null;
}

function loadPastGames(playerId, maxAge, onProgress) {
    var cached = cachedPastGames(playerId, maxAge);
    if (cached) {
        return Promise.resolve(cached);
    }
    return fetchAllPastGames(fetchPastGamesPage, 200, onProgress).then(function (games) {
        var time = Date.now();
        try {
            sessionStorage.setItem(PAST_GAMES_KEY, JSON.stringify({ player: playerId, time: time, games: games }));
        } catch (e) {
            try {
                sessionStorage.removeItem(PAST_GAMES_KEY);
            } catch (ignored) {
                // Without storage the games are read again next time.
            }
        }
        return { time: time, games: games };
    });
}

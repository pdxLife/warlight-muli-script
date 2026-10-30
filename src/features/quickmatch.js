var QUICKMATCH_GAMES_KEY = "tidyUpYourDashboard.quickmatchGames";
var QUICKMATCH_TEMPLATES_KEY = "tidyUpYourDashboard.quickmatchTemplates";
var QUICKMATCH_VIEW_KEY = "tidyUpYourDashboard.quickmatchView";

// war.app names Quickmatch games "QM: A vs B", or "QM: 2v2" for team templates.
function isQuickmatchGameName(name) {
    return /^QM: /.test(String(name || ""));
}

function quickmatchResult(game, me) {
    var mine = pastGamePlayer(game, me);
    if (!mine || mine.state === 5 || mine.state === 6) {
        return null;
    }
    return game.state === 4 ? pastGameResult(game, me) : "playing";
}

function quickmatchOpponents(game, me) {
    var mine = pastGamePlayer(game, me);
    return game.players.filter(function (player) {
        return player !== mine && (!mine || mine.team === -1 || player.team !== mine.team);
    });
}

function quickmatchResultText(result, turn) {
    return {
        won: turn > 0 ? "Won in " + turn : "Won",
        lost: "Lost",
        booted: "Booted",
        vote: "Ended by vote",
        playing: "In progress"
    }[result] || "";
}

// The record, by template and by opponent, of the Quickmatch games in `games` (newest first). `templates`
// holds what's been read from each game, by GameID; a game that turned out not to be a Quickmatch game is
// left out. Boot losses count as losses only when `countBoots` is set. Turns average the games that got
// past their first turn.
function quickmatchStats(games, me, templates, countBoots) {
    var record = function () {
        return { wins: 0, losses: 0, bootLosses: 0, votes: 0, turns: 0, turnGames: 0, games: [] };
    };
    var total = record();
    total.playing = 0;
    var byTemplate = {};
    var byOpponent = {};
    var groupIn = function (groups, key, fields) {
        if (!groups[key]) {
            groups[key] = record();
            Object.keys(fields).forEach(function (field) {
                groups[key][field] = fields[field];
            });
        }
        return groups[key];
    };
    var count = function (entry, result, game, summary) {
        if (result === "won") {
            entry.wins++;
        } else if (result === "lost" || (result === "booted" && countBoots)) {
            entry.losses++;
        } else if (result === "vote") {
            entry.votes++;
        }
        if (result === "booted") {
            entry.bootLosses++;
        }
        if (game.turn > 0 && (result !== "booted" || countBoots)) {
            entry.turns += game.turn;
            entry.turnGames++;
        }
        entry.games.push(summary);
    };
    games.forEach(function (game) {
        var template = templates[game.id] || null;
        if (!isQuickmatchGameName(game.name) || (template && template.none)) {
            return;
        }
        var result = quickmatchResult(game, me);
        if (result === "playing") {
            total.playing++;
        }
        if (!result || result === "playing") {
            return;
        }
        var opponents = quickmatchOpponents(game, me);
        var summary = {
            id: game.id,
            result: result,
            turn: game.turn,
            date: game.date,
            template: template ? template.name : null,
            opponents: opponents.map(function (player) {
                return player.name;
            })
        };
        count(total, result, game, summary);
        var templateKey = template ? template.name : "";
        count(groupIn(byTemplate, templateKey, { key: templateKey, name: template ? template.name : null, templateId: template ? template.id : null }), result, game, summary);
        opponents.forEach(function (player) {
            count(groupIn(byOpponent, String(player.id), { key: String(player.id), name: player.name }), result, game, summary);
        });
    });
    var finish = function (entry) {
        var played = entry.wins + entry.losses;
        entry.played = played;
        entry.rate = played ? entry.wins / played : null;
        entry.averageTurns = entry.turnGames ? entry.turns / entry.turnGames : null;
        return entry;
    };
    var list = function (groups) {
        return Object.keys(groups).map(function (key) {
            return finish(groups[key]);
        }).sort(function (a, b) {
            return b.games.length - a.games.length || (a.name === null) - (b.name === null) || String(a.name).localeCompare(String(b.name));
        });
    };
    finish(total);
    total.templates = list(byTemplate);
    total.opponents = list(byOpponent);
    return total;
}

function quickmatchRateText(entry) {
    return entry.rate === null ? "–" : (entry.rate * 100).toFixed(1) + "%";
}

function quickmatchRecordText(entry) {
    return entry.wins + " W – " + entry.losses + " L (" + quickmatchRateText(entry) + ")";
}

// A Quickmatch game's settings, in war.app's data for the game (UJS_Hooks.za), are the object that holds the
// game's name. Next to it they hold war.app's "This game was created by the Quickmatch…" message, the
// template's name and its ID. The field names are minified, so they're found by value: the message, the one
// other text, and the one optional number ({ val }) big enough to be a template ID. Returns null until the
// game has loaded, and { none: true } for a game whose settings have no Quickmatch message.
function gameTemplateFromData(data, gameName) {
    var seen = new Set();
    var queue = [data];
    var settings = null;
    while (queue.length && !settings && seen.size < 20000) {
        var item = queue.shift();
        if (!item || typeof item !== "object" || seen.has(item)) {
            continue;
        }
        seen.add(item);
        var keys;
        try {
            keys = Object.keys(item);
        } catch (e) {
            continue;
        }
        if (item !== data && keys.length >= 20 && keys.some(function (key) {
            return item[key] === gameName;
        })) {
            settings = item;
            break;
        }
        keys.forEach(function (key) {
            try {
                if (item[key] && typeof item[key] === "object") {
                    queue.push(item[key]);
                }
            } catch (e) {
                // A getter that throws holds nothing needed here.
            }
        });
    }
    if (!settings) {
        return null;
    }
    var values = Object.keys(settings).map(function (key) {
        return settings[key];
    });
    var texts = values.filter(function (value) {
        return typeof value === "string" && value.trim() && value !== gameName;
    });
    if (!texts.some(function (value) {
        return /created by the Quickmatch/i.test(value);
    })) {
        return { none: true };
    }
    var names = texts.filter(function (value) {
        return !/created by the Quickmatch/i.test(value);
    });
    var ids = values.filter(function (value) {
        return value && typeof value === "object" && typeof value.val === "number" && value.val >= 1000;
    });
    return names.length === 1 ? { name: names[0].trim(), id: ids.length === 1 ? ids[0].val : null } : null;
}

function storedQuickmatchTemplates() {
    try {
        var stored = JSON.parse(localStorage.getItem(QUICKMATCH_TEMPLATES_KEY));
        return stored && typeof stored === "object" ? stored : {};
    } catch (e) {
        return {};
    }
}

function quickmatchCsv(games, me, templates, origin) {
    var rows = [["Game ID", "Game", "Date", "Result", "Turns", "Template", "Template ID", "Opponents", "Link"]];
    games.forEach(function (game) {
        var template = templates[game.id] || null;
        var result = isQuickmatchGameName(game.name) && !(template && template.none) ? quickmatchResult(game, me) : null;
        if (!result) {
            return;
        }
        rows.push([game.id, game.name, typeof game.date === "number" ? pastGameDate(game) : "", quickmatchResultText(result, 0), game.turn > 0 ? game.turn : "",
            template ? template.name : "", template && template.id ? template.id : "",
            quickmatchOpponents(game, me).map(function (player) {
                return player.name;
            }).join("; "), origin + "/MultiPlayer?GameID=" + game.id]);
    });
    return rows.map(function (row) {
        return row.map(csvCell).join(",");
    }).join("\r\n") + "\r\n";
}

function quickmatchSummaryText(stats, count) {
    var lines = ["Quickmatch: " + stats.wins + "W - " + stats.losses + "L (" + quickmatchRateText(stats) + "), " + stats.games.length + " games"];
    var section = function (title, groups) {
        var named = groups.filter(function (entry) {
            return entry.name !== null && entry.played;
        }).slice(0, count);
        if (named.length) {
            lines.push("", title);
            named.forEach(function (entry) {
                lines.push(entry.name + ": " + entry.wins + "W - " + entry.losses + "L (" + quickmatchRateText(entry) + ")");
            });
        }
    };
    section("Top templates:", stats.templates);
    section("Top opponents:", stats.opponents);
    return lines.join("\n");
}

// One tab of the Quickmatch panel: the templates or the opponents, filtered by `view.query`, sorted by
// `view.sort`, `view.limit` rows at most, with the games of the row whose key is `view.open` listed under it.
function quickmatchTableHtml(groups, kind, view) {
    var columns = [
        { key: "name", label: "" },
        { key: "games", label: "Games" },
        { key: "wins", label: "Won" },
        { key: "losses", label: "Lost" },
        { key: "rate", label: "Win %" },
        { key: "averageTurns", label: "Turns", title: "Average number of turns" }
    ];
    var query = String(view.query || "").trim().toLowerCase();
    var unread = kind === "templates" ? "Template not read yet" : "";
    var rows = groups.filter(function (entry) {
        return !query || String(entry.name === null ? unread : entry.name).toLowerCase().indexOf(query) !== -1;
    });
    var sort = view.sort || { key: "games", descending: true };
    var value = function (entry) {
        if (sort.key === "name") {
            return entry.name === null ? "￿" : entry.name.toLowerCase();
        }
        if (sort.key === "games") {
            return entry.games.length;
        }
        return entry[sort.key] === null ? -1 : entry[sort.key];
    };
    rows = rows.slice().sort(function (a, b) {
        var x = value(a);
        var y = value(b);
        var order = x < y ? -1 : x > y ? 1 : 0;
        return (sort.descending ? -order : order) || b.games.length - a.games.length;
    });
    var shown = view.limit ? rows.slice(0, view.limit) : rows;
    var head = columns.map(function (column) {
        var label = column.key === "name" ? (kind === "templates" ? "Template" : "Opponent") : column.label;
        var arrow = sort.key === column.key ? (sort.descending ? " ▾" : " ▴") : "";
        return '<td data-sort="' + column.key + '"' + (column.title ? ' title="' + htmlEscape(column.title) + '"' : "") + ">" + htmlEscape(label) + arrow + "</td>";
    }).join("");
    var gameLinks = function (entry) {
        var limit = 100;
        return entry.games.slice(0, limit).map(function (game) {
            var other = kind === "templates" ? (game.opponents.length ? " vs " + game.opponents.join(", ") : "") : (game.template ? " on " + game.template : "");
            return '<span class="tuydQmGame tuydQm-' + htmlEscape(game.result) + '"><a href="/MultiPlayer?GameID=' + htmlEscape(game.id) + '">'
                + htmlEscape(quickmatchResultText(game.result, game.turn)) + "</a>" + htmlEscape(other) + "</span>";
        }).join(" · ") + (entry.games.length > limit ? " · " + (entry.games.length - limit) + " older games in the CSV" : "");
    };
    var body = shown.map(function (entry) {
        var name = entry.name === null ? '<i>' + htmlEscape(unread) + "</i>" : htmlEscape(entry.name);
        var templateId = parseInt(entry.templateId, 10);
        if (kind === "templates" && templateId > 0) {
            name += ' <a class="tuydQmTemplateLink" href="/MultiPlayer?TemplateID=' + templateId + '" title="Create a game with this template">#' + templateId + "</a>";
        }
        var open = view.open === entry.key;
        return '<tr class="tuydQmRow' + (open ? " tuydQmOpen" : "") + '" data-key="' + htmlEscape(entry.key) + '" title="Show these games">'
            + "<td>" + name + "</td><td>" + entry.games.length + "</td><td>" + entry.wins + "</td><td>" + entry.losses + "</td><td>"
            + quickmatchRateText(entry) + "</td><td>" + (entry.averageTurns === null ? "–" : "~" + Math.round(entry.averageTurns)) + "</td></tr>"
            + (open ? '<tr class="tuydQmGames"><td colspan="6">' + gameLinks(entry) + "</td></tr>" : "");
    }).join("");
    if (!rows.length) {
        body = '<tr><td colspan="6">' + (query ? "Nothing matches your search." : "No finished Quickmatch games.") + "</td></tr>";
    } else if (shown.length < rows.length) {
        body += '<tr><td colspan="6"><a href="#" class="tuydQmAll">Show all ' + rows.length + "</a></td></tr>";
    }
    return '<table class="dataTable tuydQmTable"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table>";
}

// The Last games tab: your newest `count` finished Quickmatch games that match `view.query`, from
// `quickmatchStats(...).games`, sorted by `view.sort`. A boot loss reads as a loss only when `view.countBoots` is set.
function quickmatchRecentHtml(games, view, count) {
    var columns = [
        { key: "date", label: "Date" },
        { key: "template", label: "Template" },
        { key: "opponents", label: "Opponents" },
        { key: "result", label: "Result" },
        { key: "turn", label: "Turns" }
    ];
    var unread = "Template not read yet";
    var query = String(view.query || "").trim().toLowerCase();
    var resultText = function (game) {
        if (game.result === "booted") {
            return view.countBoots ? "Lost (booted)" : "Booted";
        }
        return { won: "Won", lost: "Lost", vote: "Ended by vote" }[game.result] || "";
    };
    var matching = games.map(function (game, index) {
        return { game: game, index: index };
    }).filter(function (row) {
        var game = row.game;
        return !query || [game.template === null ? unread : game.template, game.opponents.join(", "), resultText(game)].some(function (text) {
            return text.toLowerCase().indexOf(query) !== -1;
        });
    });
    var rows = matching.slice(0, count);
    var sort = view.sort || { key: "date", descending: true };
    var value = function (row) {
        var game = row.game;
        if (sort.key === "date") {
            return -row.index;
        }
        if (sort.key === "template") {
            return game.template === null ? "￿" : game.template.toLowerCase();
        }
        if (sort.key === "opponents") {
            return game.opponents.join(", ").toLowerCase();
        }
        if (sort.key === "result") {
            return { won: 0, lost: 1, booted: view.countBoots ? 1 : 2, vote: 3 }[game.result];
        }
        return game.turn > 0 ? game.turn : -1;
    };
    rows.sort(function (a, b) {
        var x = value(a);
        var y = value(b);
        var order = x < y ? -1 : x > y ? 1 : 0;
        return (sort.descending ? -order : order) || a.index - b.index;
    });
    var head = columns.map(function (column) {
        var arrow = sort.key === column.key ? (sort.descending ? " ▾" : " ▴") : "";
        return '<td data-sort="' + column.key + '">' + htmlEscape(column.label) + arrow + "</td>";
    }).join("");
    var body = rows.map(function (row) {
        var game = row.game;
        var known = typeof game.date === "number";
        var date = known ? pastGameDate(game) : "–";
        var when = known ? new Date(Date.UTC(2000, 0, 1) + game.date).toLocaleString() : "";
        var lost = game.result === "lost" || (game.result === "booted" && view.countBoots);
        var tone = game.result === "won" ? "won" : lost ? "lost" : "other";
        var title = game.result === "booted" && !view.countBoots ? "Left out of your record" : "Open this game";
        return '<tr class="tuydQmRecentRow"><td' + (when ? ' title="' + htmlEscape(when) + '"' : "") + ">" + htmlEscape(date) + "</td><td>"
            + (game.template === null ? "<i>" + htmlEscape(unread) + "</i>" : htmlEscape(game.template)) + "</td><td>" + htmlEscape(game.opponents.join(", ")) + "</td>"
            + '<td class="tuydQmGame tuydQm-' + tone + '"><a href="' + htmlEscape(safeUrl("/MultiPlayer?GameID=" + encodeURIComponent(game.id))) + '" title="' + htmlEscape(title) + '">'
            + htmlEscape(resultText(game)) + "</a></td><td>" + (game.turn > 0 ? game.turn : "–") + "</td></tr>";
    }).join("");
    if (!rows.length) {
        body = '<tr><td colspan="5">' + (query ? "Nothing matches your search." : "No finished Quickmatch games.") + "</td></tr>";
    } else if (matching.length > rows.length) {
        body += '<tr><td colspan="5" class="tuydQmMeta">' + (matching.length - rows.length) + " older game" + (matching.length - rows.length === 1 ? "" : "s") + " in the CSV</td></tr>";
    }
    return '<table class="dataTable tuydQmTable tuydQmRecent"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table>";
}

function readQuickmatchView() {
    var view = {};
    try {
        view = JSON.parse(localStorage.getItem(QUICKMATCH_VIEW_KEY)) || {};
    } catch (e) {
        view = {};
    }
    return {
        countBoots: view.countBoots === true,
        tab: view.tab === "opponents" || view.tab === "recent" ? view.tab : "templates"
    };
}

function storedQuickmatchGames(playerId) {
    try {
        var stored = JSON.parse(localStorage.getItem(QUICKMATCH_GAMES_KEY));
        return stored && stored.player === playerId && Array.isArray(stored.games) ? stored : null;
    } catch (e) {
        return null;
    }
}

// Your Quickmatch record on the Quickmatch screen: in the Settings dialog's header, next to "Your rating" on
// each template, and by template and by opponent in a Stats dialog. war.app's viewport has no room to spare,
// so the record sits in the empty ends of the Settings header. The games come from Past Games: all of them only
// when you click Rescan, the newest each time you come to the screen. Each game's template is read once from
// the game in a hidden frame.
function setupQuickmatchStats() {
    var me = { id: null, name: null };
    var ready = false;
    var games = null;
    var scannedAt = 0;
    var checkedAt = 0;
    var scanning = false;
    var partial = null;
    var refreshing = false;
    var refreshTriedAt = 0;
    var onScene = false;
    var failed = false;
    var templates = storedQuickmatchTemplates();
    var reading = null;
    var stats = null;
    var dialog = null;
    var timer = null;
    var recentCount = 20;
    var newestCount = 200;
    var view = readQuickmatchView();
    view.query = "";
    view.sort = null;
    view.limit = 50;
    view.openRow = null;
    addCSS(`
        #tuydQmSummary { position: absolute; height: 26px; display: flex; align-items: center; justify-content: space-between; pointer-events: none; }
        #tuydQmSummary > * { pointer-events: auto; }
        .tuydQmSummaryRecord, .tuydQmTemplateRecord { color: #e0c060; white-space: nowrap; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; }
        .tuydQmSummaryRecord { font-size: 14px; }
        .tuydQmTemplateRecord { position: absolute; overflow: hidden; text-overflow: ellipsis; font-size: 14px; pointer-events: auto; }
        .tuydQmButton { display: inline-block; padding: 0 12px; line-height: 20px; color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
            border-style: solid; border-color: #242d9a; border-width: 3px 4px; background: #242d9a padding-box;
            border-image: var(--tuyd-button, none) 15 15 13 fill / 3px 4px stretch; }
        .tuydQmButton:hover, .tuydQmButton:focus { color: #fff; text-decoration: none; filter: brightness(1.15); }
        .tuydQmButton[disabled] { filter: grayscale(0.8); cursor: default; }
        #tuydQmStats { display: flex; flex-direction: column; }
        #tuydQmStats .tuydQmClose { position: absolute; top: -42px; right: 4px; color: #fff; font-size: 18px; text-decoration: none; }
        #tuydQmStats .tuydQmTools, #tuydQmStats .tuydQmTemplateStatus, #tuydQmStats .tuydQmTabs { margin-top: 8px; }
        #tuydQmStats .tuydQmRecordLine b { color: #fff; }
        #tuydQmStats .tuydQmStatus, #tuydQmStats .tuydQmTemplateStatus, #tuydQmStats .tuydQmMeta { color: #8d8d8d; }
        #tuydQmStats .tuydQmTemplateStatus:empty { display: none; }
        #tuydQmStats a { color: #e0c060; }
        #tuydQmStats label { font-weight: normal; margin: 0 12px 0 0; }
        #tuydQmStats input[type=checkbox] { margin: 0 4px 0 0; vertical-align: middle; }
        #tuydQmStats .tuydQmSearch { position: relative; display: inline-block; max-width: 100%; margin-left: 8px; }
        #tuydQmStats input[type=search] { width: 180px; max-width: 100%; background: #222; color: #ddd; border: 1px solid #555; padding: 1px 22px 1px 4px; }
        #tuydQmStats input[type=search]::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
        #tuydQmStats .tuydQmSearchClear { position: absolute; top: 50%; right: 6px; transform: translateY(-50%); color: #babbbb; text-decoration: none; line-height: 1; }
        #tuydQmStats .tuydQmSearchClear:hover { color: #fff; }
        #tuydQmStats .tuydQmTabs a[data-tab] { margin-right: 12px; color: #babbbb; }
        #tuydQmStats .tuydQmTabs a[data-tab].tuydQmActive { color: #fff; font-weight: bold; text-decoration: none; }
        #tuydQmStats .tuydQmTableHolder { flex: 1 1 auto; min-height: 80px; margin-top: 6px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #555 transparent; }
        #tuydQmStats .tuydQmTable { width: 100%; }
        #tuydQmStats .tuydQmTable td { padding: 3px 6px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
        #tuydQmStats .tuydQmTable thead td { cursor: pointer; white-space: nowrap; color: #fff; border-top: 0; }
        #tuydQmStats .tuydQmTable td + td { text-align: right; white-space: nowrap; }
        #tuydQmStats .tuydQmRecent td { white-space: nowrap; }
        #tuydQmStats .tuydQmRecent td:nth-child(2), #tuydQmStats .tuydQmRecent td:nth-child(3) { text-align: left; white-space: normal; }
        #tuydQmStats .tuydQmRecent td:nth-child(4) { text-align: left; }
        #tuydQmStats .tuydQmRecent tbody td.tuydQmMeta { text-align: left; }
        #tuydQmStats .tuydQmRecentRow:hover { background: rgba(255, 255, 255, 0.06); }
        #tuydQmStats .tuydQmRow { cursor: pointer; }
        #tuydQmStats .tuydQmRow:hover, #tuydQmStats .tuydQmOpen { background: rgba(255, 255, 255, 0.06); }
        #tuydQmStats .tuydQmGames td { text-align: left; font-size: 12px; line-height: 1.7; }
        #tuydQmStats .tuydQmGame { white-space: nowrap; }
        #tuydQmStats .tuydQm-won a { color: #7c7; }
        #tuydQmStats .tuydQm-lost a, #tuydQmStats .tuydQm-booted a { color: #e77; }
        #tuydQmStats .tuydQm-other a { color: #babbbb; }
        #tuydQmStats .communityLaddersCredit { margin-top: 6px; }
    `);
    var scene = function () {
        var element = ujsElement("QuickmatchScene");
        return element && shownUjsElement(element) ? element : null;
    };
    var wearArt = function (element) {
        var art = warappArt(scene() || document.body);
        Object.keys(art).forEach(function (name) {
            if (art[name]) {
                element[0].style.setProperty(name, art[name]);
            }
        });
    };
    // Our own changes set off the page observer too, so only what differs is written.
    var setText = function (element, text, title) {
        if (element.text() !== text) {
            element.text(text);
        }
        if ((element.attr("title") || "") !== (title || "")) {
            element.attr("title", title || null);
        }
    };
    var setPlace = function (element, place) {
        Object.keys(place).forEach(function (key) {
            var value = Math.round(place[key]) + "px";
            if (element[0].style[key] !== value) {
                element[0].style[key] = value;
            }
        });
    };
    var unreadGames = function () {
        return (games || []).filter(function (game) {
            var result = isQuickmatchGameName(game.name) ? quickmatchResult(game, me) : null;
            return result && result !== "playing" && !templates[game.id] && !(reading && reading.tried[game.id]);
        });
    };
    var saveView = function () {
        try {
            localStorage.setItem(QUICKMATCH_VIEW_KEY, JSON.stringify({ countBoots: view.countBoots, tab: view.tab }));
        } catch (e) {
            // The view is just the default next time.
        }
    };
    var rescanSeconds = function () {
        var seconds = Math.max(1, Math.round(partial.total / 600));
        return seconds + " second" + (seconds === 1 ? "" : "s");
    };
    var saveGames = function () {
        try {
            localStorage.setItem(QUICKMATCH_GAMES_KEY, JSON.stringify({ player: me.id, time: scannedAt, checked: checkedAt, partial: partial, games: games }));
        } catch (e) {
            // Without storage Past Games is read again next time.
        }
    };
    var recordTitle = function () {
        var meta = [stats.games.length + " finished Quickmatch game" + (stats.games.length === 1 ? "" : "s")];
        if (partial) {
            meta[0] += " in your newest " + partial.read + " of " + partial.total + " games" + (scanning ? ", reading the rest" : "");
        }
        if (stats.playing) {
            meta.push(stats.playing + " in progress");
        }
        if (stats.bootLosses && !view.countBoots) {
            meta.push(stats.bootLosses + " boot loss" + (stats.bootLosses === 1 ? "" : "es") + " left out");
        }
        return meta.join(" · ");
    };
    var placeSummary = function () {
        var container = scene() && ujsElement("SettingsContainer");
        var header = container && $(container).find("[id^='ujs_HeaderText'][id$='_tmp']")[0];
        var backing = container && $(container).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']")[0];
        var summary = $("#tuydQmSummary");
        if (!header || !backing) {
            summary.remove();
            return;
        }
        if (summary.parent()[0] !== container) {
            summary.remove();
            summary = $('<div id="tuydQmSummary"><span class="tuydQmSummaryRecord"></span><a href="#" class="tuydQmButton tuydQmStatsButton" title="Your Quickmatch record by template and by opponent (Muli\'s Userscript)">Stats</a></div>').appendTo(container);
            wearArt(summary);
        }
        var origin = container.getBoundingClientRect();
        var box = backing.getBoundingClientRect();
        var head = header.getBoundingClientRect();
        setPlace(summary, { left: box.left - origin.left + 16, top: head.top + head.height / 2 - origin.top - 13, width: box.width - 32 });
        var record = summary.find(".tuydQmSummaryRecord");
        if (stats) {
            setText(record, quickmatchRecordText(stats) + (partial && scanning ? " …" : ""), recordTitle() + " (Muli's Userscript)");
        } else {
            setText(record, scanning || refreshing ? "Reading your games…" : failed ? "Couldn't read your games" : "", "");
        }
    };
    var placeTemplateRecords = function () {
        var byName = {};
        (stats ? stats.templates : []).forEach(function (entry) {
            if (entry.name !== null && entry.games.length) {
                byName[entry.name] = entry;
            }
        });
        $("[id^='ujs_YourRatingLabel']").filter(function () {
            return /^ujs_YourRatingLabel(?:_\d+)?_tmp$/.test(this.id);
        }).each(function () {
            var holder = $(this).parent();
            var tag = holder.children(".tuydQmTemplateRecord");
            var name = $(this).closest("[id^='ujs_TemplatesSceneTemplate']").find("[id^='ujs_TemplateNameLabel']").filter(function () {
                return /_tmp$/.test(this.id);
            }).first().text().trim();
            var entry = byName[name];
            if (!entry) {
                tag.remove();
                return;
            }
            if (!tag.length) {
                tag = $('<span class="tuydQmTemplateRecord"></span>').appendTo(holder);
            }
            var range = document.createRange();
            range.selectNodeContents(this);
            setText(tag, "· " + quickmatchRecordText(entry), entry.games.length + " game" + (entry.games.length === 1 ? "" : "s")
                + (entry.averageTurns === null ? "" : ", ~" + Math.round(entry.averageTurns) + " turns on average") + " (Muli's Userscript)");
            var left = this.offsetLeft + range.getBoundingClientRect().width + 8;
            setPlace(tag, { left: left, top: this.offsetTop + (this.offsetHeight - tag[0].offsetHeight) / 2, maxWidth: Math.max(0, this.offsetLeft + this.offsetWidth - left) });
        });
    };
    var renderTemplateStatus = function () {
        var place = dialog.find(".tuydQmTemplateStatus").empty();
        if (reading) {
            place.text("Reading templates: " + reading.done + " of " + reading.total + " games ").append('<a href="#" class="tuydQmReadStop">Stop</a>');
            return;
        }
        var unread = unreadGames().length;
        if (unread) {
            var minutes = Math.max(1, Math.round(unread * 1.5 / 60));
            place.text("The template isn't known yet for " + unread + " game" + (unread === 1 ? "" : "s") + ". ");
            $('<a href="#" class="tuydQmReadStart"></a>').text("Read " + (unread === 1 ? "it" : "them"))
                .attr("title", "Opens each game in the background, one at a time, to read its template: about " + minutes + " minute" + (minutes === 1 ? "" : "s") + ". Remembered in this browser.")
                .appendTo(place);
        }
    };
    var renderDialog = function () {
        dialog.find("[name=countBoots]").prop("checked", view.countBoots);
        dialog.find(".tuydQmRescan").prop("disabled", scanning);
        dialog.find(".tuydQmCopy, .tuydQmCsv").prop("disabled", !stats);
        dialog.find(".tuydQmStatus").text(scanning ? (partial ? "Reading your games: " + partial.read + " of " + partial.total + "…" : "Reading your games…")
            : failed ? (partial ? "Couldn't read all your games. Try Rescan later." : "Couldn't read your games. Try Rescan later.")
            : !checkedAt ? (refreshing ? "Reading your newest games…" : "")
            : partial ? "Read " + new Date(checkedAt).toLocaleString() + ". Rescan reads all " + partial.total + " of your games (about " + rescanSeconds() + ")."
            : "Read " + new Date(checkedAt).toLocaleString());
        var line = dialog.find(".tuydQmRecordLine").empty();
        if (!stats) {
            return;
        }
        line.append($("<b>").text(quickmatchRecordText(stats)), $('<span class="tuydQmMeta">').text(" · " + recordTitle()));
        dialog.find("[data-tab=templates]").text("Templates (" + stats.templates.length + ")").toggleClass("tuydQmActive", view.tab === "templates");
        dialog.find("[data-tab=opponents]").text("Opponents (" + stats.opponents.length + ")").toggleClass("tuydQmActive", view.tab === "opponents");
        dialog.find("[data-tab=recent]").text(stats.games.length === 1 ? "Last game" : stats.games.length ? "Last " + Math.min(recentCount, stats.games.length) + " games" : "Last games").toggleClass("tuydQmActive", view.tab === "recent");
        renderTemplateStatus();
        dialog.find(".tuydQmTableHolder").html(view.tab === "recent"
            ? quickmatchRecentHtml(stats.games, { query: view.query, sort: view.sort, countBoots: view.countBoots }, recentCount)
            : quickmatchTableHtml(stats[view.tab], view.tab, { query: view.query, sort: view.sort, limit: view.limit, open: view.openRow }));
    };
    var refresh = function () {
        stats = games && ready ? quickmatchStats(games, me, templates, view.countBoots) : null;
        placeSummary();
        placeTemplateRecords();
        if (dialog) {
            renderDialog();
        }
    };
    var readNext = function () {
        if (!reading) {
            return;
        }
        var game = unreadGames()[0];
        if (!game) {
            reading = null;
            refresh();
            return;
        }
        reading.tried[game.id] = true;
        var frame = $('<iframe tabindex="-1" aria-hidden="true" style="position: fixed; left: -10000px; top: 0; width: 1000px; height: 800px; border: 0;"></iframe>')
            .attr({ id: GAME_TEMPLATE_FRAME_ID, src: "/MultiPlayer?GameID=" + encodeURIComponent(game.id) }).appendTo("body");
        var started = Date.now();
        reading.timer = setInterval(function () {
            var template = null;
            try {
                var hooks = frame[0].contentWindow.UJS_Hooks;
                template = hooks && hooks.za ? gameTemplateFromData(hooks.za, game.name) : null;
            } catch (e) {
                template = null;
            }
            if (!template && Date.now() - started < 30000) {
                return;
            }
            clearInterval(reading.timer);
            frame.remove();
            if (template) {
                templates[game.id] = template;
                try {
                    localStorage.setItem(QUICKMATCH_TEMPLATES_KEY, JSON.stringify(templates));
                } catch (e) {
                    // Without storage the templates are read again next time.
                }
            } else {
                log("Quickmatch stats: couldn't read the template of game " + game.id);
            }
            reading.done++;
            refresh();
            readNext();
        }, 300);
    };
    var readFewUnread = function () {
        var unread = unreadGames().length;
        if (!reading && unread && unread <= 10) {
            startReading();
        }
    };
    var quickmatchOnly = function (list) {
        return list.filter(function (game) {
            return isQuickmatchGameName(game.name);
        });
    };
    // Each time you come to the Quickmatch screen, the newest games are read, so a game just played is counted. They're
    // added to the last full read (Rescan), if there is one and it reaches them; otherwise the stats cover only your
    // newest `newestCount` games until you Rescan.
    var refreshLatest = function () {
        if (scanning || refreshing || Date.now() - Math.max(checkedAt, refreshTriedAt) < 60 * 1000) {
            return;
        }
        var full = games && !partial;
        var cached = !full && cachedPastGames(me.id, 10 * 60 * 1000);
        if (cached) {
            games = quickmatchOnly(cached.games);
            partial = null;
            scannedAt = checkedAt = cached.time;
            saveGames();
            refresh();
            return;
        }
        var base = games;
        refreshing = true;
        refreshTriedAt = Date.now();
        refresh();
        (full ? updatePastGames(base, fetchPastGamesPage, 50, 4) : Promise.resolve(null)).then(function (merged) {
            return merged ? { games: merged } : fetchPastGamesPage(0, newestCount).then(function (page) {
                if (!page) {
                    throw new Error("war.app's game list couldn't be read");
                }
                return { games: page.games, partial: page.games.length < page.total ? { read: page.games.length, total: page.total } : null, all: page.games.length >= page.total };
            });
        }).then(function (read) {
            refreshing = false;
            if (scanning || games !== base) {
                return;
            }
            games = quickmatchOnly(read.games);
            partial = read.partial || null;
            checkedAt = Date.now();
            if (read.partial) {
                scannedAt = 0;
            } else if (read.all) {
                scannedAt = checkedAt;
            }
            failed = false;
            saveGames();
            refresh();
            readFewUnread();
        }, function (error) {
            refreshing = false;
            failed = !games;
            log("Quickmatch stats: " + (error && error.message || error && error.statusText || error));
            refresh();
        });
    };
    var startReading = function () {
        reading = { done: 0, total: unreadGames().length, tried: {}, timer: null };
        refresh();
        readNext();
    };
    var scan = function () {
        if (scanning) {
            return;
        }
        scanning = true;
        failed = false;
        refresh();
        var first = !games || partial;
        loadPastGames(me.id, 0, first ? function (read, total, soFar) {
            if (!partial || read >= partial.read) {
                games = quickmatchOnly(soFar);
                partial = { read: read, total: total };
            }
            refresh();
        } : null).then(function (loaded) {
            games = quickmatchOnly(loaded.games);
            scannedAt = loaded.time;
            checkedAt = loaded.time;
            partial = null;
            saveGames();
            scanning = false;
            refresh();
            readFewUnread();
        }, function (error) {
            log("Quickmatch stats: " + (error && error.message || error && error.statusText || error));
            scanning = false;
            failed = true;
            if (partial) {
                saveGames();
            }
            refresh();
        });
    };
    var fitDialog = function () {
        var area = dialog.parent()[0].getBoundingClientRect();
        var width = Math.max(300, Math.min(area.width - 32, 760));
        dialog.css({ width: width + "px", left: Math.round(Math.max(0, (area.width - width) / 2)) + "px", top: "10px", maxHeight: Math.round(Math.max(240, area.height - 20)) + "px" });
    };
    var search = function (query) {
        view.query = query;
        var input = dialog.find("input[type=search]");
        if (input.val() !== query) {
            input.val(query);
        }
        dialog.find(".tuydQmSearchClear").prop("hidden", !query);
        refresh();
    };
    var closeDialog = function () {
        if (dialog) {
            dialog.remove();
            dialog = null;
        }
    };
    var openDialog = function () {
        var holder = $("#UjsCanvasHolder");
        if (dialog || !holder.length) {
            return;
        }
        addCommunityLaddersStyles();
        dialog = $(`<div id="tuydQmStats" class="tuydCommunityPanel" role="dialog" aria-label="Your Quickmatch stats">
            <h3>Your Quickmatch stats</h3>
            <a href="#" class="tuydQmClose" title="Close" aria-label="Close">✕</a>
            <div class="tuydQmRecordLine"></div>
            <div class="tuydQmTools">
                <label title="A game you were booted from counts as a loss"><input type="checkbox" name="countBoots">Count boot losses</label>
                <button type="button" class="tuydQmButton tuydQmRescan" title="Read all your Past Games: about 8 seconds for 5,000 games">Rescan</button>
                <button type="button" class="tuydQmButton tuydQmCopy" title="Copy your record and top templates and opponents as text">Copy</button>
                <button type="button" class="tuydQmButton tuydQmCsv" title="Download every Quickmatch game as a spreadsheet (CSV)">CSV</button>
                <span class="tuydQmStatus"></span>
            </div>
            <div class="tuydQmTemplateStatus"></div>
            <div class="tuydQmTabs">
                <a href="#" data-tab="templates">Templates</a><a href="#" data-tab="opponents">Opponents</a><a href="#" data-tab="recent">Last games</a><span class="tuydQmSearch"><input type="search" placeholder="Search"><a href="#" class="tuydQmSearchClear" title="Clear the search" aria-label="Clear the search" hidden>✕</a></span>
            </div>
            <div class="tuydQmTableHolder"></div>
            <div class="communityLaddersCredit">From your Past Games, by Muli's Userscript</div>
        </div>`).appendTo(holder);
        wearArt(dialog);
        fitDialog();
        dialog.on("click", ".tuydQmClose", function (event) {
            event.preventDefault();
            closeDialog();
        }).on("click", ".tuydQmRescan", function () {
            scan();
        }).on("change", "[name=countBoots]", function () {
            view.countBoots = this.checked;
            saveView();
            refresh();
        }).on("click", ".tuydQmTabs a[data-tab]", function (event) {
            event.preventDefault();
            view.tab = $(this).attr("data-tab");
            view.sort = null;
            view.limit = 50;
            view.openRow = null;
            saveView();
            refresh();
        }).on("input", "input[type=search]", function () {
            search(this.value);
        }).on("click", ".tuydQmSearchClear", function (event) {
            event.preventDefault();
            search("");
            dialog.find("input[type=search]").trigger("focus");
        }).on("click", ".tuydQmTable thead td", function () {
            var key = $(this).attr("data-sort");
            var current = view.sort || (view.tab === "recent" ? { key: "date", descending: true } : { key: "games", descending: true });
            var textFirst = ["name", "template", "opponents", "result"].indexOf(key) !== -1;
            view.sort = { key: key, descending: current.key === key ? !current.descending : !textFirst };
            refresh();
        }).on("click", ".tuydQmRow", function (event) {
            if ($(event.target).closest("a").length) {
                return;
            }
            var key = $(this).attr("data-key");
            view.openRow = view.openRow === key ? null : key;
            refresh();
        }).on("click", ".tuydQmAll", function (event) {
            event.preventDefault();
            view.limit = 0;
            refresh();
        }).on("click", ".tuydQmReadStart", function (event) {
            event.preventDefault();
            startReading();
        }).on("click", ".tuydQmReadStop", function (event) {
            event.preventDefault();
            if (reading) {
                clearInterval(reading.timer);
            }
            $("#" + GAME_TEMPLATE_FRAME_ID).remove();
            reading = null;
            refresh();
        }).on("click", ".tuydQmCopy", function () {
            copyText(quickmatchSummaryText(stats, 5)).then(function () {
                dialog.find(".tuydQmStatus").text("Copied.");
            }, function () {
                dialog.find(".tuydQmStatus").text("Couldn't copy.");
            });
        }).on("click", ".tuydQmCsv", function () {
            downloadText("quickmatch-games.csv", quickmatchCsv(games, me, templates, location.origin), "text/csv;charset=utf-8");
        });
        search(view.query);
    };
    var check = function () {
        timer = null;
        if (!ready) {
            return;
        }
        var here = !!scene();
        if (dialog && !here) {
            closeDialog();
        }
        placeSummary();
        placeTemplateRecords();
        if (here && !onScene) {
            refreshLatest();
        }
        onScene = here;
    };
    $(document).on("click", ".tuydQmStatsButton", function (event) {
        event.preventDefault();
        if (dialog) {
            closeDialog();
        } else {
            openDialog();
        }
    }).on("keydown", function (event) {
        if (event.key !== "Escape" || !dialog) {
            return;
        }
        if ($(event.target).is("#tuydQmStats input[type=search]") && view.query) {
            event.preventDefault();
            search("");
        } else {
            closeDialog();
        }
    });
    $(window).on("resize", function () {
        if (dialog) {
            fitDialog();
        }
    });
    signedInPlayerId().done(function (id) {
        me.id = gamePlayerId(id);
        me.name = !me.id && window.WlPlayer ? WlPlayer.Name : null;
        if (!me.id && !me.name) {
            return;
        }
        var stored = storedQuickmatchGames(me.id);
        if (stored) {
            games = stored.games;
            scannedAt = stored.time || 0;
            checkedAt = Math.max(scannedAt, stored.checked || 0);
            partial = stored.partial || null;
        }
        ready = true;
        refresh();
        check();
        new MutationObserver(function () {
            if (!timer) {
                timer = setTimeout(check, 300);
            }
        }).observe(document.body, { childList: true, subtree: true });
    });
}

// Your Quickmatch record under war.app's Quickmatch ratings on your own profile, from what the Quickmatch
// screen last read: nothing is loaded here.
function setupQuickmatchProfileRecord() {
    signedInPlayerId().done(function (playerId) {
        var id = gamePlayerId(playerId);
        var stored = id && extractPlayerId(location.href) === playerId ? storedQuickmatchGames(id) : null;
        var heading = $("h3").filter(function () {
            return $(this).text().trim() === "Quickmatch";
        }).first();
        if (!stored || stored.partial || !heading.length || $("#tuydQmProfileRecord").length) {
            return;
        }
        var stats = quickmatchStats(stored.games, { id: id }, storedQuickmatchTemplates(), readQuickmatchView().countBoots);
        if (!stats.games.length) {
            return;
        }
        var line = $('<span id="tuydQmProfileRecord"></span>').text("Record: " + quickmatchRecordText(stats) + " in " + stats.games.length + " games")
            .attr("title", "From your Past Games on " + new Date(Math.max(stored.time, stored.checked || 0)).toLocaleString() + ", when you last opened Quickmatch (Muli's Userscript)")
            .add("<br>");
        var folded = heading.next("div.exp");
        var next = heading.nextAll("h3").first();
        if (folded.length) {
            folded.append(line);
        } else if (next.length) {
            line.insertBefore(next);
        } else {
            heading.parent().append(line);
        }
    });
}

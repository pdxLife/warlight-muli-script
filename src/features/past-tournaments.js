// war.app's request for Past Tournaments carries your sign-in, so it's kept in memory only, never stored. It has to be
// watched from the start: war.app sends its first one while the page loads.
var lastMyTournamentsRequest = null;

function watchMyTournamentsRequests() {
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.tuydMyTournaments = /[?&]m=GetMyTournaments\b/.test(String(url));
        return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
        if (this.tuydMyTournaments && typeof body === "string") {
            lastMyTournamentsRequest = body;
            document.dispatchEvent(new Event("tuyd:myTournamentsRequest"));
        }
        return send.apply(this, arguments);
    };
}

var PAST_TOURNAMENTS_CHUNK = 2000;
var PAST_TOURNAMENTS_STATES = ["Open", "In progress", "Finished", "Cancelled"];

// Your part in a tournament, as war.app keeps it: 0 invited (never answered), 1 joined, 2 declined.
var PAST_TOURNAMENTS_YOU = ["Not answered", "Joined", "Declined"];

// war.app's Past Tournaments asks for 30 tournaments a page with a binary request (Services?m=GetMyTournaments)
// that carries your sign-in. Its last 17 bytes are the list's filter, page size, sort and offset, so the script asks
// for any part of the same list by changing them in war.app's latest request. Returns null if the request isn't one.
function myTournamentsRequest(template, filter, offset, count) {
    var hex = String(template || "").trim().toUpperCase();
    if (!/^(?:[0-9A-F]{2})+$/.test(hex) || hex.length < 62 || hex.substr(4, 8) !== "39F1475A" || hex.substr(20, 8) !== "58000000"
        || hex.substr(hex.length - 34, 2) !== "01") {
        return null;
    }
    var int = function (number) {
        return [0, 8, 16, 24].map(function (shift) {
            return ("0" + ((number >>> shift) & 255).toString(16)).slice(-2);
        }).join("").toUpperCase();
    };
    return hex.slice(0, -34) + "01" + int(filter) + int(count) + int(0) + int(offset);
}

// war.app's answer, as ujs.js reads it: the message header, the "extras" war.app sends with every answer (mail and
// notifications), then MyTournamentsReturn: the total, the open tournaments anyone can join (only sent for the
// Tournaments page's filter, 8), the server's time and your tournaments, each a TournamentInfo. Integers and doubles are little-endian, a bool or enum is a byte, a text is a "has value" byte, a 7-bit
// length and UTF-8, a list is a count (-1 for none), and an optional value has a "has value" byte first. Dates count
// milliseconds from the start of 2000. Only the fields used here are kept. If war.app changes the layout, this returns null.
function parseMyTournamentsReply(hex) {
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
            throw new Error("Past Tournaments data ends early");
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
    var optional = function (read) {
        return bool() ? read() : null;
    };
    var list = function (item) {
        var count = int();
        var items = [];
        for (var i = 0; i < count; i++) {
            items.push(item());
        }
        return items;
    };
    var extras = function () {
        optional(function () {
            list(function () {
                int();
                text();
            });
        });
        optional(int);
        text();
        optional(function () {
            text();
            text();
            int();
            optional(function () {
                text();
                int();
                double();
                text();
                text();
            });
            int();
        });
        optional(function () {
            list(function () {
                int();
                optional(function () {
                    list(text);
                });
            });
        });
        optional(function () {
            bool();
            double();
            bool();
        });
    };
    var settings = function () {
        optional(double);
        bool();
        int();
        text();
        bool();
        bool();
        optional(int);
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
        double();
        var unread = bool();
        var coins = optional(function () {
            int();
            var fee = int();
            optional(int);
            var prizes = optional(function () {
                return list(function () {
                    return [int(), int()];
                });
            }) || [];
            if (bool()) {
                need(2);
                p += 2;
            }
            return { fee: fee, prizes: prizes };
        });
        optional(int);
        var creator = optional(function () {
            var clan = optional(function () {
                int();
                int();
                return text();
            });
            optional(int);
            bool();
            int();
            var name = text();
            int();
            int();
            int();
            return { name: name, clan: clan };
        });
        var boot = double();
        byte();
        bool();
        int();
        int();
        var name = text();
        var joined = int();
        var rounds = int();
        var me = optional(int);
        var realTime = bool();
        var starts = optional(double);
        optional(settings);
        var state = byte();
        var teamSize = int();
        var teamsPerGame = optional(int);
        var id = int();
        var type = byte();
        return {
            id: id,
            name: name || "",
            creator: creator && creator.name || "",
            clan: creator && creator.clan || "",
            type: type,
            players: type === 2 ? joined : Math.pow(teamsPerGame || 2, rounds) * teamSize,
            teamSize: teamSize,
            boot: boot,
            realTime: realTime,
            fee: coins ? coins.fee : null,
            prizes: coins ? coins.prizes.sort(function (a, b) {
                return a[0] - b[0];
            }) : [],
            state: state,
            me: me,
            unread: unread,
            starts: starts
        };
    };
    try {
        p = 2;
        if (int() !== 1514664249) {
            return null;
        }
        int();
        if (int() !== 88) {
            return null;
        }
        if (byte() === 1) {
            extras();
        }
        if (byte() === 5 || !bool()) {
            return null;
        }
        var total = int();
        var tournamentList = function () {
            return (optional(function () {
                return list(function () {
                    return optional(tournament);
                });
            }) || []).filter(Boolean);
        };
        var open = tournamentList();
        double();
        var tournaments = tournamentList();
        return p === bytes.length ? { total: total, tournaments: tournaments, open: open } : null;
    } catch (e) {
        return null;
    }
}

// Filter 0 is all your tournaments (Past Tournaments' All); 8, the Tournaments page's, also brings the open tournaments.
function fetchMyTournaments(template, offset, count, filter) {
    var body = myTournamentsRequest(template, filter || 0, offset, count);
    if (!body) {
        return Promise.reject(new Error("war.app's tournament request has changed"));
    }
    // fetch, not XMLHttpRequest, so watchMyTournamentsRequests doesn't take the script's own requests for war.app's.
    return fetch("/Services?m=GetMyTournaments&js=1", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: body
    }).then(function (response) {
        if (!response.ok) {
            throw new Error("war.app answered " + response.status);
        }
        return response.text();
    }).then(function (hex) {
        var page = parseMyTournamentsReply(hex);
        if (!page) {
            throw new Error("war.app's tournament list couldn't be read");
        }
        return page;
    });
}

// Brings the stored list (newest first: war.app sorts it by tournament ID) up to date. Until it has been read to the end,
// reading goes on from where it stopped, `chunk` tournaments a request, saving after each. After that, each update reads
// from the top down to the newest tournament already stored and the oldest one still open or in progress, so new ones
// are added and running ones get their new state; tournaments war.app no longer lists in that range are dropped.
function readPastTournaments(stored, fetchPage, onSave, chunk) {
    chunk = chunk || PAST_TOURNAMENTS_CHUNK;
    stored = stored || {};
    var byId = {};
    (stored.tournaments || []).forEach(function (tournament) {
        byId[tournament.id] = tournament;
    });
    var sorted = function () {
        return Object.keys(byId).map(function (id) {
            return byId[id];
        }).sort(function (a, b) {
            return b.id - a.id;
        });
    };
    var save = function (changes) {
        stored = Object.assign({}, stored, changes, { tournaments: sorted() });
        onSave(stored);
        return stored;
    };
    var catchUp = function () {
        var known = sorted();
        var running = known.filter(function (tournament) {
            return tournament.state === 0 || tournament.state === 1;
        });
        var threshold = known.length ? Math.min(known[0].id, running.length ? running[running.length - 1].id : Infinity) : -Infinity;
        var size = Math.max(100, known.filter(function (tournament) {
            return tournament.id >= threshold;
        }).length + 50);
        var seen = {};
        var step = function (offset) {
            return fetchPage(offset, size).then(function (page) {
                page.tournaments.forEach(function (tournament) {
                    byId[tournament.id] = tournament;
                    seen[tournament.id] = true;
                });
                var end = page.tournaments.length < size || offset + page.tournaments.length >= page.total;
                var last = page.tournaments.length ? page.tournaments[page.tournaments.length - 1].id : null;
                if (!end && last > threshold) {
                    return step(offset + page.tournaments.length);
                }
                var floor = end ? -Infinity : last;
                Object.keys(byId).forEach(function (id) {
                    if (byId[id].id > floor && !seen[id]) {
                        delete byId[id];
                    }
                });
                return save({ total: page.total, checkedAt: Date.now() });
            });
        };
        return step(0);
    };
    if (stored.complete) {
        return catchUp();
    }
    var resumed = stored.next > 0;
    var readFrom = function (offset) {
        return fetchPage(offset, chunk).then(function (page) {
            page.tournaments.forEach(function (tournament) {
                byId[tournament.id] = tournament;
            });
            var next = offset + page.tournaments.length;
            var done = page.tournaments.length < chunk || next >= page.total;
            save({ complete: done, next: done ? 0 : next, total: page.total, checkedAt: Date.now() });
            return done ? (resumed ? catchUp() : stored) : readFrom(next);
        });
    };
    return readFrom(stored.next || 0);
}

// A series is the start of the names several of your tournaments share: "93rd Titled Tuesday - RCO" is in "Titled
// Tuesday", "AWP World Tour - 250 Series - Fast Earth" in "AWP World Tour", "NC 26 Brunnia" in "NC 26". The part before
// " - " or ": " counts, without a leading number like "93rd" or "{101st}"; the whole of it when 3 or more tournaments
// share it, otherwise its first two words, then its first word if that's an abbreviation like "WGL". Returns each
// tournament's series by ID.
function pastTournamentSeries(tournaments) {
    var candidates = function (name) {
        var head = String(name || "").split(/\s+-\s+|:\s+|:$/)[0].replace(/^[\[{(]?\d+(?:st|nd|rd|th)?[\]})]?\s+/i, "")
            .replace(/(\d)\s*v\s*(\d)/gi, "$1v$2").trim();
        var words = head ? head.split(/\s+/) : [];
        return [words.join(" "), words.slice(0, 2).join(" ").replace(/\s+(?:a|and|at|for|in|of|on|the|vs)$/i, ""), words[0]].filter(function (candidate, i, found) {
            return candidate && found.indexOf(candidate) === i && /[a-z]{2}/i.test(candidate) && (candidate.indexOf(" ") !== -1 || /^[A-Z][A-Z0-9]+$/.test(candidate));
        });
    };
    var counts = {};
    var names = {};
    tournaments.forEach(function (tournament) {
        candidates(tournament.name).forEach(function (candidate) {
            var key = candidate.toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
            names[key] = names[key] || candidate;
        });
    });
    var series = {};
    tournaments.forEach(function (tournament) {
        var found = candidates(tournament.name).filter(function (candidate) {
            return counts[candidate.toLowerCase()] >= 3;
        })[0];
        series[tournament.id] = found ? names[found.toLowerCase()] : "";
    });
    return series;
}

// The values of a <select> for the series or creators, most tournaments first, with their counts.
function pastTournamentOptions(values, selected) {
    var counts = {};
    values.forEach(function (value) {
        if (value) {
            counts[value] = (counts[value] || 0) + 1;
        }
    });
    if (selected && !counts[selected]) {
        counts[selected] = 0;
    }
    return Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a] || a.localeCompare(b);
    }).map(function (value) {
        return { value: value, count: counts[value] };
    });
}

function normalizePastTournamentsFilter(value) {
    value = value || {};
    var oneOf = function (choice, choices) {
        return choices.indexOf(choice) !== -1 ? choice : "";
    };
    var count = function (number) {
        number = parseInt(number, 10);
        return number > 0 ? number : 0;
    };
    var date = function (text) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(text || "")) ? String(text) : "";
    };
    return {
        query: typeof value.query === "string" ? value.query : "",
        series: typeof value.series === "string" ? value.series : "",
        creator: typeof value.creator === "string" ? value.creator : "",
        type: oneOf(value.type, ["single", "double", "roundRobin"]),
        teams: oneOf(value.teams, ["solo", "teams"]),
        minPlayers: count(value.minPlayers),
        maxPlayers: count(value.maxPlayers),
        speed: oneOf(value.speed, ["realTime", "multiDay"]),
        coins: oneOf(value.coins, ["free", "fee", "prize"]),
        you: oneOf(value.you, ["stillIn", "joined", "declined", "unanswered", "notDeclined"]),
        state: oneOf(value.state, ["open", "running", "notFinished", "finished", "cancelled"]),
        unread: value.unread === true,
        from: date(value.from),
        to: date(value.to),
        reversed: value.reversed === true
    };
}

function pastTournamentDate(tournament) {
    return tournament.starts === null || tournament.starts === undefined ? ""
        : new Date(Date.UTC(2000, 0, 1) + tournament.starts).toISOString().slice(0, 10);
}

// "stillIn" is war.app's own My Tournaments, by ID: what you're still playing in or can still join. The list itself
// doesn't say whether you were eliminated.
function pastTournamentMatches(tournament, filter, series, stillIn) {
    if (filter.you === "stillIn" && !(stillIn || {})[tournament.id]) {
        return false;
    }
    var query = String(filter.query || "").trim().toLowerCase();
    if (query && [tournament.name, tournament.creator, tournament.clan].every(function (text) {
        return String(text || "").toLowerCase().indexOf(query) === -1;
    })) {
        return false;
    }
    if (filter.series && (series || {})[tournament.id] !== filter.series || filter.creator && tournament.creator !== filter.creator) {
        return false;
    }
    if (filter.type && ["single", "double", "roundRobin"][tournament.type] !== filter.type) {
        return false;
    }
    if (filter.teams && (tournament.teamSize > 1) !== (filter.teams === "teams")) {
        return false;
    }
    if (filter.minPlayers && tournament.players < filter.minPlayers || filter.maxPlayers && tournament.players > filter.maxPlayers) {
        return false;
    }
    if (filter.speed && tournament.realTime !== (filter.speed === "realTime")) {
        return false;
    }
    var fee = tournament.fee || 0;
    if (filter.coins === "free" && fee > 0 || filter.coins === "fee" && fee === 0 || filter.coins === "prize" && !tournament.prizes.length) {
        return false;
    }
    if (filter.you === "joined" && tournament.me !== 1 || filter.you === "declined" && tournament.me !== 2
        || filter.you === "unanswered" && tournament.me !== 0 || filter.you === "notDeclined" && tournament.me === 2) {
        return false;
    }
    if (filter.state === "notFinished" ? tournament.state !== 0 && tournament.state !== 1
        : filter.state && ["open", "running", "finished", "cancelled"][tournament.state] !== filter.state) {
        return false;
    }
    if (filter.unread && !tournament.unread) {
        return false;
    }
    var date = pastTournamentDate(tournament);
    return !((filter.from || filter.to) && (!date || filter.from && date < filter.from || filter.to && date > filter.to));
}

function pastTournamentBootText(ms) {
    var count = function (value, unit) {
        value = Math.round(value * 10) / 10;
        return value + " " + unit + (value === 1 ? "" : "s");
    };
    return ms < 60 * 60 * 1000 ? count(ms / 60000, "minute") : ms < 24 * 60 * 60 * 1000 ? count(ms / 3600000, "hour") : count(ms / 86400000, "day");
}

function pastTournamentKindText(tournament) {
    var kind = tournament.type === 2 ? "Round robin, " + tournament.players + " players"
        : tournament.players + "-player " + (tournament.type === 1 ? "double" : "single") + " elimination";
    return kind + (tournament.teamSize > 1 ? ", teams of " + tournament.teamSize : "");
}

function pastTournamentCoinsText(tournament) {
    if (tournament.fee === null || tournament.fee === undefined) {
        return "";
    }
    var ordinal = function (place) {
        var tens = place % 100;
        return place + (tens > 10 && tens < 14 ? "th" : ["th", "st", "nd", "rd"][place % 10] || "th");
    };
    return [tournament.fee ? "Entry " + tournament.fee.toLocaleString("en-US") : "Free"].concat(tournament.prizes.map(function (prize) {
        return ordinal(prize[0]) + " " + prize[1].toLocaleString("en-US");
    })).join(" · ");
}

function pastTournamentsListHtml(tournaments) {
    var rows = tournaments.map(function (tournament) {
        var meta = [tournament.creator ? "by " + tournament.creator + (tournament.clan ? " (" + tournament.clan + ")" : "") : "",
            pastTournamentKindText(tournament), pastTournamentBootText(tournament.boot) + (tournament.realTime ? " (real-time)" : "")].filter(Boolean);
        var you = PAST_TOURNAMENTS_YOU[tournament.me] || "";
        return '<tr><td><a href="/MultiPlayer/Tournament?ID=' + htmlEscape(tournament.id) + '">' + htmlEscape(tournament.name || "Tournament " + tournament.id) + "</a>"
            + (tournament.unread ? ' <span class="tuydPtUnread" title="Unread public chat messages">chat</span>' : "")
            + '<div class="tuydPtMeta">' + htmlEscape(meta.join(" · ")) + "</div>"
            + (tournament.fee === null || tournament.fee === undefined ? "" : '<div class="tuydPtMeta tuydPtCoins">' + htmlEscape(pastTournamentCoinsText(tournament)) + "</div>") + "</td>"
            + '<td class="tuydPtYou tuydPtYou' + htmlEscape(tournament.me === null ? "" : tournament.me) + '">' + htmlEscape(you) + "</td>"
            + "<td>" + htmlEscape(PAST_TOURNAMENTS_STATES[tournament.state] || "") + '<div class="tuydPtMeta">' + htmlEscape(pastTournamentDate(tournament)) + "</div></td></tr>";
    }).join("");
    return '<table class="tuydPtList"><thead><tr><td>Tournament</td><td>You</td><td title="With the date it was set to start">State</td></tr></thead><tbody>' + rows + "</tbody></table>";
}

function pastTournamentsCsv(tournaments, series, origin) {
    var rows = [["Tournament ID", "Tournament", "Series", "Creator", "Clan", "Kind", "Players", "Team size", "Boot time", "Real-time", "Entry fee", "Prizes",
        "You", "State", "Start date", "Unread chat", "Link"]];
    tournaments.forEach(function (tournament) {
        rows.push([tournament.id, tournament.name, (series || {})[tournament.id] || "", tournament.creator, tournament.clan,
            ["Single elimination", "Double elimination", "Round robin"][tournament.type] || "", tournament.players, tournament.teamSize,
            pastTournamentBootText(tournament.boot), tournament.realTime ? "Yes" : "No", tournament.fee === null || tournament.fee === undefined ? "" : tournament.fee,
            pastTournamentCoinsText(tournament).split(" · ").slice(1).join("; "), PAST_TOURNAMENTS_YOU[tournament.me] || "",
            PAST_TOURNAMENTS_STATES[tournament.state] || "", pastTournamentDate(tournament), tournament.unread ? "Yes" : "No",
            origin + "/MultiPlayer/Tournament?ID=" + tournament.id]);
    });
    return rows.map(function (row) {
        return row.map(csvCell).join(",");
    }).join("\r\n") + "\r\n";
}

function pastTournamentsKey(playerId) {
    return "pastTournaments:" + playerId;
}

// Past Tournaments lists every tournament you were invited to, 30 a page, with no search. With "Past Tournaments: Search
// Your Whole List" on, a Search button by war.app's Filter opens a panel that searches and filters all of them, read from
// war.app with its own request and kept in IndexedDB (see readPastTournaments). With it off, the button offers to turn it on.
// The Tournaments page has the button too, by My Tournaments, opening the panel on the tournaments you're still in.
function setupPastTournamentsSearch() {
    var me = null;
    var on = false;
    var stored = null;
    var loaded = false;
    var reading = null;
    var failed = false;
    var waiting = false;
    var lastUpdate = 0;
    var dialog = null;
    var timer = null;
    var onScene = null;
    var cleared = false;
    var series = {};
    var stillIn = null;
    var stillInAt = 0;
    var stillInLoading = false;
    var filter = normalizePastTournamentsFilter({});
    // Each page keeps its own filters; the Tournaments page's start over each time you come to it.
    var filters = {};
    var filterKey = "past";
    var limit = 100;
    addTournamentButtonStyles();
    addCSS(`
        #tuydPtSearch { display: flex; flex-direction: column; }
        #tuydPtSearch .tuydPtClose { position: absolute; top: -42px; right: 4px; color: #fff; font-size: 18px; text-decoration: none; }
        #tuydPtSearch a { color: #e0c060; }
        #tuydPtSearch .tuydPtOffer p { margin: 0 0 8px; }
        #tuydPtSearch .tuydPtOffer .tuydPtButton { position: static; display: inline-block; margin-right: 8px; }
        #tuydPtSearch .tuydPtFilters > div { margin-bottom: 6px; }
        #tuydPtSearch input, #tuydPtSearch select { display: inline-block; width: auto; max-width: 100%; margin: 0 6px 2px 0; background: #222; color: #ddd;
            border: 1px solid #555; padding: 1px 4px; color-scheme: dark; }
        #tuydPtSearch input[type=search] { width: 220px; }
        #tuydPtSearch input[type=number] { width: 56px; }
        #tuydPtSearch select[name=series], #tuydPtSearch select[name=creator] { max-width: 210px; }
        #tuydPtSearch label { font-weight: normal; margin: 0 10px 0 0; }
        #tuydPtSearch input[type=checkbox] { margin: 0 4px 0 0; vertical-align: middle; }
        #tuydPtSearch .tuydPtStatus, #tuydPtSearch .tuydPtMeta, #tuydPtSearch .tuydPtHead { color: #8d8d8d; }
        #tuydPtSearch .tuydPtResults { flex: 1 1 auto; min-height: 80px; margin-top: 6px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #555 transparent; }
        #tuydPtSearch .tuydPtList { width: 100%; }
        #tuydPtSearch .tuydPtList td { padding: 4px 6px; border-top: 1px solid rgba(255, 255, 255, 0.08); vertical-align: top; }
        #tuydPtSearch .tuydPtList thead td { color: #fff; border-top: 0; }
        #tuydPtSearch .tuydPtList td + td { white-space: nowrap; }
        #tuydPtSearch .tuydPtList a { color: #fff; }
        #tuydPtSearch .tuydPtMeta { font-size: 12px; line-height: 16px; }
        #tuydPtSearch .tuydPtCoins { color: #c8b44a; }
        #tuydPtSearch .tuydPtUnread { color: #f5deb3; font-size: 12px; }
        #tuydPtSearch .tuydPtYou1 { color: #7c7; }
        #tuydPtSearch .tuydPtYou2 { color: #e77; }
        #tuydPtSearch .tuydPtMore { margin: 8px 6px; }
        #tuydPtSearch .tuydPtHead .tuydPtCsv { margin-left: 8px; }
        #tuydPtSearch .communityLaddersCredit { margin-top: 6px; }
    `);
    var scene = function () {
        return ["PastTournamentsScene", "TournamentsScene"].map(function (name) {
            return ujsElement(name);
        }).filter(function (element) {
            return element && shownUjsElement(element);
        })[0] || null;
    };
    var onPastScene = function () {
        var element = scene();
        return !!element && element.id === "ujs_PastTournamentsScene";
    };
    var wearArt = function (element) {
        var art = warappArt(scene() || document.body);
        Object.keys(art).forEach(function (name) {
            if (art[name]) {
                element[0].style.setProperty(name, art[name]);
            }
        });
    };
    var key = function () {
        return pastTournamentsKey(me);
    };
    var persist = function (value) {
        Database.update(Database.Table.TournamentData, { tournamentId: key(), value: value });
    };
    var loadStored = function () {
        if (loaded) {
            return Promise.resolve(stored);
        }
        return Database.readIndex(Database.Table.TournamentData, Database.Row.TournamentData.Id, key()).then(function (record) {
            loaded = true;
            stored = stored || (record && record.value) || null;
            series = pastTournamentSeries(stored ? stored.tournaments : []);
            return stored;
        });
    };
    var update = function (rescan) {
        if (!on || reading || !me) {
            return;
        }
        if (!lastMyTournamentsRequest) {
            waiting = true;
            render();
            return;
        }
        waiting = false;
        failed = false;
        lastUpdate = Date.now();
        reading = { rescan: !!rescan };
        render();
        loadStored().then(function () {
            var start = rescan ? { tournaments: [] } : stored;
            return readPastTournaments(start, function (offset, count) {
                return fetchMyTournaments(lastMyTournamentsRequest, offset, count);
            }, function (value) {
                if (!rescan || value.complete) {
                    stored = value;
                    series = pastTournamentSeries(stored.tournaments);
                    persist(value);
                } else {
                    reading.read = value.tournaments.length;
                    reading.total = value.total;
                }
                render();
            });
        }).then(function () {
            reading = null;
            render();
        }, function (error) {
            log("Past Tournaments: " + (error && error.message || error));
            reading = null;
            failed = true;
            render();
        });
    };
    var setOn = function (value) {
        on = value;
        Database.update(Database.Table.Settings, { name: "pastTournamentsSearch", value: value });
        if (!value) {
            stored = null;
            loaded = true;
            series = {};
            cleared = true;
            Database.delete(Database.Table.TournamentData, key());
        } else {
            loaded = false;
            update(false);
        }
        render();
    };
    var statusHtml = function () {
        var count = stored ? stored.tournaments.length : 0;
        var tools = ' · <a href="#" class="tuydPtRescan" title="Read your whole list from war.app again">Rescan</a> · <a href="#" class="tuydPtOff" title="Stop reading your list and delete it from this browser">Turn off</a>';
        if (failed) {
            return 'Couldn\'t read your tournaments from war.app. <a href="#" class="tuydPtRetry">Try again</a>' + tools;
        }
        if (waiting) {
            return "Waiting for war.app's list: " + (onPastScene() ? "open another page of it, or reload." : "press My Tournaments' Refresh, or reload.");
        }
        if (reading && reading.rescan) {
            return "Reading your whole list again" + (reading.total ? ": " + formatCount(reading.read) + " of " + formatCount(reading.total) : "") + "…";
        }
        if (stored && !stored.complete) {
            return "Reading your tournaments: " + formatCount(count) + " of " + formatCount(stored.total) + (reading ? "…" : " (more next time)") + tools;
        }
        if (reading && !stored) {
            return "Reading your tournaments…";
        }
        return formatCount(count) + " tournament" + (count === 1 ? "" : "s") + (reading ? ", checking for new ones…" : "") + tools;
    };
    var fillOptions = function () {
        var list = stored ? stored.tournaments : [];
        [["series", "All series", list.map(function (tournament) {
            return series[tournament.id];
        })], ["creator", "Any creator", list.map(function (tournament) {
            return tournament.creator;
        })]].forEach(function (field) {
            var select = dialog.find("[name=" + field[0] + "]");
            var options = pastTournamentOptions(field[2], filter[field[0]]).filter(function (option) {
                return field[0] === "creator" || option.count >= 3 || option.value === filter.series;
            });
            var signature = options.map(function (option) {
                return option.value + option.count;
            }).join("|");
            if (select.attr("data-signature") === signature) {
                return;
            }
            select.attr("data-signature", signature).empty().append($("<option>").val("").text(field[1]));
            options.forEach(function (option) {
                select.append($("<option>").val(option.value).text(option.value + " (" + option.count + ")"));
            });
            select.val(filter[field[0]]);
        });
    };
    var shownTournaments = function () {
        var shown = (stored ? stored.tournaments : []).filter(function (tournament) {
            return pastTournamentMatches(tournament, filter, series, stillIn);
        });
        return filter.reversed ? shown.reverse() : shown;
    };
    // On the Tournaments page it's the My Tournaments cards on screen; elsewhere war.app's list is asked for (filter 8).
    var readStillIn = function () {
        if (scene() && !onPastScene()) {
            stillIn = {};
            $("#ujs_MyTournamentsContainer a[href*='Tournament?ID=']").each(function () {
                var id = /[?&]ID=(\d+)/i.exec($(this).attr("href") || "");
                if (id) {
                    stillIn[id[1]] = true;
                }
            });
            return;
        }
        if (stillInLoading || !lastMyTournamentsRequest || stillIn && Date.now() - stillInAt < 60 * 1000) {
            return;
        }
        stillInLoading = true;
        fetchMyTournaments(lastMyTournamentsRequest, 0, 2147483647, 8).then(function (page) {
            stillIn = {};
            page.tournaments.forEach(function (tournament) {
                stillIn[tournament.id] = true;
            });
            stillInAt = Date.now();
        }, function (error) {
            log("Past Tournaments: " + (error && error.message || error));
        }).then(function () {
            stillInLoading = false;
            render();
        });
    };
    var render = function () {
        if (!dialog) {
            return;
        }
        var body = dialog.find(".tuydPtBody");
        if (!on) {
            if (!body.find(".tuydPtOffer").length) {
                body.html(`<div class="tuydPtOffer">
                    <p>Search and filter every tournament on this list: by name or creator, series, kind, speed, coins, whether you joined,
                    declined or never answered, and more. War.app shows them 30 at a time with no search.</p>
                    <p>To do this the script reads your whole list from war.app (about a second for each 1,000 tournaments), keeps it in this
                    browser, and brings it up to date each time you come to Past Tournaments. You can turn it off here, or in the settings
                    menu under Tournaments ("Past Tournaments: Search Your Whole List").</p>
                    <a href="#" class="tuydPtButton tuydPtOn">Turn on</a><a href="#" class="tuydPtClose2">Not now</a></div>`);
                wearArt(body.find(".tuydPtOffer"));
            }
            return;
        }
        if (!body.find(".tuydPtFilters").length) {
            body.html(`<div class="tuydPtFilters">
                <div><input type="search" name="query" placeholder="Name, creator or clan" aria-label="Search by name, creator or clan">
                    <select name="series" aria-label="Series"><option value="">All series</option></select>
                    <select name="creator" aria-label="Creator"><option value="">Any creator</option></select></div>
                <div><select name="you" aria-label="Your part">
                        <option value="">You: any</option><option value="stillIn">You're still in (My Tournaments)</option><option value="joined">You joined</option><option value="notDeclined">You didn't decline</option>
                        <option value="declined">You declined</option><option value="unanswered">You never answered</option></select>
                    <select name="state" aria-label="State">
                        <option value="">Any state</option><option value="notFinished">Not finished</option><option value="open">Open</option><option value="running">In progress</option>
                        <option value="finished">Finished</option><option value="cancelled">Cancelled</option></select>
                    <select name="type" aria-label="Kind">
                        <option value="">Any kind</option><option value="single">Single elimination</option><option value="double">Double elimination</option>
                        <option value="roundRobin">Round robin</option></select>
                    <select name="teams" aria-label="Teams"><option value="">Players or teams</option><option value="solo">Players</option><option value="teams">Teams</option></select></div>
                <div><select name="speed" aria-label="Speed"><option value="">Any speed</option><option value="realTime">Real-time</option><option value="multiDay">Multi-day</option></select>
                    <select name="coins" aria-label="Coins"><option value="">Any coins</option><option value="free">No entry fee</option><option value="fee">Entry fee</option>
                        <option value="prize">Coin prizes</option></select>
                    <label>Players <input type="number" name="minPlayers" min="0" step="1" aria-label="At least this many players"> to
                        <input type="number" name="maxPlayers" min="0" step="1" aria-label="At most this many players"></label></div>
                <div><label>Start date from <input type="date" name="from"></label><label>to <input type="date" name="to"></label>
                    <label><input type="checkbox" name="unread">Unread chat</label><label><input type="checkbox" name="reversed">Oldest first</label></div>
            </div>
            <div class="tuydPtStatus"></div>
            <div class="tuydPtResults"></div>`);
            body.find(".tuydPtFilters").find("input, select").each(function () {
                var value = filter[this.name];
                if (this.type === "checkbox") {
                    this.checked = value === true;
                } else if (this.tagName !== "SELECT" || $(this).find("option").filter(function () {
                    return this.value === String(value);
                }).length) {
                    $(this).val(value ? String(value) : "");
                }
            });
        }
        fillOptions();
        dialog.find(".tuydPtStatus").html(statusHtml());
        var results = dialog.find(".tuydPtResults");
        if (!stored || !stored.tournaments.length) {
            results.html("");
            return;
        }
        if (filter.you === "stillIn") {
            readStillIn();
            if (!stillIn) {
                results.html('<div class="tuydPtHead">' + (lastMyTournamentsRequest ? "Checking which tournaments you're still in…" : "Waiting for war.app's list to see which tournaments you're still in.") + "</div>");
                return;
            }
        }
        var shown = shownTournaments();
        results.html('<div class="tuydPtHead">' + formatCount(shown.length) + " of " + formatCount(stored.tournaments.length) + " tournaments"
            + (shown.length ? ' <a href="#" class="tuydPtCsv" title="Download these tournaments as a spreadsheet">CSV</a>' : "") + "</div>"
            + (shown.length ? pastTournamentsListHtml(shown.slice(0, limit)) : '<div class="tuydPtHead">No tournament matches.</div>')
            + (shown.length > limit ? '<div class="tuydPtMore"><a href="#" class="tuydPtShowMore">Show ' + Math.min(100, shown.length - limit) + " more</a></div>" : ""));
    };
    var fitDialog = function () {
        var area = dialog.parent()[0].getBoundingClientRect();
        var width = Math.max(300, Math.min(area.width - 32, 760));
        dialog.css({ width: width + "px", left: Math.round(Math.max(0, (area.width - width) / 2)) + "px", top: "10px", maxHeight: Math.round(Math.max(240, area.height - 20)) + "px" });
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
        var title = onPastScene() ? "Search your past tournaments" : "Search your tournaments";
        dialog = $(`<div id="tuydPtSearch" class="tuydCommunityPanel" role="dialog" aria-label="${title}">
            <h3>${title}</h3>
            <a href="#" class="tuydPtClose" title="Close" aria-label="Close">✕</a>
            <div class="tuydPtBody"></div>
            <div class="communityLaddersCredit">From war.app's Past Tournaments, by Muli's Userscript</div>
        </div>`).appendTo(holder);
        wearArt(dialog);
        fitDialog();
        dialog.on("click", ".tuydPtClose, .tuydPtClose2", function (event) {
            event.preventDefault();
            closeDialog();
        }).on("click", ".tuydPtOn", function (event) {
            event.preventDefault();
            setOn(true);
        }).on("click", ".tuydPtOff", function (event) {
            event.preventDefault();
            setOn(false);
        }).on("click", ".tuydPtRescan", function (event) {
            event.preventDefault();
            update(true);
        }).on("click", ".tuydPtRetry", function (event) {
            event.preventDefault();
            update(false);
        }).on("click", ".tuydPtCsv", function (event) {
            event.preventDefault();
            downloadText("past-tournaments.csv", pastTournamentsCsv(shownTournaments(), series, location.origin), "text/csv;charset=utf-8");
        }).on("click", ".tuydPtShowMore", function (event) {
            event.preventDefault();
            limit += 100;
            render();
        }).on("input change", ".tuydPtFilters input, .tuydPtFilters select", function () {
            var field = function (name) {
                return dialog.find("[name=" + name + "]");
            };
            filter = normalizePastTournamentsFilter({
                query: field("query").val(),
                series: field("series").val(),
                creator: field("creator").val(),
                type: field("type").val(),
                teams: field("teams").val(),
                minPlayers: field("minPlayers").val(),
                maxPlayers: field("maxPlayers").val(),
                speed: field("speed").val(),
                coins: field("coins").val(),
                you: field("you").val(),
                state: field("state").val(),
                unread: field("unread").prop("checked"),
                from: field("from").val(),
                to: field("to").val(),
                reversed: field("reversed").prop("checked")
            });
            filters[filterKey] = filter;
            limit = 100;
            render();
        });
        filterKey = onPastScene() ? "past" : "current";
        filter = filters[filterKey] = filters[filterKey] || normalizePastTournamentsFilter(filterKey === "past" ? {} : { you: "stillIn", state: "notFinished" });
        limit = 100;
        loadStored().then(render);
        render();
        if (on && !onPastScene() && (Date.now() - lastUpdate > 60 * 1000 || stored && !stored.complete)) {
            loadStored().then(function () {
                update(false);
            });
        }
    };
    var placeButton = function () {
        var bar = scene() && $(scene()).find("[id^='ujs_MyTournamentsTopBar']").filter(function () {
            return /^ujs_MyTournamentsTopBar(_\d+)?$/.test(this.id);
        }).last();
        if (!bar || !bar.length) {
            return;
        }
        if (!bar.children(".tuydPtButton").length) {
            var button = $('<a href="#" class="tuydPtButton tuydPtOpen" title="Search and filter all your past tournaments (Muli\'s Userscript)">Search</a>').appendTo(bar);
            wearArt(button);
        }
    };
    var check = function () {
        timer = null;
        var here = scene() ? scene().id : null;
        if (dialog && here !== onScene) {
            closeDialog();
        }
        if (here !== onScene && here && !onPastScene()) {
            delete filters.current;
        }
        if (here) {
            placeButton();
        }
        if (here && !on && !cleared) {
            cleared = true;
            Database.delete(Database.Table.TournamentData, key());
        }
        if (here !== onScene && on && onPastScene() && (Date.now() - lastUpdate > 60 * 1000 || stored && !stored.complete)) {
            loadStored().then(function () {
                update(false);
            });
        }
        onScene = here;
    };
    $(document).on("click", ".tuydPtOpen", function (event) {
        event.preventDefault();
        if (dialog) {
            closeDialog();
        } else {
            openDialog();
        }
    }).on("keydown", function (event) {
        if (event.key === "Escape" && dialog) {
            closeDialog();
        }
    }).on("tuyd:myTournamentsRequest", function () {
        if (waiting) {
            update(false);
        }
    });
    $(window).on("resize", function () {
        if (dialog) {
            fitDialog();
        }
    });
    signedInPlayerId().done(function (id) {
        if (!id) {
            return;
        }
        me = id;
        readSettingValue("pastTournamentsSearch", false, function (value) {
            on = value === true;
            loaded = !on;
            check();
            new MutationObserver(function () {
                if (!timer) {
                    timer = setTimeout(check, 300);
                }
            }).observe(document.body, { childList: true, subtree: true });
        });
    });
}

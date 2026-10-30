// War.app's Clan War requests carry your sign-in, so the latest one is kept in memory only, never stored.
var clanWarTraffic = { request: null, answers: {} };
var clanWarCache = {};
var CLAN_WAR_CACHE_MS = 3 * 60 * 1000;
var CLAN_WAR_SCHEDULE_KEY = "tuydClanWarSchedule";
var MAP_TERRITORIES_KEY = "tuydMapTerritories";
var DAY_MS = 24 * 60 * 60 * 1000;

function watchClanWarTraffic() {
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        var match = /[?&]m=(GetClanWar\w*)/.exec(String(url));
        this.tuydClanWar = match ? match[1] : null;
        return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
        var service = this.tuydClanWar;
        if (service && typeof body === "string") {
            if (serviceRequestParts(body)) {
                clanWarTraffic.request = body;
            }
            this.addEventListener("load", function () {
                clanWarTraffic.answers[service] = { body: body, text: this.responseText };
                document.dispatchEvent(new CustomEvent("tuyd:clanWarAnswer", { detail: service }));
            });
        }
        return send.apply(this, arguments);
    };
}

function hexBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function littleEndianHex(number) {
    return [0, 8, 16, 24].map(function (shift) {
        return ("0" + ((number >>> shift) & 255).toString(16)).slice(-2);
    }).join("").toUpperCase();
}

// Dates count milliseconds from the start of 2000. War.app sends its lists and dictionaries as optional values, with
// each list item optional too (items() and map()).
function binaryReader(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var decoder = new TextDecoder("utf-8", { fatal: true });
    var r = { p: 0, length: bytes.length };
    var need = function (n) {
        if (r.p + n > bytes.length) {
            throw new Error("war.app's data ends early");
        }
    };
    r.byte = function () {
        need(1);
        return bytes[r.p++];
    };
    r.bool = function () {
        return r.byte() !== 0;
    };
    r.int = function () {
        need(4);
        r.p += 4;
        return view.getInt32(r.p - 4, true);
    };
    r.short = function () {
        need(2);
        r.p += 2;
        return view.getUint16(r.p - 2, true);
    };
    r.double = function () {
        need(8);
        r.p += 8;
        return view.getFloat64(r.p - 8, true);
    };
    r.date = function () {
        return Date.UTC(2000, 0, 1) + r.double();
    };
    r.skip = function (n) {
        need(n);
        r.p += n;
    };
    r.text = function () {
        if (!r.bool()) {
            return null;
        }
        var length = 0;
        var shift = 0;
        var b;
        do {
            b = r.byte();
            length |= (b & 127) << shift;
            shift += 7;
        } while (b & 128 && shift < 35);
        need(length);
        r.p += length;
        return decoder.decode(bytes.subarray(r.p - length, r.p));
    };
    r.optional = function (read) {
        return r.bool() ? read() : null;
    };
    r.list = function (item) {
        var count = r.int();
        if (count === -1) {
            return null;
        }
        var items = [];
        for (var i = 0; i < count; i++) {
            items.push(item());
        }
        return items;
    };
    r.dict = function (key, value) {
        var count = r.int();
        if (count === -1) {
            return null;
        }
        var items = {};
        for (var i = 0; i < count; i++) {
            var k = key();
            items[k] = value();
        }
        return items;
    };
    r.items = function (item) {
        return (r.optional(function () {
            return r.list(function () {
                return r.optional(item);
            });
        }) || []).filter(function (x) {
            return x !== null;
        });
    };
    r.map = function (key, value) {
        return r.optional(function () {
            return r.dict(key, value);
        }) || {};
    };
    return r;
}

function readServiceReply(hex, op, readBody, partial) {
    hex = String(hex || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
        return null;
    }
    var r = binaryReader(hexBytes(hex));
    try {
        r.p = 2;
        if (r.int() !== 1514664249) {
            return null;
        }
        r.int();
        if (r.int() !== op) {
            return null;
        }
        if (r.byte() === 1) {
            r.optional(function () {
                r.list(function () {
                    r.int();
                    r.text();
                });
            });
            r.optional(r.int);
            r.text();
            r.optional(function () {
                r.text();
                r.text();
                r.int();
                r.optional(function () {
                    r.text();
                    r.int();
                    r.double();
                    r.text();
                    r.text();
                });
                r.int();
            });
            r.optional(function () {
                r.list(function () {
                    r.int();
                    r.optional(function () {
                        r.list(r.text);
                    });
                });
            });
            r.optional(function () {
                r.bool();
                r.double();
                r.bool();
            });
        }
        if (r.byte() === 5 || !r.bool()) {
            return null;
        }
        var body = readBody(r);
        return partial || r.p === r.length ? body : null;
    } catch (e) {
        return null;
    }
}

// The account record before the arguments ends with the email address, so a byte that can't end an email tells
// the two shapes apart.
var CLAN_WAR_ARGUMENT_BYTES = {
    305: function (bytes) {
        var n = bytes.length;
        return bytes[n - 5] === 1 && bytes[n - 2] === 0 && bytes[n - 1] === 0 ? 5 : 1;
    },
    306: 4,
    307: 8,
    308: function (bytes) {
        var n = bytes.length;
        return bytes[n - 13] === 1 && bytes[n - 14] === 0 ? 17 : 13;
    },
    309: 12,
    310: 4
};

function serviceRequestParts(body) {
    var hex = String(body || "").trim().toUpperCase();
    if (!/^(?:[0-9A-F]{2})+$/.test(hex) || hex.length < 40 || hex.substr(4, 8) !== "39F1475A") {
        return null;
    }
    var bytes = hexBytes(hex);
    var r = binaryReader(bytes);
    try {
        r.p = 10;
        var argBytes = CLAN_WAR_ARGUMENT_BYTES[r.int()];
        if (!argBytes) {
            return null;
        }
        r.optional(function () {
            r.dict(r.int, r.text);
        });
        r.text();
        r.int();
        r.int();
        r.double();
        r.double();
        r.int();
        var accountStart = r.p;
        var accountEnd = bytes.length - (typeof argBytes === "function" ? argBytes(bytes) : argBytes);
        if (bytes[accountStart] !== 1 || accountEnd <= accountStart + 1) {
            return null;
        }
        return { head: hex.slice(0, 20), extras: hex.slice(28, accountStart * 2), account: hex.slice(accountStart * 2, accountEnd * 2) };
    } catch (e) {
        return null;
    }
}

function serviceRequest(parts, op, args, withAccount) {
    return parts.head + littleEndianHex(op) + parts.extras + (withAccount ? parts.account : "") + args;
}

function fetchClanWarService(name, op, args, parse, withAccount) {
    var seen = clanWarTraffic.answers[name];
    if (seen && String(seen.body).toUpperCase().slice(-args.length) === args) {
        var data = parse(seen.text);
        if (data) {
            return Promise.resolve(data);
        }
    }
    var key = name + ":" + args;
    var cached = clanWarCache[key];
    if (cached && Date.now() - cached.at < CLAN_WAR_CACHE_MS) {
        return cached.promise;
    }
    var parts = serviceRequestParts(clanWarTraffic.request);
    if (!parts) {
        return Promise.reject(new Error("war.app hasn't sent a Clan War request yet"));
    }
    // fetch, not XMLHttpRequest, so watchClanWarTraffic doesn't take the script's own requests for war.app's.
    var promise = fetch("/Services?m=" + name + "&js=1", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: serviceRequest(parts, op, args, withAccount !== false)
    }).then(function (response) {
        if (!response.ok) {
            throw new Error("war.app answered " + response.status);
        }
        return response.text();
    }).then(function (hex) {
        var result = parse(hex);
        if (!result) {
            throw new Error("war.app's " + name + " answer couldn't be read");
        }
        return result;
    });
    clanWarCache[key] = { at: Date.now(), promise: promise };
    promise.catch(function () {
        delete clanWarCache[key];
    });
    return promise;
}

function fetchClanWar(season) {
    return fetchClanWarService("GetClanWar", 305, season ? "01" + littleEndianHex(season) : "00", parseClanWarReply);
}

function fetchClanWarGames(season, clan) {
    return fetchClanWarService("GetClanWarGames", 308, littleEndianHex(season) + "01" + littleEndianHex(clan) + littleEndianHex(0) + littleEndianHex(2147483647), parseClanWarGamesReply);
}

function fetchClanWarMap(season) {
    return fetchClanWarService("GetClanWarMap", 306, littleEndianHex(season), parseClanWarMapReply);
}

// A map's territory count only changes when its author edits it, so it's kept for good.
function fetchMapTerritoryCount(mapId) {
    var known = {};
    try {
        known = JSON.parse(localStorage.getItem(MAP_TERRITORIES_KEY)) || {};
    } catch (e) {
        known = {};
    }
    if (known[mapId] > 0) {
        return Promise.resolve(known[mapId]);
    }
    return fetchClanWarService("GetMapDetails", 73, littleEndianHex(mapId), function (hex) {
        var map = parseMapDetailsSummary(hex);
        return map && map.id === mapId ? map.territories : null;
    }, false).then(function (count) {
        known[mapId] = count;
        try {
            localStorage.setItem(MAP_TERRITORIES_KEY, JSON.stringify(known));
        } catch (e) {
        }
        return count;
    });
}

function readClanWarParts(r) {
    var parts = {};
    parts.clan = function () {
        r.int();
        r.int();
        r.date();
        var icon = r.int();
        var id = r.int();
        r.bool();
        r.optional(r.int);
        var name = r.text() || "";
        r.optional(r.date);
        r.int();
        r.text();
        return { id: id, name: name, icon: icon };
    };
    parts.standing = function () {
        var clan = r.int();
        var season = r.int();
        r.optional(r.int);
        r.int();
        var participantsToday = r.int();
        var pointsToday = r.double();
        var winsToday = r.int();
        r.double();
        var rank = r.optional(r.int);
        r.optional(r.int);
        r.text();
        var pointsBefore = r.double();
        return {
            clan: clan, season: season, participantsToday: participantsToday, pointsToday: pointsToday,
            winsToday: winsToday, rank: rank, pointsBefore: pointsBefore, points: pointsBefore + pointsToday
        };
    };
    parts.player = function () {
        var clan = r.optional(function () {
            var id = r.int();
            r.int();
            return { id: id, name: r.text() || "" };
        });
        r.optional(r.int);
        r.bool();
        r.int();
        var name = r.text() || "";
        r.int();
        r.int();
        r.int();
        return { name: name, clan: clan ? clan.id : null, clanName: clan ? clan.name : "" };
    };
    parts.players = function () {
        return r.map(r.int, function () {
            return r.optional(parts.player);
        });
    };
    parts.day = function () {
        var clan = r.int();
        r.int();
        var day = r.int();
        r.text();
        r.int();
        r.int();
        var wins = r.int();
        var points = r.double();
        r.double();
        return { clan: clan, day: day, wins: wins, points: points };
    };
    parts.game = function () {
        var gameId = r.optional(r.int);
        r.int();
        var sides = r.text();
        var day = r.optional(r.int);
        r.int();
        var template = r.int();
        r.int();
        var winner = r.optional(r.int);
        var clans = [];
        try {
            var data = JSON.parse(sides || "{}") || {};
            clans = Object.keys(data).map(function (clan) {
                return { clan: Number(clan), players: (data[clan] && data[clan].Players || []).map(Number) };
            });
        } catch (e) {
            clans = [];
        }
        return { gameId: gameId, day: day, template: template, winner: winner, clans: clans };
    };
    parts.season = function () {
        var started = r.date();
        r.int();
        var finished = r.optional(r.date);
        var id = r.int();
        r.date();
        var settings = {};
        try {
            settings = JSON.parse(r.text() || "{}") || {};
        } catch (e) {
            settings = {};
        }
        r.bool();
        r.int();
        return { id: id, started: started, finished: finished, settings: settings };
    };
    parts.gameSettings = function () {
        r.optional(r.double);
        r.bool();
        r.int();
        r.text();
        r.bool();
        r.bool();
        r.optional(r.int);
        r.double();
        r.bool();
        r.int();
        r.bool();
        r.bool();
        r.double();
        r.bool();
        r.double();
        r.int();
        r.byte();
        r.bool();
        r.bool();
        r.int();
        r.double();
        r.bool();
        r.bool();
        r.byte();
    };
    parts.template = function () {
        r.byte();
        r.text();
        r.byte();
        r.bool();
        var id = r.int();
        r.bool();
        r.int();
        r.int();
        var name = r.text() || "";
        r.optional(r.int);
        r.optional(parts.player);
        r.optional(r.int);
        r.optional(parts.gameSettings);
        r.optional(r.int);
        return { id: id, name: name };
    };
    parts.timeslotInfo = function () {
        var season = r.int();
        var at = r.date();
        var id = r.int();
        r.text();
        var started = r.bool();
        var starts = r.date();
        r.text();
        r.int();
        return { id: id, season: season, at: at, started: started, starts: starts };
    };
    parts.timeslot = function () {
        r.map(r.int, r.double);
        r.map(r.int, r.int);
        r.items(function () {
            r.int();
            r.text();
            r.map(r.int, r.int);
            r.int();
            return true;
        });
        r.map(r.int, r.int);
        parts.players();
        r.date();
        var templates = r.items(parts.template);
        var info = r.optional(parts.timeslotInfo);
        r.map(r.int, function () {
            return r.optional(function () {
                return r.list(r.int);
            });
        });
        var season = r.optional(parts.season);
        return { templates: templates, info: info, season: season };
    };
    return parts;
}

function parseClanWarReply(hex) {
    return readServiceReply(hex, 305, function (r) {
        var parts = readClanWarParts(r);
        var timeslot = r.optional(parts.timeslot);
        var standings = r.items(parts.standing);
        var clans = r.items(parts.clan);
        var firstTimeslot = r.date();
        var now = r.date();
        r.items(function () {
            r.optional(r.bool);
            r.optional(r.int);
            r.text();
            r.optional(parts.season);
            return true;
        });
        r.items(function () {
            r.optional(function () {
                return r.list(r.text);
            });
            r.optional(parts.season);
            return true;
        });
        var season = r.optional(parts.season);
        return season ? { timeslot: timeslot, standings: standings, clans: clans, firstTimeslot: firstTimeslot, now: now, season: season } : null;
    });
}

// Today's games have no day yet.
function parseClanWarGamesReply(hex) {
    return readServiceReply(hex, 308, function (r) {
        var parts = readClanWarParts(r);
        var days = r.items(parts.day);
        var games = r.items(parts.game);
        var players = parts.players();
        var templates = r.map(r.int, r.text);
        var total = r.int();
        return { days: days, games: games, players: players, templates: templates, total: total };
    });
}

function parseClanWarMapReply(hex) {
    return readServiceReply(hex, 306, function (r) {
        var parts = readClanWarParts(r);
        var clans = r.items(parts.clan);
        r.items(parts.standing);
        parts.players();
        var territories = r.items(function () {
            var clan = r.int();
            r.int();
            var at = r.date();
            r.text();
            var territory = r.int();
            return { clan: clan, at: at, territory: territory };
        });
        var season = r.optional(parts.season);
        return { clans: clans, territories: territories, season: season };
    });
}

// Only the territory count is wanted, and it comes after the bonuses, distributions and map family.
function parseMapDetailsSummary(hex) {
    return readServiceReply(hex, 73, function (r) {
        r.map(r.int, function () {
            return r.optional(function () {
                r.int();
                r.optional(function () {
                    r.skip(r.int());
                });
                r.int();
                r.text();
                r.optional(function () {
                    return r.list(r.int);
                });
                return true;
            });
        });
        r.date();
        r.int();
        r.map(r.int, function () {
            return r.optional(function () {
                var type = r.byte();
                if (type === 0) {
                    r.optional(function () {
                        return r.list(r.int);
                    });
                } else if (type === 1) {
                    r.map(r.short, r.text);
                    r.map(r.int, r.short);
                } else {
                    throw new Error("Unknown distribution " + type);
                }
                r.text();
                r.int();
                r.text();
                return true;
            });
        });
        r.optional(function () {
            r.int();
            r.date();
            r.date();
            r.optional(r.date);
            r.text();
            r.int();
            r.bool();
            r.date();
            r.text();
            r.text();
            r.int();
            r.optional(function () {
                return r.list(r.text);
            });
            r.int();
        });
        r.int();
        var id = r.int();
        r.date();
        r.optional(r.bool);
        r.byte();
        var territories = r.optional(r.int);
        return territories > 0 ? { id: id, territories: territories } : null;
    }, true);
}

// War.app's own order: by final rank once the season is over, else by points, then by clan ID.
function clanWarRanking(standings) {
    return standings.slice().sort(function (a, b) {
        if (a.rank !== null && b.rank !== null) {
            return a.rank - b.rank;
        }
        return b.points !== a.points ? b.points - a.points : a.clan - b.clan;
    }).map(function (standing, i) {
        return { clan: standing.clan, points: standing.points, place: i + 1 };
    });
}

// The first territory costs PointsPerTerritory[0] points, the next one [1] more, and so on; the last cost repeats.
function clanWarTerritoryCount(points, costs) {
    var count = 0;
    var spent = 0;
    while (Array.isArray(costs) && costs.length) {
        var cost = Number(costs[Math.min(count, costs.length - 1)]);
        if (!(cost > 0) || spent + cost > points + 1e-9 || count > 10000) {
            return { count: count, next: cost > 0 ? spent + cost : null };
        }
        spent += cost;
        count++;
    }
    return { count: 0, next: null };
}

var CLAN_WAR_REWARD_TEXTS = {
    APBoost: "AP received from levels increased by %",
    BattleProtection: "Attacks against you in Idle battles reduced by %",
    ChallengeLevelArmyCampBoost: "Army camps boosted by % in challenge levels",
    MercenaryDiscount: "Mercenaries are % cheaper",
    OreSellPrices: "Ore sell values increased by %",
    AlloySellPrices: "Alloy sell values increased by %",
    ItemSellPrices: "Item sell values increased by %",
    IncreasedCacheArmies: "Armies received from caches increased by %",
    FasterDigTimes: "Reduced artifact dig times by %",
    DecreasedArtifactCooldownTime: "Reduced artifact cooldown time by %",
    ReducedHospitalUpgradeTime: "Reduced hospital upgrade time by %",
    ReducedMortarLoadingTime: "Reduced mortar loading time by %",
    IncreasedMortarHitRate: "Increased mortar hit rate by %",
    DecreasedMortarLoadCost: "Reduced mortar load cost by %",
    PoorArtifact: "# poor artifact",
    CommonArtifact: "# common artifact",
    UncommonArtifact: "# uncommon artifact",
    RareArifact: "# rare artifact",
    EpicArtifact: "# epic artifact",
    LegendaryArtifact: "# legendary artifact",
    FreeCoins: "# coins",
    EveryPower: "# of every Idle power",
    MultiLevelPower: "# multi-level power",
    InspireMercsPower: "# inspire mercenaries power",
    TimeWarpPower: "# time warp power",
    FreeCachePower: "# free cache power",
    PlayerFlag: "A player flag"
};

function clanWarRewardText(reward) {
    var text = CLAN_WAR_REWARD_TEXTS[reward.Type];
    var value = Number(reward.Value) || 0;
    if (!text) {
        return String(reward.Type || "A reward");
    }
    if (text.indexOf("%") !== -1) {
        var days = Number(reward.Duration) || 14;
        return text.replace("%", Math.round(value * 100) + "%") + (days === 21 ? " for three weeks" : days === 14 ? " for two weeks" : " for " + days + " days");
    }
    var plural = /^# .*(artifact|power)$/.test(text) && value !== 1 && !/every/.test(text);
    return text.replace("#", value) + (plural ? "s" : "");
}

function clanWarRewards(settings) {
    var rank = [];
    var wins = [];
    (Array.isArray(settings && settings.Rewards) ? settings.Rewards : []).forEach(function (reward) {
        if (!reward || typeof reward !== "object") {
            return;
        }
        if ("RankMin" in reward) {
            var min = Number(reward.RankMin);
            var max = Number(reward.RankMax);
            var group = rank.filter(function (g) {
                return g.min === min && g.max === max;
            })[0];
            if (!group) {
                group = { min: min, max: max, texts: [] };
                rank.push(group);
            }
            group.texts.push(clanWarRewardText(reward));
        } else if (Number(reward.NumWins) > 0) {
            wins.push({ wins: Number(reward.NumWins), text: clanWarRewardText(reward) });
        }
    });
    rank.sort(function (a, b) {
        return a.min - b.min;
    });
    wins.sort(function (a, b) {
        return a.wins - b.wins;
    });
    return { rank: rank, wins: wins };
}

function clanWarPlaces(min, max) {
    return min === max ? getRankText(min) : getRankText(min) + "–" + getRankText(max);
}

// War.app's answer doesn't say which clan is yours, only the page's "Your clan has earned 14.8 points (1.6 estimated
// today plus 13.3 from previous days)" line does.
function findYourClanWarClan(standings, label, visibleClans) {
    var numbers = String(label || "").match(/(-?\d+(?:\.\d+)?) points? \((-?\d+(?:\.\d+)?) estimated today plus (-?\d+(?:\.\d+)?) from/);
    if (!numbers) {
        return null;
    }
    var near = function (value, shown) {
        return Math.abs(value - Number(shown)) < 0.0501;
    };
    var matches = standings.filter(function (s) {
        return near(s.points, numbers[1]) && near(s.pointsToday, numbers[2]) && near(s.pointsBefore, numbers[3]);
    });
    if (matches.length > 1) {
        matches = matches.filter(function (s) {
            return (visibleClans || []).indexOf(s.clan) !== -1;
        });
    }
    return matches.length === 1 ? matches[0].clan : null;
}

function clanWarResult(game, clan) {
    if (game.winner === null) {
        return "playing";
    }
    if (game.gameId === null) {
        return game.winner === clan ? "free" : "lost";
    }
    return game.winner === clan ? "won" : "lost";
}

function clanWarSide(game, clan) {
    return game.clans.filter(function (side) {
        return side.clan === clan;
    })[0] || { clan: clan, players: [] };
}

function clanWarOpponents(game, clan) {
    return game.clans.filter(function (side) {
        return side.clan !== clan;
    });
}

function clanWarNextTimeslot(first, minutes, now) {
    var step = minutes * 60000;
    return step > 0 ? first + Math.ceil((now - first) / step) * step : null;
}

function clanWarOpenTimeslot(first, minutes, joinMinutes, now) {
    var step = minutes * 60000;
    if (!(step > 0) || !(joinMinutes > 0)) {
        return null;
    }
    var last = first + Math.floor((now - first) / step) * step;
    return now < last + joinMinutes * 60000 ? { started: last, closes: last + joinMinutes * 60000 } : null;
}

function clanWarDuration(ms) {
    var minutes = Math.max(0, Math.round(ms / 60000));
    if (minutes < 1) {
        return "less than a minute";
    }
    var hours = Math.floor(minutes / 60);
    return ((hours ? hours + " h " : "") + (minutes % 60 || !hours ? minutes % 60 + " min" : "")).trim();
}

function utcMidnight(time) {
    return Math.floor(time / DAY_MS) * DAY_MS;
}

function utcDay(time) {
    return new Date(time).toISOString().slice(0, 10);
}

function clanWarProgress(input) {
    var war = input.war;
    var clan = input.clan;
    var settings = war.season.settings || {};
    var ranking = clanWarRanking(war.standings);
    var mine = ranking.filter(function (row) {
        return row.clan === clan;
    })[0];
    var standing = war.standings.filter(function (s) {
        return s.clan === clan;
    })[0];
    if (!mine || !standing) {
        return null;
    }
    var names = {};
    war.clans.forEach(function (c) {
        names[c.id] = c.name;
    });
    var at = function (place) {
        return ranking[place - 1] || null;
    };
    var rewards = clanWarRewards(settings);
    var progress = {
        season: war.season.id,
        finished: war.season.finished,
        clan: clan,
        clanName: names[clan] || "",
        place: mine.place,
        clans: ranking.length,
        points: mine.points,
        pointsToday: standing.pointsToday
    };
    var bracket = rewards.rank.filter(function (g) {
        return mine.place >= g.min && mine.place <= g.max;
    })[0] || null;
    if (bracket) {
        var below = at(bracket.max + 1);
        progress.bracket = { places: clanWarPlaces(bracket.min, bracket.max), texts: bracket.texts, belowPlace: below ? below.place : null, lead: below ? mine.points - below.points : null };
    }
    var better = rewards.rank.filter(function (g) {
        return g.max < mine.place;
    }).pop();
    if (better && at(better.max)) {
        progress.better = { places: clanWarPlaces(better.min, better.max), texts: better.texts, place: better.max, gap: at(better.max).points - mine.points };
    }
    if (input.games) {
        var wins = input.games.games.filter(function (game) {
            return game.winner === clan;
        }).length;
        var next = rewards.wins.filter(function (r) {
            return r.wins > wins;
        })[0] || null;
        progress.wins = { total: wins, today: standing.winsToday, next: next, count: rewards.wins.length };
        var today = input.games.games.filter(function (game) {
            return game.day === null;
        });
        progress.today = [];
        today.forEach(function (game) {
            clanWarSide(game, clan).players.forEach(function (player) {
                var info = input.games.players[player];
                progress.today.push({ id: player, name: info ? info.name : String(player), result: clanWarResult(game, clan) });
            });
        });
        var playerId = Number(input.playerId) || null;
        if (playerId) {
            var yours = today.filter(function (game) {
                return clanWarSide(game, clan).players.indexOf(playerId) !== -1;
            })[0];
            progress.you = yours ? {
                result: clanWarResult(yours, clan),
                template: input.games.templates[yours.template] || "",
                opponents: clanWarOpponents(yours, clan).map(function (side) {
                    return names[side.clan] || "";
                }).filter(Boolean)
            } : { result: null };
        }
    }
    var costs = settings.PointsPerTerritory;
    var held = input.map ? input.map.territories.filter(function (t) {
        return t.clan === clan;
    }).length : clanWarTerritoryCount(standing.pointsBefore, costs).count;
    var reach = clanWarTerritoryCount(mine.points, costs);
    progress.territories = { held: held, byTonight: Math.max(0, reach.count - held), nextAt: reach.next, toGo: reach.next !== null ? reach.next - mine.points : null };
    if (input.map && input.mapTerritories > 0 && !war.season.finished) {
        var taken = input.map.territories.length;
        var dayStart = utcMidnight(war.now);
        var days = Math.max(1, Math.min(3, Math.round((dayStart - utcMidnight(war.season.started)) / DAY_MS)));
        var recent = input.map.territories.filter(function (t) {
            return t.at >= dayStart - (days - 1) * DAY_MS - 60000;
        }).length;
        var left = Math.max(0, input.mapTerritories - taken);
        var pace = recent / days;
        var daysLeft = pace > 0 ? Math.ceil(left / pace) : null;
        progress.seasonEnd = { left: left, total: input.mapTerritories, pace: pace, days: days, daysLeft: daysLeft, ends: daysLeft !== null ? dayStart + daysLeft * DAY_MS : null };
    }
    if (!war.season.finished) {
        var minutes = Number(settings.MinutesBetweenTimeslots);
        var open = war.timeslot && war.timeslot.info && !war.timeslot.info.started ? war.timeslot.info : null;
        progress.timeslot = open ? { open: true, closes: open.starts } : { open: false, next: clanWarNextTimeslot(war.firstTimeslot, minutes, war.now) };
    }
    return progress;
}

function clanWarResultText(result) {
    return { won: "won", lost: "lost", free: "free win", playing: "playing" }[result] || "";
}

function renderClanWarProgress(p, now) {
    var line = function (html) {
        return '<div class="tuydCwLine">' + html + "</div>";
    };
    var pts = function (n) {
        return (Math.round(n * 10) / 10).toFixed(1);
    };
    var lines = [];
    lines.push(line("<b>" + htmlEscape(p.clanName) + "</b>: " + htmlEscape(getRankText(p.place)) + " of " + htmlEscape(p.clans) + " with " + htmlEscape(pts(p.points)) + " points" +
        (p.finished ? "" : ' <span class="tuydMuted">(' + htmlEscape(pts(p.pointsToday)) + " today)</span>")));
    if (p.bracket) {
        lines.push(line("Rank rewards for " + htmlEscape(p.bracket.places) + ": " + htmlEscape(p.bracket.texts.join(", ")) + "." +
            (p.bracket.belowPlace && !p.finished ? ' <span class="tuydMuted">' + htmlEscape(getRankText(p.bracket.belowPlace)) + " is " + htmlEscape(pts(p.bracket.lead)) + " points behind.</span>" : "")));
    }
    if (p.better && !p.finished) {
        lines.push(line("Next up, " + htmlEscape(p.better.places) + ": " + htmlEscape(p.better.texts.join(", ")) + '. <span class="tuydMuted">' +
            htmlEscape(pts(p.better.gap)) + " points short of " + htmlEscape(getRankText(p.better.place)) + ".</span>"));
    }
    if (p.wins) {
        lines.push(line(htmlEscape(p.wins.total) + " win" + (p.wins.total === 1 ? "" : "s") + " this season" + (p.finished ? "" : " (" + htmlEscape(p.wins.today) + " today)") + ". " +
            (p.wins.next ? "Next win reward at " + htmlEscape(p.wins.next.wins) + ": " + htmlEscape(p.wins.next.text) + ' <span class="tuydMuted">(' + htmlEscape(p.wins.next.wins - p.wins.total) + " more)</span>"
                : p.wins.count ? "All " + htmlEscape(p.wins.count) + " win rewards earned." : "")));
    }
    var t = p.territories;
    lines.push(line(htmlEscape(t.held) + " territor" + (t.held === 1 ? "y" : "ies") + " on the map. " + (p.finished ? "" :
        t.byTonight ? htmlEscape(t.byTonight) + " more at midnight UTC if today's estimate holds."
            : t.nextAt !== null ? 'Next at ' + htmlEscape(pts(t.nextAt)) + ' points <span class="tuydMuted">(' + htmlEscape(pts(t.toGo)) + " more)</span>." : "")));
    var end = p.seasonEnd;
    if (end) {
        lines.push(line(htmlEscape(end.left) + " of " + htmlEscape(end.total) + " territories left. " + (end.ends !== null ? "At the pace of the last " + (end.days === 1 ? "day" : htmlEscape(end.days) + " days") +
            " (" + htmlEscape(Math.round(end.pace)) + " a day) the season ends in about " + htmlEscape(end.daysLeft) + " day" + (end.daysLeft === 1 ? "" : "s") +
            ', around ' + htmlEscape(new Date(end.ends).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })) + "." : "No territories were given out lately.")));
    }
    if (p.you) {
        if (p.you.result) {
            lines.push(line("You played today: " + htmlEscape(clanWarResultText(p.you.result)) + (p.you.opponents.length ? " vs " + htmlEscape(p.you.opponents.join(", ")) : "") +
                (p.you.template ? " on " + htmlEscape(p.you.template) : "") + "."));
        } else if (p.timeslot) {
            lines.push(line("You haven't played today. " + (p.timeslot.open ? "A timeslot is open: join it above." :
                'Next timeslot in <span class="tuydCwCountdown" data-at="' + htmlEscape(p.timeslot.next) + '">' + htmlEscape(clanWarDuration(p.timeslot.next - now)) + "</span>.")));
        }
    }
    if (p.today && p.today.length) {
        var won = p.today.filter(function (x) {
            return x.result === "won" || x.result === "free";
        }).length;
        lines.push(line("Today: " + p.today.map(function (x) {
            return htmlEscape(x.name) + ' <span class="tuydCw' + (x.result === "won" || x.result === "free" ? "Won" : x.result === "lost" ? "Lost" : "Playing") + '">' + htmlEscape(clanWarResultText(x.result)) + "</span>";
        }).join(" · ") + ' <span class="tuydMuted">(' + htmlEscape(p.today.length) + " played, " + htmlEscape(won) + " won)</span>"));
    }
    return '<div id="tuydClanWarProgress" class="tuydCommunityPanel"><h3>Your clan in Season ' + htmlEscape(p.season) + '</h3><div class="communityLaddersRows">' + lines.join("") +
        '</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

function clanWarPlayerStats(games, clan) {
    var stats = {};
    games.games.forEach(function (game) {
        var result = clanWarResult(game, clan);
        clanWarSide(game, clan).players.forEach(function (player) {
            var s = stats[player] || (stats[player] = { wins: 0, finished: 0, today: null });
            if (result !== "playing") {
                s.finished++;
                s.wins += result === "lost" ? 0 : 1;
            }
            if (game.day === null) {
                s.today = result;
            }
        });
    });
    return stats;
}

function clanWarPlayerNote(stats) {
    if (!stats) {
        return [];
    }
    var rate = stats.finished ? Math.round(100 * stats.wins / stats.finished) + "% won" : "";
    var today = stats.today ? "today: " + clanWarResultText(stats.today) : "";
    return [rate, today].filter(Boolean);
}

// Free wins weren't played, so they don't count here, though war.app's win totals include them.
function clanWarRecords(games, clan, playerId) {
    var templates = {};
    var opponents = {};
    var me = Number(playerId) || null;
    var add = function (record, result) {
        if (result === "lost") {
            record.lost++;
        } else {
            record.won++;
        }
    };
    games.games.forEach(function (game) {
        var result = clanWarResult(game, clan);
        if (result === "playing" || game.gameId === null) {
            return;
        }
        var name = games.templates[game.template] || "Template " + game.template;
        var t = templates[name] || (templates[name] = { name: name, won: 0, lost: 0, you: { won: 0, lost: 0 } });
        add(t, result);
        if (me && clanWarSide(game, clan).players.indexOf(me) !== -1) {
            add(t.you, result);
        }
        clanWarOpponents(game, clan).forEach(function (side) {
            var who = side.players.map(function (player) {
                return games.players[player];
            }).filter(function (info) {
                return info && info.clan === side.clan && info.clanName;
            })[0];
            var o = opponents[side.clan] || (opponents[side.clan] = { name: "Clan " + side.clan, won: 0, lost: 0 });
            if (who) {
                o.name = who.clanName;
            }
            add(o, result);
        });
    });
    var order = function (a, b) {
        return b.won + b.lost - (a.won + a.lost) || b.won - a.won || (a.name < b.name ? -1 : 1);
    };
    return {
        templates: Object.keys(templates).map(function (k) {
            return templates[k];
        }).sort(order),
        opponents: Object.keys(opponents).map(function (k) {
            return opponents[k];
        }).sort(order)
    };
}

function clanWarRecordText(record) {
    var games = record.won + record.lost;
    return record.won + "–" + record.lost + (games ? " (" + Math.round(100 * record.won / games) + "%)" : "");
}

function clanWarTemplateNote(record) {
    if (!record) {
        return "This season: no games yet";
    }
    return "This season: you " + (record.you.won + record.you.lost ? record.you.won + "–" + record.you.lost : "haven't played it") + ", clan " + record.won + "–" + record.lost;
}

function renderClanWarRecords(records, season) {
    var section = function (title, rows) {
        return '<div class="communityLaddersSection"><h4>' + title + "</h4>" + (rows.length ? rows.map(function (row) {
            return '<div class="tuydCwRecordRow"><span>' + htmlEscape(row.name) + "</span><span>" + htmlEscape(clanWarRecordText(row)) + "</span></div>";
        }).join("") : '<div class="tuydMuted">No finished games yet.</div>') + "</div>";
    };
    return '<div id="tuydClanWarRecords" class="tuydCommunityPanel"><h3>Season ' + htmlEscape(season) + ' records</h3><div class="communityLaddersRows">' +
        section("By template", records.templates) + section("By opponent", records.opponents) +
        '</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

function readClanWarSchedule() {
    try {
        var schedule = JSON.parse(localStorage.getItem(CLAN_WAR_SCHEDULE_KEY));
        return schedule && typeof schedule === "object" ? schedule : null;
    } catch (e) {
        return null;
    }
}

function saveClanWarSchedule(schedule) {
    try {
        localStorage.setItem(CLAN_WAR_SCHEDULE_KEY, JSON.stringify(schedule));
    } catch (e) {
    }
}

function clanWarCountdownText(schedule, now) {
    if (!schedule || schedule.finished || !schedule.clan || !(schedule.minutes > 0)) {
        return "";
    }
    if (schedule.playedOn === utcDay(now)) {
        return "Clan War: played today ✓";
    }
    var open = clanWarOpenTimeslot(schedule.first, schedule.minutes, schedule.join, now);
    if (open) {
        return "Clan War: timeslot open for " + clanWarDuration(open.closes - now);
    }
    return "Clan War in " + clanWarDuration(clanWarNextTimeslot(schedule.first, schedule.minutes, now) - now);
}

function clanWarUrlNumber(name) {
    var match = new RegExp("[?&]" + name + "=(\\d+)", "i").exec(location.search);
    return match ? Number(match[1]) : null;
}

function addClanWarStyles() {
    if (addClanWarStyles.done) {
        return;
    }
    addClanWarStyles.done = true;
    addCommunityLaddersStyles();
    addCSS(`
        .tuydCommunityPanel .tuydCwLine {
            margin: 0 4px 6px;
        }
        .tuydCommunityPanel .tuydCwWon {
            color: #7bd67b;
        }
        .tuydCommunityPanel .tuydCwLost {
            color: #e07b7b;
        }
        .tuydCommunityPanel .tuydCwPlaying {
            color: #e0c060;
        }
        #tuydClanWarRecords .communityLaddersSection + .communityLaddersSection {
            margin-top: 10px;
        }
        .tuydCommunityPanel .tuydCwRecordRow {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 0 4px 2px;
        }
        .tuydCwPlayerNote {
            position: absolute;
            left: 460px;
            top: -30px;
            height: 26px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            color: #babbbb;
            font-size: 11px;
            line-height: 13px;
            white-space: nowrap;
            pointer-events: none;
        }
        /* War.app's name label is as wide as its text, up to 231px where it wraps, so the note keeps clear of that
           width rather than following the label's right edge into the lines below short names. */
        .tuydCwTemplateNote {
            position: absolute;
            left: 247px;
            top: 2px;
            width: 220px;
            color: #e0c060;
            font-size: 13px;
            line-height: 17px;
            white-space: normal;
        }
        #tuydClanWarCountdown {
            margin-left: 10px;
            font-size: 13px;
        }
    `);
}

function hangBelowColumn(panel, dialog, scene) {
    var art = warappArt(scene);
    Object.keys(art).forEach(function (key) {
        if (art[key]) {
            panel[0].style.setProperty(key, art[key]);
        }
    });
    dialog.parent().append(panel);
    placeBelowColumn(panel, dialog, scene);
    if (window.ResizeObserver) {
        new ResizeObserver(function () {
            placeBelowColumn(panel, dialog, scene);
        }).observe(dialog[0]);
    }
}

function tickClanWarCountdowns() {
    $(".tuydCwCountdown").each(function () {
        var at = Number($(this).attr("data-at"));
        if (at) {
            $(this).text(clanWarDuration(at - Date.now()));
        }
    });
}

function setupClanWarProgress() {
    var shown = null;
    var loading = null;
    var check = function () {
        var scene = ujsElement("ClanWarScene");
        if (!scene) {
            shown = null;
            return;
        }
        var answer = clanWarTraffic.answers.GetClanWar;
        var war = answer && parseClanWarReply(answer.text);
        var label = $(ujsElement("YourClanStatusLabel", "_tmp")).text();
        if (!war || !label) {
            return;
        }
        var visible = $(scene).find("a[href*='ClanID=']").map(function () {
            return Number((/ClanID=(\d+)/.exec(this.getAttribute("href")) || [])[1]);
        }).get();
        var clan = findYourClanWarClan(war.standings, label, visible);
        var key = answer.text.length + ":" + war.season.id + ":" + clan;
        if (!clan || shown === key && $("#tuydClanWarProgress").length || loading === key) {
            return;
        }
        loading = key;
        var settings = war.season.settings || {};
        var schedule = readClanWarSchedule() || {};
        var fresh = { season: war.season.id, clan: clan, first: war.firstTimeslot, minutes: Number(settings.MinutesBetweenTimeslots) || 0, join: Number(settings.MinutesTimeslotsTakeToStart) || 0, finished: !!war.season.finished };
        fresh.playedOn = schedule.season === fresh.season && schedule.clan === clan ? schedule.playedOn : null;
        saveClanWarSchedule(fresh);
        var quietly = function (promise) {
            return promise.then(null, function (e) {
                log("Clan War progress: " + e.message);
                return null;
            });
        };
        Promise.all([
            signedInPlayerId().then(gamePlayerId, function () {
                return null;
            }),
            quietly(fetchClanWarGames(war.season.id, clan)),
            quietly(fetchClanWarMap(war.season.id)),
            settings.MapID ? quietly(fetchMapTerritoryCount(Number(settings.MapID))) : null
        ]).then(function (got) {
            loading = null;
            var progress = clanWarProgress({ war: war, clan: clan, playerId: got[0], games: got[1], map: got[2], mapTerritories: got[3] });
            var dialog = $(scene).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").first();
            if (!progress || !dialog.length || !ujsElement("ClanWarScene")) {
                return;
            }
            if (progress.you && progress.you.result) {
                fresh.playedOn = utcDay(war.now);
                saveClanWarSchedule(fresh);
            }
            addClanWarStyles();
            $("#tuydClanWarProgress").remove();
            hangBelowColumn($(renderClanWarProgress(progress, Date.now())), dialog, scene);
            shown = key;
        });
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("tuyd:clanWarAnswer", check);
    setInterval(tickClanWarCountdowns, 30 * 1000);
}

function setupClanWarPlayers() {
    var stats = {};
    var loading = {};
    var check = function () {
        var scene = ujsElement("ClanWarPlayersScene");
        var season = clanWarUrlNumber("ID");
        var clan = clanWarUrlNumber("PlayersFromClan");
        if (!scene || !season || !clan) {
            return;
        }
        var key = season + ":" + clan;
        if (!stats[key]) {
            if (!loading[key]) {
                loading[key] = true;
                fetchClanWarGames(season, clan).then(function (games) {
                    stats[key] = clanWarPlayerStats(games, clan);
                    check();
                }, function (e) {
                    log("Clan War players: " + e.message);
                });
            }
            return;
        }
        addClanWarStyles();
        $(scene).find("[id^='ujs_hamburger']").filter(function () {
            return /^ujs_hamburger(?:_\d+)?$/.test(this.id) && !$(this).children(".tuydCwPlayerNote").length;
        }).each(function () {
            var link = $(this).find("a[href*='Profile?p=']").attr("href") || "";
            var lines = clanWarPlayerNote(stats[key][Number(gamePlayerId(extractPlayerId(link)))]);
            if (lines.length) {
                $('<div class="tuydCwPlayerNote"></div>').append(lines.map(function (line) {
                    return $("<div></div>").text(line);
                })).appendTo(this);
            }
        });
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();
}

function setupClanWarTimeslotRecords() {
    var records = {};
    var loading = {};
    var check = function () {
        var scene = ujsElement("ClanWarTimeslotScene");
        var season = clanWarUrlNumber("ID");
        var schedule = readClanWarSchedule();
        if (!scene || !season || !schedule || schedule.season !== season || !schedule.clan) {
            return;
        }
        var key = season + ":" + schedule.clan;
        if (!records[key]) {
            if (!loading[key]) {
                loading[key] = true;
                Promise.all([fetchClanWarGames(season, schedule.clan), signedInPlayerId().then(gamePlayerId, function () {
                    return null;
                })]).then(function (got) {
                    var byName = {};
                    clanWarRecords(got[0], schedule.clan, got[1]).templates.forEach(function (t) {
                        byName[t.name] = t;
                    });
                    records[key] = byName;
                    check();
                }, function (e) {
                    log("Clan War timeslot records: " + e.message);
                });
            }
            return;
        }
        addClanWarStyles();
        $(scene).find("[id^='ujs_TemplateNameLabel']").filter(function () {
            return /^ujs_TemplateNameLabel(?:_\d+)?_tmp$/.test(this.id) && !$(this).find(".tuydCwTemplateNote").length;
        }).each(function () {
            var name = $(this).clone().children(".tuydCwTemplateNote").remove().end().text().trim();
            $('<span class="tuydCwTemplateNote"></span>').text(clanWarTemplateNote(records[key][name])).appendTo(this);
        });
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();
}

function setupClanWarClanRecords() {
    var records = {};
    var loading = {};
    var check = function () {
        var scene = ujsElement("ClanWarClanScene");
        var season = clanWarUrlNumber("ID");
        var clan = clanWarUrlNumber("ClanID");
        if (!scene || !season || !clan) {
            return;
        }
        var key = season + ":" + clan;
        if ($("#tuydClanWarRecords").attr("data-key") === key) {
            return;
        }
        if (!records[key]) {
            if (!loading[key]) {
                loading[key] = true;
                fetchClanWarGames(season, clan).then(function (games) {
                    records[key] = clanWarRecords(games, clan, null);
                    check();
                }, function (e) {
                    log("Clan War clan records: " + e.message);
                });
            }
            return;
        }
        var dialog = $(scene).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").first();
        if (!dialog.length) {
            return;
        }
        addClanWarStyles();
        $("#tuydClanWarRecords").remove();
        hangBelowColumn($(renderClanWarRecords(records[key], season)).attr("data-key", key), dialog, scene);
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();
}

function setupClanWarCountdown() {
    var update = function () {
        var text = clanWarCountdownText(readClanWarSchedule(), Date.now());
        var link = $("#tuydClanWarCountdown");
        if (!text) {
            link.remove();
            return;
        }
        if (!link.length) {
            var count = $("#NumberOfMyGamesLabel");
            if (!count.length) {
                return;
            }
            addClanWarStyles();
            link = $('<a id="tuydClanWarCountdown" href="/Clans/War" title="Clan War (Muli\'s Userscript)"></a>').insertAfter(count);
        }
        link.text(text);
    };
    update();
    setInterval(update, 30 * 1000);
    $(document).on("tuyd:gamesRefreshed", update);
}

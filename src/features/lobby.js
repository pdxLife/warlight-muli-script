// Per kind of game: the profile's Play Speed section, which of its turn-time ranges count as slow, and the
// limit box's unit and default.
var LOBBY_PACE_KINDS = {
    multiDay: { heading: /Multi-Day Games/i, slow: /1 day - 1 week|>\s*1 week/i, over: "over a day", overLong: "took over a day", unit: "h", unitHours: 1, fallback: 24, step: 1, key: "tidyUpYourDashboard.lobbyPaceHours" },
    realTime: { heading: /Real-Time Games/i, slow: /2 - 5 mins|5 - 10 mins|>\s*10 mins/i, over: "over 2 min", overLong: "took over 2 minutes", unit: "min", unitHours: 1 / 60, fallback: 3, step: 0.5, key: "tidyUpYourDashboard.lobbyPaceMinutesRealTime" }
};

function durationHours(text) {
    var units = { day: 24, hour: 1, minute: 1 / 60, second: 1 / 3600 };
    var total = 0;
    var found = false;
    String(text || "").replace(/(\d+(?:\.\d+)?)\s*(day|hour|minute|second)s?/gi, function (all, amount, unit) {
        total += parseFloat(amount) * units[unit.toLowerCase()];
        found = true;
    });
    return found ? total : null;
}

function shortDuration(text) {
    return String(text || "").replace(/(\d+)\s*days?/gi, "$1d").replace(/(\d+)\s*hours?/gi, "$1h").replace(/(\d+)\s*minutes?/gi, "$1m").replace(/(\d+)\s*seconds?/gi, "$1s").trim();
}

// What a profile page says about a player's pace: games in progress, boot rate, and the Play Speed
// sections for multi-day and real-time games (an average, and a bar per range whose `title` is the
// number of turns).
function parseProfilePace(doc) {
    var text = doc.body ? doc.body.textContent.replace(/\s+/g, " ") : "";
    var games = /Currently in ([\d,]+) multi-day games?/i.exec(text);
    var booted = /Booted [\d,]+ times? \((\d+)% of their last/i.exec(text);
    var section = function (kind) {
        var average = null;
        var ranges = [];
        var heading = $(doc).find("h5").filter(function () {
            return kind.heading.test($(this).text());
        })[0];
        if (heading) {
            var node = heading.nextSibling;
            var between = "";
            for (; node && node.nodeName !== "TABLE" && node.nodeName !== "H5"; node = node.nextSibling) {
                between += node.textContent;
            }
            var match = /Average:\s*(.*\S)/i.exec(between.replace(/\s+/g, " "));
            average = match ? match[1] : null;
            if (node && node.nodeName === "TABLE") {
                $(node).find("tr").each(function () {
                    var cells = $(this).children("td");
                    var bar = cells.last().children("div[title]");
                    if (cells.length === 2 && bar.length) {
                        ranges.push({ label: cells.first().text().replace(/\u00a0/g, " ").trim(), turns: parseInt(bar.attr("title"), 10) || 0 });
                    }
                });
            }
        }
        var count = function (list) {
            return list.reduce(function (sum, range) {
                return sum + range.turns;
            }, 0);
        };
        var turns = count(ranges);
        var slow = count(ranges.filter(function (range) {
            return kind.slow.test(range.label);
        }));
        return { average: average, averageHours: durationHours(average), slowPercent: turns ? Math.round(slow / turns * 100) : null };
    };
    return {
        games: games ? Number(games[1].replace(/,/g, "")) : null,
        bootedPercent: booted ? Number(booted[1]) : null,
        multiDay: section(LOBBY_PACE_KINDS.multiDay),
        realTime: section(LOBBY_PACE_KINDS.realTime)
    };
}

// A boot time of up to an hour is a real-time game; anything longer is multi-day (Past Games uses the same rule).
function lobbyGameKind(bootText) {
    var hours = durationHours(String(bootText || "").split(".")[0]);
    return hours !== null && hours <= 1 ? "realTime" : "multiDay";
}

// The multi-day games count is only shown in multi-day lobbies; real-time lobbies show real-time turns.
function lobbyPaceText(pace, kindName, long) {
    var kind = LOBBY_PACE_KINDS[kindName];
    var speed = pace[kindName];
    var label = kindName === "realTime" ? "real-time" : "multi-day";
    var parts = [];
    if (kindName === "multiDay" && pace.games !== null) {
        parts.push(long ? "in " + pace.games + " multi-day game" + (pace.games === 1 ? "" : "s") + ", per their profile" : "in " + pace.games + " game" + (pace.games === 1 ? "" : "s"));
    }
    if (speed.averageHours !== null) {
        parts.push(long ? "average " + label + " turn " + speed.average : "avg turn " + shortDuration(speed.average));
    }
    if (speed.slowPercent !== null) {
        parts.push(speed.slowPercent + "% " + (long ? "of their " + label + " turns " + kind.overLong : kind.over));
    }
    if (pace.bootedPercent !== null) {
        parts.push(long ? "booted from " + pace.bootedPercent + "% of their recent games" : "booted " + pace.bootedPercent + "%");
    }
    return parts.length ? parts.join(" · ") : "no " + label + " turns yet";
}

// war.app's game data has each player's name, ID and a 4-digit token; war.app builds profile links as
// the token's first two digits + ID + its last two. The data's field names are minified and change
// between war.app updates, so players are found by the names the lobby shows, and each possible link
// is tried largest ID first (the level is a small number too).
function lobbyProfileCandidates(root, names) {
    var found = {};
    var seen = new Set();
    var queue = [root];
    for (var visited = 0; queue.length && visited < 5000; visited++) {
        var object = queue.shift();
        if (!object || typeof object !== "object" || seen.has(object)) {
            continue;
        }
        seen.add(object);
        var keys = Object.keys(object);
        if (keys.length > 2000) {
            continue;
        }
        var name = null;
        var numbers = [];
        keys.forEach(function (key) {
            var value = object[key];
            if (typeof value === "string" && names.indexOf(value) !== -1) {
                name = value;
            } else if (typeof value === "number" && value > 0 && Math.floor(value) === value) {
                numbers.push(value);
            } else if (value && typeof value === "object") {
                queue.push(value);
            }
        });
        if (name) {
            var links = found[name] || (found[name] = []);
            numbers.filter(function (token) {
                return token >= 1000 && token <= 9999;
            }).forEach(function (token) {
                numbers.filter(function (id) {
                    return id !== token;
                }).forEach(function (id) {
                    var link = String(token).slice(0, 2) + id + String(token).slice(2);
                    if (links.indexOf(link) === -1) {
                        links.push(link);
                    }
                });
            });
            links.sort(function (a, b) {
                return b.length - a.length || (b < a ? -1 : b > a ? 1 : 0);
            });
        }
    }
    return found;
}

var LOBBY_BOOT_PERCENT_KEY = "tidyUpYourDashboard.lobbyBootPercent";

function lobbyBootLimit() {
    try {
        var value = parseFloat(localStorage.getItem(LOBBY_BOOT_PERCENT_KEY));
        return isNaN(value) ? 10 : Math.max(0, value);
    } catch (e) {
        return 10;
    }
}

// Why a player is flagged, if at all: their average turn is over the limit, or they're booted more often.
function lobbyPaceFlags(pace, kindName, turnLimit, bootLimit) {
    var kind = LOBBY_PACE_KINDS[kindName];
    var speed = pace[kindName];
    var flags = [];
    if (turnLimit > 0 && speed.averageHours !== null && speed.averageHours > turnLimit * kind.unitHours) {
        flags.push("average turn over " + turnLimit + " " + kind.unit);
    }
    if (bootLimit > 0 && pace.bootedPercent !== null && pace.bootedPercent > bootLimit) {
        flags.push("booted over " + bootLimit + "%");
    }
    return flags;
}

function lobbyPaceLimit(kindName) {
    var kind = LOBBY_PACE_KINDS[kindName];
    try {
        var value = parseFloat(localStorage.getItem(kind.key));
        return isNaN(value) ? kind.fallback : Math.max(0, value);
    } catch (e) {
        return kind.fallback;
    }
}

// In a lobby, each player gets a line with their pace from their profile, and the host can flag slow
// players to remove them with war.app's own Add/Remove Players. Nothing here changes the game.
function setupLobbyPace() {
    addCSS(`
        .tuydPace {
            position: absolute;
            bottom: 2px;
            overflow: hidden;
            color: #9a9a9a;
            font-size: 12px;
            line-height: 20px;
            text-overflow: ellipsis;
            white-space: nowrap;
            pointer-events: auto;
        }
        .tuydPace.tuydPaceSlow {
            color: #ff6b6b;
        }
        .tuydPaceLimit {
            position: absolute;
            white-space: nowrap;
            color: #9a9a9a;
            font-size: 12px;
            pointer-events: auto;
        }
        .tuydPaceLimit input {
            width: 48px;
            margin: 0 3px;
            border: 1px solid #555;
            border-radius: 3px;
            background: #111;
            color: #eee;
            font-size: 12px;
        }
    `);
    var paces = {};
    var pending = {};
    var kindName = "multiDay";
    var chosen = {};
    var timer = null;
    var rows = function () {
        return $("[id^='ujs_PlayerRow']").filter(function () {
            return /^ujs_PlayerRow(?:_\d+)?$/.test(this.id) && shownUjsElement(this);
        }).get().map(function (row) {
            var label = $(row).find("[id^='ujs_Player'] .ujsTextInner").filter(function () {
                return $(this).text().trim();
            }).first();
            return { element: row, name: label.text().trim() };
        }).filter(function (row) {
            return row.name;
        });
    };
    var profile = function (name, links) {
        if (pending[name] || paces[name]) {
            return;
        }
        pending[name] = true;
        var tryLink = function (i) {
            if (i >= links.length) {
                paces[name] = { missing: true };
                schedule();
                return;
            }
            $.ajax({ url: "/Profile?p=" + links[i], dataType: "text" }).done(function (html) {
                var doc = new DOMParser().parseFromString(html, "text/html");
                // A wrong link gives war.app's page without a player; a player's page is titled "Name - War.app".
                if ((doc.title || "").indexOf(name + " - ") !== 0) {
                    tryLink(i + 1);
                    return;
                }
                paces[name] = $.extend(parseProfilePace(doc), { link: links[i] });
                schedule();
            }).fail(function () {
                log("Player pace: couldn't read " + name + "'s profile");
                paces[name] = { missing: true };
                schedule();
            });
        };
        tryLink(0);
    };
    var draw = function () {
        timer = null;
        var lobby = rows();
        if (!lobby.length) {
            return;
        }
        var boot = $(".ujsTextInner").filter(function () {
            return /^Boot time:/i.test($(this).text().trim());
        }).first().text().trim();
        kindName = lobbyGameKind(boot.replace(/^Boot time:\s*/i, ""));
        var kind = LOBBY_PACE_KINDS[kindName];
        var limit = kindName in chosen ? chosen[kindName] : lobbyPaceLimit(kindName);
        var bootLimit = "boot" in chosen ? chosen.boot : lobbyBootLimit();
        var names = lobby.map(function (row) {
            return row.name;
        });
        var unknown = names.filter(function (name) {
            return !paces[name] && !pending[name];
        });
        if (unknown.length && window.UJS_Hooks && window.UJS_Hooks.za) {
            var candidates = lobbyProfileCandidates(window.UJS_Hooks.za, unknown);
            unknown.forEach(function (name) {
                if (candidates[name] && candidates[name].length) {
                    profile(name, candidates[name]);
                }
            });
        }
        var section = $(lobby[0].element).closest("[id^='ujs_PlayersSection']");
        var box = section.children("[id$='_img']")[0] || section[0];
        var right = box ? box.getBoundingClientRect().right - 14 : 0;
        // One column for all rows, right of the widest name, level or Nudge button.
        var column = 0;
        lobby.forEach(function (row) {
            var left = row.element.getBoundingClientRect().left;
            $(row.element).find("*").not(".tuydPace, .tuydPace *").each(function () {
                var rect = this.getBoundingClientRect();
                if (rect.width) {
                    column = Math.max(column, rect.right - left);
                }
            });
        });
        lobby.forEach(function (row) {
            var pace = paces[row.name];
            var line = $(row.element).children(".tuydPace");
            if (!pace || pace.missing) {
                line.remove();
                return;
            }
            if (!line.length) {
                line = $('<a class="tuydPace" target="_blank" rel="noopener"></a>').appendTo(row.element);
            }
            var flags = lobbyPaceFlags(pace, kindName, limit, bootLimit);
            var slow = flags.length > 0;
            var left = column + 16;
            var width = right - row.element.getBoundingClientRect().left - left;
            line.attr({ href: "/Profile?p=" + pace.link, title: lobbyPaceText(pace, kindName, true) + (slow ? ". Flagged: " + flags.join(", ") : "") + " (Muli's Userscript)" })
                .text((slow ? "⚠ " : "") + lobbyPaceText(pace, kindName)).toggleClass("tuydPaceSlow", slow)
                .css({ left: left, maxWidth: Math.max(0, width), display: width < 120 ? "none" : "" });
        });
        var heading = section.find(".ujsTextInner").filter(function () {
            return $(this).text().trim() === "Players";
        }).first().parent();
        if (heading.length) {
            var control = heading.children(".tuydPaceLimit");
            if (control.attr("data-kind") !== kindName) {
                control.remove();
                control = $('<label class="tuydPaceLimit">Flag: avg turn &gt;<input type="number" min="0" data-limit="turn"> <span></span>'
                    + ' · booted &gt;<input type="number" min="0" step="1" data-limit="boot"> %</label>').attr({
                    "data-kind": kindName,
                    title: "Players whose average " + (kindName === "realTime" ? "real-time" : "multi-day") + " turn is longer, or who are booted more often, are marked ⚠ (0 = off; Muli's Userscript)"
                }).appendTo(heading);
                control.find("[data-limit=turn]").attr("step", kind.step).val(limit);
                control.find("[data-limit=boot]").val(bootLimit);
                control.find("span").text(kind.unit);
            }
            // war.app's text holders are zero-size anchors; the control goes at the right end of the heading's text box.
            var anchor = heading[0].getBoundingClientRect();
            var title = heading.children(".ujsTextInner")[0];
            if (title) {
                var box = title.getBoundingClientRect();
                control.css({ left: box.right - anchor.left - control.outerWidth() - 10, top: box.top - anchor.top + (box.height - control.outerHeight()) / 2 });
            }
        }
    };
    var schedule = function () {
        if (!timer) {
            timer = setTimeout(draw, 300);
        }
    };
    $(document).on("change input", ".tuydPaceLimit input", function () {
        var value = parseFloat(this.value);
        var boot = $(this).attr("data-limit") === "boot";
        var name = boot ? "boot" : $(this).closest(".tuydPaceLimit").attr("data-kind") || kindName;
        chosen[name] = isNaN(value) ? 0 : Math.max(0, value);
        try {
            localStorage.setItem(boot ? LOBBY_BOOT_PERCENT_KEY : LOBBY_PACE_KINDS[name].key, String(chosen[name]));
        } catch (e) {
            // A blocked localStorage only means the limit isn't remembered.
        }
        schedule();
    });
    new MutationObserver(function (mutations) {
        var ours = mutations.every(function (mutation) {
            return $(mutation.target).closest(".tuydPace, .tuydPaceLimit").length || Array.prototype.every.call(mutation.addedNodes, function (node) {
                return $(node).is(".tuydPace, .tuydPaceLimit");
            }) && mutation.addedNodes.length;
        });
        if (!ours) {
            schedule();
        }
    }).observe(document.body, { childList: true, subtree: true });
    $(window).on("resize", schedule);
    schedule();
}

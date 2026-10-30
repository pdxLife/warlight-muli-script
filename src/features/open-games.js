/**
 * Reloads all Games
 */
var OPEN_GAMES_REFRESH_KEY = "tidyUpYourDashboard.openGamesRefreshMinutes";

function openGamesRefreshMinutes() {
    try {
        var minutes = parseFloat(localStorage.getItem(OPEN_GAMES_REFRESH_KEY));
        return isNaN(minutes) ? 5 : Math.max(0, minutes);
    } catch (e) {
        return 5;
    }
}

// A refresh is due once the minutes have passed since the list was last loaded, but only while you can
// see it and aren't in the middle of reading it (pointer over the list, or the Filter panel open).
function openGamesRefreshDue(now, last, minutes, shown, busy) {
    return minutes > 0 && shown && !busy && now - last >= minutes * 60 * 1000;
}

// Open Games on the dashboard refreshes by itself every few minutes while it's on screen. A refresh by
// R, the Refresh button or coming back to the tab counts too.
function setupOpenGamesAutoRefresh() {
    var table = $("#OpenGamesTable");
    if (!table.length) {
        return;
    }
    var last = Date.now();
    var minutes = openGamesRefreshMinutes();
    $(document).on("tuyd:gamesRefreshed", function (e, selector) {
        if (selector === "#OpenGamesTable") {
            last = Date.now();
        }
    });
    var shown = function () {
        if (document.visibilityState === "hidden") {
            return false;
        }
        var rect = table[0].getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    };
    var busy = function () {
        return table.is(":hover") || $("#OpenGamesFilterPanel").is(":visible");
    };
    window.setInterval(function () {
        if (openGamesRefreshDue(Date.now(), last, minutes, shown(), busy())) {
            last = Date.now();
            log("Open Games refreshed by itself");
            refreshOpenGames(fetchDashboard());
        }
    }, 15000);
    // The choice sits in the Open Games Filter panel, which that feature draws once your filter is read.
    var tries = 0;
    var place = function () {
        var panel = $("#OpenGamesFilterPanel td").first();
        if (!panel.length) {
            if (++tries < 50) {
                setTimeout(place, 200);
            }
            return;
        }
        $('<label class="tuydOpenGamesRefresh">Refresh this list every <input type="number" min="0" step="1"> minutes while it\'s on screen (0 = off)</label>')
            .appendTo(panel).find("input").val(minutes).on("change input", function () {
                var value = parseFloat(this.value);
                minutes = isNaN(value) ? 0 : Math.max(0, value);
                try {
                    localStorage.setItem(OPEN_GAMES_REFRESH_KEY, String(minutes));
                } catch (e) {
                    // A blocked localStorage only means the choice isn't remembered.
                }
            });
    };
    place();
}

function parseFilterKeywords(text) {
    return String(text).split(",").map(function (word) {
        return word.trim().toLowerCase();
    }).filter(function (word) {
        return word.length > 0;
    });
}

function normalizeOpenGamesFilter(value) {
    value = value || {};
    var count = function (number) {
        return Math.max(0, Math.floor(Number(number)) || 0);
    };
    var known = openGameSettingIcons().concat(openGameCards()).map(function (entry) {
        return entry[0];
    });
    return {
        hideAutoGames: value.hideAutoGames === true,
        hideCoinGames: value.hideCoinGames === true,
        // Filters saved before boot times had units were in hours (minBootHours, maxBootHours).
        minBoot: Math.max(0, Number(value.minBoot !== undefined ? value.minBoot : value.minBootHours) || 0),
        minBootUnit: Object.prototype.hasOwnProperty.call(OPEN_GAMES_BOOT_UNITS, value.minBootUnit) ? value.minBootUnit : "hours",
        maxBoot: Math.max(0, Number(value.maxBoot !== undefined ? value.maxBoot : value.maxBootHours) || 0),
        maxBootUnit: Object.prototype.hasOwnProperty.call(OPEN_GAMES_BOOT_UNITS, value.maxBootUnit) ? value.maxBootUnit : "hours",
        keywords: Array.isArray(value.keywords) ? parseFilterKeywords(value.keywords.join(",")) : [],
        mapWords: Array.isArray(value.mapWords) ? parseFilterKeywords(value.mapWords.join(",")) : [],
        minPlayers: count(value.minPlayers),
        maxPlayers: count(value.maxPlayers),
        minOpenSeats: count(value.minOpenSeats),
        maxOpenSeats: count(value.maxOpenSeats),
        teamGames: ["only", "none", "ffa", "noffa", "1v1", "no1v1"].indexOf(value.teamGames) !== -1 ? value.teamGames : "",
        teamSize: ["2", "3", "4"].indexOf(value.teamSize) !== -1 ? value.teamSize : "",
        hideMuted: value.hideMuted === true,
        hideSettings: Array.isArray(value.hideSettings) ? value.hideSettings.filter(function (key) {
            return known.indexOf(key) !== -1;
        }) : []
    };
}

// war.app's game setting icons, by file name, with a short label for the filter. A "#" key also needs
// the icon's hover text to match: the fog icon says which fog level the game has.
function openGameSettingIcons() {
    return [
        ["Commerce.png", "Commerce"],
        ["LocalDeployment.png", "Local deployments"],
        ["ManualDistribution.png", "Manual distribution"],
        ["AutoDist.png", "Automatic distribution"],
        ["Cards.png", "Cards"],
        ["Wastelands.png", "Wastelands"],
        ["Fog.png", "Fog other than normal"],
        ["Fog.png#less", "Less fog than normal (no fog, light fog)", /Fog level: (?:No|Light) Fog/i],
        ["Fog.png#more", "More fog than normal (dense, heavy, complete)", /Fog level: (?:Dense|Heavy|Complete) Fog/i],
        ["NoSplit.png", "No-split mode"],
        ["OverriddenBonuses.png", "Overridden bonuses"],
        ["AttackTransferOnly.png", "Attack-only / transfer-only"],
        ["OneArmyStandGuard.png", "One army must stand guard"],
        ["AllSkill.png", "Pure skill (no luck)"],
        ["LuckModifier.png", "Changed luck or rounding"],
        ["KillRate.png", "Changed kill rates"],
        ["MinArmies.png", "Changed minimum armies per turn"],
        ["BonusArmiesPer.png", "Extra armies per territory"],
        ["ArmyCap.png", "Army cap"],
        ["Commander.png", "Commanders"],
        ["MultiAttack.png", "Multi-attack"],
        ["BankingBoot.png", "Banked boot time"],
        ["Mods.png", "Mods"],
        ["CustomScenario.png", "Custom scenario"],
        ["PracticeGame.png", "Practice game (no points)"]
    ];
}

// The cards war.app lists on a game's cards icon ("Reinforcement Card, Airlift Card, Blockade Card").
function openGameCards() {
    return ["Reinforcement", "Spy", "Emergency Blockade", "Order Priority", "Order Delay", "Airlift", "Gift", "Diplomacy", "Sanctions",
        "Reconnaissance", "Surveillance", "Blockade", "Bomb"].map(function (card) {
        return ["card:" + card, card];
    });
}

function openGameIcons(row) {
    return $(row).find("img").not(".MyGamesGameThumbnail").map(function () {
        return { file: String($(this).attr("src") || "").split(/[?#]/)[0].split("/").pop(), title: String($(this).attr("title") || "") };
    }).get();
}

function openGameHasSetting(icons, key) {
    var title = function (file) {
        var icon = icons.filter(function (candidate) {
            return candidate.file === file;
        })[0];
        return icon ? icon.title : null;
    };
    if (key.indexOf("card:") === 0) {
        var cards = title("Cards.png");
        return cards !== null && cards.split(",").some(function (card) {
            return card.trim().toLowerCase() === key.slice(5).toLowerCase() + " card";
        });
    }
    var entry = openGameSettingIcons().filter(function (candidate) {
        return candidate[0] === key;
    })[0];
    var found = title(key.split("#")[0]);
    return found !== null && (!entry || !entry[2] || entry[2].test(found));
}

// A team game's team size: war.app says it for random teams ("random teams of 2") and draws set teams as
// groups of seats with a gap between them (two &nbsp;). null when it can't tell.
function openGameTeamSize(row, icons) {
    var team = icons.filter(function (icon) {
        return icon.file === "Teams.png";
    })[0];
    if (!team) {
        return null;
    }
    var random = /random teams of (\d+)/i.exec(team.title);
    if (random) {
        return Number(random[1]);
    }
    var groups = [0];
    $(row).find(".MyGamesGameBoxesRow").first().contents().each(function () {
        if (this.nodeType === 1 && $(this).hasClass("MyGamesGameBox")) {
            groups[groups.length - 1]++;
        } else if (this.nodeType === 3 && /\u00a0/.test(this.nodeValue) && groups[groups.length - 1] > 0) {
            groups.push(0);
        }
    });
    groups = groups.filter(Boolean);
    return groups.length > 1 ? Math.max.apply(null, groups) : null;
}

// The players who joined, by their seat's hover text ("Name", or "Name: Waiting for this player…").
function openGamePlayers(row) {
    return $(row).find(".MyGamesGameBox").filter(function () {
        return !$(this).find(".MyGamesGameBoxOpenSeat").length;
    }).map(function () {
        return String($(this).attr("title") || "").replace(/: Waiting for this player.*$/i, "").trim();
    }).get().filter(function (name) {
        return name && name !== "Open Seat";
    });
}

function nameHasKeyword(name, keywords) {
    return keywords.some(function (keyword) {
        var escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp("(?:^|[^\\p{L}\\p{N}])" + escaped + "(?:$|[^\\p{L}\\p{N}])", "iu").test(name);
    });
}

// extra: what the filter loads on the side, the muted players and war.app's map names by thumbnail folder.
function openGameIsFiltered(row, filter, extra) {
    extra = extra || {};
    var link = $(row).find("td").eq(1).find("a").first();
    if (filter.hideAutoGames && /[?&]AutoGameID=/i.test(link.attr("href") || "")) {
        return true;
    }
    if (filter.hideCoinGames && /Entry fee:/i.test($(row).find("font").text())) {
        return true;
    }
    var bootMinutes = parseBootTime($(row).find(".BootTimeLabel").text());
    var minBoot = filter.minBoot * OPEN_GAMES_BOOT_UNITS[filter.minBootUnit];
    var maxBoot = filter.maxBoot * OPEN_GAMES_BOOT_UNITS[filter.maxBootUnit];
    if (bootMinutes !== null && ((minBoot > 0 && bootMinutes < minBoot) || (maxBoot > 0 && bootMinutes > maxBoot))) {
        return true;
    }
    var seats = $(row).find(".MyGamesGameBox").length;
    if (seats > 0 && ((filter.minPlayers > 0 && seats < filter.minPlayers) || (filter.maxPlayers > 0 && seats > filter.maxPlayers))) {
        return true;
    }
    var open = $(row).find(".MyGamesGameBoxOpenSeat").length;
    if (seats > 0 && ((filter.minOpenSeats > 0 && open < filter.minOpenSeats) || (filter.maxOpenSeats > 0 && open > filter.maxOpenSeats))) {
        return true;
    }
    var icons = openGameIcons(row);
    var size = openGameTeamSize(row, icons);
    // Teams of one player (often a 1v1 made a team game for a chat that stays the same) aren't played in
    // teams: such a game counts as 1 v 1 or FFA. Two seats can only be two teams of one.
    var teamGame = icons.some(function (icon) {
        return icon.file === "Teams.png";
    }) && seats !== 2 && size !== 1;
    if ((filter.teamGames === "only" && !teamGame) || (filter.teamGames === "none" && teamGame)) {
        return true;
    }
    // Free-for-all: three or more seats and no teams. Without seat boxes there's no telling, so it stays.
    var ffa = seats >= 3 && !teamGame;
    if (seats > 0 && ((filter.teamGames === "ffa" && !ffa) || (filter.teamGames === "noffa" && ffa))) {
        return true;
    }
    var duel = seats === 2 && !teamGame;
    if (seats > 0 && ((filter.teamGames === "1v1" && !duel) || (filter.teamGames === "no1v1" && duel))) {
        return true;
    }
    if (filter.teamSize) {
        if (size === null || (filter.teamSize === "4" ? size < 4 : size !== Number(filter.teamSize))) {
            return true;
        }
    }
    if (filter.hideSettings.some(function (key) {
        return openGameHasSetting(icons, key);
    })) {
        return true;
    }
    if (filter.hideMuted && extra.muted && extra.muted.length) {
        var muted = extra.muted.map(function (name) {
            return name.toLowerCase();
        });
        if (openGamePlayers(row).some(function (name) {
            return muted.indexOf(name.toLowerCase()) !== -1;
        })) {
            return true;
        }
    }
    if (filter.mapWords.length && extra.maps) {
        var folder = /\/Thumbs\/Maps\/(\d+)\//.exec($(row).find("img.MyGamesGameThumbnail").attr("src") || "");
        var map = folder && extra.maps[folder[1]];
        if (map && nameHasKeyword(map.name, filter.mapWords)) {
            return true;
        }
    }
    return nameHasKeyword(link.text(), filter.keywords);
}

function applyOpenGamesFilter(filter, extra) {
    var rows = $("#OpenGamesTable tr.GameRow");
    var filtered = rows.filter(function () {
        return openGameIsFiltered(this, filter, extra);
    });
    rows.not(filtered).removeClass("tuyd-filtered");
    filtered.addClass("tuyd-filtered");
    $("#OpenGamesFilterCount").text(filtered.length > 0 ? filtered.length + " hidden" : "");
}

function readOpenGamesFilterForm(panel) {
    return normalizeOpenGamesFilter({
        hideAutoGames: panel.find("[name=hideAutoGames]").prop("checked"),
        hideCoinGames: panel.find("[name=hideCoinGames]").prop("checked"),
        minBoot: panel.find("[name=minBoot]").val(),
        minBootUnit: panel.find("[name=minBootUnit]").val(),
        maxBoot: panel.find("[name=maxBoot]").val(),
        maxBootUnit: panel.find("[name=maxBootUnit]").val(),
        keywords: parseFilterKeywords(panel.find("[name=keywords]").val()),
        mapWords: parseFilterKeywords(panel.find("[name=mapWords]").val()),
        minPlayers: panel.find("[name=minPlayers]").val(),
        maxPlayers: panel.find("[name=maxPlayers]").val(),
        minOpenSeats: panel.find("[name=minOpenSeats]").val(),
        maxOpenSeats: panel.find("[name=maxOpenSeats]").val(),
        teamGames: panel.find("[name=teamGames]").val(),
        teamSize: panel.find("[name=teamSize]").val(),
        hideMuted: panel.find("[name=hideMuted]").prop("checked"),
        hideSettings: panel.find("[name=hideSetting]:checked").map(function () {
            return this.value;
        }).get()
    });
}

function setupOpenGamesFilter() {
    var table = $("#OpenGamesTable");
    if (table.length === 0) {
        return;
    }
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "openGamesFilter", function (setting) {
        var filter = normalizeOpenGamesFilter(setting && setting.value);
        var extra = { muted: [], maps: null };
        var mapsAsked = false;
        var apply = function () {
            if (filter.mapWords.length && !mapsAsked) {
                mapsAsked = true;
                loadMapNames(function (maps) {
                    extra.maps = maps;
                    applyOpenGamesFilter(filter, extra);
                });
            }
            applyOpenGamesFilter(filter, extra);
        };
        addCSS(`
            #OpenGamesTable tr.tuyd-filtered { display: none; }
            #OpenGamesFilterCount { color: #999; letter-spacing: 0; margin-left: 4px; }
            #OpenGamesFilterPanel td { padding: 8px 10px; }
            #OpenGamesFilterPanel label { display: block; margin: 0 0 6px; font-weight: normal; }
            #OpenGamesFilterPanel input[type=number] { width: 60px; }
            #OpenGamesFilterPanel input[type=text] { width: 260px; max-width: 100%; }
            #OpenGamesFilterPanel input[type=number], #OpenGamesFilterPanel input[type=text], #OpenGamesFilterPanel select { background: #222; color: #ddd; border: 1px solid #555; padding: 1px 4px; }
            #OpenGamesFilterPanel .tuydFilterSettings { display: flex; flex-wrap: wrap; gap: 0 16px; margin: 2px 0 6px 18px; }
            #OpenGamesFilterPanel .tuydFilterSettings label { margin-bottom: 2px; }
            #OpenGamesFilterPanel details { margin: 0 0 6px; }
            #OpenGamesFilterPanel summary { cursor: pointer; width: max-content; }
            #OpenGamesFilterPanel summary .tuydFilterTicked { color: #e0c060; margin-left: 4px; }
            #OpenGamesFilterLink .tuydFilterArrow { display: inline-block; margin-left: 3px; font-size: 10px; transition: transform 0.15s; }
            #OpenGamesFilterLink.tuydFilterOpen .tuydFilterArrow { transform: rotate(90deg); }
        `);
        var filterLink = ` | <a href="#" id="OpenGamesFilterLink" style="letter-spacing: 0px" aria-expanded="false">Filter<span class="tuydFilterArrow">▶</span></a><span id="OpenGamesFilterCount"></span>`;
        var codeLink = table.find("thead a[href*='GameInviteCode']").first();
        if (codeLink.length) {
            codeLink.after(filterLink);
        } else {
            table.find("thead h2").parent().append(filterLink);
        }
        var bootUnits = function (name) {
            return '<select name="' + name + '">' + Object.keys(OPEN_GAMES_BOOT_UNITS).map(function (unit) {
                return '<option value="' + unit + '">' + unit + '</option>';
            }).join("") + "</select>";
        };
        var checkboxes = function (entries) {
            return entries.map(function (entry) {
                return '<label><input type="checkbox" name="hideSetting" value="' + htmlEscape(entry[0]) + '"> ' + htmlEscape(entry[1]) + '</label>';
            }).join("");
        };
        var panel = $(`
            <tr id="OpenGamesFilterPanel" style="display: none"><td colspan="2">
                <label><input type="checkbox" name="hideAutoGames"> Hide Auto Games</label>
                <label><input type="checkbox" name="hideCoinGames"> Hide coin games</label>
                <label>Hide games with a boot time under <input type="number" name="minBoot" min="0" step="1"> ${bootUnits("minBootUnit")} or over <input type="number" name="maxBoot" min="0" step="1"> ${bootUnits("maxBootUnit")} (0 = off)</label>
                <label>Hide games whose name contains any of these words <input type="text" name="keywords" placeholder="rp, diplo"> (separate with commas)</label>
                <label>Hide maps whose name contains any of these words <input type="text" name="mapWords" placeholder="earth, europe"> (separate with commas)</label>
                <label>Players: from <input type="number" name="minPlayers" min="0" step="1"> to <input type="number" name="maxPlayers" min="0" step="1"> seats (0 = any)</label>
                <label>Open seats left: from <input type="number" name="minOpenSeats" min="0" step="1"> to <input type="number" name="maxOpenSeats" min="0" step="1"> (0 = any; 1 to 1 for games about to start)</label>
                <label>Game type: <select name="teamGames"><option value="">show all</option><option value="only">show only team games</option><option value="none">hide team games</option><option value="1v1">show only 1 v 1</option><option value="no1v1">hide 1 v 1</option><option value="ffa">show only FFA (free-for-all, 3+ players)</option><option value="noffa">hide FFA</option></select></label>
                <label>Team size: <select name="teamSize"><option value="">any</option><option value="2">show only teams of 2 (2v2, 2v2v2…)</option><option value="3">show only teams of 3</option><option value="4">show only teams of 4 or more</option></select></label>
                <label><input type="checkbox" name="hideMuted"> Hide games with a player you muted</label>
                <details data-group="settings"><summary>Hide games with these settings<span class="tuydFilterTicked"></span></summary>
                    <div class="tuydFilterSettings">${checkboxes(openGameSettingIcons())}</div></details>
                <details data-group="cards"><summary>Hide games with any of these cards<span class="tuydFilterTicked"></span></summary>
                    <div class="tuydFilterSettings">${checkboxes(openGameCards())}</div></details>
            </td></tr>`);
        panel.find("[name=hideAutoGames]").prop("checked", filter.hideAutoGames);
        panel.find("[name=hideCoinGames]").prop("checked", filter.hideCoinGames);
        panel.find("[name=minBoot]").val(filter.minBoot);
        panel.find("[name=minBootUnit]").val(filter.minBootUnit);
        panel.find("[name=maxBoot]").val(filter.maxBoot);
        panel.find("[name=maxBootUnit]").val(filter.maxBootUnit);
        panel.find("[name=keywords]").val(filter.keywords.join(", "));
        panel.find("[name=mapWords]").val(filter.mapWords.join(", "));
        panel.find("[name=minPlayers]").val(filter.minPlayers);
        panel.find("[name=maxPlayers]").val(filter.maxPlayers);
        panel.find("[name=minOpenSeats]").val(filter.minOpenSeats);
        panel.find("[name=maxOpenSeats]").val(filter.maxOpenSeats);
        panel.find("[name=teamGames]").val(filter.teamGames);
        panel.find("[name=teamSize]").val(filter.teamSize);
        panel.find("[name=hideMuted]").prop("checked", filter.hideMuted);
        panel.find("[name=hideSetting]").each(function () {
            this.checked = filter.hideSettings.indexOf(this.value) !== -1;
        });
        // A folded group says how many of its boxes are ticked, so nothing hidden by it goes unnoticed.
        var countTicked = function () {
            panel.find("details").each(function () {
                var ticked = $(this).find("[name=hideSetting]:checked").length;
                $(this).find(".tuydFilterTicked").text(ticked ? "(" + ticked + " ticked)" : "");
            });
        };
        countTicked();
        table.find("thead").first().append(panel);
        $("#OpenGamesFilterLink").on("click", function (e) {
            e.preventDefault();
            panel.toggle();
            $(this).toggleClass("tuydFilterOpen", panel.is(":visible")).attr("aria-expanded", String(panel.is(":visible")));
        });
        panel.find("input, select").on("change", function () {
            countTicked();
            filter = readOpenGamesFilterForm(panel);
            Database.update(Database.Table.Settings, { name: "openGamesFilter", value: filter }, undefined);
            apply();
        });
        readMutedPlayers(function (names) {
            extra.muted = names;
            apply();
        });
        apply();
        // The site re-renders rows for "Show more" and the pace buttons; changes in thead are our own.
        new MutationObserver(function (mutations) {
            var rowsChanged = mutations.some(function (mutation) {
                return $(mutation.target).closest("thead").length === 0;
            });
            if (rowsChanged) {
                applyOpenGamesFilter(filter, extra);
            }
        }).observe(table[0], { childList: true, subtree: true });
    });
}

function openGameHasPlayer(row, name) {
    return $(row).find(".MyGamesGameBox").filter(function () {
        var title = $(this).attr("title") || "";
        return title === name || title.indexOf(name + ": ") === 0;
    }).length > 0;
}

function markJoinedOpenGames(name) {
    $("#OpenGamesTable tr.GameRow").each(function () {
        $(this).toggleClass("tuyd-joined", openGameHasPlayer(this, name));
    });
}

function setupJoinedOpenGames() {
    var table = $("#OpenGamesTable");
    if (table.length === 0) {
        return;
    }
    playerDataReady.done(function (player) {
        if (!player || !player.Name) {
            return;
        }
        addCSS(`
            #OpenGamesTable tr.tuyd-joined > td { background: rgba(76, 175, 80, 0.12); }
            #OpenGamesTable tr.tuyd-joined > td:nth-child(2) > a:first-of-type::after { content: "Joined"; margin-left: 8px; padding: 1px 6px; border-radius: 3px; background: #2e7d32; color: #fff; font-size: 12px; vertical-align: middle; }
        `);
        markJoinedOpenGames(player.Name);
        new MutationObserver(function () {
            markJoinedOpenGames(player.Name);
        }).observe(table[0], { childList: true, subtree: true });
    });
}

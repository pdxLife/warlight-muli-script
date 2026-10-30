const totalPointsPerLevel = {
    1: 0,
    2: 7000,
    3: 14300,
    4: 22100,
    5: 30200,
    6: 38800,
    7: 47900,
    8: 57400,
    9: 67400,
    10: 77900,
    11: 89000,
    12: 100700,
    13: 113000,
    14: 125900,
    15: 139500,
    16: 153800,
    17: 168900,
    18: 184800,
    19: 201500,
    20: 219100,
    21: 237600,
    22: 257000,
    23: 277500,
    24: 299100,
    25: 321800,
    26: 345700,
    27: 370800,
    28: 397200,
    29: 425100,
    30: 454400,
    31: 485200,
    32: 517700,
    33: 551900,
    34: 587800,
    35: 625700,
    36: 665500,
    37: 707400,
    38: 751600,
    39: 798000,
    40: 846900,
    41: 898300,
    42: 952400,
    43: 1009400,
    44: 1069400,
    45: 1132500,
    46: 1198900,
    47: 1268800,
    48: 1342400,
    49: 1419800,
    50: 1501300,
    51: 1587100,
    52: 1677400,
    53: 1772400,
    54: 1872400,
    55: 2092800,
    56: 2571800,
    57: 3402400,
    58: 4710900,
    59: 6668800,
    60: 9509500,
    61: 13549800,
    62: 19220700,
    63: 27107600,
    64: 38006500,
    65: 52998900,
    66: 73554900,
    67: 101672700,
    68: 140067600,
    69: 192430500,
    70: 263777500
};

function displayTotalPointsEarned() {
    var $status = $(".container.px-4").first();
    var match = /level\s+(\d+)[^(]*\(([\d,]+)\s*\/\s*[\d,]+\)/i.exec($status.text());
    if (!match || totalPointsPerLevel[match[1]] === undefined) {
        return;
    }
    var totalPoints = totalPointsPerLevel[match[1]] + Number(match[2].replace(/,/g, ""));
    $status.append(`<br><span>In total, you've earned <b>${totalPoints.toLocaleString("en")}</b> points.</span>`);
}
function hideExtraBlanks() {
    var content = $(".container .my-2:first-of-type div.p-3");
    var replacement = '<br><br>';
    content.html(content.html().replace(/(<br\s*\/?>){3,}/gi, replacement))
}

function foldProfileStats() {
    addCSS(`
        h3.expander  {
            cursor: pointer;
        }
    `);
    $.each($("big").parent().contents(), function (key, val) {
        if (val.nodeType == 3) {
            $(val).wrap("<span></span>");
        }
    });
    $.each($(".container .my-2:first-of-type div.p-3 h3"), function (key, val) {
        $(val).addClass("expander");
        $(val).nextUntil("h3").wrapAll("<div class='exp'></div>")
    });
    $('h3.expander').click(function (e) {
        $(this).next().slideToggle();
    });
}

function loadPrivateNotes() {
    var url = $(".container a[href*='Discussion/Notes']").prop("href");
    if (!url) {
        return;
    }
    log("Loading private notes");
    $("#FeedbackMsg").after('<div class="profileBox" id="privateNotes"><h3>Private Notes</h3><p style="width: 285px;overflow:hidden" class="content">Loading private notes...</p></div>');
    var content = $("#privateNotes .content");
    $.ajax({ url: url, dataType: "text" }).done(function (html) {
        var note = new DOMParser().parseFromString(html, "text/html").getElementById("PostForDisplay_0");
        if (note && note.textContent.trim()) {
            $(note).find("script").remove();
            content.empty().append(document.importNode(note, true).childNodes);
        } else {
            content.text("You don't have any Private Notes.");
        }
    }).fail(function (xhr) {
        log("Error loading private notes: " + (xhr && xhr.statusText));
        content.text("Couldn't load your private notes.");
    });
}

function setupAwpProfileStats() {
    var match = location.href.match(/[?&]p=(\d+)/i);
    if (!match) {
        return;
    }
    fetchWlStats(AWP_SITE + "/api/v1/players/" + match[1] + "/stats").done(function (player) {
        if (player && player.stats && !$("#awpStats").length) {
            placeProfileBox("awpStats", renderAwpStats(player));
        }
    }).fail(function (xhr) {
        log("Error loading AWP World Tour stats: " + (xhr && xhr.statusText));
    });
}

// The boxes from other sites keep this order below the feedback area, whichever answers first.
function placeProfileBox(id, html) {
    var order = ["privateNotes", "awpStats", "customStats"];
    var above = order.slice(0, order.indexOf(id)).map(function (other) {
        return $("#" + other);
    }).filter(function (box) {
        return box.length > 0;
    }).pop();
    (above || $("#FeedbackMsg")).first().after(html);
}

function setupCustomProfileStats() {
    var match = location.href.match(/[?&]p=(\d+)/i);
    if (!match) {
        return;
    }
    fetchWlStats(CUSTOM_SITE + "/api/v1/players/" + match[1] + "/stats").done(function (player) {
        if (player && player.stats && !$("#customStats").length) {
            placeProfileBox("customStats", renderCustomStats(player, CUSTOM_SITE + "/players/" + match[1]));
        }
    }).fail(function (xhr) {
        log("Error loading custom.wl-stats.com stats: " + (xhr && xhr.statusText));
    });
}

// MTL and Seasonal Ladder rows for war.app's Ladders table on a profile (Ladder, Best Rank, Current Rank).
// MTL goes first, above war.app's ladders; the Seasonal Ladder last.
function ladderProfileRows(mtl, seasonal) {
    var rated = function (rank, rating) {
        return htmlEscape(rank ? getRankText(rank) : "Unranked") + " (" + htmlEscape(rating) + ")";
    };
    var link = function (url, text) {
        return '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(url)) + '">' + htmlEscape(text) + '</a>';
    };
    var finalPlace = function (entry) {
        var season = entry.season && entry.season.name;
        return htmlEscape(getRankText(entry.rank)) + " final place" + (season ? " (" + htmlEscape(season) + ")" : "");
    };
    var rows = [];
    if (mtl) {
        rows.push({ first: true, cells: [link(mtl.url, "MTL"), mtl.best_rank ? rated(mtl.best_rank, mtl.best_rating) : "-", rated(mtl.rank, mtl.rating)] });
    }
    var seasons = seasonal && Array.isArray(seasonal.seasons) ? seasonal.seasons.filter(Boolean) : [];
    if (seasons.length) {
        var best = seasons.filter(function (entry) {
            return entry.rank && !(entry.season && entry.season.status === "running");
        }).sort(function (a, b) {
            return a.rank - b.rank || b.rating - a.rating;
        })[0];
        var titles = seasons.filter(function (entry) {
            return entry.champion;
        }).length;
        var running = seasons.filter(function (entry) {
            return entry.season && entry.season.status === "running";
        })[0];
        rows.push({ first: false, cells: [
            link(seasonal.url, "Seasonal Ladder"),
            (best ? finalPlace(best) : "") + (titles ? " · champion" + (titles > 1 ? " ×" + titles : "") : ""),
            running ? rated(running.rank, running.rating) : "Not in this season"
        ] });
    }
    return rows;
}

// war.app's own Ladders table, or one like it before Ranked Games when the player has no war.app ladder.
function profileLaddersTable() {
    var heading = $("h3").filter(function () {
        return $(this).text().trim() === "Ladders";
    }).first();
    var table = heading.next("table");
    if (!table.length) {
        table = heading.next().find("table").first();
    }
    if (table.length) {
        return table;
    }
    var before = $("h3").filter(function () {
        return $(this).text().trim() === "Ranked Games";
    }).first();
    if (!before.length) {
        return $();
    }
    var made = $('<table cellpadding="2" class="tuydLaddersTable"><thead><tr><td>Ladder</td><td>Best Rank</td><td>Current Rank</td></tr></thead><tbody></tbody></table>');
    before.before($('<h3 class="tuydLaddersTable">Ladders</h3>'), made);
    return made;
}

function setupLadderProfileRows() {
    var match = location.href.match(/[?&]p=(\d+)/i);
    if (!match) {
        return;
    }
    $.when(
        settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/mtl/players/" + match[1], SERIES_CACHE_MS), "MTL figures"),
        settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/seasonal/players/" + match[1], SERIES_CACHE_MS), "Seasonal Ladder seasons")
    ).done(function (mtl, seasonal) {
        var rows = ladderProfileRows(mtl, seasonal);
        if (!rows.length || $(".tuydLadderRow").length) {
            return;
        }
        var body = profileLaddersTable().children("tbody").first();
        rows.forEach(function (row) {
            body[row.first ? "prepend" : "append"]('<tr class="tuydLadderRow"><td>' + row.cells.join("</td><td>") + "</td></tr>");
        });
    });
}

function renderCustomStats(player, pageUrl) {
    var stats = player.stats;
    var rows = [
        ["Games", stats.games
            ? htmlEscape(stats.games) + " (" + htmlEscape(stats.wins) + " W, " + htmlEscape(stats.losses) + " L, " + htmlEscape(stats.win_pct) + "%)"
            : "None yet"],
        ["Tournaments", htmlEscape(stats.tournaments || 0)],
        ["Titles", htmlEscape(stats.titles || 0) + (stats.finals ? " (" + htmlEscape(stats.finals) + " final" + (stats.finals == 1 ? "" : "s") + ")" : "")]
    ];
    if (stats.best_placement) {
        rows.push(["Best placement", htmlEscape(getRankText(stats.best_placement))]);
    }
    if (stats.organized) {
        rows.push(["Organized", htmlEscape(stats.organized) + " tournament" + (stats.organized == 1 ? "" : "s")]);
    }
    var formats = (Array.isArray(stats.by_format) ? stats.by_format.slice() : []).filter(function (format) {
        return format && format.played;
    }).sort(function (a, b) {
        return b.played - a.played;
    }).slice(0, 3);
    formats.forEach(function (format) {
        var lost = Number(format.played) - Number(format.won);
        rows.push([htmlEscape(format.label), htmlEscape(format.won) + "–" + htmlEscape(isNaN(lost) ? "?" : lost) + " (" + htmlEscape(format.win_pct) + "%)"]);
    });
    return '<div class="profileBox" id="customStats"><h3>Community tournaments</h3><table class="table table-sm" style="width: auto"><tbody>' +
        rows.map(function (row) {
            return '<tr><td class="text-muted">' + row[0] + '</td><td>' + row[1] + '</td></tr>';
        }).join("") +
        '</tbody></table><a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(pageUrl)) + '">More on custom.wl-stats.com</a></div>';
}

function renderAwpStats(player) {
    var stats = player.stats;
    var rank = function (value) {
        return value ? "#" + htmlEscape(value) : "Unranked";
    };
    var rows = [
        [htmlEscape(player.rank_year || "") + " race", rank(player.rank)],
        ["Last 12 months", rank(player.rank_12_months)],
        ["Games", stats.games
            ? htmlEscape(stats.games) + " (" + htmlEscape(stats.wins) + " W, " + htmlEscape(stats.losses) + " L, " + htmlEscape(stats.win_pct) + "%)"
            : "None yet"],
        ["Tournaments", htmlEscape(stats.tournaments || 0)],
        ["Titles", htmlEscape(stats.titles || 0) + (stats.finals ? " (" + htmlEscape(stats.finals) + " final" + (stats.finals == 1 ? "" : "s") + ")" : "")]
    ];
    if (stats.world_titles) {
        rows.push(["World titles", htmlEscape(stats.world_titles)]);
    }
    if (stats.best_placement) {
        rows.push(["Best placement", htmlEscape(getRankText(stats.best_placement))]);
    }
    return '<div class="profileBox" id="awpStats"><h3>AWP World Tour</h3><table class="table table-sm" style="width: auto"><tbody>' +
        rows.map(function (row) {
            return '<tr><td class="text-muted">' + row[0] + '</td><td>' + row[1] + '</td></tr>';
        }).join("") +
        '</tbody></table><a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(player.page_url)) + '">More on awp.wl-stats.com</a></div>';
}

function displayTrophies() {
    var trophies = {
        5286630035: ["Get on the immediate roadmap"]
    };

    Object.keys(trophies).forEach(playerId => {
        if (window.location.href.indexOf(playerId) != -1) {
            trophies[playerId].forEach(text => {
                $("h3:contains('Achievements ')").next().find("tbody").prepend('<tr title="Trophy awarded by Muli"> <td> <img style="vertical-align: middle" src="https://warzonecdn.com/Images/TrophyImage.png" width="21" height="20"> </td> <td>Trophy: ' + text + '</td> </tr>')
            })
        }
    });
}

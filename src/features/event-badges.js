// war.app's My Games rows each link to their game, so community games are found by war.app game ID.
function setupEventBadges() {
    var table = document.getElementById("MyGamesTable");
    if (!table) {
        return;
    }
    signedInPlayerId().done(function (playerId) {
        if (!playerId) {
            return;
        }
        var games = {};
        var observer = new MutationObserver(function () {
            apply();
        });
        var apply = function () {
            observer.disconnect();
            markEventGames(games);
            observer.observe(table, { childList: true, subtree: true });
        };
        var load = function () {
            $.when(
                settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/players/" + playerId + "/games", GAMES_CACHE_MS), "community games"),
                settleRequest(fetchWlStats(AWP_SITE + "/api/v1/players/" + playerId + "/games", GAMES_CACHE_MS), "AWP World Tour games")
            ).done(function (custom, awp) {
                games = {};
                [[custom, "custom"], [awp, "awp"]].forEach(function (source) {
                    (source[0] && Array.isArray(source[0].games) ? source[0].games : []).forEach(function (game) {
                        games[String(game.game_id)] = $.extend({}, game, { source: source[1] });
                    });
                });
                addCommunityLaddersStyles();
                apply();
            });
        };
        load();
        $(document).on("tuyd:gamesRefreshed", function (e, selector) {
            if (selector === "#MyGamesTable") {
                load();
            }
        });
    });
}

// The badge sits in the top-right corner of the game's cell, in its own element: the dashboard
// stretches every link directly in that cell over the whole cell (clickable rows). The name link
// gets room on the right so a long name wraps before running under the badge.
function markEventGames(games) {
    $("#MyGamesTable tr.GameRow").each(function () {
        var link = $(this).find("a[href*='GameID=']").last();
        var match = /[?&]GameID=(\d+)/i.exec(link.attr("href") || "");
        var game = match && (games[match[1]] || seasonalLadderGame(match[1], link.text()));
        var cell = link.closest("td");
        var corner = cell.children(".tuydEventBadgeCorner");
        if (!game) {
            corner.remove();
            cell.removeClass("tuydHasEventBadge");
            link.removeClass("tuydNameBesideBadge");
        } else if (corner.attr("data-game-id") !== match[1]) {
            corner.remove();
            cell.addClass("tuydHasEventBadge").append('<span class="tuydEventBadgeCorner" data-game-id="' + htmlEscape(match[1]) + '">' + renderEventBadge(game) + '</span>');
            link.addClass("tuydNameBesideBadge");
        }
    });
}

// custom.wl-stats.com doesn't list Seasonal Ladder games among a player's games, but war.app names them
// "Season LXXII: A vs B".
function seasonalLadderGame(gameId, name) {
    var match = /^\s*Season ([IVXLCDM]+): .+ vs .+/.exec(name);
    var number = match && romanNumber(match[1]);
    return number ? { game_id: gameId, series: "Seasonal Ladder", label: "Season " + match[1], url: CUSTOM_SITE + "/series/seasonal-ladder/seasons/" + number } : null;
}

function romanNumber(text) {
    var values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    var total = 0;
    for (var i = 0; i < text.length; i++) {
        total += values[text[i]] < (values[text[i + 1]] || 0) ? -values[text[i]] : values[text[i]];
    }
    return total;
}

// The badge shows the series' short name; the full label is its tooltip.
function renderEventBadge(game) {
    var label = String(game.label || "");
    var series = String(game.series || "");
    var full = series && label.toLowerCase().indexOf(series.toLowerCase()) === -1 ? series + " · " + label : label || series;
    var text = { "AWP World Tour": "AWP Tour" }[series] || series || label;
    return '<a class="tuydEventBadge' + (game.source === "awp" ? " tuydEventBadgeAwp" : "") + '" target="_blank" rel="noopener" data-game-id="' + htmlEscape(game.game_id) + '" href="' + htmlEscape(safeUrl(game.url)) + '" title="' + htmlEscape(full) + '">' + htmlEscape(text) + '</a>';
}

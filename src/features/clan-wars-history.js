// Clan Wars history from custom.wl-stats.com. Resolves with null when custom has none or can't be reached.
function fetchClanWarsHistory(kind, id) {
    return new Promise(function (resolve) {
        fetchWlStats(CUSTOM_SITE + "/api/v1/clan-wars/" + kind + "/" + encodeURIComponent(id)).done(resolve).fail(function (xhr) {
            log("Error loading Clan Wars history from custom.wl-stats.com: " + (xhr && xhr.statusText));
            resolve(null);
        });
    });
}

function clanWarsWonLost(won, games) {
    return won + "–" + (games - won);
}

function clanWarsPercent(won, games) {
    return games > 0 ? Math.round(100 * won / games) + "%" : "";
}

function findClanWarsTemplate(templates, id, name) {
    var list = (Array.isArray(templates) ? templates : []).filter(Boolean);
    var key = String(name || "").trim().toLowerCase();
    return list.filter(function (t) {
        return id !== null && id !== undefined && t.id === id;
    })[0] || list.filter(function (t) {
        return key && String(t.name || "").trim().toLowerCase() === key;
    })[0] || null;
}

// custom ranks places by score, not rating, and leaves out players who stopped playing or have too few games.
function clanWarsRatingText(entry) {
    if (!entry || entry.rating === null || entry.rating === undefined) {
        return "";
    }
    return "rating " + entry.rating + (entry.rank ? " (" + getRankText(entry.rank) + ")" : "");
}

function clanWarAllTimeNote(player, clan, templateId, name) {
    var mine = player && findClanWarsTemplate(player.templates, templateId, name);
    var ours = clan && findClanWarsTemplate(clan.templates, templateId, name);
    var parts = [];
    if (mine) {
        var rating = clanWarsRatingText(mine);
        parts.push("you " + clanWarsWonLost(mine.won, mine.games) + (rating ? ", " + rating : ""));
    }
    if (ours) {
        parts.push("clan " + clanWarsWonLost(ours.won, ours.games));
    }
    return parts.length ? "All time: " + parts.join("; ") : "";
}

function clanWarsPoints(points) {
    return (Math.round(points * 10) / 10).toFixed(1);
}

function renderClanWarsHistory(history) {
    var s = history.summary || {};
    var line = function (html) {
        return '<div class="tuydCwLine">' + html + "</div>";
    };
    var lines = [
        line(htmlEscape(s.seasons_played) + " season" + (s.seasons_played === 1 ? "" : "s") + " played" + (s.seasons_won ? ", " + htmlEscape(s.seasons_won) + " won" : "") +
            (s.best_place ? ". Best finish: " + htmlEscape(getRankText(s.best_place)) + " in Season " + htmlEscape(s.best_place_season) : "") + "."),
        line(htmlEscape(clanWarsWonLost(s.wins, s.played)) + " all time" + (s.played ? " (" + htmlEscape(clanWarsPercent(s.wins, s.played)) + ")" : "") +
            (s.free_wins ? ' <span class="tuydMuted">· ' + htmlEscape(s.free_wins) + " free win" + (s.free_wins === 1 ? "" : "s") + "</span>" : ""))
    ];
    var seasons = (Array.isArray(history.seasons) ? history.seasons : []).filter(Boolean).slice(0, 5).map(function (season) {
        return '<div class="tuydCwRecordRow"><span>Season ' + htmlEscape(season.season) + (season.in_play ? ' <span class="tuydMuted">(in play)</span>' : "") + "</span><span>" +
            htmlEscape(getRankText(season.place)) + " of " + htmlEscape(season.clans) + ' <span class="tuydMuted">· ' + htmlEscape(clanWarsPoints(season.points)) + " points · " +
            htmlEscape(clanWarsWonLost(season.wins, season.played)) + "</span></span></div>";
    });
    var more = history.clan && history.clan.url ? line('<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(history.clan.url)) + '">More on custom.wl-stats.com</a>') : "";
    return '<div id="clanWarsHistory" class="tuydCommunityPanel"><h3>Clan Wars history</h3><div class="communityLaddersRows">' + lines.join("") +
        (seasons.length ? '<div class="communityLaddersSection"><h4>Latest seasons</h4>' + seasons.join("") + "</div>" : "") + more +
        '</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

function setupClanWarsHistory() {
    var histories = {};
    var check = function () {
        var scene = pageIsClanPage() && ujsElement("ClanScene");
        var clan = scene && clanWarUrlNumber("ID");
        if (!clan || $("#clanWarsHistory").attr("data-clan") === String(clan)) {
            return;
        }
        if (!(clan in histories)) {
            histories[clan] = undefined;
            fetchClanWarsHistory("clans", clan).then(function (history) {
                histories[clan] = history;
                check();
            });
            return;
        }
        var dialog = $(ujsElement("ClanWarsSection")).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").last();
        $("#clanWarsHistory").remove();
        if (!histories[clan] || !dialog.length) {
            return;
        }
        addClanWarStyles();
        hangBelowColumn($(renderClanWarsHistory(histories[clan])).attr("data-clan", clan), dialog, scene, $("#clanStandings"));
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
}

function renderClanWarsStats(player) {
    var s = player.summary;
    var won = s.wins - s.free_wins;
    var rows = [];
    if (s.rating !== null && s.rating !== undefined) {
        rows.push(["Rating", htmlEscape(s.rating) + " ± " + htmlEscape(s.rating_deviation) + (s.rank ? ", " + htmlEscape(getRankText(s.rank)) + " of " + htmlEscape(s.ranked) : ", no place")]);
    }
    // custom counts a player's games without free wins, but their wins with them.
    rows.push(["Games", s.played
        ? htmlEscape(s.played) + " (" + htmlEscape(won) + " W, " + htmlEscape(s.played - won) + " L, " + htmlEscape(clanWarsPercent(won, s.played)) + ")" +
            (s.free_wins ? ' <span class="text-muted">+ ' + htmlEscape(s.free_wins) + " free win" + (s.free_wins === 1 ? "" : "s") + "</span>" : "")
        : "None yet"]);
    rows.push(["Seasons", htmlEscape(s.seasons) + (s.days ? " (" + htmlEscape(s.days) + " day" + (s.days === 1 ? "" : "s") + " played)" : "")]);
    var clans = (Array.isArray(player.clans) ? player.clans : []).filter(Boolean).map(function (clan) {
        var seasons = clan.first_season === clan.last_season ? "season " + clan.first_season : "seasons " + clan.first_season + "–" + clan.last_season;
        return '<a href="/Clans/?ID=' + htmlEscape(encodeURIComponent(clan.id)) + '">' + htmlEscape(clan.name || "Clan " + clan.id) + '</a> <span class="text-muted">(' + htmlEscape(seasons) + ")</span>";
    });
    if (clans.length) {
        rows.push([clans.length === 1 ? "Clan" : "Clans", clans.join(", ")]);
    }
    (Array.isArray(player.templates) ? player.templates : []).filter(Boolean).slice(0, 3).forEach(function (t) {
        var rating = clanWarsRatingText(t);
        rows.push([htmlEscape(t.name || "Template " + t.id), htmlEscape(clanWarsWonLost(t.won, t.games)) + " (" + htmlEscape(clanWarsPercent(t.won, t.games)) + ")" +
            (rating ? ', <span class="text-muted">' + htmlEscape(rating) + "</span>" : "")]);
    });
    return '<div class="profileBox" id="clanWarsStats"><h3>Clan Wars</h3><table class="table table-sm" style="width: auto"><tbody>' +
        rows.map(function (row) {
            return '<tr><td class="text-muted">' + row[0] + '</td><td>' + row[1] + '</td></tr>';
        }).join("") +
        '</tbody></table><a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(player.player && player.player.url)) + '">More on custom.wl-stats.com</a></div>';
}

function setupClanWarsProfileStats() {
    var match = location.href.match(/[?&]p=(\d+)/i);
    if (!match) {
        return;
    }
    fetchClanWarsHistory("players", match[1]).then(function (player) {
        if (player && player.summary && !$("#clanWarsStats").length) {
            placeProfileBox("clanWarsStats", renderClanWarsStats(player));
        }
    });
}

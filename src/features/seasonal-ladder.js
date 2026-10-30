// A player's Seasonal Ladder seasons as custom.wl-stats.com has them. Only finished seasons count as a
// best finish: a running season's rank isn't final.
function seasonalCareer(seasonal) {
    var seasons = seasonal && Array.isArray(seasonal.seasons) ? seasonal.seasons.filter(Boolean) : [];
    var running = function (entry) {
        return entry.season && entry.season.status === "running";
    };
    return {
        seasons: seasons,
        running: seasons.filter(running)[0],
        best: seasons.filter(function (entry) {
            return entry.rank && !running(entry);
        }).sort(function (a, b) {
            return a.rank - b.rank || b.rating - a.rating;
        })[0],
        titles: seasons.filter(function (entry) {
            return entry.champion;
        }).length
    };
}

// The Seasonal Ladder view that's open. War.app's 1v1, 2v2 and 3v3 ladders draw the same scenes at the
// same addresses, so the scene's title tells them apart.
function seasonalLadderView() {
    var view = [
        { open: pageIsLadderPlayer, scene: "LadderPlayerScene", title: /^Season .+ Player$/, player: true },
        { open: pageIsLadderSeason, scene: "LadderScene", title: /^Seasonal Ladder$/ },
        { open: pageIsLadderSeasons, scene: "LadderSeasonsScene", title: /^Seasons$/ }
    ].filter(function (candidate) {
        return candidate.open();
    })[0];
    var scene = view && ujsElement(view.scene);
    if (!scene || !shownUjsElement(scene) || !view.title.test($(scene).find("[id^='ujs_HeaderLabel']").first().text().trim())) {
        return null;
    }
    return { scene: scene, player: !!view.player, seasonId: warappSeasonId(location.href) };
}

function warappSeasonId(url) {
    var match = String(url || "").match(/[?&](?:Season)?ID=(\d+)/i);
    return match ? match[1] : null;
}

// The season on the page, or the ladder with its newest season when custom.wl-stats.com hasn't read that one.
function fetchSeasonalLadder(seasonId) {
    var url = CUSTOM_SITE + "/api/v1/ladders/seasonal";
    var load = function (address) {
        return settleRequest(fetchWlStats(address, SERIES_CACHE_MS), "the Seasonal Ladder");
    };
    return seasonId ? load(url + "?warapp_id=" + seasonId).then(function (ladder) {
        return ladder || load(url);
    }) : load(url);
}

function seasonalLadderUrl(ladder, player, seasonId) {
    if (player && player.url) {
        return player.url;
    }
    if (!ladder) {
        return null;
    }
    return seasonId && ladder.season && warappSeasonId(ladder.season.warapp_url) === seasonId ? ladder.season.url : ladder.url;
}

// Leaves out custom.wl-stats.com's ratings: it works out its own, which differ from the ones war.app shows beside this.
function seasonalPlayerBoxHtml(player, seasonId) {
    var career = seasonalCareer(player);
    if (!career.seasons.length) {
        return "";
    }
    var link = function (url, html) {
        return '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(url)) + '">' + html + '</a>';
    };
    var record = function (entries) {
        var sum = function (key) {
            return entries.reduce(function (total, entry) {
                return total + (Number(entry[key]) || 0);
            }, 0);
        };
        return formatCount(sum("wins")) + " W, " + formatCount(sum("losses")) + " L";
    };
    var season = career.seasons.filter(function (entry) {
        return entry.season && warappSeasonId(entry.season.warapp_url) === seasonId;
    })[0];
    var count = career.seasons.length;
    var lines = [link(player.url, count === 1 ? "1 season" : "All " + formatCount(count) + " seasons") + ": " + record(career.seasons)];
    if (season) {
        lines.unshift(link(season.season.url, htmlEscape(season.season.name)) + ": " + record([season]));
    }
    if (career.titles) {
        lines.push("Seasons won: " + formatCount(career.titles));
    } else if (career.best) {
        lines.push("Best: " + htmlEscape(getRankText(career.best.rank)) + (career.best.season && career.best.season.name ? " (" + htmlEscape(career.best.season.name) + ")" : ""));
    }
    return '<div class="tuydSeasonalBox"><div class="tuydMuted">custom.wl-stats.com</div><div>' + lines.join("</div><div>") + '</div></div>';
}

function addSeasonalLadderStyles() {
    if (addSeasonalLadderStyles.done) {
        return;
    }
    addSeasonalLadderStyles.done = true;
    addTournamentButtonStyles();
    addCSS(`
        .tuydSeasonalBar { container: tuydSeasonalBar / inline-size; }
        .tuydSeasonalLinkAnchor { position: relative; flex: none; width: 0; height: 0; }
        .tuydPtButton.tuydSeasonalLink { left: 14px; top: -14px; bottom: auto; }
        @container tuydSeasonalBar (max-width: 639px) {
            .tuydSeasonalLinkSite { display: none; }
        }
        .tuydSeasonalPanel { container: tuydSeasonalPanel / inline-size; }
        .tuydSeasonalBox { position: absolute; top: 6px; right: 8px; width: 240px; pointer-events: auto; color: #babbbb; font-size: 13px; line-height: 18px; }
        .tuydSeasonalBox .tuydMuted { color: #8d8d8d; font-size: 12px; }
        .tuydSeasonalBox a { color: #e0c060; }
        @container tuydSeasonalPanel (max-width: 799px) {
            .tuydSeasonalBox { display: none; }
        }
    `);
}

// The title is a centered text box as wide as the bar: taking no width, the anchor keeps it centered
// and holds the button just after its text, however long that is.
function addSeasonalLadderLink(scene, url) {
    addSeasonalLadderStyles();
    var link = $('<a class="tuydPtButton tuydSeasonalLink" target="_blank" rel="noopener">custom<span class="tuydSeasonalLinkSite">.wl-stats.com</span></a>').attr("href", safeUrl(url));
    link[0].style.setProperty("--tuyd-button", warappArt(scene)["--tuyd-button"]);
    $(scene).find("[id^='ujs_HeaderLabel'][id$='_tmp']").first().addClass("tuydSeasonalBar").append($('<span class="tuydSeasonalLinkAnchor"></span>').append(link));
}

// war.app positions everything from zero-size anchors, so the box goes in a background box, one of the
// few elements with a real size: the one above the dialog's backing.
function addSeasonalPlayerBox(scene, html) {
    addSeasonalLadderStyles();
    $(scene).find("[id^='ujs_NameRow']").first().parent().children("[id$='_img']").first().addClass("tuydSeasonalPanel").append(html);
}

function setupSeasonalLadderCustom() {
    var check = function () {
        var view = seasonalLadderView();
        if (!view) {
            return;
        }
        if (view.scene.hasAttribute("data-tuyd-custom")) {
            // The button's text makes the title no view's, so a view here has lost it: each time war.app
            // lays a scene out, it rewrites the title.
            var added = view.scene.getAttribute("data-tuyd-custom");
            if (added) {
                addSeasonalLadderLink(view.scene, added);
            }
            return;
        }
        // The Profile button is drawn when war.app's answer arrives, so a later change finds it.
        var profile = view.player && ($(view.scene).find("[id^='ujs_NameRow'] a[href*='Profile?p=']").attr("href") || "").match(/[?&]p=(\d+)/i);
        if (view.player && !profile) {
            return;
        }
        view.scene.setAttribute("data-tuyd-custom", "");
        $.when(
            fetchSeasonalLadder(view.seasonId),
            profile ? settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/seasonal/players/" + profile[1], SERIES_CACHE_MS), "the player's Seasonal Ladder seasons") : null
        ).done(function (ladder, player) {
            var url = seasonalLadderUrl(ladder, player, view.seasonId);
            if (url) {
                view.scene.setAttribute("data-tuyd-custom", url);
                addSeasonalLadderLink(view.scene, url);
            }
            var box = player ? seasonalPlayerBoxHtml(player, view.seasonId) : "";
            if (box) {
                addSeasonalPlayerBox(view.scene, box);
            }
        });
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
}

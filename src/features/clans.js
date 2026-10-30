function setupClanListSearch() {
    var $container = $("#AutoContainer, .container").filter(function () {
        return $(this).find("a[href*='/Clans/?ID=']").length > 0;
    }).first();
    if ($container.length === 0) return;

    var $clanItems = $container.find("li").filter(function () {
        return $(this).find("a[href*='/Clans/?ID=']").length > 0;
    });
    if ($clanItems.length === 0) return;

    if ($("#clanSearchBar").length) return;
    var searchBar = '<div id="clanSearchBar" style="margin:12px 0;display:flex;align-items:center;gap:8px">' +
        '<input type="text" id="clanSearchInput" placeholder="Search clans..." ' +
        'style="padding:6px 12px;border-radius:4px;border:1px solid #444;background:#1a1a2e;color:#e0e0e0;width:260px;font-size:14px">' +
        '<span id="clanSearchCount" style="color:#999;font-size:13px"></span>' +
        '</div>';
    var $h1 = $container.find("h1:first");
    if ($h1.length) {
        $h1.after(searchBar);
    } else {
        $container.prepend(searchBar);
    }

    var searchTimer;
    $("#clanSearchInput").on("keyup", function () {
        clearTimeout(searchTimer);
        var query = $(this).val().toLowerCase().trim();
        searchTimer = setTimeout(function () {
            filterClanList(query, $clanItems);
        }, 150);
    });
}

function filterClanList(query, $items) {
    var visible = 0;
    if (!query) {
        $items.each(function () {
            if ($(this).data("inactiveclan") !== 1) $(this).show();
        });
        $("#clanSearchCount").text("");
        return;
    }
    $items.each(function () {
        var text = $(this).text().toLowerCase();
        if (text.indexOf(query) !== -1) {
            $(this).show();
            visible++;
        } else {
            $(this).hide();
        }
    });
    $("#clanSearchCount").text(visible + " found");
}

// war.app's clan page is drawn client-side; the panel hangs below Clan Wars, inside war.app's
// scrolling viewport, so a long panel extends the page's scroll. In war.app's one-column layout
// Clan Members comes after Clan Wars, so the panel moves below whatever is lowest in that column.
function setupClanStandings() {
    var clans = {};
    var check = function () {
        var scene = pageIsClanPage() && ujsElement("ClanScene");
        var name = scene && $(ujsElement("ClanNameLabel", "_tmp")).text().trim();
        if (!name || $("#clanStandings").attr("data-clan") === name) {
            return;
        }
        if (!(name in clans)) {
            clans[name] = null;
            fetchWlStats(CUSTOM_SITE + "/api/v1/series?clan=" + encodeURIComponent(name), SERIES_CACHE_MS).done(function (data) {
                clans[name] = data && Array.isArray(data.series) ? data.series : [];
                check();
            }).fail(function (xhr) {
                log("Error loading the clan's custom.wl-stats.com series: " + (xhr && xhr.statusText));
            });
            return;
        }
        var rows = inClanSeriesOrder(clans[name] || []).filter(function (series) {
            return series.current && Array.isArray(series.squads) && series.squads.length;
        }).map(renderClanSeriesRow);
        var dialog = $(ujsElement("ClanWarsSection")).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").last();
        $("#clanStandings").remove();
        if (!rows.length || !dialog.length) {
            return;
        }
        addCommunityLaddersStyles();
        var panel = $(renderClanStandings(rows)).attr("data-clan", name);
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
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
}

function placeBelowColumn(panel, dialog, scene) {
    var box = dialog[0].getBoundingClientRect();
    var lowest = box.bottom;
    $(scene).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").each(function () {
        var other = this.getBoundingClientRect();
        if (this !== dialog[0] && other.height && other.top >= box.bottom - 1 && other.left < box.right && other.right > box.left) {
            lowest = Math.max(lowest, other.bottom);
        }
    });
    panel.css({ width: dialog.outerWidth() + "px", top: Math.round(lowest - box.bottom) + 10 + "px" });
}

// Clan League is the biggest clan event, so it leads; other series keep the server's order.
// Players' series in PLAYER_SERIES_KINDS order, others after them as listed; clan series keep their places.
function inPlayerSeriesOrder(list) {
    var rank = function (series) {
        if (CLAN_SERIES_KINDS.indexOf(series.kind) !== -1) {
            return -1;
        }
        var i = PLAYER_SERIES_KINDS.indexOf(series.kind);
        return i === -1 ? PLAYER_SERIES_KINDS.length : i;
    };
    var players = list.filter(function (series) {
        return rank(series) !== -1;
    }).sort(function (a, b) {
        return rank(a) - rank(b);
    });
    return list.map(function (series) {
        return rank(series) === -1 ? series : players.shift();
    });
}

function inClanSeriesOrder(list) {
    var rank = function (series) {
        var i = CLAN_SERIES_KINDS.indexOf(series.kind);
        return i === -1 ? CLAN_SERIES_KINDS.length : i;
    };
    return list.slice().sort(function (a, b) {
        return rank(a) - rank(b);
    });
}

function renderClanStandings(rows) {
    return '<div id="clanStandings" class="tuydCommunityPanel"><h3>Community events</h3><div class="communityLaddersRows">' + rows.join("") +
        '</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

function renderClanSeriesRow(series) {
    // A clan can enter several Clan Cup squads; its best one stands for the clan.
    var squads = (series.kind === "clan_cup" ? series.squads.slice(0, 1) : series.squads).map(function (squad) {
        var name = squad.squad || squad.name;
        var parts = standingParts(series.kind, squad);
        return '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(squad.url)) + '">' + htmlEscape(name) + '</a>' + (parts.length ? ": " + parts.join(" · ") : "");
    });
    var titles = series.titles && series.titles.count > 0 && Array.isArray(series.titles.editions) ? series.titles : null;
    if (titles) {
        squads.push('<span class="tuydClanTitles">🏆 Champion ×' + htmlEscape(titles.count) + ': ' + titles.editions.map(function (edition) {
            return '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(edition.url)) + '">' + htmlEscape(edition.name) + '</a>';
        }).join(", ") + '</span>');
    }
    return communityLadderRow({ name: series.name, url: series.url, statusHtml: seriesStatusHtml(series), detailHtml: seriesDetailHtml(series, Date.now()), youHtml: squads.join("<br>") });
}

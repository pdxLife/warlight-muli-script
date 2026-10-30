// war.app's Community page: the community series in its (otherwise empty) Community Events box, with
// fewer blog posts above to make room, and the MTL's top 10 in a box of its own above New Maps.
function setupCommunityPageSummary() {
    loadCommunityData().done(function (community) {
        var heading = $("h2").filter(function () {
            return $.trim($(this).text()) === "Community Events";
        }).first();
        var events = communityPageEventsHtml(community.series, Date.now());
        if (events && heading.length && !$("#tuydCommunityPageEvents").length) {
            heading.after(events);
            trimBlogPosts();
        }
        var top = community.mtl ? mtlTopHtml(community.mtl, community.playerId) : "";
        if (top && !$("#tuydMtlTop").length) {
            addMtlTopStyles();
            var box = '<section class="container" id="tuydMtlTop"><div class="bg-gray p-3 mb-2">' + top + '</div></section>';
            var maps = $("section#maps");
            if (maps.length) {
                maps.before(box);
            } else {
                $("section.container").first().after(box);
            }
        }
    });
}

function communityPageEventsHtml(series, now) {
    var rows = COMMUNITY_PAGE_SERIES.map(function (slug) {
        return series.filter(function (entry) {
            return entry && entry.slug === slug && entry.current;
        })[0];
    }).filter(Boolean).map(function (entry) {
        return '<tr><td class="align-top"><span class="text-muted">●&nbsp;</span></td><td>' + communityPageEventHtml(entry, now) + '</td></tr>';
    });
    return rows.length ? '<table class="ml-3" id="tuydCommunityPageEvents"><tbody>' + rows.join("") + '</tbody></table>' : "";
}

function communityPageEventHtml(series, now) {
    var current = series.current;
    var name = seriesLink({ name: series.name, url: series.url });
    if (series.kind === "events") {
        var last = current.status === "finished" && current.winner && current.winner.name
            ? "Last winner: " + seriesLink(current.winner) + " (" + seriesLink({ name: current.name, url: current.url }) + ")"
            : weeklyEventStatusHtml(current);
        var next = seriesDetailHtml(series, now);
        return name + " · " + last + (next ? '<br><span class="text-muted">' + next + '</span>' : "");
    }
    var edition = String(current.name || "");
    // "Nations Cup" + "Nations Cup 2026" reads as "Nations Cup 2026".
    var label = edition.indexOf(series.name + " ") === 0 ? name + " " + htmlEscape(edition.slice(series.name.length + 1)) : name + (edition ? " · " + seriesLink({ name: edition, url: current.url }) : "");
    var finished = current.status === "finished";
    var state = current.status === "signups" ? signupsHtml(current) : finished ? "finished"
        : current.progress ? formatCount(current.progress.played) + "/" + formatCount(current.progress.total) + " games" : "";
    // One name fits a line here; a division's top three (the Ladders page's standings) doesn't.
    var lead = finished ? current.winner : current.leader;
    var detail = STAGED_SERIES_KINDS.indexOf(series.kind) !== -1 && current.status === "running" && current.stage ? siteLink(current.url, current.stage)
        : lead && lead.name ? (finished ? "Winner: " : "Leader: ") + seriesLink(lead) : standingsHtml(current.standings);
    return [label, state, detail].filter(Boolean).join(" · ");
}

function trimBlogPosts() {
    var heading = $("h2").filter(function () {
        return $.trim($(this).text()) === "Recent Blog Posts";
    }).first();
    heading.next("table").find("tr").filter(function () {
        return !$(this).find("td[colspan]").length;
    }).slice(COMMUNITY_PAGE_BLOG_POSTS).hide();
}

// The MTL's top 10 in two columns of five, from custom.wl-stats.com's copy of warlight-mtl.com, and
// your line below when you're ranked lower.
function mtlTopHtml(mtl, playerId) {
    var ladder = mtl.ladder;
    var top = ladder.players.filter(function (entry) {
        return entry && entry.rank != null && entry.rank <= MTL_TOP_COUNT;
    }).sort(function (a, b) {
        return a.rank - b.rank;
    });
    if (!top.length) {
        return "";
    }
    var status = ["Top " + top.length + " of " + formatCount(ladder.players.length) + " ranked"];
    if (ladder.site_up === false && ladder.copied_at) {
        status.push("warlight-mtl.com is down; as of " + htmlEscape(formatEventTime(ladder.copied_at)));
    }
    var column = function (entries) {
        return '<div class="col-md-6"><table class="table table-sm mb-0 tuydMtlTopTable"><thead><tr><th>#</th><th>Player</th><th class="text-right">Rating</th><th class="text-right">Won</th></tr></thead><tbody>' +
            entries.map(function (entry) {
                var you = playerId && String(entry.player_id) === String(playerId);
                return '<tr' + (you ? ' class="tuydMtlYou"' : "") + '><td class="text-muted">' + htmlEscape(entry.rank) + '</td><td>' + seriesLink(entry) + '</td>' +
                    '<td class="text-right">' + formatCount(entry.rating) + '</td><td class="text-right text-muted">' + (entry.win_pct != null ? formatCount(Math.round(entry.win_pct)) + "%" : "") + '</td></tr>';
            }).join("") + '</tbody></table></div>';
    };
    var half = Math.ceil(top.length / 2);
    var inTop = top.some(function (entry) {
        return playerId && String(entry.player_id) === String(playerId);
    });
    return '<div class="tuydMtlTopLinks">' + siteLink(ladder.url, "Full ladder") + " " + siteLink("https://www.warlight-mtl.com/", "warlight-mtl.com") + '</div>' +
        '<h2 class="text-medium">Multi-Template Ladder</h2><div class="text-muted mb-2">' + status.join(" · ") + '</div>' +
        '<div class="row">' + column(top.slice(0, half)) + (top.length > half ? column(top.slice(half)) : "") + '</div>' +
        (mtl.mine && !inTop ? '<div class="mt-2">' + mtlYouHtml(mtl, playerId) + '</div>' : "");
}

function addMtlTopStyles() {
    addCSS(`
        .tuydMtlTopLinks { float: right; margin-top: 4px; }
        .tuydMtlTopLinks a { margin-left: 12px; }
        .tuydMtlTopTable th { font-weight: normal; color: #999; text-align: left; }
        .tuydMtlTopTable td, .tuydMtlTopTable th { border-top: none; }
        .tuydMtlYou td { font-weight: bold; }
    `);
}

function isMtlThreadTitle(title) {
    return /\b(?:MTL|MDL)\b|multi[\s-]*(?:template|day)[\s-]*ladder/i.test(title);
}

// The MTL's top 10 below the reply box in MTL threads.
function setupMtlForumTop() {
    if (!isMtlThreadTitle($("title").text()) || !$("#ReplyDiv").length) {
        return;
    }
    signedInPlayerId().done(function (playerId) {
        $.when(
            settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/mtl", SERIES_CACHE_MS), "the MTL rankings"),
            playerId ? settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/mtl/players/" + playerId, SERIES_CACHE_MS), "your MTL figures") : null
        ).done(function (ladder, mine) {
            var top = ladder && Array.isArray(ladder.players) ? mtlTopHtml({ ladder: ladder, mine: mine || null }, playerId) : "";
            if (top && !$("#tuydMtlTop").length) {
                addMtlTopStyles();
                $("#ReplyDiv").after('<div id="tuydMtlTop" class="bg-gray p-3 my-3">' + top + '</div>');
            }
        });
    });
}

function setupCommunityLadders() {
    var rows = null;
    var community = null;
    var observers = [];
    // Opening one of war.app's ladders hides the Ladders view and changes the address (/LadderSeasons)
    // without loading a page; the panel, which sits outside that view, goes with it and comes back after.
    var hide = function () {
        observers.forEach(function (observer) {
            observer.disconnect();
        });
        observers = [];
        $("#communityLadders").remove();
    };
    var show = function () {
        var scene = pageIsLadders() && ujsElement("LaddersScene");
        if (!scene || !shownUjsElement(scene)) {
            hide();
            return;
        }
        if (!community) {
            return;
        }
        addCommunityLaddersStyles();
        var dialog = $(scene).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").last();
        if (!dialog.length || !(rows.players.length + rows.clans.length) || $("#communityLadders").length) {
            return;
        }
        var panel = $(renderCommunityLadders(rows));
        panel.find(".communityLaddersSearch").on("input", function () {
            filterCommunityLadders(panel, this.value);
        });
        var art = warappArt(scene);
        Object.keys(art).forEach(function (name) {
            if (art[name]) {
                panel[0].style.setProperty(name, art[name]);
            }
        });
        var holder = $("#UjsCanvasHolder");
        (holder.length ? holder : dialog.parent().parent()).append(panel);
        fitCommunityLadders(panel, dialog);
        // war.app re-lays out the dialog shortly after a resize, so follow the dialog and the page area,
        // and the styles it moves the dialog with, which don't always change its size.
        var fit = function () {
            fitCommunityLadders(panel, dialog);
        };
        var moved = new MutationObserver(fit);
        moved.observe(scene, { attributes: true, attributeFilter: ["style"], subtree: true });
        observers.push(moved);
        if (window.ResizeObserver) {
            var resized = new ResizeObserver(fit);
            resized.observe(dialog[0]);
            resized.observe(panel.parent()[0]);
            observers.push(resized);
        }
    };
    var load = function () {
        if (rows || !pageIsLadders()) {
            return;
        }
        rows = { players: [], clans: [] };
        loadCommunityData().done(function (data) {
            if (data.rankings) {
                rows.players.push(renderAwpLadderRow(data.rankings, data.playerId));
            }
            if (data.mtl) {
                rows.players.push(renderMtlLadderRow(data.mtl, data.playerId));
            }
            inPlayerSeriesOrder(inClanSeriesOrder(data.series)).forEach(function (series) {
                if (series.current) {
                    rows[CLAN_SERIES_KINDS.indexOf(series.kind) !== -1 ? "clans" : "players"].push(renderSeriesLadderRow(series, Date.now()));
                }
            });
            community = data;
            show();
        });
    };
    var check = function () {
        load();
        show();
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
}

function filterCommunityLadders(panel, text) {
    var wanted = text.trim().toLowerCase();
    var found = 0;
    panel.find(".communityLaddersSection").each(function () {
        var matches = $(this).find(".communityLadder").filter(function () {
            var match = $(this).text().toLowerCase().indexOf(wanted) !== -1;
            $(this).toggle(match);
            return match;
        }).length;
        $(this).toggle(matches > 0);
        found += matches;
    });
    panel.find(".communityLaddersNone").toggle(!found);
}

// Two columns need about 940px; below that the panel takes the dialog's width and its lists stack.
function fitCommunityLadders(panel, dialog) {
    var box = dialog[0].getBoundingClientRect();
    var viewport = panel.closest("[id^='ujs_Viewport']");
    if (viewport.length) {
        panel.css("width", box.width + "px");
    } else {
        var area = panel.parent()[0].getBoundingClientRect();
        var room = area.width - 32;
        var width = room >= 940 ? Math.min(room, Math.max(1040, box.width)) : box.width;
        var left = Math.max(0, Math.min(box.left - area.left + (box.width - width) / 2, area.width - width));
        panel.css({ width: width + "px", left: Math.round(left) + "px", top: Math.round(box.bottom - area.top + 10) + "px" });
    }
    var bottom = viewport.length ? viewport[0].getBoundingClientRect().bottom : Math.min(window.innerHeight, panel.parent()[0].getBoundingClientRect().bottom);
    var list = panel.find(".communityLaddersRows");
    var room = bottom - list[0].getBoundingClientRect().top - panel.find(".communityLaddersCredit").outerHeight() - 20;
    list.css("max-height", Math.max(66, room) + "px");
}

function addCommunityLaddersStyles() {
    if (addCommunityLaddersStyles.done) {
        return;
    }
    addCommunityLaddersStyles.done = true;
    addCSS(`
        .tuydCommunityPanel {
            container: tuydLadders / inline-size;
            position: absolute;
            top: 10px;
            left: 0;
            box-sizing: border-box;
            pointer-events: auto;
            color: #babbbb;
            font-size: 14px;
            line-height: 18px;
            border-style: solid;
            border-color: rgba(0, 0, 0, 0.6);
            border-width: 54px 18px 12px 17px;
            border-image: var(--tuyd-dialog, none) 82 27 19 26 fill / 54px 18px 12px 17px stretch;
        }
        .tuydCommunityPanel h3 {
            position: absolute;
            top: -46px;
            left: 0;
            right: 0;
            height: 38px;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
        }
        .tuydCommunityPanel .communityLaddersSearch {
            position: absolute;
            top: -42px;
            right: 0;
            width: 200px;
            height: 28px;
            box-sizing: border-box;
            padding: 0 8px;
            color: #eee;
            font-size: 13px;
            background: #111;
            border: 1px solid #555;
            border-radius: 3px;
        }
        @container tuydLadders (max-width: 699px) {
            .tuydCommunityPanel .communityLaddersSearch {
                width: 130px;
            }
        }
        .tuydCommunityPanel .communityLaddersRows {
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #555 transparent;
        }
        .tuydCommunityPanel .communityLaddersSection h4 {
            margin: 2px 4px 6px;
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
        }
        @container tuydLadders (min-width: 900px) {
            .tuydCommunityPanel .communityLaddersRows {
                display: grid;
                grid-template-columns: 1fr 1fr;
                align-items: start;
                gap: 0 14px;
            }
        }
        .tuydCommunityPanel .communityLadder {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 66px;
            box-sizing: border-box;
            margin-bottom: 6px;
            border-style: solid;
            border-color: rgba(255, 255, 255, 0.08);
            border-width: 12px 10px 10px;
            border-image: var(--tuyd-row, none) 19 15 15 16 fill / 12px 10px 10px stretch;
        }
        .tuydCommunityPanel .communityLadderButton {
            flex: 0 0 160px;
            max-width: 35%;
            min-height: 50px;
            margin: -4px 0 -2px -2px;
            padding: 0 4px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #fff;
            font-size: 15px;
            font-weight: 700;
            line-height: 16px;
            text-decoration: none;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
            border-style: solid;
            border-color: #242d9a;
            border-width: 5px 5px 4px;
            background: #242d9a padding-box;
            border-image: var(--tuyd-button, none) 15 15 13 fill / 5px 5px 4px stretch;
        }
        .tuydCommunityPanel .communityLadderButton:hover {
            filter: brightness(1.15);
        }
        .tuydCommunityPanel .communityLadderText {
            flex: 1;
            min-width: 0;
        }
        .tuydCommunityPanel .tuydMuted {
            color: #8d8d8d;
        }
        .tuydCommunityPanel .communityLadderYou {
            color: #fff;
        }
        .tuydCommunityPanel .communityLaddersCredit {
            text-align: right;
            font-size: 11px;
            color: #777;
        }
        .tuydCommunityPanel .communityLadderSignups,
        .tuydCommunityPanel .tuydClanTitles,
        .tuydCommunityPanel .tuydClanTitles a {
            color: #e0c060;
        }
        .tuydCommunityPanel .tuydClanTitles a {
            white-space: nowrap;
        }
        .tuydEventStanding,
        .tuydEventMore {
            position: absolute;
            right: 12px;
            text-align: right;
            pointer-events: auto;
            color: #fff;
            font-size: 13px;
            line-height: 20px;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
        }
        .tuydEventStanding {
            top: 6px;
            max-width: calc(100% - 300px);
        }
        .tuydEventStanding .tuydEventLine:first-child {
            color: #babbbb;
        }
        .tuydEventMore {
            top: 62px;
            max-width: calc(100% - 190px);
        }
        .tuydEventLine {
            margin-left: auto;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .tuydEventStanding .communityLadderSignups {
            color: #e0c060;
        }
        .tuydEventStanding .tuydMuted {
            color: #8d8d8d;
        }
        .tuydHasEventBadge {
            position: relative;
        }
        .tuydEventBadgeCorner {
            position: absolute;
            top: 6px;
            right: 6px;
            z-index: 2;
            line-height: 16px;
        }
        .tuydNameBesideBadge {
            box-sizing: border-box;
            padding-right: 120px !important;
        }
        .tuydEventBadge {
            display: inline-block;
            max-width: 110px;
            padding: 1px 6px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            vertical-align: middle;
            border-radius: 3px;
            background: #242d9a;
            color: #fff !important;
            font-size: 12px;
            line-height: 16px;
            text-decoration: none !important;
        }
        .tuydEventBadge:hover {
            filter: brightness(1.2);
        }
        .tuydEventBadge.tuydEventBadgeAwp {
            background: #e0c060;
            color: #1b1b1b !important;
        }
        @container tuydEventCard (max-width: 599.98px) {
            .tuydEventStanding,
            .tuydEventMore {
                display: none;
            }
        }
        @media (max-width: 600px) {
            .tuydCommunityPanel h3 {
                font-size: 14px;
                white-space: nowrap;
            }
            .tuydCommunityPanel .communityLadderText {
                font-size: 13px;
                line-height: 16px;
            }
        }
    `);
}

function renderCommunityLadders(rows) {
    var section = function (title, list) {
        return list.length ? '<div class="communityLaddersSection"><h4>' + title + '</h4>' + list.join("") + '</div>' : "";
    };
    return '<div id="communityLadders" class="tuydCommunityPanel"><h3>Community ladders &amp; leagues</h3>' +
        '<input type="search" class="communityLaddersSearch" placeholder="Search" aria-label="Search the community ladders and leagues"><div class="communityLaddersRows">' +
        section("Players", rows.players) + section("Clans &amp; nations", rows.clans) +
        '</div><div class="communityLaddersNone tuydMuted" style="display: none">No ladder or league matches.</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

// statusHtml, detailHtml and youHtml must already be escaped.
function communityLadderRow(row) {
    return '<div class="communityLadder"><a class="communityLadderButton" target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(row.url)) + '">' + htmlEscape(row.name) + '</a>' +
        '<div class="communityLadderText">' +
        (row.statusHtml ? '<div class="tuydMuted">' + row.statusHtml + '</div>' : "") +
        (row.detailHtml ? '<div>' + row.detailHtml + '</div>' : "") +
        (row.youHtml ? '<div class="communityLadderYou">' + row.youHtml + '</div>' : "") + '</div></div>';
}

function loadCommunityData() {
    var result = $.Deferred();
    signedInPlayerId().done(function (playerId) {
        $.when(
            settleRequest(fetchWlStats(AWP_SITE + "/api/v1/rankings"), "the AWP World Tour rankings"),
            settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/series" + (playerId ? "?player=" + playerId : ""), SERIES_CACHE_MS), "the custom.wl-stats.com series"),
            settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/seasonal", SERIES_CACHE_MS), "the Seasonal Ladder"),
            settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/mtl", SERIES_CACHE_MS), "the MTL rankings"),
            playerId ? settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/mtl/players/" + playerId, SERIES_CACHE_MS), "your MTL figures") : null
        ).done(function (rankings, series, seasonal, mtl, mtlMine) {
            result.resolve({
                playerId: playerId,
                rankings: rankings && rankings.rankings ? rankings : null,
                series: withSeasonalLadder(series && Array.isArray(series.series) ? series.series : [], seasonalLadderSeries(seasonal, playerId)),
                mtl: mtl && Array.isArray(mtl.players) ? { ladder: mtl, mine: mtlMine || null } : null
            });
        });
    });
    return result.promise();
}

// The Seasonal Ladder moved from custom.wl-stats.com's series to its own ladders API
// (/api/v1/ladders/seasonal); this turns that season's standings into a series like the others.
function seasonalLadderSeries(ladder, playerId) {
    if (!ladder || !ladder.season || !Array.isArray(ladder.players)) {
        return null;
    }
    var season = ladder.season;
    var ranked = ladder.players.filter(function (entry) {
        return entry && entry.rank != null;
    }).sort(function (a, b) {
        return a.rank - b.rank;
    });
    var top = ranked[0] ? { name: ranked[0].name, url: ranked[0].url } : null;
    var me = playerId ? ladder.players.filter(function (entry) {
        return entry && String(entry.player_id) === String(playerId);
    })[0] : null;
    var finished = season.status === "finished";
    return {
        slug: "seasonal-ladder",
        name: ladder.name || "Seasonal Ladder",
        kind: "ladder",
        url: ladder.url,
        current: {
            name: season.name,
            url: season.url,
            status: season.status,
            started_at: season.started_at,
            finished_at: season.finished_at,
            players: ladder.players.length,
            progress: null,
            leader: finished ? null : top,
            winner: finished ? top : null,
            standings: null,
            stage: null
        },
        you: me ? { as: "player", name: me.name, place: me.rank, of: ranked.length, wins: me.wins, losses: me.losses, points: me.rating, status: finished ? "finished" : "playing", url: me.url } : null
    };
}

// The series list with the Seasonal Ladder from the ladders API in its place. While the series list
// still has its own copy, that copy is used when the ladders API doesn't answer.
function withSeasonalLadder(series, seasonal) {
    if (!seasonal) {
        return series;
    }
    var at = -1;
    var others = series.filter(function (entry, i) {
        var ladder = entry && (entry.kind === "ladder" || entry.slug === "seasonal-ladder");
        if (ladder && at === -1) {
            at = i;
        }
        return !ladder;
    });
    others.splice(at === -1 ? others.length : at, 0, seasonal);
    return others;
}

// The Multi-Template Ladder, from custom.wl-stats.com's copy of warlight-mtl.com.
function renderMtlLadderRow(mtl, playerId) {
    var ladder = mtl.ladder;
    var leader = mtlLeader(ladder);
    var status = [formatCount(ladder.players.length) + " ranked players"];
    if (ladder.site_up === false && ladder.copied_at) {
        status.push("warlight-mtl.com is down; as of " + htmlEscape(formatEventTime(ladder.copied_at)));
    }
    return communityLadderRow({
        name: "Multi-Template Ladder",
        url: ladder.url,
        statusHtml: status.join(" · "),
        detailHtml: leader ? "Leader: " + seriesLink(leader) + " " + formatCount(leader.rating) : "",
        youHtml: mtlYouHtml(mtl, playerId)
    });
}

function mtlYouHtml(mtl, playerId) {
    var mine = mtl.mine;
    if (!playerId) {
        return "";
    }
    return mine
        ? '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(mine.url)) + '">You</a>: ' + [
            mine.rank ? htmlEscape(getRankText(mine.rank)) + " of " + formatCount(mtl.ladder.players.length) : "not ranked",
            "rating " + formatCount(mine.rating),
            mine.best_rank ? "best " + htmlEscape(getRankText(mine.best_rank)) : ""
        ].filter(Boolean).join(" · ")
        : "You: not on the MTL";
}

function mtlLeader(ladder) {
    return ladder.players.filter(function (entry) {
        return entry && entry.rank === 1;
    })[0] || ladder.players[0];
}

// war.app's Community Events card for the Multi Template Ladder (MTL).
function mtlEventLines(community) {
    var mtl = community.mtl;
    if (!mtl) {
        return null;
    }
    var leader = mtlLeader(mtl.ladder);
    var status = [formatCount(mtl.ladder.players.length) + " ranked"];
    if (mtl.ladder.site_up === false && mtl.ladder.copied_at) {
        status.push("warlight-mtl.com is down");
    }
    return {
        status: status.join(" · "),
        detail: leader ? "Leader: " + seriesLink(leader) + " " + formatCount(leader.rating) : "",
        bottom: mtlYouHtml(mtl, community.playerId) || siteLink(mtl.ladder.url, "Full rankings on custom.wl-stats.com")
    };
}

// custom.wl-stats.com sends UTC times without a zone; read them as UTC, not local time.
function parseUtcTime(iso) {
    var text = String(iso || "");
    var date = new Date(/(?:Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + "Z");
    return isNaN(date.getTime()) ? null : date;
}

function formatEventTime(iso) {
    var date = parseUtcTime(iso);
    return date ? date.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

function timeUntil(iso, now) {
    var date = parseUtcTime(iso);
    if (!date) {
        return "";
    }
    var minutes = Math.round((date.getTime() - now) / 60000);
    if (minutes <= 0) {
        return "now";
    }
    if (minutes < 60) {
        return "in " + minutes + " min";
    }
    var hours = Math.round(minutes / 60);
    if (hours < 36) {
        return "in " + hours + " hour" + (hours === 1 ? "" : "s");
    }
    var days = Math.round(hours / 24);
    return "in " + days + " day" + (days === 1 ? "" : "s");
}

function seriesLink(link) {
    return link && link.name ? '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(link.url)) + '">' + htmlEscape(link.name) + '</a>' : "";
}

function awpStanding(rankings, playerId) {
    return playerId && rankings ? rankings.rankings.filter(function (entry) {
        return String(entry.player_id) === playerId;
    })[0] : null;
}

function signupsHtml(current) {
    return '<span class="communityLadderSignups">Signups open' + (current.signups_close_at ? " until " + htmlEscape(formatEventTime(current.signups_close_at)) : "") + '</span>';
}

function seriesYouHtml(series) {
    var you = series.you;
    var who = { nation: "Your country ", clan: "Your clan " }[you.as];
    var link = function (text) {
        return '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(you.url)) + '">' + htmlEscape(text) + '</a>';
    };
    var label = who ? who + link(you.name) : link("You");
    if (you.status === "signed_up") {
        return label + ": signed up";
    }
    var parts = standingParts(series.kind, you);
    return parts.length ? label + ": " + parts.join(" · ") : label;
}

function standingParts(kind, you) {
    var parts = [];
    if (you.division) {
        // Clan League sends a bare division letter ("A"); leagues send "Division A".
        parts.push(htmlEscape(/^[A-Z0-9]{1,2}$/i.test(String(you.division)) ? "Division " + you.division : you.division));
    }
    if (you.group && you.group !== you.division) {
        parts.push(htmlEscape(you.group));
    }
    if (you.place) {
        parts.push(htmlEscape(getRankText(you.place)) + (you.of ? " of " + htmlEscape(you.of) : ""));
    }
    if (you.status === "signed_up") {
        parts.push("signed up");
    }
    if (you.wins != null && you.losses != null) {
        parts.push(htmlEscape(you.wins) + "–" + htmlEscape(you.losses));
    }
    if (you.points != null) {
        parts.push(kind === "ladder" ? "rating " + formatCount(you.points) : formatCount(you.points) + " points");
    }
    if (["promoted", "relegated", "eliminated", "champion"].indexOf(you.status) !== -1) {
        parts.push(htmlEscape(you.status));
    }
    return parts;
}

function seriesStatusHtml(series) {
    var current = series.current;
    if (series.kind === "events") {
        return weeklyEventStatusHtml(current);
    }
    var units = { nations_cup: "teams", clan_cup: "clans", clan_league: "clans" }[series.kind] || "players";
    var status = [htmlEscape(current.name), current.status === "signups" ? signupsHtml(current) : current.status === "running" ? "running" : "finished"];
    if (current.players) {
        status.push(formatCount(current.players) + " " + units);
    }
    if (current.progress) {
        status.push(formatCount(current.progress.played) + "/" + formatCount(current.progress.total) + (series.kind === "clan_cup" ? " matches" : " games"));
    }
    return status.join(" · ");
}

function seriesDetailHtml(series, now) {
    var current = series.current;
    var details = [];
    var finished = current.status === "finished";
    var lead = series.kind === "events" ? null : finished ? current.winner : current.leader;
    // Cups played in rounds or stages have too many names to list; the stage, linking to the bracket, says where they stand.
    var standings = STAGED_SERIES_KINDS.indexOf(series.kind) !== -1 ? (current.status === "running" && current.stage ? siteLink(current.url, current.stage) : "")
        : standingsHtml(current.standings);
    if (standings) {
        details.push(standings);
    } else if (lead && lead.name) {
        details.push((finished ? "Winner: " : "Leader: ") + seriesLink(lead));
    }
    if (current.next_event_at && parseUtcTime(current.next_event_at)) {
        details.push("Next: " + htmlEscape(formatEventTime(current.next_event_at)) + " (" + htmlEscape(timeUntil(current.next_event_at, now)) + ")");
    }
    return details.join(" · ");
}

// A weekly series is about its last (or current) event and the next one, not a winner.
function weeklyEventStatusHtml(current) {
    var running = current.status === "running";
    var status = [(running ? "Now: " : "Last: ") + seriesLink({ name: current.name, url: current.url })];
    if (current.players) {
        status.push(formatCount(current.players) + " players");
    }
    if (running && current.progress) {
        status.push(formatCount(current.progress.played) + "/" + formatCount(current.progress.total) + " games");
    }
    return status.join(" · ");
}

// custom.wl-stats.com's short standings for formats with no single leader: a division's top
// three or each group's leader.
function standingsHtml(standings) {
    var entries = standings && Array.isArray(standings.entries) ? standings.entries.filter(function (entry) {
        return entry && entry.name;
    }) : [];
    if (!entries.length) {
        return "";
    }
    return (standings.label ? htmlEscape(standings.label) + ": " : "") + entries.map(function (entry) {
        var prefix = entry.group ? '<span class="tuydMuted">' + htmlEscape(entry.group) + '</span> ' : entry.place ? htmlEscape(entry.place) + ". " : "";
        var score = entry.points != null ? " " + formatCount(entry.points)
            : entry.wins != null && entry.losses != null ? " " + htmlEscape(entry.wins) + "–" + htmlEscape(entry.losses) : "";
        return prefix + (entry.url ? seriesLink(entry) : htmlEscape(entry.name)) + score;
    }).join(" · ");
}

function renderSeriesLadderRow(series, now) {
    var current = series.current;
    var you = series.you ? seriesYouHtml(series)
        : current.status === "signups" ? '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(current.url)) + '">Sign up on custom.wl-stats.com</a>' : "";
    return communityLadderRow({ name: series.name, url: series.url, statusHtml: seriesStatusHtml(series), detailHtml: seriesDetailHtml(series, now), youHtml: you });
}

function renderAwpLadderRow(rankings, playerId) {
    var mine = awpStanding(rankings, playerId);
    var you = !playerId ? "" : mine
        ? "You: #" + htmlEscape(mine.rank) + " · " + formatCount(mine.points) + " points"
        : "You: not in the " + htmlEscape(rankings.year) + " race yet";
    return communityLadderRow({
        name: "AWP World Tour",
        url: AWP_SITE + "/rankings",
        statusHtml: htmlEscape(rankings.year) + " race · " + htmlEscape(rankings.rankings.length) + " players",
        youHtml: you
    });
}

// war.app's Community Events page lists the events as client-drawn cards; each card that matches a
// series gets your line in it, at the top right next to war.app's title.
function setupCommunityEventsStanding() {
    var community = null;
    var loading = false;
    var check = function () {
        if (!pageIsCommunityEvents()) {
            return;
        }
        if (!community) {
            if (!loading) {
                loading = true;
                loadCommunityData().done(function (data) {
                    community = data;
                    check();
                });
            }
            return;
        }
        var scene = ujsElement("CommunityEventsScene");
        if (!scene) {
            return;
        }
        addCommunityLaddersStyles();
        $(scene).find("[id^='ujs_EventRow']").filter(function () {
            return /^ujs_EventRow(?:_\d+)?$/.test(this.id);
        }).each(function () {
            var title = $(this).find("[id^='ujs_vert'] .ujsTextInner").first().text().trim();
            markJoinedEvent(this, joinedEventLabel(title, community));
            var box = $(this).children("[id$='_img']").first();
            if (box.length && box.children(".tuydEventStanding").length) {
                // Only when the card's width changed: war.app redraws the scene often.
                var width = Math.round(box[0].getBoundingClientRect().width);
                if (box.attr("data-tuyd-width") !== String(width)) {
                    box.attr("data-tuyd-width", width);
                    fitEventLines(this, box[0]);
                }
                return;
            }
            if (!box.length) {
                return;
            }
            var html = communityEventHtml(title, community);
            if (html) {
                box.css("container", "tuydEventCard / inline-size").append(html);
                // The lines don't wrap, so war.app's own text keeps its room; a cut line shows in full on hover.
                box.find(".tuydEventLine").each(function () {
                    this.title = this.textContent;
                });
                box.attr("data-tuyd-width", Math.round(box[0].getBoundingClientRect().width));
                fitEventLines(this, box[0]);
            }
        });
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
}

// The room a line on an event card has, left of it, beside war.app's own text at the same height:
// from the card's right edge to the end of the furthest war.app text the line sits next to.
function eventLineRoom(line, texts, right) {
    var furthest = texts.filter(function (text) {
        return text.bottom > line.top + 2 && text.top < line.bottom - 2;
    }).reduce(function (max, text) {
        return Math.max(max, text.right);
    }, -Infinity);
    return furthest === -Infinity ? null : right - furthest - 16;
}

function fitEventLines(row, box) {
    if (typeof Range === "undefined" || typeof Range.prototype.getClientRects !== "function") {
        return;
    }
    var texts = [];
    $(row).find("[id^='ujs_vert'] .ujsTextInner").each(function () {
        var range = document.createRange();
        range.selectNodeContents(this);
        Array.prototype.forEach.call(range.getClientRects(), function (rect) {
            texts.push(rect);
        });
    });
    var right = box.getBoundingClientRect().right - 12;
    $(box).find(".tuydEventLine").each(function () {
        this.style.display = "";
        this.style.maxWidth = "";
        var room = eventLineRoom(this.getBoundingClientRect(), texts, right);
        if (room !== null) {
            this.style.maxWidth = Math.max(0, room) + "px";
            this.style.display = room < 60 ? "none" : "";
        }
    });
}

// war.app tells everyone "You can join!" in green; where you already take part, the card says so
// instead, in its own colour.
function joinedEventLabel(title, community) {
    var colors = { in: "#e0c060", signedUp: "#6cc4f0", tookPart: "#babbbb" };
    if (/^AWP World Tour/i.test(title)) {
        return community.rankings && awpStanding(community.rankings, community.playerId) ? { text: "You're in the race!", color: colors.in } : null;
    }
    if (/^Multi[ -]Template Ladder/i.test(title)) {
        var mine = community.mtl && community.mtl.mine;
        return !mine ? null : mine.rank ? { text: "You're ranked!", color: colors.in } : { text: "You took part", color: colors.tookPart };
    }
    var series = community.series.filter(function (entry) {
        return entry.warapp_event && entry.current && title.toLowerCase().indexOf(String(entry.warapp_event).toLowerCase()) === 0;
    })[0];
    if (!series || !series.you) {
        return null;
    }
    return series.you.status === "signed_up" ? { text: "You're signed up!", color: colors.signedUp }
        : series.current.status === "finished" ? { text: "You took part", color: colors.tookPart }
        : { text: "You're in!", color: colors.in };
}

function markJoinedEvent(row, label) {
    if (!label) {
        return;
    }
    $(row).find("[id^='ujs_vert'] .ujsTextInner").filter(function () {
        return $(this).text().trim() === "You can join!";
    }).text(label.text).css({ width: "auto", whiteSpace: "nowrap", color: label.color });
}

// Each card gets the event's standings beside war.app's title and player count, and your place,
// or a link to the full standings, beside "You can join!".
function communityEventHtml(title, community) {
    var lines = /^AWP World Tour/i.test(title) ? awpEventLines(community) : /^Multi[ -]Template Ladder/i.test(title) ? mtlEventLines(community) : seriesEventLines(title, community);
    if (!lines) {
        return "";
    }
    var line = function (html) {
        return html ? '<div class="tuydEventLine">' + html + '</div>' : "";
    };
    return '<div class="tuydEventStanding">' + line(lines.status) + line(lines.detail) + '</div>' +
        (lines.bottom ? '<div class="tuydEventMore">' + line(lines.bottom) + '</div>' : "");
}

function siteLink(url, text) {
    return '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(url)) + '">' + htmlEscape(text) + ' ›</a>';
}

function awpEventLines(community) {
    var rankings = community.rankings;
    if (!rankings) {
        return null;
    }
    var mine = awpStanding(rankings, community.playerId);
    // The race's top 16 qualify for the AWP Tour Finals.
    return {
        status: htmlEscape(rankings.year) + " race · " + formatCount(rankings.rankings.length) + " players",
        detail: siteLink(AWP_SITE + "/rankings", "Rankings: Top 16"),
        bottom: mine ? "You: #" + htmlEscape(mine.rank) + " · " + formatCount(mine.points) + " points"
            : community.playerId ? "You: not in the " + htmlEscape(rankings.year) + " race yet" : ""
    };
}

function seriesEventLines(title, community) {
    var series = community.series.filter(function (entry) {
        return entry.warapp_event && entry.current && title.toLowerCase().indexOf(String(entry.warapp_event).toLowerCase()) === 0;
    })[0];
    if (!series) {
        return null;
    }
    var current = series.current;
    var status = seriesStatusHtml(series);
    // war.app's title often is the edition's name already ("Clan League 19").
    if (current.name && title.toLowerCase() === String(current.name).toLowerCase()) {
        status = status.slice(htmlEscape(current.name).length + " · ".length);
        status = status.charAt(0).toUpperCase() + status.slice(1);
    }
    return {
        status: status,
        detail: seriesDetailHtml(series, Date.now()),
        bottom: series.you ? seriesYouHtml(series) : moreLinkHtml(series)
    };
}

// The card's link beside "You can join!", unless a line above already opens the same page.
function moreLinkHtml(series) {
    var current = series.current;
    if (series.kind === "events") {
        return siteLink(series.url, "All events on custom.wl-stats.com");
    }
    if (STAGED_SERIES_KINDS.indexOf(series.kind) !== -1 && current.status === "running" && current.stage) {
        return "";
    }
    return siteLink(current.url, current.status === "signups" ? "Sign up on custom.wl-stats.com" : "Full standings on custom.wl-stats.com");
}

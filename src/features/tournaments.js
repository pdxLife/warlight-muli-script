function setupUjsPlayerControls() {
    var panel = ujsElement("PlayersTabContents", "_img");
    if (!panel || !ujsElement("PlayersContainer")) return;

    if (!setupUjsPlayerControls.styled) {
        setupUjsPlayerControls.styled = true;
        addCSS(`
        #ujsPlayerToolbar {
            position: absolute;
            top: -52px;
            right: 24px;
            z-index: 100;
            display: flex;
            gap: 6px;
            align-items: center;
            background: #1b1b1b;
            padding: 2px 4px;
            border-radius: 4px;
            pointer-events: auto;
        }
        #ujsPlayerToolbar input {
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid #555;
            background: #222;
            color: #e0e0e0;
            font-size: 13px;
            width: 160px;
        }
        #ujsPlayerToolbar select {
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #555;
            background: #222;
            color: #e0e0e0;
            font-size: 12px;
        }
        .ujs-player-hidden {
            display: none !important;
        }
    `);
    }

    var toolbar = '<div id="ujsPlayerToolbar">' +
        '<input type="text" id="ujsPlayerSearch" placeholder="Search players...">' +
        '<select id="ujsPlayerSort">' +
        '<option value="">Sort by...</option>' +
        '<option value="wins-desc">Most Wins</option>' +
        '<option value="wins-asc">Fewest Wins</option>' +
        '<option value="losses-desc">Most Losses</option>' +
        '<option value="losses-asc">Fewest Losses</option>' +
        '<option value="name-asc">Name A-Z</option>' +
        '<option value="name-desc">Name Z-A</option>' +
        '</select></div>';
    // war.app positions everything from zero-size anchors; the panel's background box is the
    // only element with the panel's real size, so the toolbar goes inside it. Its 54px top
    // border is the strip between the tabs and the list, hence the negative top. war.app sets
    // pointer-events: none on that box, so the toolbar turns it back on to be clickable.
    $(panel).append(toolbar);

    var update = function () {
        layoutUjsPlayers($("#ujsPlayerSearch").val(), $("#ujsPlayerSort").val());
    };
    var searchTimer;
    $("#ujsPlayerSearch").on("input", function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(update, 150);
    });
    $("#ujsPlayerSearch").on("keydown keypress keyup", function (e) { e.stopPropagation(); });
    $("#ujsPlayerSort").on("change", update);
}

function getUjsPlayerRows() {
    return $(ujsElement("PlayersContainer")).children("[id^='ujs_TournamentPlayersPlayer']").filter(function () {
        return /^ujs_TournamentPlayersPlayer(_\d+)?$/.test(this.id);
    });
}

function getUjsPlayerName($row) {
    return $row.find("[id^='ujs_Text_'] .ujsTextInner").first().text().replace(/^\s*L\d+\s+/, "").trim();
}

// Rows are absolutely positioned by war.app. Visible rows, in the chosen order, take the topmost of
// war.app's original positions, so matches don't stay scattered down the list.
function layoutUjsPlayers(query, sortKey) {
    var rows = getUjsPlayerRows().toArray();
    rows.forEach(function (row) {
        if (row.getAttribute("data-tuyd-bottom") === null) {
            row.setAttribute("data-tuyd-bottom", parseInt(row.style.bottom, 10) || 0);
        }
    });
    var originalBottom = function (row) {
        return Number(row.getAttribute("data-tuyd-bottom"));
    };
    rows.sort(function (a, b) {
        return originalBottom(b) - originalBottom(a);
    });
    var slots = rows.map(originalBottom);
    if (sortKey) {
        var parts = sortKey.split("-");
        var dir = parts[1] === "desc" ? -1 : 1;
        var value = function (row) {
            if (parts[0] === "name") return getUjsPlayerName($(row)).toLowerCase();
            return getUjsPlayerStat($(row), parts[0] === "wins" ? "ujs_WinsLabel" : "ujs_LossesLabel");
        };
        rows = rows.map(function (row, i) {
            return { row: row, i: i, v: value(row) };
        }).sort(function (a, b) {
            var cmp = typeof a.v === "string" ? a.v.localeCompare(b.v) : a.v - b.v;
            return cmp * dir || a.i - b.i;
        }).map(function (entry) {
            return entry.row;
        });
    }
    var needle = (query || "").trim().toLowerCase();
    var slot = 0;
    rows.forEach(function (row) {
        var visible = needle === "" || getUjsPlayerName($(row)).toLowerCase().indexOf(needle) !== -1;
        $(row).toggleClass("ujs-player-hidden", !visible);
        if (visible) {
            row.style.bottom = slots[slot++] + "px";
        }
    });
    $(rows[0]).closest("[id^='ujs_Viewport']").scrollTop(0);
}

function getUjsPlayerStat($row, prefix) {
    var val = 0;
    $row.find("[id^='" + prefix + "'] .ujsTextInner").each(function () {
        var match = $(this).text().match(/(\d+)/);
        if (match) val = parseInt(match[1]);
    });
    return val;
}

// war.app draws the tournament page client-side with absolutely positioned labels, so extras sit
// to the right of the "Created by" text instead of flowing into the labels below it.
function currentTournamentId() {
    var match = location.href.match(/\/MultiPlayer\/Tournament\?ID=(\d+)/i);
    return match ? match[1] : null;
}

// war.app opens a tournament from its tournaments list without loading a new page, and draws it
// client-side, so tournament features re-check on every change instead of running once at load.
// apply() must do nothing once its additions are in place, or it would trigger itself.
function whileOnTournament(apply) {
    var check = function () {
        var tournamentId = currentTournamentId();
        if (tournamentId) {
            apply(tournamentId);
        }
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
}

// The labels are absolutely positioned, so extras sit to the right of the "Created by" text
// instead of flowing into the labels below it.
function tournamentInfoSlot(tournamentId) {
    var label = ujsElement("CreatorLabel", "_tmp");
    if (!label) {
        return null;
    }
    var slot = $(label).children("#tournamentInfoSlot");
    if (slot.length && slot.attr("data-tournament-id") !== tournamentId) {
        slot.remove();
        slot = $();
    }
    if (slot.length === 0) {
        slot = $('<span id="tournamentInfoSlot" style="position: absolute; left: 100%; top: 0; margin-left: 8px; white-space: nowrap"></span>').attr("data-tournament-id", tournamentId);
        $(label).append(slot);
    }
    return slot;
}

function tournamentNameFromTitle(title) {
    return stripSiteSuffix(title).replace(/^Tournament:\s*/i, "").trim();
}

function setupTournamentPage() {
    whileOnTournament(function (tournamentId) {
        var slot = tournamentInfoSlot(tournamentId);
        if (slot && slot.children(".tournamentBookmark").length === 0) {
            slot.prepend("<span class='tournamentBookmark'>| <a href='#' onclick='bookmarkTournament(); return false;'>Bookmark</a></span>");
        }
        addTournamentPlayerControls(tournamentId);
    });
}

function setupCustomTournamentLink() {
    var tournaments = {};
    var show = function (tournamentId) {
        var tournament = tournaments[tournamentId];
        var slot = tournament && tournamentInfoSlot(tournamentId);
        if (slot && slot.children(".customTournamentLink").length === 0) {
            slot.append(renderCustomTournamentLink(tournament));
        }
    };
    whileOnTournament(function (tournamentId) {
        if (!(tournamentId in tournaments)) {
            tournaments[tournamentId] = null;
            fetchWlStats(CUSTOM_SITE + "/api/v1/warapp-tournaments/" + tournamentId).done(function (tournament) {
                tournaments[tournamentId] = tournament;
                if (currentTournamentId() === tournamentId) {
                    show(tournamentId);
                }
            }).fail(function (xhr) {
                log("Error loading the custom.wl-stats.com tournament: " + (xhr && xhr.statusText));
            });
        }
        show(tournamentId);
    });
}

function renderCustomTournamentLink(tournament) {
    var link = '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(tournament.url)) + '" title="' + htmlEscape(tournament.name) + '">custom.wl-stats.com</a>';
    var series = tournament.series && tournament.series.name
        ? ' (<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(tournament.series.url)) + '">' + htmlEscape(tournament.series.name) + '</a>)'
        : "";
    return '<span class="customTournamentLink"> | ' + link + series + '</span>';
}

function addTournamentPlayerControls(tournamentId) {
    var panel = ujsElement("PlayersTabContents", "_img");
    if (!panel || !ujsElement("PlayersContainer")) {
        return;
    }
    var toolbar = $("#ujsPlayerToolbar");
    if (toolbar.length && toolbar.attr("data-tournament-id") === tournamentId && $.contains(panel, toolbar[0])) {
        return;
    }
    toolbar.remove();
    $("[data-tuyd-bottom]").removeAttr("data-tuyd-bottom");
    setupUjsPlayerControls();
    $("#ujsPlayerToolbar").attr("data-tournament-id", tournamentId);
}

// A blue button in war.app's style for the tournament scenes' top bars, left of their titles.
function addTournamentButtonStyles() {
    if (addTournamentButtonStyles.done) {
        return;
    }
    addTournamentButtonStyles.done = true;
    addCSS(`
        .tuydPtButton { position: absolute; left: 4px; bottom: 0; height: 28px; box-sizing: border-box; padding: 0 12px; line-height: 22px; color: #fff; font-size: 14px;
            font-weight: 700; text-decoration: none; cursor: pointer; pointer-events: auto; white-space: nowrap;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
            border-style: solid; border-color: #242d9a; border-width: 3px 4px; background: #242d9a padding-box;
            border-image: var(--tuyd-button, none) 15 15 13 fill / 3px 4px stretch; }
        .tuydPtButton:hover, .tuydPtButton:focus { color: #fff; text-decoration: none; filter: brightness(1.15); }
    `);
}

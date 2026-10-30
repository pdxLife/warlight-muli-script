// war.app's Player Search draws each result as a row it positions itself, holding a profile link
// and "L65 <clan icon> tornado #1 <member icon>".
function playerSearchRows() {
    return $("#ujs_ResultsContainer").children().map(function () {
        var link = $(this).find("a[href*='Profile?p=']").first();
        var id = /[?&]p=(\d+)/.exec(link.attr("href") || "");
        if (!id) {
            return null;
        }
        var text = $(this).find("[id$='_tmp']").first();
        var level = /^\s*L(\d+)/.exec(text.text());
        var clan = /\/Clans\/(\d+)\//.exec(text.find("img[src*='/Clans/']").attr("src") || "");
        var line = text.children("span").first();
        var name = (line.length ? line : text).clone().children().remove().end().text().trim();
        return { element: this, id: id[1], name: name, level: level ? Number(level[1]) : 0, clanId: clan ? clan[1] : null };
    }).get();
}

// A tag at the start of a name ("[ BTF] consequence777") doesn't count, so the name still starts with the search.
function playerSearchMatch(name, query) {
    var a = String(name || "").replace(/^\s*[\[(][^\])]*[\])]\s*/, "").toLowerCase();
    var b = String(query || "").trim().toLowerCase();
    return !b ? 3 : a === b ? 0 : a.indexOf(b) === 0 ? 1 : a.indexOf(b) !== -1 ? 2 : 3;
}

function sortPlayerSearchRows(rows, sortBy, query) {
    return rows.map(function (row, i) {
        return { row: row, i: i };
    }).sort(function (a, b) {
        if (sortBy === "level") {
            return b.row.level - a.row.level || a.row.name.localeCompare(b.row.name) || a.i - b.i;
        }
        if (sortBy === "name") {
            return a.row.name.localeCompare(b.row.name) || b.row.level - a.row.level || a.i - b.i;
        }
        // New accounts (L1–2) come after every other match: an exact name is rarely the one you want there.
        if (sortBy === "match") {
            return (a.row.level <= 2) - (b.row.level <= 2) || playerSearchMatch(a.row.name, query) - playerSearchMatch(b.row.name, query) || b.row.level - a.row.level || a.i - b.i;
        }
        return a.i - b.i;
    }).map(function (entry) {
        return entry.row;
    });
}

function playerSearchFilter(row, filters) {
    return !(filters.hideLow && row.level <= 2) && !(filters.clanOnly && !row.clanId) && row.level >= (Number(filters.minLevel) || 0);
}

function readPlayerSearchPrefs() {
    try {
        var stored = JSON.parse(localStorage.getItem(PLAYER_SEARCH_KEY));
        stored = stored && typeof stored === "object" ? stored : {};
        if (typeof stored.hideLow !== "boolean") {
            stored.hideLow = true;
        }
        return stored;
    } catch (e) {
        return { hideLow: true };
    }
}

function savePlayerSearchPrefs(prefs) {
    try {
        localStorage.setItem(PLAYER_SEARCH_KEY, JSON.stringify(prefs));
    } catch (e) {
    }
}

// Moves war.app's own rows into the chosen order, filtered rows hidden, in the slots the rows had.
function layoutPlayerSearch(prefs, query) {
    var rows = playerSearchRows();
    rows.forEach(function (row) {
        if (row.element.getAttribute("data-tuyd-bottom") === null) {
            row.element.setAttribute("data-tuyd-bottom", parseInt(row.element.style.bottom, 10) || 0);
        }
    });
    var slots = rows.map(function (row) {
        return Number(row.element.getAttribute("data-tuyd-bottom"));
    }).sort(function (a, b) {
        return b - a;
    });
    var slot = 0;
    var shown = 0;
    sortPlayerSearchRows(rows, prefs.sortBy || "match", query).forEach(function (row) {
        var visible = playerSearchFilter(row, prefs);
        row.element.style.display = visible ? "" : "none";
        if (visible) {
            row.element.style.bottom = slots[slot++] + "px";
            shown++;
        }
    });
    return { shown: shown, total: rows.length };
}

function playerSearchToolbarHtml(prefs) {
    var option = function (value, label) {
        return '<option value="' + value + '"' + ((prefs.sortBy || "match") === value ? " selected" : "") + ">" + label + "</option>";
    };
    return '<div id="playerSearchTools"><span class="playerSearchLeft">Sort <select name="sortBy">' + option("match", "Best match") + option("level", "Level") +
        option("name", "Name") + option("warapp", "War.app's order") + '</select><span class="playerSearchCount"></span></span>' +
        '<span class="playerSearchRight"><label><input type="checkbox" name="hideLow"' + (prefs.hideLow ? " checked" : "") + '> Hide L1–2</label>' +
        '<label><input type="checkbox" name="clanOnly"' + (prefs.clanOnly ? " checked" : "") + '> In a clan</label>' +
        '<label>Min L <input type="number" name="minLevel" min="0" max="99" value="' + (Number(prefs.minLevel) || "") + '"></label></span></div>';
}

function setupPlayerSearchSort() {
    addCSS(`
        #playerSearchTools {
            position: absolute;
            left: 0;
            width: 663px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 2;
            pointer-events: none;
            color: #aaa;
            font-size: 12px;
            line-height: 20px;
        }
        #playerSearchTools > span {
            display: flex;
            align-items: center;
            gap: 8px;
            pointer-events: auto;
            padding: 0 6px;
        }
        #playerSearchTools label {
            margin: 0;
            font-weight: normal;
            white-space: nowrap;
        }
        #playerSearchTools select, #playerSearchTools input[type=number] {
            padding: 0 2px;
            background: #222;
            color: #ddd;
            border: 1px solid #555;
            color-scheme: dark;
            font-size: 12px;
        }
        #playerSearchTools input[type=number] {
            width: 42px;
        }
        #playerSearchTools input[type=checkbox] {
            margin: 0 3px 0 0;
            vertical-align: -2px;
        }
    `);
    var prefs = readPlayerSearchPrefs();
    var signature = "";
    var timer = null;
    var apply = function () {
        var counts = layoutPlayerSearch(prefs, $("#ujs_NameBox_input").val());
        $("#playerSearchTools .playerSearchCount").text(counts.shown < counts.total ? counts.shown + " of " + counts.total + " shown" : "");
    };
    var check = function () {
        timer = null;
        var container = $("#ujs_ResultsContainer");
        var rows = playerSearchRows();
        if (!container.length || !rows.length) {
            return;
        }
        var now = rows.map(function (row) {
            return row.id;
        }).sort().join(",");
        var label = document.getElementById("ujs_ResultsLabel");
        if (!$("#playerSearchTools").length && label) {
            container.append(playerSearchToolbarHtml(prefs));
            $("#playerSearchTools").css("bottom", (parseInt(label.style.bottom, 10) || 0) - 1 + "px");
        }
        // A new search draws new rows; moving them changes the page too, so only redo it then.
        if (now !== signature) {
            signature = now;
            apply();
        }
    };
    $(document).on("change input", "#playerSearchTools select, #playerSearchTools input", function () {
        prefs = {
            sortBy: $("#playerSearchTools [name=sortBy]").val(),
            hideLow: $("#playerSearchTools [name=hideLow]").prop("checked"),
            clanOnly: $("#playerSearchTools [name=clanOnly]").prop("checked"),
            minLevel: Number($("#playerSearchTools [name=minLevel]").val()) || 0
        };
        savePlayerSearchPrefs(prefs);
        apply();
    });
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 150);
        }
    }).observe(document.body, { childList: true, subtree: true });
    check();
}

function playerSearchTagsHtml(row, known) {
    var tags = [];
    if (known.me && row.id === known.me) {
        tags.push('<span class="playerSearchTag playerSearchYou">You</span>');
    }
    if (known.awp && known.awp[row.id]) {
        tags.push('<a class="playerSearchTag playerSearchAwp" target="_blank" rel="noopener" href="' + htmlEscape(AWP_SITE + "/players/" + encodeURIComponent(row.id)) + '" title="' +
            htmlEscape(known.awp[row.id].points + " points in the " + known.year + " AWP World Tour race") + '">AWP #' + htmlEscape(known.awp[row.id].rank) + "</a>");
    }
    if (known.blocked && known.blocked[row.id]) {
        tags.push('<span class="playerSearchTag playerSearchBlocked" title="On your block list">Blocked</span>');
    }
    return tags.join("");
}

// The player IDs on war.app's block list page.
function parseBlockList(html) {
    var ids = {};
    $(new DOMParser().parseFromString(html, "text/html")).find("li[id^='ListItem_'] a[href*='Profile?p=']").each(function () {
        var id = /[?&]p=(\d+)/.exec($(this).attr("href"));
        if (id) {
            ids[id[1]] = true;
        }
    });
    return ids;
}

function setupPlayerSearchTags() {
    addCSS(`
        .playerSearchTags {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 655px;
            text-align: right;
            line-height: 31px;
            pointer-events: none;
        }
        .playerSearchTag {
            display: inline-block;
            margin-left: 6px;
            padding: 0 6px;
            border-radius: 3px;
            font-size: 11px;
            line-height: 17px;
            vertical-align: middle;
            pointer-events: auto;
        }
        .playerSearchYou { background: #2c5f2c; color: #fff; }
        a.playerSearchAwp, a.playerSearchAwp:hover { background: #e0c060; color: #1b1b1b; text-decoration: none; }
        .playerSearchBlocked { background: #5a1f1f; color: #fff; }
    `);
    var known = { me: null, awp: null, year: "", blocked: null };
    var show = function () {
        playerSearchRows().forEach(function (row) {
            var html = playerSearchTagsHtml(row, known);
            var box = $(row.element).children(".playerSearchTags");
            if (!html) {
                box.remove();
            } else if (!box.length) {
                $(row.element).append('<div class="playerSearchTags">' + html + "</div>");
            } else if (box.html() !== html) {
                box.html(html);
            }
        });
    };
    signedInPlayerId().done(function (id) {
        known.me = id;
        show();
    });
    fetchWlStats(AWP_SITE + "/api/v1/rankings").done(function (rankings) {
        if (rankings && rankings.rankings) {
            known.awp = {};
            known.year = rankings.year;
            rankings.rankings.forEach(function (entry) {
                known.awp[String(entry.player_id)] = entry;
            });
            show();
        }
    }).fail(function (xhr) {
        log("Error loading the AWP World Tour rankings: " + (xhr && xhr.statusText));
    });
    var cached = null;
    try {
        cached = JSON.parse(sessionStorage.getItem("tidyUpYourDashboard.blockList"));
    } catch (e) {
    }
    if (cached && Date.now() - cached.at < 60 * 60 * 1000) {
        known.blocked = cached.ids;
    } else {
        $.ajax({ url: "/ManageBlockList", dataType: "text" }).done(function (html) {
            known.blocked = parseBlockList(html);
            try {
                sessionStorage.setItem("tidyUpYourDashboard.blockList", JSON.stringify({ at: Date.now(), ids: known.blocked }));
            } catch (e) {
            }
            show();
        }).fail(function (xhr) {
            log("Error loading the block list: " + (xhr && xhr.statusText));
        });
    }
    var timer = null;
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(function () {
                timer = null;
                show();
            }, 200);
        }
    }).observe(document.body, { childList: true, subtree: true });
    show();
}

// A profile link or a player ID pasted into the search box opens that profile.
function playerSearchProfileId(text) {
    var value = String(text || "").trim();
    var link = /Profile\?(?:[^#]*&)?p=(\d+)/i.exec(value);
    return link ? link[1] : /^\d{6,}$/.test(value) ? value : null;
}

function rememberPlayerSearch(query) {
    var value = String(query || "").trim();
    if (!value) {
        return;
    }
    var prefs = readPlayerSearchPrefs();
    prefs.recent = [value].concat((prefs.recent || []).filter(function (old) {
        return old.toLowerCase() !== value.toLowerCase();
    })).slice(0, 8);
    savePlayerSearchPrefs(prefs);
}

function setupPlayerSearchShortcuts() {
    addCSS(`
        #playerSearchRecent {
            position: fixed;
            z-index: 2000;
            padding: 4px 0;
            border: 1px solid #555;
            border-radius: 4px;
            background: #1b1b1b;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        #playerSearchRecent div {
            padding: 2px 10px;
            color: #888;
            font-size: 11px;
        }
        #playerSearchRecent a {
            display: block;
            padding: 2px 10px;
            color: #ddd;
            text-decoration: none;
        }
        #playerSearchRecent a:hover {
            background: #333;
        }
    `);
    var search = function (event) {
        var box = $("#ujs_NameBox_input");
        var id = playerSearchProfileId(box.val());
        if (id) {
            event.preventDefault();
            event.stopPropagation();
            location.href = "/Profile?p=" + id;
            return;
        }
        rememberPlayerSearch(box.val());
    };
    document.addEventListener("click", function (event) {
        if ($(event.target).closest("#ujs_SearchBtn_btn").length) {
            search(event);
        }
    }, true);
    document.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && event.target && event.target.id === "ujs_NameBox_input") {
            search(event);
        }
    }, true);
    $(document).on("focus", "#ujs_NameBox_input", function () {
        var recent = readPlayerSearchPrefs().recent || [];
        $("#playerSearchRecent").remove();
        if (!recent.length || $(this).val().trim()) {
            return;
        }
        var box = this.getBoundingClientRect();
        $("body").append('<div id="playerSearchRecent"><div>Recent searches</div>' + recent.map(function (query) {
            return '<a href="#" data-query="' + htmlEscape(query) + '">' + htmlEscape(query) + "</a>";
        }).join("") + "</div>");
        $("#playerSearchRecent").css({ left: Math.round(box.left) + "px", top: Math.round(box.bottom + 2) + "px", minWidth: Math.round(box.width) + "px" });
    }).on("blur", "#ujs_NameBox_input", function () {
        setTimeout(function () {
            $("#playerSearchRecent").remove();
        }, 200);
    }).on("input", "#ujs_NameBox_input", function () {
        $("#playerSearchRecent").remove();
    }).on("mousedown", "#playerSearchRecent a", function (event) {
        event.preventDefault();
        $("#ujs_NameBox_input").val($(this).attr("data-query")).trigger("input").trigger("keyup");
        $("#playerSearchRecent").remove();
        rememberPlayerSearch($(this).attr("data-query"));
        $("#ujs_SearchBtn_btn").trigger("click");
    });
}

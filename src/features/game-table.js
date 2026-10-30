function refreshAllGames() {
    log("Reloading Games");
    ifSettingIsEnabled('scrollGames', function () {
        $("#openGamesContainer tbody").scrollTop(0);
        $("#myGamesContainer tbody").scrollTop(0);
    });
    var dashboard = fetchDashboard();
    refreshMyGames(dashboard);
    refreshOpenGames(dashboard);
    refreshPastGames();
}

function fetchDashboard() {
    return $.ajax({ url: "/MultiPlayer/", dataType: "text" }).then(function (html) {
        return new DOMParser().parseFromString(html, "text/html");
    });
}

function refreshMyGames(dashboard) {
    refreshGameTable("#MyGamesTable", dashboard);
}

function refreshOpenGames(dashboard) {
    refreshGameTable("#OpenGamesTable", dashboard);
}

function refreshGameTable(tableSelector, dashboard) {
    let tableBody = $(tableSelector).children("tbody").first();
    tableBody.fadeTo('fast', 0.1);
    $.when(dashboard || fetchDashboard()).done(function (page) {
        var rows = page.querySelector(tableSelector + " > tbody");
        if (rows) {
            $(rows).find("script").remove();
            tableBody.empty().append($(document.importNode(rows, true)).children());
        }
        updateGameCounts(page);
        rerunDashboardInit(page);
        $(document).trigger("tuyd:gamesRefreshed", [tableSelector]);
    }).fail(function (xhr) {
        log("Error refreshing " + tableSelector + ": " + (xhr && xhr.statusText));
    }).always(function () {
        tableBody.fadeTo('fast', 1);
    });
}

function findGamesAwaitingTurn(root) {
    return $(root).find("#MyGamesTable tr.GameRow").filter(function () {
        return $(this).find("span").filter(function () {
            return /^\s*Your turn\b/.test($(this).text());
        }).length > 0;
    }).map(function () {
        var link = $(this).find("a[href*='GameID=']").last();
        return { id: $(this).attr("gameid"), name: link.text().trim(), href: link.attr("href") };
    }).get();
}

function myGameTurnSpan(row) {
    return $(row).find("span").filter(function () {
        return /^\s*Your turn for\b/.test($(this).text());
    }).first();
}

// How long it has been your turn in a My Games row, in minutes; null when it isn't your turn.
function myGameTurnMinutes(row) {
    var turnText = myGameTurnSpan(row).text();
    return turnText ? parseBootTime(turnText) || 0 : null;
}

function bootMinutesLeft(row) {
    var waited = myGameTurnMinutes(row);
    if (waited === null) {
        return null;
    }
    // war.app's label is the boot time plus your banked time; "Never" means the game has no boot.
    var allowed = parseBootTime($(row).find(".BootTimeLabel").text());
    return allowed === null ? Infinity : allowed - waited;
}

// byWaiting: longest "Your turn for" first, instead of the least time left before boot.
function sortMyGamesByBootTime(byWaiting) {
    var rows = $("#MyGamesTable tr.GameRow").filter(function () {
        return bootMinutesLeft(this) !== null;
    }).get();
    var left = rows.map(byWaiting ? function (row) {
        return -myGameTurnMinutes(row);
    } : bootMinutesLeft);
    var sorted = rows.map(function (row, i) {
        return i;
    }).sort(function (a, b) {
        return left[a] === left[b] ? a - b : left[a] < left[b] ? -1 : 1;
    }).map(function (i) {
        return rows[i];
    });
    var slots = rows.map(function (row) {
        var slot = document.createComment("");
        row.parentNode.insertBefore(slot, row);
        return slot;
    });
    slots.forEach(function (slot, i) {
        slot.parentNode.replaceChild(sorted[i], slot);
    });
}

function setupBootTimeSort() {
    var table = document.getElementById("MyGamesTable");
    if (!table) {
        return;
    }
    var byWaiting = false;
    // war.app's Filter button re-draws My Games without tuyd:gamesRefreshed, so watch the table.
    // The observer is paused while sorting so that moving rows doesn't trigger it again.
    var observer = new MutationObserver(function () {
        observer.disconnect();
        sortMyGamesByBootTime(byWaiting);
        observer.observe(table, { childList: true, subtree: true });
    });
    sortMyGamesByBootTime(byWaiting);
    observer.observe(table, { childList: true, subtree: true });
    ifSettingIsEnabled("sortTurnsByWaiting", function () {
        byWaiting = true;
        observer.disconnect();
        sortMyGamesByBootTime(byWaiting);
        observer.observe(table, { childList: true, subtree: true });
    });
}

// "2d 23h", "4h 10m", "12m"; null for a game without a boot.
function formatBootLeft(minutes) {
    if (minutes === Infinity || minutes === null) {
        return null;
    }
    if (minutes < 1) {
        return "now";
    }
    var days = Math.floor(minutes / 1440);
    var hours = Math.floor(minutes % 1440 / 60);
    var rest = Math.floor(minutes % 60);
    if (days) {
        return days + "d" + (hours ? " " + hours + "h" : "");
    }
    return hours ? hours + "h" + (rest ? " " + rest + "m" : "") : rest + "m";
}

// After "Your turn for …" on each of your games, how long until war.app boots you.
function showBootTimeLeft() {
    $("#MyGamesTable tr.GameRow").each(function () {
        var text = formatBootLeft(bootMinutesLeft(this));
        var hint = $(this).find(".tuydBootLeft");
        if (!text) {
            hint.remove();
            return;
        }
        if (!hint.length) {
            hint = $('<span class="tuydBootLeft" title="Time left before war.app boots you from this game: its boot time, with any banked time, minus how long it has been your turn."></span>');
            myGameTurnSpan(this).after(hint);
        }
        var label = text === "now" ? "· boot is due" : "· boots in " + text;
        if (hint.text() !== label) {
            hint.text(label);
        }
    });
}

function setupBootTimeLeft() {
    var table = document.getElementById("MyGamesTable");
    if (!table) {
        return;
    }
    addCSS(`
        #MyGamesTable .tuydBootLeft {
            margin-left: 4px;
            color: #aaa;
            font-size: 13px;
        }
    `);
    var observer = new MutationObserver(function () {
        observer.disconnect();
        showBootTimeLeft();
        observer.observe(table, { childList: true, subtree: true });
    });
    showBootTimeLeft();
    observer.observe(table, { childList: true, subtree: true });
}

function updateTurnBadge(games) {
    var title = document.title.replace(/^\(\d+\) /, "");
    document.title = games.length > 0 ? "(" + games.length + ") " + title : title;
}

function notifyNewTurns(games, knownIds) {
    var newGames = games.filter(function (game) {
        return knownIds.indexOf(game.id) === -1;
    });
    if (newGames.length === 0 || !("Notification" in window) || Notification.permission !== "granted") {
        return;
    }
    ifSettingIsEnabled("turnNotifications", function () {
        newGames.forEach(function (game) {
            var notification = new Notification("Your turn: " + game.name, { body: siteName(), tag: "tuyd-turn-" + game.id });
            notification.onclick = function () {
                window.focus();
                location.href = game.href;
            };
        });
    });
}

function setupTurnAlerts() {
    var knownIds = findGamesAwaitingTurn(document).map(function (game) {
        return game.id;
    });
    updateTurnBadge(findGamesAwaitingTurn(document));
    $(document).on("tuyd:gamesRefreshed", function (e, tableSelector) {
        if (tableSelector !== "#MyGamesTable") {
            return;
        }
        var games = findGamesAwaitingTurn(document);
        updateTurnBadge(games);
        notifyNewTurns(games, knownIds);
        knownIds = games.map(function (game) {
            return game.id;
        });
    });
    window.setInterval(function () {
        var unattended = document.hidden || !document.hasFocus();
        if (unattended && new Date() - lastRefresh >= TURN_CHECK_INTERVAL) {
            lastRefresh = new Date();
            log("Background turn check");
            refreshMyGames();
        }
    }, TURN_CHECK_INTERVAL);
}

function parseBootTime(text) {
    var units = { second: 1 / 60, minute: 1, hour: 60, day: 1440, week: 10080 };
    var minutes = null;
    String(text).replace(/(\d+)\s*(second|minute|hour|day|week)s?/gi, function (all, amount, unit) {
        minutes = (minutes || 0) + Number(amount) * units[unit.toLowerCase()];
    });
    return minutes;
}

// war.app adds the My Games footer and the Open Games "Show more" row client-side, from the
// #AllOpenGamesData it read at page load. Re-running its init with fresh data restores both.
function rerunDashboardInit(page) {
    if (typeof window.WL_MPDashInit !== "function") {
        return;
    }
    var freshData = page.getElementById("AllOpenGamesData");
    var liveData = document.getElementById("AllOpenGamesData");
    if (freshData && liveData) {
        liveData.textContent = freshData.textContent;
    }
    $("#ShowMoreOpenGamesLink, #RestoreLotteryGamesBtn").closest("tr").remove();
    $("#MyGamesTable > tbody > tr").filter(function () {
        return $(this).find("a[href='PastGames']").length > 0;
    }).remove();
    try {
        window.WL_MPDashInit($("#MyGamesTable tr.GameRow").length);
    } catch (e) {
        log("Error re-running war.app's dashboard init: " + e);
    }
}

function updateGameCounts(page) {
    ["#NumberOfMyGamesLabel", "#MultiDayRadio", "#RealTimeRadio", "#BothRadio"].forEach(function (selector) {
        var fresh = page.querySelector(selector);
        var current = document.querySelector(selector);
        if (!fresh || !current) {
            return;
        }
        if (fresh.children.length === 0) {
            current.textContent = fresh.textContent;
        } else if (fresh.lastChild.nodeType === 3 && current.lastChild && current.lastChild.nodeType === 3) {
            current.lastChild.nodeValue = fresh.lastChild.nodeValue;
        }
    });
}

/**
 * Setups the refresh functionality
 */
function isTypingTarget(element) {
    return !!element && ($(element).is("input, textarea, select") || element.isContentEditable === true);
}

function setupRefreshFunction() {
    lastRefresh = new Date();
    $("a:contains('Refresh (F5)')").text("Refresh (R)");
    var oldRefreshBtn = $("#RefreshBtn, #RefreshBtn2").first();
    if (oldRefreshBtn.length) {
        var refreshBtn = oldRefreshBtn.clone().attr("id", "refreshAll").attr("value", "Refresh (R)");
        // war.app gives some dashboards a Refresh button without its button style.
        if (!refreshBtn.hasClass("btn")) {
            refreshBtn.addClass("btn btn-primary");
        }
        oldRefreshBtn.replaceWith(refreshBtn);
        $("#refreshAll").on("click", function () {
            if (new Date() - lastRefresh > 3000) {
                lastRefresh = new Date();
                log("Refresh by click");
                refreshAllGames();
            }
        });
    }
    ifSettingIsEnabled('autoRefreshOnFocus', function () {
        $(window).on('focus', function () {
            if (new Date() - lastRefresh > 30000) {
                lastRefresh = new Date();
                log("Refresh by focus");
                refreshAllGames();
            }
        });
    });
    $("body").keyup(function (event) {
        // "R" is pressed
        if (event.which == 82 && !isTypingTarget(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (new Date() - lastRefresh > 3000) {
                lastRefresh = new Date();
                log("Refresh by key r");
                refreshAllGames();
            }
        }
    });
}

/**
 * Refreshes Height of Columns
 */
function refreshSingleColumnSize() {
    var sideColumn = $(".SideColumn");
    sideColumn.scrollTop(0);
    if ($(".SideColumn > table:nth-of-type(1)").length > 0) {
        var sideColumnHeight = window.innerHeight - $(".SideColumn > table:nth-of-type(1)").offset().top - 5;
        sideColumn.css({
            height: sideColumnHeight
        });
    }

    $(".leftColumn table").each((key, value) => {
        var gameTable = $(value);
        gameTable.find("tbody").scrollTop(0);
        if (gameTable.find("thead").length > 0) {
            var gameTableHeight = window.innerHeight - gameTable.find("thead").offset().top - gameTable.find("thead").height() - 5;
            gameTable.find("tbody").css({
                'max-height': gameTableHeight,
                'height': gameTableHeight
            });
        }
    });
}

function refreshPastGames() {
    if ($("#pastGamesContainer").length === 0) {
        return;
    }
    let pastGamesTableBody = $("#PastGamesTable tbody");
    pastGamesTableBody.fadeTo('fast', 0.1);
    var div = $("<div>");
    div.load("/MultiPlayer/PastGames #MyGamesTable", function (data) {
        div.find("#MyGamesTable").attr("id", "PastGamesTable");
        div.find("#PastGamesTable thead tr td").html('<h2 style="margin: 0">Past Games</h2>');;
        div.find("#PastGamesTable thead tr td").attr("colspan", "2").css("padding-bottom", "17px");
        $("#pastGamesContainer").html("");;
        $("#pastGamesContainer").append(div);;
        pastGamesTableBody.fadeTo('fast', 1);
        makePlayerBoxesClickable("#pastGamesContainer");
        refreshSingleColumnSize()
    });
}

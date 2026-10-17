// ==UserScript==
// @name Tidy up your Dashboard - Modified 
// @namespace https://greasyfork.org/users/10154
// @grant none
// @run-at document-start
// @match https://*.war.app/*
// @description Tidy Up Your Dashboard is a Userscript which brings along a lot of features for improving the user experience on War.app (formerly Warzone).
// @version 3.17.0
// @author Muli (original author)
// @icon https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/assets/icon.png
// @require https://code.jquery.com/jquery-1.11.2.min.js#sha256-Ls0pXSlb7AYs7evhd+VLnWsZ/AqEHcXBeMZUycz/CcA=
// @require https://code.jquery.com/ui/1.11.3/jquery-ui.min.js#sha256-xI/qyl9vpwWFOXz7+x/9WkG5j/SVnSw21viy8fWwbeE=
// @require https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.21/js/jquery.dataTables.min.js#sha256-/7zo27Ll/hVKhCsE+y8m2SS5bhFPEQFheTCL87HuumA=
// @require https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.21/js/dataTables.bootstrap.min.js#sha256-c0sghAryOuWj4sftUftYNtoAyyI4bahkv1+wopyUhFU=
// @downloadURL https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js
// @updateURL https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js
// ==/UserScript==
window.timeUserscriptStart = new Date().getTime();
window.MULIS_USERSCRIPT = true;
var version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '3.17.0';
var DISABLED_FEATURES_KEY = "tidyUpYourDashboard.disabledFeatures";
// Every domain war.app has used; the old ones now redirect to war.app. Bookmarks saved on any of them open on the current domain.
var SITE_HOSTS = ["war.app", "warzone.com", "warlight.net"];
var TURN_CHECK_INTERVAL = 5 * 60 * 1000;
var AWP_SITE = "https://awp.wl-stats.com";
var CUSTOM_SITE = "https://custom.wl-stats.com";
var WL_STATS_CACHE_MS = 60 * 60 * 1000;
var SERIES_CACHE_MS = 10 * 60 * 1000;
this.$$$ = jQuery.noConflict(true);
window.wlerror = function () {
};
setupImages();

console.log("Running Muli's userscript");
if (pageIsDashboard()) {
    createSelector(".container-fluid", "display: none");
    createSelector("body", "overflow: hidden")
}

setupDatabase();
log("indexedDB setup complete");

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    log("Readystate complete|interactive");

    DOM_ContentReady();
} else {
    window.document.addEventListener("DOMContentLoaded", DOM_ContentReady);
    log("Readystate loading")
}


function removePlayerDataCookie() {
    $.removeCookie("muli_wl_player");
}
function loadPlayerData() {
    let deferred = $.Deferred();
    let cookieValue = $.cookie('muli_wl_player');
    if (cookieValue) {
        try {
            window.WlPlayer = JSON.parse(cookieValue);
            log("Skipping reloading player data " + $.cookie('wlPlayerCacheValid'));
            return deferred.resolve(window.WlPlayer).promise();
        } catch (e) {
            log("Discarding unreadable player data cookie");
            removePlayerDataCookie();
        }
    }

    let $profileLink = $(".dropdown-menu a[href*='Profile']");
    if (!$profileLink.length) {
        log("Profile link not found — user may not be logged in");
        return deferred.reject().promise();
    }

    let player = {
        Name: null,
        PlayerId: null,
        ProfileId: null,
        ProfileToken: [],
        isMember: null,
        OnVacationUntil: null
    }
    let profileUrl = $profileLink.prop("href");
    $.ajax({ url: profileUrl }).done(function (response) {
        try {
            let page = $(new DOMParser().parseFromString(response, "text/html"));
            player.Name = page.find("#AccountDropDown").text().trim();
            player.PlayerId = extractPlayerId(profileUrl);
            player.ProfileId = extractProfileId(profileUrl);
            player.ProfileToken = extractProfileToken(profileUrl);
            player.isMember = page.find("#MemberIcon").length > 0;
            player.OnVacationUntil = getVacationEndDate(page);

            window.WlPlayer = player;

            $.cookie("muli_wl_player", JSON.stringify(player), { expires: new Date(new Date().getTime() + 1 * 60 * 60 * 1000) });
            deferred.resolve(player);
        } catch (e) {
            log("Error loading player data: " + e);
            deferred.reject();
        }
    }).fail(function (xhr) {
        log("Error loading player data: " + xhr.statusText);
        deferred.reject();
    });
    return deferred.promise();
}

function getVacationEndDate(page) {
    let vacationText = page.find("img[src*='Vacation']")
        .parent()
        .contents()
        .filter(function () {
            if (this.nodeType === 3) {
                return this.nodeValue.includes("vacation")
            }
            return false;
        })
        .text()
        .trim();
    let match = vacationText.match(/(\d{1,2}\/\d{1,2}\/\d{4} \d{2}:\d{2}:\d{2})/);

    if (match) {
        return new Date(match[1]);
    }
    return null;
}

/**
 * Extracts the full id of a player. The player id is built as following:
 * - first 2 digits of the profile token
 * - the profile id
 * - last 2 digits of the profile token
 */
function extractPlayerId(url) {
    let match = url.match(/p=(\d+)/);
    if (match != null) {
        return match[1];
    }
    return null;
}


function extractProfileId(url) {
    let match = url.match(/p=(\d+)/);
    if (match != null) {
        return match[1].slice(2, -2);
    }
    return null;
}

function extractProfileToken(url) {
    let match = url.match(/p=(\d+)/);
    if (match != null) {
        return [match[1].slice(0, 2), match[1].slice(-2)];
    }
    return null;
}

if (typeof wljs_WaitDialogJS === 'undefined') {
    wljs_WaitDialogJS = {
        Start: function () { },
        Stop: function () { }
    }
}
var logData = "";

function log(entry) {
    var time = new Date().toTimeString().slice(0, 8);
    logData += `\n${time} | ${entry}`;
}

function logError(entry) {
    var time = new Date().toTimeString().slice(0, 8);
    logData += `\n${time} | ${entry}`;
}

//ctrl+shift+2
$$$(document).keydown(function (e) {
    if (e.which === 50 && e.ctrlKey && e.shiftKey) {
        getLog()
    }
});

window.logDialog = undefined;
window.getLog = function () {
    if (logDialog) {
        logDialog.html($$$('<textarea style="height:100%;width:100%">').val(logData));
        logDialog.dialog('open')
    } else {
        logDialog = $$$('<div style="overflow:hidden">').append($$$('<textarea style="height:100%;width:100%">').val(logData)).dialog({
            width: 800,
            title: "Userscript log",
            height: 400
        });
    }
};
window.onerror = windowError;

function windowError(message, source, lineno, colno, error) {
    logError(`Error on line ${lineno} col ${colno} in ${source}`);
    logError(`${JSON.stringify(error)} ${message}`);

    if (typeof $().dialog == "function") {
        window.wlerror(message, source, lineno, colno, error)
    }
}
function setupMtlProfile() {
    var playerId = location.href.match(/p=(\d+)/)[1];
    var urlParam = "https://www.warlight-mtl.com/api/v1.0/players/" + playerId;
    var url = "https://maak.ch/wl/httpTohttps.php?url=" + encodeURI(urlParam);
    $.ajax({
        type: 'GET',
        url: url,
        dataType: 'jsonp',
        crossDomain: true
    }).done(function (response) {
        var data = JSON.parse(response.data);
        var player = data.player;
        if (player) {
            var mtlStats = '<td><a target="_blank" href="https://www.warlight-mtl.com/player?playerId=' + playerId + '">MTL</a></td>';
            if (player.rank) {
                mtlStats += '<td>' + htmlEscape(getRankText(player.best_rank)) + ' (' + htmlEscape(player.best_displayed_rating) + ')</td><td>' + htmlEscape(getRankText(player.rank)) + ' (' + htmlEscape(player.displayed_rating) + ')</td>'
            } else if (player.best_displayed_rating) {
                mtlStats += `<td> ${htmlEscape(getRankText(player.best_rank))} (${htmlEscape(player.best_displayed_rating)}) </td><td> Unranked (${htmlEscape(player.displayed_rating)}) </td>`;
            } else if (player.displayed_rating) {
                mtlStats += `<td></td><td> Unranked (${htmlEscape(player.displayed_rating)}) </td>`;
            }
        } else {
            var mtlStats = '<td><a target="_blank" href="https://www.warlight-mtl.com/">MTL</a></td>';
            mtlStats += '<td colspan="2">Currently not participating </td>'
        }
        $("h3:contains('Ladders')").next().find("table tbody").prepend('<tr>' + mtlStats + '</tr>');
    }).fail(function (e) {
        log("Error loading MTL profile: " + e.statusText);
    })
}

function setupMtlLadderTable() {
    addCSS(`
        .spinner {
          margin: 100px auto 0;
          width: 70px;
          text-align: center;
        }

        .spinner > div {
          width: 18px;
          height: 18px;
          background-color: #333;

          border-radius: 100%;
          display: inline-block;
          -webkit-animation: sk-bouncedelay 1.4s infinite ease-in-out both;
          animation: sk-bouncedelay 1.4s infinite ease-in-out both;
        }

        .spinner .bounce1 {
          -webkit-animation-delay: -0.32s;
          animation-delay: -0.32s;
        }

        .spinner .bounce2 {
          -webkit-animation-delay: -0.16s;
          animation-delay: -0.16s;
        }

        @-webkit-keyframes sk-bouncedelay {
          0%, 80%, 100% { -webkit-transform: scale(0) }
          40% { -webkit-transform: scale(1.0) }
        }

        @keyframes sk-bouncedelay {
          0%, 80%, 100% { 
            -webkit-transform: scale(0);
            transform: scale(0);
          } 40% { 
            -webkit-transform: scale(1.0);
            transform: scale(1.0);
          }
        }
    `);
    var mtlData = `
    <section class="container" id="mtlData">
        <div class="p-3"> 
            <div class="row bg-gray p-3 br-4">
                <div class="mtlPlayers p-3 " style="flex:1">
                    <div class="spinner mtlPlayerTable-loading" style="min-width:265px">
                    <div class="bounce1"></div>
                    <div class="bounce2"></div>
                    <div class="bounce3"></div>
                    </div>
                    <div class="mtl-content" style="display:none">
                        <a href="https://www.warlight-mtl.com/allplayers" style="float:right;margin-top:5px">Show All</a>
                    </div>
                </div>
                <div class="mtlGames p-3 " style="flex:1">
                    <div class="spinner mtlGamesTable-loading">
                    <div class="bounce1"></div>
                    <div class="bounce2"></div>
                    <div class="bounce3"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>`;
    $(".container:nth-of-type(1)").after(mtlData);
    getMtlPlayerTable(function (table) {
        $(".mtlPlayers .mtl-content").prepend(table);
        $(".mtlPlayerTable-loading").remove();
        $(".mtlPlayers .mtl-content").show();
    });
    getMtlGamesTable(10, function (table) {
        $(".mtlGames").prepend(table);
        $(".mtlGamesTable-loading").remove();
        $("#DashboardLadderTabs-6 .mtlGames table").show();
    });
}

function getMtlGamesTable(numOfGames, cb) {
    var content = $("<div>");
    content.prepend('<h4 class="mb-0 py-3"><a href="https://www.warlight-mtl.com/">Multi-Template Ladder</a>: Recent Games</h4>');
    var table = $("<table>").attr("cellpadding", 2).attr("cellspacing", 0).css("width", "100%").addClass("table table-striped mb-0");
    table.append(`
        <thead>
            <tr>
                <td>Game</td>
                <td>Link</td>
            </tr>
        </thead>
    `);
    table.append("<tbody></table>");
    var urlParam = "https://www.warlight-mtl.com/api/v1.0/games/?topk=" + numOfGames;
    var url = "https://maak.ch/wl/httpTohttps.php?url=" + encodeURI(urlParam);
    $.ajax({
        type: 'GET',
        url: url,
        dataType: 'jsonp',
        crossDomain: true
    }).done(function (response) {
        var data = JSON.parse(response.data);
        var games = data.games;
        $.each(games, function (key, game) {
            var p1 = game.players[0];
            var p2 = game.players[1];
            var winner = game.winner_id;
            var rowData = "<td>" + getPlayerGameString(p1, p2, winner) + "</td>";
            if (game.is_game_deleted) {
                rowData += "<td>DELETED</td>"
            } else {
                rowData += "<td><a href='/MultiPlayer?GameID=" + htmlEscape(game.game_id) + "'>" + htmlEscape(game.game_id) + "</a></td>"
            }
            table.append("<tr>" + rowData + "</tr>")
        });
        content.append(table);
        if (cb) {
            cb(content)
        }
    }).fail(function (e) {
        log("Error loading MTL games table: " + e.statusText);
    })
}

function getMtlPlayerTable(cb) {
    var content = $("<div>");
    content.prepend('<h4 class="mb-0 py-3"><a href="https://www.warlight-mtl.com/">Multi-Template Ladder</a>: Rankings</h4>');
    var table = $("<table>").attr("cellpadding", 2).attr("cellspacing", 0).css("width", "100%").addClass("table table-striped mb-0");
    table.append(`
        <thead>
           <tr>
                <td>Rank</td>
                <td>Name</td>
                <td>Rating</td>
           </tr>
        </thead>`);
    table.append("<tbody></table>");
    var urlParam = "https://www.warlight-mtl.com/api/v1.0/players/?topk=10";
    var url = "https://maak.ch/wl/httpTohttps.php?url=" + encodeURI(urlParam);
    $.ajax({
        type: 'GET',
        url: url,
        dataType: 'jsonp',
        crossDomain: true
    }).done(function (response) {
        var data = JSON.parse(response.data);
        var players = data.players;
        players = players.filter(function (p) {
            return p.rank <= 10
        }).sort(function (p1, p2) {
            return p1.rank - p2.rank
        });
        $.each(players, function (key, player) {
            var rowData = "<td>" + htmlEscape(player.rank) + "</td>";
            var playerLink = getPlayerLink(player);
            var clanIcon = getClanIcon(player);
            rowData += "<td>" + clanIcon + playerLink + "</td>";
            rowData += "<td>" + htmlEscape(player.displayed_rating) + "</td>";
            $(table).find("tbody").append("<tr>" + rowData + "</tr>")
        });
        if (cb) {
            content.append(table);
            cb(content)
        }
    }).fail(function (e) {
        log("Error loading MTL player table: " + e.statusText);
    })
}

function setupMtlForumTable() {
    let title = $("title").text().toLowerCase();
    title = title.replace(/[^a-zA-Z]/g, '');
    if (title.includes("mtl") || title.includes("multitemplate") || title.includes("mdl") || title.includes("multiday")) {
        var mtlContainer = setupBottomForumContainer("mtl");
        getMtlPlayerTable(function (table) {
            mtlContainer.prepend(table)
        });
        getMtlGamesTable(10, function (table) {
            mtlContainer.append(table);
        })
    }
}

function getPlayerGameString(p1, p2, winnerId) {
    var c1 = getClanIcon(p1);
    var c2 = getClanIcon(p2);
    var p1s = c1 + "<a target='_blank' href='https://www.warlight-mtl.com/player?playerId=" + htmlEscape(p1.player_id) + "'> " + htmlEscape(p1.player_name) + "</a>";
    var p2s = c2 + "<a target='_blank' href='https://www.warlight-mtl.com/player?playerId=" + htmlEscape(p2.player_id) + "'> " + htmlEscape(p2.player_name) + "</a>";
    if (p1.player_id == winnerId) {
        return p1s + " defeated " + p2s
    } else {
        return p2s + " defeated " + p1s
    }
}

function getPlayerLink(player) {
    return "<a href='https://www.warlight-mtl.com/player?playerId=" + htmlEscape(player.player_id) + "'> " + htmlEscape(player.player_name) + "</a>"
}

function getClanIcon(player) {
    if (player.clan_id) {
        return '<a href="https://www.warlight-mtl.com/clan?clanId=' + htmlEscape(player.clan_id) + '" title="' + htmlEscape(player.clan) + '"><img border="0" style="vertical-align: middle" src="' + htmlEscape(safeUrl(player.clan_icon)) + '"></a>'
    } else {
        return ""
    }
}

function getRankText(n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function setupBottomForumContainer(className) {
    $("#ReplyDiv").after("<div class='" + className + "'></div>");
    addCSS(`
        .` + className + ` {
                padding: 20px;
                display: flex;
                justify-content: space-between;
        }
        .` + className + ` > * {
           flex: 0.47;
        }        
        .` + className + ` .scroller  {
                max-height: 750px;
                display: block;
                overflow-y: auto;
        }
    `);
    return $("." + className);
}
function setupDatabase() {
    log("indexedDB start setup");
    var db = null;
    var settingsCache = null;

    function request(table, mode, operation) {
        return new Promise(function (resolve, reject) {
            var req = operation(db.transaction([table], mode).objectStore(table));
            req.onsuccess = function (e) {
                resolve(e.target.result);
            };
            req.onerror = function (e) {
                reject(e.target.error);
            };
        });
    }

    function settle(promise, callback, description) {
        promise.then(function (result) {
            if (typeof callback === "function") {
                callback(result);
            }
        }).catch(function (error) {
            log("Database error in " + description + ": " + error);
        });
        return promise;
    }

    function isSettings(table) {
        return table === Database.Table.Settings && settingsCache !== null;
    }
    window.Database = {
        Table: {
            Bookmarks: "Bookmarks",
            Settings: "Settings",
            BlacklistedForumThreads: "BlacklistedForumThreads",
            TournamentData: "TournamentData",
            QuickmatchTemplates: "QuickmatchTemplates"
        },
        Exports: {
            Bookmarks: "Bookmarks",
            Settings: "Settings",
            BlacklistedForumThreads: "BlacklistedForumThreads"
        },
        Row: {
            BlacklistedForumThreads: {
                ThreadId: "threadId",
                Date: "date"
            },
            Bookmarks: {
                Order: "order"
            },
            Settings: {
                Name: "name"
            },
            TournamentData: {
                Id: "tournamentId"
            },
            QuickmatchTemplates: {
                Id: "setId"
            }
        },
        init: function (callback) {
            log("indexedDB start init");
            if (!("indexedDB" in window)) {
                log("IndexedDB not supported");
                return;
            }
            var openRequest = indexedDB.open("TidyUpYourDashboard_v3", 7);
            openRequest.onupgradeneeded = function (e) {
                var thisDB = e.target.result;
                if (!thisDB.objectStoreNames.contains("Bookmarks")) {
                    var objectStore = thisDB.createObjectStore("Bookmarks", { autoIncrement: true });
                    objectStore.createIndex("order", "order", { unique: true });
                }
                if (!thisDB.objectStoreNames.contains("Settings")) {
                    var objectStore = thisDB.createObjectStore("Settings", { keyPath: "name" });
                    objectStore.createIndex("name", "name", { unique: true });
                    objectStore.createIndex("value", "value", { unique: false });
                }
                if (!thisDB.objectStoreNames.contains("BlacklistedForumThreads")) {
                    var objectStore = thisDB.createObjectStore("BlacklistedForumThreads", { autoIncrement: true });
                    objectStore.createIndex("threadId", "threadId", { unique: true });
                    objectStore.createIndex("date", "date", { unique: false });
                }
                if (!thisDB.objectStoreNames.contains("TournamentData")) {
                    var objectStore = thisDB.createObjectStore("TournamentData", { keyPath: "tournamentId" });
                    objectStore.createIndex("tournamentId", "tournamentId", { unique: true });
                    objectStore.createIndex("value", "value", { unique: false });
                }
                if (!thisDB.objectStoreNames.contains("QuickmatchTemplates")) {
                    var objectStore = thisDB.createObjectStore("QuickmatchTemplates", {
                        keyPath: "setId",
                        autoIncrement: true
                    });
                    objectStore.createIndex("setId", "setId", { unique: true });
                    objectStore.createIndex("value", "value", { unique: false });
                }
            };

            openRequest.onsuccess = function (e) {
                log("indexedDB init sucessful");
                db = e.target.result;
                var loadSettings = request(Database.Table.Settings, "readonly", function (store) {
                    return store.getAll();
                }).then(function (settings) {
                    settingsCache = {};
                    settings.forEach(function (setting) {
                        settingsCache[setting.name] = setting;
                    });
                }, function (error) {
                    log("Could not cache settings: " + error);
                });
                settle(loadSettings, callback, "init");
            };
            openRequest.onblocked = function (e) {
                log("indexedDB blocked");
            };

            openRequest.onerror = function (e) {
                log("Error Init IndexedDB");
                log(e.target.error)
            }
        },
        update: function (table, value, key, callback) {
            if (isSettings(table)) {
                settingsCache[value.name] = structuredClone(value);
            }
            var saved = request(table, "readwrite", function (store) {
                return key == undefined ? store.put(value) : store.put(value, Number(key));
            }).then(function (result) {
                log(`Saved ${JSON.stringify(value)} in ${table}`);
                return result;
            });
            return settle(saved, callback, "update " + table);
        },
        read: function (table, key, callback) {
            return settle(request(table, "readonly", function (store) {
                return store.get(Number(key));
            }), callback, "read " + table);
        },
        readIndex: function (table, row, value, callback) {
            if (isSettings(table) && row === Database.Row.Settings.Name) {
                var cached = settingsCache[value];
                return settle(Promise.resolve(cached && structuredClone(cached)), callback, "readIndex " + table);
            }
            return settle(request(table, "readonly", function (store) {
                return store.index(row).get(value);
            }), callback, "readIndex " + table);
        },
        readAll: function (table, callback) {
            var all = new Promise(function (resolve, reject) {
                var items = [];
                var req = db.transaction([table], "readonly").objectStore(table).openCursor();
                req.onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        var item = cursor.value;
                        item.id = cursor.primaryKey;
                        items.push(item);
                        cursor.continue();
                    } else {
                        resolve(items);
                    }
                };
                req.onerror = function (e) {
                    reject(e.target.error);
                };
            });
            return settle(all, callback, "readAll " + table);
        },
        add: function (table, value, callback) {
            if (isSettings(table)) {
                settingsCache[value.name] = structuredClone(value);
            }
            var added = request(table, "readwrite", function (store) {
                return store.add(value);
            }).then(function (result) {
                log(`Saved ${JSON.stringify(value)} in ${table}`);
                return result;
            });
            return settle(added, callback, "add " + table);
        },
        delete: function (table, key, callback) {
            if (isSettings(table)) {
                delete settingsCache[key];
            }
            return settle(request(table, "readwrite", function (store) {
                return store.delete(key);
            }), callback, "delete " + table);
        },
        clear: function (table, callback) {
            if (isSettings(table)) {
                settingsCache = {};
            }
            return settle(request(table, "readwrite", function (store) {
                return store.clear();
            }), callback, "clear " + table);
        }
    }
}
var mapData;

function setupMapSearch() {
    $("#PerPageBox").closest("tr").after('<tr><td></td><td><input id="mapSearchQuery" placeholder="Map Name"><br><button id="mapSearchBtn">Search</button><button style="margin: 4px" id="mapSearchResetBtn">Reset</button></td></tr>');

    $('#mapSearchQuery').on('keypress', function (event) {
        if (event.which === 13) {
            searchMaps();
        }
    });

    $("#mapSearchBtn").on("click", function () {
        searchMaps();
    });

    $("#FilterBox, #SortBox, #PerPageBox").on("change", function () {
        $("#mapSearchQuery").val("");
        $("#searchResultsTitle").remove()
    })

}

function searchMaps() {
    if (mapData == undefined) {
        $("<div />").load('Ajax/EnumerateMaps?Filter=' + '__all' + '&Sort=' + 1 + "&PerPage=" + 2147483647 + "&Offset=" + 0, function (data) {
            mapData = data;
            filterMaps(this);
        })
    } else {
        var maps = $("<div />").html(mapData);
        filterMaps(maps);
    }
}

function filterMaps(selector) {
    var query = $("#mapSearchQuery").val();
    $.each($(selector).find("div"), function (key, div) {
        if ($(div).text().trim().toLowerCase().replace(/(rated.*$)/, "").indexOf(query.toLowerCase()) == -1) {
            $(div).remove()
        }
    });

    var count = $(selector).find("div").length;
    $('#MapsContainer').empty();
    $(selector).detach().appendTo('#MapsContainer');
    $("#MapsContainer tr:last-of-type").html("Showing maps 1 - " + count + " of " + count);
    $("#ReceivePager").html("Showing maps 1 - " + count + " of " + count);
    $("#searchResultsTitle").length > 0 ? $("#searchResultsTitle").html("Searchresults for <i>" + query + "</i>") : $("#ReceivePager").after("<h2 id='searchResultsTitle'>Searchresults for <i>" + query + "</i></h2>")

}
// war.app numbers element ids when it draws a view again in the same page (ujs_CreatorLabel_2_tmp),
// so its elements are looked up by name with an optional number. The newest one wins.
function ujsElement(name, suffix) {
    var pattern = new RegExp("^ujs_" + name + "(?:_\\d+)?" + (suffix || "") + "$");
    var matches = $("[id^='ujs_" + name + "']").filter(function () {
        return pattern.test(this.id);
    });
    return matches.length ? matches[matches.length - 1] : null;
}

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

function mailThreadPlayers(row) {
    return $(row).find(".text-muted").map(function () {
        return $(this).text().trim().replace(/^by\s+/, "");
    }).get();
}

function parseMailRange(text) {
    var match = /Threads\s+(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/.exec(text);
    return match ? { from: Number(match[1]), to: Number(match[2]), total: Number(match[3]) } : null;
}

function filterMailThreads(query) {
    var rows = $("table.region tr[data-threadid]");
    var needle = query.trim().toLowerCase();
    var matches = rows.filter(function () {
        return needle === "" || mailThreadPlayers(this).some(function (name) {
            return name.toLowerCase().indexOf(needle) !== -1;
        });
    });
    rows.not(matches).hide();
    matches.show();
    $("#MailSearchCount").text(needle === "" ? "" : matches.length + " of " + rows.length + " threads");
}

function loadAllMailThreads() {
    var tbody = $("table.region tbody").first();
    var range = parseMailRange($("body").text());
    if (!range || (range.from === 1 && range.to >= range.total)) {
        return $.Deferred().resolve().promise();
    }
    var known = {};
    tbody.find("tr[data-threadid]").each(function () {
        known[$(this).attr("data-threadid")] = true;
    });
    var loadFrom = function (offset) {
        return $.ajax({ url: "/Discussion/MyMail?Offset=" + offset, dataType: "text" }).then(function (html) {
            var page = new DOMParser().parseFromString(html, "text/html");
            $(page).find("table.region tr[data-threadid]").each(function () {
                var id = $(this).attr("data-threadid");
                if (!known[id]) {
                    known[id] = true;
                    tbody.append(document.importNode(this, true));
                }
            });
            var pageRange = parseMailRange(page.body ? page.body.textContent : "");
            if (!pageRange) {
                return null;
            }
            var next = pageRange.to === range.from - 1 ? range.to : pageRange.to;
            return next > offset && next < pageRange.total ? loadFrom(next) : null;
        });
    };
    return loadFrom(range.from === 1 ? range.to : 0);
}

function setupMailSearch() {
    var table = $("table.region").first();
    if (table.length === 0 || table.find("tr[data-threadid]").length === 0) {
        return;
    }
    table.before(`<div id="MailSearch" style="margin: 8px 0">
        <input type="text" id="MailSearchInput" placeholder="Filter by player" style="padding: 4px 8px; width: 200px; max-width: 60%; background: #222; color: #ddd; border: 1px solid #555">
        <span id="MailSearchCount" class="text-muted" style="margin-left: 6px; white-space: nowrap"></span></div>`);
    var allLoaded = null;
    var searchTimer;
    $("#MailSearchInput").on("input", function () {
        var input = this;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
            if (!allLoaded) {
                $("#MailSearchCount").text("Loading all threads...");
                allLoaded = loadAllMailThreads().fail(function (xhr) {
                    log("Error loading mail threads: " + (xhr && xhr.statusText));
                });
            }
            allLoaded.always(function () {
                filterMailThreads($(input).val());
            });
        }, 150);
    });
}

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

function setupBookmarkMenu() {
    var $body = $("body");
    $body.append(`
        <div class="modal modal-500 fade" id="bookmarkMenu" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Add Bookmark</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div class="d-flex flex-column">
                    <div style="padding:10px" class="d-flex flex-column">
                        <label for='bookmarkName'>Name</label>
                        <input type='text' id='bookmarkName'>
                        <label for='bookmarkURL'>Url</label>
                        <input id='bookmarkURL' type='text'>
                    </div>
                     <div class="form-check">
                        <label class="form-check-label">
                            <input id='bookmarkNewWindow' type='checkbox'>
                            Open in new Window
                        </label>
                    </div>
                </div>
              </div> 
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" data-dismiss="modal" onclick='saveBookmark()'>Save</button>
              </div>
            </div>
          </div>
        </div>
    `);

    createSelector(".highlightedBookmark", "background-color:rgb(50, 50, 50);cursor:pointer;");
    $body.append("<ul class='context-menu bookmark-context'><li onclick='editBookmark()'>Edit</li><li onclick='moveBookmarkUp()'>Move up</li><li onclick='moveBookmarkDown()'>Move Down</li></ul>");
    $body.append("<ul class='context-menu thread-context'><li onclick='hideThread()'>Hide</li></ul>");
    bindCustomContextMenu()

}

function setupBookmarkTable() {
    $(".SideColumn").prepend('<table class="dataTable" id="BookmarkTable" style="text-align: left;width:100%;"><thead><tr><td style="text-align: center">Bookmarks<img alt="add" src="' + IMAGES.PLUS + '" width="15" height="15" onclick="showAddBookmark()" style="display:inline-block;float:right; opacity: 0.6; margin-right:15px; cursor: pointer"></td></tr></thead></table><br>');

    refreshBookmarks();
    bindBookmarkTable();
}

function refreshBookmarks() {
    Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
        $("#BookmarkTable tbody").remove();
        bookmarks.sort(function (a, b) {
            return a.order - b.order
        });
        var data = "<tbody>";
        $.each(bookmarks, function (key, bookmark) {
            data += '<tr data-bookmarkId="' + htmlEscape(bookmark.id) + '" data-order="' + htmlEscape(bookmark.order) + '"><td><a ' + (bookmark.newWindow ? 'target="_blank"' : "") + ' href="' + htmlEscape(safeUrl(siteRelativeUrl(bookmark.url))) + '">' + htmlEscape(bookmark.name) + '</a>';
            data += '<a onclick="deleteBookmark(' + Number(bookmark.id) + ')" style="display:inline-block;float:right; opacity: 0.6;cursor: pointer;margin-right:5px">';
            data += '<span class="ui-icon ui-icon-trash"></span></a></td></tr>';
        });

        $("#BookmarkTable").append(data + '</tbody>');
        wljs_WaitDialogJS.Stop();

        $(".loader").fadeOut("fast", function () {
            var $loader = $(".loader");
            if ($loader) {
                $loader.remove();
                window.timeUserscriptReady = new Date().getTime();
                log("Time userscript ready " + (timeUserscriptReady - timeUserscriptStart) / 1000)
            }
        })
    })


}

window.bookmarkOrder = undefined;
window.bookmarkId = undefined;
window.showAddBookmark = function () {
    $("#bookmarkMenu").modal("show");
    window.bookmarkId = undefined;
    window.bookmarkOrder = undefined;
    $("#bookmarkURL").val("");
    $("#bookmarkName").val("");
    $("#bookmarkNewWindow").prop("checked", false);
};

window.editBookmark = function () {
    Database.read(Database.Table.Bookmarks, bookmarkId, function (bookmark) {
        $("#bookmarkURL").val(bookmark.url);
        $("#bookmarkName").val(bookmark.name);
        $("#bookmarkNewWindow").prop("checked", bookmark.newWindow);
        $("#bookmarkMenu").modal("show")
    })

};

function moveBookmark(bookmark, previousBookmark1, previousBookmark2) {
    bookmark.order = (previousBookmark1.order + previousBookmark2.order) / 2;

    Database.update(Database.Table.Bookmarks, bookmark, bookmark.id, function () {
        $("#bookmarkURL").val('');
        $("#bookmarkName").val('');
        $("#bookmarkNewWindow").prop('checked', false);
        refreshBookmarks();
    })
}

window.moveBookmarkUp = function () {
    Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
        var bookmark = undefined;
        $.each(bookmarks, function (key, bm) {
            if (bookmarkId === bm.id) {
                bookmark = bm
            }
        });
        bookmarks.sort(function (a, b) {
            return a.order - b.order
        });
        var previousBookmark1 = bookmarks[bookmarks.indexOf(bookmark) - 1];
        var previousBookmark2 = bookmarks[bookmarks.indexOf(bookmark) - 2] || { order: 0 };
        if (previousBookmark1) {
            moveBookmark(bookmark, previousBookmark1, previousBookmark2);
        }
    })
};

window.moveBookmarkDown = function () {
    Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
        var bookmark = undefined;
        $.each(bookmarks, function (key, bm) {
            if (bookmarkId === bm.id) {
                bookmark = bm
            }
        });
        bookmarks.sort(function (a, b) {
            return a.order - b.order
        });
        var nextBookmark1 = bookmarks[bookmarks.indexOf(bookmark) + 1];
        var nextBookmark2 = bookmarks[bookmarks.indexOf(bookmark) + 2] || { order: 100000 };
        if (nextBookmark1) {
            moveBookmark(bookmark, nextBookmark1, nextBookmark2);
        }
    })
};


window.deleteBookmark = function (id) {
    Database.delete(Database.Table.Bookmarks, id, function () {
        refreshBookmarks();
    })
};

window.saveBookmark = function () {
    $("#bookmarkMenu").hide();
    var $bookmarkURL = $("#bookmarkURL");
    var url = $bookmarkURL.val().trim();
    url = normalizeBookmarkUrl(url);

    var $bookmarkName = $("#bookmarkName");
    var name = $bookmarkName.val().trim();
    var $bookmarkNewWindow = $("#bookmarkNewWindow");
    var newWindow = $bookmarkNewWindow.prop("checked");

    if (bookmarkId === undefined) {
        Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
            bookmarks.sort(function (a, b) {
                return a.order - b.order
            });
            var bookmark = {
                name: name,
                url: url,
                newWindow: newWindow,
                order: (bookmarks.length > 0) ? bookmarks[bookmarks.length - 1].order + 1 : 1
            };
            Database.add(Database.Table.Bookmarks, bookmark, function () {
                showBookmarkTable();
                refreshBookmarks();
            })
        })
    } else {
        var bookmark = {
            name: name,
            url: url,
            newWindow: newWindow,
            order: bookmarkOrder
        };
        Database.update(Database.Table.Bookmarks, bookmark, bookmarkId, function () {
            showBookmarkTable();
            refreshBookmarks();
        })
    }

    $bookmarkURL.val('');
    $bookmarkName.val('');
    $bookmarkNewWindow.prop('checked', false);
};

function normalizeBookmarkUrl(url) {
    return /^(https?:\/\/|\/(?!\/))/i.test(url) ? url : "https://" + url;
}

function showBookmarkTable() {
    var $bookmarkTable = $("#BookmarkTable");
    $bookmarkTable.show();
    if ($bookmarkTable.next().is('br')) {
        $bookmarkTable.next().show();
    }
}

window.bookmarkForumThread = function () {
    var title = stripSiteSuffix($("title").text());
    var url = window.location.href;

    showAddBookmark();
    $("#bookmarkURL").val(url);
    $("#bookmarkName").val(title);
};
window.bookmarkTournament = function () {
    var title = tournamentNameFromTitle(document.title);
    var url = window.location.href;

    showAddBookmark();
    $("#bookmarkURL").val(url);
    $("#bookmarkName").val(title);
};

window.bookmarkLevel = function () {
    var title = $("h1").text();
    var url = window.location.href;

    showAddBookmark();
    $("#bookmarkURL").val(url);
    $("#bookmarkName").val(title);
};

function addDefaultBookmark() {
    var bookmark = {
        name: "Muli's userscript (Tidy up Your Dashboard)",
        url: "/Forum/106092",
        newWindow: false,
        order: 0
    };
    Database.add(Database.Table.Bookmarks, bookmark, function () {
        showBookmarkTable();
        refreshBookmarks();
    })
}

function bindBookmarkTable() {
    $("#BookmarkTable").on("contextmenu", function (event) {
        $(".highlightedBookmark").removeClass("highlightedBookmark");
        var row = $(event.target).closest("tr");


        window.bookmarkId = Number(row.attr("data-bookmarkid"));
        window.bookmarkOrder = Number(row.attr("data-order"));

        if (bookmarkId && bookmarkOrder) {
            event.preventDefault();
            row.addClass("highlightedBookmark");
            // Show contextmenu
            $(".bookmark-context").finish().toggle(100).css({
                top: event.pageY + "px",
                left: event.pageX + "px"
            });
        }

    });
}

function setupLevelBookmark() {
    $("h1").after(`
       <a style="cursor:pointer;color: #5a9da5;" onclick="bookmarkLevel()">Bookmark</a><br>
    `)
}
window.userscriptSettings = [
    {
        id: 'scrollGames',
        text: 'Fixed Window with Scrollable Games',
        selected: true,
        title: 'Dashboard',
        addBreak: false,
        help: 'This option displays My-, Open-, Coin-Games in a scrollable box, which removes a lot of unesessary scrolling. You can find tabs to switch between the different type of games. '
    },
    {
        id: 'hideMyGamesIcons',
        text: 'Hide Icons in "My Games"',
        selected: false,
        title: '',
        addBreak: false,
        help: 'This option hides game icons for My Games on the dashboard'
    },
    {
        id: 'autoRefreshOnFocus',
        text: 'Automatically Refresh Games on Tab-Focus',
        selected: true,
        title: '',
        addBreak: false,
        help: 'This option automatically refreshes your games after switching back to War.app from a different tab / program. This only applies if War.app was idle for 30 or more seconds.'
    },
    {
        id: 'hideCoinsGlobally',
        text: 'Hide Coins Globally',
        selected: false,
        title: '',
        addBreak: false,
        help: 'This option removes everything from War.app related to Coins'
    },
    {
        id: 'useDefaultBootLabel',
        text: 'Use the Default Boot Time Label',
        selected: false,
        title: 'Advanced',
        addBreak: false
    },
    {
        id: 'showPrivateNotesOnProfile',
        text: 'Show Private Notes on Profile',
        selected: true,
        title: '',
        addBreak: false,
        help: 'This option will show you your private notes which you made on a player directly on their profile page. You can find them on the left side under the profile picture.'
    },
    {
        id: 'hideOffTopic',
        text: 'Automatically Hide Off-Topic Threads',
        selected: false,
        title: '',
        addBreak: false,
        help: 'This option automatically hides all off-topic threads everytime you visit the All Forum Posts page'
    }, {
        id: 'hideWarzoneIdle',
        text: 'Automatically Hide War.app Idle Threads',
        selected: false,
        title: '',
        addBreak: false,
        help: 'This option automatically hides all War.app Idle threads everytime you visit the All Forum Posts page'
    },
    {
        id: 'disableHideThreadOnDashboard',
        text: 'Disable Right-Click on the Forum Table',
        selected: false,
        title: '',
        addBreak: false,
        help: 'This option will allow you to right-click forum thread on the dashboard and use the default browser options.'
    },
    {
        id: 'turnNotifications',
        text: 'Desktop Notification When a Game Needs You',
        selected: false,
        title: 'Notifications',
        addBreak: false,
        help: 'While a dashboard tab is open, the script checks your games every 5 minutes in the background and shows a desktop notification when a game becomes your turn. Your browser asks for permission when you turn this on.'
    },
    {
        id: 'useMaakServices',
        text: 'Load MTL Ladder and Community Level Records (via maak.ch)',
        selected: false,
        title: 'Third-party data',
        addBreak: false,
        help: 'Shows Multi-Template Ladder (MTL) ratings and tables, and the community level record count on profiles. This data is loaded from maak.ch, a server run by the original script author, which can run code on War.app while it loads. Leave this off unless you trust that server.'
    }
];

/**
 * Creates the Userscript-Menu
 */
function setupUserscriptMenu() {
    addCSS(`
        /* The switch - the box around the slider */
        .switch {
            position: relative;
            width: 50px;
            height: 24px;
            margin-right: 30px;
            float: right;
        }

        /* Hide default HTML checkbox */
        .switch input {display:none;}

        /* The slider */
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          -webkit-transition: .4s;
          transition: .4s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          -webkit-transition: .4s;
          transition: .4s;
        }

        input:checked + .slider {
          background-color: #0E5C83;
        }

        input:focus + .slider {
          box-shadow: 0 0 1px crimson;
        }

        input:checked + .slider:before {
          -webkit-transform: translateX(26px);
          -ms-transform: translateX(26px);
          transform: translateX(26px);
        }

        /* Rounded sliders */
        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
        .settingsListItem {
            padding-top: 25px;
            font-size: 15px;
        }
        .featureSection {
            margin-top: 20px;
            font-weight: bold;
            color: #C1C1C1;
        }
    `);
    var inputs = '';
    $.each(userscriptSettings, function (key, setting) {
        if (setting.title != '') {
            inputs += `<div class="title">${setting.title}</div>`;
        }
        var help = setting.help != undefined ? `<img tabindex="0" class="help-icon" src="${IMAGES.QUESTION}" data-content="${getSettingInfo(setting.id)}" data-toggle="popover">` : '';
        inputs += '<div class="settingsListItem">' + setting.text + help + '<label class="switch"><input id="' + setting.id + '" type="checkbox"><div class="slider round"></div></label></div>';
        if (setting.addBreak) {
            inputs += '<hr>';
        }
    });
    $("body").append(`
        <div class="modal modal-750 fade" id="userscriptMenu" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Muli's Userscript  ${version}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                ${inputs}
              </div>
              <div class="modal-footer">
                <span class="mr-auto text-muted" style="font-size: 13px">Originally created by <a href="/Profile?p=2211733141" target="_blank" rel="noopener">Muli</a> · <a href="/Forum/106092" target="_blank" rel="noopener">Forum thread</a></span>
                <button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary close-userscript" data-dismiss="modal">Close & Refresh</button>
              </div>
            </div>
          </div>
        </div>
    `);
    if (typeof $().popover === 'function') {
        $("[data-toggle=popover]").popover({
            trigger: 'focus'
        });
    }
    $("#userscriptMenu").on("change", function () {
        console.log("storing settings");
        storeSettingsVariables();
    });
    $("#AccountDropDown").next(".dropdown-menu").append('<div class="dropdown-divider"></div><a class="dropdown-item " href="#" data-toggle="modal" data-target="#userscriptMenu">Muli\'s Userscript</a>');
    $(".close-userscript").on("click", function () {
        location.reload();
    });
    $("#hideCoinsGlobally").parent().parent().after('<button class="btn btn-primary" data-toggle="modal" data-target="#dashboardTableSortMenu" style="margin-top:15px;">Sort Right Column Tables</button><br>');
    addCSS(`
        .userscriptSettingsButtons {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
        }
    `);
    $("#userscriptMenu .modal-body").append(renderFeatureToggles());
    $("#userscriptMenu .modal-body").append("<div class='userscriptSettingsButtons'></div>");
    //Export settings button
    $(".userscriptSettingsButtons").append('<button data-target="#userscriptExportSettings" data-toggle="modal" id="exportSettings" class="btn btn-primary">Export Settings</button>');
    //Import settings button
    $(".userscriptSettingsButtons").append('<button data-toggle="modal" data-target="#userscriptImportSettings" class="btn btn-primary">Import Settings</button>');
    //Reset hidden threads button
    $(".userscriptSettingsButtons").append('<button id="resetHiddenThreads" class="btn btn-primary">Reset Hidden Threads</button>');
    $("body").append(`
        <div class="modal fade" id="userscriptExportSettings" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Export Settings</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                Copy or download this text and save it somewhere on your computer!
                <textarea id='exportSettingsBox'></textarea>
                <a id='downloadExportSettingsFile' href='' download='tuyd_settings.txt'>Download Text-File</a>
              </div>
              <div class="modal-footer">
                <button type="button" data-dismiss="modal" class="btn btn-primary close-userscript">Close</button>
              </div>
            </div>
          </div>
        </div>
    `);
    $("body").append(`
        <div class="modal fade" id="userscriptImportSettings" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Import Settings</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <textarea id='importSettingsBox' placeholder='Copy settings here'></textarea><button id='importSettings' class="btn btn-primary">Import Settings</button>
              </div>
              <div class="modal-footer">
                <button type="button" data-dismiss="modal" class="btn btn-primary close-userscript">Close</button>
              </div>
            </div>
          </div>
        </div>
    `);
    createSelector("#exportSettingsBox, #importSettingsBox", "width:100%; height: 300px");
    $("#exportSettings").on("click", function () {
        exportSettings();
    });
    $("#importSettings").on("click", function () {
        importSettings();
    });
    $("#turnNotifications").on("change", function () {
        if (this.checked && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    });
    $("#resetHiddenThreads").on("click", function () {
        window.undoIgnore();
    });
    getSortTables(function (tables) {
        var tableCode = '';
        $.each(tables, function (key, table) {
            tableCode += '<div class="sortableLadder ' + (table.hidden ? 'tableSortHidden' : '') + '" data-name="' + table.name + '" data-tableId="' + table.id + '">' + table.name + '<div class="tableSortNavigation"><span class="tableSortUp">▲</span><span class="tableSortDown">▼</span><span class="tableSortHideShow"><img src="' + IMAGES.EYE + '"></span></div></div>'
        });
        createSelector(".sortableLadder", "border: 1px gray solid;margin: 5px;padding: 5px;background-color:rgb(25, 25, 25);");
        createSelector(".tableSortNavigation", "display: inline-block;float: right;margin-top: -2px;");
        createSelector(".tableSortNavigation span", "padding: 3px 10px; cursor: pointer");
        createSelector(".tableSortNavigation span:hover", "color: #C0D0FF");
        createSelector(".sortTableHighlight", "background-color: rgb(60, 60, 60)");
        createSelector(".tableSortHideShow img", "height: 10px");
        createSelector(".tableSortHidden", "opacity: 0.2;");
        $("body").append(`
            <div class="modal modal-500 fade" id="dashboardTableSortMenu" tabindex="-1" role="dialog">
              <div class="modal-dialog" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLongTitle">Sort dashboard tables</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div class="modal-body">
                    ${tableCode}
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>                    
                    <button type="button" class="btn btn-primary" data-dismiss="modal" onclick="window.saveTableSort()">Save</button>
                  </div>
                </div>
              </div>
            </div>
        `);
        $(".tableSortUp").on("click", function () {
            $(".sortTableHighlight").removeClass("sortTableHighlight");
            var table = $(this).closest(".sortableLadder");
            table.addClass("sortTableHighlight");
            var prev = table.prev();
            table = table.detach();
            prev.before(table)
        });
        $(".tableSortDown").on("click", function () {
            $(".sortTableHighlight").removeClass("sortTableHighlight");
            var table = $(this).closest(".sortableLadder");
            table.addClass("sortTableHighlight");
            var next = table.next();
            table = table.detach();
            next.after(table)
        });
        $(".tableSortHideShow").on("click", function () {
            $(".sortTableHighlight").removeClass("sortTableHighlight");
            var table = $(this).closest(".sortableLadder");
            table.addClass("sortTableHighlight");
            table.toggleClass("tableSortHidden")
        });
        checkUserscriptMenuButtons();
    })
}

function importSettings() {
    $('.modal').modal("hide");
    var settings;
    try {
        settings = parseSettingsBackup($("#importSettingsBox").val().trim());
    } catch (e) {
        log(e);
        CreateModal("mulisuserscript", "Error", "There was an error importing the settings.");
        return;
    }
    wljs_WaitDialogJS.Start(null, "Importing Settings...")

    Promise.all(Object.values(Database.Exports).map(function (table) {
        return Database.clear(table);
    })).then(function () {
        var additions = [];
        settings.forEach(function (data) {
            data.data.forEach(function (value) {
                additions.push(Database.add(data.table, value));
            });
        });
        return Promise.all(additions);
    }).then(function () {
        window.location.reload();
    }).catch(function (e) {
        log(e);
        wljs_WaitDialogJS.Stop();
        CreateModal("mulisuserscript", "Error", "There was an error importing the settings.");
    });
}

function parseSettingsBackup(backup) {
    var settings = JSON.parse(atob(backup));
    var importableTables = Object.values(Database.Exports);
    var isValid = Array.isArray(settings) && settings.every(function (entry) {
        return entry && importableTables.indexOf(entry.table) !== -1 && Array.isArray(entry.data);
    });
    if (!isValid) {
        throw new Error("Invalid settings backup");
    }
    return settings;
}

function exportSettings() {
    Promise.all(Object.values(Database.Exports).map(function (table) {
        return Database.readAll(table).then(function (data) {
            return { table: table, data: data };
        });
    })).then(function (settings) {
        var settingsString = btoa(JSON.stringify(settings));
        $("#exportSettingsBox").html(settingsString);
        $("#downloadExportSettingsFile").click(function () {
            this.href = "data:text/plain;charset=UTF-8," + settingsString;
        });
    });
}

function getSortTables(callback) {
    var defaultTables = [
        {
            id: "#BookmarkTable",
            name: "Bookmarks",
            hidden: false,
            order: 0
        },
        {
            id: "#MapOfTheWeekTable",
            name: "Map of the Week",
            hidden: false,
            order: 4
        },
        {
            id: "#ForumTable",
            name: "Forum Posts",
            hidden: false,
            order: 5
        },
        {
            id: "#ClanForumTable",
            name: "Clan Forum Posts",
            hidden: false,
            order: 6
        },
        {
            id: "#BlogTable",
            name: "Recent Blog Posts",
            hidden: false,
            order: 7
        },
        {
            id: "#LeaderboardTable",
            name: "Coin Leaderboard",
            hidden: false,
            order: 8
        }
    ];
    if ($("#ShopTable").length > 0) {
        defaultTables.push({
            id: "#ShopTable",
            name: "War.app Shop",
            hidden: false,
            order: -1
        })
    }
    if ($(".dataTable thead td:contains('Quickmatch')").length > 0) {
        defaultTables.push({
            id: ".dataTable thead:contains('Quickmatch')",
            name: "Quickmatch",
            hidden: false,
            order: 1
        })
    }
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "tableSort", function (tableData) {
        if (tableData && tableData.value.length > 3) {
            // war.app no longer has a tournaments table on the dashboard.
            var tables = tableData.value.filter(function (table) {
                return table.id !== "#MyTournamentsTable";
            });
            if ($("#ShopTable").length > 0 && !arrayHasObjWithId(tables, "#ShopTable")) {
                tables.push({
                    id: "#ShopTable",
                    name: "War.app Shop",
                    hidden: false,
                    order: -1
                })
            }
            if ($(".dataTable thead td:contains('Quickmatch')").length > 0 && !arrayHasObjWithId(tables, ".dataTable thead:contains('Quickmatch')")) {
                tables.push({
                    id: ".dataTable thead:contains('Quickmatch')",
                    name: "Quickmatch",
                    hidden: false,
                    order: 1
                })
            }
            callback($(tables).sort(compareTable));
        } else {
            callback($(defaultTables).sort(compareTable))
        }
    })
}

function arrayHasObjWithId(arr, id) {
    var found = false;
    $.each(arr, function (key, val) {
        if (val.id == id) {
            found = true;
        }
    });
    return found;
}

window.saveTableSort = function () {
    var tables = [];
    $.each($("#dashboardTableSortMenu div.sortableLadder"), function (key, table) {
        var order = key;
        var id = $(table).attr('data-tableId');
        var hidden = $(table).hasClass("tableSortHidden");
        var name = $(table).attr('data-name');
        tables.push({
            id: id,
            name: name,
            hidden: hidden,
            order: order
        })
    });
    var tableSort = {
        name: "tableSort",
        value: tables
    };
    Database.update(Database.Table.Settings, tableSort, undefined, function () {
        // A hidden table is removed from the page, so only a reload can bring it back.
        location.reload();
    })
};

function compareTable(a, b) {
    if (a.order < b.order) return -1;
    if (a.order > b.order) return 1;
    return 0;
}

window.getSettingInfo = function (id) {
    var help = "";
    $.each(userscriptSettings, function (key, setting) {
        if (setting.id == id) {
            help = setting.help;
        }
    });
    return help;
};

function checkUserscriptMenuButtons() {
    $.each(userscriptSettings, function (key, set) {
        Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, set.id, function (setting) {
            if (setting) {
                $("#" + setting.name).prop("checked", setting.value);
            } else {
                $("#" + set.id).prop("checked", set.selected);
            }
        })
    });
}

/**
 * Stores User-Settings to local Storage
 */
function renderFeatureToggles() {
    var disabled = disabledFeatures();
    var sections = {};
    toggleableFeatures().forEach(function (feature) {
        (sections[feature.section] = sections[feature.section] || []).push(feature.name);
    });
    var html = '<div class="title">Features</div><p class="text-muted" style="font-size: 13px">Turn individual features off. Changes apply after Close & Refresh.</p>';
    $.each(sections, function (section, names) {
        html += '<div class="featureSection">' + htmlEscape(section) + '</div>';
        names.forEach(function (name) {
            html += '<div class="settingsListItem">' + htmlEscape(name) + '<label class="switch"><input class="featureToggle" data-feature="' + htmlEscape(name) + '" type="checkbox"' + (disabled.indexOf(name) === -1 ? ' checked' : '') + '><div class="slider round"></div></label></div>';
        });
    });
    return html;
}

function storeFeatureToggles() {
    var disabled = [];
    $("#userscriptMenu .featureToggle").each(function () {
        if (!$(this).prop("checked")) {
            disabled.push($(this).attr("data-feature"));
        }
    });
    return saveDisabledFeatures(disabled);
}

function storeSettingsVariables() {
    storeFeatureToggles();
    $.each(userscriptSettings, function (key, set) {
        var isEnabled = $("#" + set.id).prop("checked");
        var setting = {
            name: set.id,
            value: isEnabled
        };
        Database.update(Database.Table.Settings, setting, undefined, function () {
        })
    });
}

function setupSettingsDatabase() {
    wljs_WaitDialogJS.Start(null, "Setting up Muli's Userscript...")

    Promise.all(userscriptSettings.map(function (set) {
        return Database.update(Database.Table.Settings, { name: set.id, value: set.selected });
    })).then(function () {
        sessionStorage.setItem("showUserscriptMenu", true);
        window.setTimeout(function () {
            window.location.reload();
        }, 2000)
    })
}

function ifSettingIsEnabled(setting, positive, negative, cb) {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, setting, function (setting) {
        if (setting && setting.value) {
            positive();
            if (typeof cb == "function") {
                cb();
            }
        } else {
            if (typeof negative == 'function') {
                negative();
            }
            if (typeof cb == 'function') {
                cb();
            }
        }
    })
}
function pageIsOpenGamesPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/OpenGames(?:[?#].*)?$/i);
}

function pageIsPointsPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/Points.*/i);
}

function pageIsDashboard() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/(?:#|\?|$).*$/i);
}

function pageIsProfile() {
    return location.href.match(/^https?:\/\/[^\/]+\/profile\?p=[0-9]+/i);
}

function pageIsLevelOverview() {
    return location.href.match(/^https?:\/\/[^\/]+\/SinglePlayer\/Level\?ID=[0-9]+$/i);
}

function pageIsMapsPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/maps/i);
}

function pageIsForumThread() {
    return location.href.match(/^https?:\/\/[^\/]+\/Forum\/[0-9]+.*/i);
}

function pageIsForumOverview() {
    return location.href.match(/^https?:\/\/[^\/]+\/Forum\/Forum.*/i);
}

function pageIsThread() {
    return location.href.match(/^https?:\/\/[^\/]+\/(Forum|Discussion|Clans\/CreateThread).*/i);
}

function pageIsSubForum() {
    return location.href.match(/^https?:\/\/[^\/]+\/Forum\/[A-Z]+.*/i);
}

function pageIsClanForumThread() {
    return location.href.match(/^https?:\/\/[^\/]+\/Discussion\/\?ID=[0-9]+.*/);
}

function pageIsClanList() {
    return location.href.match(/^https?:\/\/[^\/]+\/Clans\/List/i);
}

function pageIsTournament() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/Tournament\?ID=[0-9]+/i);
}

function pageIsGame() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\?GameID=[0-9]+/i);
}

function pageIsExamineMap() {
    return location.href.match(/^https?:\/\/[^\/]+\/SinglePlayer\?PreviewMap.*/i);
}

function pageIsDesignMap() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\?DesignMaps.*/i);
}

function pageIsCommonGames() {
    return location.href.match(/^https?:\/\/[^\/]+\/CommonGames\?p=[0-9]+$/i);
}

function pageIsCommunityLevels() {
    return location.href.match(/^https?:\/\/[^\/]+\/SinglePlayer\/CommunityLevels/i);
}

function pageIsCommunity() {
    return location.href.match(/^https?:\/\/[^\/]+\/Community/i);
}

function pageIsCommunityEvents() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/?\?(?:[^#]*&)?CommunityEvents=1(?:[&#]|$)/i);
}

function pageIsLadders() {
    return location.href.match(/^https?:\/\/[^\/]+\/Ladders\/?(?:[?#]|$)/i);
}

function pageIsMapOfTheWeek() {
    return location.href.match(/^https?:\/\/[^\/]+\/MapOfTheWeek.*/i);
}

function pageIsMyMail() {
    return location.href.match(/^https?:\/\/[^\/]+\/Discussion\/MyMail(?:[?#].*)?$/i);
}

function pageIsBlacklistPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/ManageBl(?:ack|ock)List.*/i);
}

function addCSS(css) {
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    if (head) {
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);
    } else {
        $$$(document).ready(function () {
            addCSS(css)
        })
    }
}

/**
 * Create a CSS selector
 * @param name The name of the object, which the rules are applied to
 * @param rules The CSS rules
 */
function createSelector(name, rules) {
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    if (head) {
        head.appendChild(style);
        if (!(style.sheet || {}).insertRule) {
            (style.styleSheet || style.sheet).addRule(name, rules);
        } else {
            style.sheet.insertRule(name + "{" + rules + "}", 0);
        }
    } else {
        $$$(document).ready(function () {
            createSelector(name, rules)
        })
    }
}

function setGlobalStyles() {
    /** Warzone **/
    addCSS(`
        body > .container-fluid {
            font-size: 15px;
        }
        .modal-1000 .modal-dialog {
            max-width: 1000px;
        }        
        .modal-750 .modal-dialog {
            max-width: 750px;
        }
        .modal-500 .modal-dialog {
            max-width: 500px;
        }
        .modal-dialog {
            border: 1px gray solid;
        }
        .modal-header {
            background-image: radial-gradient(circle at center,#88888855,transparent),url(https://warzonecdn.com/Images/Warzone/MainNavBacking2.jpg);
            background-repeat: no-repeat,repeat;
            background-size: 100% 100%,194px 194px;
           }   
        .modal-content {
            background-image: linear-gradient(-10deg,#33333322 0%,transparent 70%),url(https://warzonecdn.com/Images/Warzone/Background2.jpg);
            background-repeat: no-repeat,repeat;
            background-size: 100% 100%,10px 15px;
            color: grey;
        }   
        .modal-content a {
            color: #5a9da5;
        }
        .modal-content .title {
            border-bottom: 1px solid #928f59;
            margin-top: 25px;
        }
        .p-4 table {
            width: 100%;
        }
        .GameRow p {
            margin: 0 !important;
        }
        h2, h3 {
            font-size: 25px;
        }
        img[src*='/Images/X.png'] {
            width: 100%; 
            height: 100%;
        }
    `);

    /** Warlight **/

    $("tr:contains('WarLight Shop'), tr:contains('War.app Shop')").closest(".dataTable").attr("id", "ShopTable");
    createSelector('.help-icon', 'display:inline-block;position:absolute; margin-left:10px;margin-top: 2px;cursor:pointer; height: 15px; width: 15px;');
    var winHeight = $(window).height();
    createSelector(".newSetting", "color: gold;font-weight: bold;");
    createSelector(".userscript-menu img", "height: 18px;display: inline-block;position: relative;margin-bottom: -5px;margin-right: 7px;");
    createSelector(".context-menu", "display: none;z-index: 100;position: absolute;overflow: hidden;border: 1px solid #CCC;white-space: nowrap;font-family: sans-serif;background: #FFF;color: #333;border-radius: 5px;padding: 0;");
    createSelector(".context-menu li", "padding: 8px 12px;cursor: pointer;list-style-type: none;");
    createSelector(".context-menu li:hover", "background-color: #DEF;");
    createSelector("#MyGamesTable thead tr", "text-align: right");
}

function loadDataTableCSS() {
    var styles = document.createElement("style");
    styles.type = "text/css";
    styles.innerHTML = getDataTableCSS();
    document.body.appendChild(styles);
}

function getDataTableCSS() {
    return `table.dataTable thead td,table.dataTable thead th{padding:6px 18px 6px 6px}table.dataTable tfoot td,table.dataTable tfoot th{padding:10px 18px 6px;border-top:1px solid #111}table.dataTable thead .sorting,table.dataTable thead .sorting_asc,table.dataTable thead .sorting_desc{cursor:pointer}table.dataTable thead .sorting,table.dataTable thead .sorting_asc,table.dataTable thead .sorting_asc_disabled,table.dataTable thead .sorting_desc,table.dataTable thead .sorting_desc_disabled{background-repeat:no-repeat;background-position:center right}table.dataTable thead .sorting{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_both.png)}table.dataTable thead .sorting_asc{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_asc.png)}table.dataTable thead .sorting_desc{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_desc.png)}table.dataTable thead .sorting_asc_disabled{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_asc_disabled.png)}table.dataTable thead .sorting_desc_disabled{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_desc_disabled.png)}.dataTables_wrapper{position:relative;clear:both;zoom:1}#PlayersContainer td{white-space:nowrap}

    .dataTables_filter {
	float: right;
    }

    .dataTables_filter label {
        display: inline!important;
    }    

    .dataTables_filter input {
        padding: 3px;
        border-radius: 5px;
        margin: 5px;
    }

    .dataTables_info {
        clear: both;
        padding-top: 10px;
    }

    .pagination {
        display: inline-block;
        float: right;

    }
    #foundClansTable_wrapper .row {
        width: 100%;
    }
    .paginate_button {
        display: inline;
        padding: 5px;
    }.paginate_button.active {
        text-decoration: underline;
    }`
}
function domRefresh() {
    $("body").hide(0).show(0);
    $(window).trigger('resize')
}

function htmlEscape(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function safeUrl(url) {
    var value = String(url == null ? "" : url).trim();
    return /^(https?:\/\/|\/(?!\/))/i.test(value) ? value : "#";
}

function hideTable(selector) {
    $(selector).closest("table").remove()
}

function browserIsFirefox() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') > -1
}

function setupImages() {
    window.IMAGES = {
        EYE: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAUCAYAAADlep81AAAAAXNSR0IArs4c6QAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeGVYSWZNTQAqAAAACAAEARoABQAAAAEAAAA+ARsABQAAAAEAAABGASgAAwAAAAEAAgAAh2kABAAAAAEAAABOAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAJKADAAQAAAABAAAAFAAAAAC4oG9NAAAACXBIWXMAAAsTAAALEwEAmpwYAAADH0lEQVRIDa2WS0hWQRTHuy6KKKOSMnu4theYJYgRX/SmB21qEQSFLVxkREgFRUEtW0hQRFBRC2tRm0LMoOj9IiGKHiBkYWQZFZGImalfv/91Rqe5k35oB37fOfM/M/eeO3dm7heNGKKl0+lChk4cYPiTKIraBsgHU1FQDYgUUIxcBJtNej5+tIlD7hXid2iCanhIga344RmFlMJF6IDhWAODd8CEIVXEwBRcht/g200EMZh1BTo0olVC8HUHXxmdy3iKU5DlPM0N4no4D6+NfgX/BbpNWy4fVpr2W/wBWAXLYQpYu0+wkdfYYoWEp5BcuA7dYO0DwSFIFI82DhbBBofpxCn4BLLboH55cBJc+0ijPFGIBBI5UO/2Jj4Gk4MDjEj+gTemhXYZzIH3Jldj7hHRTkGz0eV6IFkU4n5lHatyC0FfB9thmqevRXNnlGZsW/hNgXKdUGLHEReCLZYw3QQzbF6zs1OqY0f7kgToeg32qRYT6xXNhFHqhw8tcN1Q4+6AzK6r+NK0NYOflTD2Ap+ji+WD1ok1JfxZWGqT+BLQTdrgKWyC1fATfNORcdWItXElzg/6PnCPk9PaRQXgFlDDym92xins8drttMfAPLgAR0C7zTeNs5sh20/SPgvfHH2bCtIWfu6I8YJ02gp/QafR5Eea2LrZBP1rwKq9vss0f/wtx609/E41uvr1LhWmbaGZVuv0/vWtio04Cx6b5EG8TtzBrJEORaAFK9NZ1Ge0q2K1/6fOTUboFaAtaE2LeIHtRLzbJLStZ8Fd0/6X09o6bJLv8Hm6Fl730nHimo6b5AwjloO7hXXzZaAZygY9tewEzIW9YGeAMB5bi18D2o1fQVZhiskj9g/HR2i59sETnmQZuEXRTJ+BAtgKrSDTzlwCxbDesAKv4+A4WKsjUPHaifb0trl7BJMSRfgCnVJwC3y7hnDJEzWL5wzKu/aGhmbEnmE2pw92JQQ/sH49cZvO40GLtwFcc9eZq4dif6Y76KS/MqXBm2YiMlgfRq0tTW87DMVeMqga9Cfv/xkX1DdI6+YZZGK76KT+YzOt4g/tMcO6R7Vx2QAAAABJRU5ErkJggg==',
        EYE_ICON: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAABGWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGBSSCwoyGESYGDIzSspCnJ3UoiIjFJgf8XAxcDLIMogxWCWmFxc4BgQ4MMABDAaFXy7xsAIoi/rgszClMcLuFJSi5OB9B8gzk4uKCphYGDMALKVy0sKQOweIFskKRvMXgBiFwEdCGRvAbHTIewTYDUQ9h2wmpAgZyD7A5DNlwRmM4Hs4kuHsAVAbKi9ICDomJKflKoA8r2GoaWlhSaJfiAISlIrSkC0c35BZVFmekaJgiMwpFIVPPOS9XQUjAyMzBgYQOEOUf05EByejGJnEGIIgBCbI8HA4L+UgYHlD0LMpJeBYYEOAwP/VISYmiEDg4A+A8O+OcmlRWVQYxiZjBkYCPEBav9Kfqb50DUAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOgAAFIIAAEVWAAAOpcAABdv11ofkAAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAIqADAAQAAAABAAAAIgAAAAAhsoNuAAAGHklEQVRYCcWXaUxcVRTHZ4bZYIAitCRQW0LB2GZkEdm3FA0xjQkpy6fahDRB49JGozFNjF+ssYlWTeMHo8ZoYgzVNhZIK9o0asu+FU0/tKkkWuKASKACwzAwbP7O7Tw68wZRPzC85M59796z/M//nHPfG6NhC6/u7u59ERERl1ZWVqJMW4Wjs7MzzWQyfWm1WneBwbolQASExWJpcjgcmQsLCyOrq6s15nAzooGIiorKmJubGyEttUVFRb1hZUQPYnFxsVpACBnGcDGiB7G8vKyY0PyHhZFAEF6v1xXIRNiABIKgJkbn5+frSkpK+jUA2vy/U9PR0RFjNBoTzWZzMoW2g3PAwix2vKxLB4zFxMSMO51Onw7ECDLV+fn5ISAEzH8C0tXVlU7PP86owFE2IwmnkYBhumuCNcPS0tIi8yxrtwF3nTk3OjraKd1Bm9aWlZWpwhTH+mtDIERfyIFzFKUn6Ps47g3kWBy6WYtmBOkLKBmwZAC0GnJOIPePTLCnriBD2iIMxGPsdYw20O92cS4OqPQWHJwGiOyfIXqrMLHeJaBhZYTCVN3R29tbxtph2DlJjQzrdUK6pr29PQvKLwHgKCzYPR7PTwDwMqYAcywvL+8KcxFGNwSBvMvn89XIOUFge9FpstlsT2PzR94x+zcEgkCO3W5vAUQu1T1DNC/AwDMAkxP4GoX2+8DAgAWjj+FIb0s940iYG+Whtri4uI+CTYGZaOycmp2ddWM/FTabenp6KgMNrDECdSJwDsEUUjEMiCocv4/RXQCzoCS5NrjdbgdTAsblMejyp0OdEzCnQMBCC3Hszc3NfQtbVdTMMD7i8NUImEc0AwpIa2urjVx/hMM9gBhj1BDNVb+QgDCwHyVzQkKCERB2fW1oTEhNCBPSaQC7EBkZmYXakuiSpiuk6yBsuwCznaWPYXib7Ckg8fHxDWxUIrBAIR4pLy8flE25oHQUYFKR2dCcODMzk0hqPAy1Lz+BTGggYKGJIS82SZV0mboo1J8Joh5fHgLPYe9F2TBRnPcxvyJlQDQfYOg7peH/oVhvsD4GoHRkuhi9gEjBgJLQM0HLP4hMM+sPoScgZgjuRqDNgoKCHwDzrqzB7vPoJJtQeknqgkIaRvlkoILcV1RUTDBJxQs78jGzDSOKST0T5DwTuYvYdFILiil0L8PwbeagixS9A1s3YWUH8m+YiC5HaMaBkc24IOl7D6cxPCFyWpHqmRAQ2GimCNOxow4zGPHy/DZ6IYcNQcQhr30P7TMhfJh8DfC1tBtkZ6Xd7vm/e1dYWDgEvc/x5BYwwgSUq+6QmqDjsnAoNZGqgeBeQL8m3aO3RyHvZO0rjv8H8N2PbJWJ8/8voq2X1ADmYSJtRjBDrwyAfsDcIY3qnCAA6aw+mCgksosA2SM14U8heHyvUgvv6e1Iy+KjFRBF1N9N0vwkrT2xVvo4FxBfk7NUBMYQOM458gUAVmixNBg4TyvKN6YLQHVyYmK0AgDn0YkTJhjzyF9l/xQgvw8EMTQ0ZJucnGwA9AlAxOPjGowdAuwvIrcGRB6oXie0f4rhfCk2IvyW5c8Zx3m1Z6M8ytpB7XsCIJWAL8GxGeC/IjdAGq8zr10EKG/pAyy8DFvFyBmwfRadY9gZ1wSDgMiitDNgToD8KQzYUDDgTKIdgRX1AsMYgYcWoGZUDimidSJXyajBXqaklECGsfcmYD/R64cA0Yzx3qkCSCPDAQD5nqgWJijMQ6w9CzN/4OQ3DI7j1ArwWJ7v53knIw07u2NjY+WTQT4dXDx/RjAflpaWynso5NLaJ2gDymMxdgQmHBoTfhCPUhPyKpBvkXUvwEjk0jFj09PTfci3cP8NLPy5roJ/MQQItG5HsZEOqiQS+Z5QTIg8B9AgtXJgamoqAwbScZoMYDvykisPIi7WpVZusXfr35yLTe0KSo0fxDmqej/tvFYTmvBmzuqoFgdtbW1J0qIwoUAIE9qfn80EoNmOkJvBwcFkpiZoLya/igk5rDShcMwRcnaQzzOAKKAG5NhWJ2Y4nAf6oBPNlzkxk2DCRYvWceSv+78jUGkz7qVGrLToHVip3+h/x2Y4D7T5N9q5xw15GyfaAAAAAElFTkSuQmCC',
        EYE_ICON_HOVER: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAABGWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGBSSCwoyGESYGDIzSspCnJ3UoiIjFJgf8XAxcDLIMogxWCWmFxc4BgQ4MMABDAaFXy7xsAIoi/rgszClMcLuFJSi5OB9B8gzk4uKCphYGDMALKVy0sKQOweIFskKRvMXgBiFwEdCGRvAbHTIewTYDUQ9h2wmpAgZyD7A5DNlwRmM4Hs4kuHsAVAbKi9ICDomJKflKoA8r2GoaWlhSaJfiAISlIrSkC0c35BZVFmekaJgiMwpFIVPPOS9XQUjAyMzBgYQOEOUf05EByejGJnEGIIgBCbI8HA4L+UgYHlD0LMpJeBYYEOAwP/VISYmiEDg4A+A8O+OcmlRWVQYxiZjBkYCPEBav9Kfqb50DUAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOgAAFIIAAEVWAAAOpcAABdv11ofkAAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAIqADAAQAAAABAAAAIgAAAAAhsoNuAAAG+ElEQVRYCcVXa2wUVRSeuTuzO7MttSCQAEJTqAqplIdEAYPQlrYhxgYK8QeSEBIU290tjYaQGH9UjBBEm7Lbh2uMJsagQGRprAiWttQoEQpo+AFBE6SxrRVIVcq+5ul3pp1muiVVE1ombO887jnnu9/5zrkXnnuAV0d9/QKT508ZhuFlDwpHazA4z+S4z92CMJvnefcDAUIgXC5XxCtJeUlV7dF1vYyfaEYcIBbGkskepGVjgd9/bkKBpILQTHPDWp+vk8iYsNSkgiAmbBATBsQJIq4o3cQEpcMpi3FPjRNELJHoNUyzLBUEAfrfQJr275+ULsvTUXozmcs1DQ5E3TR55DjOm2YPZ5p9t/r7b75QXa2MAAFhOjXhZOM/A2mvr89BgBIY5APAYowzUPuy4HJhGFwLcs7phqFi3l2O52+YpnkZc5elS1Iu0tGTVJSNJVVVI9LhBDMmIy3B4HK3KPoR5Dk0nkxRELiEonCaYQwgYDocjbAnUPSCMca58KOR+gTmblgzVB3O4M77EY7sDydraqZ4RPFN3uXaLns8UiKZxCJ5WnETZxi1JmNTGM9/hlW78bPNRowEGgvoSaA6SiDMM8HgKpfbvUXRtL2Ffn/XiMl4GFW+bcHgIlmWT3ll2Q/qJQjsRwCIo/v9hcmB/EDgDNCvQKCxQZhmt6ZpZQSiPRSazwlCRHK7XxYYa8fzmjGBtNbVLWWC0ASDZUjBHUVVd4LiVwBIwLovrvb5fguHwyJWWghgqb6s5yEmejVV3VhYWXkePrNUjksH+APRRGLA43Zn84xFTtfVFTkdDDPSEQplQ3pHkYqseDLZpWtaKcosiFXNxjsRee4hw8disTSk6eF7pYRAoIKIiQ02COwpTQgyf3VFxX5V10uR5i7J48kEM4dOHTz4pA3GAnIiGPQYPB+WJWluPJHoQyrKCiorO2gSgopDo5dGwePhwY6UqgybCX2ICao0LOzLNI9nEcSikW0R0qpw3HqA6cbipoou1wcXwuGH6JsFRGZsOygrwoQkAmyDmC7RR7oMjutF+ZEkF3/f2DhdVZTp6BdRUD18WSAcTBAILCCC97SxcThzDNiTi32+n7DQrWA9it136YCmVdE31tzQMBlBdlG5Ie8N+T7fSduIxpgoXkG++1CKOUldPwvRnQNNWXBmTbNA6PqwJtpqax/Hh+PQ1ROqpnGart8B21esyUN/CgOBNujsPaQb/0zfd6HQTCYbxqsQZxaE1MUnk3udBnT//I4dt9EQIugn1BvmoWyJSotJAmFpQtctTZxuaMhjbnczKM+F0DmyAXMtxX7/DfLlvNyy/C5YuYrY0xSef4th4lKagBXznCxnOifb9xBfraIot6mXYK+wXttM2JogEIJpEhM56BVWM1NVNY7nd2A3aGQ7xKgnEpmoHoFe4eMCJjK2BaV6AfmaA1BHqNwc863b4p07f0EqKvAwQGAsJnS9G7RbTFDvgaIjgiBkExN2Z9V5/o1ny8vPp/prbWychcQeTpOkR9F5O5kolrJVFRV/Il9bo/F4F5rYEtB/vCUUWphqjFV2QkP96LjUMXtRBmVUou0NDctdotiM4HNJE/Qd9wruXy+oqKhJ9dOGkhUM4wQ2zhWQw1WmaS/mI/3D4se+sgT7yRco4exYPN6HD7vbb936tLq62qBdFKs9hsrKo9IzVHVTATaw0/X1+SLPHwObmVgZh+AJaKgD9wfAYqsTBLUIWRC2Q1x7sOApiHFRNYzNa/3+n2neMBB6aKupyWWS9BFq/CmiGNR/DTF+AuPdWMFiiKtXNc319snqDLoj9qNnoCEBKbtuaNqFtVVVl8mXfZ2tqZETHs86AHwNbK2kRphQ1SNqLBYo2bXrpj1vBBB62bxv3+S0jIw9cPwS1O8BGEsTSM3wQRfO8Hm0AG2nLWhSoDwXCyiCEMvgJw/VwVH6kd63CwKBD1PtRwGxnbWFQqU4+ByCkzS05uFDDd5vFkWxHIz9DuNfDcZussFdOAO2j2DlsxB8HgLNmeT1EquclU6O+xjHh/eLA4FeO4ZztMrH+YLufwgGM+KMbYNm0oiJoUNNZ2soVOAShDBSl45fqpmVZypv6qYQdN/daPQ8wDYhdV8hZX+MMnC8GAWkPRyeGte0Q9BEEY4AFhM4WQ0e+TXtEs4U6/6ORhciQA5+M9FlJWqPGKOI3o3ecB26umZq2rV/C+7AMVKsBIJT1aPpXu8alFaPgeMdVYfTYLzusajB69tweAa2/sNgYhWBGOuga9vcz9FFzr7BpoMdNQIQKy0mcLzDDjyqI97PwKm+WFtdXS6aQCRNlp+GyO75n59Uo/F4pkbUgkYzA52uG4rfhE5nCXM8go3lExum6UZr7tcZ21pYXj4hwrwXoH8AK1jLr8C3vZYAAAAASUVORK5CYII=',
        QUESTION: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeGVYSWZNTQAqAAAACAAEARoABQAAAAEAAAA+ARsABQAAAAEAAABGASgAAwAAAAEAAgAAh2kABAAAAAEAAABOAAAAAAAAAwwAAAABAAADDAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAABguP1VAAAACXBIWXMAAHf1AAB39QG+gBuGAAADrElEQVRYCb2XzUtUURiHZ0pTCFEKgjAQo2iRH+QiBEUXbQq1P6D+gShxqRGBi1pUzCJatRFpVQvBTUg7wYQIRKLPZWhtooWafYHZ9Pyu972893rvnZmCXnjmvOf9OmfmnnvOmUKhBimXyy0wCGOwBibSZRuElhpKVhdK0T6YglWoJIpRbF911XOiKNINM7AFSZFtMyTLr9zunCGyXSTqJ/0CXl7SuQPnoQPaQqTLJp9ivKjGWPZIKR4SSr4C+iKMwL6U8JhJMWGscryUYoFpHaKL4Af/Tn8cKg6crKecMPcnrYlqF5OxUR/nqEXSrsO5yOkU7I1wFHpCjjh3TMU/DP6NuRILsA5BnaBFJfkBZ81nLTbF3IO38A22QzTZeRixWN9iHwL7JTbQO7w/0DHOgsn4rgAMOK9ZQEart+FiRu6Ey5mNxeDoBXuVnqGnPnPsHaBvnScrOHdtRti0JlRborF6o0nQmQaJig9FjoSCT0Vm4Dr0wwA8hKSkbkIE6VHYF5gOymNoho8geQ31iXFjXfyxVUy/FbQevAzEksIOAfWgMSQas3kPvi5oDWPmisXiVqinNvjLCcdx+g3Oton+3vUjNaw9Fxo0Zpcm0BNFFAoLTq+o8g0aCboBe13wIwb64PpJ9akz9Ghl6xWSaGGcdM6KKvF3lejkHfqhvET8XWALfl0TMPmK0p6X7H3Eamv+bcm0n+GUj0nTiWkHjRXIX02ATC2m5zslgk9N5ELagEkbcbsmUPMjoMgJsJ0NtbwEfh0kx436xMUegRbhZOito632ERwk1q/8Fyy87bBOpaaNAI0lmZSyHKg7H3p/H7t+lrqK4yboldU3X4Jqpd8FLmsN1LQRWTJ5++E0HDZbpZbYBngDkmAjCnLoTMuC5G7FNgBxZ8B2T52gl82X1xKno9nenOkoFmNVh5ESiNWlZR68fKJzICqYouDPPozCwv44nkipEZgoVAf2M6IGovuDFlem4M8+jpVFgL+Q6BXLOxV1KfGiY9a/FbGJ4PMXEj2yzliAdXCMgskayrD5fIu9CW7DAjyAY97vdXx67qplMur9MZ0IPd+SRdLql/h/l1KbTWISms8iaO9PvSlZnlpidGHVfwTleCn5ONNjlwszqiXzEs0taFY/lFe0T2ARVkBnv6QJtAi1yegm3QEmGyhX2Snvm6Hqlklo354BOz5RI/mFppuQkJ4U5ShXF55/E4r0wRT83z+nyWkzgRYYhDHwK1u6bIOw60acrOP7fwAawRQpHCf63QAAAABJRU5ErkJggg==',
        PLUS: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeGVYSWZNTQAqAAAACAAEARoABQAAAAEAAAA+ARsABQAAAAEAAABGASgAAwAAAAEAAgAAh2kABAAAAAEAAABOAAAAAAAABuwAAAABAAAG7AAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACi3Qz1AAAACXBIWXMAARCEAAEQhAE/RUVgAAABbUlEQVRYCe2Xu0oDURCGPRo0oFgErKzsfAPBh0jrU1iKL2Fr4VMIgp2dD6GlhaRMIUm8RY/fv8rKCXtuZtdA2IEpZs4/lx1mfhKzkinW2g4hfXRvJnSAfWmMeZnx12vSwAnqk7N6q1Vko/Ktrzr+O1QTSpbVZGQa0AIzadBvVN0N5NQusG0D7QSWcgKfOadQkgYEskbgekJwaGrigE1yvUfyTKHsAlOQBgFHBJyi25FAPe+iXQ/uDf8jKkIKyYTHc5q4MBTvYdyjO6GIBt5eybmvceqrtxooEEu5AaCnBjSurMWJZU58V10bWqjEPPPB1IAWcRGNqK5R4Sd0hP63aAmHHU5hyCUcYyziDB8KHtCn00QqEd0AP1RMheicD9BkIiqZkEl8EPhckdRx0WjoYrTZ459cTpzPaGL5snJmgX1fMY+/baCdwNJNQMQW+zHiHM1fJnDlZHCNa0ho6rrCVknFYdjvK0wo9qzt7/kXIMaNW1QFn78AAAAASUVORK5CYII='
    }
}

function setupWLError() {
    window.wlerror = window.onerror;
    window.onerror = windowError;
    window.timeDomContentReady = new Date().getTime();
    log("Time DOM content ready " + (timeDomContentReady - timeUserscriptStart) / 1000);
    log("DOM content ready");

    window.WLError = function (a, b) {
        logError(a);
        null == a && (a = "");
        console.log("WLError: " + a + ", silent=" + b);
        if (-1 != a.indexOf("NotAuth")) {
            location.reload();
        } else if (-1 != a.indexOf("WarLight Server returned CouldNotConnect")) {
            if (typeof CNCDialog === 'function') CNCDialog();
        } else if (
            -1 == a.indexOf("TopLine is not defined") &&
            -1 == a.indexOf("_TPIHelper") &&
            -1 == a.indexOf("Syntax error, unrecognized expression: a[href^=http://]:not([href*=") &&
            -1 == a.indexOf("y2_cc2242") &&
            -1 == a.indexOf("Error calling method on NPObject")
        ) {
            if (-1 != a.indexOf("WARLIGHTERROR48348927984712893471394")) a = "ServerError";
            else if (-1 != a.indexOf("WARLIGHTHEAVYLOAD48348927984712893471394")) a = "HeavyLoad";
            if (typeof ReportError === 'function') ReportError(a);
            if (!b && typeof PopErrorDialog === 'function') PopErrorDialog(a);
        }
    }
}
function hideCoinsGlobally() {
    $("#LeaderboardTable").prev().remove();
    $("#LeaderboardTable").css({
        opacity: 0,
        cursor: 'default'
    });
    $("#LeaderboardTable a").css('display', 'none');
    $("body").find("a[href='/Coins/']").css('display', 'none');

    $("a[href='/Win-Money']").css('display', 'none');
    $("#OpenTournamentTable").css('display', 'none');
}

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

function loadCommunityLevelRecords() {
    var playerId = location.href.match(/p=(\d+)/)[1];
    $.ajax({
        type: 'GET',
        url: `https://maak.ch/wl/v2/api.php?player=${playerId}`,
        dataType: 'jsonp',
        crossDomain: true
    }).done(function (response) {
        if (response.data) {
            var records = response.data;
            $("h3:contains('Single-player stats')").after(`<font class="text-muted">Community Levels:</font> <span><a href="http://communitylevels.online" target="_blank"> ${htmlEscape(records)} record${records != 1 ? "s" : ""}</a></span>`);
        }
    }).fail(function (e) {
        log("Error loading community level records: " + e.statusText);
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

// Resolves with null for a player or tournament wl-stats doesn't know (404), so nothing is shown for it.
function fetchWlStats(url, maxAgeMs) {
    var key = "tidyUpYourDashboard.wlStats:" + url;
    try {
        var cached = JSON.parse(sessionStorage.getItem(key));
        if (cached && Date.now() - cached.at < (maxAgeMs || WL_STATS_CACHE_MS)) {
            return $.Deferred().resolve(cached.data).promise();
        }
    } catch (e) {
    }
    var remember = function (data) {
        try {
            sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data }));
        } catch (e) {
        }
        return data;
    };
    // jQuery 1.x's then() keeps a failure failed unless the filter returns a resolved promise.
    return $.ajax({ url: url, dataType: "json" }).then(remember, function (xhr) {
        return xhr && xhr.status === 404 ? $.Deferred().resolve(remember(null)) : $.Deferred().reject(xhr);
    });
}

function setupAwpProfileStats() {
    var match = location.href.match(/[?&]p=(\d+)/i);
    if (!match) {
        return;
    }
    fetchWlStats(AWP_SITE + "/api/v1/players/" + match[1] + "/stats").done(function (player) {
        if (!player || !player.stats || $("#awpStats").length) {
            return;
        }
        var notes = $("#privateNotes");
        (notes.length ? notes : $("#FeedbackMsg")).first().after(renderAwpStats(player));
    }).fail(function (xhr) {
        log("Error loading AWP World Tour stats: " + (xhr && xhr.statusText));
    });
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

function signedInPlayerId() {
    var result = $.Deferred();
    playerDataReady.done(function (player) {
        result.resolve(player && player.PlayerId ? String(player.PlayerId) : null);
    }).fail(function () {
        result.resolve(null);
    });
    return result.promise();
}

// war.app draws the Ladders page client-side, in a viewport that clips what overflows it, so the
// panel hangs below the ladders dialog and its rows scroll on their own when the window is short.
function setupCommunityLadders() {
    var rows = null;
    var community = null;
    var show = function () {
        var scene = pageIsLadders() && ujsElement("LaddersScene");
        if (!scene || !community) {
            return;
        }
        addCommunityLaddersStyles();
        addSeasonalLadderLine(scene, community.series);
        var dialog = $(scene).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").last();
        if (!dialog.length || !rows.length || $("#communityLadders").length) {
            return;
        }
        var panel = $(renderCommunityLadders(rows));
        var art = laddersArt(scene);
        Object.keys(art).forEach(function (name) {
            if (art[name]) {
                panel[0].style.setProperty(name, art[name]);
            }
        });
        dialog.parent().parent().append(panel);
        fitCommunityLadders(panel, dialog);
        // war.app re-lays out the dialog shortly after a resize, so follow the dialog itself.
        if (window.ResizeObserver) {
            new ResizeObserver(function () {
                fitCommunityLadders(panel, dialog);
            }).observe(dialog[0]);
        }
    };
    var load = function () {
        if (rows || !pageIsLadders()) {
            return;
        }
        rows = [];
        loadCommunityData().done(function (data) {
            if (data.rankings) {
                rows.push(renderAwpLadderRow(data.rankings, data.playerId));
            }
            data.series.forEach(function (series) {
                if (series.current) {
                    rows.push(renderSeriesLadderRow(series, Date.now(), series.kind === "ladder" ? "communityLadderNarrowOnly" : ""));
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

function fitCommunityLadders(panel, dialog) {
    panel.css("width", dialog.outerWidth() + "px");
    var viewport = panel.closest("[id^='ujs_Viewport']");
    if (viewport.length) {
        var list = panel.find(".communityLaddersRows");
        var room = viewport[0].getBoundingClientRect().bottom - list[0].getBoundingClientRect().top - panel.find(".communityLaddersCredit").outerHeight() - 20;
        list.css("max-height", Math.max(66, room) + "px");
    }
}

// The panel wears war.app's own dialog, row and button art, read from the ladders on the page so it
// follows war.app's updates. Its buttons use war.app's blue tint instead of the ladders' green, so
// the panel reads as an addition; war.app's CDN serves only the tints the game itself uses.
function laddersArt(scene) {
    var source = function (name) {
        var value = $(scene).find("[id^='ujs_" + name + "'][id$='_img']").first().css("border-image-source") || "";
        return /^url\(/.test(value) ? value : "";
    };
    var button = source("OneVersusOneLadder");
    return {
        "--tuyd-dialog": source("DialogBackgroundForDropShadow"),
        "--tuyd-row": source("LadderContainer"),
        "--tuyd-button": /UIButton-[0-9A-Fa-f]{6}/.test(button) ? button.replace(/UIButton-[0-9A-Fa-f]{6}/, "UIButton-242D9A") : ""
    };
}

function addCommunityLaddersStyles() {
    if (addCommunityLaddersStyles.done) {
        return;
    }
    addCommunityLaddersStyles.done = true;
    addCSS(`
        #communityLadders {
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
        #communityLadders h3 {
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
        #communityLadders .communityLaddersRows {
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #555 transparent;
        }
        #communityLadders .communityLadder {
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
        #communityLadders .communityLadderButton {
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
        #communityLadders .communityLadderButton:hover {
            filter: brightness(1.15);
        }
        #communityLadders .communityLadderText {
            flex: 1;
            min-width: 0;
        }
        #communityLadders .tuydMuted {
            color: #8d8d8d;
        }
        #communityLadders .communityLadderYou {
            color: #fff;
        }
        #communityLadders .communityLaddersCredit {
            text-align: right;
            font-size: 11px;
            color: #777;
        }
        #communityLadders .communityLadderSignups {
            color: #e0c060;
        }
        .tuydSeasonalLine {
            position: absolute;
            left: 165px;
            right: 4px;
            bottom: -8px;
            text-align: right;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            pointer-events: auto;
            color: #9a9a9a;
            font-size: 11.5px;
            line-height: 13px;
            text-shadow: 0 0 2px #000;
        }
        .tuydEventStanding {
            position: absolute;
            top: 0;
            right: 0;
            max-width: 50%;
            text-align: right;
            pointer-events: auto;
            color: #fff;
            font-size: 13px;
            line-height: 16px;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
        }
        .tuydEventStanding .communityLadderSignups {
            color: #e0c060;
        }
        @container tuydLadders (min-width: 554px) {
            .communityLadderNarrowOnly {
                display: none !important;
            }
        }
        @container tuydLadderRow (max-width: 539.98px) {
            .tuydSeasonalLine {
                display: none;
            }
        }
        @container tuydEventCard (max-width: 599.98px) {
            .tuydEventStanding {
                display: none;
            }
        }
        @media (max-width: 600px) {
            #communityLadders h3 {
                font-size: 14px;
                white-space: nowrap;
            }
            #communityLadders .communityLadderText {
                font-size: 13px;
                line-height: 16px;
            }
        }
    `);
}

function renderCommunityLadders(rows) {
    return '<div id="communityLadders"><h3>Community ladders &amp; leagues</h3><div class="communityLaddersRows">' + rows.join("") +
        '</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

// statusHtml, detailHtml and youHtml must already be escaped.
function communityLadderRow(row) {
    return '<div class="communityLadder' + (row.className ? " " + row.className : "") + '"><a class="communityLadderButton" target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(row.url)) + '">' + htmlEscape(row.name) + '</a>' +
        '<div class="communityLadderText">' +
        (row.statusHtml ? '<div class="tuydMuted">' + row.statusHtml + '</div>' : "") +
        (row.detailHtml ? '<div>' + row.detailHtml + '</div>' : "") +
        (row.youHtml ? '<div class="communityLadderYou">' + row.youHtml + '</div>' : "") + '</div></div>';
}

// Resolves with the AWP ranking and the custom.wl-stats.com series, each left empty when its site
// can't be reached, so one being down doesn't hide the other.
function loadCommunityData() {
    var result = $.Deferred();
    var settle = function (request, what) {
        var settled = $.Deferred();
        request.done(function (data) {
            settled.resolve(data);
        }).fail(function (xhr) {
            log("Error loading " + what + ": " + (xhr && xhr.statusText));
            settled.resolve(null);
        });
        return settled.promise();
    };
    signedInPlayerId().done(function (playerId) {
        $.when(
            settle(fetchWlStats(AWP_SITE + "/api/v1/rankings"), "the AWP World Tour rankings"),
            settle(fetchWlStats(CUSTOM_SITE + "/api/v1/series" + (playerId ? "?player=" + playerId : ""), SERIES_CACHE_MS), "the custom.wl-stats.com series")
        ).done(function (rankings, series) {
            result.resolve({
                playerId: playerId,
                rankings: rankings && rankings.rankings ? rankings : null,
                series: series && Array.isArray(series.series) ? series.series : []
            });
        });
    });
    return result.promise();
}

function formatCount(value) {
    return htmlEscape(typeof value === "number" ? value.toLocaleString("en-US") : value);
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
    var parts = [];
    if (you.division) {
        parts.push(htmlEscape(you.division));
    }
    if (you.group && you.group !== you.division) {
        parts.push(htmlEscape(you.group));
    }
    if (you.place) {
        parts.push(htmlEscape(getRankText(you.place)) + (you.of ? " of " + htmlEscape(you.of) : ""));
    }
    if (you.wins != null && you.losses != null) {
        parts.push(htmlEscape(you.wins) + "–" + htmlEscape(you.losses));
    }
    if (you.points != null) {
        parts.push(series.kind === "ladder" ? "rating " + formatCount(you.points) : formatCount(you.points) + " points");
    }
    if (["promoted", "relegated", "eliminated", "champion"].indexOf(you.status) !== -1) {
        parts.push(htmlEscape(you.status));
    }
    return parts.length ? label + ": " + parts.join(" · ") : label;
}

function renderSeriesLadderRow(series, now, className) {
    var current = series.current;
    var units = { nations_cup: "teams", clan_cup: "clans", clan_league: "clans" }[series.kind] || "players";
    var status = [htmlEscape(current.name), current.status === "signups" ? signupsHtml(current) : current.status === "running" ? "running" : "finished"];
    if (current.players) {
        status.push(formatCount(current.players) + " " + units);
    }
    if (current.progress) {
        status.push(formatCount(current.progress.played) + "/" + formatCount(current.progress.total) + (series.kind === "clan_cup" ? " matches" : " games"));
    }
    var details = [];
    var finished = current.status === "finished";
    var lead = finished ? current.winner : current.leader;
    if (lead && lead.name) {
        details.push((finished ? "Winner: " : "Leader: ") + seriesLink(lead));
    }
    if (current.next_event_at && parseUtcTime(current.next_event_at)) {
        details.push("Next: " + htmlEscape(formatEventTime(current.next_event_at)) + " (" + htmlEscape(timeUntil(current.next_event_at, now)) + ")");
    }
    var you = series.you ? seriesYouHtml(series)
        : current.status === "signups" ? '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(current.url)) + '">Sign up on custom.wl-stats.com</a>' : "";
    return communityLadderRow({ name: series.name, url: series.url, statusHtml: status.join(" · "), detailHtml: details.join(" · "), youHtml: you, className: className });
}

// war.app's own Seasonal Ladder row gets the current season from custom.wl-stats.com along its
// bottom edge: the row is a fixed-size box whose description already fills it. Where the row is too
// narrow for that line, the panel shows the season as a row of its own instead (container queries).
function addSeasonalLadderLine(scene, seriesList) {
    var ladder = seriesList.filter(function (series) {
        return series.kind === "ladder" && series.current;
    })[0];
    var button = $(scene).find("[id^='ujs_SeasonalLadder']").filter(function () {
        return /^ujs_SeasonalLadder(?:_\d+)?$/.test(this.id);
    }).first();
    var box = button.closest("[id^='ujs_LadderContainer']").children("[id$='_img']").first();
    if (!ladder || !box.length || box.children(".tuydSeasonalLine").length) {
        return;
    }
    box.css("container", "tuydLadderRow / inline-size").append(renderSeasonalLadderLine(ladder));
}

function renderSeasonalLadderLine(series) {
    var current = series.current;
    var finished = current.status === "finished";
    var lead = finished ? current.winner : current.leader;
    var parts = ['<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(current.url)) + '">' + htmlEscape(current.name) + '</a>'];
    if (current.players && !series.you) {
        parts.push(formatCount(current.players) + " players");
    }
    if (lead && lead.name) {
        parts.push((finished ? "winner " : "leader ") + seriesLink(lead));
    }
    if (series.you) {
        parts.push(seriesYouHtml({ kind: series.kind, you: $.extend({}, series.you, { wins: null, losses: null }) }));
    }
    return '<div class="tuydSeasonalLine">' + parts.join(" · ") + '</div>';
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
            var box = $(this).children("[id$='_img']").first();
            if (!box.length || box.children(".tuydEventStanding").length) {
                return;
            }
            var line = communityEventLine($(this).find("[id^='ujs_vert'] .ujsTextInner").first().text().trim(), community);
            if (line) {
                box.css("container", "tuydEventCard / inline-size").append('<div class="tuydEventStanding">' + line + '</div>');
            }
        });
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
}

function communityEventLine(title, community) {
    if (/^AWP World Tour/i.test(title)) {
        var mine = awpStanding(community.rankings, community.playerId);
        return mine ? "You: #" + htmlEscape(mine.rank) + " in the " + htmlEscape(community.rankings.year) + " race · " + formatCount(mine.points) + " points" : "";
    }
    var series = community.series.filter(function (entry) {
        return entry.warapp_event && entry.current && title.toLowerCase().indexOf(String(entry.warapp_event).toLowerCase()) === 0;
    })[0];
    if (!series) {
        return "";
    }
    if (series.you) {
        return seriesYouHtml(series);
    }
    return series.current.status === "signups" ? signupsHtml(series.current) : "";
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
function databaseReady() {
    log("Running main");
    runFeatures(mainFeatures());
}

function setupMaakFeatures() {
    runFeatures(maakFeatures());
}

function setupForumOverviewFilters() {
    ifSettingIsEnabled("hideOffTopic", function () {
        hideOffTopicThreads()
    });
    ifSettingIsEnabled("hideWarzoneIdle", function () {
        hideWarzoneIdleThreads()
    });
    formatHiddenThreads();
}

function setupForumThreadHiding() {
    setupSpammersBeGone();
}

function setupDashboard() {
    playerDataReady.done(setupVacationAlert);

    hideBlacklistedThreads();
    setupBasicDashboardStyles();
    var dashboard = fetchDashboard();
    refreshMyGames(dashboard);
    ifSettingIsEnabled('hideCoinsGlobally', function () {
        hideCoinsGlobally()
    });
    ifSettingIsEnabled('useDefaultBootLabel', function () {
        createSelector(".BootTimeLabel", "z-index:50;");
    }, function () {
        createSelector(".BootTimeLabel", "color:white !important;font-weight:normal!important;font-style:italic;font-size:13px!important;z-index:50;");
    });
    ifSettingIsEnabled("hideMyGamesIcons", function () {
        createSelector("#MyGamesTable td div > img, #MyGamesTable td div a > img", "display:none;");
    });
    ifSettingIsEnabled("scrollGames", function () {
        setupFixedWindowWithScrollableGames();
    }, function () {
        createSelector("body", "overflow: auto");
        addCSS(`
            @media (max-width: 1050px) {
               #MyGamesTable > thead > tr * {
                    font-size: 14px;
                }
                #MyGamesTable > thead > tr > td > div:nth-of-type(1) {
                    margin-top: 5px!important;
                    display: block;
                    float: left;
                    padding-right: 5px;
                }
            }

            @media (max-width: 750px) {
                #MyGamesTable > thead > tr > td > div:nth-of-type(1) {
                    display:none;
                }
            }`)
    }, function () {
        setupRightColumn(true);
        refreshOpenGames(dashboard);
    });
    $("label#MultiDayRadio").on("click", function () {
        registerGameTabClick()
    });
    $("label#RealTimeRadio").on("click", function () {
        registerGameTabClick()
    });
    $("label#BothRadio").on("click", function () {
        registerGameTabClick()
    });
    $(window).resize(function () {
        ifSettingIsEnabled("scrollGames", function () {
            refreshSingleColumnSize();
        });
    });
    window.setTimeout(setupRefreshFunction, 0);
}

function pageFeatures() {
    return [
        { name: "dashboard loader", match: pageIsDashboard, run: showDashboardLoader },
        { name: "Formatting toolbar for posts", section: "Forum", match: pageIsThread, run: setupTextarea },
        { name: "Bookmark link and layout tweaks in threads", section: "Forum", match: isAnyForumThread, run: setupForumThreadTweaks },
        { name: "Level previews in posts", section: "Forum", match: isAnyForumThread, run: parseForumSPLevels },
        { name: "Bookmark link and player search", section: "Tournaments", run: setupTournamentPage },
        { name: "custom.wl-stats.com link", section: "Tournaments", run: setupCustomTournamentLink },
        { name: "Community ladders on the Ladders page", section: "Community", run: setupCommunityLadders },
        { name: "Your standing on Community Events", section: "Community", run: setupCommunityEventsStanding },
        { name: "Sortable Common Games table", section: "Other", match: pageIsCommonGames, run: setupCommonGamesDataTable },
        { name: "Clan list search", section: "Clans", match: pageIsClanList, run: setupClanListSearch },
        { name: "Map search", section: "Maps & levels", match: pageIsMapsPage, run: setupMapSearch },
        { name: "Level bookmark link", section: "Maps & levels", match: pageIsLevelOverview, run: setupLevelBookmark },
        { name: "Collapse blank lines", section: "Profile", match: pageIsProfile, run: hideExtraBlanks },
        { name: "Trophies", section: "Profile", match: pageIsProfile, run: displayTrophies },
        { name: "Collapsible stat sections", section: "Profile", match: pageIsProfile, run: foldProfileStats },
        { name: "AWP World Tour stats", section: "Profile", match: pageIsProfile, run: setupAwpProfileStats },
        { name: "global styles", run: setGlobalStyles },
        { name: "Map of the Week table fix", section: "Maps & levels", match: pageIsMapOfTheWeek, run: setupMapOfTheWeekStyles }
    ];
}

function mainFeatures() {
    return [
        { name: "Hidden thread formatting", section: "Forum", match: pageIsForumOverview, run: setupForumOverviewFilters },
        { name: "communitylevels.online banner", section: "Maps & levels", match: pageIsCommunityLevels, run: setupCommunityLevels },
        { name: "Hide-thread buttons", section: "Forum", match: function () { return pageIsForumOverview() || pageIsSubForum(); }, run: setupForumThreadHiding },
        { name: "private notes", match: function () { return pageIsProfile() && $("#BlockListLink").length > 0; }, run: function () { ifSettingIsEnabled('showPrivateNotesOnProfile', loadPrivateNotes); } },
        { name: "Hide ignored threads on Community page", section: "Community", match: pageIsCommunity, run: hideIgnoredForumThreadsFromCommnuityList },
        { name: "Blacklist counter", section: "Other", match: pageIsBlacklistPage, run: setupBlacklistCounter },
        { name: "Block list search", section: "Other", match: pageIsBlacklistPage, run: setupBlockListSearch },
        { name: "Mail search by player", section: "Other", match: pageIsMyMail, run: setupMailSearch },
        { name: "Total points earned", section: "Other", match: pageIsPointsPage, run: displayTotalPointsEarned },
        { name: "dashboard", match: pageIsDashboard, run: setupDashboard },
        { name: "Your-turn count in tab title and background checks", section: "Dashboard", match: pageIsDashboard, run: setupTurnAlerts },
        { name: "Sort your-turn games by time left before boot", section: "Dashboard", match: pageIsDashboard, run: setupBootTimeSort },
        { name: "Open Games filter", section: "Dashboard", match: function () { return pageIsDashboard() || pageIsOpenGamesPage(); }, run: setupOpenGamesFilter },
        { name: "Mark Open Games you joined", section: "Dashboard", match: function () { return pageIsDashboard() || pageIsOpenGamesPage(); }, run: setupJoinedOpenGames },
        { name: "hide coins", match: function () { return !pageIsDashboard(); }, run: function () { ifSettingIsEnabled('hideCoinsGlobally', hideCoinsGlobally); } },
        { name: "maak.ch features", run: function () { ifSettingIsEnabled('useMaakServices', setupMaakFeatures); } }
    ];
}

function maakFeatures() {
    return [
        { name: "MTL ladder", match: pageIsCommunity, run: setupMtlLadderTable },
        { name: "MTL forum tables", match: isAnyForumThread, run: setupMtlForumTable },
        { name: "MTL profile stats", match: pageIsProfile, run: setupMtlProfile },
        { name: "community level records", match: pageIsProfile, run: loadCommunityLevelRecords }
    ];
}

function toggleableFeatures() {
    return pageFeatures().concat(mainFeatures()).filter(function (feature) {
        return feature.section;
    });
}

function disabledFeatures() {
    try {
        var stored = JSON.parse(localStorage.getItem(DISABLED_FEATURES_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
}

function saveDisabledFeatures(names) {
    try {
        localStorage.setItem(DISABLED_FEATURES_KEY, JSON.stringify(names));
    } catch (e) {
        log("Could not mirror disabled features: " + e);
    }
    return Database.update(Database.Table.Settings, { name: "disabledFeatures", value: names }, undefined);
}

function syncDisabledFeatures() {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "disabledFeatures", function (setting) {
        try {
            localStorage.setItem(DISABLED_FEATURES_KEY, JSON.stringify(setting && Array.isArray(setting.value) ? setting.value : []));
        } catch (e) {
            log("Could not mirror disabled features: " + e);
        }
    });
}

function runFeature(name, run) {
    try {
        run();
    } catch (e) {
        logError("Feature \"" + name + "\" failed: " + (e && e.stack ? e.stack : e));
    }
}

function runFeatures(features) {
    var disabled = disabledFeatures();
    features.forEach(function (feature) {
        if (feature.section && disabled.indexOf(feature.name) !== -1) {
            log("Feature \"" + feature.name + "\" is turned off");
            return;
        }
        runFeature(feature.name, function () {
            if (!feature.match || feature.match()) {
                feature.run();
            }
        });
    });
}

function foldForSearch(text) {
    return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function filterBlockList(query) {
    var needle = foldForSearch(query.trim());
    var rows = $("li[id^='ListItem_']");
    var shown = 0;
    rows.each(function () {
        var matches = needle === "" || foldForSearch($(this).find("a[href*='Profile']").text()).indexOf(needle) !== -1;
        $(this).toggleClass("tuyd-filtered", !matches);
        if (matches && this.style.display !== "none") {
            shown++;
        }
    });
    $("#BlockListSearchCount").text(needle === "" ? "" : shown + " matching");
}

function setupBlockListSearch() {
    var $list = $("li[id^='ListItem_']").first().parent("ul");
    if ($list.length === 0) {
        return;
    }
    addCSS(`
        li.tuyd-filtered { display: none; }
        #BlockListSearch { margin: 8px 0; }
        #BlockListSearchInput { padding: 4px 8px; width: 240px; max-width: 60%; background: #222; color: #ddd; border: 1px solid #555; }
        #BlockListSearchCount { margin-left: 6px; white-space: nowrap; }
    `);
    $list.before(`<div id="BlockListSearch"><input type="text" id="BlockListSearchInput" placeholder="Search players"><span id="BlockListSearchCount" class="text-muted"></span></div>`);
    $("#BlockListSearchInput").on("input", function () {
        filterBlockList($(this).val());
    });
}

function setupBlacklistCounter() {
    var $blacklist = $("li[id^='ListItem_']").first().parent("ul");
    $blacklist.before(`<span id="numBlacklisted">You have <b></b> players on your block list.</span>`);
    // war.app hides removed players with an inline display: none; the search hides rows with a class.
    var updateBlacklistCount = function () {
        $("#numBlacklisted b").text($blacklist.find("li").filter(function () {
            return this.style.display !== "none";
        }).length);
    };
    updateBlacklistCount();
    var blacklistObserver = new MutationObserver(updateBlacklistCount);
    $blacklist.each(function () {
        blacklistObserver.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    });
}

function DOM_ContentReady() {
    $(".order-xl-2").addClass("SideColumn");

    log("DOM content ready");
    if ($(".navbar").length > 0) {
        log("Unity is not full screen")
    } else {
        log("Unity is full screen");
        return;
    }

    runFeature("DataTables sorting", registerDataTableSorting);
    setupWLError();
    createSelector('body > footer', 'display:none');

    $.fn.outerHTML = function (s) {
        return s ? this.before(s).remove() : jQuery("<p>").append(this.eq(0).clone()).html();
    };

    window.playerDataReady = loadPlayerData();

    runFeatures(pageFeatures());

    Database.init(function () {
        log("database is ready");
        if (pageIsDashboard()) {
            wljs_WaitDialogJS.Start(null, "Tidying Up...")
        }
        runFeatures([
            { name: "userscript menu", run: setupUserscriptMenu },
            { name: "bookmark menu", run: setupBookmarkMenu },
            { name: "feature toggle sync", run: syncDisabledFeatures },
            { name: "version check", run: checkVersion },
            { name: "main", run: databaseReady }
        ]);
    });
}

function registerDataTableSorting() {
    $.extend($$$.fn.dataTableExt.oSort, {
        "rank-pre": function (a) {
            return a.match(/([0-9]*)/)[1] || 9999;
        },
        "rank-asc": function (a, b) {
            return a < b;
        },
        "rank-desc": function (a, b) {
            return a > b;
        }
    });

    $.extend($$$.fn.dataTableExt.oSort, {
        "numeric-comma-pre": function (a) {
            return Number(a.replace(/,/g, ""))
        },
        "numeric-comma-asc": function (a, b) {
            return a < b;
        },
        "numeric-comma-desc": function (a, b) {
            return a > b;
        }
    });
}

function showDashboardLoader() {
    $("body").append("<div class='loader' style='    background: black;position: fixed;left: 0;right: 0;top: 0;bottom: 0;z-index: 100;'></div>");
    $(".container-fluid").show();
    window.lastClick = new Date();
}

function isAnyForumThread() {
    return pageIsForumThread() || pageIsClanForumThread();
}

function setupForumThreadTweaks() {
    $("[href='#Reply']").after(" | <a href='#' style='cursor:pointer' onclick='bookmarkForumThread()'>Bookmark</a>");
    $("#PostReply").after(" | <a href='#' style='cursor:pointer' onclick='bookmarkForumThread()'>Bookmark</a>");
    $(".region a[href*='2211733141']:contains('Muli')").closest("td").find("a:contains('Report')").before("<a href='/Forum/106092'><font color='#FFAE51' size='1'>Script Creator</font></a><br>");
    $("[id^=PostForDisplay]").find("img").css("max-width", "100%");
    $(".region td:first-of-type").css("padding-top", "10px");
    addCSS(`
        img[src*='Images/Thumbs'] {
            height: 25px;
            width: 25px;
        }
    `)
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
function siteName() {
    var meta = document.querySelector("meta[property='og:site_name']");
    return (meta && meta.getAttribute("content")) || "War.app";
}

function stripSiteSuffix(title) {
    var name = siteName().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return title.replace(new RegExp("\\s+-\\s+" + name + "(?:\\s+-.*)?$", "i"), "").trim();
}

function siteRelativeUrl(url) {
    var match = /^https?:\/\/([^\/?#]+)(.*)$/i.exec(String(url).trim());
    if (!match) {
        return url;
    }
    var host = match[1].replace(/:\d+$/, "").toLowerCase();
    var onSite = SITE_HOSTS.some(function (siteHost) {
        return host === siteHost || host.endsWith("." + siteHost);
    });
    return onSite ? (match[2] || "/") : url;
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

function setupMapOfTheWeekStyles() {
    addCSS(`
        .dataTable table {
        display: block;
        }
    `)
}

window.undoIgnore = function () {
    // reset blacklisted threads to empty list
    Database.clear(Database.Table.BlacklistedForumThreads, function () {
        if (pageIsForumOverview() || pageIsSubForum()) {
            $(".table tr").show();
        } else if (pageIsDashboard()) {
            $("#ForumTable tr").show();
        } else {
            location.reload();
        }
    })

};

function replaceAndFilterForumTable(tableHTML) {
    var table = $.parseHTML(tableHTML);
    var promises = [];
    $.each($(table).find("tr"), function (key, row) {

        if (threadId = $(row).html().match(/href="\/Forum\/([^-]*)/mi)) {
            promises[key] = $.Deferred();
            Database.readIndex(Database.Table.BlacklistedForumThreads, Database.Row.BlacklistedForumThreads.ThreadId, threadId[1], function (thread) {
                if (thread) {
                    $(row).hide();
                }
                promises[key].resolve();
            })
        }
    });
    $.when.apply($, promises).done(function () {
        $("#ForumTable").replaceWith($(table).outerHTML());

        ifSettingIsEnabled('disableHideThreadOnDashboard', function () {

        }, function () {
            $("#ForumTable").off();
            $("#ForumTable").on("contextmenu", function (event) {
                $(".highlightedBookmark").removeClass("highlightedBookmark");

                var row = $(event.target).closest("tr");
                row.addClass("highlightedBookmark");
                // Avoid the real one

                if (row.is(":last-child")) {
                    return;
                }
                event.preventDefault();
                threadId = row.html().match(/href="\/Forum\/([^-]*)/mi);
                if (threadId) {
                    activeThreadId = threadId[1]
                } else {
                    return
                }

                // Show contextmenu
                $(".thread-context").finish().toggle(100).// In the right position (the mouse)
                    css({
                        top: event.pageY + "px",
                        left: event.pageX + "px"
                    });
            });
        })

    });
}

var activeThreadId;

function hideBlacklistedThreads() {
    replaceAndFilterForumTable($("#ForumTable").outerHTML())
}

window.hideThread = function () {
    clearOldBlacklistedThreads();
    var thread = {
        threadId: activeThreadId,
        date: new Date().getTime()
    };
    Database.add(Database.Table.BlacklistedForumThreads, thread, function () {
        hideBlacklistedThreads();
    })
};

function hideOffTopicThreads() {
    $.each($(".table tbody tr:visible"), function (key, row) {
        if ($(row).find("td:first-of-type").text().trim() == "Off-topic") {
            var threadId = $(row).html().match(/href="\/Forum\/([^-]*)/mi);
            Database.add(Database.Table.BlacklistedForumThreads, {
                threadId: threadId[1],
                date: new Date().getTime()
            }, function () {
                $(row).hide()
            })
        }
    })
}

function hideWarzoneIdleThreads() {
    $.each($(".table tbody tr:visible"), function (key, row) {
        var category = $(row).find("td:first-of-type").text().trim();
        if (category == "Warzone Idle" || category == "War.app Idle") {
            var threadId = $(row).html().match(/href="\/Forum\/([^-]*)/mi);
            Database.add(Database.Table.BlacklistedForumThreads, {
                threadId: threadId[1],
                date: new Date().getTime()
            }, function () {
                $(row).hide()
            })
        }
    })
}

function formatHiddenThreads() {
    let $row = $("#HiddenThreadsRow td");
    $row.attr("colspan", "");
    $row.before("<td/>");
    $row.css("text-align", "left")
}

function setupSpammersBeGone() {
    var newColumnCountOnPage;
    if (pageIsForumOverview()) {
        newColumnCountOnPage = 6;
        showIgnoreCheckBox(newColumnCountOnPage);
        hideIgnoredThreads();
    }

    if (pageIsSubForum()) {
        newColumnCountOnPage = 5;
        showIgnoreCheckBox(newColumnCountOnPage);
        hideIgnoredThreads();
    }

    $(".thread-hide.eye-icon").on("click", function () {
        clearOldBlacklistedThreads();
        var threadId = $(this).closest("tr").html().match(/href="\/Forum\/([^-]*)/mi);
        Database.add(Database.Table.BlacklistedForumThreads, {
            threadId: threadId[1],
            date: new Date().getTime()
        }, function () {
            hideIgnoredThreads();
        })
    });

}

function clearOldBlacklistedThreads() {
    Database.readAll(Database.Table.BlacklistedForumThreads, function (threads) {
        $.each(threads, function (key, thread) {
            if (thread.date < (new Date() - 60 * 24 * 60 * 60 * 1000)) {
                Database.delete(Database.Table.BlacklistedForumThreads, thread.id, function () {
                })
            }
        })
    })
}

/**
 * Inserts a new column of check boxes for each Forum thread.
 */
function showIgnoreCheckBox(columnCountOnPage) {
    var $row = "<th> Hide</th>";
    var header = $(".table tr:first");

    if (header.children("th").length < columnCountOnPage) {
        header.append($row);
    }

    var allPosts = $('.table tr').not(':first');

    allPosts.each(function (index, post) {
        if ($(this).children("td").length < columnCountOnPage) {
            if (postId = $(this).find('a:first').attr('href')) {
                $(this).append("<td><div class='thread-hide eye-icon'></div></td>");
            }

        }
    });
}

addCSS(`
.eye-icon {
    background-image: url(${IMAGES.EYE_ICON});
    height: 17px;
    width: 17px;
    cursor: pointer;
    background-size: contain;
    margin: auto;
    background-repeat: no-repeat;
}
.eye-icon:hover {
    background-image: url(${IMAGES.EYE_ICON_HOVER});
}`);

/**
 * Hides all threads marked as "ignored" by a user.
 */
function hideIgnoredThreads() {
    var allPosts = $('.table tr').not(':first');
    $.each(allPosts, function (key, row) {
        if (threadId = $(row).html().match(/href="\/Forum\/([^-]*)/mi)) {
            Database.readIndex(Database.Table.BlacklistedForumThreads, Database.Row.BlacklistedForumThreads.ThreadId, threadId[1], function (thread) {
                if (thread) {
                    $(row).hide();
                }
            })
        }
    })
}

//hide ingored forum threads on the community page
function hideIgnoredForumThreadsFromCommnuityList() {
    var allPosts = $("h3:contains('Notable Forum Posts')").next().find("li");
    $.each(allPosts, function (key, li) {
        if (threadId = $(li).html().match(/href="\/Forum\/([^-]*)/mi)) {
            Database.readIndex(Database.Table.BlacklistedForumThreads, Database.Row.BlacklistedForumThreads.ThreadId, threadId[1], function (thread) {
                if (thread) {
                    $(li).hide();
                }
            })
        }
    })
}
function setupTextarea() {
    var controls_default = [
        { title: "<b>B</b>", class: ["tag"], openClose: true, tag: "b" },
        { title: "<i>I</i>", class: ["tag"], openClose: true, tag: "i" },
        { title: "code", class: ["tag"], openClose: true, tag: "code" },
        { title: "img", class: ["tag"], openClose: true, tag: "img" },
        { title: "hr", class: ["tag"], openClose: false, tag: "hr" },
        { title: "quote", class: ["tag"], openClose: true, tag: "quote" },
        { title: "list", class: ["tag"], openClose: true, tag: "list" },
        { title: "*", class: ["tag"], openClose: false, tag: "*" }

    ];
    var controls = "";

    $.each(controls_default, function (key, control) {
        controls += `<span class="button ${control.class.join(" ")}" ${(control.openClose ? `open-close` : ``)} data-tag="${control.tag}">${control.title}</span>`
    });
    $(".region textarea").before(`<div class="editor">${controls}</div>`);
    $("textarea").attr("style", "");
    addCSS(`
        .editor {
            color: white;
            padding: 5px;
            background: #A28958;
            margin: 5px 5px 0 0;
        }
        .editor .button {
            margin-right: 10px;
            background: rgb(122,97,48);;
            padding: 3px 5px;
            border-radius: 5px;
            cursor: pointer;
        }
        textarea {
            padding: 5px 0 0 5px;
            box-sizing: border-box;
            width: calc(100% - 5px);
            height: 300px
        }
    `);
    createSelector("pre, textarea", "-moz-tab-size: 8;-o-tab-size: 8;tab-size: 8;");

    $(document).on("click", ".editor .tag", function (e) {
        var areaId = $(this).closest(".editor").next().attr("id");
        var area = document.getElementById(areaId);
        var tag = $(e.target).closest(".tag").attr("data-tag");
        if (area) {
            var startPos = area.selectionStart || 0;
            var endPos = area.selectionEnd || 0;
            if ($(this).is("[open-close]")) {
                addTagInEditor(area, startPos, endPos, tag)
            } else {
                addCodeInEditor(area, startPos, tag)

            }

        }
    });

    $("textarea").on('keydown', function (e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode == 9) {
            e.preventDefault();
            var areaId = $(this).attr("id");
            var area = document.getElementById(areaId);
            if (area) {
                var oldVal = $(area).val();
                var start = area.selectionStart || 0;
                var end = area.selectionEnd || 0;
                var newVal = oldVal.substring(0, start) + "\t" + oldVal.substring(end);
                if (browserIsFirefox()) {
                    $(area).val(newVal);
                    area.setSelectionRange(start + 1, start + 1)
                } else {
                    document.execCommand("insertText", false, "\t")
                }

            }
        }
    });

}

function addCodeInEditor(area, place, tag) {
    var oldVal = $(area).val();
    var newVal = oldVal.substring(0, place) + "[" + tag + "]" + oldVal.substring(place);
    $(area).focus();
    if (browserIsFirefox()) {
        $(area).val(newVal)
    } else {
        document.execCommand("insertText", false, "[" + tag + "]")
    }
    area.setSelectionRange(place + tag.length + 2, place + tag.length + 2);
    $(area).focus();
}

function addTagInEditor(area, start, end, tag) {
    var oldVal = $(area).val();
    var selection = oldVal.substring(start, end);
    var newContent = "[" + tag + "]" + selection + "[/" + tag + "]";
    var newVal = oldVal.substring(0, start) + newContent + oldVal.substring(end);
    $(area).focus();
    if (browserIsFirefox()) {
        $(area).val(newVal)
    } else {
        document.execCommand("insertText", false, newContent)
    }

    if (start == end) {
        area.setSelectionRange(start + tag.length + 2, start + tag.length + 2)
    } else {
        area.setSelectionRange(end + 5 + (2 * tag.length), end + 5 + (2 * tag.length))
    }

    $(area).focus();
}
/**
 * Reloads all Games
 */
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

function bootMinutesLeft(row) {
    var turnText = $(row).find("span").filter(function () {
        return /^\s*Your turn for\b/.test($(this).text());
    }).first().text();
    if (!turnText) {
        return null;
    }
    // war.app's label is the boot time plus your banked time; "Never" means the game has no boot.
    var allowed = parseBootTime($(row).find(".BootTimeLabel").text());
    return allowed === null ? Infinity : allowed - (parseBootTime(turnText) || 0);
}

function sortMyGamesByBootTime() {
    var rows = $("#MyGamesTable tr.GameRow").filter(function () {
        return bootMinutesLeft(this) !== null;
    }).get();
    var left = rows.map(bootMinutesLeft);
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
    // war.app's Filter button re-draws My Games without tuyd:gamesRefreshed, so watch the table.
    // The observer is paused while sorting so that moving rows doesn't trigger it again.
    var observer = new MutationObserver(function () {
        observer.disconnect();
        sortMyGamesByBootTime();
        observer.observe(table, { childList: true, subtree: true });
    });
    sortMyGamesByBootTime();
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

function parseFilterKeywords(text) {
    return String(text).split(",").map(function (word) {
        return word.trim().toLowerCase();
    }).filter(function (word) {
        return word.length > 0;
    });
}

function normalizeOpenGamesFilter(value) {
    value = value || {};
    return {
        hideAutoGames: value.hideAutoGames === true,
        hideCoinGames: value.hideCoinGames === true,
        minBootHours: Math.max(0, Number(value.minBootHours) || 0),
        keywords: Array.isArray(value.keywords) ? parseFilterKeywords(value.keywords.join(",")) : []
    };
}

function openGameIsFiltered(row, filter) {
    var link = $(row).find("td").eq(1).find("a").first();
    if (filter.hideAutoGames && /[?&]AutoGameID=/i.test(link.attr("href") || "")) {
        return true;
    }
    if (filter.hideCoinGames && /Entry fee:/i.test($(row).find("font").text())) {
        return true;
    }
    var bootMinutes = parseBootTime($(row).find(".BootTimeLabel").text());
    if (filter.minBootHours > 0 && bootMinutes !== null && bootMinutes < filter.minBootHours * 60) {
        return true;
    }
    var name = link.text();
    return filter.keywords.some(function (keyword) {
        var escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp("(?:^|[^\\p{L}\\p{N}])" + escaped + "(?:$|[^\\p{L}\\p{N}])", "iu").test(name);
    });
}

function applyOpenGamesFilter(filter) {
    var rows = $("#OpenGamesTable tr.GameRow");
    var filtered = rows.filter(function () {
        return openGameIsFiltered(this, filter);
    });
    rows.not(filtered).removeClass("tuyd-filtered");
    filtered.addClass("tuyd-filtered");
    $("#OpenGamesFilterCount").text(filtered.length > 0 ? filtered.length + " hidden" : "");
}

function readOpenGamesFilterForm(panel) {
    return normalizeOpenGamesFilter({
        hideAutoGames: panel.find("[name=hideAutoGames]").prop("checked"),
        hideCoinGames: panel.find("[name=hideCoinGames]").prop("checked"),
        minBootHours: panel.find("[name=minBootHours]").val(),
        keywords: parseFilterKeywords(panel.find("[name=keywords]").val())
    });
}

function setupOpenGamesFilter() {
    var table = $("#OpenGamesTable");
    if (table.length === 0) {
        return;
    }
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "openGamesFilter", function (setting) {
        var filter = normalizeOpenGamesFilter(setting && setting.value);
        addCSS(`
            #OpenGamesTable tr.tuyd-filtered { display: none; }
            #OpenGamesFilterCount { color: #999; letter-spacing: 0; margin-left: 4px; }
            #OpenGamesFilterPanel td { padding: 8px 10px; }
            #OpenGamesFilterPanel label { display: block; margin: 0 0 6px; font-weight: normal; }
            #OpenGamesFilterPanel input[type=number] { width: 60px; }
            #OpenGamesFilterPanel input[type=text] { width: 260px; max-width: 100%; }
            #OpenGamesFilterPanel input[type=number], #OpenGamesFilterPanel input[type=text] { background: #222; color: #ddd; border: 1px solid #555; padding: 1px 4px; }
        `);
        var filterLink = ` | <a href="#" id="OpenGamesFilterLink" style="letter-spacing: 0px">Filter</a><span id="OpenGamesFilterCount"></span>`;
        var codeLink = table.find("thead a[href*='GameInviteCode']").first();
        if (codeLink.length) {
            codeLink.after(filterLink);
        } else {
            table.find("thead h2").parent().append(filterLink);
        }
        var panel = $(`
            <tr id="OpenGamesFilterPanel" style="display: none"><td colspan="2">
                <label><input type="checkbox" name="hideAutoGames"> Hide Auto Games</label>
                <label><input type="checkbox" name="hideCoinGames"> Hide coin games</label>
                <label>Hide games with a boot time under <input type="number" name="minBootHours" min="0" step="1"> hours (0 = off)</label>
                <label>Hide games whose name contains any of these words <input type="text" name="keywords" placeholder="rp, diplo"> (separate with commas)</label>
            </td></tr>`);
        panel.find("[name=hideAutoGames]").prop("checked", filter.hideAutoGames);
        panel.find("[name=hideCoinGames]").prop("checked", filter.hideCoinGames);
        panel.find("[name=minBootHours]").val(filter.minBootHours);
        panel.find("[name=keywords]").val(filter.keywords.join(", "));
        table.find("thead").first().append(panel);
        $("#OpenGamesFilterLink").on("click", function (e) {
            e.preventDefault();
            panel.toggle();
        });
        panel.find("input").on("change", function () {
            filter = readOpenGamesFilterForm(panel);
            Database.update(Database.Table.Settings, { name: "openGamesFilter", value: filter }, undefined);
            applyOpenGamesFilter(filter);
        });
        applyOpenGamesFilter(filter);
        // The site re-renders rows for "Show more" and the pace buttons; changes in thead are our own.
        new MutationObserver(function (mutations) {
            var rowsChanged = mutations.some(function (mutation) {
                return $(mutation.target).closest("thead").length === 0;
            });
            if (rowsChanged) {
                applyOpenGamesFilter(filter);
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
        oldRefreshBtn.replaceWith(oldRefreshBtn.clone().attr("id", "refreshAll").attr("value", "Refresh (R)"));
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
window.showGamesActive = "ShowMyGames";

function setupBasicDashboardStyles() {
    createSelector(".GameRow a", "font-size:16px !important;");
    createSelector(".GameRow", "font-size:15px");
    createSelector("a", "outline: none");
    createSelector("#MyGamesTable td > a > img", 'display:none');
    createSelector("#MyGamesTable td span a img, #MyGamesTable td span a img", "display:inherit;");
    createSelector(".GameRow:hover", "background-color:rgb(50, 50, 50);cursor:pointer;");
    createSelector(".GameRow a:hover", "text-decoration:none;");
    createSelector(".ui-buttonset label", "font-size:11px;");
    createSelector("#OpenGamesTable label:hover", " border: 1px solid #59b4d4;background: #0078a3 50% 50% repeat-x;font-weight: bold;color: #ffffff;");
    createSelector("img", "position: relative;z-index:50;");
    createSelector("input", "z-index: 98;position: relative;");
    createSelector(".ui-tooltip", "background: #EBEBEB;padding: 4px;font-style: italic;");
    addCSS(`
        .MyGamesGameBoxOpenSeat {
            font-size:11px;
        }
        .MyGamesGameBox {
            position:relative;
        }
    `);
    addCSS(`
        .GameRow td:nth-of-type(2) {
            position: relative;
        }
        .GameRow td:nth-of-type(2) > a {
            width: 100%;
            position: absolute;
            display: block;
            height: 100%;
            margin-top: -5px;
            margin-left: -6px;
            padding-left: 5px;
        }
    `);
    addCSS(`
    .MyGamesGameBox span:not(.MyGamesGameBoxDot) {
        position: relative;
        top: -4px;
    }
    `);
}

function setupFixedWindowStyles() {
    createSelector('html, body', 'width: 100%; position:fixed; height: 100%');
    createSelector('#PastGamesTable', 'width: 100%;');
    createSelector('body > .dataTable, #OpenTournamentTable', 'display:none;');
    addCSS(`  
        .leftColumn .dataTable tbody {
          display: block;
          overflow-y: auto;
        }

        .leftColumn .dataTable tr {
          display: table;
          width: 100%;
        }
         .leftColumn, .SideColumn {
            max-width:900px;
        }
        .SideColumn {
            overflow-y: auto;
        }
    `);

    createSelector("#switchGameRadio label:hover", "border: 1px solid rgb(89, 180, 212);border-image-source: initial;border-image-slice: initial;border-image-width: initial;border-image-outset: initial;border-image-repeat: initial;background:rgb(0, 120, 163);font-weight: bold;color: rgb(255, 255, 255);");
    createSelector("h2 + span", "margin-right: 50px;");
    createSelector("body", "overflow:hidden");
    createSelector(".adsbygoogle", "margin-top: 25px;");
    createSelector("#refreshAll", "margin: 5px;float: right;");
    createSelector("#RestoreLotteryGamesBtn", "display:none");
    createSelector('#ForumTable tbody tr td, #ClanForumTable tbody tr td', 'overflow:hidden;position:relative');
    createSelector('#ForumTable tbody tr td > a, #ClanForumTable tbody tr td > a', 'width: 100%;display: block;height: 100%;float: left;position: absolute;overflow: hidden;z-index: 1;');
    createSelector('#ForumTable tbody tr td span, #ClanForumTable tbody tr td span', 'display: inline-block;z-index: 1;float: left;position: relative;');
    createSelector('#ForumTable tbody tr:not(:last-child):hover, #ClanForumTable tbody tr:hover', 'background-color:rgb(50, 50, 50)');
    createSelector('#ForumTable tbody tr td a[href="/Forum/Forum"]', 'position: relative;');
    createSelector('#ClanForumTable tbody tr td a[href="/Clans/Forum"]', 'position: relative;');
    $("body").scrollTop(0)
}

function setupFixedWindowWithScrollableGames() {
    var gameButtons = `
        <div style="margin: 5px;" id="switchGameRadio" class="btn-group"> <label for="ShowMyGames" class="active btn btn-primary" role="button"><input type="radio" id="ShowMyGames" name="switchGames" checked="checked" class="ui-helper-hidden-accessible">My Games</label> 
            <label for="ShowOpenGames" class="btn btn-primary" role="button">
                <input type="radio" id="ShowOpenGames" name="switchGames" class="ui-helper-hidden-accessible">Open Games
            </label>
            <label for="ShowPastGames" class="btn btn-primary" role="button">
                <input type="radio" id="ShowPastGames" name="switchGames" class="ui-helper-hidden-accessible">Past Games
           </label>
        </div>`;
    setupleftColumn(gameButtons);
}

function setupleftColumn(gameButtons) {
    var mainContainer = $("body > .container-fluid");
    var myGamesContainer = $('<div id="myGamesContainer"></div>');
    $("#MyGamesTable").wrap(myGamesContainer);
    myGamesContainer = $("#myGamesContainer");
    var openGamesContainer = $('<div id="openGamesContainer"></div>');
    $("#OpenGamesTable").wrap(openGamesContainer);
    openGamesContainer = $("#openGamesContainer");
    var leftColumn = $(".row.p-3 .pb-4");
    leftColumn.find("> br").remove();
    leftColumn.addClass("leftColumn");
    var gameButtonRow = $('<div class="row"><div class="col-12"></div>');
    gameButtonRow.css("padding-top", "25px");
    mainContainer.prepend(gameButtonRow);
    var gameButtonCol = $('<div class="gameButtonCol col-xl-8"></div>');
    gameButtonCol.css("max-width", "900px");
    gameButtonRow.prepend(gameButtonCol);
    gameButtonCol.append(gameButtons);
    gameButtonCol.append($('#refreshAll').detach());
    openGamesContainer.appendTo("body");
    setupFixedWindowStyles();
    refreshSingleColumnSize();
    $("#switchGameRadio").find("label").on("click", function (e) {
        e.preventDefault();
        var newShowGames = $(this).attr("for");
        if (newShowGames != showGamesActive) {
            $.each($("#switchGameRadio").find("label"), function () {
                $(this).removeClass("active");
            });
            $(this).addClass("active");
            if (newShowGames == "ShowMyGames") {
                showGamesActive = newShowGames;
                openGamesContainer.appendTo("body");
                myGamesContainer.appendTo(leftColumn);
                $("#pastGamesContainer").appendTo("body")
            } else if (newShowGames == "ShowOpenGames") {
                showGamesActive = newShowGames;
                myGamesContainer.appendTo("body");
                openGamesContainer.appendTo(leftColumn);
                $("#pastGamesContainer").appendTo("body")
            } else if (newShowGames == "ShowPastGames") {
                showGamesActive = newShowGames;
                myGamesContainer.appendTo("body");
                openGamesContainer.appendTo("body");
                if ($("#pastGamesContainer").length) {
                    $("#pastGamesContainer").appendTo(leftColumn)
                } else {
                    leftColumn.append("<div id='pastGamesContainer'></div>");
                    refreshPastGames();
                }
            }
            refreshSingleColumnSize()
        }
    });
}

function registerGameTabClick() {
    if (new Date() - lastClick > 2000) {
        $("#openGamesContainer tbody").scrollTop(0);
        lastClick = new Date();
    }
    window.setTimeout(function () {
        domRefresh();
    }, 1);
}

function bindCustomContextMenu() {
    // If the document is clicked somewhere
    $(document).on("mousedown", function (e) {
        // If the clicked element is not the menu
        if (!$(e.target).parents(".context-menu").length > 0) {
            // Hide it
            $(".context-menu").hide(100);
            $(".highlightedBookmark").removeClass("highlightedBookmark")
        }
    });
    $(".context-menu li").click(function () {
        $(".context-menu").hide(100);
    });
}

function setupRightColumn(isInit) {
    if (isInit) {
        createSelector(".SideColumn > table:not(:last-child)", "margin-bottom: 17px;")
    }
    //Bookmarks
    if (isInit) {
        setupBookmarkTable();
    } else {
        refreshBookmarks()
    }
    sortRightColumnTables(function () {

    })
}

function setupVacationAlert() {
    var vacationEnd = WlPlayer.OnVacationUntil;
    if (new Date(vacationEnd) > new Date()) {
        $(".container-fluid.pl-0").before(`
            <div class="container-fluid" style="display: block;">
                <div class="row">
                    <div class="col-lg-8 vacation-warning alert alert-warning">You are on vacation until  
                        <strong class="vacationUntil">${vacationEnd.toLocaleString()}</strong></div>
                </div>
            </div>
        `);
    }
    addCSS(`
        .vacation-warning {
            border: none;
            background: rgba(255,200,180,0.1);
            max-width: 900px;
            margin-bottom: 0;
        }
    `)
}

function sortRightColumnTables(callback) {
    var sideColumn = $(".SideColumn");
    getSortTables(function (tables) {
        $.each(tables, function (key, table) {
            if (table.hidden == true) {
                hideTable(table.id)
            } else {
                var table = $(table.id).closest("table");
                table = table.detach();
                sideColumn.append(table)
            }
        });
        $(".SideColumn > br").remove();
        callback();
    })
}

function makePlayerBoxesClickable(parent) {
    $.each($(parent).find(".GameRow"), function (key, row) {
        var href = $(this).find("a").attr("href");
        var children = $(this).find(".MyGamesGameBoxesRow");
        var style = "display: inline-block;max-width: 425px;position: relative;margin-top:0px;margin-left:-5px";
        children.wrapInner("<a/>").children(0).unwrap().attr("style", style).attr("href", href)
    })
}
function checkVersion() {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "version", function (v) {
        var currentVersion = v != undefined ? v.value : undefined;
        log("Current version " + currentVersion);
        if (currentVersion == version) {
            //Script Up to date
        } else if (currentVersion == undefined) {
            //Script new installed
            addDefaultBookmark();
            setupSettingsDatabase();
        } else {
            removePlayerDataCookie();
        }
        addVersionLabel();
        if (sessionStorage.getItem("showUserscriptMenu")) {
            $('#userscriptMenu').modal('show');
            sessionStorage.removeItem("showUserscriptMenu")
        }
    });
    Database.update(Database.Table.Settings, {
        name: "version",
        value: version
    }, undefined, function () {
    })
}

function addVersionLabel() {
    if (!pageIsGame() && !pageIsExamineMap() && !pageIsDesignMap()) {
        $("body").append('<div class="versionLabel" data-toggle="modal" data-target="#userscriptMenu">' + version + '</div>');
        createSelector(".versionLabel", "z-index:101;position:fixed; right:0; bottom: 0; padding: 5px; color: bisque; font-size: 10px; cursor:pointer")
    }
}
function setupCommunityLevels() {
    $("h1").after(`
        <div class="alert alert-success" role="alert">
            Visit <a target="_blank" href="http://communitylevels.online/">communitylevels.online</a> for advanced search options!
        </div>
    `);
}

function renderLevelRow(level) {
    if (!level) {
        return;
    }
    return `
        <tr>
            <td style="position: relative">
                <img src="${htmlEscape(safeUrl(level.MAP_IMAGE))}" width="140" height="80" style="position:relative">
            </td>
            <td>
                <a style="font-size: 17px; color: white" 
                    href="/SinglePlayer/Level?ID=${htmlEscape(level.ID)}">${htmlEscape(level.NAME)}
                </a> &nbsp;&nbsp;
                <font color="gray">${htmlEscape(level.LIKES)} likes, ${htmlEscape(level.WINS)} wins in ${htmlEscape(level.ATTEMPTS)} attempts</font><br>
                <font color="gray">Created by</font> ${level.CREATOR_CLAN_ID > 0 ? '<a href="/Clans/?ID=' + htmlEscape(level.CREATOR_CLAN_ID) + '" title="' + htmlEscape(level.CREATOR_CLAN_NAME) + '"><img border="0" style="vertical-align: middle" src="' + htmlEscape(safeUrl(level.CREATOR_CLAN_IMAGE)) + '"></a>' : ''} <a href="/Profile?p=${htmlEscape(level.CREATOR_ID)}">${htmlEscape(level.CREATOR_NAME)}</a><br>
                <font color="gray">Record holder:</font> ${level.RECORD_HOLDER_CLAN_ID > 0 ? '<a href="/Clans/?ID=' + htmlEscape(level.RECORD_HOLDER_CLAN_ID) + '" title="' + htmlEscape(level.RECORD_HOLDER_CLAN_NAME) + '"><img border="0" style="vertical-align: middle" src="' + htmlEscape(safeUrl(level.RECORD_HOLDER_CLAN_IMAGE)) + '"></a>' : ''} ${level.RECORD_HOLDER_NAME ? '<a href="/Profile?p=' + htmlEscape(level.RECORD_HOLDER_ID) + '">' + htmlEscape(level.RECORD_HOLDER_NAME) + '</a>' + htmlEscape(getTurnText(level.RECORD_TURNS)) : 'None'}<br>
                <font color="gray">Win rate: </font>${htmlEscape(level.WIN_RATE)}%<br>
            </td>
            <td><span style="font-size: 17px"><a href="/SinglePlayer?Level=${htmlEscape(level.ID)}">Play</a></span></td>
        </tr>`
}

function getTurnText(turns) {
    return ` in ${turns} ${turns > 1 ? 'turns' : 'turn'}`
}

function parseForumSPLevels() {
    var path = 'SinglePlayer';
    var regex = new RegExp(path, 'i');
    $('.region a').each(function () {
        var href = $(this).attr('href');
        if (href && href.match(regex)) {
            parseSPLevel(this, href);
        }
    });
    addCSS(`
        table.SPTable {
            width:100%;
            background: rgba(255,255,255,0.05)
        }
        .SPTable tr {
            display: flex;
            align-items: stretch;
        }
        .SPTable td:last-child {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            margin-right: 5px;
        }
    `)
}

function parseSPLevel(elem, href) {
    var levelId = getLevelId(href);
    if (levelId) {
        $.ajax({
            type: 'GET',
            url: "/SinglePlayer/Level?ID=" + levelId,
            dataType: 'text'
        }).done(function (response) {
            var row = renderLevelRow(parseLevelPage(response, levelId));
            if (row !== undefined) {
                var table = $("<table class='SPTable'></table>");
                table.append(row);
                $(elem).replaceWith(table);
                table.find("tr td").css("text-align", "left");
            }
        }).fail(function (e) {
            log("Error parsing SP level " + levelId + ": " + e.statusText);
        });
    }
}

function parseLevelPage(html, levelId) {
    var container = new DOMParser().parseFromString(html, "text/html").getElementById("AutoContainer");
    var title = container && container.querySelector("h1");
    if (!title) {
        return undefined;
    }
    var level = { ID: levelId, NAME: title.textContent.trim() };
    var image = container.querySelector("img");
    level.MAP_IMAGE = image ? image.getAttribute("src") : "";

    container.querySelectorAll("font.text-muted").forEach(function (label) {
        var nodes = [];
        for (var node = label.nextSibling; node && node.nodeName !== "BR"; node = node.nextSibling) {
            nodes.push(node);
        }
        var text = nodes.map(function (n) { return n.textContent; }).join("").trim();
        var key = label.textContent.trim();
        if (key === "Number of attempts:") {
            level.ATTEMPTS = text;
        } else if (key === "Number of wins:") {
            level.WINS = text;
        } else if (key === "Number of likes:") {
            level.LIKES = text;
        } else if (key === "Created by") {
            readLevelPlayer(nodes, level, "CREATOR");
        } else if (key === "Record holder:") {
            readLevelPlayer(nodes, level, "RECORD_HOLDER");
            var turns = text.match(/in (\d+) turns?/);
            level.RECORD_TURNS = turns ? Number(turns[1]) : undefined;
        }
    });

    var attempts = Number(String(level.ATTEMPTS).replace(/,/g, ""));
    var wins = Number(String(level.WINS).replace(/,/g, ""));
    level.WIN_RATE = attempts > 0 ? (wins / attempts * 100).toFixed(2) : "0";
    return level;
}

function readLevelPlayer(nodes, level, prefix) {
    nodes.forEach(function (node) {
        if (node.nodeName !== "A") {
            return;
        }
        var href = node.getAttribute("href") || "";
        var clan = href.match(/Clans\/\?ID=(\d+)/i);
        var profile = href.match(/Profile\?p=(\d+)/i);
        if (clan) {
            var icon = node.querySelector("img");
            level[prefix + "_CLAN_ID"] = clan[1];
            level[prefix + "_CLAN_NAME"] = node.getAttribute("title") || "";
            level[prefix + "_CLAN_IMAGE"] = icon ? icon.getAttribute("src") : "";
        } else if (profile && !level[prefix + "_ID"]) {
            level[prefix + "_ID"] = profile[1];
            level[prefix + "_NAME"] = node.textContent.trim();
        }
    });
}

function getLevelId(href) {
    var match = href.match(/level\?id=(\d+)/i) || href.match(/level=(\d+)/i);
    if (match) {
        return match[1]
    }
}
function setupCommonGamesDataTable() {
    // DataTables is attached to the script's own jQuery ($$$); war.app's $ stays untouched.
    $$$(".dataTable").DataTable({
        "order": [],
        paging: false,
        sDom: 't',
        columnDefs: [{
            targets: [0],
            orderData: [0, 3]
        }, {
            targets: [1],
            orderData: [1, 2, 3, 0]
        }, {
            targets: [2],
            orderData: [2, 3, 0]
        }, {
            targets: [3],
            orderData: [3, 2, 0]
        }],
        "aoColumns": [
            {
                "orderSequence": ["asc", "desc"]
            },
            {
                "orderSequence": ["asc", "desc"]
            },
            {
                "orderSequence": ["asc", "desc"]
            },
            {
                "orderSequence": ["asc", "desc"]
            }
        ]
    });
    loadDataTableCSS();
    setupCommonGamesHead2Head();
}

function setupCommonGamesHead2Head() {
    var games = $(".dataTable tbody tr").map(function (key, row) {
        return $(row).find("td").map(function (key, td) {
            return $(td).text()
        });
    });
    var games1v1 = games.filter(function (key, val) {
        return val[2] == "1v1"
    }).length || 0;
    var wins1v1 = games.filter(function (key, val) {
        return val[2] == "1v1" && val[3] == "Won";
    }).length;
    var gamesNotCounted = games.filter(function (key, val) {
        return val[2] == "1v1" && (val[3] == "Playing"
            || val[3] == "Removed by Host"
            || val[3] == "Ended by vote");
    }).length;
    var finished = games1v1 - gamesNotCounted;
    var winRate = finished > 0 ? (wins1v1 / finished * 100).toFixed(2) + "%" : "–";
    var losses = finished - wins1v1;
    $(".dataTable").before(`
        <table cellspacing="0" cellpadding="2" width="100%" class="dataTable head2head">
           <thead>
              <tr>
                 <td colspan="2">Head-To-Head</td>
              </tr>
           </thead>
           <tbody>
              <tr>
                 <td>1v1 Games</td>
                 <td>${games1v1}</td>
              </tr>
              <tr>
                 <td>1v1 Wins</td>
                 <td>${wins1v1}</td>
              </tr>
              <tr>
                 <td>1v1 Losses</td>
                 <td>${losses}</td>
              </tr>
              <tr>
                 <td>1v1 Win Rate</td>
                 <td>${winRate}</td>
              </tr>
           </tbody>
        </table>
    `);
    addCSS(`
        .head2head {
            width: 50% !important;
            margin-bottom: 25px;
        }
    `)
}
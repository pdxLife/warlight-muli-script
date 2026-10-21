// ==UserScript==
// @name Tidy up your Dashboard - Modified 
// @namespace https://greasyfork.org/users/10154
// @grant none
// @run-at document-start
// @match https://*.war.app/*
// @description Tidy Up Your Dashboard is a Userscript which brings along a lot of features for improving the user experience on War.app (formerly Warzone).
// @version 3.46.1
// @author KKND (maintainer); Muli (original creator)
// @icon https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/assets/icon.png
// @homepageURL https://pdxlife.github.io/warlight-muli-script/
// @supportURL https://github.com/pdxLife/warlight-muli-script/issues
// @require https://code.jquery.com/jquery-1.11.2.min.js#sha256-Ls0pXSlb7AYs7evhd+VLnWsZ/AqEHcXBeMZUycz/CcA=
// @require https://code.jquery.com/ui/1.11.3/jquery-ui.min.js#sha256-xI/qyl9vpwWFOXz7+x/9WkG5j/SVnSw21viy8fWwbeE=
// @require https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.21/js/jquery.dataTables.min.js#sha256-/7zo27Ll/hVKhCsE+y8m2SS5bhFPEQFheTCL87HuumA=
// @require https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.21/js/dataTables.bootstrap.min.js#sha256-c0sghAryOuWj4sftUftYNtoAyyI4bahkv1+wopyUhFU=
// @downloadURL https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js
// @updateURL https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js
// ==/UserScript==
window.timeUserscriptStart = new Date().getTime();
window.MULIS_USERSCRIPT = true;
var version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '3.46.1';
var DISABLED_FEATURES_KEY = "tidyUpYourDashboard.disabledFeatures";
// Every domain war.app has used; the old ones now redirect to war.app. Bookmarks saved on any of them open on the current domain.
var SITE_HOSTS = ["war.app", "warzone.com", "warlight.net"];
var TURN_CHECK_INTERVAL = 5 * 60 * 1000;
var AWP_SITE = "https://awp.wl-stats.com";
var CUSTOM_SITE = "https://custom.wl-stats.com";
var WL_STATS_CACHE_MS = 60 * 60 * 1000;
var SERIES_CACHE_MS = 10 * 60 * 1000;
var GAMES_CACHE_MS = 5 * 60 * 1000;
var OPEN_GAMES_BOOT_UNITS = { minutes: 1, hours: 60, days: 1440 };
var CLAN_SERIES_KINDS = ["clan_league", "clan_cup", "nations_cup"];
var STAGED_SERIES_KINDS = ["clan_cup", "nations_cup"];
var SCRIPT_URL = "https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js";
var UPDATE_CHECK_KEY = "tidyUpYourDashboard.updateCheck";
var MAIL_PREVIEWS_KEY = "tidyUpYourDashboard.mailPreviews";
var MAIL_PREVIEW_WORDS = 15;
var IDLE_VOLUME_KEY = "tidyUpYourDashboard.idleVolume";
var PLAYER_SEARCH_KEY = "tidyUpYourDashboard.playerSearch";
var IDLE_LOG_KEY = "tidyUpYourDashboard.idleLog";
var IDLE_STORED_KEY = "tidyUpYourDashboard.idleStoredArtifacts";
var SITE_URL = "https://pdxlife.github.io/warlight-muli-script/";
var REPO_URL = "https://github.com/pdxLife/warlight-muli-script";
var MENU_SECTIONS_KEY = "tidyUpYourDashboard.menuSections";
// The settings menu's sections, in order: the key a setting or feature names, and its heading.
var MENU_SECTIONS = [["Dashboard", "Dashboard"], ["Games", "Games"], ["Tournaments", "Tournaments"], ["Community", "Ladders & community"], ["Profile", "Profile"], ["Clans", "Clans"],
    ["Idle", "Idle"], ["Forum", "Forum"], ["Maps & levels", "Maps & levels"], ["Other", "Other"], ["Third-party data", "Third-party data"]];
var UPDATE_CHECK_MS = 24 * 60 * 60 * 1000;
var UPDATE_RETRY_MS = 60 * 60 * 1000;
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

function mailThreadSubject(row) {
    return $(row).find("a[href*='/Discussion/?ID=']").first().text().trim();
}

function mailThreadDay(row) {
    var match = /\d{4}-\d{2}-\d{2}/.exec($(row).children("td").last().text());
    return match ? match[0] : null;
}

function mailWords(text) {
    return String(text || "").toLowerCase().split(/\s+/).filter(function (word) {
        return word.length > 0;
    });
}

function readMailFilters() {
    return {
        player: $("#MailSearchInput").val() || "",
        words: $("#MailWordsInput").val() || "",
        mode: $("#MailWordsMode").val() || "subject",
        from: $("#MailFromInput").val() || "",
        to: $("#MailToInput").val() || ""
    };
}

// previews: thread id -> the first words of its opening message, for the "first 15 words" mode.
function filterMailThreads(filters, previews) {
    var rows = $("table.region tr[data-threadid]");
    var player = filters.player.trim().toLowerCase();
    var words = mailWords(filters.words);
    var active = player !== "" || words.length > 0 || filters.from !== "" || filters.to !== "";
    var matches = rows.filter(function () {
        if (player && !mailThreadPlayers(this).some(function (name) {
            return name.toLowerCase().indexOf(player) !== -1;
        })) {
            return false;
        }
        if (words.length) {
            var text = filters.mode === "preview" ? (previews || {})[$(this).attr("data-threadid")] : mailThreadSubject(this);
            if (text == null) {
                return false;
            }
            text = text.toLowerCase();
            if (!words.every(function (word) {
                return text.indexOf(word) !== -1;
            })) {
                return false;
            }
        }
        var day = mailThreadDay(this);
        return !(filters.from && (!day || day < filters.from)) && !(filters.to && (!day || day > filters.to));
    });
    rows.not(matches).hide();
    matches.show();
    return active ? matches.length + " of " + rows.length + " threads" : "";
}

function mailPreviewText(html) {
    var page = new DOMParser().parseFromString(html, "text/html");
    var post = page.querySelector("[id^='PostForDisplay_']");
    if (!post) {
        return null;
    }
    $(post).find("br").replaceWith(" ");
    return String(post.textContent).trim().split(/\s+/).slice(0, MAIL_PREVIEW_WORDS).join(" ");
}

function storedMailPreviews() {
    try {
        var stored = JSON.parse(localStorage.getItem(MAIL_PREVIEWS_KEY));
        return stored && typeof stored === "object" ? stored : {};
    } catch (e) {
        return {};
    }
}

// The opening message never changes, so each thread is read once and remembered in this browser.
function loadMailPreviews(previews, onProgress) {
    var done = $.Deferred();
    var missing = $("table.region tr[data-threadid]").map(function () {
        return $(this).attr("data-threadid");
    }).get().filter(function (id) {
        return previews[id] == null;
    });
    var next = 0;
    var finished = 0;
    var failed = 0;
    var save = function () {
        try {
            localStorage.setItem(MAIL_PREVIEWS_KEY, JSON.stringify(previews));
        } catch (e) {
        }
    };
    var work = function () {
        if (next >= missing.length) {
            return;
        }
        var id = missing[next++];
        $.ajax({ url: "/Discussion/?ID=" + encodeURIComponent(id), dataType: "text" }).done(function (html) {
            var text = mailPreviewText(html);
            if (text != null) {
                previews[id] = text;
            } else {
                failed++;
            }
        }).fail(function (xhr) {
            failed++;
            log("Error reading mail thread " + id + ": " + (xhr && xhr.statusText));
        }).always(function () {
            finished++;
            onProgress(finished, missing.length);
            if (finished === missing.length) {
                save();
                done.resolve(failed);
            } else {
                if (finished % 20 === 0) {
                    save();
                }
                work();
            }
        });
    };
    if (!missing.length) {
        return done.resolve(0).promise();
    }
    for (var i = 0; i < 3; i++) {
        work();
    }
    return done.promise();
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

// A setting added after a user's first run has no stored value yet, so it takes its default.
function readSettingValue(name, fallback, callback) {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, name, function (setting) {
        callback(setting && setting.value !== undefined ? setting.value : fallback);
    });
}

function setupMailSearch() {
    var table = $("table.region").first();
    if (table.length === 0 || table.find("tr[data-threadid]").length === 0) {
        return;
    }
    readSettingValue("mailPreviewSearch", true, function (previewOn) {
        readSettingValue("mailPreviewAsked", false, function (asked) {
            buildMailSearch(table, previewOn, asked);
        });
    });
}

function buildMailSearch(table, previewOn, asked) {
    addCSS(`
        #MailSearch {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px 10px;
            margin: 8px 0;
        }
        #MailSearch input, #MailSearch select {
            padding: 4px 8px;
            background: #222;
            color: #ddd;
            border: 1px solid #555;
            color-scheme: dark;
        }
        #MailSearch input[type=text] {
            width: 170px;
        }
        #MailSearch > span {
            white-space: nowrap;
        }
        #MailSearch label {
            margin: 0;
            font-weight: normal;
        }
        #MailPreviewNotice {
            flex-basis: 100%;
            max-width: 720px;
            padding: 8px 12px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #1b1b1b;
            color: #ccc;
        }
        #MailPreviewNotice .btn {
            margin: 6px 6px 0 0;
        }
    `);
    table.before(`<div id="MailSearch">
        <input type="text" id="MailSearchInput" placeholder="Filter by player">
        <span><input type="text" id="MailWordsInput" placeholder="Filter by words">
        <select id="MailWordsMode" title="Where to look for the words"><option value="subject">in subject</option>` +
        (previewOn ? `<option value="preview">in first ${MAIL_PREVIEW_WORDS} words</option>` : "") + `</select></span>
        <span><label>Last post from <input type="date" id="MailFromInput"></label>
        <label>to <input type="date" id="MailToInput"></label></span>
        <span id="MailSearchCount" class="text-muted"></span></div>`);
    var allLoaded = null;
    var previews = null;
    var reading = null;
    var progress = "";
    var searchTimer;
    var show = function () {
        var filters = readMailFilters();
        if (filters.mode === "preview" && !asked) {
            filters.words = "";
        }
        var count = filterMailThreads(filters, previews);
        $("#MailSearchCount").text([progress, count].filter(Boolean).join(" · "));
    };
    var startReading = function () {
        previews = storedMailPreviews();
        reading = loadMailPreviews(previews, function (done, total) {
            progress = done < total ? "Reading mail " + done + " of " + total + "..." : "";
            show();
        }).done(function (failed) {
            progress = failed ? failed + (failed === 1 ? " thread" : " threads") + " couldn't be read" : "";
            show();
        });
    };
    // Reading mail opens every thread, so the first time the user is told and can say no.
    var askFirst = function () {
        if ($("#MailPreviewNotice").length) {
            return;
        }
        var threads = $("table.region tr[data-threadid]").length;
        $("#MailSearch").append(`<div id="MailPreviewNotice">To search the first ${MAIL_PREVIEW_WORDS} words, the script opens each of your ${threads} mail threads once
            (about ${Math.max(5, Math.round(threads / 14 / 5) * 5)} seconds) and keeps those words in this browser, so later searches are instant.<br>
            <button type="button" class="btn btn-primary btn-sm" id="MailPreviewContinue">Continue</button><button type="button" class="btn btn-secondary btn-sm" id="MailPreviewOff">Turn off</button></div>`);
        $("#MailPreviewContinue").on("click", function () {
            asked = true;
            Database.update(Database.Table.Settings, { name: "mailPreviewAsked", value: true });
            $("#MailPreviewNotice").remove();
            startReading();
            show();
        });
        $("#MailPreviewOff").on("click", function () {
            asked = true;
            Database.update(Database.Table.Settings, { name: "mailPreviewAsked", value: true });
            Database.update(Database.Table.Settings, { name: "mailPreviewSearch", value: false });
            try {
                localStorage.removeItem(MAIL_PREVIEWS_KEY);
            } catch (e) {
            }
            $("#MailWordsMode option[value=preview]").remove();
            $("#MailWordsMode").val("subject");
            $("#MailPreviewNotice").html("Turned off. You can turn it back on in the settings menu, under Other.");
            show();
        });
    };
    var update = function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
            var filters = readMailFilters();
            var inMail = filters.mode === "preview";
            if (!allLoaded) {
                if (!inMail && !filters.player.trim() && !filters.words.trim() && !filters.from && !filters.to) {
                    return show();
                }
                $("#MailSearchCount").text("Loading all threads...");
                allLoaded = loadAllMailThreads().fail(function (xhr) {
                    log("Error loading mail threads: " + (xhr && xhr.statusText));
                });
            }
            allLoaded.always(function () {
                if (inMail && !asked) {
                    askFirst();
                } else if (inMail && !reading) {
                    startReading();
                }
                show();
            });
        }, 150);
    };
    $("#MailSearch").on("input change", "input, select", update);
}

function idleVolumeLevel() {
    try {
        var stored = parseFloat(localStorage.getItem(IDLE_VOLUME_KEY));
        return isNaN(stored) ? 1 : Math.max(0, Math.min(1, stored));
    } catch (e) {
        return 1;
    }
}

// Idle plays its sounds as HTML audio, often from elements outside the page, so the volume is
// applied where every element's volume is set: each one keeps the volume Idle asked for, scaled.
function setupIdleVolume() {
    var native = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    if (!native || !native.set) {
        return;
    }
    var level = idleVolumeLevel();
    var asked = new WeakMap();
    var known = [];
    var apply = function (element) {
        native.set.call(element, (asked.has(element) ? asked.get(element) : 1) * level);
    };
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
        configurable: true,
        enumerable: native.enumerable,
        get: function () {
            return this instanceof HTMLAudioElement && asked.has(this) ? asked.get(this) : native.get.call(this);
        },
        set: function (value) {
            if (!(this instanceof HTMLAudioElement)) {
                return native.set.call(this, value);
            }
            asked.set(this, value);
            apply(this);
        }
    });
    var play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
        if (this instanceof HTMLAudioElement) {
            if (known.indexOf(this) === -1) {
                known.push(this);
                if (known.length > 200) {
                    known.shift();
                }
            }
            apply(this);
        }
        return play.apply(this, arguments);
    };
    addCSS(`
        #idleVolume {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-left: 6px;
            vertical-align: middle;
            color: #ddd;
            font-size: 12px;
        }
        #idleVolume input {
            width: 80px;
            accent-color: #e0c060;
        }
    `);
    var show = function () {
        if ($("#idleVolume").length) {
            return;
        }
        var speaker = $("#SoundContainer");
        var control = $('<span id="idleVolume" title="Idle volume (Muli\'s Userscript)"><input type="range" min="0" max="100" step="5" aria-label="Idle volume"><span class="idleVolumeValue"></span></span>');
        control.find("input").val(Math.round(level * 100)).on("input", function () {
            level = Number(this.value) / 100;
            control.find(".idleVolumeValue").text(this.value + "%");
            try {
                localStorage.setItem(IDLE_VOLUME_KEY, String(level));
            } catch (e) {
            }
            known.forEach(apply);
        });
        control.find(".idleVolumeValue").text(Math.round(level * 100) + "%");
        if (speaker.length) {
            speaker.after(control);
        } else {
            $("body").append(control.css({ position: "fixed", right: "12px", bottom: "12px", zIndex: 1000 }));
        }
    };
    show();
    $(show);
}

var IDLE_NUMBER_SUFFIXES = { k: [1e3, "thousand"], m: [1e6, "million"], b: [1e9, "billion"], t: [1e12, "trillion"], p: [1e15, "quadrillion"], e: [1e18, "quintillion"], z: [1e21, "sextillion"] };

// Idle reads "121p" as 121 quadrillion; null when the text isn't a number it would read.
function parseIdleNumber(text) {
    var match = /^\s*([\d.,]+)\s*([a-z]?)\s*$/i.exec(String(text || ""));
    if (!match) {
        return null;
    }
    var number = parseFloat(match[1].replace(/,/g, ""));
    var suffix = match[2].toLowerCase();
    if (isNaN(number) || (suffix && !IDLE_NUMBER_SUFFIXES[suffix])) {
        return null;
    }
    return suffix ? number * IDLE_NUMBER_SUFFIXES[suffix][0] : number;
}

function idleNumberWords(text) {
    var match = /^\s*([\d.,]+)\s*([a-z])\s*$/i.exec(String(text || ""));
    var suffix = match && IDLE_NUMBER_SUFFIXES[match[2].toLowerCase()];
    return suffix ? match[1] + " " + suffix[1] : String(text || "").trim();
}

// The question to ask before a market purchase, or "" when the order is what was typed: Idle
// quietly buys as many as the money allows when the typed number is more than that.
function idleMarketQuestion(dialog) {
    var box = $(dialog).find("[id^='ujs_NumToBuyBox'] textarea, [id^='ujs_NumToBuyBox'] input").first();
    var label = $(dialog).find("a[id^='ujs_PurchaseBtn']").first().parent().text().replace(/\s+/g, " ").trim();
    var order = /Purchase\s+([\d.,]+\s*[a-z]?)\s+for\s+(\S+)/i.exec(label);
    var typed = box.val();
    var wanted = parseIdleNumber(typed);
    var buying = order && parseIdleNumber(order[1]);
    if (wanted == null || buying == null || wanted <= buying * 1.001) {
        return "";
    }
    var item = $(dialog).find("[id^='ujs_NameLabel']").filter(function () {
        return !$(this).closest("[id^='ujs_WziMarketDialogRow']").length;
    }).first().text().trim();
    return "You typed " + String(typed).trim() + " (" + idleNumberWords(typed) + "), more than you can afford.\n\n" +
        "This buys " + order[1].trim() + (item ? " " + item : "") + " for " + order[2] + ", as many as your money allows.\n\nBuy them?";
}

function setupIdleMarketCheck() {
    document.addEventListener("click", function (event) {
        var button = $(event.target).closest("a[id^='ujs_PurchaseBtn']");
        var dialog = button.closest("[id^='ujs_WziMarketDialog']");
        if (!button.length || !dialog.length) {
            return;
        }
        var question = idleMarketQuestion(dialog);
        if (question && !window.confirm(question)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
}

// The question to ask before an artifact is activated or a power used, or "" for other buttons.
function idleActionQuestion(link) {
    var id = $(link).attr("id") || "";
    if (/^ujs_ActivateBtn(?:_\d+)?_btn$/.test(id)) {
        var card = $(link).closest("[id^='ujs_WziTabBodyAPArtifact']");
        var name = card.find("[id^='ujs_Name']").first().text().trim();
        var rarity = card.find("[id^='ujs_Rarity']").first().text().trim();
        var stored = idleStoredArtifacts().indexOf(name + "|" + rarity) !== -1;
        return "Activate " + (name || "this artifact") + (rarity ? " (" + rarity + ")" : "") + "?" + (stored ? " You marked it as stored." : "");
    }
    if (/^ujs_UseBtn(?:_\d+)?_btn$/.test(id)) {
        var row = $(link).closest("[id^='ujs_WziTabBodyIAPRow']");
        var power = row.find("*").filter(function () {
            return !this.children.length && $(this).text().trim();
        }).first().text().trim();
        var have = /(\d[\d,]*)\s*\/\s*\d/.exec(row.text());
        var count = have ? Number(have[1].replace(/,/g, "")) : null;
        return "Use " + (power || "this power") + "?" +
            (count === 0 ? " You have none left, so this costs coins." : count != null ? " You have " + count + "." : "");
    }
    return "";
}

function setupIdleActionConfirm() {
    document.addEventListener("click", function (event) {
        var link = $(event.target).closest("a.ujsBtnInner")[0];
        var question = link && idleActionQuestion(link);
        if (question && !window.confirm(question)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
}

function idleRarityRank(rarity) {
    return ["Poor", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Insane"].indexOf(String(rarity || "").trim());
}

// Artifacts the player marked as never to be used, by name and rarity (cards have no id of their own).
function idleStoredArtifacts() {
    try {
        var stored = JSON.parse(localStorage.getItem(IDLE_STORED_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
}

function toggleIdleStoredArtifact(key) {
    var stored = idleStoredArtifacts();
    var at = stored.indexOf(key);
    if (at === -1) {
        stored.push(key);
    } else {
        stored.splice(at, 1);
    }
    try {
        localStorage.setItem(IDLE_STORED_KEY, JSON.stringify(stored));
    } catch (e) {
    }
    return at === -1;
}

// The cards in Idle's artifact window: the equipped row and everything else, scrolled out of view or not.
function idleArtifactCards(dialog) {
    var stored = idleStoredArtifacts();
    return $(dialog).find("[id^='ujs_WziArtifactCard']").filter(function () {
        return /^ujs_WziArtifactCard(?:_\d+)?$/.test(this.id);
    }).map(function () {
        var card = $(this);
        var rarity = card.find("[id^='ujs_Rarity']").first().text().trim();
        return {
            element: this,
            name: card.find("[id^='ujs_Name']").first().text().trim(),
            rarity: rarity,
            rank: idleRarityRank(rarity),
            equipped: card.closest("[id^='ujs_EquippedCard']").length > 0,
            stored: stored.indexOf(card.find("[id^='ujs_Name']").first().text().trim() + "|" + rarity) !== -1
        };
    }).get().filter(function (card) {
        return card.name;
    });
}

// Each equipped artifact that has a higher-rarity copy among the unequipped ones, with the best copy.
function idleBetterCopies(cards) {
    return cards.filter(function (card) {
        return card.equipped;
    }).map(function (card) {
        var better = cards.filter(function (other) {
            return !other.equipped && !other.stored && other.name === card.name && other.rank > card.rank;
        }).sort(function (a, b) {
            return b.rank - a.rank;
        })[0];
        return better ? { card: card, better: better } : null;
    }).filter(Boolean);
}

function idleArtifactListHtml(cards, sortBy) {
    var sorted = cards.slice().sort(function (a, b) {
        return sortBy === "name" ? a.name.localeCompare(b.name) || b.rank - a.rank : b.rank - a.rank || a.name.localeCompare(b.name);
    });
    var lower = idleBetterCopies(cards).map(function (pair) {
        return pair.card.element;
    });
    var counts = {};
    cards.forEach(function (card) {
        counts[card.name] = (counts[card.name] || 0) + 1;
    });
    return '<div class="idleArtifactListHead">All artifacts (' + cards.length + ')' +
        '<span class="idleArtifactSort">Sort: <a href="#" data-sort="rarity"' + (sortBy === "name" ? "" : ' class="active"') + '>rarity</a> · ' +
        '<a href="#" data-sort="name"' + (sortBy === "name" ? ' class="active"' : "") + '>name</a></span>' +
        '<a href="#" class="idleArtifactListClose" title="Close">×</a></div><table>' + sorted.map(function (card) {
            return '<tr' + (lower.indexOf(card.element) !== -1 ? ' class="idleArtifactLower" title="A higher-rarity copy isn\'t equipped"' : "") + '>' +
                '<td>' + htmlEscape(card.name) + (counts[card.name] > 1 ? ' <span class="idleArtifactCount">×' + counts[card.name] + '</span>' : "") + '</td>' +
                '<td class="idleRarity' + htmlEscape(card.rarity) + '">' + htmlEscape(card.rarity) + '</td>' +
                '<td>' + (card.equipped ? "equipped" : "") + '</td>' +
                '<td><a href="#" class="idleStoreToggle' + (card.stored ? " stored" : "") + '" data-artifact="' + htmlEscape(card.name + "|" + card.rarity) + '" title="' +
                (card.stored ? "Stored: never suggested, dimmed in the window. Click to take it out of storage." : "Mark as stored: an artifact you never want used") + '">' +
                (card.stored ? "stored" : "store") + '</a></td></tr>';
        }).join("") + '</table>';
}

function markIdleArtifacts(dialog) {
    var cards = idleArtifactCards(dialog);
    $(dialog).find(".tuydBetterTag").remove();
    $(dialog).find(".tuydStoredTag").remove();
    $(dialog).find(".tuydBetterCopy, .tuydLowerCopy, .tuydStoredCopy").removeClass("tuydBetterCopy tuydLowerCopy tuydStoredCopy");
    cards.filter(function (card) {
        return card.stored;
    }).forEach(function (card) {
        // The card's frame, picture and labels are separate elements, so the whole card is dimmed,
        // and the tag sits beside it, in its holder, so it isn't dimmed too.
        $(card.element).addClass("tuydStoredCopy").parent().append('<div class="tuydStoredTag" title="Marked as stored">Stored</div>');
    });
    idleBetterCopies(cards).forEach(function (pair) {
        var image = $(pair.card.element).children("[id$='_img']").first();
        image.addClass("tuydLowerCopy").append('<div class="tuydBetterTag" title="' + htmlEscape("You have " + pair.better.rarity + " " + pair.card.name + " that isn't equipped") + '">Better: ' + htmlEscape(pair.better.rarity) + '</div>');
        $(pair.better.element).children("[id$='_img']").first().addClass("tuydBetterCopy");
    });
    return cards;
}

function setupIdleArtifactHelpers() {
    addCSS(`
        .tuydStoredCopy {
            opacity: 0.45;
        }
        .tuydStoredTag {
            position: absolute;
            left: 2px;
            width: 69px;
            bottom: 40px;
            z-index: 3;
            border-radius: 3px;
            background: #555;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            line-height: 13px;
            text-align: center;
        }
        #idleArtifactList .idleStoreToggle {
            color: #777;
            font-size: 11px;
        }
        #idleArtifactList .idleStoreToggle.stored {
            color: #e0c060;
        }
        .tuydLowerCopy, .tuydBetterCopy {
            outline: 2px solid #e0c060;
            outline-offset: -2px;
        }
        .tuydBetterTag {
            position: absolute;
            left: 2px;
            right: 2px;
            top: 34px;
            z-index: 3;
            padding: 1px 0;
            border-radius: 3px;
            background: #e0c060;
            color: #1b1b1b;
            font-size: 10px;
            font-weight: 700;
            line-height: 13px;
            text-align: center;
            pointer-events: auto;
        }
        #idleArtifactListBtn {
            position: absolute;
            left: 92px;
            bottom: 3px;
            z-index: 3;
            padding: 3px 9px;
            pointer-events: auto;
            white-space: nowrap;
            font-size: 13px;
        }
        #idleArtifactList {
            position: fixed;
            top: 80px;
            right: 12px;
            z-index: 2000;
            width: 300px;
            max-width: calc(100vw - 24px);
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            padding: 8px 10px;
            border: 1px solid #555;
            border-radius: 6px;
            background: #1b1b1b;
            color: #ccc;
            font-size: 13px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
        }
        #idleArtifactList .idleArtifactListHead {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 6px;
            color: #fff;
            font-weight: 700;
        }
        #idleArtifactList .idleArtifactSort {
            font-weight: normal;
            color: #999;
            font-size: 12px;
        }
        #idleArtifactList .idleArtifactSort a.active {
            color: #fff;
            text-decoration: underline;
        }
        #idleArtifactList .idleArtifactListClose {
            margin-left: auto;
            color: #aaa;
            font-size: 18px;
            text-decoration: none;
        }
        #idleArtifactList table {
            width: 100%;
        }
        #idleArtifactList td {
            padding: 2px 4px;
            border-top: 1px solid #2c2c2c;
        }
        #idleArtifactList td:last-child {
            color: #888;
            font-size: 12px;
        }
        #idleArtifactList .idleArtifactCount {
            color: #888;
            font-size: 12px;
        }
        #idleArtifactList tr.idleArtifactLower td:first-child:before {
            content: "⚠ ";
            color: #e0c060;
        }
        .idleRarityPoor { color: #9d9d9d; }
        .idleRarityCommon { color: #ffffff; }
        .idleRarityUncommon { color: #4fbf4f; }
        .idleRarityRare { color: #6f8fff; }
        .idleRarityEpic { color: #e040e0; }
        .idleRarityLegendary { color: #ff9a2e; }
        .idleRarityInsane { color: #ff4040; }
    `);
    var sortBy = "rarity";
    var signature = "";
    var timer = null;
    var render = function (cards) {
        $("#idleArtifactList").html(idleArtifactListHtml(cards, sortBy));
    };
    var check = function () {
        timer = null;
        var dialog = $("[id^='ujs_WziArtifactsDialog']").filter(function () {
            return /^ujs_WziArtifactsDialog(?:_\d+)?$/.test(this.id);
        }).last();
        if (!dialog.length) {
            $("#idleArtifactList").remove();
            signature = "";
            return;
        }
        var cards = idleArtifactCards(dialog);
        var now = cards.map(function (card) {
            return card.name + "|" + card.rarity + "|" + card.equipped + "|" + card.stored;
        }).join(";");
        // Marking changes the page too; only redo it when the cards themselves changed.
        if (now !== signature || !dialog.find(".tuydBetterTag").length !== !idleBetterCopies(cards).length) {
            signature = now;
            markIdleArtifacts(dialog);
            if ($("#idleArtifactList").length) {
                render(cards);
            }
        }
        var toggle = dialog.find("[id^='ujs_AutoSortToggle']").first();
        if (toggle.length && !$("#idleArtifactListBtn").length) {
            toggle.append('<a href="#" id="idleArtifactListBtn" class="btn btn-primary btn-sm" title="All artifacts as a sortable list (Muli\'s Userscript)">List</a>');
        }
    };
    $(document).on("click", "#idleArtifactListBtn", function (event) {
        event.preventDefault();
        if ($("#idleArtifactList").length) {
            $("#idleArtifactList").remove();
            return;
        }
        $("body").append('<div id="idleArtifactList"></div>');
        render(idleArtifactCards($("[id^='ujs_WziArtifactsDialog']").last()));
    }).on("click", "#idleArtifactList [data-sort]", function (event) {
        event.preventDefault();
        sortBy = $(this).attr("data-sort");
        render(idleArtifactCards($("[id^='ujs_WziArtifactsDialog']").last()));
    }).on("click", "#idleArtifactList .idleStoreToggle", function (event) {
        event.preventDefault();
        toggleIdleStoredArtifact($(this).attr("data-artifact"));
        check();
        render(idleArtifactCards($("[id^='ujs_WziArtifactsDialog']").last()));
    }).on("click", "#idleArtifactList .idleArtifactListClose", function (event) {
        event.preventDefault();
        $("#idleArtifactList").remove();
    });
    // Idle redraws its counters many times a second, so the check runs at most four times a second.
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 250);
        }
    }).observe(document.body, { childList: true, subtree: true });
    check();
}

// Idle open in two places can lose progress; war.app asks about other devices, but not about a
// second tab in the same browser.
function setupIdleTabWarning() {
    if (typeof BroadcastChannel !== "function" || !/\/Idle\/Play/i.test(location.pathname)) {
        return;
    }
    var channel = new BroadcastChannel("tidyUpYourDashboard.idle");
    var me = String(Math.random()).slice(2);
    channel.onmessage = function (event) {
        var data = event.data || {};
        if (data.from === me) {
            return;
        }
        if (data.type === "hello") {
            channel.postMessage({ type: "here", from: me });
        }
        if (data.type === "hello" || data.type === "here") {
            showIdleTabWarning();
        }
    };
    channel.postMessage({ type: "hello", from: me });
}

function showIdleTabWarning() {
    if ($("#idleTabWarning").length) {
        return;
    }
    addCSS(`
        #idleTabWarning {
            position: fixed;
            top: 70px;
            left: 50%;
            z-index: 3000;
            transform: translateX(-50%);
            max-width: calc(100vw - 24px);
            padding: 10px 14px;
            border: 1px solid #a33;
            border-radius: 6px;
            background: #3a1212;
            color: #fff;
            font-size: 14px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
        }
        #idleTabWarning button {
            margin-left: 10px;
        }
    `);
    $("body").append('<div id="idleTabWarning" role="alert">War.app Idle is also open in another tab of this browser. Having Idle open in two places can lose progress: close one of them.' +
        '<button type="button" class="btn btn-secondary btn-sm">Got it</button></div>');
    $("#idleTabWarning button").on("click", function () {
        $("#idleTabWarning").remove();
    });
}

function formatIdleWait(seconds) {
    var minutes = Math.ceil(seconds / 60);
    if (seconds < 60) {
        return "in " + Math.max(1, Math.ceil(seconds)) + "s";
    }
    if (minutes < 60) {
        return "in " + minutes + "m";
    }
    var hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return "in " + hours + "h" + (minutes % 60 ? " " + minutes % 60 + "m" : "");
    }
    return "in " + Math.floor(hours / 24) + "d" + (hours % 24 ? " " + hours % 24 + "h" : "");
}

// "￦1.18B (171K/sec)" from Idle's money counter.
function parseIdleMoney(text) {
    var match = /[￦₩]\s*([\d.,]+\s*[a-z]?)\s*\(\s*([\d.,]+\s*[a-z]?)\s*\/\s*sec/i.exec(String(text || ""));
    return match ? { money: parseIdleNumber(match[1]), rate: parseIdleNumber(match[2]) } : null;
}

// The rows of Idle's camp, mine and hospital tabs that can be upgraded for money.
function idleUpgradeRows() {
    return $("[id^='ujs_WziTabBody']").filter(function () {
        return /^ujs_WziTabBody(?:ArmyCamp|Mine|Hospital|MercenaryCamp)Row(?:_\d+)?$/.test(this.id);
    }).map(function () {
        var row = $(this);
        var button = row.find("a[id^='ujs_UpgradeBtn']").first();
        var cost = /Upgrade\s*[￦₩]\s*([\d.,]+\s*[a-z]?)/i.exec(button.parent().text());
        var outputs = row.find("[id$='_tmp']").filter(function () {
            return /\/\s*s(?:ec)?\b|Saves/.test($(this).text()) && !$(this).closest("[id^='ujs_UpgradeBtn']").length;
        });
        var host = outputs.first();
        var output = /^\s*₳\s*([\d.,]+\s*[a-z]?)\s*\/\s*sec/i.exec(host.text());
        return cost ? {
            row: this,
            camp: /ArmyCampRow/.test(this.id),
            cost: parseIdleNumber(cost[1]),
            output: output ? parseIdleNumber(output[1]) : null,
            host: host[0] || null,
            outputs: outputs.get()
        } : null;
    }).get().filter(function (entry) {
        return entry && entry.cost != null;
    });
}

// Each army camp upgrade adds about the same share of what the camp makes, so the camp that
// makes the most per ₩ of its upgrade cost gains the most for the money.
function idleBestCamp(rows) {
    return rows.filter(function (entry) {
        return entry.camp && entry.output && entry.cost > 0;
    }).sort(function (a, b) {
        return b.output / b.cost - a.output / a.cost;
    })[0] || null;
}

// The right edge of the tab panel a row's label is drawn in: war.app's ujs_* elements are zero-size
// anchors, so it's the first holder up the tree that's as wide as a panel.
function idlePanelRight(element) {
    for (var node = element.parentElement; node && node !== document.body; node = node.parentElement) {
        var box = node.getBoundingClientRect();
        if (box.width > 300) {
            return box.right;
        }
    }
    return Infinity;
}

function showIdleUpgradeHints() {
    var wallet = parseIdleMoney($("[id^='ujs_MoneyLabel']").first().text());
    if (!wallet || wallet.money == null) {
        return;
    }
    var rows = idleUpgradeRows();
    var best = idleBestCamp(rows);
    rows.forEach(function (entry) {
        if (!entry.host) {
            return;
        }
        var wait = entry.cost > wallet.money && wallet.rate > 0 ? formatIdleWait((entry.cost - wallet.money) / wallet.rate) : "";
        var text = [wait, entry === best ? "Best value" : ""].filter(Boolean).join(" · ");
        var hint = $(entry.row).find(".idleUpgradeHint");
        if (!text) {
            hint.remove();
            return;
        }
        // war.app rewrites its labels several times a second, so the hint sits beside the row's last
        // output (mines make two or three ores, side by side), in that label's holder.
        var last = entry.outputs.reduce(function (rightmost, element) {
            return element.getBoundingClientRect().right >= rightmost.getBoundingClientRect().right ? element : rightmost;
        });
        var holder = $(last).parent();
        if (!hint.length) {
            hint = $('<span class="idleUpgradeHint"></span>');
        }
        if (hint.parent()[0] !== holder[0]) {
            hint.appendTo(holder);
        }
        hint.toggleClass("idleBestValue", entry === best).text(text)
            .attr("title", (wait ? "When you can afford this at your current ₩/sec. " : "") + (entry === best ? "The army camp that adds the most armies per ₩ of its upgrade cost." : ""));
        var label = $(last).children().first()[0] || last;
        var labelBox = label.getBoundingClientRect();
        var width = Math.round(labelBox.width || label.offsetWidth || 0);
        var below = labelBox.right + 8 + hint[0].offsetWidth > idlePanelRight(last) - 4;
        hint.toggleClass("idleUpgradeHintBelow", below)
            .css(below ? { left: "", lineHeight: "" } : { left: width + 8 + "px", lineHeight: (last.offsetHeight || 18) + "px" });
    });
}

function formatIdleMoney(amount) {
    var suffixes = [["Z", 1e21], ["E", 1e18], ["P", 1e15], ["T", 1e12], ["B", 1e9], ["M", 1e6], ["K", 1e3]];
    for (var i = 0; i < suffixes.length; i++) {
        if (amount >= suffixes[i][1]) {
            var value = amount / suffixes[i][1];
            return "₩" + (value >= 100 ? Math.round(value) : value >= 10 ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100) + suffixes[i][0];
        }
    }
    return "₩" + Math.round(amount);
}

// From Idle's save: each market's price multiplier and, per item, how much buying one raises its price.
function idleMarketRates(save) {
    var markets = {};
    String(save || "").replace(/<di\b[^>]*Type="WziAssetMarket"[^>]*>/g, function (tag) {
        var attributes = {};
        tag.replace(/(\w+)="([^"]*)"/g, function (all, name, value) {
            attributes[name] = value;
        });
        var rates = {};
        (attributes.Resources || "").split("|").forEach(function (pair) {
            var parts = pair.split(";");
            if (parts.length === 2 && Number.isFinite(Number(parts[1]))) {
                rates[parts[0]] = Number(parts[1]);
            }
        });
        if (attributes.ID) {
            markets[attributes.ID] = {
                multiplier: Number(attributes.Multiplier) || 1,
                items: (attributes.ResourceTypesAvailable || "").split(",").filter(Boolean).map(function (id) {
                    return { id: id, rate: rates[id] || 0 };
                })
            };
        }
        return tag;
    });
    return markets;
}

// The markets listed in Idle's Items tab, with each item's current price; war.app keeps the rows in the
// page while another tab is open.
function idleMarketPrices() {
    return $("[id^='ujs_WziTabBodyMarketRow']").filter(function () {
        return /^ujs_WziTabBodyMarketRow(?:_\d+)?$/.test(this.id);
    }).map(function () {
        var items = $(this).find("[id^='ujs_ResourceLabelContainer'] .ujsTextInner").map(function () {
            var match = /^(.+?) for [￦₩]\s*([\d.,]+\s*[a-z]?)$/i.exec($(this).text().trim());
            return match ? { name: match[1], price: parseIdleNumber(match[2]) } : null;
        }).get().filter(function (item) {
            return item && item.price !== null;
        });
        return { market: $(this).find("[id^='ujs_NameLabel'] .ujsTextInner").first().text().trim(), items: items };
    }).get();
}

// Idle raises an item's price by the same step for each one bought, so n of them cost
// n × price + base price × rate × n² / 2, where the base price is the price over the market's multiplier.
function idleMarketCost(price, rate, multiplier, count) {
    return count * price + (multiplier > 0 ? price / multiplier : price) * (rate || 0) * count * count / 2;
}

function idleCheapestPurchase(name, count, prices, rates) {
    var best = null;
    prices.forEach(function (market) {
        market.items.forEach(function (item, index) {
            if (item.name !== name) {
                return;
            }
            var saved = rates[market.market];
            var known = saved && saved.items[index];
            var cost = idleMarketCost(item.price, known ? known.rate : 0, saved ? saved.multiplier : 1, count);
            if (!best || cost < best.cost) {
                best = { market: market.market, cost: cost, exact: !!known };
            }
        });
    });
    return best;
}

function idleTechCostRows(dialog) {
    return $(dialog).find("[id^='ujs_CostContainer']").first().children().map(function () {
        var labels = $(this).children(".ujsText").map(function () {
            return { holder: this, text: $(this).children(".ujsTextInner").text().trim() };
        }).get();
        var counts = labels.length === 2 && /^([\d.,]+\s*[a-z]?)\s*\/\s*([\d.,]+\s*[a-z]?)$/i.exec(labels[0].text);
        if (!counts) {
            return null;
        }
        return { row: this, nameHolder: labels[1].holder, name: labels[1].text, have: parseIdleNumber(counts[1]), need: parseIdleNumber(counts[2]) };
    }).get().filter(function (row) {
        return row && row.have !== null && row.need !== null;
    });
}

function readIdleSave() {
    if (!window.indexedDB || typeof indexedDB.databases !== "function") {
        return Promise.resolve(null);
    }
    return indexedDB.databases().then(function (databases) {
        if (!databases.some(function (database) {
            return database.name === "WZ";
        })) {
            return null;
        }
        return new Promise(function (resolve) {
            var request = indexedDB.open("WZ");
            // Never create or change Idle's own database.
            request.onupgradeneeded = function () {
                request.transaction.abort();
            };
            request.onerror = request.onblocked = function () {
                resolve(null);
            };
            request.onsuccess = function () {
                var db = request.result;
                try {
                    var store = db.transaction("WZB", "readonly").objectStore("WZB");
                    var keys = store.getAllKeys();
                    keys.onsuccess = function () {
                        var key = keys.result.filter(function (k) {
                            return /_WziMaster$/.test(String(k));
                        })[0];
                        if (!key) {
                            db.close();
                            resolve(null);
                            return;
                        }
                        var get = store.get(key);
                        get.onsuccess = function () {
                            db.close();
                            var content = get.result && get.result.content;
                            var bytes = content && content.b;
                            resolve(bytes && bytes.length ? new TextDecoder("latin1").decode(bytes.subarray(0, content.length || bytes.length)) : null);
                        };
                        get.onerror = function () {
                            db.close();
                            resolve(null);
                        };
                    };
                    keys.onerror = function () {
                        db.close();
                        resolve(null);
                    };
                } catch (e) {
                    db.close();
                    resolve(null);
                }
            };
        });
    }, function () {
        return null;
    });
}

function setupIdleTechCost() {
    addCSS(`
        .idleTechCost {
            position: absolute;
            bottom: 1px;
            white-space: nowrap;
            color: #e0c060;
            font-size: 12px;
            line-height: 18px;
            pointer-events: auto;
        }
        .idleTechCost.idleTechCostNone {
            color: #999;
        }
        .idleTechCostTotal.idleTechCostShort {
            color: #ff8a65;
        }
    `);
    var rates = {};
    var ratesRead = 0;
    var timer = null;
    var place = function (holder, label, className, text, title) {
        var tag = $(holder).parent().children("." + className.split(" ")[0]);
        if (!text) {
            tag.remove();
            return;
        }
        if (!tag.length) {
            tag = $('<span></span>').appendTo($(holder).parent());
        }
        var range = document.createRange();
        range.selectNodeContents(label);
        tag.attr("class", className).text(text).attr("title", title).css({
            left: range.getBoundingClientRect().right - $(holder).parent()[0].getBoundingClientRect().left + 8,
            bottom: holder.style.bottom || "1px"
        });
    };
    var check = function () {
        timer = null;
        var dialog = $("[id^='ujs_WziTabBodyTechDialog']").filter(function () {
            return /^ujs_WziTabBodyTechDialog(?:_\d+)?$/.test(this.id) && shownUjsElement(this);
        }).last();
        if (!dialog.length) {
            return;
        }
        if (Date.now() - ratesRead > 60 * 1000) {
            ratesRead = Date.now();
            readIdleSave().then(function (save) {
                if (save) {
                    rates = idleMarketRates(save);
                }
            });
        }
        var prices = idleMarketPrices();
        var total = 0;
        var priced = 0;
        var missing = 0;
        idleTechCostRows(dialog).forEach(function (row) {
            var label = $(row.nameHolder).children(".ujsTextInner")[0];
            var short = Math.ceil(row.need - row.have);
            if (short <= 0) {
                place(row.nameHolder, label, "idleTechCost", "", "");
                return;
            }
            missing++;
            var buy = idleCheapestPurchase(row.name, short, prices, rates);
            if (!buy) {
                place(row.nameHolder, label, "idleTechCost idleTechCostNone", "need " + short.toLocaleString("en-US") + " more · no market sells it", "None of this level's markets sells " + row.name + " (Muli's Userscript)");
                return;
            }
            total += buy.cost;
            priced++;
            place(row.nameHolder, label, "idleTechCost", "need " + short.toLocaleString("en-US") + " more ≈ " + formatIdleMoney(buy.cost),
                "Buying " + short.toLocaleString("en-US") + " " + row.name + " at " + buy.market + (buy.exact ? ", with the price rising as you buy" : " at today's price; it rises as you buy") + " (Muli's Userscript)");
        });
        var nameLabel = dialog.find("[id^='ujs_NameLabel'] .ujsTextInner").first();
        if (nameLabel.length) {
            var wallet = parseIdleMoney($("[id^='ujs_MoneyLabel']").first().text());
            var text = missing > 1 && priced ? "all ≈ " + formatIdleMoney(total) + (priced < missing ? " + items no market sells" : "") : "";
            place(nameLabel.parent()[0], nameLabel[0], "idleTechCostTotal idleTechCost" + (wallet && wallet.money < total ? " idleTechCostShort" : ""), text,
                wallet ? "You have " + formatIdleMoney(wallet.money) + " (Muli's Userscript)" : "");
        }
    };
    // Idle redraws its counters many times a second, so the check runs at most four times a second.
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 250);
        }
    }).observe(document.body, { childList: true, subtree: true });
}

function setupIdleUpgradeHints() {
    addCSS(`
        .idleUpgradeHint {
            position: absolute;
            bottom: 0;
            color: #aaa;
            font-size: 12px;
            white-space: nowrap;
        }
        .idleUpgradeHint.idleUpgradeHintBelow {
            top: 100%;
            right: 0;
            bottom: auto;
            font-size: 11px;
            line-height: 12px;
        }
        .idleUpgradeHint.idleBestValue {
            color: #e0c060;
            font-weight: 700;
        }
    `);
    window.setInterval(function () {
        if (!document.hidden) {
            showIdleUpgradeHints();
        }
    }, 1000);
}

// What Idle is waiting on you for, read from what it shows.
function idleAttentionItems() {
    var shown = function (prefix) {
        return $("[id^='" + prefix + "']").filter(function () {
            if (!new RegExp("^" + prefix + "(?:_\\d+)?$").test(this.id)) {
                return false;
            }
            for (var element = this; element && element !== document.body; element = element.parentElement) {
                if (element.style && element.style.display === "none") {
                    return false;
                }
            }
            return true;
        }).length > 0;
    };
    var says = function (pattern) {
        return $(".ujsTextInner").filter(function () {
            return pattern.test($(this).text()) && $(this).closest("[style*='display: none']").length === 0;
        }).length > 0;
    };
    return [
        [shown("ujs_UnclaimedPowersBtn"), "Unclaimed powers"],
        [says(/Click Claim below to reveal it/i), "An artifact to claim"],
        [says(/\bis ready to move\b/i), "A tank is ready to move"],
        [shown("ujs_BattleIndicatorBtn"), "A battle"],
        [shown("ujs_DailyBonusBtn"), "The daily bonus"],
        [shown("ujs_CoinWheelBtn"), "The coin wheel"]
    ].filter(function (item) {
        return item[0];
    }).map(function (item) {
        return item[1];
    });
}

function setupIdleAttention() {
    var known = [];
    var check = function () {
        var items = idleAttentionItems();
        var title = document.title.replace(/^\(\d+\) /, "");
        document.title = items.length ? "(" + items.length + ") " + title : title;
        var fresh = items.filter(function (item) {
            return known.indexOf(item) === -1;
        });
        known = items;
        if (!fresh.length || !document.hidden || !("Notification" in window) || Notification.permission !== "granted") {
            return;
        }
        ifSettingIsEnabled("idleNotifications", function () {
            var notification = new Notification("War.app Idle needs you", { body: fresh.join(", "), tag: "tuyd-idle" });
            notification.onclick = function () {
                window.focus();
                notification.close();
            };
        });
    };
    window.setInterval(check, 2000);
    check();
}

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

// war.app's Services calls send and answer hex text. A leaderboard row is: 01 01, the clan (00, or 01, two
// numbers and its name), 01, a number and a byte, the level, the name, four numbers (the third is the
// "#N" after the name) and the rating as a little-endian double. The player count closes the answer.
function parseQuickmatchLeaderboard(hex) {
    hex = String(hex || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
        return null;
    }
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    var int = function (p) {
        return (bytes[p] | bytes[p + 1] << 8 | bytes[p + 2] << 16 | bytes[p + 3] << 24) >>> 0;
    };
    var decoder = new TextDecoder("utf-8", { fatal: true });
    var text = function (p) {
        if (bytes[p] !== 1) {
            return null;
        }
        var length = 0;
        var shift = 0;
        var q = p + 1;
        do {
            length |= (bytes[q] & 127) << shift;
            shift += 7;
        } while (bytes[q++] & 128 && shift < 28);
        if (q + length > bytes.length) {
            return null;
        }
        try {
            return { value: decoder.decode(bytes.subarray(q, q + length)), end: q + length };
        } catch (e) {
            return null;
        }
    };
    var row = function (p) {
        if (bytes[p] !== 1 || bytes[p + 1] !== 1) {
            return null;
        }
        p += 2;
        if (bytes[p] === 1) {
            var clan = text(p + 9);
            if (!clan) {
                return null;
            }
            p = clan.end;
        } else if (bytes[p] === 0) {
            p += 1;
        } else {
            return null;
        }
        if (bytes[p] !== 1 || int(p + 6) > 1000) {
            return null;
        }
        var name = text(p + 10);
        if (!name || name.end + 24 > bytes.length) {
            return null;
        }
        var rating = new Float64Array(bytes.slice(name.end + 16, name.end + 24).buffer)[0];
        return Number.isFinite(rating) ? { name: name.value, number: int(name.end + 8), rating: rating, end: name.end + 24 } : null;
    };
    for (var start = 0; start < bytes.length - 4; start++) {
        var rows = [];
        var p = start;
        var next;
        while ((next = row(p))) {
            rows.push({ name: next.name, number: next.number, rating: next.rating });
            p = next.end;
        }
        if (rows.length && p === bytes.length - 4) {
            return { total: int(p), rows: rows };
        }
    }
    return null;
}

function leaderboardRequestBody(template, offset, count) {
    var hex = function (n) {
        return [0, 8, 16, 24].map(function (shift) {
            return ("0" + ((n >>> shift) & 255).toString(16)).slice(-2);
        }).join("").toUpperCase();
    };
    return template.slice(0, -16) + hex(offset) + hex(count);
}

function parseYourRating(text) {
    var match = /Your rating:\s*(-?[\d,]+(?:\.\d+)?)/i.exec(String(text || ""));
    return match ? Number(match[1].replace(/,/g, "")) : null;
}

// Pages are sorted by rating, so a binary search finds the page with your rating; war.app shows
// ratings to one decimal, so they're compared at that precision.
function findLeaderboardRank(fetchPage, rating, name, pageSize) {
    var round = function (value) {
        return Math.round(value * 10) / 10;
    };
    var placeOn = function (page, offset) {
        var rows = page.rows;
        var index = rows.findIndex(function (row) {
            return row.name === name && round(row.rating) === rating;
        });
        if (index !== -1) {
            return { rank: offset + index + 1, total: page.total, exact: true };
        }
        return {
            rank: offset + rows.filter(function (row) {
                return round(row.rating) > rating;
            }).length + 1,
            total: page.total,
            exact: false
        };
    };
    var where = function (page) {
        if (!page || !page.rows.length) {
            return null;
        }
        if (round(page.rows[page.rows.length - 1].rating) > rating) {
            return "below";
        }
        return round(page.rows[0].rating) < rating ? "above" : "here";
    };
    return fetchPage(0, pageSize).then(function (first) {
        var side = where(first);
        if (!side) {
            return null;
        }
        if (side !== "below") {
            return placeOn(first, 0);
        }
        var low = 1;
        var high = Math.ceil(first.total / pageSize) - 1;
        var step = function () {
            if (low > high) {
                return { rank: Math.min(low * pageSize, first.total) + 1, total: first.total, exact: false };
            }
            var middle = Math.floor((low + high) / 2);
            return fetchPage(middle * pageSize, pageSize).then(function (page) {
                var side = where(page);
                if (!side) {
                    return null;
                }
                if (side === "here") {
                    return placeOn(page, middle * pageSize);
                }
                if (side === "below") {
                    low = middle + 1;
                } else {
                    high = middle - 1;
                }
                return step();
            });
        };
        return step();
    });
}

function leaderboardRankText(result) {
    return result ? "Rank " + (result.exact ? "" : "≈ ") + "#" + result.rank.toLocaleString("en-US") + " of " + result.total.toLocaleString("en-US") : "";
}

function commitQuestion(link) {
    var match = /^ujs_(CommitBtn|RunAndCommitBtn)(?:_\d+)?_btn$/.exec(link && link.id || "");
    if (!match) {
        return null;
    }
    return match[1] === "RunAndCommitBtn" ? "Let Autopilot make your orders and commit them?" : "Commit your orders for this turn?";
}

function setupCommitConfirm() {
    document.addEventListener("click", function (event) {
        var link = $(event.target).closest("a.ujsBtnInner")[0];
        var question = commitQuestion(link);
        if (question && !window.confirm(question)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
}

// Names of the players war.app's Players panel marks as out of the game.
function gameOutPlayers() {
    return $("[id^='ujs_PlayersSummaryPlayer']").filter(function () {
        return /^ujs_PlayersSummaryPlayer(?:_\d+)?$/.test(this.id);
    }).filter(function () {
        var status = $(this).find("[id^='ujs_PlayerStatusLabel']").filter(function () {
            return !/_tmp$/.test(this.id);
        }).first().text();
        return /\b(?:Eliminated|Booted|Surrendered|Removed by host|Declined)\b/i.test(status);
    }).map(function () {
        return $(this).find("[id^='ujs_PlayerNameContainer']").first().text().replace(/\s+/g, " ").trim().replace(/^L\d+ /, "");
    }).get();
}

function privateChatRows(prompt) {
    return $(prompt).parent().children(".ujsBtn").map(function () {
        return { element: this, name: $(this).find(".ujsTextInner").first().text().trim() };
    }).get().filter(function (row) {
        return row.name;
    });
}

// war.app stacks the rows by their `bottom`; the rows trade places, so the list keeps its size.
function orderPrivateChatRows(rows, outNames) {
    var slots = rows.map(function (row) {
        return parseFloat(row.element.style.bottom) || 0;
    }).sort(function (a, b) {
        return b - a;
    });
    var isOut = function (row) {
        return outNames.indexOf(row.name) !== -1;
    };
    var byName = function (a, b) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    };
    var ordered = rows.filter(function (row) {
        return !isOut(row);
    }).sort(byName).concat(rows.filter(isOut).sort(byName));
    var changed = false;
    ordered.forEach(function (row, i) {
        if (parseFloat(row.element.style.bottom) !== slots[i]) {
            row.element.style.bottom = slots[i] + "px";
            changed = true;
        }
        var first = isOut(row) && i > 0 && !isOut(ordered[i - 1]);
        $(row.element).toggleClass("tuydPmOut", isOut(row));
        var divider = $(row.element).children(".tuydPmDivider");
        if (first && !divider.length) {
            var image = $(row.element).children(".ujsImgInner").first()[0];
            $('<div class="tuydPmDivider"></div>').css({
                width: image ? image.style.width : "100%",
                bottom: (image ? parseFloat(image.style.height) || 30 : 30) + 1
            }).appendTo(row.element);
        } else if (!first) {
            divider.remove();
        }
    });
    return changed;
}

function setupPrivateChatList() {
    addCSS(`
        .ujsBtn.tuydPmOut > :not(.tuydPmDivider) {
            opacity: 0.55;
        }
        .tuydPmDivider {
            position: absolute;
            left: 0;
            height: 0;
            border-bottom: 2px solid #e0c060;
            pointer-events: none;
        }
    `);
    var timer = null;
    var check = function () {
        timer = null;
        $("[id^='ujs_PromptFromList'] .ujsTextInner").filter(function () {
            return /chat privately with/i.test($(this).text());
        }).each(function () {
            orderPrivateChatRows(privateChatRows($(this).parent()), gameOutPlayers());
        });
    };
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 200);
        }
    }).observe(document.body, { childList: true, subtree: true });
}

function shownUjsElement(element) {
    var body = element && element.ownerDocument ? element.ownerDocument.body : document.body;
    for (; element && element !== body; element = element.parentElement) {
        if (element.style && element.style.display === "none") {
            return false;
        }
    }
    return !!element;
}

function olderChatButtons() {
    return $("[id^='ujs_LoadOlderMessagesBtn'], [id^='ujs_ShowOlderChatBtn']").filter(function () {
        return /^ujs_(?:LoadOlderMessagesBtn|ShowOlderChatBtn)(?:_\d+)?$/.test(this.id) && shownUjsElement(this);
    }).get();
}

// war.app shows a game's chat a page at a time behind "Load Older Messages" / "Older Chat"; this
// presses the button until the whole chat is there, and stops when a press adds nothing.
function setupFullGameChat() {
    var pressed = new WeakMap();
    var timer = null;
    var chatOf = function (button) {
        var chat = $(button).closest("[id^='ujs_Chat'], [id^='ujs_LiveChat']");
        return chat.length ? chat : $(button).parent();
    };
    var scrollToNewest = function (chat) {
        chat.find("[id^='ujs_Viewport']").each(function () {
            if (this.scrollHeight > this.clientHeight) {
                this.scrollTop = this.scrollHeight;
            }
        });
    };
    var check = function () {
        timer = null;
        olderChatButtons().forEach(function (button) {
            var state = pressed.get(button) || { presses: 0, size: -1, time: 0 };
            var chat = chatOf(button);
            var size = chat.text().length;
            if (state.presses >= 20 || size === state.size || (state.presses && Date.now() - state.time < 1500)) {
                return;
            }
            pressed.set(button, { presses: state.presses + 1, size: size, time: Date.now() });
            $(button).children("a.ujsBtnInner").first().trigger("click");
            [1000, 2500, 4500].forEach(function (delay) {
                setTimeout(function () {
                    scrollToNewest(chat);
                }, delay);
            });
        });
    };
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 500);
        }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    check();
}

// The messages of one chat tab, oldest first; war.app stacks them by `bottom`, the newest at the bottom.
// Messages hidden by your block list are left out.
function chatMessages(tab) {
    var label = function (message, name) {
        return $(message).find("[id^='ujs_" + name + "'][id$='_tmp']").first();
    };
    return $(tab).find("[id^='ujs_ChatMessage']").filter(function () {
        return /^ujs_ChatMessage(?:_\d+)?$/.test(this.id) && !shownUjsElement(label(this, "BlacklistLabel")[0]);
    }).get().map(function (element) {
        return {
            element: element,
            name: label(element, "PlayerNameLabel").text().trim(),
            time: label(element, "TimestampLabel").text().trim(),
            text: label(element, "MessageLabel").text().replace(/\s+/g, " ").trim()
        };
    }).filter(function (message) {
        return message.text;
    }).sort(function (a, b) {
        return (parseFloat(b.element.style.bottom) || 0) - (parseFloat(a.element.style.bottom) || 0);
    });
}

function chatSpeechText(message) {
    var faces = { ":)": "smiley", ":-)": "smiley", "(:": "smiley", ":D": "big smile", ":(": "sad face", ":-(": "sad face", ";)": "wink", ":P": "tongue out", ":p": "tongue out" };
    var text = message.text.replace(/\bhttps?:\/\/\S+/gi, "a link").replace(/(^|\s)(:-?\)|\(:|:D|:-?\(|;\)|:[Pp])(?=\s|$)/g, function (all, space, face) {
        return space + faces[face];
    });
    return message.name ? message.name + ": " + text : text;
}

// Chrome stops an utterance after about 15 seconds, so long messages are read in pieces.
function speechChunks(text, size) {
    var chunks = [];
    String(text).split(/(?<=[.!?…])\s+/).forEach(function (sentence) {
        while (sentence.length > size) {
            var cut = sentence.lastIndexOf(" ", size);
            cut = cut > 0 ? cut : size;
            chunks.push(sentence.slice(0, cut));
            sentence = sentence.slice(cut).trim();
        }
        if (sentence) {
            chunks.push(sentence);
        }
    });
    return chunks;
}

// Messages added after `lastKey` at the newest end; older ones war.app loads above it don't count.
function newChatMessages(messages, lastKey) {
    var keys = messages.map(function (message) {
        return message.name + "|" + message.time + "|" + message.text;
    });
    var at = lastKey ? keys.lastIndexOf(lastKey) : -1;
    return { fresh: at === -1 ? [] : messages.slice(at + 1), lastKey: keys.length ? keys[keys.length - 1] : lastKey };
}

// A chat room tab's messages for reading aloud, oldest first: not war.app's notices, nor rows the script
// hides (notices, muted players).
function chatRoomSpeechMessages(tab) {
    var bottom = function (row) {
        var original = row.element.getAttribute("data-tuyd-bottom");
        return original === null ? parseFloat(row.element.style.bottom) || 0 : Number(original);
    };
    return chatRoomRows(tab).filter(function (row) {
        return !row.event && row.text && row.element.style.display !== "none";
    }).sort(function (a, b) {
        return bottom(b) - bottom(a);
    });
}

function setupChatSpeech() {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function") {
        return;
    }
    // The message gets its own stacking context so the button's z-index can't lift it over war.app's
    // popups (the player card), which have no z-index of their own.
    addCSS(`
        .ujsGameObject:has(> .tuydSpeak) {
            isolation: isolate;
        }
        .tuydSpeak {
            position: absolute;
            left: 4px;
            bottom: 8px;
            z-index: 2;
            padding: 0 3px;
            border-radius: 3px;
            color: #262626;
            font-size: 13px;
            line-height: 16px;
            text-decoration: none;
            opacity: 0.35;
            cursor: pointer;
            pointer-events: auto;
        }
        .tuydSpeak:hover, .tuydSpeak.tuydSpeaking {
            opacity: 1;
            background: rgba(255, 255, 255, 0.6);
            text-decoration: none;
        }
        .tuydSpeak.tuydSpeakRoom {
            opacity: 0;
        }
        .ujsGameObject:hover > .tuydSpeak.tuydSpeakRoom, .tuydSpeak.tuydSpeakRoom.tuydSpeaking {
            opacity: 0.8;
            background: rgba(255, 255, 255, 0.6);
        }
    `);
    var me = "";
    var autoRead = false;
    var lastKeys = {};
    var speakingFrom = null;
    var timer = null;
    var stop = function () {
        speakingFrom = null;
        window.speechSynthesis.cancel();
        $(".tuydSpeak.tuydSpeaking").removeClass("tuydSpeaking").text("🔊").attr("title", "Read aloud from this message to the newest (Muli's Userscript)");
    };
    var speak = function (messages, button) {
        messages.forEach(function (message) {
            speechChunks(chatSpeechText(message), 180).forEach(function (chunk, i, chunks) {
                var utterance = new SpeechSynthesisUtterance(chunk);
                if (button && message === messages[messages.length - 1] && i === chunks.length - 1) {
                    utterance.onend = utterance.onerror = function () {
                        if (speakingFrom === button) {
                            stop();
                        }
                    };
                }
                window.speechSynthesis.speak(utterance);
            });
        });
    };
    // Game chat tabs and chat room tabs: how to find them, read them, and place the button.
    var kinds = [
        { tab: /^ujs_ChatTab(?:_\d+)?$/, messages: chatMessages, place: function () {
            return {};
        } },
        { tab: /^ujs_ChatRoomTab(?:_\d+)?$/, messages: chatRoomSpeechMessages, room: true, place: function (element) {
            var bubble = $(element).find("[id^='ujs_BubbleImage'] > .ujsImgInner")[0];
            var left = bubble ? bubble.getBoundingClientRect().right - element.getBoundingClientRect().left + 6 : 0;
            return { left: left > 6 ? left : 280, bottom: 4 };
        } }
    ];
    var tabOf = function (element) {
        var tab = null;
        var kind = null;
        $(element).parents().each(function () {
            var parent = this;
            kinds.forEach(function (candidate) {
                if (!tab && candidate.tab.test(parent.id)) {
                    tab = parent;
                    kind = candidate;
                }
            });
        });
        return { tab: tab, kind: kind };
    };
    var check = function () {
        timer = null;
        kinds.forEach(function (kind) {
            $("[id^='ujs_ChatTab'], [id^='ujs_ChatRoomTab']").filter(function () {
                return kind.tab.test(this.id);
            }).each(function () {
                var messages = kind.messages(this);
                messages.forEach(function (message) {
                    if (!$(message.element).children(".tuydSpeak").length) {
                        $('<a class="tuydSpeak" href="#">🔊</a>').toggleClass("tuydSpeakRoom", !!kind.room).css(kind.place(message.element))
                            .attr("title", "Read aloud from this message to the newest (Muli's Userscript)").appendTo(message.element);
                    }
                });
                var result = newChatMessages(messages, lastKeys[this.id]);
                lastKeys[this.id] = result.lastKey;
                var fresh = result.fresh.filter(function (message) {
                    return message.name !== me;
                });
                // In the chat rooms only the tab you're looking at is read.
                if (autoRead && fresh.length && (!kind.room || shownUjsElement(this))) {
                    speak(fresh, null);
                }
            });
        });
    };
    $(document).on("click", ".tuydSpeak", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var button = this;
        var wasMine = speakingFrom === button;
        stop();
        if (wasMine) {
            return;
        }
        var found = tabOf(button);
        if (!found.tab) {
            return;
        }
        var messages = found.kind.messages(found.tab);
        var from = messages.findIndex(function (message) {
            return message.element === button.parentElement;
        });
        if (from === -1) {
            return;
        }
        speakingFrom = button;
        $(button).addClass("tuydSpeaking").text("■").attr("title", "Stop reading");
        speak(messages.slice(from), button);
    });
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            me = player && player.Name || "";
        });
    }
    ifSettingIsEnabled("readNewChatAloud", function () {
        autoRead = true;
    });
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 300);
        }
    }).observe(document.body, { childList: true, subtree: true });
    check();
}

// war.app writes its automatic notices (joined or left a group, clan war rewards) in bold italic.
function chatEventLabel(label) {
    var style = (label && label.getAttribute("style")) || "";
    return /font-style:\s*italic/.test(style) && /font-weight:\s*(?:bold|[6-9]00)/.test(style);
}

function chatMentions(text, name) {
    if (!name) {
        return false;
    }
    var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(?:^|[^\\p{L}\\p{N}_])@?" + escaped + "(?:$|[^\\p{L}\\p{N}_])", "iu").test(String(text || ""));
}

function chatRoomRows(tab) {
    return $(tab).find("[id^='ujs_ChatRoomMessageControl']").filter(function () {
        return /^ujs_ChatRoomMessageControl(?:_\d+)?$/.test(this.id);
    }).get().map(function (element) {
        var label = $(element).find("[id^='ujs_Message'] .ujsTextInner")[0];
        return {
            element: element,
            name: $(element).find("[id^='ujs_PlayerName'] .ujsTextInner").first().text().trim(),
            text: label ? $(label).text().trim() : "",
            event: chatEventLabel(label)
        };
    });
}

// war.app stacks the rows by `bottom`, newest at the bottom. Hidden rows are taken out and the rows
// above them slide down; war.app's own positions are kept to start from when it lays the tab out again.
function stackChatRows(rows, hide) {
    rows.forEach(function (row) {
        var current = parseFloat(row.element.style.bottom) || 0;
        if (row.element.getAttribute("data-tuyd-set") === null || Number(row.element.getAttribute("data-tuyd-set")) !== current) {
            row.element.setAttribute("data-tuyd-bottom", current);
        }
    });
    var original = function (row) {
        return Number(row.element.getAttribute("data-tuyd-bottom"));
    };
    var ordered = rows.slice().sort(function (a, b) {
        return original(a) - original(b);
    });
    var y = ordered.length ? original(ordered[0]) : 0;
    var hidden = 0;
    ordered.forEach(function (row, i) {
        var next = ordered[i + 1];
        var height = next ? original(next) - original(row) : (i > 0 ? original(row) - original(ordered[i - 1]) : 25);
        var gone = hide(row);
        if (row.element.style.display !== (gone ? "none" : "")) {
            row.element.style.display = gone ? "none" : "";
        }
        if (gone) {
            hidden++;
            return;
        }
        if (parseFloat(row.element.style.bottom) !== y) {
            row.element.style.bottom = y + "px";
        }
        row.element.setAttribute("data-tuyd-set", y);
        y += height;
    });
    return hidden;
}

function readMutedPlayers(callback) {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "mutedChatPlayers", function (setting) {
        var value = setting && setting.value;
        callback(Array.isArray(value) ? value.filter(function (name) {
            return typeof name === "string" && name;
        }) : []);
    });
}

function saveMutedPlayers(names) {
    Database.update(Database.Table.Settings, { name: "mutedChatPlayers", value: names }, undefined);
}

function chatToolsCss() {
    addCSS(`
        .ujsGameObject:has(> .tuydMute) {
            isolation: isolate;
        }
        .tuydMute {
            position: absolute;
            z-index: 2;
            padding: 0 3px;
            border-radius: 3px;
            font-size: 12px;
            line-height: 16px;
            text-decoration: none;
            opacity: 0;
            cursor: pointer;
            pointer-events: auto;
        }
        .ujsGameObject:hover > .tuydMute, .tuydMute:focus {
            opacity: 0.8;
            background: rgba(255, 255, 255, 0.6);
            text-decoration: none;
        }
        .tuydMention [id^='ujs_BubbleImage'] > .ujsImgInner, .tuydMention [id^='ujs_RightCol'] > .ujsImgInner {
            outline: 2px solid #e0c060;
            outline-offset: 1px;
        }
        .tuydMutedMessage [id^='ujs_RightCol'], .tuydMutedMessage [id^='ujs_PlayerNameLabel'] {
            visibility: hidden;
        }
        .tuydMutedMessage:after {
            content: "muted";
            position: absolute;
            left: 160px;
            bottom: 8px;
            color: rgba(0, 0, 0, 0.45);
            font-size: 11px;
            font-style: italic;
            pointer-events: none;
        }
        #tuydChatTools {
            position: fixed;
            z-index: 50;
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 3px 8px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.55);
            color: #ddd;
            font-size: 13px;
            pointer-events: auto;
        }
        #tuydChatTools label {
            margin: 0;
            font-weight: normal;
        }
        #tuydChatTools input {
            margin: 0 4px 0 0;
            vertical-align: middle;
        }
        #tuydChatTools input[type=search] {
            width: 140px;
            padding: 1px 6px;
            border: 1px solid #555;
            border-radius: 3px;
            background: #222;
            color: #ddd;
        }
        #tuydChatTools .tuydSearchCount {
            margin-left: -6px;
            color: #aaa;
        }
        #tuydChatTools a {
            color: #e0c060;
        }
        #tuydMutedList {
            position: fixed;
            z-index: 51;
            min-width: 200px;
            max-height: 60vh;
            overflow-y: auto;
            padding: 6px 10px;
            border: 1px solid #555;
            border-radius: 6px;
            background: #1b1b1b;
            color: #ccc;
            font-size: 13px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
        }
        #tuydMutedList div {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 2px 0;
        }
        .tuydMentionCount {
            position: absolute;
            right: 4px;
            top: 2px;
            padding: 0 4px;
            border-radius: 7px;
            background: #e0c060;
            color: #1b1b1b;
            font-size: 11px;
            font-weight: 700;
            line-height: 14px;
            pointer-events: none;
        }
    `);
}

function confirmMute(name) {
    return window.confirm("Mute " + name + "? Their messages are hidden from you in chat rooms and game chats. They won't know; unmute any time from the chat room's \"Muted\" list.");
}

function setupChatRoomTools() {
    chatToolsCss();
    var me = "";
    var muted = [];
    var hideEvents = true;
    var search = "";
    var lastKeys = {};
    var mentionCounts = {};
    var timer = null;
    var tabButtonFor = function (tab) {
        var tabs = $("[id^='ujs_ChatRoomTab']").filter(function () {
            return /^ujs_ChatRoomTab(?:_\d+)?$/.test(this.id);
        }).get();
        var buttons = $("[id^='ujs_TabData_']").filter(function () {
            return /^ujs_TabData_-?\d+$/.test(this.id);
        }).get();
        var index = tabs.indexOf(tab);
        return index !== -1 && tabs.length === buttons.length ? buttons[index] : null;
    };
    var toolbar = function (hiddenEvents, found) {
        var buttons = $("[id^='ujs_TabData_']").filter(function () {
            return /^ujs_TabData_-?\d+$/.test(this.id);
        });
        var last = buttons.last().children("a.ujsBtnInner")[0];
        if (!last) {
            $("#tuydChatTools, #tuydMutedList").remove();
            return;
        }
        var rect = last.getBoundingClientRect();
        var bar = $("#tuydChatTools");
        if (!bar.length) {
            bar = $('<div id="tuydChatTools" title="Muli\'s Userscript"><input type="search" name="chatSearch" placeholder="Search chat"><span class="tuydSearchCount"></span>'
                + '<label><input type="checkbox" name="hideEvents">Hide events <span class="tuydEventCount"></span></label><a href="#" class="tuydMutedLink"></a></div>').appendTo("body");
            bar.on("keydown keyup keypress", function (event) {
                event.stopPropagation();
            });
        }
        var width = bar.outerWidth();
        // In line with the tabs' labels, which sit above the middle of war.app's tab buttons.
        var label = buttons.last().find(".ujsTextInner")[0];
        var middle = label ? label.getBoundingClientRect().top + label.getBoundingClientRect().height / 2 : rect.top + rect.height / 2;
        if (rect.right + 12 + width > window.innerWidth - 8) {
            bar.css({ left: Math.max(8, window.innerWidth - width - 8), top: rect.bottom + 4 });
        } else {
            bar.css({ left: rect.right + 12, top: Math.max(0, middle - bar.outerHeight() / 2) });
        }
        bar.find("[name=hideEvents]").prop("checked", hideEvents);
        bar.find(".tuydEventCount").text(hideEvents && hiddenEvents ? "(" + hiddenEvents + " hidden)" : "");
        bar.find(".tuydMutedLink").text("Muted (" + muted.length + ")");
        bar.find(".tuydSearchCount").text(search ? found + " found" : "");
    };
    var check = function () {
        timer = null;
        var hiddenEvents = 0;
        var found = 0;
        var needle = search.toLowerCase();
        $("[id^='ujs_ChatRoomTab']").filter(function () {
            return /^ujs_ChatRoomTab(?:_\d+)?$/.test(this.id);
        }).each(function () {
            var tab = this;
            var rows = chatRoomRows(tab);
            if (!rows.length) {
                return;
            }
            var visible = shownUjsElement(tab);
            stackChatRows(rows, function (row) {
                var gone = muted.indexOf(row.name) !== -1 || (hideEvents && row.event);
                if (hideEvents && row.event && muted.indexOf(row.name) === -1) {
                    hiddenEvents += visible ? 1 : 0;
                }
                if (!gone && needle) {
                    gone = (row.name + " " + row.text).toLowerCase().indexOf(needle) === -1;
                    found += !gone && visible ? 1 : 0;
                }
                return gone;
            });
            rows.forEach(function (row) {
                var mention = !row.event && row.name !== me && chatMentions(row.text, me);
                $(row.element).toggleClass("tuydMention", mention);
                if (!row.event && row.name && row.name !== me && !$(row.element).children(".tuydMute").length) {
                    var bubble = $(row.element).find("[id^='ujs_BubbleImage'] > .ujsImgInner")[0];
                    if (bubble) {
                        var left = bubble.getBoundingClientRect().right - row.element.getBoundingClientRect().left + 6;
                        $('<a class="tuydMute" href="#" title="Mute this player (Muli\'s Userscript)">🔇</a>').attr("data-name", row.name)
                            .css({ left: (left > 6 ? left : 280) + 22, bottom: 4 }).appendTo(row.element);
                    }
                }
            });
            var oldestFirst = rows.slice().sort(function (a, b) {
                return Number(b.element.getAttribute("data-tuyd-bottom")) - Number(a.element.getAttribute("data-tuyd-bottom"));
            });
            var keys = oldestFirst.map(function (row) {
                return row.name + "|" + row.text;
            });
            var at = lastKeys[tab.id] ? keys.lastIndexOf(lastKeys[tab.id]) : -1;
            if (shownUjsElement(tab)) {
                mentionCounts[tab.id] = 0;
            } else if (at !== -1) {
                mentionCounts[tab.id] = (mentionCounts[tab.id] || 0) + oldestFirst.slice(at + 1).filter(function (row) {
                    return !row.event && row.name !== me && chatMentions(row.text, me);
                }).length;
            }
            lastKeys[tab.id] = keys[keys.length - 1];
            var button = tabButtonFor(tab);
            if (button) {
                var badge = $(button).children(".tuydMentionCount");
                if (mentionCounts[tab.id]) {
                    if (!badge.length) {
                        badge = $('<span class="tuydMentionCount" title="Messages mentioning you since you opened the chat (Muli\'s Userscript)"></span>').appendTo(button);
                    }
                    badge.text("@" + mentionCounts[tab.id]);
                } else {
                    badge.remove();
                }
            }
        });
        toolbar(hiddenEvents, found);
    };
    var schedule = function () {
        if (!timer) {
            timer = setTimeout(check, 200);
        }
    };
    $(document).on("click", ".tuydMute", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var name = $(this).attr("data-name");
        if (name && muted.indexOf(name) === -1 && confirmMute(name)) {
            muted.push(name);
            saveMutedPlayers(muted);
            schedule();
        }
    }).on("input", "#tuydChatTools [name=chatSearch]", function () {
        search = this.value.trim();
        schedule();
    }).on("change", "#tuydChatTools [name=hideEvents]", function () {
        hideEvents = this.checked;
        Database.update(Database.Table.Settings, { name: "hideChatEvents", value: hideEvents }, undefined);
        schedule();
    }).on("click", "#tuydChatTools .tuydMutedLink", function (event) {
        event.preventDefault();
        if ($("#tuydMutedList").length) {
            $("#tuydMutedList").remove();
            return;
        }
        var rect = this.getBoundingClientRect();
        var list = $('<div id="tuydMutedList"></div>').css({ left: rect.left, top: rect.bottom + 6 });
        list.append(muted.length ? muted.map(function (name) {
            return $("<div></div>").append($("<span></span>").text(name), $('<a href="#" class="tuydUnmute">Unmute</a>').attr("data-name", name));
        }) : $("<div></div>").text("Nobody muted. Hover a message and click 🔇 to mute its player."));
        $("body").append(list);
    }).on("click", "#tuydMutedList .tuydUnmute", function (event) {
        event.preventDefault();
        var name = $(this).attr("data-name");
        muted = muted.filter(function (other) {
            return other !== name;
        });
        saveMutedPlayers(muted);
        $(this).parent().remove();
        schedule();
    });
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            me = player && player.Name || "";
            schedule();
        });
    }
    readMutedPlayers(function (names) {
        muted = names;
        schedule();
    });
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "hideChatEvents", function (setting) {
        hideEvents = !(setting && setting.value === false);
        schedule();
    });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
}

function setupGameChatTools() {
    chatToolsCss();
    var me = "";
    var muted = [];
    var timer = null;
    var check = function () {
        timer = null;
        $("[id^='ujs_ChatTab']").filter(function () {
            return /^ujs_ChatTab(?:_\d+)?$/.test(this.id);
        }).each(function () {
            chatMessages(this).forEach(function (message) {
                var isMuted = muted.indexOf(message.name) !== -1;
                $(message.element).toggleClass("tuydMutedMessage", isMuted)
                    .toggleClass("tuydMention", !isMuted && message.name !== me && chatMentions(message.text, me));
                if (message.name && message.name !== me && !$(message.element).children(".tuydMute").length) {
                    $('<a class="tuydMute" href="#" title="Mute this player (Muli\'s Userscript)">🔇</a>').attr("data-name", message.name)
                        .css({ left: 24, bottom: 8 }).appendTo(message.element);
                }
            });
        });
    };
    var schedule = function () {
        if (!timer) {
            timer = setTimeout(check, 300);
        }
    };
    $(document).on("click", ".tuydMute", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var name = $(this).attr("data-name");
        if (name && muted.indexOf(name) === -1 && confirmMute(name)) {
            muted.push(name);
            saveMutedPlayers(muted);
            schedule();
        }
    });
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            me = player && player.Name || "";
            schedule();
        });
    }
    readMutedPlayers(function (names) {
        muted = names;
        schedule();
    });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
}

// "@" and what follows it right before the caret, if the person is typing a name to tag.
function mentionQuery(value, caret) {
    var before = String(value || "").slice(0, caret);
    var match = /(?:^|\s)@([^@\n]{0,30})$/.exec(before);
    return match ? { start: before.length - match[1].length - 1, text: match[1] } : null;
}

function mentionCandidates(names, typed, me) {
    var seen = {};
    var lower = String(typed || "").toLowerCase();
    var unique = names.filter(function (name) {
        var key = String(name || "").toLowerCase();
        if (!key || key === String(me || "").toLowerCase() || seen[key]) {
            return false;
        }
        seen[key] = true;
        return true;
    });
    var starts = unique.filter(function (name) {
        return name.toLowerCase().indexOf(lower) === 0;
    });
    var contains = lower ? unique.filter(function (name) {
        return name.toLowerCase().indexOf(lower) > 0;
    }) : [];
    return starts.concat(contains).slice(0, 6);
}

function insertMention(value, caret, query, name) {
    var text = "@" + name + " ";
    return { value: value.slice(0, query.start) + text + value.slice(caret), caret: query.start + text.length };
}

// Suggests player names after "@" in war.app's chat boxes; Enter, Tab and the arrows pick a name
// while the list is open, so a half-typed message isn't sent.
function setupChatMentionSuggest(isChatBox, namesFor) {
    addCSS(`
        #tuydMentionList {
            position: fixed;
            z-index: 60;
            min-width: 160px;
            padding: 3px 0;
            border: 1px solid #555;
            border-radius: 5px;
            background: #1b1b1b;
            color: #ddd;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
        }
        #tuydMentionList div {
            padding: 2px 10px;
            cursor: pointer;
            white-space: nowrap;
        }
        #tuydMentionList div.tuydActive {
            background: #3a3a3a;
            color: #fff;
        }
    `);
    var state = null;
    var swallow = false;
    var close = function () {
        state = null;
        $("#tuydMentionList").remove();
    };
    var pick = function (name) {
        var box = state.box;
        var next = insertMention(box.value, box.selectionStart, state.query, name);
        box.value = next.value;
        box.setSelectionRange(next.caret, next.caret);
        box.dispatchEvent(new Event("input", { bubbles: true }));
        close();
        box.focus();
    };
    var render = function () {
        var list = $("#tuydMentionList");
        if (!list.length) {
            list = $('<div id="tuydMentionList" title="Muli\'s Userscript"></div>').appendTo("body");
        }
        list.empty().append(state.names.map(function (name, i) {
            return $("<div></div>").text(name).toggleClass("tuydActive", i === state.active).attr("data-index", i);
        }));
        var rect = state.box.getBoundingClientRect();
        list.css({ left: rect.left + 8, top: Math.max(4, rect.top - list.outerHeight() - 4) });
    };
    var update = function (box) {
        var query = mentionQuery(box.value, box.selectionStart);
        var names = query ? mentionCandidates(namesFor(box), query.text, "") : [];
        if (!names.length) {
            close();
            return;
        }
        state = { box: box, query: query, names: names, active: 0 };
        render();
    };
    document.addEventListener("input", function (event) {
        if (isChatBox(event.target)) {
            update(event.target);
        }
    }, true);
    document.addEventListener("keydown", function (event) {
        if (!state || event.target !== state.box) {
            return;
        }
        var key = event.key;
        if (key === "ArrowDown" || key === "ArrowUp") {
            state.active = (state.active + (key === "ArrowDown" ? 1 : state.names.length - 1)) % state.names.length;
            render();
        } else if (key === "Enter" || key === "Tab") {
            swallow = key === "Enter";
            pick(state.names[state.active]);
        } else if (key === "Escape") {
            close();
        } else {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);
    ["keypress", "keyup"].forEach(function (type) {
        document.addEventListener(type, function (event) {
            if (swallow && event.key === "Enter") {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (type === "keyup") {
                    swallow = false;
                }
            }
        }, true);
    });
    $(document).on("mousedown", "#tuydMentionList div", function (event) {
        event.preventDefault();
        if (state) {
            pick(state.names[Number($(this).attr("data-index"))]);
        }
    }).on("focusout", function (event) {
        if (state && event.target === state.box) {
            setTimeout(function () {
                if (state && document.activeElement !== state.box) {
                    close();
                }
            }, 150);
        }
    });
}

function setupChatRoomMentionSuggest() {
    var me = "";
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            me = player && player.Name || "";
        });
    }
    setupChatMentionSuggest(function (element) {
        return !!element && /^ujs_SendChatText(?:_\d+)?_input$/.test(element.id);
    }, function (box) {
        var tab = $(box).parents().filter(function () {
            return /^ujs_ChatRoomTab(?:_\d+)?$/.test(this.id);
        }).first();
        return mentionCandidates(chatRoomRows(tab).filter(function (row) {
            return !row.event;
        }).reverse().map(function (row) {
            return row.name;
        }), "", me);
    });
}

function setupGameMentionSuggest() {
    var me = "";
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            me = player && player.Name || "";
        });
    }
    setupChatMentionSuggest(function (element) {
        return !!element && /^ujs_SendChatInput(?:_\d+)?_input$/.test(element.id);
    }, function () {
        return mentionCandidates(gamePlayerNames(me), "", me);
    });
}

function setupDashboardChatLink() {
    var link = $('<a id="tuydChatLink" href="/MultiPlayer?ChatRoom=1" title="Global, clan and group chats (Muli\'s Userscript)">Chat</a>');
    var nextToRefresh = function (refresh) {
        var floated = refresh.css("float");
        link.addClass(refresh.attr("class") || "btn btn-primary").css({ margin: "0 5px", float: floated === "none" ? "" : floated }).insertBefore(refresh);
    };
    // With the scrollable dashboard, Chat and Refresh go on the My / Open / Past Games row, lined up
    // with the right edge of the games table below.
    var onButtonRow = function (refresh, buttonRow) {
        addCSS(`
            #tuydDashButtons {
                display: flex;
                gap: 8px;
                float: right;
                margin: 5px 0;
            }
            #tuydDashButtons > * {
                float: none;
                margin: 0;
            }
        `);
        var group = $('<div id="tuydDashButtons"></div>').appendTo(buttonRow);
        group.append(link.addClass(refresh.attr("class") || "btn btn-primary"), refresh.detach());
        // Right edge on the Filter button's, or a little inside the table's on the other tabs.
        // The tab not shown is moved out of the left column but still counts as visible.
        var align = function () {
            var column = $(".leftColumn");
            var filter = column.find("#MyGamesFilterBtn").filter(":visible")[0];
            var table = column.find("#MyGamesTable, #OpenGamesTable, #PastGamesTable").filter(":visible")[0];
            var target = filter ? filter.getBoundingClientRect().right : table ? table.getBoundingClientRect().right - 7 : null;
            if (target === null) {
                return;
            }
            group.css("margin-right", 0);
            group.css("margin-right", Math.max(0, group[0].getBoundingClientRect().right - target));
        };
        align();
        $(window).on("resize", align);
        $("#switchGameRadio").on("click", "label", function () {
            setTimeout(align, 0);
        });
        // Switching tabs can take the page's scrollbar away and widen the row.
        if (typeof ResizeObserver === "function") {
            new ResizeObserver(align).observe(buttonRow[0]);
        }
    };
    // The dashboard lays itself out once the settings are read, and makes its Refresh button just after.
    var tries = 0;
    var place = function () {
        if ($("#tuydChatLink").length) {
            return;
        }
        var refresh = $("#refreshAll");
        if (!refresh.length && ++tries < 50) {
            setTimeout(place, 100);
            return;
        }
        refresh = refresh.length ? refresh : $("#RefreshBtn, #RefreshBtn2").first();
        if (!refresh.length) {
            $("#NumberOfMyGamesLabel").after(link.addClass("btn btn-primary btn-sm").css({ marginLeft: "10px" }));
            return;
        }
        ifSettingIsEnabled("scrollGames", function () {
            var buttonRow = $(".gameButtonCol").first();
            if (buttonRow.length) {
                onButtonRow(refresh, buttonRow);
            } else {
                nextToRefresh(refresh);
            }
        }, function () {
            nextToRefresh(refresh);
        });
    };
    place();
}

function watchQuickmatchLeaderboardRequests(callback) {
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.tuydUrl = String(url);
        return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
        if (/[?&]m=GetQuickmatchLeaderboards\b/.test(this.tuydUrl || "") && typeof body === "string") {
            try {
                callback(this.tuydUrl, body);
            } catch (e) {
                log("Quickmatch leaderboard rank: " + e);
            }
        }
        return send.apply(this, arguments);
    };
}

function setupLeaderboardRank() {
    addCSS(`
        .tuydLeaderboardRank {
            position: absolute;
            white-space: nowrap;
            color: #e0c060;
            font-size: 15.4px;
            line-height: 15.4px;
            pointer-events: auto;
        }
    `);
    var request = null;
    var me = "";
    var searches = {};
    var timer = null;
    var label = function () {
        return $("[id^='ujs_HeaderLabel']").filter(function () {
            return /^ujs_HeaderLabel(?:_\d+)?_tmp$/.test(this.id) && parseYourRating($(this).text()) !== null;
        }).first();
    };
    var show = function (key, text, title) {
        var tmp = label();
        if (!tmp.length) {
            return;
        }
        var holder = tmp.parent();
        var tag = holder.children(".tuydLeaderboardRank");
        if (!text) {
            tag.remove();
            return;
        }
        if (!tag.length) {
            tag = $('<span class="tuydLeaderboardRank"></span>').appendTo(holder);
        }
        var range = document.createRange();
        range.selectNodeContents(tmp[0]);
        var width = range.getBoundingClientRect().width;
        tag.attr("data-key", key).text(text).attr("title", title).css({ left: tmp[0].offsetLeft + width + 12, top: tmp[0].offsetTop });
    };
    var check = function () {
        timer = null;
        var tmp = label();
        if (!tmp.length || !request) {
            return;
        }
        var rating = parseYourRating(tmp.text());
        var key = $("#ujs_CategoryBtn").text().trim() + "|" + rating;
        var cacheKey = "tuydLeaderboardRank:" + key;
        if (!searches[key]) {
            var cached = null;
            try {
                cached = JSON.parse(sessionStorage.getItem(cacheKey));
            } catch (e) {
            }
            if (cached && cached.time > Date.now() - 10 * 60 * 1000) {
                searches[key] = Promise.resolve(cached.result);
            } else {
                var template = request.body;
                var url = request.url;
                searches[key] = findLeaderboardRank(function (offset, count) {
                    return Promise.resolve($.ajax({
                        url: url,
                        type: "POST",
                        data: leaderboardRequestBody(template, offset, count),
                        dataType: "text",
                        contentType: "application/x-www-form-urlencoded; charset=UTF-8"
                    })).then(parseQuickmatchLeaderboard);
                }, rating, me, 50).then(function (result) {
                    try {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), result: result }));
                    } catch (e) {
                    }
                    return result;
                }, function (error) {
                    log("Quickmatch leaderboard rank: " + error);
                    return null;
                });
            }
        }
        if (tmp.parent().children(".tuydLeaderboardRank").attr("data-key") !== key) {
            show(key, "Rank …", "Finding your rank (Muli's Userscript)");
        }
        searches[key].then(function (result) {
            if (label().length && $("#ujs_CategoryBtn").text().trim() + "|" + parseYourRating(label().text()) === key) {
                show(key, leaderboardRankText(result), result && !result.exact ? "Your place among the players with your rating, as shown (Muli's Userscript)" : "Your place on this leaderboard (Muli's Userscript)");
            }
        });
    };
    watchQuickmatchLeaderboardRequests(function (url, body) {
        if (/^(?:[0-9a-f]{2})+$/i.test(body) && body.length > 16) {
            request = { url: url, body: body };
        }
    });
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            me = player && player.Name || "";
        });
    }
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 300);
        }
    }).observe(document.body, { childList: true, subtree: true });
}


// A pop-up's title and message: WziBalloon > Header, and Content > Row > Label (holding a close button).
function idleBalloonEntry(balloon) {
    var title = $(balloon).find("[id^='ujs_Header']").first().text().trim();
    var text = $(balloon).find("[id^='ujs_Label']").filter(function () {
        return !/_(?:tmp|img|btn)$/.test(this.id);
    }).map(function () {
        return $(this).clone().find("[id^='ujs_CloseBtn']").remove().end().text().replace(/\s+/g, " ").trim();
    }).get().filter(Boolean).join(" · ");
    return title || text ? { title: title, text: text } : null;
}

function idleLogEntries() {
    try {
        var stored = JSON.parse(sessionStorage.getItem(IDLE_LOG_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
}

function idleLogHtml(entries) {
    return '<div class="idleLogHead">Pop-ups (' + entries.length + ')<a href="#" class="idleLogClear">Clear</a><a href="#" class="idleLogClose" title="Close">×</a></div>' +
        (entries.length ? entries.slice().reverse().map(function (entry) {
            var time = new Date(entry.at);
            return '<div class="idleLogEntry"><span class="idleLogTime">' + htmlEscape(("0" + time.getHours()).slice(-2) + ":" + ("0" + time.getMinutes()).slice(-2)) + '</span> ' +
                (entry.title ? "<b>" + htmlEscape(entry.title) + "</b> " : "") + htmlEscape(entry.text) + "</div>";
        }).join("") : '<div class="idleLogEmpty">Pop-ups shown on the map since this tab opened will be listed here.</div>');
}

// Keeps the last 100 of Idle's pop-ups (captures, digs, powers, caches) in a list, for this tab.
function setupIdlePopupLog() {
    addCSS(`
        #idleLogBtn {
            position: absolute;
            left: -72px;
            bottom: 0;
            width: 66px;
            height: 40px;
            z-index: 3;
            pointer-events: auto;
            border: 2px solid #555;
            border-radius: 5px;
            background: #222;
            color: #ccc;
            font-size: 13px;
            font-weight: 700;
        }
        #idleLog {
            position: fixed;
            right: 12px;
            bottom: 90px;
            z-index: 2000;
            width: 340px;
            max-width: calc(100vw - 24px);
            max-height: 50vh;
            overflow-y: auto;
            padding: 8px 10px;
            border: 1px solid #555;
            border-radius: 6px;
            background: #1b1b1b;
            color: #ccc;
            font-size: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
        }
        #idleLog .idleLogHead {
            display: flex;
            gap: 10px;
            align-items: baseline;
            margin-bottom: 6px;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
        }
        #idleLog .idleLogClear {
            margin-left: auto;
            font-weight: normal;
            font-size: 12px;
        }
        #idleLog .idleLogClose {
            color: #aaa;
            font-size: 18px;
            text-decoration: none;
        }
        #idleLog .idleLogEntry {
            padding: 2px 0;
            border-top: 1px solid #2c2c2c;
        }
        #idleLog .idleLogTime, #idleLog .idleLogEmpty {
            color: #777;
        }
    `);
    var entries = idleLogEntries();
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;
    var save = function () {
        try {
            sessionStorage.setItem(IDLE_LOG_KEY, JSON.stringify(entries));
        } catch (e) {
        }
    };
    var render = function () {
        $("#idleLogBtn").text("Log" + (entries.length ? " " + entries.length : ""));
        $("#idleLog").html(idleLogHtml(entries));
    };
    var check = function () {
        $("[id^='ujs_WziBalloon']").filter(function () {
            return /^ujs_WziBalloon(?:_\d+)?$/.test(this.id) && this.style.display !== "none";
        }).each(function () {
            var entry = idleBalloonEntry(this);
            var key = entry && entry.title + "|" + entry.text;
            if (!entry || (seen && seen.has(this) && this.getAttribute("data-tuyd-logged") === key)) {
                return;
            }
            if (seen) {
                seen.add(this);
            }
            this.setAttribute("data-tuyd-logged", key);
            entry.at = Date.now();
            entries.push(entry);
            entries = entries.slice(-100);
            save();
            render();
        });
        var zoom = $("[id^='ujs_MagnifyingButtonsContainer']").first();
        if (zoom.length && !$("#idleLogBtn").length) {
            zoom.append('<button type="button" id="idleLogBtn" title="The pop-ups Idle showed on the map, newest first (Muli\'s Userscript)"></button>');
            render();
        }
    };
    $(document).on("click", "#idleLogBtn", function () {
        if ($("#idleLog").length) {
            $("#idleLog").remove();
            return;
        }
        $("body").append('<div id="idleLog"></div>');
        render();
    }).on("click", "#idleLog .idleLogClear", function (event) {
        event.preventDefault();
        entries = [];
        save();
        render();
    }).on("click", "#idleLog .idleLogClose", function (event) {
        event.preventDefault();
        $("#idleLog").remove();
    });
    var timer = null;
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(function () {
                timer = null;
                check();
            }, 250);
        }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    check();
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
            data += '<span class="ui-icon ui-icon-trash"></span></a><span class="tuydBookmarkGrip" title="Drag to move this bookmark">⋮⋮</span>';
            data += '<a class="tuydBookmarkStep tuydBookmarkDown" title="Move down" onclick="moveBookmarkStep(' + Number(bookmark.id) + ', 1)">▼</a>';
            data += '<a class="tuydBookmarkStep tuydBookmarkUp" title="Move up" onclick="moveBookmarkStep(' + Number(bookmark.id) + ', -1)">▲</a></td></tr>';
        });

        $("#BookmarkTable").append(data + '</tbody>');
        makeBookmarksSortable();
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

// The order for a bookmark dropped between two others (either can be missing at the ends). Orders are
// numbers sorted ascending; a new one goes halfway between its neighbours, as Move up / Move Down do.
function bookmarkOrderBetween(before, after) {
    if (before !== null && after !== null) {
        return (before + after) / 2;
    }
    if (before !== null) {
        return before + 1;
    }
    if (after !== null) {
        return after > 0 ? after / 2 : after - 1;
    }
    return 1;
}

// Bookmarks can be dragged into a new order by the grip that shows on hover, or moved one place with its
// ▲ ▼; the right-click menu's Move up / Move Down still work. jQuery UI's sortable comes with the script's
// own jQuery ($$$), so without it only the arrows and the menu are left.
function makeBookmarksSortable() {
    addCSS(`
        #BookmarkTable .tuydBookmarkGrip,
        #BookmarkTable .tuydBookmarkStep {
            float: right;
            margin-right: 6px;
            color: #888;
            visibility: hidden;
            user-select: none;
        }
        #BookmarkTable .tuydBookmarkGrip {
            cursor: grab;
        }
        #BookmarkTable .tuydBookmarkStep {
            cursor: pointer;
            font-size: 10px;
            line-height: 20px;
            text-decoration: none;
        }
        #BookmarkTable .tuydBookmarkStep:hover {
            color: #e0c060;
        }
        #BookmarkTable tbody tr:hover .tuydBookmarkGrip,
        #BookmarkTable tbody tr:hover .tuydBookmarkStep {
            visibility: visible;
        }
        #BookmarkTable tbody tr:first-child .tuydBookmarkUp,
        #BookmarkTable tbody tr:last-child .tuydBookmarkDown {
            display: none;
        }
        #BookmarkTable .tuydBookmarkDropSpot {
            height: 30px;
            background: rgba(224, 192, 96, 0.15);
        }
    `);
    if (typeof $$$ === "undefined" || !$$$.fn.sortable) {
        return;
    }
    $$$("#BookmarkTable tbody").sortable({
        handle: ".tuydBookmarkGrip",
        axis: "y",
        placeholder: "tuydBookmarkDropSpot",
        update: function (event, ui) {
            var row = ui.item;
            var order = function (element) {
                var value = element.length ? Number(element.attr("data-order")) : NaN;
                return isNaN(value) ? null : value;
            };
            var id = Number(row.attr("data-bookmarkid"));
            var next = bookmarkOrderBetween(order(row.prev("tr")), order(row.next("tr")));
            Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
                var bookmark = bookmarks.filter(function (candidate) {
                    return candidate.id === id;
                })[0];
                if (!bookmark) {
                    return;
                }
                bookmark.order = next;
                Database.update(Database.Table.Bookmarks, bookmark, bookmark.id, function () {
                    refreshBookmarks();
                });
            });
        }
    });
}

// The order for a bookmark moved one place up (step -1) or down (1): between its new neighbours, so only
// that row is written (orders are a unique index, so swapping two would collide). null at either end.
function bookmarkStepOrder(bookmarks, id, step) {
    var orders = bookmarks.slice().sort(function (a, b) {
        return a.order - b.order;
    });
    var index = orders.map(function (bookmark) {
        return bookmark.id;
    }).indexOf(id);
    orders = orders.map(function (bookmark) {
        return bookmark.order;
    });
    var to = index + step;
    if (index < 0 || to < 0 || to >= orders.length) {
        return null;
    }
    var neighbour = function (at) {
        return at >= 0 && at < orders.length ? orders[at] : null;
    };
    return step < 0 ? bookmarkOrderBetween(neighbour(to - 1), orders[to]) : bookmarkOrderBetween(orders[to], neighbour(to + 1));
}

window.moveBookmarkStep = function (id, step) {
    Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
        var order = bookmarkStepOrder(bookmarks, id, step);
        var bookmark = bookmarks.filter(function (candidate) {
            return candidate.id === id;
        })[0];
        if (order === null || !bookmark) {
            return;
        }
        bookmark.order = order;
        Database.update(Database.Table.Bookmarks, bookmark, bookmark.id, refreshBookmarks);
    });
};

window.moveBookmarkUp = function () {
    moveBookmarkStep(bookmarkId, -1);
};

window.moveBookmarkDown = function () {
    moveBookmarkStep(bookmarkId, 1);
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

        // A bookmark's order can be 0 (the first one saved), so only a missing one rules the menu out.
        if (bookmarkId && !isNaN(bookmarkOrder)) {
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
        section: 'Dashboard',
        help: 'This option displays My-, Open-, Coin-Games in a scrollable box, which removes a lot of unesessary scrolling. You can find tabs to switch between the different type of games. '
    },
    {
        id: 'hideMyGamesIcons',
        text: 'Hide Icons in "My Games"',
        selected: false,
        section: 'Dashboard',
        help: 'This option hides game icons for My Games on the dashboard'
    },
    {
        id: 'autoRefreshOnFocus',
        text: 'Automatically Refresh Games on Tab-Focus',
        selected: true,
        section: 'Dashboard',
        help: 'This option automatically refreshes your games after switching back to War.app from a different tab / program. This only applies if War.app was idle for 30 or more seconds.'
    },
    {
        id: 'hideCoinsGlobally',
        text: 'Hide Coins Globally',
        selected: false,
        section: 'Other',
        help: 'This option removes everything from War.app related to Coins'
    },
    {
        id: 'useDefaultBootLabel',
        text: 'Use the Default Boot Time Label',
        selected: false,
        section: 'Dashboard'
    },
    {
        id: 'showPrivateNotesOnProfile',
        text: 'Show Private Notes on Profile',
        selected: true,
        section: 'Profile',
        help: 'This option will show you your private notes which you made on a player directly on their profile page. You can find them on the left side under the profile picture.'
    },
    {
        id: 'hideOffTopic',
        text: 'Automatically Hide Off-Topic Threads',
        selected: false,
        section: 'Forum',
        help: 'This option automatically hides all off-topic threads everytime you visit the All Forum Posts page'
    }, {
        id: 'hideWarzoneIdle',
        text: 'Automatically Hide War.app Idle Threads',
        selected: false,
        section: 'Forum',
        help: 'This option automatically hides all War.app Idle threads everytime you visit the All Forum Posts page'
    },
    {
        id: 'disableHideThreadOnDashboard',
        text: 'Disable Right-Click on the Forum Table',
        selected: false,
        section: 'Forum',
        help: 'This option will allow you to right-click forum thread on the dashboard and use the default browser options.'
    },
    {
        id: 'turnNotifications',
        text: 'Desktop Notification When a Game Needs You',
        selected: false,
        section: 'Dashboard',
        help: 'While a dashboard tab is open, the script checks your games every 5 minutes in the background and shows a desktop notification when a game becomes your turn. Your browser asks for permission when you turn this on.'
    },
    {
        id: 'confirmCommit',
        text: 'Ask Before Committing Orders',
        selected: false,
        section: 'Games',
        help: 'In a game, pressing Commit (or Autopilot\'s Run+Commit) first asks "Commit your orders for this turn?", so a stray click or tap doesn\'t send unfinished orders. Takes effect when a game page loads.'
    },
    {
        id: 'readNewChatAloud',
        text: 'Read New Chat Messages Aloud',
        selected: false,
        section: 'Games',
        help: 'While a game or the chat rooms are open, new chat messages from other players are read aloud with your browser\'s own voice, so you can listen while entering orders. In the chat rooms, only the tab you are looking at is read, and hidden notices and muted players never are. Older messages are never read by themselves; use the 🔊 next to a message for those. Your browser only speaks after you have clicked somewhere on the page.'
    },
    {
        id: 'idleNotifications',
        text: 'Idle: Desktop Notification When Idle Needs You',
        selected: false,
        section: 'Idle',
        help: 'While Idle is open in a background tab, shows a desktop notification when it needs you: unclaimed powers, an artifact to claim, a tank ready to move, a battle, the daily bonus or the coin wheel. Your browser asks for permission when you turn this on.'
    },
    {
        id: 'mailPreviewSearch',
        text: 'Mail: Search the First 15 Words of Each Thread',
        selected: true,
        section: 'Other',
        help: 'Lets "Filter by words" on your mail page look in the first 15 words of each thread, not only the subject. The first time, the script opens each of your mail threads once to read them and keeps those words in this browser. Turning this off deletes them.'
    },
    {
        id: 'useMaakServices',
        text: 'Load MTL Ladder and Community Level Records (via maak.ch)',
        selected: false,
        section: 'Third-party data',
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
        #menuSearchBar {
            position: sticky;
            top: -16px;
            z-index: 5;
            margin: -16px -16px 8px;
            padding: 12px 16px 8px;
            background: inherit;
            background-color: #1b1b1b;
            border-bottom: 1px solid #333;
        }
        #menuSearch {
            width: 100%;
            padding: 6px 10px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #222;
            color: #e0e0e0;
        }
        #menuSearchBar .text-muted {
            margin-top: 4px;
            font-size: 12px;
        }
        #userscriptMenu .modal-title {
            display: flex;
            align-items: center;
        }
        .menuLinks {
            margin-left: 16px;
            font-size: 17px;
            font-weight: normal;
            line-height: 1;
        }
        .menuSection {
            border-bottom: 1px solid #333;
        }
        .menuSectionHeader {
            display: flex;
            width: 100%;
            align-items: center;
            padding: 12px 4px;
            border: 0;
            background: none;
            color: #e0e0e0;
            font-size: 17px;
            text-align: left;
            cursor: pointer;
        }
        .menuSectionHeader:before {
            content: "▸";
            width: 18px;
            color: #888;
        }
        .menuSection.open > .menuSectionHeader:before,
        #userscriptMenu.menuSearching .menuSectionMatch > .menuSectionHeader:before {
            content: "▾";
        }
        .menuSectionCount {
            margin-left: 8px;
            padding: 0 7px;
            border-radius: 9px;
            background: #333;
            color: #aaa;
            font-size: 12px;
        }
        .menuSectionBody {
            display: none;
            padding: 0 4px 16px 22px;
        }
        .menuSection.open > .menuSectionBody,
        #userscriptMenu.menuSearching .menuSectionMatch > .menuSectionBody {
            display: block;
        }
        #userscriptMenu.menuSearching .menuSectionHidden,
        #userscriptMenu.menuSearching .menuItemHidden,
        #userscriptMenu.menuSearching .menuSection:not(.menuHeadingMatch) > .menuSectionBody > :not(.settingsListItem) {
            display: none;
        }
        .menuSectionBody .settingsListItem:first-child {
            padding-top: 4px;
        }
    `);
    var inputs = renderMenuSections(userscriptSettings, toggleableFeatures(), disabledFeatures(), openMenuSections(), function (setting) {
        return setting.help != undefined ? `<img tabindex="0" class="help-icon" src="${IMAGES.QUESTION}" data-content="${getSettingInfo(setting.id)}" data-toggle="popover">` : '';
    });
    $("body").append(`
        <div class="modal modal-750 fade" id="userscriptMenu" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Muli's Userscript  ${version}<span class="menuLinks"><a href="${SITE_URL}" target="_blank" rel="noopener">Website</a> · <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a></span></h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div id="menuSearchBar"><input type="search" id="menuSearch" placeholder="Search settings and features" autocomplete="off"><div class="text-muted">Changes apply after Close &amp; Refresh.</div></div>
                ${inputs}
              </div>
              <div class="modal-footer">
                <span class="mr-auto text-muted" style="font-size: 13px">Maintained by <a href="/Profile?p=2921525624" target="_blank" rel="noopener">KKND</a> · <a href="/Forum/897130-mulis-userscript-update" target="_blank" rel="noopener">Forum thread</a></span>
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
    $("#userscriptMenu .menuSection[data-section='Dashboard'] > .menuSectionBody").append('<button class="btn btn-primary" data-toggle="modal" data-target="#dashboardTableSortMenu" style="margin-top:15px;">Sort Right Column Tables</button>');
    addCSS(`
        .userscriptSettingsButtons {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
        }
    `);
    $("#userscriptMenu .modal-body").append(menuSection("Backup", "Backup", null, "<div class='userscriptSettingsButtons'></div>", openMenuSections().indexOf("Backup") !== -1));
    setupMenuSections();
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
    $("#turnNotifications, #idleNotifications").on("change", function () {
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

// One foldable section per area, holding that area's settings and then its feature switches.
function renderMenuSections(settings, features, disabled, open, helpIcon) {
    var order = MENU_SECTIONS.map(function (entry) {
        return entry[0];
    });
    var groups = {};
    var add = function (section, html) {
        if (order.indexOf(section) === -1) {
            order.push(section);
        }
        (groups[section] = groups[section] || []).push(html);
    };
    settings.forEach(function (setting) {
        add(setting.section || "Other", '<div class="settingsListItem">' + setting.text + helpIcon(setting) + '<label class="switch"><input id="' + setting.id + '" type="checkbox"><div class="slider round"></div></label></div>');
    });
    features.forEach(function (feature) {
        add(feature.section, '<div class="settingsListItem">' + htmlEscape(feature.name) + '<label class="switch"><input class="featureToggle" data-feature="' + htmlEscape(feature.name) +
            '" type="checkbox"' + (disabled.indexOf(feature.name) === -1 ? ' checked' : '') + '><div class="slider round"></div></label></div>');
    });
    return order.filter(function (section) {
        return groups[section];
    }).map(function (section) {
        var label = (MENU_SECTIONS.filter(function (entry) {
            return entry[0] === section;
        })[0] || [section, section])[1];
        return menuSection(section, label, groups[section].length, groups[section].join(""), open.indexOf(section) !== -1);
    }).join("");
}

function menuSection(key, label, count, body, open) {
    return '<div class="menuSection' + (open ? " open" : "") + '" data-section="' + htmlEscape(key) + '"><button type="button" class="menuSectionHeader">' + htmlEscape(label) +
        (count ? '<span class="menuSectionCount">' + htmlEscape(count) + '</span>' : "") + '</button><div class="menuSectionBody">' + body + '</div></div>';
}

function openMenuSections() {
    try {
        var stored = JSON.parse(localStorage.getItem(MENU_SECTIONS_KEY));
        if (Array.isArray(stored)) {
            return stored;
        }
    } catch (e) {
    }
    return ["Dashboard"];
}

function setupMenuSections() {
    var menu = $("#userscriptMenu");
    menu.on("click", ".menuSectionHeader", function () {
        if (menu.hasClass("menuSearching")) {
            return;
        }
        $(this).parent().toggleClass("open");
        try {
            localStorage.setItem(MENU_SECTIONS_KEY, JSON.stringify(menu.find(".menuSection.open").map(function () {
                return $(this).attr("data-section");
            }).get()));
        } catch (e) {
        }
    });
    menu.on("input", "#menuSearch", function () {
        filterMenu(menu, $(this).val());
    });
}

// While searching, only matching switches show, in their sections opened; a section whose heading
// matches shows all of its switches and its buttons (e.g. "backup").
function filterMenu(menu, query) {
    var needle = String(query || "").trim().toLowerCase();
    menu.toggleClass("menuSearching", needle !== "");
    menu.find(".menuSection").each(function () {
        var section = $(this);
        var headingMatches = needle !== "" && section.children(".menuSectionHeader").text().toLowerCase().indexOf(needle) !== -1;
        var any = headingMatches;
        section.find(".settingsListItem").each(function () {
            var hit = needle === "" || headingMatches || $(this).text().toLowerCase().indexOf(needle) !== -1;
            $(this).toggleClass("menuItemHidden", !hit);
            any = any || hit;
        });
        section.toggleClass("menuSectionHidden", !any).toggleClass("menuSectionMatch", needle !== "" && any).toggleClass("menuHeadingMatch", headingMatches);
    });
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

var GAME_CHAT_FRAME_ID = "tuydGameChatFrame";
var GAME_MAP_FRAME_ID = "tuydGameMapFrame";

// A hidden copy of a game would otherwise play the game's sounds a second time: a chat bell for every new
// message, the your-turn sound. war.app plays them through SoundManager 2, which uses HTML audio.
function muteScriptFrame() {
    window.HTMLMediaElement.prototype.play = function () {
        return Promise.resolve();
    };
    var mute = function () {
        if (window.soundManager && typeof window.soundManager.mute === "function") {
            window.soundManager.mute();
        }
    };
    mute();
    window.setInterval(mute, 2000);
}

// The script's own hidden game frames: the dashboard's game chat, and Past Games looking up a game's map.
function inScriptFrame() {
    try {
        return !!window.frameElement && [GAME_CHAT_FRAME_ID, GAME_MAP_FRAME_ID].indexOf(window.frameElement.id) !== -1;
    } catch (e) {
        return false;
    }
}

// My Games rows that are games (an Auto Game's lobby has no GameID yet), with the cell of the name link.
function myGamesChatTargets() {
    return $("#MyGamesTable tr.GameRow").get().map(function (row) {
        var link = $(row).find("a[href*='GameID=']").filter(function () {
            return /[?&]GameID=\d+/i.test($(this).attr("href") || "");
        }).last();
        var match = /[?&]GameID=(\d+)/i.exec(link.attr("href") || "");
        return match ? { row: row, cell: link.closest("td")[0], id: match[1], name: link.text().trim() } : null;
    }).filter(Boolean);
}

// What the hidden game shows in its chat: public chat is `ujs_ChatTab`, team chat `ujs_ChatTab_2`,
// each with its own box and Send button, shown only where you can write.
function gameChatFrameState(doc) {
    var byId = function (id) {
        return doc.getElementById(id);
    };
    var chat = byId("ujs_Chat");
    var tab = function (suffix) {
        var element = byId("ujs_ChatTab" + suffix);
        var older = element ? $(element).find("[id^='ujs_LoadOlderMessagesBtn'], [id^='ujs_ShowOlderChatBtn']").filter(function () {
            return /^ujs_(?:LoadOlderMessagesBtn|ShowOlderChatBtn)(?:_\d+)?$/.test(this.id) && shownUjsElement(this);
        })[0] : null;
        return {
            messages: element ? chatMessages(element) : [],
            canSend: shownUjsElement(byId("ujs_SendChatContainer" + suffix)),
            older: older ? older.id : null
        };
    };
    return {
        ready: !!chat && !!byId("ujs_ChatCollapseButton_btn"),
        open: !!chat && chat.style.display !== "none",
        hasTeam: shownUjsElement(byId("ujs_TeamChatTab")),
        archived: shownUjsElement(byId("ujs_NoChatDueToArchiveMessage")),
        public: tab(""),
        team: tab("_2")
    };
}

var GAME_CHAT_RECENT = 20;

// The newest `limit` messages, and a note when there are more, in the game or not yet loaded from it.
function renderGameChatMessages(messages, muted, limit, hasOlder) {
    if (!messages.length) {
        return '<div class="tuydGameChatNote">No messages yet.</div>';
    }
    var hidden = Math.max(0, messages.length - limit);
    var more = hidden || hasOlder ? '<div class="tuydGameChatMore">Showing the last ' + Math.min(limit, messages.length) + " messages"
        + (hasOlder ? "" : " of " + messages.length) + '. <a href="#" class="tuydGameChatShowAll">Show all</a></div>' : "";
    return more + messages.slice(hidden).map(function (message) {
        if (muted.indexOf(message.name) !== -1) {
            return '<div class="tuydGameChatMsg tuydGameChatMutedMsg">muted</div>';
        }
        return '<div class="tuydGameChatMsg"><span class="tuydGameChatName">' + htmlEscape(message.name) + '</span> <span class="tuydGameChatTime">' + htmlEscape(message.time) + '</span>'
            + '<div class="tuydGameChatText">' + htmlEscape(message.text) + '</div></div>';
    }).join("");
}

// Per kind of game: the profile's Play Speed section, which of its turn-time ranges count as slow, and the
// limit box's unit and default.
var LOBBY_PACE_KINDS = {
    multiDay: { heading: /Multi-Day Games/i, slow: /1 day - 1 week|>\s*1 week/i, over: "over a day", overLong: "took over a day", unit: "h", unitHours: 1, fallback: 24, step: 1, key: "tidyUpYourDashboard.lobbyPaceHours" },
    realTime: { heading: /Real-Time Games/i, slow: /2 - 5 mins|5 - 10 mins|>\s*10 mins/i, over: "over 2 min", overLong: "took over 2 minutes", unit: "min", unitHours: 1 / 60, fallback: 3, step: 0.5, key: "tidyUpYourDashboard.lobbyPaceMinutesRealTime" }
};

function durationHours(text) {
    var units = { day: 24, hour: 1, minute: 1 / 60, second: 1 / 3600 };
    var total = 0;
    var found = false;
    String(text || "").replace(/(\d+(?:\.\d+)?)\s*(day|hour|minute|second)s?/gi, function (all, amount, unit) {
        total += parseFloat(amount) * units[unit.toLowerCase()];
        found = true;
    });
    return found ? total : null;
}

function shortDuration(text) {
    return String(text || "").replace(/(\d+)\s*days?/gi, "$1d").replace(/(\d+)\s*hours?/gi, "$1h").replace(/(\d+)\s*minutes?/gi, "$1m").replace(/(\d+)\s*seconds?/gi, "$1s").trim();
}

// What a profile page says about a player's pace: games in progress, boot rate, and the Play Speed
// sections for multi-day and real-time games (an average, and a bar per range whose `title` is the
// number of turns).
function parseProfilePace(doc) {
    var text = doc.body ? doc.body.textContent.replace(/\s+/g, " ") : "";
    var games = /Currently in ([\d,]+) multi-day games?/i.exec(text);
    var booted = /Booted [\d,]+ times? \((\d+)% of their last/i.exec(text);
    var section = function (kind) {
        var average = null;
        var ranges = [];
        var heading = $(doc).find("h5").filter(function () {
            return kind.heading.test($(this).text());
        })[0];
        if (heading) {
            var node = heading.nextSibling;
            var between = "";
            for (; node && node.nodeName !== "TABLE" && node.nodeName !== "H5"; node = node.nextSibling) {
                between += node.textContent;
            }
            var match = /Average:\s*(.*\S)/i.exec(between.replace(/\s+/g, " "));
            average = match ? match[1] : null;
            if (node && node.nodeName === "TABLE") {
                $(node).find("tr").each(function () {
                    var cells = $(this).children("td");
                    var bar = cells.last().children("div[title]");
                    if (cells.length === 2 && bar.length) {
                        ranges.push({ label: cells.first().text().replace(/\u00a0/g, " ").trim(), turns: parseInt(bar.attr("title"), 10) || 0 });
                    }
                });
            }
        }
        var count = function (list) {
            return list.reduce(function (sum, range) {
                return sum + range.turns;
            }, 0);
        };
        var turns = count(ranges);
        var slow = count(ranges.filter(function (range) {
            return kind.slow.test(range.label);
        }));
        return { average: average, averageHours: durationHours(average), slowPercent: turns ? Math.round(slow / turns * 100) : null };
    };
    return {
        games: games ? Number(games[1].replace(/,/g, "")) : null,
        bootedPercent: booted ? Number(booted[1]) : null,
        multiDay: section(LOBBY_PACE_KINDS.multiDay),
        realTime: section(LOBBY_PACE_KINDS.realTime)
    };
}

// A boot time of up to an hour is a real-time game; anything longer is multi-day (Past Games uses the same rule).
function lobbyGameKind(bootText) {
    var hours = durationHours(String(bootText || "").split(".")[0]);
    return hours !== null && hours <= 1 ? "realTime" : "multiDay";
}

// The multi-day games count is only shown in multi-day lobbies; real-time lobbies show real-time turns.
function lobbyPaceText(pace, kindName, long) {
    var kind = LOBBY_PACE_KINDS[kindName];
    var speed = pace[kindName];
    var label = kindName === "realTime" ? "real-time" : "multi-day";
    var parts = [];
    if (kindName === "multiDay" && pace.games !== null) {
        parts.push(long ? "in " + pace.games + " multi-day game" + (pace.games === 1 ? "" : "s") + ", per their profile" : "in " + pace.games + " game" + (pace.games === 1 ? "" : "s"));
    }
    if (speed.averageHours !== null) {
        parts.push(long ? "average " + label + " turn " + speed.average : "avg turn " + shortDuration(speed.average));
    }
    if (speed.slowPercent !== null) {
        parts.push(speed.slowPercent + "% " + (long ? "of their " + label + " turns " + kind.overLong : kind.over));
    }
    if (pace.bootedPercent !== null) {
        parts.push(long ? "booted from " + pace.bootedPercent + "% of their recent games" : "booted " + pace.bootedPercent + "%");
    }
    return parts.length ? parts.join(" · ") : "no " + label + " turns yet";
}

// war.app's game data has each player's name, ID and a 4-digit token; war.app builds profile links as
// the token's first two digits + ID + its last two. The data's field names are minified and change
// between war.app updates, so players are found by the names the lobby shows, and each possible link
// is tried largest ID first (the level is a small number too).
function lobbyProfileCandidates(root, names) {
    var found = {};
    var seen = new Set();
    var queue = [root];
    for (var visited = 0; queue.length && visited < 5000; visited++) {
        var object = queue.shift();
        if (!object || typeof object !== "object" || seen.has(object)) {
            continue;
        }
        seen.add(object);
        var keys = Object.keys(object);
        if (keys.length > 2000) {
            continue;
        }
        var name = null;
        var numbers = [];
        keys.forEach(function (key) {
            var value = object[key];
            if (typeof value === "string" && names.indexOf(value) !== -1) {
                name = value;
            } else if (typeof value === "number" && value > 0 && Math.floor(value) === value) {
                numbers.push(value);
            } else if (value && typeof value === "object") {
                queue.push(value);
            }
        });
        if (name) {
            var links = found[name] || (found[name] = []);
            numbers.filter(function (token) {
                return token >= 1000 && token <= 9999;
            }).forEach(function (token) {
                numbers.filter(function (id) {
                    return id !== token;
                }).forEach(function (id) {
                    var link = String(token).slice(0, 2) + id + String(token).slice(2);
                    if (links.indexOf(link) === -1) {
                        links.push(link);
                    }
                });
            });
            links.sort(function (a, b) {
                return b.length - a.length || (b < a ? -1 : b > a ? 1 : 0);
            });
        }
    }
    return found;
}

var LOBBY_BOOT_PERCENT_KEY = "tidyUpYourDashboard.lobbyBootPercent";

function lobbyBootLimit() {
    try {
        var value = parseFloat(localStorage.getItem(LOBBY_BOOT_PERCENT_KEY));
        return isNaN(value) ? 10 : Math.max(0, value);
    } catch (e) {
        return 10;
    }
}

// Why a player is flagged, if at all: their average turn is over the limit, or they're booted more often.
function lobbyPaceFlags(pace, kindName, turnLimit, bootLimit) {
    var kind = LOBBY_PACE_KINDS[kindName];
    var speed = pace[kindName];
    var flags = [];
    if (turnLimit > 0 && speed.averageHours !== null && speed.averageHours > turnLimit * kind.unitHours) {
        flags.push("average turn over " + turnLimit + " " + kind.unit);
    }
    if (bootLimit > 0 && pace.bootedPercent !== null && pace.bootedPercent > bootLimit) {
        flags.push("booted over " + bootLimit + "%");
    }
    return flags;
}

function lobbyPaceLimit(kindName) {
    var kind = LOBBY_PACE_KINDS[kindName];
    try {
        var value = parseFloat(localStorage.getItem(kind.key));
        return isNaN(value) ? kind.fallback : Math.max(0, value);
    } catch (e) {
        return kind.fallback;
    }
}

// In a lobby, each player gets a line with their pace from their profile, and the host can flag slow
// players to remove them with war.app's own Add/Remove Players. Nothing here changes the game.
function setupLobbyPace() {
    addCSS(`
        .tuydPace {
            position: absolute;
            bottom: 2px;
            overflow: hidden;
            color: #9a9a9a;
            font-size: 12px;
            line-height: 20px;
            text-overflow: ellipsis;
            white-space: nowrap;
            pointer-events: auto;
        }
        .tuydPace.tuydPaceSlow {
            color: #ff6b6b;
        }
        .tuydPaceLimit {
            position: absolute;
            white-space: nowrap;
            color: #9a9a9a;
            font-size: 12px;
            pointer-events: auto;
        }
        .tuydPaceLimit input {
            width: 48px;
            margin: 0 3px;
            border: 1px solid #555;
            border-radius: 3px;
            background: #111;
            color: #eee;
            font-size: 12px;
        }
    `);
    var paces = {};
    var pending = {};
    var kindName = "multiDay";
    var chosen = {};
    var timer = null;
    var rows = function () {
        return $("[id^='ujs_PlayerRow']").filter(function () {
            return /^ujs_PlayerRow(?:_\d+)?$/.test(this.id) && shownUjsElement(this);
        }).get().map(function (row) {
            var label = $(row).find("[id^='ujs_Player'] .ujsTextInner").filter(function () {
                return $(this).text().trim();
            }).first();
            return { element: row, name: label.text().trim() };
        }).filter(function (row) {
            return row.name;
        });
    };
    var profile = function (name, links) {
        if (pending[name] || paces[name]) {
            return;
        }
        pending[name] = true;
        var tryLink = function (i) {
            if (i >= links.length) {
                paces[name] = { missing: true };
                schedule();
                return;
            }
            $.ajax({ url: "/Profile?p=" + links[i], dataType: "text" }).done(function (html) {
                var doc = new DOMParser().parseFromString(html, "text/html");
                // A wrong link gives war.app's page without a player; a player's page is titled "Name - War.app".
                if ((doc.title || "").indexOf(name + " - ") !== 0) {
                    tryLink(i + 1);
                    return;
                }
                paces[name] = $.extend(parseProfilePace(doc), { link: links[i] });
                schedule();
            }).fail(function () {
                log("Player pace: couldn't read " + name + "'s profile");
                paces[name] = { missing: true };
                schedule();
            });
        };
        tryLink(0);
    };
    var draw = function () {
        timer = null;
        var lobby = rows();
        if (!lobby.length) {
            return;
        }
        var boot = $(".ujsTextInner").filter(function () {
            return /^Boot time:/i.test($(this).text().trim());
        }).first().text().trim();
        kindName = lobbyGameKind(boot.replace(/^Boot time:\s*/i, ""));
        var kind = LOBBY_PACE_KINDS[kindName];
        var limit = kindName in chosen ? chosen[kindName] : lobbyPaceLimit(kindName);
        var bootLimit = "boot" in chosen ? chosen.boot : lobbyBootLimit();
        var names = lobby.map(function (row) {
            return row.name;
        });
        var unknown = names.filter(function (name) {
            return !paces[name] && !pending[name];
        });
        if (unknown.length && window.UJS_Hooks && window.UJS_Hooks.za) {
            var candidates = lobbyProfileCandidates(window.UJS_Hooks.za, unknown);
            unknown.forEach(function (name) {
                if (candidates[name] && candidates[name].length) {
                    profile(name, candidates[name]);
                }
            });
        }
        var section = $(lobby[0].element).closest("[id^='ujs_PlayersSection']");
        var box = section.children("[id$='_img']")[0] || section[0];
        var right = box ? box.getBoundingClientRect().right - 14 : 0;
        // One column for all rows, right of the widest name, level or Nudge button.
        var column = 0;
        lobby.forEach(function (row) {
            var left = row.element.getBoundingClientRect().left;
            $(row.element).find("*").not(".tuydPace, .tuydPace *").each(function () {
                var rect = this.getBoundingClientRect();
                if (rect.width) {
                    column = Math.max(column, rect.right - left);
                }
            });
        });
        lobby.forEach(function (row) {
            var pace = paces[row.name];
            var line = $(row.element).children(".tuydPace");
            if (!pace || pace.missing) {
                line.remove();
                return;
            }
            if (!line.length) {
                line = $('<a class="tuydPace" target="_blank" rel="noopener"></a>').appendTo(row.element);
            }
            var flags = lobbyPaceFlags(pace, kindName, limit, bootLimit);
            var slow = flags.length > 0;
            var left = column + 16;
            var width = right - row.element.getBoundingClientRect().left - left;
            line.attr({ href: "/Profile?p=" + pace.link, title: lobbyPaceText(pace, kindName, true) + (slow ? ". Flagged: " + flags.join(", ") : "") + " (Muli's Userscript)" })
                .text((slow ? "⚠ " : "") + lobbyPaceText(pace, kindName)).toggleClass("tuydPaceSlow", slow)
                .css({ left: left, maxWidth: Math.max(0, width), display: width < 120 ? "none" : "" });
        });
        var heading = section.find(".ujsTextInner").filter(function () {
            return $(this).text().trim() === "Players";
        }).first().parent();
        if (heading.length) {
            var control = heading.children(".tuydPaceLimit");
            if (control.attr("data-kind") !== kindName) {
                control.remove();
                control = $('<label class="tuydPaceLimit">Flag: avg turn &gt;<input type="number" min="0" data-limit="turn"> <span></span>'
                    + ' · booted &gt;<input type="number" min="0" step="1" data-limit="boot"> %</label>').attr({
                    "data-kind": kindName,
                    title: "Players whose average " + (kindName === "realTime" ? "real-time" : "multi-day") + " turn is longer, or who are booted more often, are marked ⚠ (0 = off; Muli's Userscript)"
                }).appendTo(heading);
                control.find("[data-limit=turn]").attr("step", kind.step).val(limit);
                control.find("[data-limit=boot]").val(bootLimit);
                control.find("span").text(kind.unit);
            }
            // war.app's text holders are zero-size anchors; the control goes at the right end of the heading's text box.
            var anchor = heading[0].getBoundingClientRect();
            var title = heading.children(".ujsTextInner")[0];
            if (title) {
                var box = title.getBoundingClientRect();
                control.css({ left: box.right - anchor.left - control.outerWidth() - 10, top: box.top - anchor.top + (box.height - control.outerHeight()) / 2 });
            }
        }
    };
    var schedule = function () {
        if (!timer) {
            timer = setTimeout(draw, 300);
        }
    };
    $(document).on("change input", ".tuydPaceLimit input", function () {
        var value = parseFloat(this.value);
        var boot = $(this).attr("data-limit") === "boot";
        var name = boot ? "boot" : $(this).closest(".tuydPaceLimit").attr("data-kind") || kindName;
        chosen[name] = isNaN(value) ? 0 : Math.max(0, value);
        try {
            localStorage.setItem(boot ? LOBBY_BOOT_PERCENT_KEY : LOBBY_PACE_KINDS[name].key, String(chosen[name]));
        } catch (e) {
            // A blocked localStorage only means the limit isn't remembered.
        }
        schedule();
    });
    new MutationObserver(function (mutations) {
        var ours = mutations.every(function (mutation) {
            return $(mutation.target).closest(".tuydPace, .tuydPaceLimit").length || Array.prototype.every.call(mutation.addedNodes, function (node) {
                return $(node).is(".tuydPace, .tuydPaceLimit");
            }) && mutation.addedNodes.length;
        });
        if (!ours) {
            schedule();
        }
    }).observe(document.body, { childList: true, subtree: true });
    $(window).on("resize", schedule);
    schedule();
}

// A game's chat on the dashboard: the game loads in a hidden frame, its chat is opened there, and the
// panel shows that chat and writes through the game's own chat box and Send button. war.app sends a
// game's chat only over the game's own connection, so there's nothing lighter to load.
function setupDashboardGameChat() {
    var table = document.getElementById("MyGamesTable");
    if (!table) {
        return;
    }
    addCSS(`
        .tuydHasGameChat {
            position: relative;
        }
        .tuydGameChatCorner {
            position: absolute;
            right: 6px;
            bottom: 6px;
            z-index: 2;
            line-height: 16px;
            pointer-events: auto;
        }
        .tuydGameChatBtn {
            display: inline-block;
            padding: 1px 6px;
            border: 1px solid #555;
            border-radius: 3px;
            background: rgba(0, 0, 0, 0.55);
            color: #ddd !important;
            font-size: 12px;
            text-decoration: none !important;
        }
        .tuydGameChatBtn:hover, .tuydGameChatBtn.tuydActive {
            border-color: #e0c060;
            color: #fff !important;
        }
        #tuydGameChat {
            position: fixed;
            right: 16px;
            bottom: 16px;
            z-index: 1040;
            display: flex;
            flex-direction: column;
            width: 380px;
            max-width: calc(100vw - 32px);
            height: min(520px, calc(100vh - 96px));
            border: 1px solid #555;
            border-radius: 6px;
            background: #1b1b1b;
            color: #ddd;
            font-size: 13px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
        }
        #tuydGameChat .tuydGameChatHead {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-bottom: 1px solid #333;
        }
        #tuydGameChat .tuydGameChatTitle {
            flex: 1;
            overflow: hidden;
            color: #fff;
            font-weight: bold;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        #tuydGameChat .tuydGameChatClose {
            color: #aaa;
            font-size: 16px;
            text-decoration: none;
        }
        #tuydGameChat .tuydGameChatTabs {
            display: flex;
            gap: 6px;
            padding: 6px 10px 0;
        }
        #tuydGameChat .tuydGameChatTab {
            padding: 1px 10px;
            border: 1px solid #444;
            border-radius: 3px;
            color: #aaa;
            text-decoration: none;
        }
        #tuydGameChat .tuydGameChatTab.tuydActive {
            border-color: #e0c060;
            color: #fff;
        }
        #tuydGameChat .tuydGameChatList {
            flex: 1;
            overflow-y: auto;
            padding: 6px 10px;
        }
        #tuydGameChat .tuydGameChatMsg {
            margin: 0 0 7px;
        }
        #tuydGameChat .tuydGameChatName {
            color: #fff;
            font-weight: bold;
        }
        #tuydGameChat .tuydGameChatMore {
            margin: 0 0 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #333;
            color: #8d8d8d;
            font-size: 12px;
        }
        #tuydGameChat .tuydGameChatTime, #tuydGameChat .tuydGameChatNote, #tuydGameChat .tuydGameChatMutedMsg {
            color: #8d8d8d;
            font-size: 11px;
        }
        #tuydGameChat .tuydGameChatText {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
        #tuydGameChat .tuydGameChatStatus {
            padding: 4px 10px;
            color: #8d8d8d;
        }
        #tuydGameChat .tuydGameChatForm {
            display: flex;
            gap: 6px;
            padding: 8px 10px;
            border-top: 1px solid #333;
        }
        #tuydGameChat .tuydGameChatInput {
            flex: 1;
            min-height: 38px;
            resize: vertical;
            border: 1px solid #555;
            border-radius: 4px;
            background: #111;
            color: #eee;
            font: inherit;
        }
        #tuydGameChatFrame {
            position: fixed;
            left: -10000px;
            top: 0;
            width: 1000px;
            height: 800px;
            border: 0;
        }
    `);
    var panel = null;
    var frame = null;
    var game = null;
    var tabName = "public";
    var waitTimer = null;
    var renderTimer = null;
    var observer = null;
    var lastHtml = "";
    var muted = [];
    var limit = GAME_CHAT_RECENT;
    var olderTimer = null;
    readMutedPlayers(function (names) {
        muted = names;
    });
    var frameDoc = function () {
        try {
            return frame && frame.contentDocument;
        } catch (e) {
            return null;
        }
    };
    var frameQuery = function () {
        try {
            return frame && frame.contentWindow && frame.contentWindow.$;
        } catch (e) {
            return null;
        }
    };
    var status = function (text) {
        panel.find(".tuydGameChatStatus").text(text || "").toggle(!!text);
    };
    var close = function () {
        clearInterval(waitTimer);
        clearInterval(olderTimer);
        clearTimeout(renderTimer);
        waitTimer = renderTimer = olderTimer = null;
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        $(frame).remove();
        $(panel).remove();
        frame = panel = game = null;
        lastHtml = "";
        $(".tuydGameChatBtn.tuydActive").removeClass("tuydActive");
    };
    var render = function (toBottom) {
        var doc = frameDoc();
        if (!panel || !doc) {
            return;
        }
        var state = gameChatFrameState(doc);
        if (!state.hasTeam) {
            tabName = "public";
        }
        panel.find(".tuydGameChatTabs").toggle(state.hasTeam);
        panel.find(".tuydGameChatTab").each(function () {
            $(this).toggleClass("tuydActive", $(this).attr("data-tab") === tabName);
        });
        var current = state[tabName];
        var list = panel.find(".tuydGameChatList")[0];
        var html = renderGameChatMessages(current.messages, muted, limit, limit !== Infinity && !!current.older);
        if (html !== lastHtml) {
            // Older messages arrive above, so a reader scrolled up keeps their place.
            var fromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
            list.innerHTML = html;
            lastHtml = html;
            list.scrollTop = toBottom || fromBottom < 40 ? list.scrollHeight : list.scrollHeight - list.clientHeight - fromBottom;
        }
        panel.find(".tuydGameChatForm").toggle(current.canSend);
        status(olderTimer ? "Loading older messages…" : current.canSend ? "" : state.archived ? "This game's chat is archived." : "Read only: you can't write in this chat.");
    };
    // war.app keeps older messages behind "Load Older Messages"; pressed until it goes away or adds nothing.
    var showAll = function () {
        limit = Infinity;
        lastHtml = "";
        clearInterval(olderTimer);
        var presses = 0;
        var lastSize = -1;
        var idle = 0;
        var stop = function () {
            clearInterval(olderTimer);
            olderTimer = null;
            render(false);
        };
        olderTimer = setInterval(function () {
            var doc = frameDoc();
            var query = frameQuery();
            if (!panel || !doc || !query) {
                stop();
                return;
            }
            var current = gameChatFrameState(doc)[tabName];
            if (!current.older || presses >= 30) {
                stop();
            } else if (current.messages.length !== lastSize) {
                lastSize = current.messages.length;
                idle = 0;
                presses++;
                query("#" + current.older + "_btn").trigger("click");
            } else if (++idle > 4) {
                stop();
            }
        }, 1500);
        render(false);
    };
    var schedule = function () {
        if (!renderTimer) {
            renderTimer = setTimeout(function () {
                renderTimer = null;
                render(false);
            }, 300);
        }
    };
    var open = function (target, button) {
        close();
        game = target;
        tabName = "public";
        limit = GAME_CHAT_RECENT;
        panel = $('<div id="tuydGameChat" role="dialog" aria-label="Game chat"><div class="tuydGameChatHead"><a class="tuydGameChatTitle"></a>'
            + '<a class="tuydGameChatOpen" href="#">Open game</a><a class="tuydGameChatClose" href="#" title="Close">✕</a></div>'
            + '<div class="tuydGameChatTabs" style="display: none"><a href="#" class="tuydGameChatTab" data-tab="public">Public</a><a href="#" class="tuydGameChatTab" data-tab="team">Team</a></div>'
            + '<div class="tuydGameChatList"></div><div class="tuydGameChatStatus"></div>'
            + '<div class="tuydGameChatForm" style="display: none"><textarea class="tuydGameChatInput" rows="2" placeholder="Message (Enter sends, Shift+Enter for a new line)"></textarea>'
            + '<button type="button" class="btn btn-primary btn-sm tuydGameChatSend">Send</button></div></div>').appendTo("body");
        var url = "/MultiPlayer?GameID=" + encodeURIComponent(target.id);
        panel.find(".tuydGameChatTitle, .tuydGameChatOpen").attr("href", url);
        panel.find(".tuydGameChatTitle").text(target.name || "Game").attr("title", target.name || "");
        status("Loading the game…");
        $(button).addClass("tuydActive");
        frame = $('<iframe tabindex="-1" aria-hidden="true"></iframe>').attr({ id: GAME_CHAT_FRAME_ID, src: url }).appendTo("body")[0];
        var started = Date.now();
        var clicked = 0;
        waitTimer = setInterval(function () {
            var doc = frameDoc();
            var query = frameQuery();
            var state = doc && query ? gameChatFrameState(doc) : null;
            if (!state || !state.ready) {
                if (Date.now() - started > 60000) {
                    clearInterval(waitTimer);
                    waitTimer = null;
                    status("The game didn't load here. Open it instead.");
                }
                return;
            }
            // The chat starts closed; it's clicked again only while it's still closed, so it can't toggle shut.
            if (!state.open) {
                if (Date.now() - clicked > 2500) {
                    clicked = Date.now();
                    query("#ujs_ChatCollapseButton_btn").trigger("click");
                }
                return;
            }
            clearInterval(waitTimer);
            waitTimer = null;
            observer = new MutationObserver(schedule);
            observer.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style"] });
            render(true);
        }, 500);
    };
    var send = function () {
        var box = panel.find(".tuydGameChatInput");
        var text = box.val().trim();
        var doc = frameDoc();
        var query = frameQuery();
        if (!text || !doc || !query) {
            return;
        }
        var suffix = tabName === "team" ? "_2" : "";
        var input = doc.getElementById("ujs_SendChatInput" + suffix + "_input");
        if (!input) {
            status("Couldn't find the game's chat box. Open the game to write.");
            return;
        }
        input.value = text;
        input.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
        query("#ujs_SendChatButton" + suffix + "_btn").trigger("click");
        box.prop("disabled", true);
        var tries = 0;
        var check = setInterval(function () {
            if (!panel) {
                clearInterval(check);
                return;
            }
            if (!input.value) {
                clearInterval(check);
                box.val("").prop("disabled", false).focus();
                status("");
            } else if (++tries > 15) {
                clearInterval(check);
                box.prop("disabled", false);
                status("Not sent. Open the game and send it there.");
            }
        }, 300);
    };
    var mark = function () {
        myGamesChatTargets().forEach(function (target) {
            var cell = $(target.cell);
            var corner = cell.children(".tuydGameChatCorner");
            if (corner.attr("data-game-id") === target.id) {
                return;
            }
            corner.remove();
            cell.addClass("tuydHasGameChat").append('<span class="tuydGameChatCorner" data-game-id="' + htmlEscape(target.id) + '">'
                + '<a href="#" class="tuydGameChatBtn' + (game && game.id === target.id ? " tuydActive" : "") + '" title="Read and write this game\'s chat here (Muli\'s Userscript)">💬 Chat</a></span>');
        });
    };
    var tableObserver = new MutationObserver(function () {
        apply();
    });
    var apply = function () {
        tableObserver.disconnect();
        mark();
        tableObserver.observe(table, { childList: true, subtree: true });
    };
    apply();
    $(document).on("tuyd:gamesRefreshed", function (e, selector) {
        if (selector === "#MyGamesTable") {
            apply();
        }
    });
    $(document).on("click", ".tuydGameChatBtn", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var id = $(this).closest(".tuydGameChatCorner").attr("data-game-id");
        if (game && game.id === id) {
            close();
            return;
        }
        var target = myGamesChatTargets().filter(function (candidate) {
            return candidate.id === id;
        })[0];
        if (target) {
            open(target, this);
        }
    }).on("click", "#tuydGameChat .tuydGameChatClose", function (event) {
        event.preventDefault();
        close();
    }).on("click", "#tuydGameChat .tuydGameChatTab", function (event) {
        event.preventDefault();
        tabName = $(this).attr("data-tab");
        limit = GAME_CHAT_RECENT;
        clearInterval(olderTimer);
        olderTimer = null;
        var query = frameQuery();
        if (query) {
            query(tabName === "team" ? "#ujs_TeamChatTab_btn" : "#ujs_PublicChatTab_btn").trigger("click");
        }
        lastHtml = "";
        render(true);
    }).on("click", "#tuydGameChat .tuydGameChatShowAll", function (event) {
        event.preventDefault();
        showAll();
    }).on("click", "#tuydGameChat .tuydGameChatSend", function () {
        send();
    }).on("keydown", "#tuydGameChat .tuydGameChatInput", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
        } else if (event.key === "Escape") {
            close();
        }
    });
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

function pageIsClanPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/Clans\/?\?(?:[^#]*&)?ID=\d+/i);
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

function pageIsChatRoom() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/?\?(?:[^#]*&)?ChatRoom=/i);
}

function pageIsQuickmatch() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/?\?(?:[^#]*&)?Quickmatch=/i);
}

function pageIsPlayerSearch() {
    return location.href.match(/^https?:\/\/[^\/]+\/Community\/PlayerSearch(?:[?#].*)?$/i);
}

function pageIsPastGames() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/PastGames(?:[?#].*)?$/i);
}

function pageIsIdle() {
    return location.href.match(/^https?:\/\/[^\/]+\/Idle(?:[\/?#].*)?$/i);
}

function pageIsMyMail() {
    return location.href.match(/^https?:\/\/[^\/]+\/Discussion\/MyMail(?:[?#].*)?$/i);
}

function pageIsBlacklistPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/ManageBl(?:ack|ock)List.*/i);
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
        var game = match && games[match[1]];
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

// The badge shows the series' short name; the full label is its tooltip.
function renderEventBadge(game) {
    var label = String(game.label || "");
    var series = String(game.series || "");
    var full = series && label.toLowerCase().indexOf(series.toLowerCase()) === -1 ? series + " · " + label : label || series;
    var text = { "AWP World Tour": "AWP Tour" }[series] || series || label;
    return '<a class="tuydEventBadge' + (game.source === "awp" ? " tuydEventBadgeAwp" : "") + '" target="_blank" rel="noopener" data-game-id="' + htmlEscape(game.game_id) + '" href="' + htmlEscape(safeUrl(game.url)) + '" title="' + htmlEscape(full) + '">' + htmlEscape(text) + '</a>';
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

function signedInPlayerId() {
    var result = $.Deferred();
    playerDataReady.done(function (player) {
        result.resolve(player && player.PlayerId ? String(player.PlayerId) : null);
    }).fail(function () {
        result.resolve(null);
    });
    return result.promise();
}

// war.app draws the Ladders page client-side, in a 600px viewport that clips what overflows it. The
// panel sits in the full-width area around that viewport instead, below the ladders dialog, so on a
// wide window its two lists (players, clans) go side by side; its rows scroll when the window is short.
var LADDER_FRIENDS_PER_PAGE = 40;

// A friend row of war.app's team ladder proposal: "Select L64 Swisster", or "Locked …" for a friend who
// hasn't unlocked the ladder yet.
function ladderFriendFromRow(text) {
    var match = /^(Select|Locked)?\s*L(\d+)\s+(.+)$/.exec(String(text || "").replace(/\s+/g, " ").trim());
    return match ? { name: match[3], level: Number(match[2]), locked: match[1] === "Locked" } : null;
}

// The friends whose name has the search in it, best match first (as Player Search orders them).
function ladderFriendMatches(friends, query) {
    query = String(query || "").trim();
    if (!query) {
        return [];
    }
    return friends.filter(function (friend) {
        return playerSearchMatch(friend.name, query) < 3;
    }).sort(function (a, b) {
        return playerSearchMatch(a.name, query) - playerSearchMatch(b.name, query) || b.level - a.level || a.name.localeCompare(b.name);
    });
}

// "Friends 41 - 80 of 98" on war.app's pager: the first friend shown, and how many there are.
function ladderFriendsPagerState(text) {
    var match = /(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/.exec(String(text || ""));
    return match ? { first: Number(match[1]), last: Number(match[2]), total: Number(match[3]) } : null;
}

// war.app's GetFriends answer (hex, in war.app's binary format), as the friends in the order war.app
// lists them. Each friend's level and name sit between two dates: a date ending in byte 0x42, the level
// as a 4-byte number, 0x01 and the name with its length, then another date (or, when there's none,
// -MaxValue or a far-past date, ending in 0xC1 or 0xC2). Nothing else in the answer looks like that; if war.app changes its format, this finds nobody
// and the search reads war.app's pages instead.
function parseFriendsList(hex) {
    hex = String(hex || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
        return [];
    }
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    var decoder = new TextDecoder("utf-8", { fatal: true });
    var date = function (p) {
        if (p + 8 > bytes.length) {
            return false;
        }
        var none = [255, 255, 255, 255, 255, 255, 239, 255].every(function (value, k) {
            return bytes[p + k] === value;
        });
        return none || [0x41, 0x42, 0xC1, 0xC2].indexOf(bytes[p + 7]) !== -1;
    };
    var friends = [];
    for (var p = 8; p + 6 < bytes.length; p++) {
        var level = bytes[p] | bytes[p + 1] << 8 | bytes[p + 2] << 16 | bytes[p + 3] << 24;
        if (bytes[p - 1] !== 0x42 || level < 1 || level > 100 || bytes[p + 4] !== 1) {
            continue;
        }
        var length = bytes[p + 5];
        var start = p + 6;
        if (length < 1 || length > 60 || start + length > bytes.length || !date(start + length)) {
            continue;
        }
        var name;
        try {
            name = decoder.decode(bytes.subarray(start, start + length));
        } catch (e) {
            continue;
        }
        friends.push({ name: name, level: level });
        p = start + length + 7;
    }
    return friends;
}

// Calls back with the text of each answer war.app gets from one of its services (Services?m=Name).
function watchServiceAnswers(service, callback) {
    var open = XMLHttpRequest.prototype.open;
    var pattern = new RegExp("[?&]m=" + service + "\\b");
    XMLHttpRequest.prototype.open = function (method, url) {
        if (pattern.test(String(url))) {
            this.addEventListener("load", function () {
                try {
                    callback(this.responseText);
                } catch (e) {
                    log(service + ": " + e);
                }
            });
        }
        return open.apply(this, arguments);
    };
}

// The friends a proposal lists, with their pages: war.app's list without you and anyone already in the
// proposal, 40 a page.
function ladderFriendsFromList(list, me, selected) {
    return list.filter(function (friend) {
        return friend.name !== me && selected.indexOf(friend.name) === -1;
    }).map(function (friend, i) {
        return { name: friend.name, level: friend.level, locked: false, page: Math.floor(i / LADDER_FRIENDS_PER_PAGE) + 1 };
    });
}

// war.app's team ladder proposal shows your friends 40 at a time. A search box beside "Friends" reads
// every page once, by stepping through war.app's own pager, lists the matches, and opens a match's page;
// its Select is war.app's own Select button, which only adds the friend to the proposal.
function setupLadderFriendSearch() {
    addCSS(`
        .tuydFriendSearch {
            position: absolute;
            z-index: 5;
            width: 220px;
            pointer-events: auto;
            font-size: 13px;
        }
        .tuydFriendSearch input {
            width: 100%;
            box-sizing: border-box;
            padding: 2px 6px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #111;
            color: #eee;
        }
        .tuydFriendSearch .tuydFriendResults {
            margin-top: 2px;
            max-height: 260px;
            overflow-y: auto;
            border: 1px solid #555;
            border-radius: 4px;
            background: #1b1b1b;
            color: #ddd;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
        }
        .tuydFriendSearch .tuydFriendResult {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 3px 8px;
            cursor: pointer;
        }
        .tuydFriendSearch .tuydFriendResult:hover {
            background: #333;
        }
        .tuydFriendSearch .tuydFriendLevel {
            color: #e0c060;
        }
        .tuydFriendSearch .tuydFriendNote, .tuydFriendSearch .tuydFriendPage {
            color: #8d8d8d;
            font-size: 11px;
        }
        .tuydFriendSearch .tuydFriendPage {
            margin-left: auto;
        }
        /* war.app's row is a zero-size anchor, so its name and Select button are what light up. */
        .tuydFriendFound .ujsTextInner {
            color: #e0c060 !important;
        }
        .tuydFriendFound .ujsBtnInner {
            outline: 2px solid #e0c060;
            outline-offset: 1px;
        }
    `);
    var index = null;
    var reading = false;
    var timer = null;
    // war.app downloads your whole friend list when the proposal opens; the search reads that answer, so
    // it doesn't have to step through the pages. Kept only while this page is open.
    var friendList = [];
    var me = "";
    watchServiceAnswers("GetFriends", function (text) {
        friendList = parseFriendsList(text);
    });
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            me = player && player.Name || "";
        });
    }
    var parts = function () {
        var scene = ujsElement("CreateLadderProposalScene");
        if (!scene || !shownUjsElement(scene)) {
            return null;
        }
        var container = $(scene).find("[id^='ujs_FriendsContainer']").first();
        var pager = $(scene).find("[id^='ujs_FriendsPager']").first();
        var heading = $(scene).find("[id^='ujs_FriendsSection'] [id^='ujs_HeaderText']").filter(function () {
            return !/_tmp$/.test(this.id);
        }).first();
        return container.length && pager.length ? { scene: scene, container: container, pager: pager, heading: heading } : null;
    };
    var rows = function (found) {
        return found.container.children().get().map(function (element) {
            var friend = ladderFriendFromRow($(element).text());
            return friend ? $.extend(friend, { element: element }) : null;
        }).filter(Boolean);
    };
    // Only the pager's label: its page buttons ("1 2 3") would otherwise run into the count ("of 98123").
    var pagerState = function (found) {
        var label = found.pager.find(".ujsTextInner").filter(function () {
            return /\bof\s+\d+\s*$/.test($(this).text());
        }).first();
        return ladderFriendsPagerState(label.text());
    };
    // Clicks the pager button with this label, then waits until war.app shows the new page.
    var press = function (found, label) {
        var before = found.pager.text();
        var button = found.pager.find("a.ujsBtnInner").filter(function () {
            return $(this).parent().text().trim() === label;
        }).first();
        if (!button.length) {
            return $.Deferred().reject().promise();
        }
        button.trigger("click");
        var done = $.Deferred();
        var started = Date.now();
        var wait = setInterval(function () {
            if (found.pager.text() !== before || Date.now() - started > 3000) {
                clearInterval(wait);
                done.resolve();
            }
        }, 50);
        return done.promise();
    };
    // war.app pages the friends 40 at a time (the last page has fewer).
    var pageOf = function (state) {
        return state ? Math.floor((state.first - 1) / LADDER_FRIENDS_PER_PAGE) + 1 : 1;
    };
    var goTo = function (found, page) {
        var state = pagerState(found);
        var current = pageOf(state);
        if (!state || current === page) {
            return $.Deferred().resolve().promise();
        }
        var label = String(page);
        var direct = found.pager.find("a.ujsBtnInner").filter(function () {
            return $(this).parent().text().trim() === label;
        }).length;
        return press(found, direct ? label : page > current ? "Next >>" : "<< Prev").then(function () {
            return goTo(found, page);
        });
    };
    // Every friend, with the page they're on; the pager is put back on the page you were looking at.
    var readAll = function (found, status) {
        var state = pagerState(found);
        var start = pageOf(state);
        var pages = state ? Math.max(1, Math.ceil(state.total / LADDER_FRIENDS_PER_PAGE)) : 1;
        var friends = [];
        var step = function (page) {
            status("Reading your friends: page " + page + " of " + pages);
            return goTo(found, page).then(function () {
                rows(found).forEach(function (friend) {
                    friends.push({ name: friend.name, level: friend.level, locked: friend.locked, page: page });
                });
                return page < pages ? step(page + 1) : null;
            });
        };
        return step(1).then(function () {
            return goTo(found, start);
        }).then(function () {
            return { total: state ? state.total : friends.length, friends: friends };
        });
    };
    // war.app's heading is a zero-size anchor and its text box only as wide as "Friends"; the box goes at the
    // right end of the Friends panel, level with the heading.
    var place = function (found, box) {
        var title = found.heading.children(".ujsTextInner")[0];
        var panel = $(found.scene).find("[id^='ujs_FriendsSection'] [id^='ujs_DialogBackgroundForDropShadow'][id$='_img']")[0];
        if (!title || !panel) {
            return;
        }
        var anchor = found.heading[0].getBoundingClientRect();
        var rect = title.getBoundingClientRect();
        box.css({ left: panel.getBoundingClientRect().right - anchor.left - box.outerWidth() - 12, top: rect.top - anchor.top + (rect.height - box.children("input").outerHeight()) / 2 });
    };
    var show = function (found, box) {
        var list = box.children(".tuydFriendResults").empty();
        var query = box.children("input").val();
        if (!String(query || "").trim()) {
            list.hide();
            return;
        }
        var state = pagerState(found);
        if (index && state && index.total !== state.total) {
            index = null;
        }
        // From war.app's list when it matches what the pager counts; otherwise by reading the pages.
        if (!index && friendList.length && state) {
            var selected = $(found.scene).find("[id^='ujs_SelectedPlayersContainer']").children().get().map(function (element) {
                var match = /L\d+\s+(.+)$/.exec($(element).text().replace(/\s+/g, " ").trim());
                return match ? match[1] : "";
            });
            var fromList = ladderFriendsFromList(friendList, me, selected);
            if (fromList.length === state.total) {
                index = { total: state.total, friends: fromList };
            }
        }
        if (!index) {
            if (!reading) {
                reading = true;
                var status = function (text) {
                    list.show().empty().append($('<div class="tuydFriendResult tuydFriendNote"></div>').text(text));
                };
                readAll(found, status).done(function (result) {
                    index = result;
                }).always(function () {
                    reading = false;
                    show(found, box);
                });
            }
            return;
        }
        var matches = ladderFriendMatches(index.friends, query);
        list.show();
        if (!matches.length) {
            list.append($('<div class="tuydFriendResult tuydFriendNote"></div>').text("No friend matches \"" + query + "\""));
            return;
        }
        matches.slice(0, 30).forEach(function (friend) {
            var item = $('<div class="tuydFriendResult"></div>').data("friend", friend);
            item.append($('<span class="tuydFriendLevel"></span>').text("L" + friend.level), $("<span></span>").text(friend.name));
            if (friend.locked) {
                item.append($('<span class="tuydFriendNote"></span>').text("locked"));
            }
            item.append($('<span class="tuydFriendPage"></span>').text("page " + friend.page));
            list.append(item);
        });
    };
    var check = function () {
        timer = null;
        var found = parts();
        if (!found || !found.heading.length) {
            return;
        }
        var box = found.heading.children(".tuydFriendSearch");
        if (!box.length) {
            box = $('<div class="tuydFriendSearch"><input type="search" placeholder="Search your friends" title="Searches all pages of your friends (Muli\'s Userscript)"><div class="tuydFriendResults" style="display: none"></div></div>')
                .appendTo(found.heading);
            box.children("input").on("input", function () {
                show(found, box);
            }).on("keydown", function (event) {
                event.stopPropagation();
            });
            box.on("click", ".tuydFriendResult", function () {
                var friend = $(this).data("friend");
                if (!friend) {
                    return;
                }
                box.children(".tuydFriendResults").hide();
                goTo(found, friend.page).done(function () {
                    var row = rows(found).filter(function (candidate) {
                        return candidate.name === friend.name;
                    })[0];
                    if (row) {
                        $(".tuydFriendFound").removeClass("tuydFriendFound");
                        $(row.element).addClass("tuydFriendFound");
                        row.element.scrollIntoView({ block: "center" });
                    }
                });
            });
        }
        place(found, box);
    };
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 300);
        }
    }).observe(document.body, { childList: true, subtree: true });
    check();
}

function setupCommunityLadders() {
    var rows = null;
    var community = null;
    var observer = null;
    // Opening one of war.app's ladders hides the Ladders view and changes the address (/LadderSeasons)
    // without loading a page; the panel, which sits outside that view, goes with it and comes back after.
    var hide = function () {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
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
        var art = warappArt(scene);
        Object.keys(art).forEach(function (name) {
            if (art[name]) {
                panel[0].style.setProperty(name, art[name]);
            }
        });
        var holder = $("#UjsCanvasHolder");
        (holder.length ? holder : dialog.parent().parent()).append(panel);
        fitCommunityLadders(panel, dialog);
        // war.app re-lays out the dialog shortly after a resize, so follow the dialog and the page area.
        if (window.ResizeObserver) {
            observer = new ResizeObserver(function () {
                fitCommunityLadders(panel, dialog);
            });
            observer.observe(dialog[0]);
            observer.observe(panel.parent()[0]);
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
            inClanSeriesOrder(data.series).forEach(function (series) {
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

// Two columns need about 940px; below that the panel takes the dialog's width and its lists stack.
function fitCommunityLadders(panel, dialog) {
    var box = dialog[0].getBoundingClientRect();
    var viewport = panel.closest("[id^='ujs_Viewport']");
    if (viewport.length) {
        panel.css("width", box.width + "px");
    } else {
        var area = panel.parent()[0].getBoundingClientRect();
        var room = area.width - 32;
        var width = room >= 940 ? Math.min(room, 1040) : box.width;
        var left = Math.max(0, Math.min(box.left - area.left + (box.width - width) / 2, area.width - width));
        panel.css({ width: width + "px", left: Math.round(left) + "px", top: Math.round(box.bottom - area.top + 10) + "px" });
    }
    var bottom = viewport.length ? viewport[0].getBoundingClientRect().bottom : Math.min(window.innerHeight, panel.parent()[0].getBoundingClientRect().bottom);
    var list = panel.find(".communityLaddersRows");
    var room = bottom - list[0].getBoundingClientRect().top - panel.find(".communityLaddersCredit").outerHeight() - 20;
    list.css("max-height", Math.max(66, room) + "px");
}

// The panels wear war.app's own dialog, row and button art, found by file name on the page so they
// follow war.app's updates. Their buttons use war.app's blue tint instead of its green, so the
// panels read as additions; war.app's CDN serves only the tints the game itself uses.
function warappArt(scene) {
    var sources = $(scene).find("[id$='_img']").map(function () {
        var value = $(this).css("border-image-source") || "";
        return /^url\(/.test(value) ? value : null;
    }).get();
    var find = function (pattern) {
        return sources.filter(function (value) {
            return pattern.test(value);
        })[0] || "";
    };
    var button = find(/UIButton-[0-9A-Fa-f]{6}\.png/);
    return {
        "--tuyd-dialog": find(/\/DialogBacking\.png/),
        "--tuyd-row": find(/\/DialogForeground\.png/),
        "--tuyd-button": button.replace(/UIButton-[0-9A-Fa-f]{6}/, "UIButton-242D9A")
    };
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
    return '<div id="communityLadders" class="tuydCommunityPanel"><h3>Community ladders &amp; leagues</h3><div class="communityLaddersRows">' +
        section("Players", rows.players) + section("Clans &amp; nations", rows.clans) +
        '</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

// statusHtml, detailHtml and youHtml must already be escaped.
function communityLadderRow(row) {
    return '<div class="communityLadder"><a class="communityLadderButton" target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(row.url)) + '">' + htmlEscape(row.name) + '</a>' +
        '<div class="communityLadderText">' +
        (row.statusHtml ? '<div class="tuydMuted">' + row.statusHtml + '</div>' : "") +
        (row.detailHtml ? '<div>' + row.detailHtml + '</div>' : "") +
        (row.youHtml ? '<div class="communityLadderYou">' + row.youHtml + '</div>' : "") + '</div></div>';
}

// Resolves with the AWP ranking and the custom.wl-stats.com series, each left empty when its site
// can't be reached, so one being down doesn't hide the other.
function settleRequest(request, what) {
    var settled = $.Deferred();
    request.done(function (data) {
        settled.resolve(data);
    }).fail(function (xhr) {
        log("Error loading " + what + ": " + (xhr && xhr.statusText));
        settled.resolve(null);
    });
    return settled.promise();
}

function loadCommunityData() {
    var result = $.Deferred();
    signedInPlayerId().done(function (playerId) {
        $.when(
            settleRequest(fetchWlStats(AWP_SITE + "/api/v1/rankings"), "the AWP World Tour rankings"),
            settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/series" + (playerId ? "?player=" + playerId : ""), SERIES_CACHE_MS), "the custom.wl-stats.com series")
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
    var lines = /^AWP World Tour/i.test(title) ? awpEventLines(community) : seriesEventLines(title, community);
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
        { name: "Search your friends in a team ladder proposal", section: "Community", run: setupLadderFriendSearch },
        { name: "Your standing on Community Events", section: "Community", run: setupCommunityEventsStanding },
        { name: "Community event standings on clan pages", section: "Clans", run: setupClanStandings },
        { name: "Sortable Common Games table", section: "Other", match: pageIsCommonGames, run: setupCommonGamesDataTable },
        { name: "Clan list search", section: "Clans", match: pageIsClanList, run: setupClanListSearch },
        { name: "Map search", section: "Maps & levels", match: pageIsMapsPage, run: setupMapSearch },
        { name: "Level bookmark link", section: "Maps & levels", match: pageIsLevelOverview, run: setupLevelBookmark },
        { name: "Collapse blank lines", section: "Profile", match: pageIsProfile, run: hideExtraBlanks },
        { name: "Trophies", section: "Profile", match: pageIsProfile, run: displayTrophies },
        { name: "Collapsible stat sections", section: "Profile", match: pageIsProfile, run: foldProfileStats },
        { name: "AWP World Tour stats", section: "Profile", match: pageIsProfile, run: setupAwpProfileStats },
        { name: "custom.wl-stats.com stats", section: "Profile", match: pageIsProfile, run: setupCustomProfileStats },
        { name: "Sort and filter player search results", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchSort },
        { name: "Tags on players in search results", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchTags },
        { name: "Open a pasted profile link from player search", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchShortcuts },
        { name: "Your rank next to your rating on Quickmatch leaderboards", section: "Community", match: pageIsQuickmatch, run: setupLeaderboardRank },
        { name: "Load the whole chat in games", section: "Games", match: pageIsGame, run: setupFullGameChat },
        { name: "Player pace in game lobbies", section: "Games", match: pageIsGame, run: setupLobbyPace },
        { name: "Private chat list: players still in the game first", section: "Games", match: pageIsGame, run: setupPrivateChatList },
        { name: "Idle volume slider", section: "Idle", match: pageIsIdle, run: setupIdleVolume },
        { name: "Log of Idle's pop-ups", section: "Idle", match: pageIsIdle, run: setupIdlePopupLog },
        { name: "Check big market purchases in Idle", section: "Idle", match: pageIsIdle, run: setupIdleMarketCheck },
        { name: "Confirm before using powers and artifacts in Idle", section: "Idle", match: pageIsIdle, run: setupIdleActionConfirm },
        { name: "Better artifact copies and an artifact list in Idle", section: "Idle", match: pageIsIdle, run: setupIdleArtifactHelpers },
        { name: "Warn when Idle is open in another tab", section: "Idle", match: pageIsIdle, run: setupIdleTabWarning },
        { name: "Time to afford and best army camp in Idle", section: "Idle", match: pageIsIdle, run: setupIdleUpgradeHints },
        { name: "What a tech is missing and its market cost in Idle", section: "Idle", match: pageIsIdle, run: setupIdleTechCost },
        { name: "Count of things Idle needs you for in the tab title", section: "Idle", match: pageIsIdle, run: setupIdleAttention },
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
        { name: "Chat button on the dashboard", section: "Dashboard", match: pageIsDashboard, run: setupDashboardChatLink },
        { name: "Game chat from the dashboard", section: "Dashboard", match: pageIsDashboard, run: setupDashboardGameChat },
        { name: "Your-turn count in tab title and background checks", section: "Dashboard", match: pageIsDashboard, run: setupTurnAlerts },
        { name: "Sort your-turn games by time left before boot", section: "Dashboard", match: pageIsDashboard, run: setupBootTimeSort },
        { name: "Community event badges on My Games", section: "Dashboard", match: pageIsDashboard, run: setupEventBadges },
        { name: "Open Games filter", section: "Dashboard", match: function () { return pageIsDashboard() || pageIsOpenGamesPage(); }, run: setupOpenGamesFilter },
        { name: "Mark Open Games you joined", section: "Dashboard", match: function () { return pageIsDashboard() || pageIsOpenGamesPage(); }, run: setupJoinedOpenGames },
        { name: "Refresh Open Games every few minutes", section: "Dashboard", match: pageIsDashboard, run: setupOpenGamesAutoRefresh },
        { name: "Filters on Past Games", section: "Games", match: pageIsPastGames, run: setupPastGamesFilter },
        { name: "Notes in games", section: "Games", match: pageIsGame, run: setupGameNotes },
        { name: "commit confirmation", match: pageIsGame, run: function () { ifSettingIsEnabled('confirmCommit', setupCommitConfirm); } },
        { name: "Read chat messages aloud", section: "Games", match: function () { return pageIsGame() || pageIsChatRoom(); }, run: setupChatSpeech },
        { name: "Mute players and highlight mentions in game chat", section: "Games", match: pageIsGame, run: setupGameChatTools },
        { name: "Chat rooms: hide events, mute players, highlight mentions", section: "Community", match: pageIsChatRoom, run: setupChatRoomTools },
        { name: "Suggest names after @ in chat rooms", section: "Community", match: pageIsChatRoom, run: setupChatRoomMentionSuggest },
        { name: "Suggest names after @ in game chat", section: "Games", match: pageIsGame, run: setupGameMentionSuggest },
        { name: "hide coins", match: function () { return !pageIsDashboard(); }, run: function () { ifSettingIsEnabled('hideCoinsGlobally', hideCoinsGlobally); } },
        { name: "maak.ch features", run: function () { ifSettingIsEnabled('useMaakServices', setupMaakFeatures); } },
        { name: "New version notice", section: "Other", run: setupUpdateNotice }
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

    // The script's hidden game frames are driven from the page that opened them, and kept silent.
    if (inScriptFrame()) {
        muteScriptFrame();
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
var OPEN_GAMES_REFRESH_KEY = "tidyUpYourDashboard.openGamesRefreshMinutes";

function openGamesRefreshMinutes() {
    try {
        var minutes = parseFloat(localStorage.getItem(OPEN_GAMES_REFRESH_KEY));
        return isNaN(minutes) ? 5 : Math.max(0, minutes);
    } catch (e) {
        return 5;
    }
}

// A refresh is due once the minutes have passed since the list was last loaded, but only while you can
// see it and aren't in the middle of reading it (pointer over the list, or the Filter panel open).
function openGamesRefreshDue(now, last, minutes, shown, busy) {
    return minutes > 0 && shown && !busy && now - last >= minutes * 60 * 1000;
}

// Open Games on the dashboard refreshes by itself every few minutes while it's on screen. A refresh by
// R, the Refresh button or coming back to the tab counts too.
function setupOpenGamesAutoRefresh() {
    var table = $("#OpenGamesTable");
    if (!table.length) {
        return;
    }
    var last = Date.now();
    var minutes = openGamesRefreshMinutes();
    $(document).on("tuyd:gamesRefreshed", function (e, selector) {
        if (selector === "#OpenGamesTable") {
            last = Date.now();
        }
    });
    var shown = function () {
        if (document.visibilityState === "hidden") {
            return false;
        }
        var rect = table[0].getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    };
    var busy = function () {
        return table.is(":hover") || $("#OpenGamesFilterPanel").is(":visible");
    };
    window.setInterval(function () {
        if (openGamesRefreshDue(Date.now(), last, minutes, shown(), busy())) {
            last = Date.now();
            log("Open Games refreshed by itself");
            refreshOpenGames(fetchDashboard());
        }
    }, 15000);
    // The choice sits in the Open Games Filter panel, which that feature draws once your filter is read.
    var tries = 0;
    var place = function () {
        var panel = $("#OpenGamesFilterPanel td").first();
        if (!panel.length) {
            if (++tries < 50) {
                setTimeout(place, 200);
            }
            return;
        }
        $('<label class="tuydOpenGamesRefresh">Refresh this list every <input type="number" min="0" step="1"> minutes while it\'s on screen (0 = off)</label>')
            .appendTo(panel).find("input").val(minutes).on("change input", function () {
                var value = parseFloat(this.value);
                minutes = isNaN(value) ? 0 : Math.max(0, value);
                try {
                    localStorage.setItem(OPEN_GAMES_REFRESH_KEY, String(minutes));
                } catch (e) {
                    // A blocked localStorage only means the choice isn't remembered.
                }
            });
    };
    place();
}

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
    var count = function (number) {
        return Math.max(0, Math.floor(Number(number)) || 0);
    };
    var known = openGameSettingIcons().concat(openGameCards()).map(function (entry) {
        return entry[0];
    });
    return {
        hideAutoGames: value.hideAutoGames === true,
        hideCoinGames: value.hideCoinGames === true,
        // Filters saved before boot times had units were in hours (minBootHours, maxBootHours).
        minBoot: Math.max(0, Number(value.minBoot !== undefined ? value.minBoot : value.minBootHours) || 0),
        minBootUnit: Object.prototype.hasOwnProperty.call(OPEN_GAMES_BOOT_UNITS, value.minBootUnit) ? value.minBootUnit : "hours",
        maxBoot: Math.max(0, Number(value.maxBoot !== undefined ? value.maxBoot : value.maxBootHours) || 0),
        maxBootUnit: Object.prototype.hasOwnProperty.call(OPEN_GAMES_BOOT_UNITS, value.maxBootUnit) ? value.maxBootUnit : "hours",
        keywords: Array.isArray(value.keywords) ? parseFilterKeywords(value.keywords.join(",")) : [],
        mapWords: Array.isArray(value.mapWords) ? parseFilterKeywords(value.mapWords.join(",")) : [],
        minPlayers: count(value.minPlayers),
        maxPlayers: count(value.maxPlayers),
        minOpenSeats: count(value.minOpenSeats),
        maxOpenSeats: count(value.maxOpenSeats),
        teamGames: ["only", "none", "ffa", "noffa", "1v1", "no1v1"].indexOf(value.teamGames) !== -1 ? value.teamGames : "",
        teamSize: ["2", "3", "4"].indexOf(value.teamSize) !== -1 ? value.teamSize : "",
        hideMuted: value.hideMuted === true,
        hideSettings: Array.isArray(value.hideSettings) ? value.hideSettings.filter(function (key) {
            return known.indexOf(key) !== -1;
        }) : []
    };
}

// war.app's game setting icons, by file name, with a short label for the filter. A "#" key also needs
// the icon's hover text to match: the fog icon says which fog level the game has.
function openGameSettingIcons() {
    return [
        ["Commerce.png", "Commerce"],
        ["LocalDeployment.png", "Local deployments"],
        ["ManualDistribution.png", "Manual distribution"],
        ["AutoDist.png", "Automatic distribution"],
        ["Cards.png", "Cards"],
        ["Wastelands.png", "Wastelands"],
        ["Fog.png", "Fog other than normal"],
        ["Fog.png#less", "Less fog than normal (no fog, light fog)", /Fog level: (?:No|Light) Fog/i],
        ["Fog.png#more", "More fog than normal (dense, heavy, complete)", /Fog level: (?:Dense|Heavy|Complete) Fog/i],
        ["NoSplit.png", "No-split mode"],
        ["OverriddenBonuses.png", "Overridden bonuses"],
        ["AttackTransferOnly.png", "Attack-only / transfer-only"],
        ["OneArmyStandGuard.png", "One army must stand guard"],
        ["AllSkill.png", "Pure skill (no luck)"],
        ["LuckModifier.png", "Changed luck or rounding"],
        ["KillRate.png", "Changed kill rates"],
        ["MinArmies.png", "Changed minimum armies per turn"],
        ["BonusArmiesPer.png", "Extra armies per territory"],
        ["ArmyCap.png", "Army cap"],
        ["Commander.png", "Commanders"],
        ["MultiAttack.png", "Multi-attack"],
        ["BankingBoot.png", "Banked boot time"],
        ["Mods.png", "Mods"],
        ["CustomScenario.png", "Custom scenario"],
        ["PracticeGame.png", "Practice game (no points)"]
    ];
}

// The cards war.app lists on a game's cards icon ("Reinforcement Card, Airlift Card, Blockade Card").
function openGameCards() {
    return ["Reinforcement", "Spy", "Emergency Blockade", "Order Priority", "Order Delay", "Airlift", "Gift", "Diplomacy", "Sanctions",
        "Reconnaissance", "Surveillance", "Blockade", "Bomb"].map(function (card) {
        return ["card:" + card, card];
    });
}

function openGameIcons(row) {
    return $(row).find("img").not(".MyGamesGameThumbnail").map(function () {
        return { file: String($(this).attr("src") || "").split(/[?#]/)[0].split("/").pop(), title: String($(this).attr("title") || "") };
    }).get();
}

function openGameHasSetting(icons, key) {
    var title = function (file) {
        var icon = icons.filter(function (candidate) {
            return candidate.file === file;
        })[0];
        return icon ? icon.title : null;
    };
    if (key.indexOf("card:") === 0) {
        var cards = title("Cards.png");
        return cards !== null && cards.split(",").some(function (card) {
            return card.trim().toLowerCase() === key.slice(5).toLowerCase() + " card";
        });
    }
    var entry = openGameSettingIcons().filter(function (candidate) {
        return candidate[0] === key;
    })[0];
    var found = title(key.split("#")[0]);
    return found !== null && (!entry || !entry[2] || entry[2].test(found));
}

// A team game's team size: war.app says it for random teams ("random teams of 2") and draws set teams as
// groups of seats with a gap between them (two &nbsp;). null when it can't tell.
function openGameTeamSize(row, icons) {
    var team = icons.filter(function (icon) {
        return icon.file === "Teams.png";
    })[0];
    if (!team) {
        return null;
    }
    var random = /random teams of (\d+)/i.exec(team.title);
    if (random) {
        return Number(random[1]);
    }
    var groups = [0];
    $(row).find(".MyGamesGameBoxesRow").first().contents().each(function () {
        if (this.nodeType === 1 && $(this).hasClass("MyGamesGameBox")) {
            groups[groups.length - 1]++;
        } else if (this.nodeType === 3 && /\u00a0/.test(this.nodeValue) && groups[groups.length - 1] > 0) {
            groups.push(0);
        }
    });
    groups = groups.filter(Boolean);
    return groups.length > 1 ? Math.max.apply(null, groups) : null;
}

// The players who joined, by their seat's hover text ("Name", or "Name: Waiting for this player…").
function openGamePlayers(row) {
    return $(row).find(".MyGamesGameBox").filter(function () {
        return !$(this).find(".MyGamesGameBoxOpenSeat").length;
    }).map(function () {
        return String($(this).attr("title") || "").replace(/: Waiting for this player.*$/i, "").trim();
    }).get().filter(function (name) {
        return name && name !== "Open Seat";
    });
}

function nameHasKeyword(name, keywords) {
    return keywords.some(function (keyword) {
        var escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp("(?:^|[^\\p{L}\\p{N}])" + escaped + "(?:$|[^\\p{L}\\p{N}])", "iu").test(name);
    });
}

// extra: what the filter loads on the side, the muted players and war.app's map names by thumbnail folder.
function openGameIsFiltered(row, filter, extra) {
    extra = extra || {};
    var link = $(row).find("td").eq(1).find("a").first();
    if (filter.hideAutoGames && /[?&]AutoGameID=/i.test(link.attr("href") || "")) {
        return true;
    }
    if (filter.hideCoinGames && /Entry fee:/i.test($(row).find("font").text())) {
        return true;
    }
    var bootMinutes = parseBootTime($(row).find(".BootTimeLabel").text());
    var minBoot = filter.minBoot * OPEN_GAMES_BOOT_UNITS[filter.minBootUnit];
    var maxBoot = filter.maxBoot * OPEN_GAMES_BOOT_UNITS[filter.maxBootUnit];
    if (bootMinutes !== null && ((minBoot > 0 && bootMinutes < minBoot) || (maxBoot > 0 && bootMinutes > maxBoot))) {
        return true;
    }
    var seats = $(row).find(".MyGamesGameBox").length;
    if (seats > 0 && ((filter.minPlayers > 0 && seats < filter.minPlayers) || (filter.maxPlayers > 0 && seats > filter.maxPlayers))) {
        return true;
    }
    var open = $(row).find(".MyGamesGameBoxOpenSeat").length;
    if (seats > 0 && ((filter.minOpenSeats > 0 && open < filter.minOpenSeats) || (filter.maxOpenSeats > 0 && open > filter.maxOpenSeats))) {
        return true;
    }
    var icons = openGameIcons(row);
    var size = openGameTeamSize(row, icons);
    // Teams of one player (often a 1v1 made a team game for a chat that stays the same) aren't played in
    // teams: such a game counts as 1 v 1 or FFA. Two seats can only be two teams of one.
    var teamGame = icons.some(function (icon) {
        return icon.file === "Teams.png";
    }) && seats !== 2 && size !== 1;
    if ((filter.teamGames === "only" && !teamGame) || (filter.teamGames === "none" && teamGame)) {
        return true;
    }
    // Free-for-all: three or more seats and no teams. Without seat boxes there's no telling, so it stays.
    var ffa = seats >= 3 && !teamGame;
    if (seats > 0 && ((filter.teamGames === "ffa" && !ffa) || (filter.teamGames === "noffa" && ffa))) {
        return true;
    }
    var duel = seats === 2 && !teamGame;
    if (seats > 0 && ((filter.teamGames === "1v1" && !duel) || (filter.teamGames === "no1v1" && duel))) {
        return true;
    }
    if (filter.teamSize) {
        if (size === null || (filter.teamSize === "4" ? size < 4 : size !== Number(filter.teamSize))) {
            return true;
        }
    }
    if (filter.hideSettings.some(function (key) {
        return openGameHasSetting(icons, key);
    })) {
        return true;
    }
    if (filter.hideMuted && extra.muted && extra.muted.length) {
        var muted = extra.muted.map(function (name) {
            return name.toLowerCase();
        });
        if (openGamePlayers(row).some(function (name) {
            return muted.indexOf(name.toLowerCase()) !== -1;
        })) {
            return true;
        }
    }
    if (filter.mapWords.length && extra.maps) {
        var folder = /\/Thumbs\/Maps\/(\d+)\//.exec($(row).find("img.MyGamesGameThumbnail").attr("src") || "");
        var map = folder && extra.maps[folder[1]];
        if (map && nameHasKeyword(map.name, filter.mapWords)) {
            return true;
        }
    }
    return nameHasKeyword(link.text(), filter.keywords);
}

function applyOpenGamesFilter(filter, extra) {
    var rows = $("#OpenGamesTable tr.GameRow");
    var filtered = rows.filter(function () {
        return openGameIsFiltered(this, filter, extra);
    });
    rows.not(filtered).removeClass("tuyd-filtered");
    filtered.addClass("tuyd-filtered");
    $("#OpenGamesFilterCount").text(filtered.length > 0 ? filtered.length + " hidden" : "");
}

function readOpenGamesFilterForm(panel) {
    return normalizeOpenGamesFilter({
        hideAutoGames: panel.find("[name=hideAutoGames]").prop("checked"),
        hideCoinGames: panel.find("[name=hideCoinGames]").prop("checked"),
        minBoot: panel.find("[name=minBoot]").val(),
        minBootUnit: panel.find("[name=minBootUnit]").val(),
        maxBoot: panel.find("[name=maxBoot]").val(),
        maxBootUnit: panel.find("[name=maxBootUnit]").val(),
        keywords: parseFilterKeywords(panel.find("[name=keywords]").val()),
        mapWords: parseFilterKeywords(panel.find("[name=mapWords]").val()),
        minPlayers: panel.find("[name=minPlayers]").val(),
        maxPlayers: panel.find("[name=maxPlayers]").val(),
        minOpenSeats: panel.find("[name=minOpenSeats]").val(),
        maxOpenSeats: panel.find("[name=maxOpenSeats]").val(),
        teamGames: panel.find("[name=teamGames]").val(),
        teamSize: panel.find("[name=teamSize]").val(),
        hideMuted: panel.find("[name=hideMuted]").prop("checked"),
        hideSettings: panel.find("[name=hideSetting]:checked").map(function () {
            return this.value;
        }).get()
    });
}

function setupOpenGamesFilter() {
    var table = $("#OpenGamesTable");
    if (table.length === 0) {
        return;
    }
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "openGamesFilter", function (setting) {
        var filter = normalizeOpenGamesFilter(setting && setting.value);
        var extra = { muted: [], maps: null };
        var mapsAsked = false;
        var apply = function () {
            if (filter.mapWords.length && !mapsAsked) {
                mapsAsked = true;
                loadMapNames(function (maps) {
                    extra.maps = maps;
                    applyOpenGamesFilter(filter, extra);
                });
            }
            applyOpenGamesFilter(filter, extra);
        };
        addCSS(`
            #OpenGamesTable tr.tuyd-filtered { display: none; }
            #OpenGamesFilterCount { color: #999; letter-spacing: 0; margin-left: 4px; }
            #OpenGamesFilterPanel td { padding: 8px 10px; }
            #OpenGamesFilterPanel label { display: block; margin: 0 0 6px; font-weight: normal; }
            #OpenGamesFilterPanel input[type=number] { width: 60px; }
            #OpenGamesFilterPanel input[type=text] { width: 260px; max-width: 100%; }
            #OpenGamesFilterPanel input[type=number], #OpenGamesFilterPanel input[type=text], #OpenGamesFilterPanel select { background: #222; color: #ddd; border: 1px solid #555; padding: 1px 4px; }
            #OpenGamesFilterPanel .tuydFilterSettings { display: flex; flex-wrap: wrap; gap: 0 16px; margin: 2px 0 6px 18px; }
            #OpenGamesFilterPanel .tuydFilterSettings label { margin-bottom: 2px; }
            #OpenGamesFilterPanel details { margin: 0 0 6px; }
            #OpenGamesFilterPanel summary { cursor: pointer; width: max-content; }
            #OpenGamesFilterPanel summary .tuydFilterTicked { color: #e0c060; margin-left: 4px; }
            #OpenGamesFilterLink .tuydFilterArrow { display: inline-block; margin-left: 3px; font-size: 10px; transition: transform 0.15s; }
            #OpenGamesFilterLink.tuydFilterOpen .tuydFilterArrow { transform: rotate(90deg); }
        `);
        var filterLink = ` | <a href="#" id="OpenGamesFilterLink" style="letter-spacing: 0px" aria-expanded="false">Filter<span class="tuydFilterArrow">▶</span></a><span id="OpenGamesFilterCount"></span>`;
        var codeLink = table.find("thead a[href*='GameInviteCode']").first();
        if (codeLink.length) {
            codeLink.after(filterLink);
        } else {
            table.find("thead h2").parent().append(filterLink);
        }
        var bootUnits = function (name) {
            return '<select name="' + name + '">' + Object.keys(OPEN_GAMES_BOOT_UNITS).map(function (unit) {
                return '<option value="' + unit + '">' + unit + '</option>';
            }).join("") + "</select>";
        };
        var checkboxes = function (entries) {
            return entries.map(function (entry) {
                return '<label><input type="checkbox" name="hideSetting" value="' + htmlEscape(entry[0]) + '"> ' + htmlEscape(entry[1]) + '</label>';
            }).join("");
        };
        var panel = $(`
            <tr id="OpenGamesFilterPanel" style="display: none"><td colspan="2">
                <label><input type="checkbox" name="hideAutoGames"> Hide Auto Games</label>
                <label><input type="checkbox" name="hideCoinGames"> Hide coin games</label>
                <label>Hide games with a boot time under <input type="number" name="minBoot" min="0" step="1"> ${bootUnits("minBootUnit")} or over <input type="number" name="maxBoot" min="0" step="1"> ${bootUnits("maxBootUnit")} (0 = off)</label>
                <label>Hide games whose name contains any of these words <input type="text" name="keywords" placeholder="rp, diplo"> (separate with commas)</label>
                <label>Hide maps whose name contains any of these words <input type="text" name="mapWords" placeholder="earth, europe"> (separate with commas)</label>
                <label>Players: from <input type="number" name="minPlayers" min="0" step="1"> to <input type="number" name="maxPlayers" min="0" step="1"> seats (0 = any)</label>
                <label>Open seats left: from <input type="number" name="minOpenSeats" min="0" step="1"> to <input type="number" name="maxOpenSeats" min="0" step="1"> (0 = any; 1 to 1 for games about to start)</label>
                <label>Game type: <select name="teamGames"><option value="">show all</option><option value="only">show only team games</option><option value="none">hide team games</option><option value="1v1">show only 1 v 1</option><option value="no1v1">hide 1 v 1</option><option value="ffa">show only FFA (free-for-all, 3+ players)</option><option value="noffa">hide FFA</option></select></label>
                <label>Team size: <select name="teamSize"><option value="">any</option><option value="2">show only teams of 2 (2v2, 2v2v2…)</option><option value="3">show only teams of 3</option><option value="4">show only teams of 4 or more</option></select></label>
                <label><input type="checkbox" name="hideMuted"> Hide games with a player you muted</label>
                <details data-group="settings"><summary>Hide games with these settings<span class="tuydFilterTicked"></span></summary>
                    <div class="tuydFilterSettings">${checkboxes(openGameSettingIcons())}</div></details>
                <details data-group="cards"><summary>Hide games with any of these cards<span class="tuydFilterTicked"></span></summary>
                    <div class="tuydFilterSettings">${checkboxes(openGameCards())}</div></details>
            </td></tr>`);
        panel.find("[name=hideAutoGames]").prop("checked", filter.hideAutoGames);
        panel.find("[name=hideCoinGames]").prop("checked", filter.hideCoinGames);
        panel.find("[name=minBoot]").val(filter.minBoot);
        panel.find("[name=minBootUnit]").val(filter.minBootUnit);
        panel.find("[name=maxBoot]").val(filter.maxBoot);
        panel.find("[name=maxBootUnit]").val(filter.maxBootUnit);
        panel.find("[name=keywords]").val(filter.keywords.join(", "));
        panel.find("[name=mapWords]").val(filter.mapWords.join(", "));
        panel.find("[name=minPlayers]").val(filter.minPlayers);
        panel.find("[name=maxPlayers]").val(filter.maxPlayers);
        panel.find("[name=minOpenSeats]").val(filter.minOpenSeats);
        panel.find("[name=maxOpenSeats]").val(filter.maxOpenSeats);
        panel.find("[name=teamGames]").val(filter.teamGames);
        panel.find("[name=teamSize]").val(filter.teamSize);
        panel.find("[name=hideMuted]").prop("checked", filter.hideMuted);
        panel.find("[name=hideSetting]").each(function () {
            this.checked = filter.hideSettings.indexOf(this.value) !== -1;
        });
        // A folded group says how many of its boxes are ticked, so nothing hidden by it goes unnoticed.
        var countTicked = function () {
            panel.find("details").each(function () {
                var ticked = $(this).find("[name=hideSetting]:checked").length;
                $(this).find(".tuydFilterTicked").text(ticked ? "(" + ticked + " ticked)" : "");
            });
        };
        countTicked();
        table.find("thead").first().append(panel);
        $("#OpenGamesFilterLink").on("click", function (e) {
            e.preventDefault();
            panel.toggle();
            $(this).toggleClass("tuydFilterOpen", panel.is(":visible")).attr("aria-expanded", String(panel.is(":visible")));
        });
        panel.find("input, select").on("change", function () {
            countTicked();
            filter = readOpenGamesFilterForm(panel);
            Database.update(Database.Table.Settings, { name: "openGamesFilter", value: filter }, undefined);
            apply();
        });
        readMutedPlayers(function (names) {
            extra.muted = names;
            apply();
        });
        apply();
        // The site re-renders rows for "Show more" and the pace buttons; changes in thead are our own.
        new MutationObserver(function (mutations) {
            var rowsChanged = mutations.some(function (mutation) {
                return $(mutation.target).closest("thead").length === 0;
            });
            if (rowsChanged) {
                applyOpenGamesFilter(filter, extra);
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

function pastGameState(row) {
    if ($(row).find("span").filter(function () {
        return /^Your turn/i.test($(this).text().trim());
    }).length) {
        return "yourTurn";
    }
    var status = $(row).find("td p").first().text().replace(/\s+/g, " ").trim();
    if (/^Lobby\b/i.test(status)) {
        return "lobby";
    }
    if (/^(?:Turn \d+|Picking)\b/i.test(status)) {
        return "running";
    }
    if (/^Finished\b/i.test(status)) {
        return "finished";
    }
    return "out";
}

function pastGameSpeed(row) {
    var minutes = parseBootTime($(row).find(".BootTimeLabel").text());
    return minutes === null ? "" : minutes <= 60 ? "realTime" : "multiDay";
}

// A game's thumbnail sits in its map's folder on war.app's CDN (Data/Thumbs/Maps/74965/41_Fogged.jpg);
// war.app's map list uses the same folder for each map's own thumbnail, which gives the map's name.
// Some games show a picture of the game instead (Data/Thumbs/Games/…/Turn7f.jpg), which says nothing
// about the map: those count as "unknown".
function pastGameMapKey(row, known) {
    var match = /\/Thumbs\/Maps\/(\d+)\//.exec($(row).find("img.MyGamesGameThumbnail").attr("src") || "");
    var found = known && known[$(row).attr("gameid")];
    return match ? match[1] : found || "unknown";
}

var GAME_MAPS_KEY = "tidyUpYourDashboard.pastGameMaps";

// Maps found by opening a game, by GameID. A game's map never changes, so they're kept for good.
function storedGameMaps() {
    try {
        var stored = JSON.parse(localStorage.getItem(GAME_MAPS_KEY));
        return stored && typeof stored === "object" ? stored : {};
    } catch (e) {
        return {};
    }
}

// war.app's data for a game has its map's ID and thumbnail folder in two of its minified fields (737 and
// 1748 for Medium Earth), next to small numbers such as 1, 2 and 3 that are by chance also a map's folder
// and ID (Bracketology is folder 1, ID 1). So a map counts only when its folder and its ID are in two
// different fields, and the largest folder wins: a chance match is a small number.
function gameMapFolder(map, maps) {
    var fields = Object.keys(map || {}).filter(function (key) {
        var value = map[key];
        return typeof value === "number" && value > 0 && Math.floor(value) === value;
    });
    var candidates = fields.filter(function (key) {
        var entry = maps[String(map[key])];
        return entry && fields.some(function (other) {
            return other !== key && map[other] === Number(entry.id);
        });
    }).map(function (key) {
        return map[key];
    }).sort(function (a, b) {
        return b - a;
    });
    return candidates.length ? String(candidates[0]) : null;
}

function pastGamePlayers(row) {
    return $(row).find(".MyGamesGameBox").length;
}

// war.app's map list (Ajax/EnumerateMaps, every map at once): each map's thumbnail folder, ID and name.
function parseMapList(html) {
    var maps = {};
    $(new DOMParser().parseFromString(html, "text/html")).find("img").each(function () {
        var folder = /\/Thumbs\/Maps\/(\d+)\//.exec($(this).attr("src") || "");
        var box = $(this).closest("div");
        var link = /\/Map\/(\d+)/.exec(box.find("a").first().attr("href") || "");
        var name = box.clone().children("font, a, img").remove().end().text().replace(/\s+/g, " ").trim();
        if (folder && link && name) {
            maps[folder[1]] = { id: link[1], name: name };
        }
    });
    return maps;
}

function pastGameMatches(row, filter) {
    var state = pastGameState(row);
    if (filter.state === "running" ? state !== "running" && state !== "yourTurn" : filter.state && state !== filter.state) {
        return false;
    }
    if (filter.speed && pastGameSpeed(row) !== filter.speed) {
        return false;
    }
    if (filter.map && pastGameMapKey(row, filter.knownMaps) !== filter.map) {
        return false;
    }
    var players = pastGamePlayers(row);
    if ((filter.minPlayers && players < filter.minPlayers) || (filter.maxPlayers && players > filter.maxPlayers)
        || (filter.size === "oneVsOne" && players !== 2) || (filter.size === "more" && players <= 2)) {
        return false;
    }
    var query = String(filter.query || "").trim().toLowerCase();
    if (!query) {
        return true;
    }
    var names = [$(row).find("td").eq(1).find("a").first().text()].concat($(row).find(".MyGamesGameBox").map(function () {
        return String($(this).attr("title") || "").split(": ")[0];
    }).get());
    return names.some(function (name) {
        return name.toLowerCase().indexOf(query) !== -1;
    });
}

function normalizePastGamesFilter(value) {
    value = value || {};
    var count = function (number) {
        number = parseInt(number, 10);
        return number > 0 ? number : 0;
    };
    return {
        state: ["running", "yourTurn", "lobby", "finished", "out"].indexOf(value.state) !== -1 ? value.state : "",
        speed: value.speed === "realTime" || value.speed === "multiDay" ? value.speed : "",
        map: /^(?:\d+|unknown)$/.test(String(value.map || "")) ? String(value.map) : "",
        minPlayers: count(value.minPlayers),
        maxPlayers: count(value.maxPlayers),
        size: value.size === "oneVsOne" || value.size === "more" ? value.size : "",
        reversed: value.reversed === true,
        query: typeof value.query === "string" ? value.query : ""
    };
}

function orderPastGames(tbody, reversed) {
    var rows = $(tbody).children("tr.GameRow");
    var next = rows.length ? Math.max.apply(null, rows.map(function () {
        return Number($(this).attr("data-tuyd-order")) || 0;
    }).get()) + 1 : 0;
    rows.each(function () {
        if (!$(this).attr("data-tuyd-order")) {
            $(this).attr("data-tuyd-order", next++);
        }
    });
    var sorted = rows.get().sort(function (a, b) {
        var difference = Number($(a).attr("data-tuyd-order")) - Number($(b).attr("data-tuyd-order"));
        return reversed ? -difference : difference;
    });
    var changed = sorted.some(function (row, i) {
        return row !== rows[i];
    });
    if (changed) {
        $(tbody).append(sorted);
    }
    return changed;
}

function applyPastGamesFilter(table, filter) {
    var rows = $(table).find("tbody tr.GameRow");
    var shown = rows.filter(function () {
        return pastGameMatches(this, filter);
    });
    rows.not(shown).addClass("tuyd-pastHidden");
    shown.removeClass("tuyd-pastHidden");
    $("#PastGamesFilterCount").text(shown.length === rows.length ? "" : shown.length + " of " + rows.length + " shown");
}

var MAP_NAMES_KEY = "tidyUpYourDashboard.mapNames";

// Map names by thumbnail folder, kept for a week: the list is one request of about 1.4 MB.
function loadMapNames(callback) {
    try {
        var cached = JSON.parse(localStorage.getItem(MAP_NAMES_KEY));
        if (cached && cached.maps && Date.now() - cached.at < 7 * 24 * 60 * 60 * 1000) {
            callback(cached.maps);
            return;
        }
    } catch (e) {
        // An unreadable cache is loaded again.
    }
    $.ajax({ url: "/Ajax/EnumerateMaps?Filter=__all&Sort=1&PerPage=100000&Offset=0", dataType: "text" }).done(function (html) {
        var maps = parseMapList(html);
        try {
            localStorage.setItem(MAP_NAMES_KEY, JSON.stringify({ at: Date.now(), maps: maps }));
        } catch (e) {
            // Without storage the names are loaded again next time.
        }
        callback(maps);
    }).fail(function () {
        log("Past Games: couldn't load war.app's map list for map names");
        callback({});
    });
}

// The maps of the games on this page, by name, with how many games each.
function pastGameMapOptions(rows, maps, selected, known) {
    var counts = {};
    $(rows).each(function () {
        var key = pastGameMapKey(this, known);
        counts[key] = (counts[key] || 0) + 1;
    });
    if (selected && !counts[selected]) {
        counts[selected] = 0;
    }
    return Object.keys(counts).map(function (key) {
        return { key: key, name: key === "unknown" ? "Map not shown" : maps[key] ? maps[key].name : "Map " + key, games: counts[key] };
    }).sort(function (a, b) {
        return (a.key === "unknown") - (b.key === "unknown") || a.name.localeCompare(b.name);
    });
}

function setupPastGamesFilter() {
    var table = $("#MyGamesTable");
    if (!table.length) {
        return;
    }
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "pastGamesFilter", function (setting) {
        var filter = normalizePastGamesFilter(setting && setting.value);
        filter.query = "";
        addCSS(`
            #MyGamesTable tr.tuyd-pastHidden { display: none; }
            #PastGamesFilterBar td { padding: 6px 8px 10px; }
            #PastGamesFilterCount { white-space: nowrap; }
            #PastGamesFilterBar input, #PastGamesFilterBar select { display: inline-block; width: auto; margin-right: 8px; background: #222; color: #ddd; border: 1px solid #555; padding: 1px 4px; }
            #PastGamesFilterBar input[type=search] { width: 220px; max-width: 100%; }
            #PastGamesFilterBar input[type=number] { width: 52px; margin-right: 4px; }
            #PastGamesFilterBar select[name=map] { max-width: 220px; }
            #PastGamesFilterBar .tuydPastRow { margin-top: 6px; }
            #PastGamesFilterBar .tuydMapFind { margin-left: 4px; color: #999; white-space: nowrap; }
            #PastGamesFilterBar label { font-weight: normal; margin: 0 8px 0 0; }
            #PastGamesFilterBar input[type=checkbox] { margin: 0 4px 0 0; vertical-align: middle; }
            #PastGamesFilterCount { color: #999; }
        `);
        var bar = $(`<tr id="PastGamesFilterBar"><td colspan="3">
            <input type="search" name="query" placeholder="Game or player name">
            <select name="state">
                <option value="">All games</option>
                <option value="running">In progress</option>
                <option value="yourTurn">Your turn</option>
                <option value="lobby">Lobby</option>
                <option value="finished">Finished</option>
                <option value="out" title="Surrendered, booted, eliminated or declined">You're out</option>
            </select>
            <select name="speed">
                <option value="">Any speed</option>
                <option value="realTime" title="Boot time of an hour or less">Real-time</option>
                <option value="multiDay">Multi-day</option>
            </select>
            <label><input type="checkbox" name="reversed">Reverse order</label>
            <span id="PastGamesFilterCount" title="Filters the games on this page. Number per page shows up to 200."></span>
            <div class="tuydPastRow">
                <select name="map" title="The maps of the games on this page"><option value="">Any map</option></select>
                <select name="size">
                    <option value="">Any number of players</option>
                    <option value="oneVsOne">1 v 1</option>
                    <option value="more">More than 2 players</option>
                </select>
                <label>Players from <input type="number" name="minPlayers" min="0" step="1"> to <input type="number" name="maxPlayers" min="0" step="1"></label>
                <span class="tuydMapFind"></span>
            </div>
        </td></tr>`);
        bar.find("[name=state]").val(filter.state);
        bar.find("[name=speed]").val(filter.speed);
        bar.find("[name=reversed]").prop("checked", filter.reversed);
        bar.find("[name=size]").val(filter.size);
        bar.find("[name=minPlayers]").val(filter.minPlayers || "");
        bar.find("[name=maxPlayers]").val(filter.maxPlayers || "");
        table.children("thead").first().append(bar);
        var tbody = table.children("tbody").first();
        var maps = {};
        var known = storedGameMaps();
        filter.knownMaps = known;
        var finding = null;
        var unknownGames = function () {
            return tbody.children("tr.GameRow").filter(function () {
                return pastGameMapKey(this, known) === "unknown" && !(finding && finding.tried[$(this).attr("gameid")]);
            }).map(function () {
                return $(this).attr("gameid");
            }).get();
        };
        var showFinder = function () {
            var place = bar.find(".tuydMapFind").empty();
            if (finding) {
                place.text("Finding maps: " + finding.done + " of " + finding.total + " ").append('<a href="#" class="tuydMapFindStop">Stop</a>');
                return;
            }
            var missing = unknownGames().length;
            if (missing) {
                $('<a href="#" class="tuydMapFindStart"></a>').text("Find the maps of " + missing + " game" + (missing === 1 ? "" : "s"))
                    .attr("title", "Opens each of these games in the background, a couple of seconds each, to read its map. Remembered in this browser.")
                    .appendTo(place);
            }
        };
        // One game at a time in a hidden frame, until war.app's data for it has its map.
        var findNext = function () {
            if (!finding) {
                return;
            }
            var id = unknownGames()[0];
            if (!id) {
                finding = null;
                update();
                return;
            }
            finding.tried[id] = true;
            var frame = $('<iframe tabindex="-1" aria-hidden="true" style="position: fixed; left: -10000px; top: 0; width: 1000px; height: 800px; border: 0;"></iframe>')
                .attr({ id: GAME_MAP_FRAME_ID, src: "/MultiPlayer?GameID=" + encodeURIComponent(id) }).appendTo("body");
            var started = Date.now();
            finding.timer = setInterval(function () {
                var map = null;
                try {
                    var hooks = frame[0].contentWindow.UJS_Hooks;
                    map = hooks && hooks.za && hooks.za.Map;
                } catch (e) {
                    map = null;
                }
                if (!map && Date.now() - started < 30000) {
                    return;
                }
                clearInterval(finding.timer);
                frame.remove();
                var folder = map ? gameMapFolder(map, maps) : null;
                if (folder) {
                    known[id] = folder;
                    try {
                        localStorage.setItem(GAME_MAPS_KEY, JSON.stringify(known));
                    } catch (e) {
                        // Without storage the maps are found again next time.
                    }
                } else {
                    log("Past Games: couldn't read the map of game " + id);
                }
                finding.done++;
                update();
                findNext();
            }, 300);
        };
        var fillMaps = function () {
            showFinder();
            var select = bar.find("[name=map]");
            var options = pastGameMapOptions(tbody.children("tr.GameRow"), maps, filter.map, known);
            select.children("option").not("[value='']").remove();
            options.forEach(function (option) {
                select.append($("<option>").val(option.key).text(option.name + " (" + option.games + ")")
                    .attr("title", option.key === "unknown" ? "These games show a picture of the game instead of the map, so their map isn't known" : null));
            });
            select.val(filter.map);
        };
        var observer = new MutationObserver(function () {
            update();
        });
        var update = function () {
            observer.disconnect();
            orderPastGames(tbody, filter.reversed);
            applyPastGamesFilter(table, filter);
            fillMaps();
            observer.observe(tbody[0], { childList: true });
        };
        bar.on("input change", "input, select", function (event) {
            filter = normalizePastGamesFilter({
                state: bar.find("[name=state]").val(),
                speed: bar.find("[name=speed]").val(),
                reversed: bar.find("[name=reversed]").prop("checked"),
                query: bar.find("[name=query]").val(),
                map: bar.find("[name=map]").val(),
                size: bar.find("[name=size]").val(),
                minPlayers: bar.find("[name=minPlayers]").val(),
                maxPlayers: bar.find("[name=maxPlayers]").val()
            });
            filter.knownMaps = known;
            if (event.type === "change" && event.target.name !== "query") {
                Database.update(Database.Table.Settings, { name: "pastGamesFilter", value: { state: filter.state, speed: filter.speed, reversed: filter.reversed, map: filter.map, size: filter.size, minPlayers: filter.minPlayers, maxPlayers: filter.maxPlayers } }, undefined);
            }
            update();
        });
        bar.on("click", ".tuydMapFindStart", function (event) {
            event.preventDefault();
            finding = { done: 0, total: unknownGames().length, tried: {}, timer: null };
            showFinder();
            findNext();
        }).on("click", ".tuydMapFindStop", function (event) {
            event.preventDefault();
            if (finding) {
                clearInterval(finding.timer);
            }
            $("#" + GAME_MAP_FRAME_ID).remove();
            finding = null;
            update();
        });
        update();
        loadMapNames(function (names) {
            maps = names;
            fillMaps();
        });
    });
}

function gameNotesKey(gameId) {
    return "gameNotes:" + gameId;
}

function normalizeGameNotes(value) {
    value = value || {};
    var players = {};
    if (value.players && typeof value.players === "object") {
        Object.keys(value.players).forEach(function (name) {
            if (typeof value.players[name] === "string" && value.players[name].trim()) {
                players[name] = value.players[name];
            }
        });
    }
    return {
        text: typeof value.text === "string" ? value.text : "",
        firstMove: value.firstMove === "odd" || value.firstMove === "even" ? value.firstMove : "",
        players: players,
        name: typeof value.name === "string" ? value.name : ""
    };
}

function gameNotesEmpty(notes) {
    return !notes.text.trim() && !notes.firstMove && Object.keys(notes.players).length === 0;
}

function gamePlayerNames(self) {
    var names = [];
    $("[id^='ujs_PlayerNameContainer']").filter(function () {
        return /^ujs_PlayerNameContainer(?:_\d+)?$/.test(this.id);
    }).each(function () {
        var name = $(this).text().replace(/\s+/g, " ").trim().replace(/^L\d+ /, "");
        if (name && name !== self && names.indexOf(name) === -1) {
            names.push(name);
        }
    });
    return names;
}

// The turn being played: the highest of war.app's turn labels. war.app keeps a label per view (playing,
// waiting, replaying the turn that just finished), and the replay's is a turn behind; its history says
// "Turn 2 of 2" while turn 3 is being played.
function gameTurnNumber() {
    var turn = null;
    $("[id^='ujs_TurnNumberLabel'], [id^='ujs_HistoryInfoLabel']").each(function () {
        var text = $(this).text().trim();
        var label = /^Turn (\d+)$/.exec(text);
        var history = /^Turn \d+ of (\d+)$/.exec(text);
        var number = label ? Number(label[1]) : history ? Number(history[1]) + 1 : null;
        if (number !== null && (turn === null || number > turn)) {
            turn = number;
        }
    });
    return turn;
}

function gameFirstMoveText(firstMove, turn) {
    if (!firstMove || !turn) {
        return "";
    }
    var first = (turn % 2 === 1) === (firstMove === "odd");
    return "Turn " + turn + ": you move " + (first ? "first" : "second");
}

function gameNotesHtml(notes, players) {
    var names = players.slice();
    Object.keys(notes.players).forEach(function (name) {
        if (names.indexOf(name) === -1) {
            names.push(name);
        }
    });
    return '<div class="tuydGameNotesHead">Notes for this game<span class="tuydGameNotesSaved"></span>' +
        '<a href="#" class="tuydGameNotesClose" title="Close">×</a></div>' +
        '<textarea name="text" rows="5" placeholder="Plans, picks, deals… only you can see these.">' + htmlEscape(notes.text) + '</textarea>' +
        '<label class="tuydGameNotesMove">I move first on <select name="firstMove">' +
        '<option value="">—</option><option value="odd"' + (notes.firstMove === "odd" ? " selected" : "") + '>odd turns</option>' +
        '<option value="even"' + (notes.firstMove === "even" ? " selected" : "") + '>even turns</option></select>' +
        '<span class="tuydGameNotesTurn"></span></label>' +
        (names.length ? '<div class="tuydGameNotesPlayers">' + names.map(function (name) {
            return '<label>' + htmlEscape(name) + '<textarea rows="2" data-player="' + htmlEscape(name) + '" placeholder="About this player">' +
                htmlEscape(notes.players[name] || "") + '</textarea></label>';
        }).join("") + '</div>' : "");
}

function readGameNotesPanel(panel, name) {
    var players = {};
    panel.find("textarea[data-player]").each(function () {
        players[$(this).attr("data-player")] = this.value;
    });
    return normalizeGameNotes({
        text: panel.find("textarea[name=text]").val(),
        firstMove: panel.find("select[name=firstMove]").val(),
        players: players,
        name: name
    });
}

// While war.app's chat is open it covers the bottom of the game; the button then sits left of the
// chat's "Chat" tab, on the same line, and the notes open above it.
function gameNotesButtonSpot(chatTabRect, viewportHeight, buttonWidth) {
    if (!chatTabRect || chatTabRect.height <= 0) {
        return { left: 96, bottom: 10, onChat: false };
    }
    return { left: Math.max(8, chatTabRect.left - 8 - buttonWidth), bottom: Math.max(0, viewportHeight - chatTabRect.bottom), onChat: true };
}

// The Notes button's place in the game's title bar, after the name and setting icons, or null when the
// bar isn't there or a long name leaves no room before what war.app shows on the bar's right.
function gameNotesTitleSpot(bar, after, obstacles, width, height) {
    if (!bar || !after || bar.width <= 0 || bar.height <= 0) {
        return null;
    }
    var left = after.right + 10;
    var limit = obstacles.filter(function (edge) {
        return edge > after.right + 2;
    }).reduce(function (lowest, edge) {
        return Math.min(lowest, edge);
    }, bar.right);
    if (left + width > limit - 8) {
        return null;
    }
    return { left: Math.round(left), top: Math.round(bar.top + (bar.height - height) / 2), barBottom: Math.round(bar.bottom) };
}

// The title bar, what the button follows (the setting icons, or the name), and the left edges of what
// else war.app shows on the bar.
function gameTitleBarRects() {
    var bar = $("[id^='ujs_TopBar'][id$='_img']").filter(function () {
        return /^ujs_TopBar(?:_\d+)?_img$/.test(this.id) && shownUjsElement(this);
    })[0];
    var name = $("[id^='ujs_GameNameLabel'][id$='_tmp']").filter(function () {
        return shownUjsElement(this);
    })[0];
    if (!bar || !name) {
        return null;
    }
    var icons = $("[id^='ujs_SettingsIconsContainer'][id$='_img']").filter(function () {
        return shownUjsElement(this) && this.getBoundingClientRect().width > 0;
    })[0];
    var after = (icons || name).getBoundingClientRect();
    var barRect = bar.getBoundingClientRect();
    var obstacles = $(bar).parent().find("*").not("#tuydGameNotesBtn").get().filter(function (element) {
        var rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.width < barRect.width * 0.8 && rect.top < barRect.bottom && rect.bottom > barRect.top;
    }).map(function (element) {
        return element.getBoundingClientRect().left;
    });
    return { bar: barRect, after: after, obstacles: obstacles };
}

function openGameChatTabRect() {
    var chat = $("[id^='ujs_Chat']").filter(function () {
        return /^ujs_Chat(?:_\d+)?$/.test(this.id);
    }).first();
    var tab = $("#ujs_ChatCollapseButton_btn");
    if (!chat.length || !tab.length || !shownUjsElement(chat[0]) || !shownUjsElement(tab[0])) {
        return null;
    }
    var rect = tab[0].getBoundingClientRect();
    return rect.height > 0 ? { left: rect.left, bottom: rect.bottom, height: rect.height } : null;
}

function setupGameNotes() {
    addCSS(`
        #tuydGameNotesBtn {
            position: fixed;
            left: 96px;
            bottom: 10px;
            z-index: 50;
            pointer-events: auto;
        }
        #tuydGameNotesBtn.tuydOnChat {
            padding: 0 8px;
            font-size: 12px;
            line-height: 17px;
        }
        #tuydGameNotesBtn.tuydHasNotes:after {
            content: "●";
            margin-left: 5px;
            color: #e0c060;
        }
        #tuydGameNotes {
            position: fixed;
            left: 8px;
            bottom: 56px;
            z-index: 51;
            width: 320px;
            max-width: calc(100vw - 16px);
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            padding: 8px 10px;
            border: 1px solid #555;
            border-radius: 6px;
            background: #1b1b1b;
            color: #ccc;
            font-size: 13px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
            pointer-events: auto;
        }
        #tuydGameNotes .tuydGameNotesHead {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 6px;
            color: #fff;
            font-weight: 700;
        }
        #tuydGameNotes .tuydGameNotesSaved {
            color: #888;
            font-size: 12px;
            font-weight: normal;
        }
        #tuydGameNotes .tuydGameNotesClose {
            margin-left: auto;
            color: #aaa;
            font-size: 18px;
            text-decoration: none;
        }
        #tuydGameNotes textarea, #tuydGameNotes select {
            background: #222;
            color: #ddd;
            border: 1px solid #555;
        }
        #tuydGameNotes textarea {
            display: block;
            width: 100%;
            padding: 3px 5px;
            resize: vertical;
        }
        #tuydGameNotes label {
            display: block;
            margin: 8px 0 0;
            font-weight: normal;
        }
        #tuydGameNotes .tuydGameNotesTurn {
            display: block;
            margin-top: 2px;
            color: #e0c060;
        }
        #tuydGameNotes .tuydGameNotesPlayers label {
            color: #fff;
        }
    `);
    var self = "";
    var gameId = null;
    var notes = normalizeGameNotes();
    var timer = null;
    var button = $('<a href="#" id="tuydGameNotesBtn" class="btn btn-primary btn-sm" title="Your private notes for this game (Muli\'s Userscript)">Notes</a>');
    // Keys typed into the notes must not reach war.app's game hotkeys, nor clicks its map.
    var isolate = function (element, keys) {
        element.on((keys ? "keydown keyup keypress " : "") + "pointerdown pointerup pointermove mousedown mouseup touchstart touchend wheel", function (event) {
            event.stopPropagation();
        });
        return element;
    };
    var save = function () {
        timer = null;
        var panel = $("#tuydGameNotes");
        if (!panel.length || !gameId) {
            return;
        }
        notes = readGameNotesPanel(panel, $("[id^='ujs_GameNameLabel']").first().text().trim() || notes.name);
        var key = gameNotesKey(gameId);
        (gameNotesEmpty(notes) ? Database.delete(Database.Table.Settings, key) : Database.update(Database.Table.Settings, { name: key, value: notes }, undefined)).then(function () {
            panel.find(".tuydGameNotesSaved").text("Saved");
        });
        button.toggleClass("tuydHasNotes", !gameNotesEmpty(notes));
    };
    var spot = null;
    // In the title bar the button is never in the chat's or war.app's way; without room there it sits by
    // the Game button, or left of the Chat tab while the chat is open.
    var place = function () {
        var rects = gameTitleBarRects();
        button.addClass("tuydOnChat");
        var title = rects ? gameNotesTitleSpot(rects.bar, rects.after, rects.obstacles, button.outerWidth(), button.outerHeight()) : null;
        var panel = $("#tuydGameNotes");
        var next;
        if (title) {
            next = { key: "title:" + title.left + ":" + title.top, button: { left: title.left, top: title.top, bottom: "auto" }, panel: { left: Math.max(8, title.left - 160), top: title.barBottom + 6, bottom: "auto" } };
        } else {
            var tab = openGameChatTabRect();
            button.toggleClass("tuydOnChat", !!tab);
            var corner = gameNotesButtonSpot(tab, window.innerHeight, button.outerWidth());
            next = { key: "corner:" + corner.left + ":" + corner.bottom, button: { left: corner.left, bottom: corner.bottom, top: "auto" }, panel: { left: corner.onChat ? Math.max(8, corner.left - 160) : 8, bottom: corner.bottom + (corner.onChat ? 24 : 46), top: "auto" } };
        }
        if (spot === next.key && panel.attr("data-placed")) {
            return;
        }
        spot = next.key;
        button.css(next.button);
        panel.attr("data-placed", "1").css(next.panel);
    };
    var placing = null;
    var showTurn = function () {
        var panel = $("#tuydGameNotes");
        panel.find(".tuydGameNotesTurn").text(gameFirstMoveText(panel.find("select[name=firstMove]").val(), gameTurnNumber()));
    };
    var open = function () {
        var panel = isolate($('<div id="tuydGameNotes"></div>'), true).html(gameNotesHtml(notes, gamePlayerNames(self)));
        $("body").append(panel);
        place();
        showTurn();
        panel.find("textarea[name=text]").trigger("focus");
    };
    var close = function () {
        if (timer) {
            clearTimeout(timer);
            save();
        }
        $("#tuydGameNotes").remove();
    };
    var load = function () {
        var id = (/[?&]GameID=(\d+)/i.exec(location.search) || [])[1] || null;
        if (id === gameId) {
            return;
        }
        close();
        gameId = id;
        notes = normalizeGameNotes();
        button.toggle(!!id).removeClass("tuydHasNotes");
        if (!id) {
            return;
        }
        Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, gameNotesKey(id), function (setting) {
            if (gameId === id) {
                notes = normalizeGameNotes(setting && setting.value);
                button.toggleClass("tuydHasNotes", !gameNotesEmpty(notes));
            }
        });
    };
    $("body").append(isolate(button, false));
    button.on("click", function (event) {
        event.preventDefault();
        this.blur();
        if ($("#tuydGameNotes").length) {
            close();
        } else {
            open();
        }
    });
    // war.app's map doesn't take the focus on a click, so typing would stay in the notes; a click
    // anywhere else hands the keyboard back to war.app.
    document.addEventListener("pointerdown", function (event) {
        var active = document.activeElement;
        if (active && $(active).closest("#tuydGameNotes, #tuydGameNotesBtn").length && !$(event.target).closest("#tuydGameNotes, #tuydGameNotesBtn").length) {
            active.blur();
        }
    }, true);
    $(document).on("input change", "#tuydGameNotes textarea, #tuydGameNotes select", function () {
        $("#tuydGameNotes .tuydGameNotesSaved").text("");
        showTurn();
        clearTimeout(timer);
        timer = setTimeout(save, 600);
    }).on("click", "#tuydGameNotes .tuydGameNotesClose", function (event) {
        event.preventDefault();
        close();
    });
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            self = player && player.Name || "";
        });
    }
    load();
    place();
    // war.app slides the chat open and closed by changing styles.
    new MutationObserver(function () {
        if (!placing) {
            placing = setTimeout(function () {
                placing = null;
                place();
            }, 100);
        }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    // war.app can move to another game without loading a page, and lays out the title bar shortly after
    // the button is first placed.
    setInterval(function () {
        load();
        showTurn();
        place();
    }, 1000);
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
    createSelector("#OpenGamesTable label[id$='Radio']:hover", " border: 1px solid #59b4d4;background: #0078a3 50% 50% repeat-x;font-weight: bold;color: #ffffff;");
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
    if (pageIsExamineMap() || pageIsDesignMap()) {
        return;
    }
    $("body").append('<div class="versionLabel" data-toggle="modal" data-target="#userscriptMenu">' + version + '</div>');
    createSelector(".versionLabel", "z-index:101;position:fixed; right:0; bottom: 0; padding: 5px; color: bisque; font-size: 10px; cursor:pointer");
    // In a game the label would sit on the game's own buttons, so it shows only while the game is still a
    // lobby. war.app turns a lobby into the game without loading a new page; its title says which.
    if (pageIsGame()) {
        createSelector("body.tuydInGame .versionLabel", "display: none !important");
        var sync = function () {
            $("body").toggleClass("tuydInGame", !/^Lobby\b/.test(document.title));
        };
        sync();
        var title = document.querySelector("title");
        if (title) {
            new MutationObserver(sync).observe(title, { childList: true, characterData: true, subtree: true });
        }
    }
}
function parseScriptVersion(source) {
    var match = /^\/\/\s*@version\s+(\S+)/m.exec(String(source || ""));
    return match ? match[1] : null;
}

function compareVersions(a, b) {
    var left = String(a).split(".");
    var right = String(b).split(".");
    for (var i = 0; i < Math.max(left.length, right.length); i++) {
        var diff = (parseInt(left[i], 10) || 0) - (parseInt(right[i], 10) || 0);
        if (diff) {
            return diff > 0 ? 1 : -1;
        }
    }
    return 0;
}

// Resolves with the version on GitHub, read at most once a day; GitHub serves the file to any site.
function latestScriptVersion() {
    var cached = null;
    try {
        cached = JSON.parse(localStorage.getItem(UPDATE_CHECK_KEY));
    } catch (e) {
    }
    if (cached && Date.now() - cached.at < (cached.failed ? UPDATE_RETRY_MS : UPDATE_CHECK_MS)) {
        return $.Deferred().resolve(cached.latest || null).promise();
    }
    var remember = function (entry) {
        try {
            localStorage.setItem(UPDATE_CHECK_KEY, JSON.stringify(entry));
        } catch (e) {
        }
    };
    var result = $.Deferred();
    $.ajax({ url: SCRIPT_URL, dataType: "text" }).done(function (source) {
        var latest = parseScriptVersion(source);
        remember({ at: Date.now(), latest: latest });
        result.resolve(latest);
    }).fail(function (xhr) {
        log("Error checking for a new version: " + (xhr && xhr.statusText));
        remember({ at: Date.now(), latest: cached && cached.latest, failed: true });
        result.resolve(cached && cached.latest || null);
    });
    return result.promise();
}

// Only the corner version label changes: it turns into a gold link that updates the script.
function setupUpdateNotice() {
    latestScriptVersion().done(function (latest) {
        var label = $(".versionLabel").not(".updateAvailable");
        if (!latest || compareVersions(latest, version) <= 0 || !label.length) {
            return;
        }
        label.replaceWith(renderUpdateLabel(latest));
        createSelector(".versionLabel.updateAvailable", "color: #e0c060 !important; font-weight: bold; text-decoration: none !important");
    });
}

// Opening the .user.js file is what makes Tampermonkey show its update screen.
function renderUpdateLabel(latest) {
    return '<a class="versionLabel updateAvailable" target="_blank" rel="noopener" href="' + htmlEscape(SCRIPT_URL) + '" title="Version ' + htmlEscape(latest) +
        ' is available (you have ' + htmlEscape(version) + '). Click to update.">Update to ' + htmlEscape(latest) + '</a>';
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
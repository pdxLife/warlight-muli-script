// ==UserScript==
// @name Tidy up your Dashboard - Modified 
// @namespace https://greasyfork.org/users/10154
// @grant none
// @run-at document-start
// @match https://*.war.app/*
// @description Tidy Up Your Dashboard is a Userscript which brings along a lot of features for improving the user experience on War.app (formerly Warzone).
// @version 3.60.1
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
// Built from src/ by tools/build.js. Edit src/, then run npm run build.
window.timeUserscriptStart = new Date().getTime();
window.MULIS_USERSCRIPT = true;
var version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '3.60.1';
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
// The players' series on the Ladders page, in order after the AWP World Tour and the MTL: P/R League,
// Titled Tuesday, then the Seasonal Ladder.
var PLAYER_SERIES_KINDS = ["league", "events", "ladder"];
var STAGED_SERIES_KINDS = ["clan_cup", "nations_cup"];
var COMMUNITY_PAGE_SERIES = ["titled-tuesday", "pr-league", "seasonal-ladder", "clan-league", "nations-cup"];
var COMMUNITY_PAGE_BLOG_POSTS = 5;
var MTL_TOP_COUNT = 10;
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
var PAST_TOURNAMENTS_FEATURE = "Search all your past tournaments";
var CLAN_WAR_PROGRESS_FEATURE = "Your clan's progress on the Clan War page";
var CLAN_WAR_PLAYERS_FEATURE = "Win rates and today's games on Clan War players";
var CLAN_WAR_TIMESLOT_FEATURE = "Your record on each template in Clan War timeslots";
var CLAN_WAR_CLAN_FEATURE = "Records by template and opponent on Clan War clans";
var OPEN_TOURNAMENTS_FILTER_KEY = "tidyUpYourDashboard.openTournamentsFilter";
var OPEN_TOURNAMENTS_FILTER_MIN = 6;
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
if (disabledFeatures().indexOf(PAST_TOURNAMENTS_FEATURE) === -1) {
    watchMyTournamentsRequests();
}
if ([CLAN_WAR_PROGRESS_FEATURE, CLAN_WAR_PLAYERS_FEATURE, CLAN_WAR_TIMESLOT_FEATURE, CLAN_WAR_CLAN_FEATURE].some(function (name) {
    return disabledFeatures().indexOf(name) === -1;
})) {
    watchClanWarTraffic();
}

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

function getRankText(n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
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
                log(`Saved ${JSON.stringify(value).slice(0, 300)} in ${table}`);
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

// war.app plays its sounds as HTML audio, often from elements outside the page, so a volume is applied
// where every element's volume is set: each one keeps the volume war.app asked for, times factor(element).
// Returns a function that re-applies it to the sounds played so far, or null when the browser won't allow it.
function scaleAudioVolume(factor) {
    var native = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    if (!native || !native.set) {
        return null;
    }
    var asked = new WeakMap();
    var known = [];
    var apply = function (element) {
        if (!asked.has(element)) {
            asked.set(element, native.get.call(element));
        }
        native.set.call(element, asked.get(element) * factor(element));
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
    return function () {
        known.forEach(apply);
    };
}

function setupIdleVolume() {
    var level = idleVolumeLevel();
    var refresh = scaleAudioVolume(function () {
        return level;
    });
    if (!refresh) {
        return;
    }
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
            refresh();
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

// war.app's sounds for a new message (GameChat in games, Chat in the chat rooms) and for a turn
// (TurnAdvance, also played when a Quickmatch or other awaited game starts), by file name.
function gameSoundKind(url) {
    var match = /\/Audio\/(GameChat|Chat|TurnAdvance)\.mp3(?:[?#]|$)/i.exec(String(url || ""));
    if (!match) {
        return null;
    }
    return /TurnAdvance/i.test(match[1]) ? "turn" : "chat";
}

// A volume setting's stored percentage as a factor from 0 to 1; full volume when unset or unreadable.
function volumeSettingLevel(value) {
    var percent = typeof value === "number" ? value : parseFloat(value);
    return isNaN(percent) ? 1 : Math.max(0, Math.min(100, percent)) / 100;
}

var GAME_SOUND_SETTINGS = { chat: "chatSoundVolume", turn: "turnSoundVolume" };

function soundSliderHtml(kind, label, title) {
    return '<label class="tuydSoundSlider" data-sound="' + kind + '" title="' + title + ' (Muli\'s Userscript)"><span class="tuydSoundLabel">' + label + '</span>' +
        '<input type="range" min="0" max="100" step="5" aria-label="' + title + '"><span class="tuydSoundValue"></span></label>';
}

function setupGameSoundVolume() {
    var levels = { chat: 1, turn: 1 };
    var refresh = null;
    var channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("tidyUpYourDashboard.soundVolume") : null;
    var apply = function () {
        if (!refresh && (levels.chat < 1 || levels.turn < 1)) {
            refresh = scaleAudioVolume(function (element) {
                var kind = gameSoundKind(element.currentSrc || element.src);
                return kind ? levels[kind] : 1;
            });
        }
        if (refresh) {
            refresh();
        }
    };
    var show = function (scope) {
        $(scope || document).find(".tuydSoundSlider").addBack(".tuydSoundSlider").each(function () {
            var percent = Math.round(levels[$(this).attr("data-sound")] * 100);
            $(this).find("input").val(percent);
            $(this).find(".tuydSoundValue").text(percent + "%");
        });
    };
    // The settings menu saves every input it holds on any change, so it has to hold the level too.
    var setLevel = function (kind, percent) {
        if (!GAME_SOUND_SETTINGS.hasOwnProperty(kind)) {
            return;
        }
        levels[kind] = volumeSettingLevel(percent);
        apply();
        show();
        var input = $("#" + GAME_SOUND_SETTINGS[kind]);
        if (input.length && Number(input.val()) !== Math.round(levels[kind] * 100)) {
            showVolumeSetting(input.val(Math.round(levels[kind] * 100)));
        }
    };
    var tell = function (kind) {
        if (channel) {
            channel.postMessage({ kind: kind, value: Math.round(levels[kind] * 100) });
        }
    };
    var save = function (kind) {
        Database.update(Database.Table.Settings, { name: GAME_SOUND_SETTINGS[kind], value: Math.round(levels[kind] * 100) }, undefined);
        tell(kind);
    };
    var menuKind = function (input) {
        return Object.keys(GAME_SOUND_SETTINGS).filter(function (kind) {
            return GAME_SOUND_SETTINGS[kind] === input.id;
        })[0];
    };
    Promise.all(Object.keys(GAME_SOUND_SETTINGS).map(function (kind) {
        return Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, GAME_SOUND_SETTINGS[kind]).then(function (setting) {
            levels[kind] = volumeSettingLevel(setting && setting.value);
        });
    })).then(function () {
        apply();
        if (channel) {
            channel.onmessage = function (event) {
                setLevel(event.data && event.data.kind, event.data && event.data.value);
            };
        }
        $(document).on("input", "#userscriptMenu .volumeSetting input", function () {
            setLevel(menuKind(this), this.value);
        }).on("change", "#userscriptMenu .volumeSetting input", function () {
            // The menu saves it itself.
            tell(menuKind(this));
        });
        if (pageIsGame() || pageIsChatRoom()) {
            setupSoundSliders(setLevel, save, show);
        }
    });
}

function setupSoundSliders(setLevel, save, show) {
    addCSS(`
        .tuydSoundSlider {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin: 0;
            color: #ddd;
            font-size: 12px;
            font-weight: normal;
            white-space: nowrap;
            pointer-events: auto;
        }
        .tuydSoundSlider input[type=range] {
            width: 80px;
            margin: 0;
            accent-color: #e0c060;
        }
        .tuydSoundValue {
            min-width: 2.8em;
            color: #aaa;
            text-align: right;
        }
        #tuydSoundBtn {
            margin-left: 4px;
            font-size: 12px;
            text-decoration: none;
        }
        #tuydSoundPanel {
            position: fixed;
            z-index: 1060;
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 8px 10px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #1b1b1b;
            color: #ddd;
            font-size: 12px;
            pointer-events: auto;
        }
        #tuydSoundPanel .tuydSoundLabel {
            min-width: 3em;
        }
        #tuydSoundPanel .tuydSoundNote {
            color: #888;
            font-size: 11px;
        }
    `);
    $(document).on("input", ".tuydSoundSlider input", function () {
        setLevel($(this).closest(".tuydSoundSlider").attr("data-sound"), this.value);
    }).on("change", ".tuydSoundSlider input", function () {
        save($(this).closest(".tuydSoundSlider").attr("data-sound"));
    }).on("keydown keyup keypress", ".tuydSoundSlider, #tuydSoundPanel", function (event) {
        event.stopPropagation();
    }).on("click", "#tuydSoundBtn", function (event) {
        event.preventDefault();
        if ($("#tuydSoundPanel").length) {
            $("#tuydSoundPanel").remove();
            return;
        }
        var rect = this.getBoundingClientRect();
        var panel = $('<div id="tuydSoundPanel"></div>').append(soundSliderHtml("chat", "Chat", "Chat sound volume"), soundSliderHtml("turn", "Turn", "Turn sound volume"),
            '<div class="tuydSoundNote">On top of war.app\'s App Settings volumes</div>').css({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
        $("body").append(panel);
        show(panel);
    }).on("mousedown", function (event) {
        if (!$(event.target).closest("#tuydSoundPanel, #tuydSoundBtn").length) {
            $("#tuydSoundPanel").remove();
        }
    });
    var speaker = $("#SoundContainer");
    if (speaker.length && !$("#tuydSoundBtn").length) {
        speaker.after('<a href="#" id="tuydSoundBtn" title="Volume of the chat and turn sounds (Muli\'s Userscript)">🔔</a>');
    }
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
        id: 'sortTurnsByWaiting',
        text: 'Sort Your-Turn Games by How Long They Have Waited',
        selected: false,
        section: 'Dashboard',
        help: 'Your-turn games are sorted by the time left before war.app boots you, the most urgent first. With this on, they are sorted by how long it has been your turn instead, the longest first. Turn off "Sort your-turn games by time left before boot" to keep war.app\'s own order.'
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
        id: 'chatSoundVolume',
        text: 'Chat Sound Volume',
        volume: true,
        selected: 100,
        section: 'Games',
        help: 'How loud war.app\'s sound for a new chat message plays, in games and in the chat rooms, as a share of war.app\'s own volume. War.app\'s App Settings have one volume for all of its sounds (Sounds) and one for important ones such as the turn sound (Critical Sounds); this turns only the chat sound down on top of those. 0% silences it.'
    },
    {
        id: 'turnSoundVolume',
        text: 'Turn Sound Volume',
        volume: true,
        selected: 100,
        section: 'Games',
        help: 'How loud war.app\'s turn sound plays, as a share of war.app\'s Critical Sounds volume (App Settings). War.app plays it when a game advances to the next turn, and when a Quickmatch or another game you were waiting for starts. The clock ticking in the last 30 seconds is not changed. 0% silences it.'
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
        id: 'pastTournamentsSearch',
        text: 'Past Tournaments: Search Your Whole List',
        selected: false,
        section: 'Tournaments',
        help: 'Past Tournaments lists every tournament you were invited to, 30 at a time, with no search. With this on, its Search button searches and filters all of them. The script reads your whole list from war.app (about a second for each 1,000 tournaments), keeps it in this browser and brings it up to date each time you open Past Tournaments. Turning this off deletes the list from this browser.'
    },
    {
        id: 'useMaakServices',
        text: 'Load Community Level Records (via maak.ch)',
        selected: false,
        section: 'Third-party data',
        help: 'Shows the community level record count on profiles. (MTL and Seasonal Ladder figures on profiles, the Ladders page, the Community page and in MTL threads come from custom.wl-stats.com and need no setting.) This data is loaded from maak.ch, a server run by the original script author, which can run code on War.app while it loads. Leave this off unless you trust that server.'
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
        .volumeSetting {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            float: right;
            margin: 0 30px 0 0;
            font-weight: normal;
        }
        .volumeSetting input {
            width: 120px;
        }
        .volumeSettingValue {
            min-width: 3em;
            text-align: right;
            color: #aaa;
            font-size: 13px;
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
                <span class="mr-auto text-muted" style="font-size: 13px">Maintained by <a href="/Profile?p=2921525624" target="_blank" rel="noopener">KKND</a> · <a href="/Forum/897130-mulis-userscript-update" target="_blank" rel="noopener">Forum thread</a> · <a href="https://discord.gg/sc99xHNuE" target="_blank" rel="noopener">Discord</a></span>
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
    }).on("input", ".volumeSetting input", function () {
        showVolumeSetting(this);
    });
    $("#AccountDropDown").next(".dropdown-menu").append('<div class="dropdown-divider"></div><a class="dropdown-item " href="#" data-toggle="modal" data-target="#userscriptMenu">Muli\'s Userscript</a>');
    $(".close-userscript").on("click", function () {
        location.reload();
    });
    $("#userscriptMenu .menuSection[data-section='Dashboard'] > .menuSectionBody").append('<button class="btn btn-primary" data-menu-dialog="#dashboardTableSortMenu" style="margin-top:15px;">Sort Right Column Tables</button>');
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
    $(".userscriptSettingsButtons").append('<button data-menu-dialog="#userscriptExportSettings" id="exportSettings" class="btn btn-primary">Export Settings</button>');
    //Import settings button
    $(".userscriptSettingsButtons").append('<button data-menu-dialog="#userscriptImportSettings" class="btn btn-primary">Import Settings</button>');
    $("#userscriptMenu").on("click", "[data-menu-dialog]", function () {
        openFromSettingsMenu($(this).attr("data-menu-dialog"));
    });
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

// Bootstrap can't keep one dialog open on top of another: closing the top one marks the page as having no
// dialog open, and the settings menu left under it stops scrolling and taking clicks. So the menu closes
// while one of its dialogs is open, and opens again when that dialog closes.
function openFromSettingsMenu(target) {
    var menu = $("#userscriptMenu");
    menu.one("hidden.bs.modal", function () {
        $(target).one("hidden.bs.modal", function () {
            menu.modal("show");
        }).modal("show");
    }).modal("hide");
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
            var value = setting ? setting.value : set.selected;
            if (set.volume) {
                showVolumeSetting($("#" + set.id).val(Math.round(volumeSettingLevel(value) * 100)));
            } else {
                $("#" + set.id).prop("checked", value);
            }
        })
    });
}

function showVolumeSetting(input) {
    $(input).next(".volumeSettingValue").text($(input).val() + "%");
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
        var control = setting.volume ?
            '<label class="volumeSetting"><input id="' + setting.id + '" type="range" min="0" max="100" step="5" aria-label="' + htmlEscape(setting.text) + '"><span class="volumeSettingValue"></span></label>' :
            '<label class="switch"><input id="' + setting.id + '" type="checkbox"><div class="slider round"></div></label>';
        add(setting.section || "Other", '<div class="settingsListItem">' + setting.text + helpIcon(setting) + control + '</div>');
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
        var setting = {
            name: set.id,
            value: set.volume ? Number($("#" + set.id).val()) : $("#" + set.id).prop("checked")
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
var GAME_TEMPLATE_FRAME_ID = "tuydGameTemplateFrame";

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

// The script's own hidden game frames: the dashboard's game chat, and Quickmatch stats reading a game's
// template.
function inScriptFrame() {
    try {
        return !!window.frameElement && [GAME_CHAT_FRAME_ID, GAME_TEMPLATE_FRAME_ID].indexOf(window.frameElement.id) !== -1;
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

// War.app's client-drawn pages (Quickmatch, tournaments, ladders, chat rooms) can open a game without a page load.
function pageCanOpenGame() {
    return pageIsGame() || pageIsQuickmatch() || (!pageIsIdle() && document.getElementById("UjsCanvasHolder") !== null);
}

// A page war.app draws client-side, which can switch to another such scene (Tournaments → Past Tournaments) in place.
function pageHasUjsScenes() {
    return document.getElementById("UjsCanvasHolder") !== null;
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

function pageIsCommunityHome() {
    return location.href.match(/^https?:\/\/[^\/]+\/Community\/?(?:[?#].*)?$/i);
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

// War.app's Clan War requests carry your sign-in, so the latest one is kept in memory only, never stored.
var clanWarTraffic = { request: null, answers: {} };
var clanWarCache = {};
var CLAN_WAR_CACHE_MS = 3 * 60 * 1000;
var CLAN_WAR_SCHEDULE_KEY = "tuydClanWarSchedule";
var MAP_TERRITORIES_KEY = "tuydMapTerritories";
var DAY_MS = 24 * 60 * 60 * 1000;

function watchClanWarTraffic() {
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        var match = /[?&]m=(GetClanWar\w*)/.exec(String(url));
        this.tuydClanWar = match ? match[1] : null;
        return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
        var service = this.tuydClanWar;
        if (service && typeof body === "string") {
            if (serviceRequestParts(body)) {
                clanWarTraffic.request = body;
            }
            this.addEventListener("load", function () {
                clanWarTraffic.answers[service] = { body: body, text: this.responseText };
                document.dispatchEvent(new CustomEvent("tuyd:clanWarAnswer", { detail: service }));
            });
        }
        return send.apply(this, arguments);
    };
}

function hexBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

function littleEndianHex(number) {
    return [0, 8, 16, 24].map(function (shift) {
        return ("0" + ((number >>> shift) & 255).toString(16)).slice(-2);
    }).join("").toUpperCase();
}

// Dates count milliseconds from the start of 2000. War.app sends its lists and dictionaries as optional values, with
// each list item optional too (items() and map()).
function binaryReader(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var decoder = new TextDecoder("utf-8", { fatal: true });
    var r = { p: 0, length: bytes.length };
    var need = function (n) {
        if (r.p + n > bytes.length) {
            throw new Error("war.app's data ends early");
        }
    };
    r.byte = function () {
        need(1);
        return bytes[r.p++];
    };
    r.bool = function () {
        return r.byte() !== 0;
    };
    r.int = function () {
        need(4);
        r.p += 4;
        return view.getInt32(r.p - 4, true);
    };
    r.short = function () {
        need(2);
        r.p += 2;
        return view.getUint16(r.p - 2, true);
    };
    r.double = function () {
        need(8);
        r.p += 8;
        return view.getFloat64(r.p - 8, true);
    };
    r.date = function () {
        return Date.UTC(2000, 0, 1) + r.double();
    };
    r.skip = function (n) {
        need(n);
        r.p += n;
    };
    r.text = function () {
        if (!r.bool()) {
            return null;
        }
        var length = 0;
        var shift = 0;
        var b;
        do {
            b = r.byte();
            length |= (b & 127) << shift;
            shift += 7;
        } while (b & 128 && shift < 35);
        need(length);
        r.p += length;
        return decoder.decode(bytes.subarray(r.p - length, r.p));
    };
    r.optional = function (read) {
        return r.bool() ? read() : null;
    };
    r.list = function (item) {
        var count = r.int();
        if (count === -1) {
            return null;
        }
        var items = [];
        for (var i = 0; i < count; i++) {
            items.push(item());
        }
        return items;
    };
    r.dict = function (key, value) {
        var count = r.int();
        if (count === -1) {
            return null;
        }
        var items = {};
        for (var i = 0; i < count; i++) {
            var k = key();
            items[k] = value();
        }
        return items;
    };
    r.items = function (item) {
        return (r.optional(function () {
            return r.list(function () {
                return r.optional(item);
            });
        }) || []).filter(function (x) {
            return x !== null;
        });
    };
    r.map = function (key, value) {
        return r.optional(function () {
            return r.dict(key, value);
        }) || {};
    };
    return r;
}

function readServiceReply(hex, op, readBody, partial) {
    hex = String(hex || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
        return null;
    }
    var r = binaryReader(hexBytes(hex));
    try {
        r.p = 2;
        if (r.int() !== 1514664249) {
            return null;
        }
        r.int();
        if (r.int() !== op) {
            return null;
        }
        if (r.byte() === 1) {
            r.optional(function () {
                r.list(function () {
                    r.int();
                    r.text();
                });
            });
            r.optional(r.int);
            r.text();
            r.optional(function () {
                r.text();
                r.text();
                r.int();
                r.optional(function () {
                    r.text();
                    r.int();
                    r.double();
                    r.text();
                    r.text();
                });
                r.int();
            });
            r.optional(function () {
                r.list(function () {
                    r.int();
                    r.optional(function () {
                        r.list(r.text);
                    });
                });
            });
            r.optional(function () {
                r.bool();
                r.double();
                r.bool();
            });
        }
        if (r.byte() === 5 || !r.bool()) {
            return null;
        }
        var body = readBody(r);
        return partial || r.p === r.length ? body : null;
    } catch (e) {
        return null;
    }
}

// The account record before the arguments ends with the email address, so a byte that can't end an email tells
// the two shapes apart.
var CLAN_WAR_ARGUMENT_BYTES = {
    305: function (bytes) {
        var n = bytes.length;
        return bytes[n - 5] === 1 && bytes[n - 2] === 0 && bytes[n - 1] === 0 ? 5 : 1;
    },
    306: 4,
    307: 8,
    308: function (bytes) {
        var n = bytes.length;
        return bytes[n - 13] === 1 && bytes[n - 14] === 0 ? 17 : 13;
    },
    309: 12,
    310: 4
};

function serviceRequestParts(body) {
    var hex = String(body || "").trim().toUpperCase();
    if (!/^(?:[0-9A-F]{2})+$/.test(hex) || hex.length < 40 || hex.substr(4, 8) !== "39F1475A") {
        return null;
    }
    var bytes = hexBytes(hex);
    var r = binaryReader(bytes);
    try {
        r.p = 10;
        var argBytes = CLAN_WAR_ARGUMENT_BYTES[r.int()];
        if (!argBytes) {
            return null;
        }
        r.optional(function () {
            r.dict(r.int, r.text);
        });
        r.text();
        r.int();
        r.int();
        r.double();
        r.double();
        r.int();
        var accountStart = r.p;
        var accountEnd = bytes.length - (typeof argBytes === "function" ? argBytes(bytes) : argBytes);
        if (bytes[accountStart] !== 1 || accountEnd <= accountStart + 1) {
            return null;
        }
        return { head: hex.slice(0, 20), extras: hex.slice(28, accountStart * 2), account: hex.slice(accountStart * 2, accountEnd * 2) };
    } catch (e) {
        return null;
    }
}

function serviceRequest(parts, op, args, withAccount) {
    return parts.head + littleEndianHex(op) + parts.extras + (withAccount ? parts.account : "") + args;
}

function fetchClanWarService(name, op, args, parse, withAccount) {
    var seen = clanWarTraffic.answers[name];
    if (seen && String(seen.body).toUpperCase().slice(-args.length) === args) {
        var data = parse(seen.text);
        if (data) {
            return Promise.resolve(data);
        }
    }
    var key = name + ":" + args;
    var cached = clanWarCache[key];
    if (cached && Date.now() - cached.at < CLAN_WAR_CACHE_MS) {
        return cached.promise;
    }
    var parts = serviceRequestParts(clanWarTraffic.request);
    if (!parts) {
        return Promise.reject(new Error("war.app hasn't sent a Clan War request yet"));
    }
    // fetch, not XMLHttpRequest, so watchClanWarTraffic doesn't take the script's own requests for war.app's.
    var promise = fetch("/Services?m=" + name + "&js=1", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: serviceRequest(parts, op, args, withAccount !== false)
    }).then(function (response) {
        if (!response.ok) {
            throw new Error("war.app answered " + response.status);
        }
        return response.text();
    }).then(function (hex) {
        var result = parse(hex);
        if (!result) {
            throw new Error("war.app's " + name + " answer couldn't be read");
        }
        return result;
    });
    clanWarCache[key] = { at: Date.now(), promise: promise };
    promise.catch(function () {
        delete clanWarCache[key];
    });
    return promise;
}

function fetchClanWar(season) {
    return fetchClanWarService("GetClanWar", 305, season ? "01" + littleEndianHex(season) : "00", parseClanWarReply);
}

function fetchClanWarGames(season, clan) {
    return fetchClanWarService("GetClanWarGames", 308, littleEndianHex(season) + "01" + littleEndianHex(clan) + littleEndianHex(0) + littleEndianHex(2147483647), parseClanWarGamesReply);
}

function fetchClanWarMap(season) {
    return fetchClanWarService("GetClanWarMap", 306, littleEndianHex(season), parseClanWarMapReply);
}

// A map's territory count only changes when its author edits it, so it's kept for good.
function fetchMapTerritoryCount(mapId) {
    var known = {};
    try {
        known = JSON.parse(localStorage.getItem(MAP_TERRITORIES_KEY)) || {};
    } catch (e) {
        known = {};
    }
    if (known[mapId] > 0) {
        return Promise.resolve(known[mapId]);
    }
    return fetchClanWarService("GetMapDetails", 73, littleEndianHex(mapId), function (hex) {
        var map = parseMapDetailsSummary(hex);
        return map && map.id === mapId ? map.territories : null;
    }, false).then(function (count) {
        known[mapId] = count;
        try {
            localStorage.setItem(MAP_TERRITORIES_KEY, JSON.stringify(known));
        } catch (e) {
        }
        return count;
    });
}

function readClanWarParts(r) {
    var parts = {};
    parts.clan = function () {
        r.int();
        r.int();
        r.date();
        var icon = r.int();
        var id = r.int();
        r.bool();
        r.optional(r.int);
        var name = r.text() || "";
        r.optional(r.date);
        r.int();
        r.text();
        return { id: id, name: name, icon: icon };
    };
    parts.standing = function () {
        var clan = r.int();
        var season = r.int();
        r.optional(r.int);
        r.int();
        var participantsToday = r.int();
        var pointsToday = r.double();
        var winsToday = r.int();
        r.double();
        var rank = r.optional(r.int);
        r.optional(r.int);
        r.text();
        var pointsBefore = r.double();
        return {
            clan: clan, season: season, participantsToday: participantsToday, pointsToday: pointsToday,
            winsToday: winsToday, rank: rank, pointsBefore: pointsBefore, points: pointsBefore + pointsToday
        };
    };
    parts.player = function () {
        var clan = r.optional(function () {
            var id = r.int();
            r.int();
            return { id: id, name: r.text() || "" };
        });
        r.optional(r.int);
        r.bool();
        r.int();
        var name = r.text() || "";
        r.int();
        r.int();
        r.int();
        return { name: name, clan: clan ? clan.id : null, clanName: clan ? clan.name : "" };
    };
    parts.players = function () {
        return r.map(r.int, function () {
            return r.optional(parts.player);
        });
    };
    parts.day = function () {
        var clan = r.int();
        r.int();
        var day = r.int();
        r.text();
        r.int();
        r.int();
        var wins = r.int();
        var points = r.double();
        r.double();
        return { clan: clan, day: day, wins: wins, points: points };
    };
    parts.game = function () {
        var gameId = r.optional(r.int);
        r.int();
        var sides = r.text();
        var day = r.optional(r.int);
        r.int();
        var template = r.int();
        r.int();
        var winner = r.optional(r.int);
        var clans = [];
        try {
            var data = JSON.parse(sides || "{}") || {};
            clans = Object.keys(data).map(function (clan) {
                return { clan: Number(clan), players: (data[clan] && data[clan].Players || []).map(Number) };
            });
        } catch (e) {
            clans = [];
        }
        return { gameId: gameId, day: day, template: template, winner: winner, clans: clans };
    };
    parts.season = function () {
        var started = r.date();
        r.int();
        var finished = r.optional(r.date);
        var id = r.int();
        r.date();
        var settings = {};
        try {
            settings = JSON.parse(r.text() || "{}") || {};
        } catch (e) {
            settings = {};
        }
        r.bool();
        r.int();
        return { id: id, started: started, finished: finished, settings: settings };
    };
    parts.gameSettings = function () {
        r.optional(r.double);
        r.bool();
        r.int();
        r.text();
        r.bool();
        r.bool();
        r.optional(r.int);
        r.double();
        r.bool();
        r.int();
        r.bool();
        r.bool();
        r.double();
        r.bool();
        r.double();
        r.int();
        r.byte();
        r.bool();
        r.bool();
        r.int();
        r.double();
        r.bool();
        r.bool();
        r.byte();
    };
    parts.template = function () {
        r.byte();
        r.text();
        r.byte();
        r.bool();
        var id = r.int();
        r.bool();
        r.int();
        r.int();
        var name = r.text() || "";
        r.optional(r.int);
        r.optional(parts.player);
        r.optional(r.int);
        r.optional(parts.gameSettings);
        r.optional(r.int);
        return { id: id, name: name };
    };
    parts.timeslotInfo = function () {
        var season = r.int();
        var at = r.date();
        var id = r.int();
        r.text();
        var started = r.bool();
        var starts = r.date();
        r.text();
        r.int();
        return { id: id, season: season, at: at, started: started, starts: starts };
    };
    parts.timeslot = function () {
        r.map(r.int, r.double);
        r.map(r.int, r.int);
        r.items(function () {
            r.int();
            r.text();
            r.map(r.int, r.int);
            r.int();
            return true;
        });
        r.map(r.int, r.int);
        parts.players();
        r.date();
        var templates = r.items(parts.template);
        var info = r.optional(parts.timeslotInfo);
        r.map(r.int, function () {
            return r.optional(function () {
                return r.list(r.int);
            });
        });
        var season = r.optional(parts.season);
        return { templates: templates, info: info, season: season };
    };
    return parts;
}

function parseClanWarReply(hex) {
    return readServiceReply(hex, 305, function (r) {
        var parts = readClanWarParts(r);
        var timeslot = r.optional(parts.timeslot);
        var standings = r.items(parts.standing);
        var clans = r.items(parts.clan);
        var firstTimeslot = r.date();
        var now = r.date();
        r.items(function () {
            r.optional(r.bool);
            r.optional(r.int);
            r.text();
            r.optional(parts.season);
            return true;
        });
        r.items(function () {
            r.optional(function () {
                return r.list(r.text);
            });
            r.optional(parts.season);
            return true;
        });
        var season = r.optional(parts.season);
        return season ? { timeslot: timeslot, standings: standings, clans: clans, firstTimeslot: firstTimeslot, now: now, season: season } : null;
    });
}

// Today's games have no day yet.
function parseClanWarGamesReply(hex) {
    return readServiceReply(hex, 308, function (r) {
        var parts = readClanWarParts(r);
        var days = r.items(parts.day);
        var games = r.items(parts.game);
        var players = parts.players();
        var templates = r.map(r.int, r.text);
        var total = r.int();
        return { days: days, games: games, players: players, templates: templates, total: total };
    });
}

function parseClanWarMapReply(hex) {
    return readServiceReply(hex, 306, function (r) {
        var parts = readClanWarParts(r);
        var clans = r.items(parts.clan);
        r.items(parts.standing);
        parts.players();
        var territories = r.items(function () {
            var clan = r.int();
            r.int();
            var at = r.date();
            r.text();
            var territory = r.int();
            return { clan: clan, at: at, territory: territory };
        });
        var season = r.optional(parts.season);
        return { clans: clans, territories: territories, season: season };
    });
}

// Only the territory count is wanted, and it comes after the bonuses, distributions and map family.
function parseMapDetailsSummary(hex) {
    return readServiceReply(hex, 73, function (r) {
        r.map(r.int, function () {
            return r.optional(function () {
                r.int();
                r.optional(function () {
                    r.skip(r.int());
                });
                r.int();
                r.text();
                r.optional(function () {
                    return r.list(r.int);
                });
                return true;
            });
        });
        r.date();
        r.int();
        r.map(r.int, function () {
            return r.optional(function () {
                var type = r.byte();
                if (type === 0) {
                    r.optional(function () {
                        return r.list(r.int);
                    });
                } else if (type === 1) {
                    r.map(r.short, r.text);
                    r.map(r.int, r.short);
                } else {
                    throw new Error("Unknown distribution " + type);
                }
                r.text();
                r.int();
                r.text();
                return true;
            });
        });
        r.optional(function () {
            r.int();
            r.date();
            r.date();
            r.optional(r.date);
            r.text();
            r.int();
            r.bool();
            r.date();
            r.text();
            r.text();
            r.int();
            r.optional(function () {
                return r.list(r.text);
            });
            r.int();
        });
        r.int();
        var id = r.int();
        r.date();
        r.optional(r.bool);
        r.byte();
        var territories = r.optional(r.int);
        return territories > 0 ? { id: id, territories: territories } : null;
    }, true);
}

// War.app's own order: by final rank once the season is over, else by points, then by clan ID.
function clanWarRanking(standings) {
    return standings.slice().sort(function (a, b) {
        if (a.rank !== null && b.rank !== null) {
            return a.rank - b.rank;
        }
        return b.points !== a.points ? b.points - a.points : a.clan - b.clan;
    }).map(function (standing, i) {
        return { clan: standing.clan, points: standing.points, place: i + 1 };
    });
}

// The first territory costs PointsPerTerritory[0] points, the next one [1] more, and so on; the last cost repeats.
function clanWarTerritoryCount(points, costs) {
    var count = 0;
    var spent = 0;
    while (Array.isArray(costs) && costs.length) {
        var cost = Number(costs[Math.min(count, costs.length - 1)]);
        if (!(cost > 0) || spent + cost > points + 1e-9 || count > 10000) {
            return { count: count, next: cost > 0 ? spent + cost : null };
        }
        spent += cost;
        count++;
    }
    return { count: 0, next: null };
}

var CLAN_WAR_REWARD_TEXTS = {
    APBoost: "AP received from levels increased by %",
    BattleProtection: "Attacks against you in Idle battles reduced by %",
    ChallengeLevelArmyCampBoost: "Army camps boosted by % in challenge levels",
    MercenaryDiscount: "Mercenaries are % cheaper",
    OreSellPrices: "Ore sell values increased by %",
    AlloySellPrices: "Alloy sell values increased by %",
    ItemSellPrices: "Item sell values increased by %",
    IncreasedCacheArmies: "Armies received from caches increased by %",
    FasterDigTimes: "Reduced artifact dig times by %",
    DecreasedArtifactCooldownTime: "Reduced artifact cooldown time by %",
    ReducedHospitalUpgradeTime: "Reduced hospital upgrade time by %",
    ReducedMortarLoadingTime: "Reduced mortar loading time by %",
    IncreasedMortarHitRate: "Increased mortar hit rate by %",
    DecreasedMortarLoadCost: "Reduced mortar load cost by %",
    PoorArtifact: "# poor artifact",
    CommonArtifact: "# common artifact",
    UncommonArtifact: "# uncommon artifact",
    RareArifact: "# rare artifact",
    EpicArtifact: "# epic artifact",
    LegendaryArtifact: "# legendary artifact",
    FreeCoins: "# coins",
    EveryPower: "# of every Idle power",
    MultiLevelPower: "# multi-level power",
    InspireMercsPower: "# inspire mercenaries power",
    TimeWarpPower: "# time warp power",
    FreeCachePower: "# free cache power",
    PlayerFlag: "A player flag"
};

function clanWarRewardText(reward) {
    var text = CLAN_WAR_REWARD_TEXTS[reward.Type];
    var value = Number(reward.Value) || 0;
    if (!text) {
        return String(reward.Type || "A reward");
    }
    if (text.indexOf("%") !== -1) {
        var days = Number(reward.Duration) || 14;
        return text.replace("%", Math.round(value * 100) + "%") + (days === 21 ? " for three weeks" : days === 14 ? " for two weeks" : " for " + days + " days");
    }
    var plural = /^# .*(artifact|power)$/.test(text) && value !== 1 && !/every/.test(text);
    return text.replace("#", value) + (plural ? "s" : "");
}

function clanWarRewards(settings) {
    var rank = [];
    var wins = [];
    (Array.isArray(settings && settings.Rewards) ? settings.Rewards : []).forEach(function (reward) {
        if (!reward || typeof reward !== "object") {
            return;
        }
        if ("RankMin" in reward) {
            var min = Number(reward.RankMin);
            var max = Number(reward.RankMax);
            var group = rank.filter(function (g) {
                return g.min === min && g.max === max;
            })[0];
            if (!group) {
                group = { min: min, max: max, texts: [] };
                rank.push(group);
            }
            group.texts.push(clanWarRewardText(reward));
        } else if (Number(reward.NumWins) > 0) {
            wins.push({ wins: Number(reward.NumWins), text: clanWarRewardText(reward) });
        }
    });
    rank.sort(function (a, b) {
        return a.min - b.min;
    });
    wins.sort(function (a, b) {
        return a.wins - b.wins;
    });
    return { rank: rank, wins: wins };
}

function clanWarPlaces(min, max) {
    return min === max ? getRankText(min) : getRankText(min) + "–" + getRankText(max);
}

// War.app's answer doesn't say which clan is yours, only the page's "Your clan has earned 14.8 points (1.6 estimated
// today plus 13.3 from previous days)" line does.
function findYourClanWarClan(standings, label, visibleClans) {
    var numbers = String(label || "").match(/(-?\d+(?:\.\d+)?) points? \((-?\d+(?:\.\d+)?) estimated today plus (-?\d+(?:\.\d+)?) from/);
    if (!numbers) {
        return null;
    }
    var near = function (value, shown) {
        return Math.abs(value - Number(shown)) < 0.0501;
    };
    var matches = standings.filter(function (s) {
        return near(s.points, numbers[1]) && near(s.pointsToday, numbers[2]) && near(s.pointsBefore, numbers[3]);
    });
    if (matches.length > 1) {
        matches = matches.filter(function (s) {
            return (visibleClans || []).indexOf(s.clan) !== -1;
        });
    }
    return matches.length === 1 ? matches[0].clan : null;
}

function clanWarResult(game, clan) {
    if (game.winner === null) {
        return "playing";
    }
    if (game.gameId === null) {
        return game.winner === clan ? "free" : "lost";
    }
    return game.winner === clan ? "won" : "lost";
}

function clanWarSide(game, clan) {
    return game.clans.filter(function (side) {
        return side.clan === clan;
    })[0] || { clan: clan, players: [] };
}

function clanWarOpponents(game, clan) {
    return game.clans.filter(function (side) {
        return side.clan !== clan;
    });
}

function clanWarNextTimeslot(first, minutes, now) {
    var step = minutes * 60000;
    return step > 0 ? first + Math.ceil((now - first) / step) * step : null;
}

function clanWarOpenTimeslot(first, minutes, joinMinutes, now) {
    var step = minutes * 60000;
    if (!(step > 0) || !(joinMinutes > 0)) {
        return null;
    }
    var last = first + Math.floor((now - first) / step) * step;
    return now < last + joinMinutes * 60000 ? { started: last, closes: last + joinMinutes * 60000 } : null;
}

function clanWarDuration(ms) {
    var minutes = Math.max(0, Math.round(ms / 60000));
    if (minutes < 1) {
        return "less than a minute";
    }
    var hours = Math.floor(minutes / 60);
    return ((hours ? hours + " h " : "") + (minutes % 60 || !hours ? minutes % 60 + " min" : "")).trim();
}

function utcMidnight(time) {
    return Math.floor(time / DAY_MS) * DAY_MS;
}

function utcDay(time) {
    return new Date(time).toISOString().slice(0, 10);
}

function clanWarProgress(input) {
    var war = input.war;
    var clan = input.clan;
    var settings = war.season.settings || {};
    var ranking = clanWarRanking(war.standings);
    var mine = ranking.filter(function (row) {
        return row.clan === clan;
    })[0];
    var standing = war.standings.filter(function (s) {
        return s.clan === clan;
    })[0];
    if (!mine || !standing) {
        return null;
    }
    var names = {};
    war.clans.forEach(function (c) {
        names[c.id] = c.name;
    });
    var at = function (place) {
        return ranking[place - 1] || null;
    };
    var rewards = clanWarRewards(settings);
    var progress = {
        season: war.season.id,
        finished: war.season.finished,
        clan: clan,
        clanName: names[clan] || "",
        place: mine.place,
        clans: ranking.length,
        points: mine.points,
        pointsToday: standing.pointsToday
    };
    var bracket = rewards.rank.filter(function (g) {
        return mine.place >= g.min && mine.place <= g.max;
    })[0] || null;
    if (bracket) {
        var below = at(bracket.max + 1);
        progress.bracket = { places: clanWarPlaces(bracket.min, bracket.max), texts: bracket.texts, belowPlace: below ? below.place : null, lead: below ? mine.points - below.points : null };
    }
    var better = rewards.rank.filter(function (g) {
        return g.max < mine.place;
    }).pop();
    if (better && at(better.max)) {
        progress.better = { places: clanWarPlaces(better.min, better.max), texts: better.texts, place: better.max, gap: at(better.max).points - mine.points };
    }
    if (input.games) {
        var wins = input.games.games.filter(function (game) {
            return game.winner === clan;
        }).length;
        var next = rewards.wins.filter(function (r) {
            return r.wins > wins;
        })[0] || null;
        progress.wins = { total: wins, today: standing.winsToday, next: next, count: rewards.wins.length };
        var today = input.games.games.filter(function (game) {
            return game.day === null;
        });
        progress.today = [];
        today.forEach(function (game) {
            clanWarSide(game, clan).players.forEach(function (player) {
                var info = input.games.players[player];
                progress.today.push({ id: player, name: info ? info.name : String(player), result: clanWarResult(game, clan) });
            });
        });
        var playerId = Number(input.playerId) || null;
        if (playerId) {
            var yours = today.filter(function (game) {
                return clanWarSide(game, clan).players.indexOf(playerId) !== -1;
            })[0];
            progress.you = yours ? {
                result: clanWarResult(yours, clan),
                template: input.games.templates[yours.template] || "",
                opponents: clanWarOpponents(yours, clan).map(function (side) {
                    return names[side.clan] || "";
                }).filter(Boolean)
            } : { result: null };
        }
    }
    var costs = settings.PointsPerTerritory;
    var held = input.map ? input.map.territories.filter(function (t) {
        return t.clan === clan;
    }).length : clanWarTerritoryCount(standing.pointsBefore, costs).count;
    var reach = clanWarTerritoryCount(mine.points, costs);
    progress.territories = { held: held, byTonight: Math.max(0, reach.count - held), nextAt: reach.next, toGo: reach.next !== null ? reach.next - mine.points : null };
    if (input.map && input.mapTerritories > 0 && !war.season.finished) {
        var taken = input.map.territories.length;
        var dayStart = utcMidnight(war.now);
        var days = Math.max(1, Math.min(3, Math.round((dayStart - utcMidnight(war.season.started)) / DAY_MS)));
        var recent = input.map.territories.filter(function (t) {
            return t.at >= dayStart - (days - 1) * DAY_MS - 60000;
        }).length;
        var left = Math.max(0, input.mapTerritories - taken);
        var pace = recent / days;
        var daysLeft = pace > 0 ? Math.ceil(left / pace) : null;
        progress.seasonEnd = { left: left, total: input.mapTerritories, pace: pace, days: days, daysLeft: daysLeft, ends: daysLeft !== null ? dayStart + daysLeft * DAY_MS : null };
    }
    if (!war.season.finished) {
        var minutes = Number(settings.MinutesBetweenTimeslots);
        var open = war.timeslot && war.timeslot.info && !war.timeslot.info.started ? war.timeslot.info : null;
        progress.timeslot = open ? { open: true, closes: open.starts } : { open: false, next: clanWarNextTimeslot(war.firstTimeslot, minutes, war.now) };
    }
    return progress;
}

function clanWarResultText(result) {
    return { won: "won", lost: "lost", free: "free win", playing: "playing" }[result] || "";
}

function renderClanWarProgress(p, now) {
    var line = function (html) {
        return '<div class="tuydCwLine">' + html + "</div>";
    };
    var pts = function (n) {
        return (Math.round(n * 10) / 10).toFixed(1);
    };
    var lines = [];
    lines.push(line("<b>" + htmlEscape(p.clanName) + "</b>: " + htmlEscape(getRankText(p.place)) + " of " + htmlEscape(p.clans) + " with " + htmlEscape(pts(p.points)) + " points" +
        (p.finished ? "" : ' <span class="tuydMuted">(' + htmlEscape(pts(p.pointsToday)) + " today)</span>")));
    if (p.bracket) {
        lines.push(line("Rank rewards for " + htmlEscape(p.bracket.places) + ": " + htmlEscape(p.bracket.texts.join(", ")) + "." +
            (p.bracket.belowPlace && !p.finished ? ' <span class="tuydMuted">' + htmlEscape(getRankText(p.bracket.belowPlace)) + " is " + htmlEscape(pts(p.bracket.lead)) + " points behind.</span>" : "")));
    }
    if (p.better && !p.finished) {
        lines.push(line("Next up, " + htmlEscape(p.better.places) + ": " + htmlEscape(p.better.texts.join(", ")) + '. <span class="tuydMuted">' +
            htmlEscape(pts(p.better.gap)) + " points short of " + htmlEscape(getRankText(p.better.place)) + ".</span>"));
    }
    if (p.wins) {
        lines.push(line(htmlEscape(p.wins.total) + " win" + (p.wins.total === 1 ? "" : "s") + " this season" + (p.finished ? "" : " (" + htmlEscape(p.wins.today) + " today)") + ". " +
            (p.wins.next ? "Next win reward at " + htmlEscape(p.wins.next.wins) + ": " + htmlEscape(p.wins.next.text) + ' <span class="tuydMuted">(' + htmlEscape(p.wins.next.wins - p.wins.total) + " more)</span>"
                : p.wins.count ? "All " + htmlEscape(p.wins.count) + " win rewards earned." : "")));
    }
    var t = p.territories;
    lines.push(line(htmlEscape(t.held) + " territor" + (t.held === 1 ? "y" : "ies") + " on the map. " + (p.finished ? "" :
        t.byTonight ? htmlEscape(t.byTonight) + " more at midnight UTC if today's estimate holds."
            : t.nextAt !== null ? 'Next at ' + htmlEscape(pts(t.nextAt)) + ' points <span class="tuydMuted">(' + htmlEscape(pts(t.toGo)) + " more)</span>." : "")));
    var end = p.seasonEnd;
    if (end) {
        lines.push(line(htmlEscape(end.left) + " of " + htmlEscape(end.total) + " territories left. " + (end.ends !== null ? "At the pace of the last " + (end.days === 1 ? "day" : htmlEscape(end.days) + " days") +
            " (" + htmlEscape(Math.round(end.pace)) + " a day) the season ends in about " + htmlEscape(end.daysLeft) + " day" + (end.daysLeft === 1 ? "" : "s") +
            ', around ' + htmlEscape(new Date(end.ends).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })) + "." : "No territories were given out lately.")));
    }
    if (p.you) {
        if (p.you.result) {
            lines.push(line("You played today: " + htmlEscape(clanWarResultText(p.you.result)) + (p.you.opponents.length ? " vs " + htmlEscape(p.you.opponents.join(", ")) : "") +
                (p.you.template ? " on " + htmlEscape(p.you.template) : "") + "."));
        } else if (p.timeslot) {
            lines.push(line("You haven't played today. " + (p.timeslot.open ? "A timeslot is open: join it above." :
                'Next timeslot in <span class="tuydCwCountdown" data-at="' + htmlEscape(p.timeslot.next) + '">' + htmlEscape(clanWarDuration(p.timeslot.next - now)) + "</span>.")));
        }
    }
    if (p.today && p.today.length) {
        var won = p.today.filter(function (x) {
            return x.result === "won" || x.result === "free";
        }).length;
        lines.push(line("Today: " + p.today.map(function (x) {
            return htmlEscape(x.name) + ' <span class="tuydCw' + (x.result === "won" || x.result === "free" ? "Won" : x.result === "lost" ? "Lost" : "Playing") + '">' + htmlEscape(clanWarResultText(x.result)) + "</span>";
        }).join(" · ") + ' <span class="tuydMuted">(' + htmlEscape(p.today.length) + " played, " + htmlEscape(won) + " won)</span>"));
    }
    return '<div id="tuydClanWarProgress" class="tuydCommunityPanel"><h3>Your clan in Season ' + htmlEscape(p.season) + '</h3><div class="communityLaddersRows">' + lines.join("") +
        '</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

function clanWarPlayerStats(games, clan) {
    var stats = {};
    games.games.forEach(function (game) {
        var result = clanWarResult(game, clan);
        clanWarSide(game, clan).players.forEach(function (player) {
            var s = stats[player] || (stats[player] = { wins: 0, finished: 0, today: null });
            if (result !== "playing") {
                s.finished++;
                s.wins += result === "lost" ? 0 : 1;
            }
            if (game.day === null) {
                s.today = result;
            }
        });
    });
    return stats;
}

function clanWarPlayerNote(stats) {
    if (!stats) {
        return [];
    }
    var rate = stats.finished ? Math.round(100 * stats.wins / stats.finished) + "% won" : "";
    var today = stats.today ? "today: " + clanWarResultText(stats.today) : "";
    return [rate, today].filter(Boolean);
}

// Free wins weren't played, so they don't count here, though war.app's win totals include them.
function clanWarRecords(games, clan, playerId) {
    var templates = {};
    var opponents = {};
    var me = Number(playerId) || null;
    var add = function (record, result) {
        if (result === "lost") {
            record.lost++;
        } else {
            record.won++;
        }
    };
    games.games.forEach(function (game) {
        var result = clanWarResult(game, clan);
        if (result === "playing" || game.gameId === null) {
            return;
        }
        var name = games.templates[game.template] || "Template " + game.template;
        var t = templates[name] || (templates[name] = { name: name, won: 0, lost: 0, you: { won: 0, lost: 0 } });
        add(t, result);
        if (me && clanWarSide(game, clan).players.indexOf(me) !== -1) {
            add(t.you, result);
        }
        clanWarOpponents(game, clan).forEach(function (side) {
            var who = side.players.map(function (player) {
                return games.players[player];
            }).filter(function (info) {
                return info && info.clan === side.clan && info.clanName;
            })[0];
            var o = opponents[side.clan] || (opponents[side.clan] = { name: "Clan " + side.clan, won: 0, lost: 0 });
            if (who) {
                o.name = who.clanName;
            }
            add(o, result);
        });
    });
    var order = function (a, b) {
        return b.won + b.lost - (a.won + a.lost) || b.won - a.won || (a.name < b.name ? -1 : 1);
    };
    return {
        templates: Object.keys(templates).map(function (k) {
            return templates[k];
        }).sort(order),
        opponents: Object.keys(opponents).map(function (k) {
            return opponents[k];
        }).sort(order)
    };
}

function clanWarRecordText(record) {
    var games = record.won + record.lost;
    return record.won + "–" + record.lost + (games ? " (" + Math.round(100 * record.won / games) + "%)" : "");
}

function clanWarTemplateNote(record) {
    if (!record) {
        return "This season: no games yet";
    }
    return "This season: you " + (record.you.won + record.you.lost ? record.you.won + "–" + record.you.lost : "haven't played it") + ", clan " + record.won + "–" + record.lost;
}

function renderClanWarRecords(records, season) {
    var section = function (title, rows) {
        return '<div class="communityLaddersSection"><h4>' + title + "</h4>" + (rows.length ? rows.map(function (row) {
            return '<div class="tuydCwRecordRow"><span>' + htmlEscape(row.name) + "</span><span>" + htmlEscape(clanWarRecordText(row)) + "</span></div>";
        }).join("") : '<div class="tuydMuted">No finished games yet.</div>') + "</div>";
    };
    return '<div id="tuydClanWarRecords" class="tuydCommunityPanel"><h3>Season ' + htmlEscape(season) + ' records</h3><div class="communityLaddersRows">' +
        section("By template", records.templates) + section("By opponent", records.opponents) +
        '</div><div class="communityLaddersCredit">Added by Muli\'s Userscript</div></div>';
}

function readClanWarSchedule() {
    try {
        var schedule = JSON.parse(localStorage.getItem(CLAN_WAR_SCHEDULE_KEY));
        return schedule && typeof schedule === "object" ? schedule : null;
    } catch (e) {
        return null;
    }
}

function saveClanWarSchedule(schedule) {
    try {
        localStorage.setItem(CLAN_WAR_SCHEDULE_KEY, JSON.stringify(schedule));
    } catch (e) {
    }
}

function clanWarCountdownText(schedule, now) {
    if (!schedule || schedule.finished || !schedule.clan || !(schedule.minutes > 0)) {
        return "";
    }
    if (schedule.playedOn === utcDay(now)) {
        return "Clan War: played today ✓";
    }
    var open = clanWarOpenTimeslot(schedule.first, schedule.minutes, schedule.join, now);
    if (open) {
        return "Clan War: timeslot open for " + clanWarDuration(open.closes - now);
    }
    return "Clan War in " + clanWarDuration(clanWarNextTimeslot(schedule.first, schedule.minutes, now) - now);
}

function clanWarUrlNumber(name) {
    var match = new RegExp("[?&]" + name + "=(\\d+)", "i").exec(location.search);
    return match ? Number(match[1]) : null;
}

function addClanWarStyles() {
    if (addClanWarStyles.done) {
        return;
    }
    addClanWarStyles.done = true;
    addCommunityLaddersStyles();
    addCSS(`
        .tuydCommunityPanel .tuydCwLine {
            margin: 0 4px 6px;
        }
        .tuydCommunityPanel .tuydCwWon {
            color: #7bd67b;
        }
        .tuydCommunityPanel .tuydCwLost {
            color: #e07b7b;
        }
        .tuydCommunityPanel .tuydCwPlaying {
            color: #e0c060;
        }
        #tuydClanWarRecords .communityLaddersSection + .communityLaddersSection {
            margin-top: 10px;
        }
        .tuydCommunityPanel .tuydCwRecordRow {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 0 4px 2px;
        }
        .tuydCwPlayerNote {
            position: absolute;
            left: 460px;
            top: -30px;
            height: 26px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            color: #babbbb;
            font-size: 11px;
            line-height: 13px;
            white-space: nowrap;
            pointer-events: none;
        }
        /* War.app's name label is as wide as its text, up to 231px where it wraps, so the note keeps clear of that
           width rather than following the label's right edge into the lines below short names. */
        .tuydCwTemplateNote {
            position: absolute;
            left: 247px;
            top: 2px;
            width: 220px;
            color: #e0c060;
            font-size: 13px;
            line-height: 17px;
            white-space: normal;
        }
        #tuydClanWarCountdown {
            margin-left: 10px;
            font-size: 13px;
        }
    `);
}

function hangBelowColumn(panel, dialog, scene) {
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
}

function tickClanWarCountdowns() {
    $(".tuydCwCountdown").each(function () {
        var at = Number($(this).attr("data-at"));
        if (at) {
            $(this).text(clanWarDuration(at - Date.now()));
        }
    });
}

function setupClanWarProgress() {
    var shown = null;
    var loading = null;
    var check = function () {
        var scene = ujsElement("ClanWarScene");
        if (!scene) {
            shown = null;
            return;
        }
        var answer = clanWarTraffic.answers.GetClanWar;
        var war = answer && parseClanWarReply(answer.text);
        var label = $(ujsElement("YourClanStatusLabel", "_tmp")).text();
        if (!war || !label) {
            return;
        }
        var visible = $(scene).find("a[href*='ClanID=']").map(function () {
            return Number((/ClanID=(\d+)/.exec(this.getAttribute("href")) || [])[1]);
        }).get();
        var clan = findYourClanWarClan(war.standings, label, visible);
        var key = answer.text.length + ":" + war.season.id + ":" + clan;
        if (!clan || shown === key && $("#tuydClanWarProgress").length || loading === key) {
            return;
        }
        loading = key;
        var settings = war.season.settings || {};
        var schedule = readClanWarSchedule() || {};
        var fresh = { season: war.season.id, clan: clan, first: war.firstTimeslot, minutes: Number(settings.MinutesBetweenTimeslots) || 0, join: Number(settings.MinutesTimeslotsTakeToStart) || 0, finished: !!war.season.finished };
        fresh.playedOn = schedule.season === fresh.season && schedule.clan === clan ? schedule.playedOn : null;
        saveClanWarSchedule(fresh);
        var quietly = function (promise) {
            return promise.then(null, function (e) {
                log("Clan War progress: " + e.message);
                return null;
            });
        };
        Promise.all([
            signedInPlayerId().then(gamePlayerId, function () {
                return null;
            }),
            quietly(fetchClanWarGames(war.season.id, clan)),
            quietly(fetchClanWarMap(war.season.id)),
            settings.MapID ? quietly(fetchMapTerritoryCount(Number(settings.MapID))) : null
        ]).then(function (got) {
            loading = null;
            var progress = clanWarProgress({ war: war, clan: clan, playerId: got[0], games: got[1], map: got[2], mapTerritories: got[3] });
            var dialog = $(scene).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").first();
            if (!progress || !dialog.length || !ujsElement("ClanWarScene")) {
                return;
            }
            if (progress.you && progress.you.result) {
                fresh.playedOn = utcDay(war.now);
                saveClanWarSchedule(fresh);
            }
            addClanWarStyles();
            $("#tuydClanWarProgress").remove();
            hangBelowColumn($(renderClanWarProgress(progress, Date.now())), dialog, scene);
            shown = key;
        });
    };
    check();
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("tuyd:clanWarAnswer", check);
    setInterval(tickClanWarCountdowns, 30 * 1000);
}

function setupClanWarPlayers() {
    var stats = {};
    var loading = {};
    var check = function () {
        var scene = ujsElement("ClanWarPlayersScene");
        var season = clanWarUrlNumber("ID");
        var clan = clanWarUrlNumber("PlayersFromClan");
        if (!scene || !season || !clan) {
            return;
        }
        var key = season + ":" + clan;
        if (!stats[key]) {
            if (!loading[key]) {
                loading[key] = true;
                fetchClanWarGames(season, clan).then(function (games) {
                    stats[key] = clanWarPlayerStats(games, clan);
                    check();
                }, function (e) {
                    log("Clan War players: " + e.message);
                });
            }
            return;
        }
        addClanWarStyles();
        $(scene).find("[id^='ujs_hamburger']").filter(function () {
            return /^ujs_hamburger(?:_\d+)?$/.test(this.id) && !$(this).children(".tuydCwPlayerNote").length;
        }).each(function () {
            var link = $(this).find("a[href*='Profile?p=']").attr("href") || "";
            var lines = clanWarPlayerNote(stats[key][Number(gamePlayerId(extractPlayerId(link)))]);
            if (lines.length) {
                $('<div class="tuydCwPlayerNote"></div>').append(lines.map(function (line) {
                    return $("<div></div>").text(line);
                })).appendTo(this);
            }
        });
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();
}

function setupClanWarTimeslotRecords() {
    var records = {};
    var loading = {};
    var check = function () {
        var scene = ujsElement("ClanWarTimeslotScene");
        var season = clanWarUrlNumber("ID");
        var schedule = readClanWarSchedule();
        if (!scene || !season || !schedule || schedule.season !== season || !schedule.clan) {
            return;
        }
        var key = season + ":" + schedule.clan;
        if (!records[key]) {
            if (!loading[key]) {
                loading[key] = true;
                Promise.all([fetchClanWarGames(season, schedule.clan), signedInPlayerId().then(gamePlayerId, function () {
                    return null;
                })]).then(function (got) {
                    var byName = {};
                    clanWarRecords(got[0], schedule.clan, got[1]).templates.forEach(function (t) {
                        byName[t.name] = t;
                    });
                    records[key] = byName;
                    check();
                }, function (e) {
                    log("Clan War timeslot records: " + e.message);
                });
            }
            return;
        }
        addClanWarStyles();
        $(scene).find("[id^='ujs_TemplateNameLabel']").filter(function () {
            return /^ujs_TemplateNameLabel(?:_\d+)?_tmp$/.test(this.id) && !$(this).find(".tuydCwTemplateNote").length;
        }).each(function () {
            var name = $(this).clone().children(".tuydCwTemplateNote").remove().end().text().trim();
            $('<span class="tuydCwTemplateNote"></span>').text(clanWarTemplateNote(records[key][name])).appendTo(this);
        });
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();
}

function setupClanWarClanRecords() {
    var records = {};
    var loading = {};
    var check = function () {
        var scene = ujsElement("ClanWarClanScene");
        var season = clanWarUrlNumber("ID");
        var clan = clanWarUrlNumber("ClanID");
        if (!scene || !season || !clan) {
            return;
        }
        var key = season + ":" + clan;
        if ($("#tuydClanWarRecords").attr("data-key") === key) {
            return;
        }
        if (!records[key]) {
            if (!loading[key]) {
                loading[key] = true;
                fetchClanWarGames(season, clan).then(function (games) {
                    records[key] = clanWarRecords(games, clan, null);
                    check();
                }, function (e) {
                    log("Clan War clan records: " + e.message);
                });
            }
            return;
        }
        var dialog = $(scene).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']").first();
        if (!dialog.length) {
            return;
        }
        addClanWarStyles();
        $("#tuydClanWarRecords").remove();
        hangBelowColumn($(renderClanWarRecords(records[key], season)).attr("data-key", key), dialog, scene);
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();
}

function setupClanWarCountdown() {
    var update = function () {
        var text = clanWarCountdownText(readClanWarSchedule(), Date.now());
        var link = $("#tuydClanWarCountdown");
        if (!text) {
            link.remove();
            return;
        }
        if (!link.length) {
            var count = $("#NumberOfMyGamesLabel");
            if (!count.length) {
                return;
            }
            addClanWarStyles();
            link = $('<a id="tuydClanWarCountdown" href="/Clans/War" title="Clan War (Muli\'s Userscript)"></a>').insertAfter(count);
        }
        link.text(text);
    };
    update();
    setInterval(update, 30 * 1000);
    $(document).on("tuyd:gamesRefreshed", update);
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

// MTL and Seasonal Ladder rows for war.app's Ladders table on a profile (Ladder, Best Rank, Current Rank).
// MTL goes first, above war.app's ladders; the Seasonal Ladder last.
function ladderProfileRows(mtl, seasonal) {
    var rated = function (rank, rating) {
        return htmlEscape(rank ? getRankText(rank) : "Unranked") + " (" + htmlEscape(rating) + ")";
    };
    var link = function (url, text) {
        return '<a target="_blank" rel="noopener" href="' + htmlEscape(safeUrl(url)) + '">' + htmlEscape(text) + '</a>';
    };
    var finalPlace = function (entry) {
        var season = entry.season && entry.season.name;
        return htmlEscape(getRankText(entry.rank)) + " final place" + (season ? " (" + htmlEscape(season) + ")" : "");
    };
    var rows = [];
    if (mtl) {
        rows.push({ first: true, cells: [link(mtl.url, "MTL"), mtl.best_rank ? rated(mtl.best_rank, mtl.best_rating) : "-", rated(mtl.rank, mtl.rating)] });
    }
    var seasons = seasonal && Array.isArray(seasonal.seasons) ? seasonal.seasons.filter(Boolean) : [];
    if (seasons.length) {
        var best = seasons.filter(function (entry) {
            return entry.rank && !(entry.season && entry.season.status === "running");
        }).sort(function (a, b) {
            return a.rank - b.rank || b.rating - a.rating;
        })[0];
        var titles = seasons.filter(function (entry) {
            return entry.champion;
        }).length;
        var running = seasons.filter(function (entry) {
            return entry.season && entry.season.status === "running";
        })[0];
        rows.push({ first: false, cells: [
            link(seasonal.url, "Seasonal Ladder"),
            (best ? finalPlace(best) : "") + (titles ? " · champion" + (titles > 1 ? " ×" + titles : "") : ""),
            running ? rated(running.rank, running.rating) : "Not in this season"
        ] });
    }
    return rows;
}

// war.app's own Ladders table, or one like it before Ranked Games when the player has no war.app ladder.
function profileLaddersTable() {
    var heading = $("h3").filter(function () {
        return $(this).text().trim() === "Ladders";
    }).first();
    var table = heading.next("table");
    if (!table.length) {
        table = heading.next().find("table").first();
    }
    if (table.length) {
        return table;
    }
    var before = $("h3").filter(function () {
        return $(this).text().trim() === "Ranked Games";
    }).first();
    if (!before.length) {
        return $();
    }
    var made = $('<table cellpadding="2" class="tuydLaddersTable"><thead><tr><td>Ladder</td><td>Best Rank</td><td>Current Rank</td></tr></thead><tbody></tbody></table>');
    before.before($('<h3 class="tuydLaddersTable">Ladders</h3>'), made);
    return made;
}

function setupLadderProfileRows() {
    var match = location.href.match(/[?&]p=(\d+)/i);
    if (!match) {
        return;
    }
    $.when(
        settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/mtl/players/" + match[1], SERIES_CACHE_MS), "MTL figures"),
        settleRequest(fetchWlStats(CUSTOM_SITE + "/api/v1/ladders/seasonal/players/" + match[1], SERIES_CACHE_MS), "Seasonal Ladder seasons")
    ).done(function (mtl, seasonal) {
        var rows = ladderProfileRows(mtl, seasonal);
        if (!rows.length || $(".tuydLadderRow").length) {
            return;
        }
        var body = profileLaddersTable().children("tbody").first();
        rows.forEach(function (row) {
            body[row.first ? "prepend" : "append"]('<tr class="tuydLadderRow"><td>' + row.cells.join("</td><td>") + "</td></tr>");
        });
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

// war.app's request for Past Tournaments carries your sign-in, so it's kept in memory only, never stored. It has to be
// watched from the start: war.app sends its first one while the page loads.
var lastMyTournamentsRequest = null;

function watchMyTournamentsRequests() {
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.tuydMyTournaments = /[?&]m=GetMyTournaments\b/.test(String(url));
        return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
        if (this.tuydMyTournaments && typeof body === "string") {
            lastMyTournamentsRequest = body;
            document.dispatchEvent(new Event("tuyd:myTournamentsRequest"));
        }
        return send.apply(this, arguments);
    };
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
        { name: "MTL top 10 in MTL threads", section: "Forum", match: isAnyForumThread, run: setupMtlForumTop },
        { name: "Bookmark link and player search", section: "Tournaments", run: setupTournamentPage },
        { name: "custom.wl-stats.com link", section: "Tournaments", run: setupCustomTournamentLink },
        { name: "Community ladders on the Ladders page", section: "Community", run: setupCommunityLadders },
        { name: "Search your friends in a team ladder proposal", section: "Community", run: setupLadderFriendSearch },
        { name: "Your standing on Community Events", section: "Community", run: setupCommunityEventsStanding },
        { name: "Community page: community events, the MTL top 10 and the 5 latest blog posts", section: "Community", match: pageIsCommunityHome, run: setupCommunityPageSummary },
        { name: "Community event standings on clan pages", section: "Clans", run: setupClanStandings },
        { name: "Sortable Common Games table", section: "Other", match: pageIsCommonGames, run: setupCommonGamesDataTable },
        { name: "Clan list search", section: "Clans", match: pageIsClanList, run: setupClanListSearch },
        { name: "Your clan's progress on the Clan War page", section: "Clans", match: pageHasUjsScenes, run: setupClanWarProgress },
        { name: "Win rates and today's games on Clan War players", section: "Clans", match: pageHasUjsScenes, run: setupClanWarPlayers },
        { name: "Your record on each template in Clan War timeslots", section: "Clans", match: pageHasUjsScenes, run: setupClanWarTimeslotRecords },
        { name: "Records by template and opponent on Clan War clans", section: "Clans", match: pageHasUjsScenes, run: setupClanWarClanRecords },
        { name: "Map search", section: "Maps & levels", match: pageIsMapsPage, run: setupMapSearch },
        { name: "Level bookmark link", section: "Maps & levels", match: pageIsLevelOverview, run: setupLevelBookmark },
        { name: "Collapse blank lines", section: "Profile", match: pageIsProfile, run: hideExtraBlanks },
        { name: "Trophies", section: "Profile", match: pageIsProfile, run: displayTrophies },
        { name: "Collapsible stat sections", section: "Profile", match: pageIsProfile, run: foldProfileStats },
        { name: "AWP World Tour stats", section: "Profile", match: pageIsProfile, run: setupAwpProfileStats },
        { name: "custom.wl-stats.com stats", section: "Profile", match: pageIsProfile, run: setupCustomProfileStats },
        { name: "MTL and Seasonal Ladder in the Ladders table", section: "Profile", match: pageIsProfile, run: setupLadderProfileRows },
        { name: "Your Quickmatch record on your profile", section: "Profile", match: pageIsProfile, run: setupQuickmatchProfileRecord },
        { name: "Sort and filter player search results", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchSort },
        { name: "Tags on players in search results", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchTags },
        { name: "Open a pasted profile link from player search", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchShortcuts },
        { name: "Your rank next to your rating on Quickmatch leaderboards", section: "Community", match: pageIsQuickmatch, run: setupLeaderboardRank },
        { name: "Your Quickmatch record and stats", section: "Community", match: pageIsQuickmatch, run: setupQuickmatchStats },
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
        { name: "Time left before boot on your-turn games", section: "Dashboard", match: pageIsDashboard, run: setupBootTimeLeft },
        { name: "Community event badges on My Games", section: "Dashboard", match: pageIsDashboard, run: setupEventBadges },
        { name: "Clan War countdown on the dashboard", section: "Dashboard", match: pageIsDashboard, run: setupClanWarCountdown },
        { name: "Open Games filter", section: "Dashboard", match: function () { return pageIsDashboard() || pageIsOpenGamesPage(); }, run: setupOpenGamesFilter },
        { name: "Mark Open Games you joined", section: "Dashboard", match: function () { return pageIsDashboard() || pageIsOpenGamesPage(); }, run: setupJoinedOpenGames },
        { name: "Refresh Open Games every few minutes", section: "Dashboard", match: pageIsDashboard, run: setupOpenGamesAutoRefresh },
        { name: "Filters on Past Games", section: "Games", match: pageIsPastGames, run: setupPastGamesFilter },
        { name: "Search all your past tournaments", section: "Tournaments", match: pageHasUjsScenes, run: setupPastTournamentsSearch },
        { name: "Filters on Open Tournaments", section: "Tournaments", match: pageHasUjsScenes, run: setupOpenTournamentsFilter },
        { name: "Notes in games", section: "Games", match: pageCanOpenGame, run: setupGameNotes },
        { name: "commit confirmation", match: pageIsGame, run: function () { ifSettingIsEnabled('confirmCommit', setupCommitConfirm); } },
        { name: "Volume of the chat and turn sounds", section: "Games", match: function () { return !pageIsIdle(); }, run: setupGameSoundVolume },
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

// A profile link's p= (2921525624) is the player's ID (215256) with two more digits at each end; war.app's
// game data has the ID itself.
function gamePlayerId(playerId) {
    var match = /^\d{5,}$/.exec(String(playerId || ""));
    return match ? match[0].slice(2, -2) : null;
}

function pastGamePlayer(game, me) {
    return game.players.filter(function (player) {
        return me.id ? String(player.id) === String(me.id) : player.name === me.name;
    })[0] || null;
}

// A game's state in war.app's data: 2 lobby, 3 playing, 4 finished, 5 picking. A player's: 2 playing,
// 3 eliminated, 4 won, 5 declined, 6 removed by the host, 7 surrendered, 8 booted, 9 ended by vote.
// Past Games also lists games you created or run without playing in them.
function pastGameState(game, me) {
    if (game.state === 2) {
        return "lobby";
    }
    if (game.state === 4) {
        return "finished";
    }
    var mine = pastGamePlayer(game, me);
    if (mine && mine.state !== 2) {
        return "out";
    }
    return mine && !mine.committed ? "yourTurn" : "running";
}

function pastGameResult(game, me) {
    var mine = pastGamePlayer(game, me);
    return mine && { 3: "lost", 4: "won", 7: "lost", 8: "booted", 9: "vote" }[mine.state] || null;
}

// war.app's data marks tournament games; the other kinds are told apart by the names war.app gives them.
function pastGameType(game) {
    var name = String(game.name || "");
    if (game.tournament) {
        return "tournament";
    }
    if (isQuickmatchGameName(name)) {
        return "quickmatch";
    }
    if (/^Season [IVXLC]+: /.test(name)) {
        return "seasonal";
    }
    if (/^(?:\d+ v \d+|Real-Time) Ladder: /.test(name)) {
        return "ladder";
    }
    if (/^MTL\|/.test(name)) {
        return "mtl";
    }
    return /^CW: /.test(name) ? "clanWar" : "other";
}

function pastGamePlayerCount(game) {
    return game.players.filter(function (player) {
        return player.state !== 5 && player.state !== 6;
    }).length;
}

function pastGameStatusText(game, me) {
    var mine = pastGamePlayer(game, me);
    var out = mine && { 3: "Eliminated", 4: "Won", 5: "Declined", 6: "Removed by the host", 7: "Surrendered", 8: "Booted", 9: "Ended by vote" }[mine.state];
    if (out) {
        return out;
    }
    if (game.state === 2 || game.state === 4) {
        return game.state === 2 ? "Lobby" : "Finished";
    }
    if (mine && !mine.committed) {
        return game.state === 5 ? "Your turn to pick" : "Your turn";
    }
    if (game.state === 5) {
        return "Picking";
    }
    // A game's turn counts the turns played, so war.app shows the one being played as the next.
    return game.turn >= 0 ? "Turn " + (game.turn + 1) : "In progress";
}

// war.app's map list (Ajax/EnumerateMaps, every map at once): each map's thumbnail folder, ID and name.
// war.app's game data names a game's map by the same folder.
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

function pastGameMatches(game, filter, me) {
    var state = pastGameState(game, me);
    if (filter.state === "running" ? state !== "running" && state !== "yourTurn" : filter.state && state !== filter.state) {
        return false;
    }
    if ((filter.result && pastGameResult(game, me) !== filter.result) || (filter.type && pastGameType(game) !== filter.type)
        || (filter.map && String(game.map) !== filter.map)) {
        return false;
    }
    var players = pastGamePlayerCount(game);
    if ((filter.minPlayers && players < filter.minPlayers) || (filter.maxPlayers && players > filter.maxPlayers)
        || (filter.size === "oneVsOne" && players !== 2) || (filter.size === "more" && players <= 2)) {
        return false;
    }
    var query = String(filter.query || "").trim().toLowerCase();
    return !query || [game.name].concat(game.players.map(function (player) {
        return player.name;
    })).some(function (name) {
        return String(name || "").toLowerCase().indexOf(query) !== -1;
    });
}

function normalizePastGamesFilter(value) {
    value = value || {};
    var count = function (number) {
        number = parseInt(number, 10);
        return number > 0 ? number : 0;
    };
    var oneOf = function (choice, choices) {
        return choices.indexOf(choice) !== -1 ? choice : "";
    };
    return {
        state: oneOf(value.state, ["running", "yourTurn", "lobby", "finished", "out"]),
        result: oneOf(value.result, ["won", "lost", "booted", "vote"]),
        type: oneOf(value.type, ["quickmatch", "tournament", "seasonal", "ladder", "mtl", "clanWar", "other"]),
        map: /^\d+$/.test(String(value.map || "")) ? String(value.map) : "",
        minPlayers: count(value.minPlayers),
        maxPlayers: count(value.maxPlayers),
        size: oneOf(value.size, ["oneVsOne", "more"]),
        reversed: value.reversed === true,
        query: typeof value.query === "string" ? value.query : ""
    };
}

function pastGamesFilterIsSet(filter) {
    return !!(filter.state || filter.result || filter.type || filter.map || filter.minPlayers || filter.maxPlayers
        || filter.size || filter.reversed || String(filter.query || "").trim());
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

// The maps of your games, by name, with how many games each. Maps missing from war.app's map list
// (unpublished ones) come last, by number.
function pastGameMapOptions(games, maps, selected) {
    var counts = {};
    games.forEach(function (game) {
        counts[game.map] = (counts[game.map] || 0) + 1;
    });
    if (selected && !counts[selected]) {
        counts[selected] = 0;
    }
    return Object.keys(counts).map(function (key) {
        return { key: key, name: maps[key] ? maps[key].name : null, games: counts[key] };
    }).sort(function (a, b) {
        return (a.name === null) - (b.name === null) || (a.name === null ? Number(a.key) - Number(b.key) : a.name.localeCompare(b.name));
    }).map(function (option) {
        option.name = option.name === null ? "Map " + option.key : option.name;
        return option;
    });
}

// war.app's game dates count milliseconds from the start of 2000.
function pastGameDate(game) {
    return new Date(Date.UTC(2000, 0, 1) + game.date).toISOString().slice(0, 10);
}

function pastGamesListHtml(games, me, maps) {
    var rows = games.map(function (game) {
        var others = game.players.filter(function (player) {
            return player !== pastGamePlayer(game, me) && player.state !== 5 && player.state !== 6;
        });
        var names = others.slice(0, 8).map(function (player) {
            return player.state === 4 ? "<b>" + htmlEscape(player.name) + "</b>" : htmlEscape(player.name);
        }).join(", ") + (others.length > 8 ? " and " + (others.length - 8) + " more" : "");
        var meta = [pastGameDate(game)];
        if (maps[game.map]) {
            meta.push(maps[game.map].name);
        }
        var result = pastGameResult(game, me);
        return '<tr><td><a href="/MultiPlayer?GameID=' + htmlEscape(game.id) + '">' + htmlEscape(game.name || "Game " + game.id) + "</a>"
            + '<div class="tuydPastMeta">' + htmlEscape(meta.join(" · ")) + "</div></td>"
            + '<td title="' + htmlEscape(others.map(function (player) {
                return player.name;
            }).join(", ")) + '">' + names + "</td>"
            + '<td class="tuydPastResult' + (result ? " tuydPast-" + result : "") + '">' + htmlEscape(pastGameStatusText(game, me)) + "</td>"
            + "<td>" + (game.turn > 0 ? game.turn : "") + "</td></tr>";
    }).join("");
    return '<table class="tuydPastList"><thead><tr><td>Game</td><td>Players</td><td>Result</td><td title="Number of turns played">Turns</td></tr></thead><tbody>' + rows + "</tbody></table>";
}

// The filters search your whole history: the first search reads every page of Past Games (loadPastGames),
// and while any filter is set, the games that match replace war.app's table.
function setupPastGamesFilter() {
    var table = $("#MyGamesTable");
    if (!table.length) {
        return;
    }
    addCSS(`
        #PastGamesFilterBar td { padding: 6px 8px 10px; }
        #PastGamesFilterBar input, #PastGamesFilterBar select { display: inline-block; width: auto; margin-right: 8px; background: #222; color: #ddd; border: 1px solid #555; padding: 1px 4px; }
        #PastGamesFilterBar input[type=search] { width: 220px; max-width: 100%; }
        #PastGamesFilterBar input[type=number] { width: 52px; margin-right: 4px; }
        #PastGamesFilterBar select[name=map] { max-width: 220px; }
        #PastGamesFilterBar .tuydPastRow { margin-top: 6px; }
        #PastGamesFilterBar label { font-weight: normal; margin: 0 8px 0 0; }
        #PastGamesFilterBar input[type=checkbox] { margin: 0 4px 0 0; vertical-align: middle; }
        #tuydPastResults { margin: 4px 0 16px; color: #ccc; }
        #tuydPastResults .tuydPastHead { margin: 4px 8px 8px; color: #999; }
        #tuydPastResults .tuydPastList { width: 100%; }
        #tuydPastResults .tuydPastList td { padding: 5px 8px; border-top: 1px solid #333; vertical-align: top; }
        #tuydPastResults .tuydPastList thead td { color: #999; border-top: 0; }
        #tuydPastResults .tuydPastList td:last-child { text-align: right; }
        #tuydPastResults .tuydPastList a { color: #fff; }
        #tuydPastResults .tuydPastMeta { color: #888; font-size: 12px; }
        #tuydPastResults .tuydPastResult { white-space: nowrap; }
        #tuydPastResults .tuydPast-won { color: #7c7; }
        #tuydPastResults .tuydPast-lost, #tuydPastResults .tuydPast-booted { color: #e77; }
        #tuydPastResults .tuydPastMore { margin: 8px; }
    `);
    var bar = $(`<tr id="PastGamesFilterBar"><td colspan="3">
        <input type="search" name="query" placeholder="Game or player name">
        <select name="state">
            <option value="">All games</option>
            <option value="running">In progress</option>
            <option value="yourTurn">Your turn</option>
            <option value="lobby">Lobby</option>
            <option value="finished">Finished</option>
            <option value="out" title="Games still going that you were eliminated, booted or surrendered from, or declined">You're out</option>
        </select>
        <select name="result">
            <option value="">Any result</option>
            <option value="won">Won</option>
            <option value="lost">Eliminated or surrendered</option>
            <option value="booted">Booted</option>
            <option value="vote">Ended by vote</option>
        </select>
        <select name="type">
            <option value="">Any kind of game</option>
            <option value="quickmatch">Quickmatch</option>
            <option value="tournament">Tournament</option>
            <option value="seasonal">Seasonal Ladder</option>
            <option value="ladder" title="1 v 1, 2 v 2, 3 v 3 and Real-Time Ladder">Other ladders</option>
            <option value="mtl">MTL</option>
            <option value="clanWar">Clan War</option>
            <option value="other">Other games</option>
        </select>
        <label><input type="checkbox" name="reversed">Oldest first</label>
        <div class="tuydPastRow">
            <select name="map" title="The maps of your games"><option value="">Any map</option></select>
            <select name="size">
                <option value="">Any number of players</option>
                <option value="oneVsOne">1 v 1</option>
                <option value="more">More than 2 players</option>
            </select>
            <label>Players from <input type="number" name="minPlayers" min="0" step="1"> to <input type="number" name="maxPlayers" min="0" step="1"></label>
        </div>
    </td></tr>`).appendTo(table.children("thead").first());
    var results = $('<div id="tuydPastResults"></div>').insertAfter(table).hide();
    var filter = normalizePastGamesFilter({});
    var me = { id: null, name: null };
    var games = null;
    var loading = false;
    var failed = false;
    var progress = "";
    var maps = {};
    var mapsLoading = false;
    var limit = 100;
    var fillMaps = function () {
        var select = bar.find("[name=map]");
        select.children("option").not("[value='']").remove();
        pastGameMapOptions(games || [], maps, filter.map).forEach(function (option) {
            select.append($("<option>").val(option.key).text(option.name + " (" + option.games + ")"));
        });
        select.val(filter.map);
    };
    var load = function () {
        if (games || loading) {
            return;
        }
        loading = true;
        if (!mapsLoading) {
            mapsLoading = true;
            loadMapNames(function (names) {
                maps = names;
                fillMaps();
                render();
            });
        }
        Promise.resolve(signedInPlayerId()).then(function (id) {
            me.id = gamePlayerId(id);
            me.name = !me.id && window.WlPlayer ? WlPlayer.Name : null;
            return loadPastGames(me.id, 10 * 60 * 1000, function (done, total) {
                progress = done.toLocaleString("en-US") + " of " + total.toLocaleString("en-US");
                render();
            });
        }).then(function (loaded) {
            games = loaded.games;
            loading = false;
            fillMaps();
            render();
        }, function (error) {
            log("Past Games: " + (error && error.message || error && error.statusText || error));
            loading = false;
            failed = true;
            render();
        });
    };
    var render = function () {
        var set = pastGamesFilterIsSet(filter);
        table.children("tbody").toggle(!set);
        $("#PagerContainer").toggle(!set);
        results.toggle(set);
        if (!set) {
            return;
        }
        var back = '<a href="#" class="tuydPastBack">Back to war.app\'s list</a>';
        if (!games) {
            if (!failed) {
                load();
            }
            results.html('<div class="tuydPastHead">' + (failed ? 'Couldn\'t read your games. <a href="#" class="tuydPastRetry">Try again</a>'
                : "Reading your games" + (progress ? ": " + htmlEscape(progress) : "") + "…") + " · " + back + "</div>");
            return;
        }
        var shown = games.filter(function (game) {
            return pastGameMatches(game, filter, me);
        });
        if (filter.reversed) {
            shown.reverse();
        }
        results.html('<div class="tuydPastHead">' + shown.length.toLocaleString("en-US") + " of " + games.length.toLocaleString("en-US")
            + " games · " + back + "</div>"
            + (shown.length ? pastGamesListHtml(shown.slice(0, limit), me, maps) : '<div class="tuydPastHead">No game matches.</div>')
            + (shown.length > limit ? '<div class="tuydPastMore"><a href="#" class="tuydPastShowMore">Show ' + Math.min(100, shown.length - limit) + " more</a></div>" : ""));
    };
    bar.on("input change", "input, select", function () {
        filter = normalizePastGamesFilter({
            query: bar.find("[name=query]").val(),
            state: bar.find("[name=state]").val(),
            result: bar.find("[name=result]").val(),
            type: bar.find("[name=type]").val(),
            reversed: bar.find("[name=reversed]").prop("checked"),
            map: bar.find("[name=map]").val(),
            size: bar.find("[name=size]").val(),
            minPlayers: bar.find("[name=minPlayers]").val(),
            maxPlayers: bar.find("[name=maxPlayers]").val()
        });
        limit = 100;
        render();
    }).on("focus", "[name=map]", load);
    results.on("click", ".tuydPastBack", function (event) {
        event.preventDefault();
        bar.find("input[type=search], input[type=number], select").val("");
        bar.find("[name=reversed]").prop("checked", false);
        filter = normalizePastGamesFilter({});
        render();
    }).on("click", ".tuydPastRetry", function (event) {
        event.preventDefault();
        failed = false;
        render();
    }).on("click", ".tuydPastShowMore", function (event) {
        event.preventDefault();
        limit += 100;
        render();
    });
}

var PAST_TOURNAMENTS_CHUNK = 2000;
var PAST_TOURNAMENTS_STATES = ["Open", "In progress", "Finished", "Cancelled"];

// Your part in a tournament, as war.app keeps it: 0 invited (never answered), 1 joined, 2 declined.
var PAST_TOURNAMENTS_YOU = ["Not answered", "Joined", "Declined"];

// war.app's Past Tournaments asks for 30 tournaments a page with a binary request (Services?m=GetMyTournaments)
// that carries your sign-in. Its last 17 bytes are the list's filter, page size, sort and offset, so the script asks
// for any part of the same list by changing them in war.app's latest request. Returns null if the request isn't one.
function myTournamentsRequest(template, filter, offset, count) {
    var hex = String(template || "").trim().toUpperCase();
    if (!/^(?:[0-9A-F]{2})+$/.test(hex) || hex.length < 62 || hex.substr(4, 8) !== "39F1475A" || hex.substr(20, 8) !== "58000000"
        || hex.substr(hex.length - 34, 2) !== "01") {
        return null;
    }
    var int = function (number) {
        return [0, 8, 16, 24].map(function (shift) {
            return ("0" + ((number >>> shift) & 255).toString(16)).slice(-2);
        }).join("").toUpperCase();
    };
    return hex.slice(0, -34) + "01" + int(filter) + int(count) + int(0) + int(offset);
}

// war.app's answer, as ujs.js reads it: the message header, the "extras" war.app sends with every answer (mail and
// notifications), then MyTournamentsReturn: the total, the open tournaments anyone can join (only sent for the
// Tournaments page's filter, 8), the server's time and your tournaments, each a TournamentInfo. Integers and doubles are little-endian, a bool or enum is a byte, a text is a "has value" byte, a 7-bit
// length and UTF-8, a list is a count (-1 for none), and an optional value has a "has value" byte first. Dates count
// milliseconds from the start of 2000. Only the fields used here are kept. If war.app changes the layout, this returns null.
function parseMyTournamentsReply(hex) {
    hex = String(hex || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
        return null;
    }
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    var view = new DataView(bytes.buffer);
    var decoder = new TextDecoder("utf-8", { fatal: true });
    var p = 0;
    var need = function (n) {
        if (p + n > bytes.length) {
            throw new Error("Past Tournaments data ends early");
        }
    };
    var byte = function () {
        need(1);
        return bytes[p++];
    };
    var bool = function () {
        return byte() !== 0;
    };
    var int = function () {
        need(4);
        p += 4;
        return view.getInt32(p - 4, true);
    };
    var double = function () {
        need(8);
        p += 8;
        return view.getFloat64(p - 8, true);
    };
    var text = function () {
        if (!bool()) {
            return null;
        }
        var length = 0;
        var shift = 0;
        var b;
        do {
            b = byte();
            length |= (b & 127) << shift;
            shift += 7;
        } while (b & 128 && shift < 35);
        need(length);
        p += length;
        return decoder.decode(bytes.subarray(p - length, p));
    };
    var optional = function (read) {
        return bool() ? read() : null;
    };
    var list = function (item) {
        var count = int();
        var items = [];
        for (var i = 0; i < count; i++) {
            items.push(item());
        }
        return items;
    };
    var extras = function () {
        optional(function () {
            list(function () {
                int();
                text();
            });
        });
        optional(int);
        text();
        optional(function () {
            text();
            text();
            int();
            optional(function () {
                text();
                int();
                double();
                text();
                text();
            });
            int();
        });
        optional(function () {
            list(function () {
                int();
                optional(function () {
                    list(text);
                });
            });
        });
        optional(function () {
            bool();
            double();
            bool();
        });
    };
    var settings = function () {
        optional(double);
        bool();
        int();
        text();
        bool();
        bool();
        optional(int);
        double();
        bool();
        int();
        bool();
        bool();
        double();
        bool();
        double();
        int();
        byte();
        bool();
        bool();
        int();
        double();
        bool();
        bool();
        byte();
    };
    var tournament = function () {
        double();
        var unread = bool();
        var coins = optional(function () {
            int();
            var fee = int();
            optional(int);
            var prizes = optional(function () {
                return list(function () {
                    return [int(), int()];
                });
            }) || [];
            if (bool()) {
                need(2);
                p += 2;
            }
            return { fee: fee, prizes: prizes };
        });
        optional(int);
        var creator = optional(function () {
            var clan = optional(function () {
                int();
                int();
                return text();
            });
            optional(int);
            bool();
            int();
            var name = text();
            int();
            int();
            int();
            return { name: name, clan: clan };
        });
        var boot = double();
        byte();
        bool();
        int();
        int();
        var name = text();
        var joined = int();
        var rounds = int();
        var me = optional(int);
        var realTime = bool();
        var starts = optional(double);
        optional(settings);
        var state = byte();
        var teamSize = int();
        var teamsPerGame = optional(int);
        var id = int();
        var type = byte();
        return {
            id: id,
            name: name || "",
            creator: creator && creator.name || "",
            clan: creator && creator.clan || "",
            type: type,
            players: type === 2 ? joined : Math.pow(teamsPerGame || 2, rounds) * teamSize,
            teamSize: teamSize,
            boot: boot,
            realTime: realTime,
            fee: coins ? coins.fee : null,
            prizes: coins ? coins.prizes.sort(function (a, b) {
                return a[0] - b[0];
            }) : [],
            state: state,
            me: me,
            unread: unread,
            starts: starts
        };
    };
    try {
        p = 2;
        if (int() !== 1514664249) {
            return null;
        }
        int();
        if (int() !== 88) {
            return null;
        }
        if (byte() === 1) {
            extras();
        }
        if (byte() === 5 || !bool()) {
            return null;
        }
        var total = int();
        var tournamentList = function () {
            return (optional(function () {
                return list(function () {
                    return optional(tournament);
                });
            }) || []).filter(Boolean);
        };
        var open = tournamentList();
        double();
        var tournaments = tournamentList();
        return p === bytes.length ? { total: total, tournaments: tournaments, open: open } : null;
    } catch (e) {
        return null;
    }
}

// Filter 0 is all your tournaments (Past Tournaments' All); 8, the Tournaments page's, also brings the open tournaments.
function fetchMyTournaments(template, offset, count, filter) {
    var body = myTournamentsRequest(template, filter || 0, offset, count);
    if (!body) {
        return Promise.reject(new Error("war.app's tournament request has changed"));
    }
    // fetch, not XMLHttpRequest, so watchMyTournamentsRequests doesn't take the script's own requests for war.app's.
    return fetch("/Services?m=GetMyTournaments&js=1", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: body
    }).then(function (response) {
        if (!response.ok) {
            throw new Error("war.app answered " + response.status);
        }
        return response.text();
    }).then(function (hex) {
        var page = parseMyTournamentsReply(hex);
        if (!page) {
            throw new Error("war.app's tournament list couldn't be read");
        }
        return page;
    });
}

// Brings the stored list (newest first: war.app sorts it by tournament ID) up to date. Until it has been read to the end,
// reading goes on from where it stopped, `chunk` tournaments a request, saving after each. After that, each update reads
// from the top down to the newest tournament already stored and the oldest one still open or in progress, so new ones
// are added and running ones get their new state; tournaments war.app no longer lists in that range are dropped.
function readPastTournaments(stored, fetchPage, onSave, chunk) {
    chunk = chunk || PAST_TOURNAMENTS_CHUNK;
    stored = stored || {};
    var byId = {};
    (stored.tournaments || []).forEach(function (tournament) {
        byId[tournament.id] = tournament;
    });
    var sorted = function () {
        return Object.keys(byId).map(function (id) {
            return byId[id];
        }).sort(function (a, b) {
            return b.id - a.id;
        });
    };
    var save = function (changes) {
        stored = Object.assign({}, stored, changes, { tournaments: sorted() });
        onSave(stored);
        return stored;
    };
    var catchUp = function () {
        var known = sorted();
        var running = known.filter(function (tournament) {
            return tournament.state === 0 || tournament.state === 1;
        });
        var threshold = known.length ? Math.min(known[0].id, running.length ? running[running.length - 1].id : Infinity) : -Infinity;
        var size = Math.max(100, known.filter(function (tournament) {
            return tournament.id >= threshold;
        }).length + 50);
        var seen = {};
        var step = function (offset) {
            return fetchPage(offset, size).then(function (page) {
                page.tournaments.forEach(function (tournament) {
                    byId[tournament.id] = tournament;
                    seen[tournament.id] = true;
                });
                var end = page.tournaments.length < size || offset + page.tournaments.length >= page.total;
                var last = page.tournaments.length ? page.tournaments[page.tournaments.length - 1].id : null;
                if (!end && last > threshold) {
                    return step(offset + page.tournaments.length);
                }
                var floor = end ? -Infinity : last;
                Object.keys(byId).forEach(function (id) {
                    if (byId[id].id > floor && !seen[id]) {
                        delete byId[id];
                    }
                });
                return save({ total: page.total, checkedAt: Date.now() });
            });
        };
        return step(0);
    };
    if (stored.complete) {
        return catchUp();
    }
    var resumed = stored.next > 0;
    var readFrom = function (offset) {
        return fetchPage(offset, chunk).then(function (page) {
            page.tournaments.forEach(function (tournament) {
                byId[tournament.id] = tournament;
            });
            var next = offset + page.tournaments.length;
            var done = page.tournaments.length < chunk || next >= page.total;
            save({ complete: done, next: done ? 0 : next, total: page.total, checkedAt: Date.now() });
            return done ? (resumed ? catchUp() : stored) : readFrom(next);
        });
    };
    return readFrom(stored.next || 0);
}

// A series is the start of the names several of your tournaments share: "93rd Titled Tuesday - RCO" is in "Titled
// Tuesday", "AWP World Tour - 250 Series - Fast Earth" in "AWP World Tour", "NC 26 Brunnia" in "NC 26". The part before
// " - " or ": " counts, without a leading number like "93rd" or "{101st}"; the whole of it when 3 or more tournaments
// share it, otherwise its first two words, then its first word if that's an abbreviation like "WGL". Returns each
// tournament's series by ID.
function pastTournamentSeries(tournaments) {
    var candidates = function (name) {
        var head = String(name || "").split(/\s+-\s+|:\s+|:$/)[0].replace(/^[\[{(]?\d+(?:st|nd|rd|th)?[\]})]?\s+/i, "")
            .replace(/(\d)\s*v\s*(\d)/gi, "$1v$2").trim();
        var words = head ? head.split(/\s+/) : [];
        return [words.join(" "), words.slice(0, 2).join(" ").replace(/\s+(?:a|and|at|for|in|of|on|the|vs)$/i, ""), words[0]].filter(function (candidate, i, found) {
            return candidate && found.indexOf(candidate) === i && /[a-z]{2}/i.test(candidate) && (candidate.indexOf(" ") !== -1 || /^[A-Z][A-Z0-9]+$/.test(candidate));
        });
    };
    var counts = {};
    var names = {};
    tournaments.forEach(function (tournament) {
        candidates(tournament.name).forEach(function (candidate) {
            var key = candidate.toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
            names[key] = names[key] || candidate;
        });
    });
    var series = {};
    tournaments.forEach(function (tournament) {
        var found = candidates(tournament.name).filter(function (candidate) {
            return counts[candidate.toLowerCase()] >= 3;
        })[0];
        series[tournament.id] = found ? names[found.toLowerCase()] : "";
    });
    return series;
}

// The values of a <select> for the series or creators, most tournaments first, with their counts.
function pastTournamentOptions(values, selected) {
    var counts = {};
    values.forEach(function (value) {
        if (value) {
            counts[value] = (counts[value] || 0) + 1;
        }
    });
    if (selected && !counts[selected]) {
        counts[selected] = 0;
    }
    return Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a] || a.localeCompare(b);
    }).map(function (value) {
        return { value: value, count: counts[value] };
    });
}

function normalizePastTournamentsFilter(value) {
    value = value || {};
    var oneOf = function (choice, choices) {
        return choices.indexOf(choice) !== -1 ? choice : "";
    };
    var count = function (number) {
        number = parseInt(number, 10);
        return number > 0 ? number : 0;
    };
    var date = function (text) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(text || "")) ? String(text) : "";
    };
    return {
        query: typeof value.query === "string" ? value.query : "",
        series: typeof value.series === "string" ? value.series : "",
        creator: typeof value.creator === "string" ? value.creator : "",
        type: oneOf(value.type, ["single", "double", "roundRobin"]),
        teams: oneOf(value.teams, ["solo", "teams"]),
        minPlayers: count(value.minPlayers),
        maxPlayers: count(value.maxPlayers),
        speed: oneOf(value.speed, ["realTime", "multiDay"]),
        coins: oneOf(value.coins, ["free", "fee", "prize"]),
        you: oneOf(value.you, ["stillIn", "joined", "declined", "unanswered", "notDeclined"]),
        state: oneOf(value.state, ["open", "running", "notFinished", "finished", "cancelled"]),
        unread: value.unread === true,
        from: date(value.from),
        to: date(value.to),
        reversed: value.reversed === true
    };
}

function pastTournamentDate(tournament) {
    return tournament.starts === null || tournament.starts === undefined ? ""
        : new Date(Date.UTC(2000, 0, 1) + tournament.starts).toISOString().slice(0, 10);
}

// "stillIn" is war.app's own My Tournaments, by ID: what you're still playing in or can still join. The list itself
// doesn't say whether you were eliminated.
function pastTournamentMatches(tournament, filter, series, stillIn) {
    if (filter.you === "stillIn" && !(stillIn || {})[tournament.id]) {
        return false;
    }
    var query = String(filter.query || "").trim().toLowerCase();
    if (query && [tournament.name, tournament.creator, tournament.clan].every(function (text) {
        return String(text || "").toLowerCase().indexOf(query) === -1;
    })) {
        return false;
    }
    if (filter.series && (series || {})[tournament.id] !== filter.series || filter.creator && tournament.creator !== filter.creator) {
        return false;
    }
    if (filter.type && ["single", "double", "roundRobin"][tournament.type] !== filter.type) {
        return false;
    }
    if (filter.teams && (tournament.teamSize > 1) !== (filter.teams === "teams")) {
        return false;
    }
    if (filter.minPlayers && tournament.players < filter.minPlayers || filter.maxPlayers && tournament.players > filter.maxPlayers) {
        return false;
    }
    if (filter.speed && tournament.realTime !== (filter.speed === "realTime")) {
        return false;
    }
    var fee = tournament.fee || 0;
    if (filter.coins === "free" && fee > 0 || filter.coins === "fee" && fee === 0 || filter.coins === "prize" && !tournament.prizes.length) {
        return false;
    }
    if (filter.you === "joined" && tournament.me !== 1 || filter.you === "declined" && tournament.me !== 2
        || filter.you === "unanswered" && tournament.me !== 0 || filter.you === "notDeclined" && tournament.me === 2) {
        return false;
    }
    if (filter.state === "notFinished" ? tournament.state !== 0 && tournament.state !== 1
        : filter.state && ["open", "running", "finished", "cancelled"][tournament.state] !== filter.state) {
        return false;
    }
    if (filter.unread && !tournament.unread) {
        return false;
    }
    var date = pastTournamentDate(tournament);
    return !((filter.from || filter.to) && (!date || filter.from && date < filter.from || filter.to && date > filter.to));
}

function pastTournamentBootText(ms) {
    var count = function (value, unit) {
        value = Math.round(value * 10) / 10;
        return value + " " + unit + (value === 1 ? "" : "s");
    };
    return ms < 60 * 60 * 1000 ? count(ms / 60000, "minute") : ms < 24 * 60 * 60 * 1000 ? count(ms / 3600000, "hour") : count(ms / 86400000, "day");
}

function pastTournamentKindText(tournament) {
    var kind = tournament.type === 2 ? "Round robin, " + tournament.players + " players"
        : tournament.players + "-player " + (tournament.type === 1 ? "double" : "single") + " elimination";
    return kind + (tournament.teamSize > 1 ? ", teams of " + tournament.teamSize : "");
}

function pastTournamentCoinsText(tournament) {
    if (tournament.fee === null || tournament.fee === undefined) {
        return "";
    }
    var ordinal = function (place) {
        var tens = place % 100;
        return place + (tens > 10 && tens < 14 ? "th" : ["th", "st", "nd", "rd"][place % 10] || "th");
    };
    return [tournament.fee ? "Entry " + tournament.fee.toLocaleString("en-US") : "Free"].concat(tournament.prizes.map(function (prize) {
        return ordinal(prize[0]) + " " + prize[1].toLocaleString("en-US");
    })).join(" · ");
}

function pastTournamentsListHtml(tournaments) {
    var rows = tournaments.map(function (tournament) {
        var meta = [tournament.creator ? "by " + tournament.creator + (tournament.clan ? " (" + tournament.clan + ")" : "") : "",
            pastTournamentKindText(tournament), pastTournamentBootText(tournament.boot) + (tournament.realTime ? " (real-time)" : "")].filter(Boolean);
        var you = PAST_TOURNAMENTS_YOU[tournament.me] || "";
        return '<tr><td><a href="/MultiPlayer/Tournament?ID=' + htmlEscape(tournament.id) + '">' + htmlEscape(tournament.name || "Tournament " + tournament.id) + "</a>"
            + (tournament.unread ? ' <span class="tuydPtUnread" title="Unread public chat messages">chat</span>' : "")
            + '<div class="tuydPtMeta">' + htmlEscape(meta.join(" · ")) + "</div>"
            + (tournament.fee === null || tournament.fee === undefined ? "" : '<div class="tuydPtMeta tuydPtCoins">' + htmlEscape(pastTournamentCoinsText(tournament)) + "</div>") + "</td>"
            + '<td class="tuydPtYou tuydPtYou' + htmlEscape(tournament.me === null ? "" : tournament.me) + '">' + htmlEscape(you) + "</td>"
            + "<td>" + htmlEscape(PAST_TOURNAMENTS_STATES[tournament.state] || "") + '<div class="tuydPtMeta">' + htmlEscape(pastTournamentDate(tournament)) + "</div></td></tr>";
    }).join("");
    return '<table class="tuydPtList"><thead><tr><td>Tournament</td><td>You</td><td title="With the date it was set to start">State</td></tr></thead><tbody>' + rows + "</tbody></table>";
}

function pastTournamentsCsv(tournaments, series, origin) {
    var rows = [["Tournament ID", "Tournament", "Series", "Creator", "Clan", "Kind", "Players", "Team size", "Boot time", "Real-time", "Entry fee", "Prizes",
        "You", "State", "Start date", "Unread chat", "Link"]];
    tournaments.forEach(function (tournament) {
        rows.push([tournament.id, tournament.name, (series || {})[tournament.id] || "", tournament.creator, tournament.clan,
            ["Single elimination", "Double elimination", "Round robin"][tournament.type] || "", tournament.players, tournament.teamSize,
            pastTournamentBootText(tournament.boot), tournament.realTime ? "Yes" : "No", tournament.fee === null || tournament.fee === undefined ? "" : tournament.fee,
            pastTournamentCoinsText(tournament).split(" · ").slice(1).join("; "), PAST_TOURNAMENTS_YOU[tournament.me] || "",
            PAST_TOURNAMENTS_STATES[tournament.state] || "", pastTournamentDate(tournament), tournament.unread ? "Yes" : "No",
            origin + "/MultiPlayer/Tournament?ID=" + tournament.id]);
    });
    return rows.map(function (row) {
        return row.map(csvCell).join(",");
    }).join("\r\n") + "\r\n";
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

function pastTournamentsKey(playerId) {
    return "pastTournaments:" + playerId;
}

// Past Tournaments lists every tournament you were invited to, 30 a page, with no search. With "Past Tournaments: Search
// Your Whole List" on, a Search button by war.app's Filter opens a panel that searches and filters all of them, read from
// war.app with its own request and kept in IndexedDB (see readPastTournaments). With it off, the button offers to turn it on.
// The Tournaments page has the button too, by My Tournaments, opening the panel on the tournaments you're still in.
function setupPastTournamentsSearch() {
    var me = null;
    var on = false;
    var stored = null;
    var loaded = false;
    var reading = null;
    var failed = false;
    var waiting = false;
    var lastUpdate = 0;
    var dialog = null;
    var timer = null;
    var onScene = null;
    var cleared = false;
    var series = {};
    var stillIn = null;
    var stillInAt = 0;
    var stillInLoading = false;
    var filter = normalizePastTournamentsFilter({});
    // Each page keeps its own filters; the Tournaments page's start over each time you come to it.
    var filters = {};
    var filterKey = "past";
    var limit = 100;
    addTournamentButtonStyles();
    addCSS(`
        #tuydPtSearch { display: flex; flex-direction: column; }
        #tuydPtSearch .tuydPtClose { position: absolute; top: -42px; right: 4px; color: #fff; font-size: 18px; text-decoration: none; }
        #tuydPtSearch a { color: #e0c060; }
        #tuydPtSearch .tuydPtOffer p { margin: 0 0 8px; }
        #tuydPtSearch .tuydPtOffer .tuydPtButton { position: static; display: inline-block; margin-right: 8px; }
        #tuydPtSearch .tuydPtFilters > div { margin-bottom: 6px; }
        #tuydPtSearch input, #tuydPtSearch select { display: inline-block; width: auto; max-width: 100%; margin: 0 6px 2px 0; background: #222; color: #ddd;
            border: 1px solid #555; padding: 1px 4px; color-scheme: dark; }
        #tuydPtSearch input[type=search] { width: 220px; }
        #tuydPtSearch input[type=number] { width: 56px; }
        #tuydPtSearch select[name=series], #tuydPtSearch select[name=creator] { max-width: 210px; }
        #tuydPtSearch label { font-weight: normal; margin: 0 10px 0 0; }
        #tuydPtSearch input[type=checkbox] { margin: 0 4px 0 0; vertical-align: middle; }
        #tuydPtSearch .tuydPtStatus, #tuydPtSearch .tuydPtMeta, #tuydPtSearch .tuydPtHead { color: #8d8d8d; }
        #tuydPtSearch .tuydPtResults { flex: 1 1 auto; min-height: 80px; margin-top: 6px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #555 transparent; }
        #tuydPtSearch .tuydPtList { width: 100%; }
        #tuydPtSearch .tuydPtList td { padding: 4px 6px; border-top: 1px solid rgba(255, 255, 255, 0.08); vertical-align: top; }
        #tuydPtSearch .tuydPtList thead td { color: #fff; border-top: 0; }
        #tuydPtSearch .tuydPtList td + td { white-space: nowrap; }
        #tuydPtSearch .tuydPtList a { color: #fff; }
        #tuydPtSearch .tuydPtMeta { font-size: 12px; line-height: 16px; }
        #tuydPtSearch .tuydPtCoins { color: #c8b44a; }
        #tuydPtSearch .tuydPtUnread { color: #f5deb3; font-size: 12px; }
        #tuydPtSearch .tuydPtYou1 { color: #7c7; }
        #tuydPtSearch .tuydPtYou2 { color: #e77; }
        #tuydPtSearch .tuydPtMore { margin: 8px 6px; }
        #tuydPtSearch .tuydPtHead .tuydPtCsv { margin-left: 8px; }
        #tuydPtSearch .communityLaddersCredit { margin-top: 6px; }
    `);
    var scene = function () {
        return ["PastTournamentsScene", "TournamentsScene"].map(function (name) {
            return ujsElement(name);
        }).filter(function (element) {
            return element && shownUjsElement(element);
        })[0] || null;
    };
    var onPastScene = function () {
        var element = scene();
        return !!element && element.id === "ujs_PastTournamentsScene";
    };
    var wearArt = function (element) {
        var art = warappArt(scene() || document.body);
        Object.keys(art).forEach(function (name) {
            if (art[name]) {
                element[0].style.setProperty(name, art[name]);
            }
        });
    };
    var key = function () {
        return pastTournamentsKey(me);
    };
    var persist = function (value) {
        Database.update(Database.Table.TournamentData, { tournamentId: key(), value: value });
    };
    var loadStored = function () {
        if (loaded) {
            return Promise.resolve(stored);
        }
        return Database.readIndex(Database.Table.TournamentData, Database.Row.TournamentData.Id, key()).then(function (record) {
            loaded = true;
            stored = stored || (record && record.value) || null;
            series = pastTournamentSeries(stored ? stored.tournaments : []);
            return stored;
        });
    };
    var update = function (rescan) {
        if (!on || reading || !me) {
            return;
        }
        if (!lastMyTournamentsRequest) {
            waiting = true;
            render();
            return;
        }
        waiting = false;
        failed = false;
        lastUpdate = Date.now();
        reading = { rescan: !!rescan };
        render();
        loadStored().then(function () {
            var start = rescan ? { tournaments: [] } : stored;
            return readPastTournaments(start, function (offset, count) {
                return fetchMyTournaments(lastMyTournamentsRequest, offset, count);
            }, function (value) {
                if (!rescan || value.complete) {
                    stored = value;
                    series = pastTournamentSeries(stored.tournaments);
                    persist(value);
                } else {
                    reading.read = value.tournaments.length;
                    reading.total = value.total;
                }
                render();
            });
        }).then(function () {
            reading = null;
            render();
        }, function (error) {
            log("Past Tournaments: " + (error && error.message || error));
            reading = null;
            failed = true;
            render();
        });
    };
    var setOn = function (value) {
        on = value;
        Database.update(Database.Table.Settings, { name: "pastTournamentsSearch", value: value });
        if (!value) {
            stored = null;
            loaded = true;
            series = {};
            cleared = true;
            Database.delete(Database.Table.TournamentData, key());
        } else {
            loaded = false;
            update(false);
        }
        render();
    };
    var statusHtml = function () {
        var count = stored ? stored.tournaments.length : 0;
        var tools = ' · <a href="#" class="tuydPtRescan" title="Read your whole list from war.app again">Rescan</a> · <a href="#" class="tuydPtOff" title="Stop reading your list and delete it from this browser">Turn off</a>';
        if (failed) {
            return 'Couldn\'t read your tournaments from war.app. <a href="#" class="tuydPtRetry">Try again</a>' + tools;
        }
        if (waiting) {
            return "Waiting for war.app's list: " + (onPastScene() ? "open another page of it, or reload." : "press My Tournaments' Refresh, or reload.");
        }
        if (reading && reading.rescan) {
            return "Reading your whole list again" + (reading.total ? ": " + formatCount(reading.read) + " of " + formatCount(reading.total) : "") + "…";
        }
        if (stored && !stored.complete) {
            return "Reading your tournaments: " + formatCount(count) + " of " + formatCount(stored.total) + (reading ? "…" : " (more next time)") + tools;
        }
        if (reading && !stored) {
            return "Reading your tournaments…";
        }
        return formatCount(count) + " tournament" + (count === 1 ? "" : "s") + (reading ? ", checking for new ones…" : "") + tools;
    };
    var fillOptions = function () {
        var list = stored ? stored.tournaments : [];
        [["series", "All series", list.map(function (tournament) {
            return series[tournament.id];
        })], ["creator", "Any creator", list.map(function (tournament) {
            return tournament.creator;
        })]].forEach(function (field) {
            var select = dialog.find("[name=" + field[0] + "]");
            var options = pastTournamentOptions(field[2], filter[field[0]]).filter(function (option) {
                return field[0] === "creator" || option.count >= 3 || option.value === filter.series;
            });
            var signature = options.map(function (option) {
                return option.value + option.count;
            }).join("|");
            if (select.attr("data-signature") === signature) {
                return;
            }
            select.attr("data-signature", signature).empty().append($("<option>").val("").text(field[1]));
            options.forEach(function (option) {
                select.append($("<option>").val(option.value).text(option.value + " (" + option.count + ")"));
            });
            select.val(filter[field[0]]);
        });
    };
    var shownTournaments = function () {
        var shown = (stored ? stored.tournaments : []).filter(function (tournament) {
            return pastTournamentMatches(tournament, filter, series, stillIn);
        });
        return filter.reversed ? shown.reverse() : shown;
    };
    // On the Tournaments page it's the My Tournaments cards on screen; elsewhere war.app's list is asked for (filter 8).
    var readStillIn = function () {
        if (scene() && !onPastScene()) {
            stillIn = {};
            $("#ujs_MyTournamentsContainer a[href*='Tournament?ID=']").each(function () {
                var id = /[?&]ID=(\d+)/i.exec($(this).attr("href") || "");
                if (id) {
                    stillIn[id[1]] = true;
                }
            });
            return;
        }
        if (stillInLoading || !lastMyTournamentsRequest || stillIn && Date.now() - stillInAt < 60 * 1000) {
            return;
        }
        stillInLoading = true;
        fetchMyTournaments(lastMyTournamentsRequest, 0, 2147483647, 8).then(function (page) {
            stillIn = {};
            page.tournaments.forEach(function (tournament) {
                stillIn[tournament.id] = true;
            });
            stillInAt = Date.now();
        }, function (error) {
            log("Past Tournaments: " + (error && error.message || error));
        }).then(function () {
            stillInLoading = false;
            render();
        });
    };
    var render = function () {
        if (!dialog) {
            return;
        }
        var body = dialog.find(".tuydPtBody");
        if (!on) {
            if (!body.find(".tuydPtOffer").length) {
                body.html(`<div class="tuydPtOffer">
                    <p>Search and filter every tournament on this list: by name or creator, series, kind, speed, coins, whether you joined,
                    declined or never answered, and more. War.app shows them 30 at a time with no search.</p>
                    <p>To do this the script reads your whole list from war.app (about a second for each 1,000 tournaments), keeps it in this
                    browser, and brings it up to date each time you come to Past Tournaments. You can turn it off here, or in the settings
                    menu under Tournaments ("Past Tournaments: Search Your Whole List").</p>
                    <a href="#" class="tuydPtButton tuydPtOn">Turn on</a><a href="#" class="tuydPtClose2">Not now</a></div>`);
                wearArt(body.find(".tuydPtOffer"));
            }
            return;
        }
        if (!body.find(".tuydPtFilters").length) {
            body.html(`<div class="tuydPtFilters">
                <div><input type="search" name="query" placeholder="Name, creator or clan" aria-label="Search by name, creator or clan">
                    <select name="series" aria-label="Series"><option value="">All series</option></select>
                    <select name="creator" aria-label="Creator"><option value="">Any creator</option></select></div>
                <div><select name="you" aria-label="Your part">
                        <option value="">You: any</option><option value="stillIn">You're still in (My Tournaments)</option><option value="joined">You joined</option><option value="notDeclined">You didn't decline</option>
                        <option value="declined">You declined</option><option value="unanswered">You never answered</option></select>
                    <select name="state" aria-label="State">
                        <option value="">Any state</option><option value="notFinished">Not finished</option><option value="open">Open</option><option value="running">In progress</option>
                        <option value="finished">Finished</option><option value="cancelled">Cancelled</option></select>
                    <select name="type" aria-label="Kind">
                        <option value="">Any kind</option><option value="single">Single elimination</option><option value="double">Double elimination</option>
                        <option value="roundRobin">Round robin</option></select>
                    <select name="teams" aria-label="Teams"><option value="">Players or teams</option><option value="solo">Players</option><option value="teams">Teams</option></select></div>
                <div><select name="speed" aria-label="Speed"><option value="">Any speed</option><option value="realTime">Real-time</option><option value="multiDay">Multi-day</option></select>
                    <select name="coins" aria-label="Coins"><option value="">Any coins</option><option value="free">No entry fee</option><option value="fee">Entry fee</option>
                        <option value="prize">Coin prizes</option></select>
                    <label>Players <input type="number" name="minPlayers" min="0" step="1" aria-label="At least this many players"> to
                        <input type="number" name="maxPlayers" min="0" step="1" aria-label="At most this many players"></label></div>
                <div><label>Start date from <input type="date" name="from"></label><label>to <input type="date" name="to"></label>
                    <label><input type="checkbox" name="unread">Unread chat</label><label><input type="checkbox" name="reversed">Oldest first</label></div>
            </div>
            <div class="tuydPtStatus"></div>
            <div class="tuydPtResults"></div>`);
            body.find(".tuydPtFilters").find("input, select").each(function () {
                var value = filter[this.name];
                if (this.type === "checkbox") {
                    this.checked = value === true;
                } else if (this.tagName !== "SELECT" || $(this).find("option").filter(function () {
                    return this.value === String(value);
                }).length) {
                    $(this).val(value ? String(value) : "");
                }
            });
        }
        fillOptions();
        dialog.find(".tuydPtStatus").html(statusHtml());
        var results = dialog.find(".tuydPtResults");
        if (!stored || !stored.tournaments.length) {
            results.html("");
            return;
        }
        if (filter.you === "stillIn") {
            readStillIn();
            if (!stillIn) {
                results.html('<div class="tuydPtHead">' + (lastMyTournamentsRequest ? "Checking which tournaments you're still in…" : "Waiting for war.app's list to see which tournaments you're still in.") + "</div>");
                return;
            }
        }
        var shown = shownTournaments();
        results.html('<div class="tuydPtHead">' + formatCount(shown.length) + " of " + formatCount(stored.tournaments.length) + " tournaments"
            + (shown.length ? ' <a href="#" class="tuydPtCsv" title="Download these tournaments as a spreadsheet">CSV</a>' : "") + "</div>"
            + (shown.length ? pastTournamentsListHtml(shown.slice(0, limit)) : '<div class="tuydPtHead">No tournament matches.</div>')
            + (shown.length > limit ? '<div class="tuydPtMore"><a href="#" class="tuydPtShowMore">Show ' + Math.min(100, shown.length - limit) + " more</a></div>" : ""));
    };
    var fitDialog = function () {
        var area = dialog.parent()[0].getBoundingClientRect();
        var width = Math.max(300, Math.min(area.width - 32, 760));
        dialog.css({ width: width + "px", left: Math.round(Math.max(0, (area.width - width) / 2)) + "px", top: "10px", maxHeight: Math.round(Math.max(240, area.height - 20)) + "px" });
    };
    var closeDialog = function () {
        if (dialog) {
            dialog.remove();
            dialog = null;
        }
    };
    var openDialog = function () {
        var holder = $("#UjsCanvasHolder");
        if (dialog || !holder.length) {
            return;
        }
        addCommunityLaddersStyles();
        var title = onPastScene() ? "Search your past tournaments" : "Search your tournaments";
        dialog = $(`<div id="tuydPtSearch" class="tuydCommunityPanel" role="dialog" aria-label="${title}">
            <h3>${title}</h3>
            <a href="#" class="tuydPtClose" title="Close" aria-label="Close">✕</a>
            <div class="tuydPtBody"></div>
            <div class="communityLaddersCredit">From war.app's Past Tournaments, by Muli's Userscript</div>
        </div>`).appendTo(holder);
        wearArt(dialog);
        fitDialog();
        dialog.on("click", ".tuydPtClose, .tuydPtClose2", function (event) {
            event.preventDefault();
            closeDialog();
        }).on("click", ".tuydPtOn", function (event) {
            event.preventDefault();
            setOn(true);
        }).on("click", ".tuydPtOff", function (event) {
            event.preventDefault();
            setOn(false);
        }).on("click", ".tuydPtRescan", function (event) {
            event.preventDefault();
            update(true);
        }).on("click", ".tuydPtRetry", function (event) {
            event.preventDefault();
            update(false);
        }).on("click", ".tuydPtCsv", function (event) {
            event.preventDefault();
            downloadText("past-tournaments.csv", pastTournamentsCsv(shownTournaments(), series, location.origin), "text/csv;charset=utf-8");
        }).on("click", ".tuydPtShowMore", function (event) {
            event.preventDefault();
            limit += 100;
            render();
        }).on("input change", ".tuydPtFilters input, .tuydPtFilters select", function () {
            var field = function (name) {
                return dialog.find("[name=" + name + "]");
            };
            filter = normalizePastTournamentsFilter({
                query: field("query").val(),
                series: field("series").val(),
                creator: field("creator").val(),
                type: field("type").val(),
                teams: field("teams").val(),
                minPlayers: field("minPlayers").val(),
                maxPlayers: field("maxPlayers").val(),
                speed: field("speed").val(),
                coins: field("coins").val(),
                you: field("you").val(),
                state: field("state").val(),
                unread: field("unread").prop("checked"),
                from: field("from").val(),
                to: field("to").val(),
                reversed: field("reversed").prop("checked")
            });
            filters[filterKey] = filter;
            limit = 100;
            render();
        });
        filterKey = onPastScene() ? "past" : "current";
        filter = filters[filterKey] = filters[filterKey] || normalizePastTournamentsFilter(filterKey === "past" ? {} : { you: "stillIn", state: "notFinished" });
        limit = 100;
        loadStored().then(render);
        render();
        if (on && !onPastScene() && (Date.now() - lastUpdate > 60 * 1000 || stored && !stored.complete)) {
            loadStored().then(function () {
                update(false);
            });
        }
    };
    var placeButton = function () {
        var bar = scene() && $(scene()).find("[id^='ujs_MyTournamentsTopBar']").filter(function () {
            return /^ujs_MyTournamentsTopBar(_\d+)?$/.test(this.id);
        }).last();
        if (!bar || !bar.length) {
            return;
        }
        if (!bar.children(".tuydPtButton").length) {
            var button = $('<a href="#" class="tuydPtButton tuydPtOpen" title="Search and filter all your past tournaments (Muli\'s Userscript)">Search</a>').appendTo(bar);
            wearArt(button);
        }
    };
    var check = function () {
        timer = null;
        var here = scene() ? scene().id : null;
        if (dialog && here !== onScene) {
            closeDialog();
        }
        if (here !== onScene && here && !onPastScene()) {
            delete filters.current;
        }
        if (here) {
            placeButton();
        }
        if (here && !on && !cleared) {
            cleared = true;
            Database.delete(Database.Table.TournamentData, key());
        }
        if (here !== onScene && on && onPastScene() && (Date.now() - lastUpdate > 60 * 1000 || stored && !stored.complete)) {
            loadStored().then(function () {
                update(false);
            });
        }
        onScene = here;
    };
    $(document).on("click", ".tuydPtOpen", function (event) {
        event.preventDefault();
        if (dialog) {
            closeDialog();
        } else {
            openDialog();
        }
    }).on("keydown", function (event) {
        if (event.key === "Escape" && dialog) {
            closeDialog();
        }
    }).on("tuyd:myTournamentsRequest", function () {
        if (waiting) {
            update(false);
        }
    });
    $(window).on("resize", function () {
        if (dialog) {
            fitDialog();
        }
    });
    signedInPlayerId().done(function (id) {
        if (!id) {
            return;
        }
        me = id;
        readSettingValue("pastTournamentsSearch", false, function (value) {
            on = value === true;
            loaded = !on;
            check();
            new MutationObserver(function () {
                if (!timer) {
                    timer = setTimeout(check, 300);
                }
            }).observe(document.body, { childList: true, subtree: true });
        });
    });
}

// An Open Tournaments card as war.app draws it: "Name by creator", "64-player double elimination tournament. (17 spaces
// left)" or "Round robin tournament", the coins line ("Entry fee: Free!  1st place prize: 100 coins. …", or none) and
// the boot time, red for real-time. Team size isn't on the card; it's null until war.app's list says (openTournamentsInfo).
function openTournamentFromCard(card) {
    var $card = $(card);
    // Only war.app's own hiding inside the card counts: the card itself may be hidden by the filter.
    var text = function (name) {
        var element = $card.find("[id^='ujs_" + name + "'][id$='_tmp']").first();
        var hidden = element.parentsUntil(card).addBack().filter(function () {
            return this.style.display === "none";
        }).length;
        return element.length && !hidden ? element.text().replace(/\s+/g, " ").trim() : "";
    };
    var id = /[?&]ID=(\d+)/i.exec($card.find("a[href*='Tournament?ID=']").attr("href") || "");
    var label = $card.find("[id^='ujs_TournamentNameLabel'][id$='_tmp']").first();
    var title = label.text().replace(/\s+/g, " ").trim();
    var by = label.find("span").filter(function () {
        return /^\s*by\s/.test($(this).text()) && !$(this).children().length;
    }).last().text().replace(/\s+/g, " ").trim();
    var info = text("InfoLabel");
    var elimination = /^([\d,]+)-player (single|double) elimination/i.exec(info);
    var coins = text("CoinsLabel");
    var fee = /Entry fee:\s*Free/i.test(coins) ? 0 : /Entry fee:\s*([\d,]+)/i.exec(coins);
    var prizes = [];
    coins.replace(/(\d+)(?:st|nd|rd|th) place prize:\s*(?:up to\s*)?([\d,]+)/gi, function (match, place, amount) {
        prizes.push([Number(place), Number(amount.replace(/,/g, ""))]);
    });
    var boot = $card.find("[id^='ujs_BootTimeLabel'][id$='_tmp']").first();
    return {
        id: id ? Number(id[1]) : null,
        name: by && title.slice(-by.length) === by ? title.slice(0, -by.length).trim() : title,
        creator: by.replace(/^by\s+/, ""),
        clan: "",
        type: elimination ? (elimination[2].toLowerCase() === "double" ? 1 : 0) : /^Round robin/i.test(info) ? 2 : null,
        players: elimination ? Number(elimination[1].replace(/,/g, "")) : null,
        teamSize: null,
        realTime: /^(?:red|rgb\(255,\s*0,\s*0\))$/i.test(boot.length ? boot[0].style.color : ""),
        fee: fee === 0 ? 0 : fee ? Number(fee[1].replace(/,/g, "")) : null,
        prizes: prizes
    };
}

function openTournamentCards() {
    return $("#ujs_OpenTournamentsContainer").children().filter(function () {
        return /^ujs_TournamentInfoControl(_\d+)?$/.test(this.id);
    }).toArray();
}

// The filters that make sense for tournaments anyone can join, from the ones Past Tournaments search has.
function normalizeOpenTournamentsFilter(value) {
    var all = normalizePastTournamentsFilter(value);
    return { query: all.query, type: all.type, teams: all.teams, speed: all.speed, coins: all.coins, minPlayers: all.minPlayers, maxPlayers: all.maxPlayers };
}

function openTournamentsFilterActive(filter) {
    return Object.keys(filter).some(function (key) {
        return !!filter[key];
    });
}

// What a card doesn't tell (team size until war.app's list is read, a round robin's size) doesn't filter it out.
function openTournamentMatches(tournament, filter) {
    var known = Object.assign({}, normalizePastTournamentsFilter(filter));
    if (tournament.teamSize === null || tournament.teamSize === undefined) {
        known.teams = "";
    }
    if (tournament.players === null || tournament.players === undefined) {
        known.minPlayers = 0;
        known.maxPlayers = 0;
    }
    if (tournament.type === null) {
        known.type = "";
    }
    return pastTournamentMatches(Object.assign({ prizes: [] }, tournament), known, {});
}

// war.app stacks the cards from the top with `bottom`, each as tall as its own lines. Cards that match take the places
// from the top down, in war.app's order, and the rest are hidden; with no filter, every card goes back where it was.
function layoutOpenTournaments(cards, matches) {
    cards.forEach(function (card) {
        if (card.getAttribute("data-tuyd-bottom") === null) {
            card.setAttribute("data-tuyd-bottom", parseFloat(card.style.bottom) || 0);
        }
    });
    var bottom = function (card) {
        return Number(card.getAttribute("data-tuyd-bottom"));
    };
    var height = function (card) {
        var art = document.getElementById(card.id + "_img");
        return art ? parseFloat(art.style.height) || 0 : 0;
    };
    cards = cards.slice().sort(function (a, b) {
        return bottom(b) - bottom(a);
    });
    var gap = cards.length > 1 ? Math.max(0, bottom(cards[0]) - bottom(cards[1]) - height(cards[1])) : 0;
    var top = cards.length ? bottom(cards[0]) + height(cards[0]) : 0;
    var shown = 0;
    cards.forEach(function (card) {
        var visible = !matches || matches(card);
        card.style.display = visible ? "" : "none";
        if (visible) {
            card.style.bottom = (matches ? top - height(card) : bottom(card)) + "px";
            top -= height(card) + gap;
            shown++;
        }
    });
    return { shown: shown, total: cards.length };
}

// war.app's Open Tournaments has no filter. With 6 or more open tournaments, a Filter button left of its title opens
// filters by name or creator, kind, players or teams, speed, coins and number of players, above the bar so the list stays
// in view; war.app's cards that don't match are hidden and the rest move up. Team sizes come from war.app's own list (filter 8 of GetMyTournaments), read
// once the teams filter or the dropdown is used.
function setupOpenTournamentsFilter() {
    var filter = normalizeOpenTournamentsFilter({});
    try {
        filter = normalizeOpenTournamentsFilter(JSON.parse(localStorage.getItem(OPEN_TOURNAMENTS_FILTER_KEY)) || {});
    } catch (e) {
    }
    var known = {};
    var fetching = false;
    var fetchedAt = 0;
    var signature = "";
    var timer = null;
    addTournamentButtonStyles();
    addCSS(`
        #tuydOtFilter { position: absolute; bottom: 32px; left: 4px; width: 604px; box-sizing: border-box; z-index: 20; padding: 8px 10px; pointer-events: auto;
            background: rgba(22, 22, 22, 0.97); border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 13px; }
        #tuydOtFilter > div { margin-bottom: 6px; }
        #tuydOtFilter > div:last-child { margin-bottom: 0; }
        #tuydOtFilter input, #tuydOtFilter select { display: inline-block; width: auto; margin: 0 6px 2px 0; background: #222; color: #ddd; border: 1px solid #555;
            padding: 1px 4px; color-scheme: dark; }
        #tuydOtFilter input[type=search] { width: 220px; }
        #tuydOtFilter input[type=number] { width: 56px; }
        #tuydOtFilter label { font-weight: normal; margin: 0; }
        #tuydOtFilter a { color: #e0c060; }
        #tuydOtFilter .tuydOtCount { color: #8d8d8d; }
        .tuydOtOpen.tuydOtActive { color: #ffd700; }
    `);
    var scene = function () {
        var element = ujsElement("TournamentsScene");
        return element && shownUjsElement(element) ? element : null;
    };
    var cardData = function (card) {
        var tournament = openTournamentFromCard(card);
        var info = known[tournament.id];
        return info ? Object.assign(tournament, { teamSize: info.teamSize, players: info.players, realTime: info.realTime, fee: info.fee, prizes: info.prizes }) : tournament;
    };
    var learn = function () {
        var cards = openTournamentCards();
        var missing = cards.some(function (card) {
            var tournament = openTournamentFromCard(card);
            return tournament.id !== null && !known[tournament.id];
        });
        if (!missing || fetching || !lastMyTournamentsRequest || Date.now() - fetchedAt < 30 * 1000) {
            return;
        }
        fetching = true;
        fetchedAt = Date.now();
        fetchMyTournaments(lastMyTournamentsRequest, 0, 2147483647, 8).then(function (page) {
            page.open.concat(page.tournaments).forEach(function (tournament) {
                known[tournament.id] = tournament;
            });
        }, function (error) {
            log("Open Tournaments: " + (error && error.message || error));
        }).then(function () {
            fetching = false;
            apply();
        });
    };
    var apply = function () {
        var cards = openTournamentCards();
        var active = openTournamentsFilterActive(filter);
        var counts = layoutOpenTournaments(cards, active ? function (card) {
            return openTournamentMatches(cardData(card), filter);
        } : null);
        $(".tuydOtOpen").toggleClass("tuydOtActive", active)
            .attr("title", active ? "Showing " + counts.shown + " of " + counts.total + " open tournaments (Muli's Userscript)" : "Filter the open tournaments (Muli's Userscript)");
        $("#tuydOtFilter .tuydOtCount").text(active ? counts.shown + " of " + counts.total + " shown" + (counts.shown ? "" : ": none matches") : counts.total + " open tournaments");
        if (active && filter.teams) {
            learn();
        }
    };
    var save = function () {
        try {
            localStorage.setItem(OPEN_TOURNAMENTS_FILTER_KEY, JSON.stringify(filter));
        } catch (e) {
        }
    };
    var closeDropdown = function () {
        $("#tuydOtFilter").remove();
    };
    var openDropdown = function () {
        var bar = $(ujsElement("OpenTournamentsTopBar"));
        if (!bar.length || $("#tuydOtFilter").length) {
            return;
        }
        var dropdown = $(`<div id="tuydOtFilter" role="dialog" aria-label="Filter the open tournaments">
            <div><input type="search" name="query" placeholder="Name or creator" aria-label="Search by name or creator">
                <select name="type" aria-label="Kind"><option value="">Any kind</option><option value="single">Single elimination</option>
                    <option value="double">Double elimination</option><option value="roundRobin">Round robin</option></select>
                <select name="teams" aria-label="Teams"><option value="">Players or teams</option><option value="solo">Players</option><option value="teams">Teams</option></select></div>
            <div><select name="speed" aria-label="Speed"><option value="">Any speed</option><option value="realTime">Real-time</option><option value="multiDay">Multi-day</option></select>
                <select name="coins" aria-label="Coins"><option value="">Any coins</option><option value="free">No entry fee</option><option value="fee">Entry fee</option>
                    <option value="prize">Coin prizes</option></select>
                <label>Players <input type="number" name="minPlayers" min="0" step="1" aria-label="At least this many players"> to
                    <input type="number" name="maxPlayers" min="0" step="1" aria-label="At most this many players"></label></div>
            <div><span class="tuydOtCount"></span> · <a href="#" class="tuydOtClear">Clear</a></div>
        </div>`).appendTo(bar);
        dropdown.find("input, select").each(function () {
            $(this).val(filter[this.name] ? String(filter[this.name]) : "");
        });
        apply();
        learn();
    };
    var check = function () {
        timer = null;
        var cards = scene() ? openTournamentCards() : [];
        var bar = $(ujsElement("OpenTournamentsTopBar"));
        if (cards.length < OPEN_TOURNAMENTS_FILTER_MIN) {
            closeDropdown();
            $(".tuydOtOpen").remove();
            if (signature) {
                signature = "";
                layoutOpenTournaments(cards, null);
            }
            return;
        }
        if (bar.length && !bar.children(".tuydOtOpen").length) {
            var button = $('<a href="#" class="tuydPtButton tuydOtOpen">Filter</a>').appendTo(bar);
            var art = warappArt(scene());
            if (art["--tuyd-button"]) {
                button[0].style.setProperty("--tuyd-button", art["--tuyd-button"]);
            }
        }
        var now = cards.map(function (card) {
            return card.id + ":" + card.getAttribute("data-tuyd-bottom");
        }).join(",");
        if (now !== signature) {
            signature = now;
            apply();
        }
    };
    $(document).on("click", ".tuydOtOpen", function (event) {
        event.preventDefault();
        if ($("#tuydOtFilter").length) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }).on("click", "#tuydOtFilter .tuydOtClear", function (event) {
        event.preventDefault();
        filter = normalizeOpenTournamentsFilter({});
        $("#tuydOtFilter").find("input, select").val("");
        save();
        apply();
    }).on("input change", "#tuydOtFilter input, #tuydOtFilter select", function () {
        var field = function (name) {
            return $("#tuydOtFilter [name=" + name + "]").val();
        };
        filter = normalizeOpenTournamentsFilter({
            query: field("query"), type: field("type"), teams: field("teams"), speed: field("speed"), coins: field("coins"),
            minPlayers: field("minPlayers"), maxPlayers: field("maxPlayers")
        });
        save();
        apply();
    }).on("mousedown", function (event) {
        if ($("#tuydOtFilter").length && !$(event.target).closest("#tuydOtFilter, .tuydOtOpen").length) {
            closeDropdown();
        }
    }).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeDropdown();
        }
    });
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 200);
        }
    }).observe(document.body, { childList: true, subtree: true });
    check();
}

var QUICKMATCH_GAMES_KEY = "tidyUpYourDashboard.quickmatchGames";
var QUICKMATCH_TEMPLATES_KEY = "tidyUpYourDashboard.quickmatchTemplates";
var QUICKMATCH_VIEW_KEY = "tidyUpYourDashboard.quickmatchView";
var PAST_GAMES_KEY = "tidyUpYourDashboard.pastGames";

// war.app's Past Games pager posts Offset, Sort and PerPage to the page and gets its games back as hex: the
// total, then the games in the order ujs.js reads them (GameInfo, GameInfoPlayer, GameInfoSettings and the
// tournament info). Integers and doubles are little-endian, a bool or enum is a byte, a text is a "has value"
// byte, a 7-bit length and UTF-8, a list is a count (-1 for none), and an optional value has a "has value"
// byte first. Only the fields used here are kept. If war.app changes the layout, this returns null.
function parsePastGamesData(hex) {
    hex = String(hex || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
        return null;
    }
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    var view = new DataView(bytes.buffer);
    var decoder = new TextDecoder("utf-8", { fatal: true });
    var p = 0;
    var need = function (n) {
        if (p + n > bytes.length) {
            throw new Error("Past Games data ends early");
        }
    };
    var byte = function () {
        need(1);
        return bytes[p++];
    };
    var bool = function () {
        return byte() !== 0;
    };
    var int = function () {
        need(4);
        p += 4;
        return view.getInt32(p - 4, true);
    };
    var double = function () {
        need(8);
        p += 8;
        return view.getFloat64(p - 8, true);
    };
    var text = function () {
        if (!bool()) {
            return null;
        }
        var length = 0;
        var shift = 0;
        var b;
        do {
            b = byte();
            length |= (b & 127) << shift;
            shift += 7;
        } while (b & 128 && shift < 35);
        need(length);
        p += length;
        return decoder.decode(bytes.subarray(p - length, p));
    };
    var list = function (item) {
        var count = int();
        var items = [];
        for (var i = 0; i < count; i++) {
            items.push(item());
        }
        return items;
    };
    var player = function () {
        if (!bool()) {
            return null;
        }
        if (bool()) {
            int();
        }
        bool();
        var committed = bool();
        int();
        bool();
        var name = text();
        var id = int();
        var state = byte();
        var team = int();
        bool();
        return { id: id, name: name, state: state, team: team, committed: committed };
    };
    var settings = function () {
        if (bool()) {
            double();
        }
        bool();
        int();
        text();
        bool();
        bool();
        if (bool()) {
            int();
        }
        double();
        bool();
        int();
        bool();
        bool();
        double();
        bool();
        double();
        int();
        byte();
        bool();
        bool();
        int();
        double();
        bool();
        bool();
        byte();
    };
    var tournament = function () {
        if (bool()) {
            int();
            int();
            if (bool()) {
                int();
            }
            if (bool()) {
                list(function () {
                    int();
                    int();
                });
            }
            if (bool()) {
                need(2);
                p += 2;
            }
        }
        byte();
        int();
    };
    var game = function () {
        int();
        double();
        text();
        int();
        int();
        double();
        byte();
        var id = int();
        bool();
        var date = double();
        var map = int();
        int();
        if (bool()) {
            int();
        }
        var name = text();
        var turn = int();
        if (bool()) {
            list(int);
        }
        var players = bool() ? list(player) : [];
        bool();
        bool();
        bool();
        bool();
        if (bool()) {
            settings();
        }
        var state = int();
        bool();
        double();
        var inTournament = bool();
        if (inTournament) {
            tournament();
        }
        double();
        return {
            id: id,
            name: name || "",
            state: state,
            turn: turn,
            date: date,
            map: map,
            tournament: inTournament,
            players: players.filter(Boolean)
        };
    };
    try {
        var total = int();
        var games = list(game);
        return p === bytes.length ? { total: total, games: games } : null;
    } catch (e) {
        return null;
    }
}

// Reads every page of Past Games, newest first. A game that ends during the scan moves up a page, so
// games are kept once by ID.
function fetchAllPastGames(fetchPage, pageSize, onProgress) {
    var games = [];
    var seen = {};
    var next = function (offset) {
        return fetchPage(offset, pageSize).then(function (page) {
            if (!page) {
                throw new Error("war.app's game list couldn't be read");
            }
            page.games.forEach(function (game) {
                if (!seen[game.id]) {
                    seen[game.id] = true;
                    games.push(game);
                }
            });
            if (onProgress) {
                onProgress(Math.min(offset + page.games.length, page.total), page.total, games);
            }
            return page.games.length && offset + page.games.length < page.total ? next(offset + page.games.length) : games;
        });
    };
    return next(0);
}

// Brings `games`, an earlier read of Past Games (newest first), up to date from Past Games' first pages: new and
// changed games go in front. It reads on until a page has a finished game it already knew and it has seen every
// game that was still running. With no known game after `maxPages` it gives null: a full read is needed.
function updatePastGames(games, fetchPage, pageSize, maxPages) {
    var known = {};
    games.forEach(function (game) {
        known[game.id] = game;
    });
    var running = games.filter(function (game) {
        return game.state !== 4;
    });
    var fresh = [];
    var seen = {};
    var reachedKnown = false;
    var next = function (offset, pages) {
        return fetchPage(offset, pageSize).then(function (page) {
            if (!page) {
                throw new Error("war.app's game list couldn't be read");
            }
            page.games.forEach(function (game) {
                if (!seen[game.id]) {
                    seen[game.id] = true;
                    fresh.push(game);
                }
                if (known[game.id] && known[game.id].state === 4) {
                    reachedKnown = true;
                }
            });
            var end = !page.games.length || offset + page.games.length >= page.total;
            var caughtUp = reachedKnown && running.every(function (game) {
                return seen[game.id];
            });
            if (!end && !caughtUp && pages + 1 < maxPages) {
                return next(offset + page.games.length, pages + 1);
            }
            if (!end && !reachedKnown) {
                return null;
            }
            return fresh.concat(games.filter(function (game) {
                return !seen[game.id];
            }));
        });
    };
    return next(0, 0);
}

function fetchPastGamesPage(offset, count) {
    return Promise.resolve($.ajax({
        url: "/MultiPlayer/PastGames",
        type: "POST",
        data: { Offset: offset, Sort: 3, PerPage: count },
        dataType: "text"
    })).then(parsePastGamesData);
}

// Every game in your Past Games, newest first: a request per 200 games, about 8 seconds for 5,000. Kept for
// this tab's session and read again when older than `maxAge`; Past Games and Quickmatch share it.
function cachedPastGames(playerId, maxAge) {
    try {
        var cached = JSON.parse(sessionStorage.getItem(PAST_GAMES_KEY));
        if (cached && cached.player === playerId && Array.isArray(cached.games) && Date.now() - cached.time < maxAge) {
            return { time: cached.time, games: cached.games };
        }
    } catch (e) {
        // An unreadable copy is read again.
    }
    return null;
}

function loadPastGames(playerId, maxAge, onProgress) {
    var cached = cachedPastGames(playerId, maxAge);
    if (cached) {
        return Promise.resolve(cached);
    }
    return fetchAllPastGames(fetchPastGamesPage, 200, onProgress).then(function (games) {
        var time = Date.now();
        try {
            sessionStorage.setItem(PAST_GAMES_KEY, JSON.stringify({ player: playerId, time: time, games: games }));
        } catch (e) {
            try {
                sessionStorage.removeItem(PAST_GAMES_KEY);
            } catch (ignored) {
                // Without storage the games are read again next time.
            }
        }
        return { time: time, games: games };
    });
}

// war.app names Quickmatch games "QM: A vs B", or "QM: 2v2" for team templates.
function isQuickmatchGameName(name) {
    return /^QM: /.test(String(name || ""));
}

function quickmatchResult(game, me) {
    var mine = pastGamePlayer(game, me);
    if (!mine || mine.state === 5 || mine.state === 6) {
        return null;
    }
    return game.state === 4 ? pastGameResult(game, me) : "playing";
}

function quickmatchOpponents(game, me) {
    var mine = pastGamePlayer(game, me);
    return game.players.filter(function (player) {
        return player !== mine && (!mine || mine.team === -1 || player.team !== mine.team);
    });
}

function quickmatchResultText(result, turn) {
    return {
        won: turn > 0 ? "Won in " + turn : "Won",
        lost: "Lost",
        booted: "Booted",
        vote: "Ended by vote",
        playing: "In progress"
    }[result] || "";
}

// The record, by template and by opponent, of the Quickmatch games in `games` (newest first). `templates`
// holds what's been read from each game, by GameID; a game that turned out not to be a Quickmatch game is
// left out. Boot losses count as losses only when `countBoots` is set. Turns average the games that got
// past their first turn.
function quickmatchStats(games, me, templates, countBoots) {
    var record = function () {
        return { wins: 0, losses: 0, bootLosses: 0, votes: 0, turns: 0, turnGames: 0, games: [] };
    };
    var total = record();
    total.playing = 0;
    var byTemplate = {};
    var byOpponent = {};
    var groupIn = function (groups, key, fields) {
        if (!groups[key]) {
            groups[key] = record();
            Object.keys(fields).forEach(function (field) {
                groups[key][field] = fields[field];
            });
        }
        return groups[key];
    };
    var count = function (entry, result, game, summary) {
        if (result === "won") {
            entry.wins++;
        } else if (result === "lost" || (result === "booted" && countBoots)) {
            entry.losses++;
        } else if (result === "vote") {
            entry.votes++;
        }
        if (result === "booted") {
            entry.bootLosses++;
        }
        if (game.turn > 0 && (result !== "booted" || countBoots)) {
            entry.turns += game.turn;
            entry.turnGames++;
        }
        entry.games.push(summary);
    };
    games.forEach(function (game) {
        var template = templates[game.id] || null;
        if (!isQuickmatchGameName(game.name) || (template && template.none)) {
            return;
        }
        var result = quickmatchResult(game, me);
        if (result === "playing") {
            total.playing++;
        }
        if (!result || result === "playing") {
            return;
        }
        var opponents = quickmatchOpponents(game, me);
        var summary = {
            id: game.id,
            result: result,
            turn: game.turn,
            date: game.date,
            template: template ? template.name : null,
            opponents: opponents.map(function (player) {
                return player.name;
            })
        };
        count(total, result, game, summary);
        var templateKey = template ? template.name : "";
        count(groupIn(byTemplate, templateKey, { key: templateKey, name: template ? template.name : null, templateId: template ? template.id : null }), result, game, summary);
        opponents.forEach(function (player) {
            count(groupIn(byOpponent, String(player.id), { key: String(player.id), name: player.name }), result, game, summary);
        });
    });
    var finish = function (entry) {
        var played = entry.wins + entry.losses;
        entry.played = played;
        entry.rate = played ? entry.wins / played : null;
        entry.averageTurns = entry.turnGames ? entry.turns / entry.turnGames : null;
        return entry;
    };
    var list = function (groups) {
        return Object.keys(groups).map(function (key) {
            return finish(groups[key]);
        }).sort(function (a, b) {
            return b.games.length - a.games.length || (a.name === null) - (b.name === null) || String(a.name).localeCompare(String(b.name));
        });
    };
    finish(total);
    total.templates = list(byTemplate);
    total.opponents = list(byOpponent);
    return total;
}

function quickmatchRateText(entry) {
    return entry.rate === null ? "–" : (entry.rate * 100).toFixed(1) + "%";
}

function quickmatchRecordText(entry) {
    return entry.wins + " W – " + entry.losses + " L (" + quickmatchRateText(entry) + ")";
}

// A Quickmatch game's settings, in war.app's data for the game (UJS_Hooks.za), are the object that holds the
// game's name. Next to it they hold war.app's "This game was created by the Quickmatch…" message, the
// template's name and its ID. The field names are minified, so they're found by value: the message, the one
// other text, and the one optional number ({ val }) big enough to be a template ID. Returns null until the
// game has loaded, and { none: true } for a game whose settings have no Quickmatch message.
function gameTemplateFromData(data, gameName) {
    var seen = new Set();
    var queue = [data];
    var settings = null;
    while (queue.length && !settings && seen.size < 20000) {
        var item = queue.shift();
        if (!item || typeof item !== "object" || seen.has(item)) {
            continue;
        }
        seen.add(item);
        var keys;
        try {
            keys = Object.keys(item);
        } catch (e) {
            continue;
        }
        if (item !== data && keys.length >= 20 && keys.some(function (key) {
            return item[key] === gameName;
        })) {
            settings = item;
            break;
        }
        keys.forEach(function (key) {
            try {
                if (item[key] && typeof item[key] === "object") {
                    queue.push(item[key]);
                }
            } catch (e) {
                // A getter that throws holds nothing needed here.
            }
        });
    }
    if (!settings) {
        return null;
    }
    var values = Object.keys(settings).map(function (key) {
        return settings[key];
    });
    var texts = values.filter(function (value) {
        return typeof value === "string" && value.trim() && value !== gameName;
    });
    if (!texts.some(function (value) {
        return /created by the Quickmatch/i.test(value);
    })) {
        return { none: true };
    }
    var names = texts.filter(function (value) {
        return !/created by the Quickmatch/i.test(value);
    });
    var ids = values.filter(function (value) {
        return value && typeof value === "object" && typeof value.val === "number" && value.val >= 1000;
    });
    return names.length === 1 ? { name: names[0].trim(), id: ids.length === 1 ? ids[0].val : null } : null;
}

function storedQuickmatchTemplates() {
    try {
        var stored = JSON.parse(localStorage.getItem(QUICKMATCH_TEMPLATES_KEY));
        return stored && typeof stored === "object" ? stored : {};
    } catch (e) {
        return {};
    }
}

// Starting a cell with = + - or @ makes a spreadsheet read it as a formula, so such cells get a leading '.
function csvCell(value) {
    var text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
    }
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function quickmatchCsv(games, me, templates, origin) {
    var rows = [["Game ID", "Game", "Date", "Result", "Turns", "Template", "Template ID", "Opponents", "Link"]];
    games.forEach(function (game) {
        var template = templates[game.id] || null;
        var result = isQuickmatchGameName(game.name) && !(template && template.none) ? quickmatchResult(game, me) : null;
        if (!result) {
            return;
        }
        rows.push([game.id, game.name, typeof game.date === "number" ? pastGameDate(game) : "", quickmatchResultText(result, 0), game.turn > 0 ? game.turn : "",
            template ? template.name : "", template && template.id ? template.id : "",
            quickmatchOpponents(game, me).map(function (player) {
                return player.name;
            }).join("; "), origin + "/MultiPlayer?GameID=" + game.id]);
    });
    return rows.map(function (row) {
        return row.map(csvCell).join(",");
    }).join("\r\n") + "\r\n";
}

function quickmatchSummaryText(stats, count) {
    var lines = ["Quickmatch: " + stats.wins + "W - " + stats.losses + "L (" + quickmatchRateText(stats) + "), " + stats.games.length + " games"];
    var section = function (title, groups) {
        var named = groups.filter(function (entry) {
            return entry.name !== null && entry.played;
        }).slice(0, count);
        if (named.length) {
            lines.push("", title);
            named.forEach(function (entry) {
                lines.push(entry.name + ": " + entry.wins + "W - " + entry.losses + "L (" + quickmatchRateText(entry) + ")");
            });
        }
    };
    section("Top templates:", stats.templates);
    section("Top opponents:", stats.opponents);
    return lines.join("\n");
}

// One tab of the Quickmatch panel: the templates or the opponents, filtered by `view.query`, sorted by
// `view.sort`, `view.limit` rows at most, with the games of the row whose key is `view.open` listed under it.
function quickmatchTableHtml(groups, kind, view) {
    var columns = [
        { key: "name", label: "" },
        { key: "games", label: "Games" },
        { key: "wins", label: "Won" },
        { key: "losses", label: "Lost" },
        { key: "rate", label: "Win %" },
        { key: "averageTurns", label: "Turns", title: "Average number of turns" }
    ];
    var query = String(view.query || "").trim().toLowerCase();
    var unread = kind === "templates" ? "Template not read yet" : "";
    var rows = groups.filter(function (entry) {
        return !query || String(entry.name === null ? unread : entry.name).toLowerCase().indexOf(query) !== -1;
    });
    var sort = view.sort || { key: "games", descending: true };
    var value = function (entry) {
        if (sort.key === "name") {
            return entry.name === null ? "￿" : entry.name.toLowerCase();
        }
        if (sort.key === "games") {
            return entry.games.length;
        }
        return entry[sort.key] === null ? -1 : entry[sort.key];
    };
    rows = rows.slice().sort(function (a, b) {
        var x = value(a);
        var y = value(b);
        var order = x < y ? -1 : x > y ? 1 : 0;
        return (sort.descending ? -order : order) || b.games.length - a.games.length;
    });
    var shown = view.limit ? rows.slice(0, view.limit) : rows;
    var head = columns.map(function (column) {
        var label = column.key === "name" ? (kind === "templates" ? "Template" : "Opponent") : column.label;
        var arrow = sort.key === column.key ? (sort.descending ? " ▾" : " ▴") : "";
        return '<td data-sort="' + column.key + '"' + (column.title ? ' title="' + htmlEscape(column.title) + '"' : "") + ">" + htmlEscape(label) + arrow + "</td>";
    }).join("");
    var gameLinks = function (entry) {
        var limit = 100;
        return entry.games.slice(0, limit).map(function (game) {
            var other = kind === "templates" ? (game.opponents.length ? " vs " + game.opponents.join(", ") : "") : (game.template ? " on " + game.template : "");
            return '<span class="tuydQmGame tuydQm-' + htmlEscape(game.result) + '"><a href="/MultiPlayer?GameID=' + htmlEscape(game.id) + '">'
                + htmlEscape(quickmatchResultText(game.result, game.turn)) + "</a>" + htmlEscape(other) + "</span>";
        }).join(" · ") + (entry.games.length > limit ? " · " + (entry.games.length - limit) + " older games in the CSV" : "");
    };
    var body = shown.map(function (entry) {
        var name = entry.name === null ? '<i>' + htmlEscape(unread) + "</i>" : htmlEscape(entry.name);
        var templateId = parseInt(entry.templateId, 10);
        if (kind === "templates" && templateId > 0) {
            name += ' <a class="tuydQmTemplateLink" href="/MultiPlayer?TemplateID=' + templateId + '" title="Create a game with this template">#' + templateId + "</a>";
        }
        var open = view.open === entry.key;
        return '<tr class="tuydQmRow' + (open ? " tuydQmOpen" : "") + '" data-key="' + htmlEscape(entry.key) + '" title="Show these games">'
            + "<td>" + name + "</td><td>" + entry.games.length + "</td><td>" + entry.wins + "</td><td>" + entry.losses + "</td><td>"
            + quickmatchRateText(entry) + "</td><td>" + (entry.averageTurns === null ? "–" : "~" + Math.round(entry.averageTurns)) + "</td></tr>"
            + (open ? '<tr class="tuydQmGames"><td colspan="6">' + gameLinks(entry) + "</td></tr>" : "");
    }).join("");
    if (!rows.length) {
        body = '<tr><td colspan="6">' + (query ? "Nothing matches your search." : "No finished Quickmatch games.") + "</td></tr>";
    } else if (shown.length < rows.length) {
        body += '<tr><td colspan="6"><a href="#" class="tuydQmAll">Show all ' + rows.length + "</a></td></tr>";
    }
    return '<table class="dataTable tuydQmTable"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table>";
}

// The Last games tab: your newest `count` finished Quickmatch games that match `view.query`, from
// `quickmatchStats(...).games`, sorted by `view.sort`. A boot loss reads as a loss only when `view.countBoots` is set.
function quickmatchRecentHtml(games, view, count) {
    var columns = [
        { key: "date", label: "Date" },
        { key: "template", label: "Template" },
        { key: "opponents", label: "Opponents" },
        { key: "result", label: "Result" },
        { key: "turn", label: "Turns" }
    ];
    var unread = "Template not read yet";
    var query = String(view.query || "").trim().toLowerCase();
    var resultText = function (game) {
        if (game.result === "booted") {
            return view.countBoots ? "Lost (booted)" : "Booted";
        }
        return { won: "Won", lost: "Lost", vote: "Ended by vote" }[game.result] || "";
    };
    var matching = games.map(function (game, index) {
        return { game: game, index: index };
    }).filter(function (row) {
        var game = row.game;
        return !query || [game.template === null ? unread : game.template, game.opponents.join(", "), resultText(game)].some(function (text) {
            return text.toLowerCase().indexOf(query) !== -1;
        });
    });
    var rows = matching.slice(0, count);
    var sort = view.sort || { key: "date", descending: true };
    var value = function (row) {
        var game = row.game;
        if (sort.key === "date") {
            return -row.index;
        }
        if (sort.key === "template") {
            return game.template === null ? "￿" : game.template.toLowerCase();
        }
        if (sort.key === "opponents") {
            return game.opponents.join(", ").toLowerCase();
        }
        if (sort.key === "result") {
            return { won: 0, lost: 1, booted: view.countBoots ? 1 : 2, vote: 3 }[game.result];
        }
        return game.turn > 0 ? game.turn : -1;
    };
    rows.sort(function (a, b) {
        var x = value(a);
        var y = value(b);
        var order = x < y ? -1 : x > y ? 1 : 0;
        return (sort.descending ? -order : order) || a.index - b.index;
    });
    var head = columns.map(function (column) {
        var arrow = sort.key === column.key ? (sort.descending ? " ▾" : " ▴") : "";
        return '<td data-sort="' + column.key + '">' + htmlEscape(column.label) + arrow + "</td>";
    }).join("");
    var body = rows.map(function (row) {
        var game = row.game;
        var known = typeof game.date === "number";
        var date = known ? pastGameDate(game) : "–";
        var when = known ? new Date(Date.UTC(2000, 0, 1) + game.date).toLocaleString() : "";
        var lost = game.result === "lost" || (game.result === "booted" && view.countBoots);
        var tone = game.result === "won" ? "won" : lost ? "lost" : "other";
        var title = game.result === "booted" && !view.countBoots ? "Left out of your record" : "Open this game";
        return '<tr class="tuydQmRecentRow"><td' + (when ? ' title="' + htmlEscape(when) + '"' : "") + ">" + htmlEscape(date) + "</td><td>"
            + (game.template === null ? "<i>" + htmlEscape(unread) + "</i>" : htmlEscape(game.template)) + "</td><td>" + htmlEscape(game.opponents.join(", ")) + "</td>"
            + '<td class="tuydQmGame tuydQm-' + tone + '"><a href="' + htmlEscape(safeUrl("/MultiPlayer?GameID=" + encodeURIComponent(game.id))) + '" title="' + htmlEscape(title) + '">'
            + htmlEscape(resultText(game)) + "</a></td><td>" + (game.turn > 0 ? game.turn : "–") + "</td></tr>";
    }).join("");
    if (!rows.length) {
        body = '<tr><td colspan="5">' + (query ? "Nothing matches your search." : "No finished Quickmatch games.") + "</td></tr>";
    } else if (matching.length > rows.length) {
        body += '<tr><td colspan="5" class="tuydQmMeta">' + (matching.length - rows.length) + " older game" + (matching.length - rows.length === 1 ? "" : "s") + " in the CSV</td></tr>";
    }
    return '<table class="dataTable tuydQmTable tuydQmRecent"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table>";
}

function readQuickmatchView() {
    var view = {};
    try {
        view = JSON.parse(localStorage.getItem(QUICKMATCH_VIEW_KEY)) || {};
    } catch (e) {
        view = {};
    }
    return {
        countBoots: view.countBoots === true,
        tab: view.tab === "opponents" || view.tab === "recent" ? view.tab : "templates"
    };
}

function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    var area = $("<textarea>").val(text).css({ position: "fixed", left: "-10000px" }).appendTo("body");
    area[0].select();
    var copied = document.execCommand("copy");
    area.remove();
    return copied ? Promise.resolve() : Promise.reject(new Error("copy failed"));
}

function downloadText(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var link = $("<a>").attr({ href: url, download: name }).appendTo("body");
    link[0].click();
    link.remove();
    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);
}

function storedQuickmatchGames(playerId) {
    try {
        var stored = JSON.parse(localStorage.getItem(QUICKMATCH_GAMES_KEY));
        return stored && stored.player === playerId && Array.isArray(stored.games) ? stored : null;
    } catch (e) {
        return null;
    }
}

// Your Quickmatch record on the Quickmatch screen: in the Settings dialog's header, next to "Your rating" on
// each template, and by template and by opponent in a Stats dialog. war.app's viewport has no room to spare,
// so the record sits in the empty ends of the Settings header. The games come from Past Games: all of them only
// when you click Rescan, the newest each time you come to the screen. Each game's template is read once from
// the game in a hidden frame.
function setupQuickmatchStats() {
    var me = { id: null, name: null };
    var ready = false;
    var games = null;
    var scannedAt = 0;
    var checkedAt = 0;
    var scanning = false;
    var partial = null;
    var refreshing = false;
    var refreshTriedAt = 0;
    var onScene = false;
    var failed = false;
    var templates = storedQuickmatchTemplates();
    var reading = null;
    var stats = null;
    var dialog = null;
    var timer = null;
    var recentCount = 20;
    var newestCount = 200;
    var view = readQuickmatchView();
    view.query = "";
    view.sort = null;
    view.limit = 50;
    view.openRow = null;
    addCSS(`
        #tuydQmSummary { position: absolute; height: 26px; display: flex; align-items: center; justify-content: space-between; pointer-events: none; }
        #tuydQmSummary > * { pointer-events: auto; }
        .tuydQmSummaryRecord, .tuydQmTemplateRecord { color: #e0c060; white-space: nowrap; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; }
        .tuydQmSummaryRecord { font-size: 14px; }
        .tuydQmTemplateRecord { position: absolute; overflow: hidden; text-overflow: ellipsis; font-size: 14px; pointer-events: auto; }
        .tuydQmButton { display: inline-block; padding: 0 12px; line-height: 20px; color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
            border-style: solid; border-color: #242d9a; border-width: 3px 4px; background: #242d9a padding-box;
            border-image: var(--tuyd-button, none) 15 15 13 fill / 3px 4px stretch; }
        .tuydQmButton:hover, .tuydQmButton:focus { color: #fff; text-decoration: none; filter: brightness(1.15); }
        .tuydQmButton[disabled] { filter: grayscale(0.8); cursor: default; }
        #tuydQmStats { display: flex; flex-direction: column; }
        #tuydQmStats .tuydQmClose { position: absolute; top: -42px; right: 4px; color: #fff; font-size: 18px; text-decoration: none; }
        #tuydQmStats .tuydQmTools, #tuydQmStats .tuydQmTemplateStatus, #tuydQmStats .tuydQmTabs { margin-top: 8px; }
        #tuydQmStats .tuydQmRecordLine b { color: #fff; }
        #tuydQmStats .tuydQmStatus, #tuydQmStats .tuydQmTemplateStatus, #tuydQmStats .tuydQmMeta { color: #8d8d8d; }
        #tuydQmStats .tuydQmTemplateStatus:empty { display: none; }
        #tuydQmStats a { color: #e0c060; }
        #tuydQmStats label { font-weight: normal; margin: 0 12px 0 0; }
        #tuydQmStats input[type=checkbox] { margin: 0 4px 0 0; vertical-align: middle; }
        #tuydQmStats .tuydQmSearch { position: relative; display: inline-block; max-width: 100%; margin-left: 8px; }
        #tuydQmStats input[type=search] { width: 180px; max-width: 100%; background: #222; color: #ddd; border: 1px solid #555; padding: 1px 22px 1px 4px; }
        #tuydQmStats input[type=search]::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
        #tuydQmStats .tuydQmSearchClear { position: absolute; top: 50%; right: 6px; transform: translateY(-50%); color: #babbbb; text-decoration: none; line-height: 1; }
        #tuydQmStats .tuydQmSearchClear:hover { color: #fff; }
        #tuydQmStats .tuydQmTabs a[data-tab] { margin-right: 12px; color: #babbbb; }
        #tuydQmStats .tuydQmTabs a[data-tab].tuydQmActive { color: #fff; font-weight: bold; text-decoration: none; }
        #tuydQmStats .tuydQmTableHolder { flex: 1 1 auto; min-height: 80px; margin-top: 6px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #555 transparent; }
        #tuydQmStats .tuydQmTable { width: 100%; }
        #tuydQmStats .tuydQmTable td { padding: 3px 6px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
        #tuydQmStats .tuydQmTable thead td { cursor: pointer; white-space: nowrap; color: #fff; border-top: 0; }
        #tuydQmStats .tuydQmTable td + td { text-align: right; white-space: nowrap; }
        #tuydQmStats .tuydQmRecent td { white-space: nowrap; }
        #tuydQmStats .tuydQmRecent td:nth-child(2), #tuydQmStats .tuydQmRecent td:nth-child(3) { text-align: left; white-space: normal; }
        #tuydQmStats .tuydQmRecent td:nth-child(4) { text-align: left; }
        #tuydQmStats .tuydQmRecent tbody td.tuydQmMeta { text-align: left; }
        #tuydQmStats .tuydQmRecentRow:hover { background: rgba(255, 255, 255, 0.06); }
        #tuydQmStats .tuydQmRow { cursor: pointer; }
        #tuydQmStats .tuydQmRow:hover, #tuydQmStats .tuydQmOpen { background: rgba(255, 255, 255, 0.06); }
        #tuydQmStats .tuydQmGames td { text-align: left; font-size: 12px; line-height: 1.7; }
        #tuydQmStats .tuydQmGame { white-space: nowrap; }
        #tuydQmStats .tuydQm-won a { color: #7c7; }
        #tuydQmStats .tuydQm-lost a, #tuydQmStats .tuydQm-booted a { color: #e77; }
        #tuydQmStats .tuydQm-other a { color: #babbbb; }
        #tuydQmStats .communityLaddersCredit { margin-top: 6px; }
    `);
    var scene = function () {
        var element = ujsElement("QuickmatchScene");
        return element && shownUjsElement(element) ? element : null;
    };
    var wearArt = function (element) {
        var art = warappArt(scene() || document.body);
        Object.keys(art).forEach(function (name) {
            if (art[name]) {
                element[0].style.setProperty(name, art[name]);
            }
        });
    };
    // Our own changes set off the page observer too, so only what differs is written.
    var setText = function (element, text, title) {
        if (element.text() !== text) {
            element.text(text);
        }
        if ((element.attr("title") || "") !== (title || "")) {
            element.attr("title", title || null);
        }
    };
    var setPlace = function (element, place) {
        Object.keys(place).forEach(function (key) {
            var value = Math.round(place[key]) + "px";
            if (element[0].style[key] !== value) {
                element[0].style[key] = value;
            }
        });
    };
    var unreadGames = function () {
        return (games || []).filter(function (game) {
            var result = isQuickmatchGameName(game.name) ? quickmatchResult(game, me) : null;
            return result && result !== "playing" && !templates[game.id] && !(reading && reading.tried[game.id]);
        });
    };
    var saveView = function () {
        try {
            localStorage.setItem(QUICKMATCH_VIEW_KEY, JSON.stringify({ countBoots: view.countBoots, tab: view.tab }));
        } catch (e) {
            // The view is just the default next time.
        }
    };
    var rescanSeconds = function () {
        var seconds = Math.max(1, Math.round(partial.total / 600));
        return seconds + " second" + (seconds === 1 ? "" : "s");
    };
    var saveGames = function () {
        try {
            localStorage.setItem(QUICKMATCH_GAMES_KEY, JSON.stringify({ player: me.id, time: scannedAt, checked: checkedAt, partial: partial, games: games }));
        } catch (e) {
            // Without storage Past Games is read again next time.
        }
    };
    var recordTitle = function () {
        var meta = [stats.games.length + " finished Quickmatch game" + (stats.games.length === 1 ? "" : "s")];
        if (partial) {
            meta[0] += " in your newest " + partial.read + " of " + partial.total + " games" + (scanning ? ", reading the rest" : "");
        }
        if (stats.playing) {
            meta.push(stats.playing + " in progress");
        }
        if (stats.bootLosses && !view.countBoots) {
            meta.push(stats.bootLosses + " boot loss" + (stats.bootLosses === 1 ? "" : "es") + " left out");
        }
        return meta.join(" · ");
    };
    var placeSummary = function () {
        var container = scene() && ujsElement("SettingsContainer");
        var header = container && $(container).find("[id^='ujs_HeaderText'][id$='_tmp']")[0];
        var backing = container && $(container).find("[id^='ujs_DialogBackgroundForDropShadow'][id$='_img']")[0];
        var summary = $("#tuydQmSummary");
        if (!header || !backing) {
            summary.remove();
            return;
        }
        if (summary.parent()[0] !== container) {
            summary.remove();
            summary = $('<div id="tuydQmSummary"><span class="tuydQmSummaryRecord"></span><a href="#" class="tuydQmButton tuydQmStatsButton" title="Your Quickmatch record by template and by opponent (Muli\'s Userscript)">Stats</a></div>').appendTo(container);
            wearArt(summary);
        }
        var origin = container.getBoundingClientRect();
        var box = backing.getBoundingClientRect();
        var head = header.getBoundingClientRect();
        setPlace(summary, { left: box.left - origin.left + 16, top: head.top + head.height / 2 - origin.top - 13, width: box.width - 32 });
        var record = summary.find(".tuydQmSummaryRecord");
        if (stats) {
            setText(record, quickmatchRecordText(stats) + (partial && scanning ? " …" : ""), recordTitle() + " (Muli's Userscript)");
        } else {
            setText(record, scanning || refreshing ? "Reading your games…" : failed ? "Couldn't read your games" : "", "");
        }
    };
    var placeTemplateRecords = function () {
        var byName = {};
        (stats ? stats.templates : []).forEach(function (entry) {
            if (entry.name !== null && entry.games.length) {
                byName[entry.name] = entry;
            }
        });
        $("[id^='ujs_YourRatingLabel']").filter(function () {
            return /^ujs_YourRatingLabel(?:_\d+)?_tmp$/.test(this.id);
        }).each(function () {
            var holder = $(this).parent();
            var tag = holder.children(".tuydQmTemplateRecord");
            var name = $(this).closest("[id^='ujs_TemplatesSceneTemplate']").find("[id^='ujs_TemplateNameLabel']").filter(function () {
                return /_tmp$/.test(this.id);
            }).first().text().trim();
            var entry = byName[name];
            if (!entry) {
                tag.remove();
                return;
            }
            if (!tag.length) {
                tag = $('<span class="tuydQmTemplateRecord"></span>').appendTo(holder);
            }
            var range = document.createRange();
            range.selectNodeContents(this);
            setText(tag, "· " + quickmatchRecordText(entry), entry.games.length + " game" + (entry.games.length === 1 ? "" : "s")
                + (entry.averageTurns === null ? "" : ", ~" + Math.round(entry.averageTurns) + " turns on average") + " (Muli's Userscript)");
            var left = this.offsetLeft + range.getBoundingClientRect().width + 8;
            setPlace(tag, { left: left, top: this.offsetTop + (this.offsetHeight - tag[0].offsetHeight) / 2, maxWidth: Math.max(0, this.offsetLeft + this.offsetWidth - left) });
        });
    };
    var renderTemplateStatus = function () {
        var place = dialog.find(".tuydQmTemplateStatus").empty();
        if (reading) {
            place.text("Reading templates: " + reading.done + " of " + reading.total + " games ").append('<a href="#" class="tuydQmReadStop">Stop</a>');
            return;
        }
        var unread = unreadGames().length;
        if (unread) {
            var minutes = Math.max(1, Math.round(unread * 1.5 / 60));
            place.text("The template isn't known yet for " + unread + " game" + (unread === 1 ? "" : "s") + ". ");
            $('<a href="#" class="tuydQmReadStart"></a>').text("Read " + (unread === 1 ? "it" : "them"))
                .attr("title", "Opens each game in the background, one at a time, to read its template: about " + minutes + " minute" + (minutes === 1 ? "" : "s") + ". Remembered in this browser.")
                .appendTo(place);
        }
    };
    var renderDialog = function () {
        dialog.find("[name=countBoots]").prop("checked", view.countBoots);
        dialog.find(".tuydQmRescan").prop("disabled", scanning);
        dialog.find(".tuydQmCopy, .tuydQmCsv").prop("disabled", !stats);
        dialog.find(".tuydQmStatus").text(scanning ? (partial ? "Reading your games: " + partial.read + " of " + partial.total + "…" : "Reading your games…")
            : failed ? (partial ? "Couldn't read all your games. Try Rescan later." : "Couldn't read your games. Try Rescan later.")
            : !checkedAt ? (refreshing ? "Reading your newest games…" : "")
            : partial ? "Read " + new Date(checkedAt).toLocaleString() + ". Rescan reads all " + partial.total + " of your games (about " + rescanSeconds() + ")."
            : "Read " + new Date(checkedAt).toLocaleString());
        var line = dialog.find(".tuydQmRecordLine").empty();
        if (!stats) {
            return;
        }
        line.append($("<b>").text(quickmatchRecordText(stats)), $('<span class="tuydQmMeta">').text(" · " + recordTitle()));
        dialog.find("[data-tab=templates]").text("Templates (" + stats.templates.length + ")").toggleClass("tuydQmActive", view.tab === "templates");
        dialog.find("[data-tab=opponents]").text("Opponents (" + stats.opponents.length + ")").toggleClass("tuydQmActive", view.tab === "opponents");
        dialog.find("[data-tab=recent]").text(stats.games.length === 1 ? "Last game" : stats.games.length ? "Last " + Math.min(recentCount, stats.games.length) + " games" : "Last games").toggleClass("tuydQmActive", view.tab === "recent");
        renderTemplateStatus();
        dialog.find(".tuydQmTableHolder").html(view.tab === "recent"
            ? quickmatchRecentHtml(stats.games, { query: view.query, sort: view.sort, countBoots: view.countBoots }, recentCount)
            : quickmatchTableHtml(stats[view.tab], view.tab, { query: view.query, sort: view.sort, limit: view.limit, open: view.openRow }));
    };
    var refresh = function () {
        stats = games && ready ? quickmatchStats(games, me, templates, view.countBoots) : null;
        placeSummary();
        placeTemplateRecords();
        if (dialog) {
            renderDialog();
        }
    };
    var readNext = function () {
        if (!reading) {
            return;
        }
        var game = unreadGames()[0];
        if (!game) {
            reading = null;
            refresh();
            return;
        }
        reading.tried[game.id] = true;
        var frame = $('<iframe tabindex="-1" aria-hidden="true" style="position: fixed; left: -10000px; top: 0; width: 1000px; height: 800px; border: 0;"></iframe>')
            .attr({ id: GAME_TEMPLATE_FRAME_ID, src: "/MultiPlayer?GameID=" + encodeURIComponent(game.id) }).appendTo("body");
        var started = Date.now();
        reading.timer = setInterval(function () {
            var template = null;
            try {
                var hooks = frame[0].contentWindow.UJS_Hooks;
                template = hooks && hooks.za ? gameTemplateFromData(hooks.za, game.name) : null;
            } catch (e) {
                template = null;
            }
            if (!template && Date.now() - started < 30000) {
                return;
            }
            clearInterval(reading.timer);
            frame.remove();
            if (template) {
                templates[game.id] = template;
                try {
                    localStorage.setItem(QUICKMATCH_TEMPLATES_KEY, JSON.stringify(templates));
                } catch (e) {
                    // Without storage the templates are read again next time.
                }
            } else {
                log("Quickmatch stats: couldn't read the template of game " + game.id);
            }
            reading.done++;
            refresh();
            readNext();
        }, 300);
    };
    var readFewUnread = function () {
        var unread = unreadGames().length;
        if (!reading && unread && unread <= 10) {
            startReading();
        }
    };
    var quickmatchOnly = function (list) {
        return list.filter(function (game) {
            return isQuickmatchGameName(game.name);
        });
    };
    // Each time you come to the Quickmatch screen, the newest games are read, so a game just played is counted. They're
    // added to the last full read (Rescan), if there is one and it reaches them; otherwise the stats cover only your
    // newest `newestCount` games until you Rescan.
    var refreshLatest = function () {
        if (scanning || refreshing || Date.now() - Math.max(checkedAt, refreshTriedAt) < 60 * 1000) {
            return;
        }
        var full = games && !partial;
        var cached = !full && cachedPastGames(me.id, 10 * 60 * 1000);
        if (cached) {
            games = quickmatchOnly(cached.games);
            partial = null;
            scannedAt = checkedAt = cached.time;
            saveGames();
            refresh();
            return;
        }
        var base = games;
        refreshing = true;
        refreshTriedAt = Date.now();
        refresh();
        (full ? updatePastGames(base, fetchPastGamesPage, 50, 4) : Promise.resolve(null)).then(function (merged) {
            return merged ? { games: merged } : fetchPastGamesPage(0, newestCount).then(function (page) {
                if (!page) {
                    throw new Error("war.app's game list couldn't be read");
                }
                return { games: page.games, partial: page.games.length < page.total ? { read: page.games.length, total: page.total } : null, all: page.games.length >= page.total };
            });
        }).then(function (read) {
            refreshing = false;
            if (scanning || games !== base) {
                return;
            }
            games = quickmatchOnly(read.games);
            partial = read.partial || null;
            checkedAt = Date.now();
            if (read.partial) {
                scannedAt = 0;
            } else if (read.all) {
                scannedAt = checkedAt;
            }
            failed = false;
            saveGames();
            refresh();
            readFewUnread();
        }, function (error) {
            refreshing = false;
            failed = !games;
            log("Quickmatch stats: " + (error && error.message || error && error.statusText || error));
            refresh();
        });
    };
    var startReading = function () {
        reading = { done: 0, total: unreadGames().length, tried: {}, timer: null };
        refresh();
        readNext();
    };
    var scan = function () {
        if (scanning) {
            return;
        }
        scanning = true;
        failed = false;
        refresh();
        var first = !games || partial;
        loadPastGames(me.id, 0, first ? function (read, total, soFar) {
            if (!partial || read >= partial.read) {
                games = quickmatchOnly(soFar);
                partial = { read: read, total: total };
            }
            refresh();
        } : null).then(function (loaded) {
            games = quickmatchOnly(loaded.games);
            scannedAt = loaded.time;
            checkedAt = loaded.time;
            partial = null;
            saveGames();
            scanning = false;
            refresh();
            readFewUnread();
        }, function (error) {
            log("Quickmatch stats: " + (error && error.message || error && error.statusText || error));
            scanning = false;
            failed = true;
            if (partial) {
                saveGames();
            }
            refresh();
        });
    };
    var fitDialog = function () {
        var area = dialog.parent()[0].getBoundingClientRect();
        var width = Math.max(300, Math.min(area.width - 32, 760));
        dialog.css({ width: width + "px", left: Math.round(Math.max(0, (area.width - width) / 2)) + "px", top: "10px", maxHeight: Math.round(Math.max(240, area.height - 20)) + "px" });
    };
    var search = function (query) {
        view.query = query;
        var input = dialog.find("input[type=search]");
        if (input.val() !== query) {
            input.val(query);
        }
        dialog.find(".tuydQmSearchClear").prop("hidden", !query);
        refresh();
    };
    var closeDialog = function () {
        if (dialog) {
            dialog.remove();
            dialog = null;
        }
    };
    var openDialog = function () {
        var holder = $("#UjsCanvasHolder");
        if (dialog || !holder.length) {
            return;
        }
        addCommunityLaddersStyles();
        dialog = $(`<div id="tuydQmStats" class="tuydCommunityPanel" role="dialog" aria-label="Your Quickmatch stats">
            <h3>Your Quickmatch stats</h3>
            <a href="#" class="tuydQmClose" title="Close" aria-label="Close">✕</a>
            <div class="tuydQmRecordLine"></div>
            <div class="tuydQmTools">
                <label title="A game you were booted from counts as a loss"><input type="checkbox" name="countBoots">Count boot losses</label>
                <button type="button" class="tuydQmButton tuydQmRescan" title="Read all your Past Games: about 8 seconds for 5,000 games">Rescan</button>
                <button type="button" class="tuydQmButton tuydQmCopy" title="Copy your record and top templates and opponents as text">Copy</button>
                <button type="button" class="tuydQmButton tuydQmCsv" title="Download every Quickmatch game as a spreadsheet (CSV)">CSV</button>
                <span class="tuydQmStatus"></span>
            </div>
            <div class="tuydQmTemplateStatus"></div>
            <div class="tuydQmTabs">
                <a href="#" data-tab="templates">Templates</a><a href="#" data-tab="opponents">Opponents</a><a href="#" data-tab="recent">Last games</a><span class="tuydQmSearch"><input type="search" placeholder="Search"><a href="#" class="tuydQmSearchClear" title="Clear the search" aria-label="Clear the search" hidden>✕</a></span>
            </div>
            <div class="tuydQmTableHolder"></div>
            <div class="communityLaddersCredit">From your Past Games, by Muli's Userscript</div>
        </div>`).appendTo(holder);
        wearArt(dialog);
        fitDialog();
        dialog.on("click", ".tuydQmClose", function (event) {
            event.preventDefault();
            closeDialog();
        }).on("click", ".tuydQmRescan", function () {
            scan();
        }).on("change", "[name=countBoots]", function () {
            view.countBoots = this.checked;
            saveView();
            refresh();
        }).on("click", ".tuydQmTabs a[data-tab]", function (event) {
            event.preventDefault();
            view.tab = $(this).attr("data-tab");
            view.sort = null;
            view.limit = 50;
            view.openRow = null;
            saveView();
            refresh();
        }).on("input", "input[type=search]", function () {
            search(this.value);
        }).on("click", ".tuydQmSearchClear", function (event) {
            event.preventDefault();
            search("");
            dialog.find("input[type=search]").trigger("focus");
        }).on("click", ".tuydQmTable thead td", function () {
            var key = $(this).attr("data-sort");
            var current = view.sort || (view.tab === "recent" ? { key: "date", descending: true } : { key: "games", descending: true });
            var textFirst = ["name", "template", "opponents", "result"].indexOf(key) !== -1;
            view.sort = { key: key, descending: current.key === key ? !current.descending : !textFirst };
            refresh();
        }).on("click", ".tuydQmRow", function (event) {
            if ($(event.target).closest("a").length) {
                return;
            }
            var key = $(this).attr("data-key");
            view.openRow = view.openRow === key ? null : key;
            refresh();
        }).on("click", ".tuydQmAll", function (event) {
            event.preventDefault();
            view.limit = 0;
            refresh();
        }).on("click", ".tuydQmReadStart", function (event) {
            event.preventDefault();
            startReading();
        }).on("click", ".tuydQmReadStop", function (event) {
            event.preventDefault();
            if (reading) {
                clearInterval(reading.timer);
            }
            $("#" + GAME_TEMPLATE_FRAME_ID).remove();
            reading = null;
            refresh();
        }).on("click", ".tuydQmCopy", function () {
            copyText(quickmatchSummaryText(stats, 5)).then(function () {
                dialog.find(".tuydQmStatus").text("Copied.");
            }, function () {
                dialog.find(".tuydQmStatus").text("Couldn't copy.");
            });
        }).on("click", ".tuydQmCsv", function () {
            downloadText("quickmatch-games.csv", quickmatchCsv(games, me, templates, location.origin), "text/csv;charset=utf-8");
        });
        search(view.query);
    };
    var check = function () {
        timer = null;
        if (!ready) {
            return;
        }
        var here = !!scene();
        if (dialog && !here) {
            closeDialog();
        }
        placeSummary();
        placeTemplateRecords();
        if (here && !onScene) {
            refreshLatest();
        }
        onScene = here;
    };
    $(document).on("click", ".tuydQmStatsButton", function (event) {
        event.preventDefault();
        if (dialog) {
            closeDialog();
        } else {
            openDialog();
        }
    }).on("keydown", function (event) {
        if (event.key !== "Escape" || !dialog) {
            return;
        }
        if ($(event.target).is("#tuydQmStats input[type=search]") && view.query) {
            event.preventDefault();
            search("");
        } else {
            closeDialog();
        }
    });
    $(window).on("resize", function () {
        if (dialog) {
            fitDialog();
        }
    });
    signedInPlayerId().done(function (id) {
        me.id = gamePlayerId(id);
        me.name = !me.id && window.WlPlayer ? WlPlayer.Name : null;
        if (!me.id && !me.name) {
            return;
        }
        var stored = storedQuickmatchGames(me.id);
        if (stored) {
            games = stored.games;
            scannedAt = stored.time || 0;
            checkedAt = Math.max(scannedAt, stored.checked || 0);
            partial = stored.partial || null;
        }
        ready = true;
        refresh();
        check();
        new MutationObserver(function () {
            if (!timer) {
                timer = setTimeout(check, 300);
            }
        }).observe(document.body, { childList: true, subtree: true });
    });
}

// Your Quickmatch record under war.app's Quickmatch ratings on your own profile, from what the Quickmatch
// screen last read: nothing is loaded here.
function setupQuickmatchProfileRecord() {
    signedInPlayerId().done(function (playerId) {
        var id = gamePlayerId(playerId);
        var stored = id && extractPlayerId(location.href) === playerId ? storedQuickmatchGames(id) : null;
        var heading = $("h3").filter(function () {
            return $(this).text().trim() === "Quickmatch";
        }).first();
        if (!stored || stored.partial || !heading.length || $("#tuydQmProfileRecord").length) {
            return;
        }
        var stats = quickmatchStats(stored.games, { id: id }, storedQuickmatchTemplates(), readQuickmatchView().countBoots);
        if (!stats.games.length) {
            return;
        }
        var line = $('<span id="tuydQmProfileRecord"></span>').text("Record: " + quickmatchRecordText(stats) + " in " + stats.games.length + " games")
            .attr("title", "From your Past Games on " + new Date(Math.max(stored.time, stored.checked || 0)).toLocaleString() + ", when you last opened Quickmatch (Muli's Userscript)")
            .add("<br>");
        var folded = heading.next("div.exp");
        var next = heading.nextAll("h3").first();
        if (folded.length) {
            folded.append(line);
        } else if (next.length) {
            line.insertBefore(next);
        } else {
            heading.parent().append(line);
        }
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
        '<a href="#" class="tuydGameNotesLink" title="Link a territory: click this, then a territory on the map or a bonus link, and its name goes into your notes where the cursor was. Or, as in war.app\'s chat, hold Ctrl (Cmd on a Mac) or Shift and click territories.">🔗</a>' +
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

// What war.app's link button added to a chat box: it appends " <a t_ID>Name</a>" for a territory, or
// b_ID for a bonus, to the box's text. null for anything else, such as typing.
function chatLinkAdded(before, after) {
    if (typeof before !== "string" || typeof after !== "string" || after.length <= before.length || after.indexOf(before) !== 0) {
        return null;
    }
    var match = /^\s?<a ([tb])_(\d+)>([^<]*)<\/a>$/.exec(after.slice(before.length));
    return match ? { kind: match[1] === "t" ? "territory" : "bonus", id: match[2], name: match[3] } : null;
}

// text with words put in at the cursor (start..end), spaced from the words around it.
function insertAtCursor(text, start, end, words) {
    var before = text.slice(0, start);
    var after = text.slice(end);
    var lead = before && !/\s$/.test(before) ? " " : "";
    var trail = after && !/^\s/.test(after) ? " " : "";
    var inserted = lead + words + trail;
    return { value: before + inserted + after, caret: before.length + inserted.length };
}

// The game's territories and bonuses by name, from war.app's game data (window.UJS_Hooks on a game page).
function gameMapPlaces(hooks) {
    var map = hooks && hooks.za && hooks.za.Map;
    var places = [];
    [["territory", map && map.Ia], ["bonus", map && map.pd]].forEach(function (list) {
        if (!list[1] || !Array.isArray(list[1].keys) || typeof list[1].Aa !== "function") {
            return;
        }
        list[1].keys.forEach(function (id) {
            var entry = list[1].Aa(id);
            if (entry && typeof entry.Ya === "string" && entry.Ya.trim()) {
                places.push({ kind: list[0], id: id, name: entry.Ya.trim() });
            }
        });
    });
    return places;
}

// The territories and bonuses a note names, in the order it names them. A longer name wins over one
// inside it ("South Sudan" over "Sudan"), and a territory over a bonus of the same name.
function notesPlaces(text, places) {
    var taken = [];
    var found = [];
    places.slice().sort(function (a, b) {
        return b.name.length - a.name.length || (a.kind === "territory" ? -1 : 1);
    }).forEach(function (place) {
        var escaped = place.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        var pattern = new RegExp("(?:^|[^\\p{L}\\p{N}])(" + escaped + ")(?=$|[^\\p{L}\\p{N}])", "giu");
        var match;
        while ((match = pattern.exec(text))) {
            var start = match.index + match[0].length - match[1].length;
            var end = start + match[1].length;
            if (taken.some(function (span) {
                return start < span[1] && end > span[0];
            })) {
                continue;
            }
            taken.push([start, end]);
            if (!found.some(function (other) {
                return other.place.kind === place.kind && other.place.id === place.id;
            })) {
                found.push({ place: place, at: start });
            }
        }
    });
    return found.sort(function (a, b) {
        return a.at - b.at;
    }).map(function (entry) {
        return entry.place;
    });
}

// Highlights a territory or bonus on war.app's map and moves the map to it, as a chat link does, through
// war.app's own game object (UJS_Hooks.Sd.ta). Its names are minified and can change with a war.app
// update; false then, and nothing happens.
function highlightPlace(hooks, place) {
    var game = hooks && hooks.Sd && hooks.Sd.ta;
    var map = hooks && hooks.za && hooks.za.Map;
    var view = game && game.Xb;
    try {
        if (place.kind === "territory" && game && typeof game.nv === "function" && view && typeof view.xI === "function") {
            var territory = map.Ia.Aa(place.id);
            game.nv(place.id);
            view.xI(territory.lh());
            return true;
        }
        if (place.kind === "bonus" && game && typeof game.Au === "function" && view && typeof view.wQa === "function") {
            var bonus = map.pd.Aa(place.id);
            game.Au(bonus);
            view.wQa(bonus);
            return true;
        }
    } catch (e) {
        log("Notes: couldn't highlight " + place.name + ": " + e);
    }
    return false;
}

// war.app's Live object (UJS_Hooks.Sd.ta.Nh) can hand the next territory click on the map, or the next
// bonus link click, to a callback instead of acting on it ("InterceptNextTerritoryClick", AKc, and
// "InterceptNextBonusLinkClick", zKc). null when those minified names aren't there.
function gameLive(hooks) {
    var live = hooks && hooks.Sd && hooks.Sd.ta && hooks.Sd.ta.Nh;
    return live && typeof live.AKc === "function" && typeof live.zKc === "function" ? live : null;
}

function canHighlightPlaces(hooks) {
    var game = hooks && hooks.Sd && hooks.Sd.ta;
    return !!(game && typeof game.nv === "function" && typeof game.Au === "function" && game.Xb && typeof game.Xb.xI === "function" && typeof game.Xb.wQa === "function");
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
    var shownIcons = $("[id^='ujs_SettingsIconsContainer'][id$='_img']").filter(function () {
        return shownUjsElement(this);
    });
    var icons = shownIcons.filter(function () {
        return this.getBoundingClientRect().width > 0;
    })[0];
    var after = (icons || name).getBoundingClientRect();
    var barRect = bar.getBoundingClientRect();
    var obstacles = $(bar).parent().find("*").not("#tuydGameNotesBtn").get().filter(function (element) {
        var rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.width < barRect.width * 0.8 && rect.top < barRect.bottom && rect.bottom > barRect.top;
    }).map(function (element) {
        return element.getBoundingClientRect().left;
    });
    // Setting icons that are there but not drawn yet mean war.app is still laying the bar out.
    return { bar: barRect, after: after, obstacles: obstacles, ready: !shownIcons.length || !!icons };
}

// A lobby war.app still offers you to join: you're not in the game, so it has no notes for you.
function gameLobbyNotJoined() {
    return /^Lobby\b/.test(document.title) && $(".ujsTextInner").filter(function () {
        return $(this).text().trim() === "Join Game" && shownUjsElement(this);
    }).length > 0;
}

var GAME_NOTES_SETTLE_MS = 500;
var GAME_NOTES_SETTLE_MAX_MS = 3000;

// While a game loads, war.app lays out its title bar over a short while, so the Notes button's first spot can
// be over the name. The button shows once its spot has stayed the same for a while with the bar laid out,
// or after a few seconds whatever happens. waiting: { key, since, until }, kept between checks.
function gameNotesButtonSettled(waiting, key, ready, now) {
    if (key !== waiting.key) {
        waiting.key = key;
        waiting.since = now;
    }
    return now >= waiting.until || (ready && now - waiting.since >= GAME_NOTES_SETTLE_MS);
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
            /* war.app's .btn animates every change, which would slide the button across the game to its spot. */
            transition: none;
        }
        #tuydGameNotesBtn.tuydNotesWaiting {
            visibility: hidden;
        }
        #tuydGameNotesBtn.tuydNotesOutsider {
            display: none !important;
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
        #tuydGameNotes .tuydNotesPlaces {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 3px;
        }
        #tuydGameNotes .tuydNotesPlaces:empty {
            display: none;
        }
        #tuydGameNotes .tuydNotesPlace {
            padding: 0 6px;
            border: 1px solid #4a6b8a;
            border-radius: 9px;
            background: #1d2a36;
            color: #9cc8ff;
            font-size: 12px;
            line-height: 17px;
            cursor: pointer;
        }
        #tuydGameNotes .tuydNotesPlace.tuydNotesBonus {
            border-color: #7a6a3a;
            background: #2e2817;
            color: #e0c060;
        }
        #tuydGameNotes .tuydNotesPlace:hover {
            filter: brightness(1.3);
        }
        #tuydGameNotes .tuydGameNotesLink {
            margin-left: auto;
            font-size: 13px;
            text-decoration: none;
            filter: grayscale(1);
        }
        #tuydGameNotes .tuydGameNotesLink:hover,
        #tuydGameNotes .tuydGameNotesLink.tuydLinking {
            filter: none;
        }
        #tuydGameNotes .tuydGameNotesClose {
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
    var waiting = null;
    // In the title bar the button is never in the chat's or war.app's way; without room there it sits by
    // the Game button, or left of the Chat tab while the chat is open.
    var place = function () {
        if (!gameId) {
            return;
        }
        var outsider = gameLobbyNotJoined();
        button.toggleClass("tuydNotesOutsider", outsider);
        if (outsider && $("#tuydGameNotes").length) {
            close();
        }
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
        if (waiting && gameNotesButtonSettled(waiting, next.key, !rects || rects.ready, Date.now())) {
            waiting = null;
            button.removeClass("tuydNotesWaiting");
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
        panel.find("textarea").each(function () {
            showPlaces(this);
        });
        panel.find("textarea[name=text]").trigger("focus");
        watchChatLinks();
    };
    var close = function () {
        if (timer) {
            clearTimeout(timer);
            save();
        }
        clearInterval(linkWatch);
        linkWatch = null;
        stopPicking();
        letGo();
        $("#tuydGameNotes").remove();
    };
    // war.app's chat link button puts a territory's link into the chat box; while the notes are open the
    // link is taken back out of the chat box and its name goes into the notes field last typed in.
    var linkTarget = null;
    var linkWatch = null;
    var chatBoxes = function () {
        return $("textarea[id^='ujs_SendChatInput'][id$='_input']").get();
    };
    var watchChatLinks = function () {
        var seen = {};
        chatBoxes().forEach(function (box) {
            seen[box.id] = box.value;
        });
        clearInterval(linkWatch);
        linkWatch = setInterval(function () {
            if (!$("#tuydGameNotes").length) {
                return;
            }
            chatBoxes().forEach(function (box) {
                var link = chatLinkAdded(seen[box.id], box.value);
                if (link) {
                    box.value = seen[box.id];
                    $(box).trigger("input");
                    putLinkInNotes(link.name);
                } else {
                    seen[box.id] = box.value;
                }
            });
        }, 200);
    };
    // Under each notes box, a button for each territory or bonus it names; clicking one shows it on the map.
    var mapPlaces = null;
    var showPlaces = function (field) {
        var hooks = window.UJS_Hooks;
        if (!canHighlightPlaces(hooks)) {
            return;
        }
        if (!mapPlaces || !mapPlaces.length) {
            mapPlaces = gameMapPlaces(hooks);
        }
        var row = $(field).next(".tuydNotesPlaces");
        if (!row.length) {
            row = $('<div class="tuydNotesPlaces"></div>').insertAfter(field);
        }
        var found = notesPlaces(field.value, mapPlaces).slice(0, 30);
        var key = found.map(function (place) {
            return place.kind + place.id;
        }).join(",");
        if (row.attr("data-places") === key) {
            return;
        }
        row.attr("data-places", key).empty();
        found.forEach(function (place) {
            $('<a href="#" class="tuydNotesPlace"></a>').toggleClass("tuydNotesBonus", place.kind === "bonus")
                .attr("title", "Show " + place.name + " on the map").text(place.name).data("place", place).appendTo(row);
        });
    };
    // The next territory (or bonus link) clicked goes into the notes, with the chat open or not; the click
    // does nothing else. A second click on 🔗, or closing the notes, lets war.app have its clicks back.
    var picking = null;
    var pickForNotes = function (live) {
        if (picking) {
            stopPicking();
            return;
        }
        letGo();
        var token = picking = { live: live };
        $("#tuydGameNotes .tuydGameNotesLink").addClass("tuydLinking");
        $("#tuydGameNotes .tuydGameNotesSaved").text("Click a territory or bonus");
        var take = function (place) {
            if (picking !== token) {
                return false;
            }
            if (!place) {
                stopPicking();
                return false;
            }
            picking = null;
            live.AKc(null);
            live.zKc(null);
            $("#tuydGameNotes .tuydGameNotesSaved").text("");
            putLinkInNotes(String(place.Ya || "").replace(/[<>]/g, ""));
            return true;
        };
        live.AKc(take);
        live.zKc(take);
    };
    // war.app's own shortcut: with its chat open, Ctrl/Cmd+click or Shift+click on a territory puts its link
    // in the chat. With the notes open the same click puts the name in the notes, chat open or not: while
    // one of those keys is held, the next click goes to the notes.
    var held = null;
    var holdForNotes = function () {
        var live = gameLive(window.UJS_Hooks);
        if (held || picking || !live || !$("#tuydGameNotes").length) {
            return;
        }
        var token = held = { live: live };
        var take = function (place) {
            if (held !== token || !place) {
                return false;
            }
            putLinkInNotes(String(place.Ya || "").replace(/[<>]/g, ""));
            held = null;
            live.AKc(null);
            live.zKc(null);
            holdForNotes();
            return true;
        };
        live.AKc(take);
        live.zKc(take);
    };
    var letGo = function () {
        var token = held;
        if (!token) {
            return;
        }
        held = null;
        token.live.AKc(null);
        token.live.zKc(null);
    };
    var linkKeys = function (event) {
        return event.ctrlKey || event.metaKey || event.shiftKey;
    };
    document.addEventListener("keydown", function (event) {
        if (linkKeys(event)) {
            holdForNotes();
        }
    }, true);
    document.addEventListener("keyup", function (event) {
        if (!linkKeys(event)) {
            letGo();
        }
    }, true);
    window.addEventListener("blur", letGo);
    var stopPicking = function () {
        var token = picking;
        if (!token) {
            return;
        }
        picking = null;
        token.live.AKc(null);
        token.live.zKc(null);
        $("#tuydGameNotes .tuydGameNotesLink").removeClass("tuydLinking");
        $("#tuydGameNotes .tuydGameNotesSaved").text("");
    };
    var putLinkInNotes = function (name) {
        var panel = $("#tuydGameNotes");
        panel.find(".tuydGameNotesLink").removeClass("tuydLinking");
        var field = linkTarget && $.contains(panel[0], linkTarget) ? linkTarget : panel.find("textarea[name=text]")[0];
        if (!field) {
            return;
        }
        var put = insertAtCursor(field.value, field.selectionStart, field.selectionEnd, name);
        field.value = put.value;
        $(field).trigger("input");
        // war.app moves the keyboard to its chat box after adding a link; bring it back.
        [30, 200].forEach(function (delay) {
            setTimeout(function () {
                field.focus();
                field.setSelectionRange(put.caret, put.caret);
            }, delay);
        });
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
        waiting = { key: null, since: 0, until: Date.now() + GAME_NOTES_SETTLE_MAX_MS };
        button.addClass("tuydNotesWaiting");
        var settling = setInterval(function () {
            place();
            if (!waiting) {
                clearInterval(settling);
            }
        }, 150);
        Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, gameNotesKey(id), function (setting) {
            if (gameId === id) {
                notes = normalizeGameNotes(setting && setting.value);
                button.toggleClass("tuydHasNotes", !gameNotesEmpty(notes));
            }
        });
    };
    $("body").append(isolate(button.hide(), false));
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
        if (this.tagName === "TEXTAREA") {
            showPlaces(this);
        }
        $("#tuydGameNotes .tuydGameNotesSaved").text("");
        showTurn();
        clearTimeout(timer);
        timer = setTimeout(save, 600);
    }).on("click", "#tuydGameNotes .tuydGameNotesClose", function (event) {
        event.preventDefault();
        close();
    }).on("focusin", "#tuydGameNotes textarea", function () {
        linkTarget = this;
    }).on("click", "#tuydGameNotes .tuydNotesPlace", function (event) {
        event.preventDefault();
        highlightPlace(window.UJS_Hooks, $(this).data("place"));
    }).on("click", "#tuydGameNotes .tuydGameNotesLink", function (event) {
        event.preventDefault();
        var live = gameLive(window.UJS_Hooks);
        if (live) {
            pickForNotes(live);
            return;
        }
        // war.app's own link button, in the chat; the shown one if the chat is open.
        var buttons = $("[id^='ujs_LinkButton'][id$='_btn']");
        var shown = buttons.filter(function () {
            return shownUjsElement(this);
        });
        var button = (shown.length ? shown : buttons)[0];
        if (!button) {
            $("#tuydGameNotes .tuydGameNotesSaved").text("Open the chat once to link territories");
            return;
        }
        $(this).addClass("tuydLinking");
        button.click();
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
        var link = $(renderUpdateLabel(latest));
        label.replaceWith(link);
        createSelector(".versionLabel.updateAvailable", "color: #e0c060 !important; font-weight: bold; text-decoration: none !important");
        // The link opens the file in a new tab for Tampermonkey; this page keeps running the old version,
        // so the label then offers the reload that starts the new one.
        link.one("click", function () {
            setTimeout(function () {
                var reload = $(renderReloadLabel(latest));
                link.replaceWith(reload);
                reload.on("click", function (event) {
                    event.preventDefault();
                    location.reload();
                });
            }, 0);
        });
    });
}

function renderReloadLabel(latest) {
    return '<a class="versionLabel updateAvailable updateReload" href="#" title="Once Tampermonkey has updated the script to ' + htmlEscape(latest) +
        ', reload war.app to run it. Tampermonkey leaves an empty tab behind; you can close it.">Reload to finish updating</a>';
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
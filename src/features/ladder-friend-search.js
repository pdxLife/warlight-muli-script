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

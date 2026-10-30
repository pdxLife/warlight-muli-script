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

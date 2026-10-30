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

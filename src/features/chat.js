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

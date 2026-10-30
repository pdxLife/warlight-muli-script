function idleVolumeLevel() {
    try {
        var stored = parseFloat(localStorage.getItem(IDLE_VOLUME_KEY));
        return isNaN(stored) ? 1 : Math.max(0, Math.min(1, stored));
    } catch (e) {
        return 1;
    }
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

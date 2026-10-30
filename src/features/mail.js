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

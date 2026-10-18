const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// Mirrors a thread row on war.app's /Discussion/MyMail page (names and ids are invented).
function threadRow(id, subject, starter, lastPoster, lastPost = "2019-07-31 22:19:38") {
    return `<tr data-threadid="${id}"> <td><a href="#" onclick="DeleteMailThread(${id}, function() {}); return false;">Delete</a></td>`
        + ` <td style="text-align:left" valign="middle"> <a href="/Discussion/?ID=${id}">${subject}</a> <br> <font class="text-muted"> by ${starter}</font> </td>`
        + ` <td nowrap="nowrap">2</td> <td align="right"> ${lastPost} <br> <span class="text-muted">by ${lastPoster}</span> </td> </tr>`;
}

function mailPage(rows, from, total) {
    const to = from + rows.length - 1;
    return `<table><tbody><tr><td><table border="0" width="100%"><tbody><tr><td align="right">Threads ${from} - ${to} of ${total}&nbsp;&nbsp;&nbsp;</td></tr></tbody></table>`
        + `<div><br><table class="region"><tbody><tr> <th></th> <th>Subject</th> <th>Posts</th> <th>Last&nbsp;Post</th> </tr>${rows.join("")}</tbody></table></div></td></tr></tbody></table>`;
}

const FUNCTIONS = ["mailThreadPlayers", "parseMailRange", "filterMailThreads", "loadAllMailThreads", "setupMailSearch", "mailThreadSubject", "mailThreadDay",
    "mailWords", "readMailFilters", "mailPreviewText", "storedMailPreviews", "loadMailPreviews", "readSettingValue", "buildMailSearch"];

// Mirrors a thread page on war.app: the opening message first, then the replies and the reply box.
function threadPage(text) {
    return `<table id="PostTbl_0" class="region"><tr><th>Subject: 2026-10-18 00:00:10</th></tr><tr><td><div id="PostForDisplay_0">${text}</div></td></tr></table>`
        + `<table id="PostTbl_15"><tr><td><div id="PostForDisplay_15">A reply that is not searched</div></td></tr></table>`;
}

function memoryStorage(initial = {}) {
    const items = { ...initial };
    return { getItem: (key) => (key in items ? items[key] : null), setItem: (key, value) => { items[key] = String(value); }, removeItem: (key) => { delete items[key]; }, items };
}

function fakeSettings(values = {}) {
    const saved = { ...values };
    return {
        saved,
        Table: { Settings: "Settings" },
        Row: { Settings: { Name: "name" } },
        readIndex: (table, row, name, callback) => callback(name in saved ? { name, value: saved[name] } : undefined),
        update: (table, setting) => { saved[setting.name] = setting.value; }
    };
}

function setup(html, pages = {}, storage = memoryStorage(), settings = fakeSettings({ mailPreviewAsked: true })) {
    const { dom, $ } = createDom(html, "https://war.app/Discussion/MyMail");
    const requests = [];
    $.ajax = (options) => {
        requests.push(options.url);
        const body = pages[options.url];
        return body === undefined ? $.Deferred().reject({ statusText: "Not Found" }).promise() : $.Deferred().resolve(body).promise();
    };
    const timers = [];
    const ctx = load(FUNCTIONS, {
        ...domGlobals(dom, $),
        DOMParser: dom.window.DOMParser,
        log: () => { },
        setTimeout: (fn) => timers.push(fn),
        clearTimeout: () => { },
        addCSS: () => { },
        localStorage: storage,
        Database: settings,
        MAIL_PREVIEWS_KEY: "tidyUpYourDashboard.mailPreviews",
        MAIL_PREVIEW_WORDS: 15
    });
    ctx.setupMailSearch();
    const search = (text) => {
        $("#MailSearchInput").val(text).trigger("input");
        timers.splice(0).forEach((fn) => fn());
    };
    const set = (selector, value) => {
        $(selector).val(value).trigger(selector === "#MailWordsMode" ? "change" : "input");
        timers.splice(0).forEach((fn) => fn());
    };
    const shownIds = () => Array.from($("table.region tr[data-threadid]").filter(function () {
        return this.style.display !== "none";
    }).map(function () {
        return $(this).attr("data-threadid");
    }).get());
    return { ctx, $, requests, search, set, shownIds, storage, settings };
}

test("reads the thread starter and the last poster", () => {
    const { ctx, $ } = setup(mailPage([threadRow(1, "Hello", "Alice", "Bob the Builder")], 1, 1));
    assert.deepEqual(Array.from(ctx.mailThreadPlayers($("tr[data-threadid=1]")[0])), ["Alice", "Bob the Builder"]);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.parseMailRange("Threads 11 - 23 of 23"))), { from: 11, to: 23, total: 23 });
    assert.equal(ctx.parseMailRange("No threads"), null);
});

test("filters threads by either player, ignoring case", () => {
    const { $, requests, search, shownIds } = setup(mailPage([
        threadRow(1, "Hello", "Alice", "Bob"),
        threadRow(2, "Clan war", "Carol", "alice"),
        threadRow(3, "Bob's game", "Dave", "Dave")
    ], 1, 3));
    search("ALI");
    assert.deepEqual(shownIds(), ["1", "2"]);
    assert.equal($("#MailSearchCount").text(), "2 of 3 threads");
    search("bob");
    assert.deepEqual(shownIds(), ["1"], "subjects are not searched");
    search("  ");
    assert.deepEqual(shownIds(), ["1", "2", "3"]);
    assert.equal($("#MailSearchCount").text(), "");
    assert.deepEqual(requests, [], "everything was already on the page");
});

test("loads the other pages once, so the search covers all mail", () => {
    const { requests, search, shownIds } = setup(mailPage([threadRow(1, "a", "Alice", "Me"), threadRow(2, "b", "Bob", "Me")], 1, 5), {
        "/Discussion/MyMail?Offset=2": mailPage([threadRow(3, "c", "Alice", "Me"), threadRow(4, "d", "Carol", "Me")], 3, 5),
        "/Discussion/MyMail?Offset=4": mailPage([threadRow(5, "e", "Me", "Alice")], 5, 5)
    });
    search("alice");
    assert.deepEqual(requests, ["/Discussion/MyMail?Offset=2", "/Discussion/MyMail?Offset=4"]);
    assert.deepEqual(shownIds(), ["1", "3", "5"]);
    search("carol");
    assert.deepEqual(shownIds(), ["4"]);
    assert.equal(requests.length, 2);
});

test("from a later page, earlier threads are loaded without duplicates", () => {
    const { requests, search, shownIds } = setup(mailPage([threadRow(3, "c", "Alice", "Me")], 3, 3), {
        "/Discussion/MyMail?Offset=0": mailPage([threadRow(1, "a", "Alice", "Me"), threadRow(2, "b", "Bob", "Me")], 1, 3)
    });
    search("alice");
    assert.deepEqual(requests, ["/Discussion/MyMail?Offset=0"]);
    assert.deepEqual(shownIds(), ["3", "1"]);
});

test("still filters the threads it has when a page fails to load", () => {
    const { $, search, shownIds } = setup(mailPage([threadRow(1, "a", "Alice", "Me"), threadRow(2, "b", "Bob", "Me")], 1, 4));
    search("bob");
    assert.deepEqual(shownIds(), ["2"]);
    assert.equal($("#MailSearchCount").text(), "1 of 2 threads");
});

test("recognizes the mail page", () => {
    const at = (url) => load(["pageIsMyMail"], { location: { href: url } });
    assert.ok(at("https://war.app/Discussion/MyMail").pageIsMyMail());
    assert.ok(at("https://www.warzone.com/Discussion/MyMail?Offset=50").pageIsMyMail());
    assert.ok(!at("https://war.app/Discussion/?ID=380632").pageIsMyMail());
});

test("filters by words in the subject, all of them, in any order", () => {
    const { $, set, shownIds, requests } = setup(mailPage([
        threadRow(1, "Nations cup", "dimskef", "Me"),
        threadRow(2, "Clan cup squads", "QiuSe", "Me"),
        threadRow(3, "Invitation to Join Harmony Group", "Harmony", "Me")
    ], 1, 3));
    set("#MailWordsInput", "CUP");
    assert.deepEqual(shownIds(), ["1", "2"]);
    set("#MailWordsInput", "squads clan");
    assert.deepEqual(shownIds(), ["2"]);
    assert.equal($("#MailSearchCount").text(), "1 of 3 threads");
    set("#MailSearchInput", "harmony");
    assert.deepEqual(shownIds(), [], "player and words both apply");
    assert.deepEqual(requests, [], "the subject mode reads no mail");
});

test("filters by the last post's date, from and to both included and either one optional", () => {
    const { set, shownIds } = setup(mailPage([
        threadRow(1, "a", "A", "Me", "2026-10-18 11:35:40"),
        threadRow(2, "b", "B", "Me", "2026-09-10 13:39:32"),
        threadRow(3, "c", "C", "Me", "2025-12-14 18:04:03")
    ], 1, 3));
    set("#MailFromInput", "2026-09-10");
    assert.deepEqual(shownIds(), ["1", "2"]);
    set("#MailToInput", "2026-10-17");
    assert.deepEqual(shownIds(), ["2"]);
    set("#MailFromInput", "");
    assert.deepEqual(shownIds(), ["2", "3"]);
});

test("the first-15-words mode reads each opening message once and remembers it", () => {
    const pages = {
        "/Discussion/?ID=1": threadPage("hey huddyj,<br>Would you like to continue or restart the small P/R League? What I can offer: one, two"),
        "/Discussion/?ID=2": threadPage("Game is ready, join please")
    };
    const storage = memoryStorage();
    const first = setup(mailPage([threadRow(1, "huddyj - kknd", "KKND", "Me"), threadRow(2, "game", "Sentenza", "Me")], 1, 2), pages, storage);
    first.set("#MailWordsMode", "preview");
    first.set("#MailWordsInput", "restart league");
    assert.deepEqual(first.shownIds(), ["1"]);
    assert.deepEqual(first.requests.sort(), ["/Discussion/?ID=1", "/Discussion/?ID=2"]);
    const stored = JSON.parse(storage.items["tidyUpYourDashboard.mailPreviews"]);
    assert.equal(stored["1"], "hey huddyj, Would you like to continue or restart the small P/R League? What I", "15 words, a line break counting as a space");
    first.set("#MailWordsInput", "offer");
    assert.deepEqual(first.shownIds(), [], "word 16 and later are not searched");
    first.set("#MailWordsInput", "reply");
    assert.deepEqual(first.shownIds(), [], "replies are not searched");
    first.set("#MailWordsMode", "subject");
    first.set("#MailWordsInput", "game");
    assert.deepEqual(first.shownIds(), ["2"], "back to subjects");

    const again = setup(mailPage([threadRow(1, "huddyj - kknd", "KKND", "Me"), threadRow(2, "game", "Sentenza", "Me"), threadRow(3, "new", "Bob", "Me")], 1, 3),
        { "/Discussion/?ID=3": threadPage("Join my game") }, storage);
    again.set("#MailWordsMode", "preview");
    again.set("#MailWordsInput", "join");
    assert.deepEqual(again.requests, ["/Discussion/?ID=3"], "only the new thread is read");
    assert.deepEqual(again.shownIds(), ["2", "3"]);
});

test("a thread that can't be read is left out of the words mode and tried again next time", () => {
    const storage = memoryStorage();
    const { $, set, shownIds } = setup(mailPage([threadRow(1, "a", "A", "Me"), threadRow(2, "b", "B", "Me")], 1, 2), { "/Discussion/?ID=1": threadPage("hello there") }, storage);
    set("#MailWordsMode", "preview");
    set("#MailWordsInput", "hello");
    assert.deepEqual(shownIds(), ["1"]);
    assert.match($("#MailSearchCount").text(), /^1 thread couldn't be read · 1 of 2 threads$/);
    assert.deepEqual(Object.keys(JSON.parse(storage.items["tidyUpYourDashboard.mailPreviews"])), ["1"]);
});

test("the first time the words mode would read mail, it asks, and Continue reads and is remembered", () => {
    const settings = fakeSettings();
    const { $, set, shownIds, requests } = setup(mailPage([threadRow(1, "a", "A", "Me"), threadRow(2, "b", "B", "Me")], 1, 2),
        { "/Discussion/?ID=1": threadPage("hello there"), "/Discussion/?ID=2": threadPage("bye") }, memoryStorage(), settings);
    assert.equal($("#MailWordsMode option[value=preview]").length, 1, "on by default, also with no stored setting");
    set("#MailWordsInput", "hello");
    set("#MailWordsMode", "preview");
    assert.match($("#MailPreviewNotice").text(), /opens each of your 2 mail threads once/);
    assert.deepEqual(requests, [], "nothing is read before the answer");
    assert.deepEqual(shownIds(), ["1", "2"], "the words wait for the answer");
    $("#MailPreviewContinue").trigger("click");
    assert.equal($("#MailPreviewNotice").length, 0);
    assert.deepEqual(requests.sort(), ["/Discussion/?ID=1", "/Discussion/?ID=2"]);
    assert.deepEqual(shownIds(), ["1"]);
    assert.equal(settings.saved.mailPreviewAsked, true);
});

test("the notice counts every thread, not just the first page", () => {
    const { $, set } = setup(mailPage([threadRow(1, "a", "A", "Me")], 1, 2), { "/Discussion/MyMail?Offset=1": mailPage([threadRow(2, "b", "B", "Me")], 2, 2) },
        memoryStorage(), fakeSettings());
    set("#MailWordsMode", "preview");
    assert.match($("#MailPreviewNotice").text(), /each of your 2 mail threads/);
});

test("Turn off hides the words-in-mail option, saves it as off and deletes the stored words", () => {
    const settings = fakeSettings();
    const storage = memoryStorage({ "tidyUpYourDashboard.mailPreviews": JSON.stringify({ 1: "old words" }) });
    const { $, set, requests } = setup(mailPage([threadRow(1, "a", "A", "Me")], 1, 1), {}, storage, settings);
    set("#MailWordsMode", "preview");
    $("#MailPreviewOff").trigger("click");
    assert.deepEqual(requests, []);
    assert.equal($("#MailWordsMode option[value=preview]").length, 0);
    assert.equal($("#MailWordsMode").val(), "subject");
    assert.match($("#MailPreviewNotice").text(), /settings menu/);
    assert.equal(settings.saved.mailPreviewSearch, false);
    assert.equal(storage.items["tidyUpYourDashboard.mailPreviews"], undefined);

    const later = setup(mailPage([threadRow(1, "a", "A", "Me")], 1, 1), {}, memoryStorage(), settings);
    assert.equal(later.$("#MailWordsMode option[value=preview]").length, 0, "stays off on the next visit");
});

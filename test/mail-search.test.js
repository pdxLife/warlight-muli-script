const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// Mirrors a thread row on war.app's /Discussion/MyMail page (names and ids are invented).
function threadRow(id, subject, starter, lastPoster) {
    return `<tr data-threadid="${id}"> <td><a href="#" onclick="DeleteMailThread(${id}, function() {}); return false;">Delete</a></td>`
        + ` <td style="text-align:left" valign="middle"> <a href="/Discussion/?ID=${id}">${subject}</a> <br> <font class="text-muted"> by ${starter}</font> </td>`
        + ` <td nowrap="nowrap">2</td> <td align="right"> 2019-07-31 22:19:38 <br> <span class="text-muted">by ${lastPoster}</span> </td> </tr>`;
}

function mailPage(rows, from, total) {
    const to = from + rows.length - 1;
    return `<table><tbody><tr><td><table border="0" width="100%"><tbody><tr><td align="right">Threads ${from} - ${to} of ${total}&nbsp;&nbsp;&nbsp;</td></tr></tbody></table>`
        + `<div><br><table class="region"><tbody><tr> <th></th> <th>Subject</th> <th>Posts</th> <th>Last&nbsp;Post</th> </tr>${rows.join("")}</tbody></table></div></td></tr></tbody></table>`;
}

const FUNCTIONS = ["mailThreadPlayers", "parseMailRange", "filterMailThreads", "loadAllMailThreads", "setupMailSearch"];

function setup(html, pages = {}) {
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
        clearTimeout: () => { }
    });
    ctx.setupMailSearch();
    const search = (text) => {
        $("#MailSearchInput").val(text).trigger("input");
        timers.splice(0).forEach((fn) => fn());
    };
    const shownIds = () => Array.from($("table.region tr[data-threadid]").filter(function () {
        return this.style.display !== "none";
    }).map(function () {
        return $(this).attr("data-threadid");
    }).get());
    return { ctx, $, requests, search, shownIds };
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

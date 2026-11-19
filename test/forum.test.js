const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals } = require("./harness");

// Mirrors war.app's All Forum Posts table (/Forum/Forum); thread ids and titles are invented.
const threadRow = (category, id, title) => `<tr><td>${category}</td><td></td><td><a href="/Forum/${id}-${title}">${title}</a></td><td>3</td><td>2026-11-19</td></tr>`;

function forumOverview(rows) {
    const { dom, $ } = createDom(`<table class="table"><thead><tr><th>Forum</th><th></th><th>Thread</th><th>Posts</th><th>Last Post</th></tr></thead><tbody>${rows.join("")}</tbody></table>`, "https://war.app/Forum/Forum");
    const ctx = load(["hideFeatureRequestThreads"], domGlobals(dom, $));
    const shown = () => Array.from($(".table tbody tr:visible a").map(function () { return $(this).text(); }).get());
    return { $, ctx, shown };
}

test("hides only Feature Requests threads on All Forum Posts", () => {
    const { ctx, shown } = forumOverview([
        threadRow("Classic", 1, "ban"),
        threadRow("Feature Requests", 2, "rename"),
        threadRow("Idle", 3, "cache"),
        threadRow(" Feature Requests ", 4, "cup")
    ]);
    ctx.hideFeatureRequestThreads();
    assert.deepEqual(shown(), ["ban", "cache"]);
});

test("leaves a thread whose title mentions Feature Requests", () => {
    const { ctx, shown } = forumOverview([threadRow("Help", 5, "Feature Requests")]);
    ctx.hideFeatureRequestThreads();
    assert.deepEqual(shown(), ["Feature Requests"]);
});

// Mirrors a signed-in forum or mail thread: war.app opens its React pop-up from a click anywhere in the post.
const post = (threadId, postId, body) => `<tr><td></td><td style="text-align:left">
    <div class="DiscussionPostDiv" id="PostForDisplay_${postId}" onclick="ReactionPostClicked(event, ${threadId}, ${postId});">${body}</div>
    <div class="PostReactions" id="Reactions_${postId}" data-mine=""></div></td></tr>`;

function thread(html) {
    const { dom, $ } = createDom(`<table class="region">${html}</table>`, "https://war.app/Forum/901213-seasonal-sleuthing");
    const calls = [];
    const ctx = load(["setupReactButtons"], {
        ...domGlobals(dom, $),
        addCSS: () => { },
        ReactionPostClicked: (event, threadId, postId) => calls.push({ target: event.target, threadId, postId })
    });
    ctx.setupReactButtons();
    return { $, calls };
}

test("clicking a post no longer opens the React pop-up", () => {
    const { $ } = thread(post(901213, 0, "first") + post(901213, 1572740, "reply"));
    assert.equal($(".DiscussionPostDiv[onclick]").length, 0);
});

test("a React link under each post opens war.app's pop-up for that post", () => {
    const { $, calls } = thread(post(901213, 0, "first") + post(901213, 1572740, "reply"));
    const links = $(".tuydReact a");
    assert.equal(links.length, 2);
    assert.equal(links.eq(1).closest(".tuydReact").prev().attr("id"), "Reactions_1572740");

    links.eq(1).trigger("click");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].threadId, 901213);
    assert.equal(calls[0].postId, 1572740);
    assert.equal(calls[0].target, $("#PostForDisplay_1572740")[0]);
});

test("the React link stays when war.app replaces the post's reactions", () => {
    const { $ } = thread(post(901213, 7, "body"));
    $("#Reactions_7").replaceWith('<div class="PostReactions" id="Reactions_7" data-mine="2"><span>1</span></div>');
    assert.equal($(".tuydReact").length, 1);
});

test("adds nothing when signed out, where posts have no React click", () => {
    const { $ } = thread(`<tr><td><div class="DiscussionPostDiv" id="PostForDisplay_0">guest view</div><div class="PostReactions" id="Reactions_0"></div></td></tr>`);
    assert.equal($(".tuydReact").length, 0);
});

test("running twice adds one React link per post", () => {
    const { dom, $ } = createDom(`<table>${post(9, 3, "x")}</table>`);
    const ctx = load(["setupReactButtons"], { ...domGlobals(dom, $), addCSS: () => { }, ReactionPostClicked: () => { } });
    ctx.setupReactButtons();
    ctx.setupReactButtons();
    assert.equal($(".tuydReact").length, 1);
});

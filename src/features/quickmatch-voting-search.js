var QUICKMATCH_VOTING_PER_PAGE = 25;

// A row of war.app's Quickmatch Voting list: the template's name and the line under it, "Rank: 3 (fixed)",
// "Rank: 26  57 votes" or "35 votes", with "Your votes: 3" on a second line once you've voted for it.
function quickmatchVotingTemplate(name, info) {
    name = String(name || "").replace(/\s+/g, " ").trim();
    if (!name) {
        return null;
    }
    info = String(info || "");
    var number = function (pattern) {
        var match = pattern.exec(info);
        return match ? Number(match[1]) : null;
    };
    return { name: name, rank: number(/Rank:\s*(\d+)/), fixed: /\(fixed\)/.test(info), votes: number(/(\d+)\s+votes?\b/), yourVotes: number(/Your votes:\s*(\d+)/) || 0 };
}

function quickmatchVotingInfo(template) {
    var parts = [];
    if (template.rank !== null) {
        parts.push("Rank " + template.rank + (template.fixed ? " (fixed)" : ""));
    }
    if (template.votes !== null) {
        parts.push(template.votes + " vote" + (template.votes === 1 ? "" : "s"));
    }
    if (template.yourVotes) {
        parts.push("your votes: " + template.yourVotes);
    }
    return parts.join(" · ");
}

// Names say most of what sets templates apart ("1v1", "FFA", "Commerce", "LD"), so every word of the search
// has to be in the name, in any order. The matches stay in war.app's order, which follows its Sort button.
function quickmatchVotingMatches(templates, query) {
    var words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
        return [];
    }
    return templates.filter(function (template) {
        var name = template.name.toLowerCase();
        return words.every(function (word) {
            return name.indexOf(word) !== -1;
        });
    });
}

// war.app's Quickmatch Voting shows its templates 25 at a time, with no search. A box on the "All templates:"
// line reads every page once by stepping through war.app's own pager (it pages on your side, so this sends
// nothing), lists the templates whose name has every word typed, and a click goes to the match's page and marks
// its row. Voting stays war.app's: the script never presses View, a vote or Propose.
function setupQuickmatchVotingSearch() {
    addCSS(`
        .tuydVotingSearch { position: absolute; z-index: 5; pointer-events: auto; font-size: 13px; }
        .tuydVotingSearch input { width: 100%; box-sizing: border-box; padding: 2px 22px 2px 6px; border: 1px solid #555; border-radius: 4px; background: #111; color: #eee; }
        .tuydVotingSearch input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
        .tuydVotingSearch .tuydVotingClear { position: absolute; top: 50%; right: 6px; transform: translateY(-50%); color: #babbbb; text-decoration: none; line-height: 1; }
        .tuydVotingSearch .tuydVotingClear:hover { color: #fff; }
        .tuydVotingSearch .tuydVotingResults { position: absolute; top: 100%; right: 0; width: 360px; max-width: 540px; max-height: 320px; margin-top: 2px; overflow-y: auto;
            border: 1px solid #555; border-radius: 4px; background: #1b1b1b; color: #ddd; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6); scrollbar-width: thin; scrollbar-color: #555 transparent; }
        .tuydVotingSearch .tuydVotingResult { display: flex; align-items: baseline; gap: 8px; padding: 3px 8px; cursor: pointer; }
        .tuydVotingSearch .tuydVotingResult:hover { background: #333; }
        .tuydVotingSearch .tuydVotingName { flex: 1 1 auto; min-width: 0; }
        .tuydVotingSearch .tuydVotingInfo, .tuydVotingSearch .tuydVotingPage, .tuydVotingSearch .tuydVotingNote { color: #8d8d8d; font-size: 11px; white-space: nowrap; }
        .tuydVotingSearch .tuydVotingNote { cursor: default; }
        .tuydVotingSearch .tuydVotingNote:hover { background: none; }
        .tuydVotingFound [id^='ujs_TemplateNameLabel'] .ujsTextInner { color: #e0c060 !important; }
        .tuydVotingFound > .ujsImgInner { outline: 2px solid #e0c060; outline-offset: -2px; }
    `);
    var index = null;
    var reading = false;
    var timer = null;
    var parts = function () {
        var scene = ujsElement("QuickmatchVotingScene");
        if (!scene || !shownUjsElement(scene)) {
            return null;
        }
        var list = $(scene).find("[id^='ujs_AllTemplatesContainer']").first();
        var pager = $(scene).find("[id^='ujs_PagingContainer']").first();
        var heading = $(scene).find(".ujsTextInner").filter(function () {
            return $(this).text().trim() === "All templates:";
        }).first().parent();
        return list.length && pager.length && heading.length ? { list: list, pager: pager, heading: heading } : null;
    };
    var rows = function (found) {
        return found.list.children().get().map(function (element) {
            var label = function (name) {
                return $(element).find("[id^='ujs_" + name + "']").filter(function () {
                    return /_tmp$/.test(this.id);
                }).first().text();
            };
            var template = quickmatchVotingTemplate(label("TemplateNameLabel"), label("InfoLabel"));
            return template ? $.extend(template, { element: element }) : null;
        }).filter(Boolean);
    };
    // war.app draws the pager afresh when the list is loaded again (after a vote or a new sort), and only its
    // buttons when the page changes, so a new pager means the pages read before may be out of date.
    var pagerKey = function (found) {
        return found.pager.children("[id^='ujs_Paging']")[0] || null;
    };
    var readAll = function (found, status) {
        var key = pagerKey(found);
        var state = ujsPagerState(found.pager);
        var start = ujsPageOf(state, QUICKMATCH_VOTING_PER_PAGE);
        var pages = state ? Math.max(1, Math.ceil(state.total / QUICKMATCH_VOTING_PER_PAGE)) : 1;
        var templates = [];
        var step = function (page) {
            status("Reading the templates: page " + page + " of " + pages);
            return goToUjsPage(found.pager, page, QUICKMATCH_VOTING_PER_PAGE).then(function () {
                rows(found).forEach(function (template) {
                    delete template.element;
                    templates.push($.extend(template, { page: page }));
                });
                return page < pages ? step(page + 1) : null;
            });
        };
        return step(1).then(function () {
            return goToUjsPage(found.pager, start, QUICKMATCH_VOTING_PER_PAGE);
        }).then(function () {
            return { key: key, total: state ? state.total : templates.length, templates: templates };
        });
    };
    var current = function (found) {
        var state = ujsPagerState(found.pager);
        return index && index.key === pagerKey(found) && (!state || state.total === index.total);
    };
    // The heading is a zero-size anchor at the left of its text; the box goes at the right end of the rows,
    // level with the text, in war.app's own units, so it scales with the scene.
    var place = function (found, box) {
        var text = found.heading.children(".ujsTextInner")[0];
        var row = found.list.children().first().children(".ujsImgInner")[0];
        if (!text || !row || found.list.parent()[0] !== found.heading.parent()[0]) {
            return;
        }
        var right = parseFloat(found.list[0].style.left || 0) + row.offsetWidth - 10;
        var left = parseFloat(found.heading[0].style.left || 0);
        var width = Math.max(120, Math.min(220, right - left - text.offsetWidth - 16));
        var input = box.children("input");
        box.css({ left: right - width - left, bottom: (text.offsetHeight - input.outerHeight()) / 2, width: width });
    };
    var note = function (list, text) {
        list.append($('<div class="tuydVotingResult tuydVotingNote"></div>').text(text));
    };
    var show = function (found, box) {
        var list = box.children(".tuydVotingResults").empty();
        var query = box.children("input").val();
        if (!String(query || "").trim()) {
            list.hide();
            return;
        }
        list.show();
        if (!current(found)) {
            index = null;
            if (!reading) {
                reading = true;
                readAll(found, function (text) {
                    list.empty();
                    note(list, text);
                }).done(function (result) {
                    index = result;
                }).always(function () {
                    reading = false;
                    if (list.is(":visible")) {
                        show(found, box);
                    }
                });
            }
            return;
        }
        var matches = quickmatchVotingMatches(index.templates, query);
        if (!matches.length) {
            note(list, "No template name has \"" + String(query).trim() + "\"");
            return;
        }
        note(list, matches.length + " of " + index.total + " templates");
        matches.forEach(function (template) {
            var item = $('<div class="tuydVotingResult"></div>').data("template", template);
            item.append($('<span class="tuydVotingName"></span>').text(template.name),
                $('<span class="tuydVotingInfo"></span>').text(quickmatchVotingInfo(template)),
                $('<span class="tuydVotingPage"></span>').text("page " + template.page));
            list.append(item);
        });
    };
    var open = function (found, box, template) {
        box.children(".tuydVotingResults").hide();
        goToUjsPage(found.pager, template.page, QUICKMATCH_VOTING_PER_PAGE).done(function () {
            var row = rows(found).filter(function (candidate) {
                return candidate.name === template.name;
            })[0];
            if (row) {
                $(".tuydVotingFound").removeClass("tuydVotingFound");
                $(row.element).addClass("tuydVotingFound");
                row.element.scrollIntoView({ block: "center" });
            }
        });
    };
    var check = function () {
        timer = null;
        var found = parts();
        if (!found) {
            return;
        }
        var box = found.heading.children(".tuydVotingSearch");
        if (!box.length) {
            box = $('<div class="tuydVotingSearch"><input type="search" placeholder="Search templates" title="Searches the names of all templates, on every page; every word you type, in any order (Muli\'s Userscript)"><a href="#" class="tuydVotingClear" title="Clear the search" aria-label="Clear the search" hidden>✕</a><div class="tuydVotingResults" style="display: none"></div></div>')
                .appendTo(found.heading);
            var clear = function () {
                box.children("input").val("");
                box.children(".tuydVotingClear").prop("hidden", true);
                box.children(".tuydVotingResults").hide();
            };
            box.children("input").on("input focus", function () {
                box.children(".tuydVotingClear").prop("hidden", !$(this).val());
                show(parts() || found, box);
            }).on("keydown", function (event) {
                event.stopPropagation();
                if (event.key === "Escape") {
                    clear();
                } else if (event.key === "Enter") {
                    var first = box.find(".tuydVotingResult").filter(function () {
                        return $(this).data("template");
                    }).first();
                    if (first.length) {
                        open(parts() || found, box, first.data("template"));
                    }
                }
            });
            box.on("click", ".tuydVotingClear", function (event) {
                event.preventDefault();
                clear();
                box.children("input").trigger("focus");
            }).on("click", ".tuydVotingResult", function () {
                var template = $(this).data("template");
                if (template) {
                    open(parts() || found, box, template);
                }
            });
        }
        place(found, box);
    };
    $(document).on("mousedown", function (event) {
        if (!$(event.target).closest(".tuydVotingSearch").length) {
            $(".tuydVotingResults").hide();
        }
    });
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 300);
        }
    }).observe(document.body, { childList: true, subtree: true });
    check();
}

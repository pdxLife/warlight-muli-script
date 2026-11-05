// war.app's game data (window.UJS_Hooks) holds the turn being built (Od), the game (ya) and its GameOrderPick
// class (pxd); the other names are minified and change with war.app updates, and this is null then. A
// teammate's picks reach you once they commit, as territory ids in their order (TeammateOrders.qqa).
function teamPicksState(hooks) {
    try {
        var turn = hooks && hooks.Od;
        var links = hooks && hooks.ya;
        var Pick = hooks && hooks.pxd;
        if (!turn || typeof turn.H0 !== "function" || typeof turn.nv !== "function" || typeof Pick !== "function"
            || !links || typeof links.kb !== "function" || typeof links.uc !== "function") {
            return null;
        }
        var game = links.kb();
        var us = links.uc();
        var root = turn.ta;
        var sent = links.zd && links.zd.em;
        if (!game || game.Xa !== 5 || !us || us.lh || typeof us.eb !== "function"
            || !root || typeof root.xf !== "function" || root.xf() !== turn || !sent || typeof sent.Ra !== "function") {
            return null;
        }
        var self = us.eb();
        var picksOf = function (orders) {
            return (orders || []).filter(function (order) {
                return order instanceof Pick;
            }).map(function (order) {
                return order.nc;
            });
        };
        var teammates = sent.Ra().map(function (pair) {
            var orders = pair.fa || {};
            var player = game.qb && typeof game.qb.Aa === "function" ? game.qb.Aa(pair.Na) : null;
            return {
                id: pair.Na,
                name: player && typeof player.Wd === "function" ? String(player.Wd(null) || "") : "",
                picks: Array.isArray(orders.qqa) ? orders.qqa.slice() : picksOf(orders.ac)
            };
        }).filter(function (teammate) {
            return teammate.id !== self && teammate.picks.length > 0;
        });
        if (!teammates.length) {
            return null;
        }
        return {
            self: self,
            own: picksOf((turn.ac || []).map(function (wrapped) {
                return wrapped && wrapped.Pb;
            })),
            teammates: teammates
        };
    } catch (e) {
        return null;
    }
}

// Replaces your picks with the teammate's, in their order, the way war.app loads saved picks when a game
// opens (LoadOrders, H0) and then tells itself the orders changed (nv), which saves them as unfinished
// orders. Nothing is committed.
function copyTeammatePicks(hooks, self, picks) {
    var Pick = hooks.pxd;
    hooks.Od.H0(picks.map(function (territory, index) {
        return new Pick(self, territory, index);
    }));
    hooks.Od.nv();
}

function teamPicksReplaceQuestion(own, teammate) {
    if (!own.length || own.join(",") === teammate.picks.join(",")) {
        return null;
    }
    return "Replace your " + own.length + (own.length === 1 ? " pick" : " picks") + " with " + (teammate.name || "your teammate") + "'s "
        + teammate.picks.length + "? Nothing is committed: you can still change them before you commit.";
}

function teamPicksHtml(teammates) {
    return teammates.map(function (teammate) {
        var name = teammate.name || "teammate";
        return '<a href="#" class="btn btn-primary btn-sm tuydTeamPicksBtn" data-player="' + htmlEscape(String(teammate.id)) + '" title="'
            + htmlEscape("Put " + name + "'s " + teammate.picks.length + " picks, in their order, in place of yours. Nothing is committed (Muli's Userscript)")
            + '">Copy ' + htmlEscape(name) + "'s picks</a>";
    }).join("");
}

// Left of war.app's Orders panel, level with its top; null when the panel isn't shown.
function teamPicksSpot(panel, width) {
    if (!panel || panel.width <= 0 || panel.height <= 0) {
        return null;
    }
    return { left: Math.max(8, Math.round(panel.left - 8 - width)), top: Math.round(panel.top) };
}

function setupTeamPicksCopy() {
    addCSS(`
        #tuydTeamPicks {
            position: fixed;
            z-index: 50;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
            pointer-events: auto;
        }
        #tuydTeamPicks .tuydTeamPicksBtn {
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            transition: none;
        }
    `);
    var state = null;
    var shown = "";
    var flash = null;
    var update = function () {
        var box = $("#tuydTeamPicks");
        var panel = ujsElement("OrdersList", "_pch");
        state = panel && shownUjsElement(panel) ? teamPicksState(window.UJS_Hooks) : null;
        if (!state) {
            box.remove();
            shown = "";
            return;
        }
        var key = JSON.stringify(state.teammates);
        if (!box.length) {
            box = $('<div id="tuydTeamPicks"></div>').appendTo("body");
            box.on("pointerdown mousedown touchstart", function (event) {
                event.stopPropagation();
            });
            box.on("click", ".tuydTeamPicksBtn", copy);
        }
        if (key !== shown && !flash) {
            shown = key;
            box.html(teamPicksHtml(state.teammates));
        }
        var spot = teamPicksSpot(panel.getBoundingClientRect(), box.outerWidth());
        if (spot) {
            box.css(spot);
        }
    };
    var copy = function (event) {
        event.preventDefault();
        var button = $(this);
        var current = teamPicksState(window.UJS_Hooks);
        var id = String(button.attr("data-player"));
        var teammate = current && current.teammates.filter(function (candidate) {
            return String(candidate.id) === id;
        })[0];
        if (!teammate) {
            update();
            return;
        }
        var question = teamPicksReplaceQuestion(current.own, teammate);
        if (question && !window.confirm(question)) {
            return;
        }
        try {
            copyTeammatePicks(window.UJS_Hooks, current.self, teammate.picks);
        } catch (e) {
            logError("Couldn't copy " + teammate.name + "'s picks: " + e);
            return;
        }
        clearTimeout(flash);
        button.text("Copied: check, then commit");
        flash = setTimeout(function () {
            flash = null;
            shown = "";
            update();
        }, 4000);
    };
    setInterval(update, 1000);
}

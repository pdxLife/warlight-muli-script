// An Open Tournaments card as war.app draws it: "Name by creator", "64-player double elimination tournament. (17 spaces
// left)" or "Round robin tournament", the coins line ("Entry fee: Free!  1st place prize: 100 coins. …", or none) and
// the boot time, red for real-time. Team size isn't on the card; it's null until war.app's list says (openTournamentsInfo).
function openTournamentFromCard(card) {
    var $card = $(card);
    // Only war.app's own hiding inside the card counts: the card itself may be hidden by the filter.
    var text = function (name) {
        var element = $card.find("[id^='ujs_" + name + "'][id$='_tmp']").first();
        var hidden = element.parentsUntil(card).addBack().filter(function () {
            return this.style.display === "none";
        }).length;
        return element.length && !hidden ? element.text().replace(/\s+/g, " ").trim() : "";
    };
    var id = /[?&]ID=(\d+)/i.exec($card.find("a[href*='Tournament?ID=']").attr("href") || "");
    var label = $card.find("[id^='ujs_TournamentNameLabel'][id$='_tmp']").first();
    var title = label.text().replace(/\s+/g, " ").trim();
    var by = label.find("span").filter(function () {
        return /^\s*by\s/.test($(this).text()) && !$(this).children().length;
    }).last().text().replace(/\s+/g, " ").trim();
    var info = text("InfoLabel");
    var elimination = /^([\d,]+)-player (single|double) elimination/i.exec(info);
    var coins = text("CoinsLabel");
    var fee = /Entry fee:\s*Free/i.test(coins) ? 0 : /Entry fee:\s*([\d,]+)/i.exec(coins);
    var prizes = [];
    coins.replace(/(\d+)(?:st|nd|rd|th) place prize:\s*(?:up to\s*)?([\d,]+)/gi, function (match, place, amount) {
        prizes.push([Number(place), Number(amount.replace(/,/g, ""))]);
    });
    var boot = $card.find("[id^='ujs_BootTimeLabel'][id$='_tmp']").first();
    return {
        id: id ? Number(id[1]) : null,
        name: by && title.slice(-by.length) === by ? title.slice(0, -by.length).trim() : title,
        creator: by.replace(/^by\s+/, ""),
        clan: "",
        type: elimination ? (elimination[2].toLowerCase() === "double" ? 1 : 0) : /^Round robin/i.test(info) ? 2 : null,
        players: elimination ? Number(elimination[1].replace(/,/g, "")) : null,
        teamSize: null,
        realTime: /^(?:red|rgb\(255,\s*0,\s*0\))$/i.test(boot.length ? boot[0].style.color : ""),
        fee: fee === 0 ? 0 : fee ? Number(fee[1].replace(/,/g, "")) : null,
        prizes: prizes
    };
}

function openTournamentCards() {
    return $("#ujs_OpenTournamentsContainer").children().filter(function () {
        return /^ujs_TournamentInfoControl(_\d+)?$/.test(this.id);
    }).toArray();
}

// The filters that make sense for tournaments anyone can join, from the ones Past Tournaments search has.
function normalizeOpenTournamentsFilter(value) {
    var all = normalizePastTournamentsFilter(value);
    return { query: all.query, type: all.type, teams: all.teams, speed: all.speed, coins: all.coins, minPlayers: all.minPlayers, maxPlayers: all.maxPlayers };
}

function openTournamentsFilterActive(filter) {
    return Object.keys(filter).some(function (key) {
        return !!filter[key];
    });
}

// What a card doesn't tell (team size until war.app's list is read, a round robin's size) doesn't filter it out.
function openTournamentMatches(tournament, filter) {
    var known = Object.assign({}, normalizePastTournamentsFilter(filter));
    if (tournament.teamSize === null || tournament.teamSize === undefined) {
        known.teams = "";
    }
    if (tournament.players === null || tournament.players === undefined) {
        known.minPlayers = 0;
        known.maxPlayers = 0;
    }
    if (tournament.type === null) {
        known.type = "";
    }
    return pastTournamentMatches(Object.assign({ prizes: [] }, tournament), known, {});
}

// war.app stacks the cards from the top with `bottom`, each as tall as its own lines. Cards that match take the places
// from the top down, in war.app's order, and the rest are hidden; with no filter, every card goes back where it was.
function layoutOpenTournaments(cards, matches) {
    cards.forEach(function (card) {
        if (card.getAttribute("data-tuyd-bottom") === null) {
            card.setAttribute("data-tuyd-bottom", parseFloat(card.style.bottom) || 0);
        }
    });
    var bottom = function (card) {
        return Number(card.getAttribute("data-tuyd-bottom"));
    };
    var height = function (card) {
        var art = document.getElementById(card.id + "_img");
        return art ? parseFloat(art.style.height) || 0 : 0;
    };
    cards = cards.slice().sort(function (a, b) {
        return bottom(b) - bottom(a);
    });
    var gap = cards.length > 1 ? Math.max(0, bottom(cards[0]) - bottom(cards[1]) - height(cards[1])) : 0;
    var top = cards.length ? bottom(cards[0]) + height(cards[0]) : 0;
    var shown = 0;
    cards.forEach(function (card) {
        var visible = !matches || matches(card);
        card.style.display = visible ? "" : "none";
        if (visible) {
            card.style.bottom = (matches ? top - height(card) : bottom(card)) + "px";
            top -= height(card) + gap;
            shown++;
        }
    });
    return { shown: shown, total: cards.length };
}

// war.app's Open Tournaments has no filter. With 6 or more open tournaments, a Filter button left of its title opens
// filters by name or creator, kind, players or teams, speed, coins and number of players, above the bar so the list stays
// in view; war.app's cards that don't match are hidden and the rest move up. Team sizes come from war.app's own list (filter 8 of GetMyTournaments), read
// once the teams filter or the dropdown is used.
function setupOpenTournamentsFilter() {
    var filter = normalizeOpenTournamentsFilter({});
    try {
        filter = normalizeOpenTournamentsFilter(JSON.parse(localStorage.getItem(OPEN_TOURNAMENTS_FILTER_KEY)) || {});
    } catch (e) {
    }
    var known = {};
    var fetching = false;
    var fetchedAt = 0;
    var signature = "";
    var timer = null;
    addTournamentButtonStyles();
    addCSS(`
        #tuydOtFilter { position: absolute; bottom: 32px; left: 4px; width: 604px; box-sizing: border-box; z-index: 20; padding: 8px 10px; pointer-events: auto;
            background: rgba(22, 22, 22, 0.97); border: 1px solid #555; border-radius: 4px; color: #ccc; font-size: 13px; }
        #tuydOtFilter > div { margin-bottom: 6px; }
        #tuydOtFilter > div:last-child { margin-bottom: 0; }
        #tuydOtFilter input, #tuydOtFilter select { display: inline-block; width: auto; margin: 0 6px 2px 0; background: #222; color: #ddd; border: 1px solid #555;
            padding: 1px 4px; color-scheme: dark; }
        #tuydOtFilter input[type=search] { width: 220px; }
        #tuydOtFilter input[type=number] { width: 56px; }
        #tuydOtFilter label { font-weight: normal; margin: 0; }
        #tuydOtFilter a { color: #e0c060; }
        #tuydOtFilter .tuydOtCount { color: #8d8d8d; }
        .tuydOtOpen.tuydOtActive { color: #ffd700; }
    `);
    var scene = function () {
        var element = ujsElement("TournamentsScene");
        return element && shownUjsElement(element) ? element : null;
    };
    var cardData = function (card) {
        var tournament = openTournamentFromCard(card);
        var info = known[tournament.id];
        return info ? Object.assign(tournament, { teamSize: info.teamSize, players: info.players, realTime: info.realTime, fee: info.fee, prizes: info.prizes }) : tournament;
    };
    var learn = function () {
        var cards = openTournamentCards();
        var missing = cards.some(function (card) {
            var tournament = openTournamentFromCard(card);
            return tournament.id !== null && !known[tournament.id];
        });
        if (!missing || fetching || !lastMyTournamentsRequest || Date.now() - fetchedAt < 30 * 1000) {
            return;
        }
        fetching = true;
        fetchedAt = Date.now();
        fetchMyTournaments(lastMyTournamentsRequest, 0, 2147483647, 8).then(function (page) {
            page.open.concat(page.tournaments).forEach(function (tournament) {
                known[tournament.id] = tournament;
            });
        }, function (error) {
            log("Open Tournaments: " + (error && error.message || error));
        }).then(function () {
            fetching = false;
            apply();
        });
    };
    var apply = function () {
        var cards = openTournamentCards();
        var active = openTournamentsFilterActive(filter);
        var counts = layoutOpenTournaments(cards, active ? function (card) {
            return openTournamentMatches(cardData(card), filter);
        } : null);
        $(".tuydOtOpen").toggleClass("tuydOtActive", active)
            .attr("title", active ? "Showing " + counts.shown + " of " + counts.total + " open tournaments (Muli's Userscript)" : "Filter the open tournaments (Muli's Userscript)");
        $("#tuydOtFilter .tuydOtCount").text(active ? counts.shown + " of " + counts.total + " shown" + (counts.shown ? "" : ": none matches") : counts.total + " open tournaments");
        if (active && filter.teams) {
            learn();
        }
    };
    var save = function () {
        try {
            localStorage.setItem(OPEN_TOURNAMENTS_FILTER_KEY, JSON.stringify(filter));
        } catch (e) {
        }
    };
    var closeDropdown = function () {
        $("#tuydOtFilter").remove();
    };
    var openDropdown = function () {
        var bar = $(ujsElement("OpenTournamentsTopBar"));
        if (!bar.length || $("#tuydOtFilter").length) {
            return;
        }
        var dropdown = $(`<div id="tuydOtFilter" role="dialog" aria-label="Filter the open tournaments">
            <div><input type="search" name="query" placeholder="Name or creator" aria-label="Search by name or creator">
                <select name="type" aria-label="Kind"><option value="">Any kind</option><option value="single">Single elimination</option>
                    <option value="double">Double elimination</option><option value="roundRobin">Round robin</option></select>
                <select name="teams" aria-label="Teams"><option value="">Players or teams</option><option value="solo">Players</option><option value="teams">Teams</option></select></div>
            <div><select name="speed" aria-label="Speed"><option value="">Any speed</option><option value="realTime">Real-time</option><option value="multiDay">Multi-day</option></select>
                <select name="coins" aria-label="Coins"><option value="">Any coins</option><option value="free">No entry fee</option><option value="fee">Entry fee</option>
                    <option value="prize">Coin prizes</option></select>
                <label>Players <input type="number" name="minPlayers" min="0" step="1" aria-label="At least this many players"> to
                    <input type="number" name="maxPlayers" min="0" step="1" aria-label="At most this many players"></label></div>
            <div><span class="tuydOtCount"></span> · <a href="#" class="tuydOtClear">Clear</a></div>
        </div>`).appendTo(bar);
        dropdown.find("input, select").each(function () {
            $(this).val(filter[this.name] ? String(filter[this.name]) : "");
        });
        apply();
        learn();
    };
    var check = function () {
        timer = null;
        var cards = scene() ? openTournamentCards() : [];
        var bar = $(ujsElement("OpenTournamentsTopBar"));
        if (cards.length < OPEN_TOURNAMENTS_FILTER_MIN) {
            closeDropdown();
            $(".tuydOtOpen").remove();
            if (signature) {
                signature = "";
                layoutOpenTournaments(cards, null);
            }
            return;
        }
        if (bar.length && !bar.children(".tuydOtOpen").length) {
            var button = $('<a href="#" class="tuydPtButton tuydOtOpen">Filter</a>').appendTo(bar);
            var art = warappArt(scene());
            if (art["--tuyd-button"]) {
                button[0].style.setProperty("--tuyd-button", art["--tuyd-button"]);
            }
        }
        var now = cards.map(function (card) {
            return card.id + ":" + card.getAttribute("data-tuyd-bottom");
        }).join(",");
        if (now !== signature) {
            signature = now;
            apply();
        }
    };
    $(document).on("click", ".tuydOtOpen", function (event) {
        event.preventDefault();
        if ($("#tuydOtFilter").length) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }).on("click", "#tuydOtFilter .tuydOtClear", function (event) {
        event.preventDefault();
        filter = normalizeOpenTournamentsFilter({});
        $("#tuydOtFilter").find("input, select").val("");
        save();
        apply();
    }).on("input change", "#tuydOtFilter input, #tuydOtFilter select", function () {
        var field = function (name) {
            return $("#tuydOtFilter [name=" + name + "]").val();
        };
        filter = normalizeOpenTournamentsFilter({
            query: field("query"), type: field("type"), teams: field("teams"), speed: field("speed"), coins: field("coins"),
            minPlayers: field("minPlayers"), maxPlayers: field("maxPlayers")
        });
        save();
        apply();
    }).on("mousedown", function (event) {
        if ($("#tuydOtFilter").length && !$(event.target).closest("#tuydOtFilter, .tuydOtOpen").length) {
            closeDropdown();
        }
    }).on("keydown", function (event) {
        if (event.key === "Escape") {
            closeDropdown();
        }
    });
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 200);
        }
    }).observe(document.body, { childList: true, subtree: true });
    check();
}

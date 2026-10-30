// war.app's Services calls send and answer hex text. A leaderboard row is: 01 01, the clan (00, or 01, two
// numbers and its name), 01, a number and a byte, the level, the name, four numbers (the third is the
// "#N" after the name) and the rating as a little-endian double. The player count closes the answer.
function parseQuickmatchLeaderboard(hex) {
    hex = String(hex || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
        return null;
    }
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    var int = function (p) {
        return (bytes[p] | bytes[p + 1] << 8 | bytes[p + 2] << 16 | bytes[p + 3] << 24) >>> 0;
    };
    var decoder = new TextDecoder("utf-8", { fatal: true });
    var text = function (p) {
        if (bytes[p] !== 1) {
            return null;
        }
        var length = 0;
        var shift = 0;
        var q = p + 1;
        do {
            length |= (bytes[q] & 127) << shift;
            shift += 7;
        } while (bytes[q++] & 128 && shift < 28);
        if (q + length > bytes.length) {
            return null;
        }
        try {
            return { value: decoder.decode(bytes.subarray(q, q + length)), end: q + length };
        } catch (e) {
            return null;
        }
    };
    var row = function (p) {
        if (bytes[p] !== 1 || bytes[p + 1] !== 1) {
            return null;
        }
        p += 2;
        if (bytes[p] === 1) {
            var clan = text(p + 9);
            if (!clan) {
                return null;
            }
            p = clan.end;
        } else if (bytes[p] === 0) {
            p += 1;
        } else {
            return null;
        }
        if (bytes[p] !== 1 || int(p + 6) > 1000) {
            return null;
        }
        var name = text(p + 10);
        if (!name || name.end + 24 > bytes.length) {
            return null;
        }
        var rating = new Float64Array(bytes.slice(name.end + 16, name.end + 24).buffer)[0];
        return Number.isFinite(rating) ? { name: name.value, number: int(name.end + 8), rating: rating, end: name.end + 24 } : null;
    };
    for (var start = 0; start < bytes.length - 4; start++) {
        var rows = [];
        var p = start;
        var next;
        while ((next = row(p))) {
            rows.push({ name: next.name, number: next.number, rating: next.rating });
            p = next.end;
        }
        if (rows.length && p === bytes.length - 4) {
            return { total: int(p), rows: rows };
        }
    }
    return null;
}

function leaderboardRequestBody(template, offset, count) {
    var hex = function (n) {
        return [0, 8, 16, 24].map(function (shift) {
            return ("0" + ((n >>> shift) & 255).toString(16)).slice(-2);
        }).join("").toUpperCase();
    };
    return template.slice(0, -16) + hex(offset) + hex(count);
}

function parseYourRating(text) {
    var match = /Your rating:\s*(-?[\d,]+(?:\.\d+)?)/i.exec(String(text || ""));
    return match ? Number(match[1].replace(/,/g, "")) : null;
}

// Pages are sorted by rating, so a binary search finds the page with your rating; war.app shows
// ratings to one decimal, so they're compared at that precision.
function findLeaderboardRank(fetchPage, rating, name, pageSize) {
    var round = function (value) {
        return Math.round(value * 10) / 10;
    };
    var placeOn = function (page, offset) {
        var rows = page.rows;
        var index = rows.findIndex(function (row) {
            return row.name === name && round(row.rating) === rating;
        });
        if (index !== -1) {
            return { rank: offset + index + 1, total: page.total, exact: true };
        }
        return {
            rank: offset + rows.filter(function (row) {
                return round(row.rating) > rating;
            }).length + 1,
            total: page.total,
            exact: false
        };
    };
    var where = function (page) {
        if (!page || !page.rows.length) {
            return null;
        }
        if (round(page.rows[page.rows.length - 1].rating) > rating) {
            return "below";
        }
        return round(page.rows[0].rating) < rating ? "above" : "here";
    };
    return fetchPage(0, pageSize).then(function (first) {
        var side = where(first);
        if (!side) {
            return null;
        }
        if (side !== "below") {
            return placeOn(first, 0);
        }
        var low = 1;
        var high = Math.ceil(first.total / pageSize) - 1;
        var step = function () {
            if (low > high) {
                return { rank: Math.min(low * pageSize, first.total) + 1, total: first.total, exact: false };
            }
            var middle = Math.floor((low + high) / 2);
            return fetchPage(middle * pageSize, pageSize).then(function (page) {
                var side = where(page);
                if (!side) {
                    return null;
                }
                if (side === "here") {
                    return placeOn(page, middle * pageSize);
                }
                if (side === "below") {
                    low = middle + 1;
                } else {
                    high = middle - 1;
                }
                return step();
            });
        };
        return step();
    });
}

function leaderboardRankText(result) {
    return result ? "Rank " + (result.exact ? "" : "≈ ") + "#" + result.rank.toLocaleString("en-US") + " of " + result.total.toLocaleString("en-US") : "";
}

function watchQuickmatchLeaderboardRequests(callback) {
    var open = XMLHttpRequest.prototype.open;
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.tuydUrl = String(url);
        return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
        if (/[?&]m=GetQuickmatchLeaderboards\b/.test(this.tuydUrl || "") && typeof body === "string") {
            try {
                callback(this.tuydUrl, body);
            } catch (e) {
                log("Quickmatch leaderboard rank: " + e);
            }
        }
        return send.apply(this, arguments);
    };
}

function setupLeaderboardRank() {
    addCSS(`
        .tuydLeaderboardRank {
            position: absolute;
            white-space: nowrap;
            color: #e0c060;
            font-size: 15.4px;
            line-height: 15.4px;
            pointer-events: auto;
        }
    `);
    var request = null;
    var me = "";
    var searches = {};
    var timer = null;
    var label = function () {
        return $("[id^='ujs_HeaderLabel']").filter(function () {
            return /^ujs_HeaderLabel(?:_\d+)?_tmp$/.test(this.id) && parseYourRating($(this).text()) !== null;
        }).first();
    };
    var show = function (key, text, title) {
        var tmp = label();
        if (!tmp.length) {
            return;
        }
        var holder = tmp.parent();
        var tag = holder.children(".tuydLeaderboardRank");
        if (!text) {
            tag.remove();
            return;
        }
        if (!tag.length) {
            tag = $('<span class="tuydLeaderboardRank"></span>').appendTo(holder);
        }
        var range = document.createRange();
        range.selectNodeContents(tmp[0]);
        var width = range.getBoundingClientRect().width;
        tag.attr("data-key", key).text(text).attr("title", title).css({ left: tmp[0].offsetLeft + width + 12, top: tmp[0].offsetTop });
    };
    var check = function () {
        timer = null;
        var tmp = label();
        if (!tmp.length || !request) {
            return;
        }
        var rating = parseYourRating(tmp.text());
        var key = $("#ujs_CategoryBtn").text().trim() + "|" + rating;
        var cacheKey = "tuydLeaderboardRank:" + key;
        if (!searches[key]) {
            var cached = null;
            try {
                cached = JSON.parse(sessionStorage.getItem(cacheKey));
            } catch (e) {
            }
            if (cached && cached.time > Date.now() - 10 * 60 * 1000) {
                searches[key] = Promise.resolve(cached.result);
            } else {
                var template = request.body;
                var url = request.url;
                searches[key] = findLeaderboardRank(function (offset, count) {
                    return Promise.resolve($.ajax({
                        url: url,
                        type: "POST",
                        data: leaderboardRequestBody(template, offset, count),
                        dataType: "text",
                        contentType: "application/x-www-form-urlencoded; charset=UTF-8"
                    })).then(parseQuickmatchLeaderboard);
                }, rating, me, 50).then(function (result) {
                    try {
                        sessionStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), result: result }));
                    } catch (e) {
                    }
                    return result;
                }, function (error) {
                    log("Quickmatch leaderboard rank: " + error);
                    return null;
                });
            }
        }
        if (tmp.parent().children(".tuydLeaderboardRank").attr("data-key") !== key) {
            show(key, "Rank …", "Finding your rank (Muli's Userscript)");
        }
        searches[key].then(function (result) {
            if (label().length && $("#ujs_CategoryBtn").text().trim() + "|" + parseYourRating(label().text()) === key) {
                show(key, leaderboardRankText(result), result && !result.exact ? "Your place among the players with your rating, as shown (Muli's Userscript)" : "Your place on this leaderboard (Muli's Userscript)");
            }
        });
    };
    watchQuickmatchLeaderboardRequests(function (url, body) {
        if (/^(?:[0-9a-f]{2})+$/i.test(body) && body.length > 16) {
            request = { url: url, body: body };
        }
    });
    if (window.playerDataReady) {
        playerDataReady.done(function (player) {
            me = player && player.Name || "";
        });
    }
    new MutationObserver(function () {
        if (!timer) {
            timer = setTimeout(check, 300);
        }
    }).observe(document.body, { childList: true, subtree: true });
}

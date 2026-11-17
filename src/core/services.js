// war.app's Services calls carry a message number, and its updates renumber them (November 2026: GetClanWar
// 305 → 311). These are the numbers in ujs.js v=639304508939095333; war.app's own requests replace them as
// they're seen.
var WARAPP_SERVICE_OPS = {
    GetMapDetails: 75,
    GetMyTournaments: 90,
    GetClanWar: 311,
    GetClanWarMap: 312,
    GetClanWarClan: 313,
    GetClanWarGames: 314,
    GetClanWarTimeslots: 315,
    GetClanWarTimeslot: 316
};
var seenServiceOps = {};

function noteServiceOp(name, body) {
    var hex = String(body || "").trim();
    if (!/^(?:[0-9a-f]{2})+$/i.test(hex) || hex.length < 28 || hex.substr(4, 8).toUpperCase() !== "39F1475A") {
        return;
    }
    seenServiceOps[name] = parseInt(hex.substr(26, 2) + hex.substr(24, 2) + hex.substr(22, 2) + hex.substr(20, 2), 16);
}

// Once war.app has sent a number that differs from the table, the table is out of date, and a number the
// script hasn't seen war.app use could now mean another message, so there's none.
function serviceOp(name) {
    if (seenServiceOps[name]) {
        return seenServiceOps[name];
    }
    var stale = Object.keys(seenServiceOps).some(function (seen) {
        return seen in WARAPP_SERVICE_OPS && WARAPP_SERVICE_OPS[seen] !== seenServiceOps[seen];
    });
    return stale ? null : WARAPP_SERVICE_OPS[name] || null;
}

function serviceName(op) {
    return Object.keys(WARAPP_SERVICE_OPS).filter(function (name) {
        return serviceOp(name) === op;
    })[0] || null;
}

// Resolves with null for a player or tournament wl-stats doesn't know (404), so nothing is shown for it.
function fetchWlStats(url, maxAgeMs) {
    var key = "tidyUpYourDashboard.wlStats:" + url;
    try {
        var cached = JSON.parse(sessionStorage.getItem(key));
        if (cached && Date.now() - cached.at < (maxAgeMs || WL_STATS_CACHE_MS)) {
            return $.Deferred().resolve(cached.data).promise();
        }
    } catch (e) {
    }
    var remember = function (data) {
        try {
            sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data }));
        } catch (e) {
        }
        return data;
    };
    // jQuery 1.x's then() keeps a failure failed unless the filter returns a resolved promise.
    return $.ajax({ url: url, dataType: "json" }).then(remember, function (xhr) {
        return xhr && xhr.status === 404 ? $.Deferred().resolve(remember(null)) : $.Deferred().reject(xhr);
    });
}

// Resolves with the AWP ranking and the custom.wl-stats.com series, each left empty when its site
// can't be reached, so one being down doesn't hide the other.
function settleRequest(request, what) {
    var settled = $.Deferred();
    request.done(function (data) {
        settled.resolve(data);
    }).fail(function (xhr) {
        log("Error loading " + what + ": " + (xhr && xhr.statusText));
        settled.resolve(null);
    });
    return settled.promise();
}

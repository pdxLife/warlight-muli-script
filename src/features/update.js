function checkVersion() {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "version", function (v) {
        var currentVersion = v != undefined ? v.value : undefined;
        log("Current version " + currentVersion);
        if (currentVersion == version) {
            //Script Up to date
        } else if (currentVersion == undefined) {
            //Script new installed
            addDefaultBookmark();
            setupSettingsDatabase();
        } else {
            removePlayerDataCookie();
        }
        addVersionLabel();
        if (sessionStorage.getItem("showUserscriptMenu")) {
            $('#userscriptMenu').modal('show');
            sessionStorage.removeItem("showUserscriptMenu")
        }
    });
    Database.update(Database.Table.Settings, {
        name: "version",
        value: version
    }, undefined, function () {
    })
}

function addVersionLabel() {
    if (pageIsExamineMap() || pageIsDesignMap()) {
        return;
    }
    $("body").append('<div class="versionLabel" data-toggle="modal" data-target="#userscriptMenu">' + version + '</div>');
    createSelector(".versionLabel", "z-index:101;position:fixed; right:0; bottom: 0; padding: 5px; color: bisque; font-size: 10px; cursor:pointer");
    // In a game the label would sit on the game's own buttons, so it shows only while the game is still a
    // lobby. war.app turns a lobby into the game without loading a new page; its title says which.
    if (pageIsGame()) {
        createSelector("body.tuydInGame .versionLabel", "display: none !important");
        var sync = function () {
            $("body").toggleClass("tuydInGame", !/^Lobby\b/.test(document.title));
        };
        sync();
        var title = document.querySelector("title");
        if (title) {
            new MutationObserver(sync).observe(title, { childList: true, characterData: true, subtree: true });
        }
    }
}
function parseScriptVersion(source) {
    var match = /^\/\/\s*@version\s+(\S+)/m.exec(String(source || ""));
    return match ? match[1] : null;
}

function compareVersions(a, b) {
    var left = String(a).split(".");
    var right = String(b).split(".");
    for (var i = 0; i < Math.max(left.length, right.length); i++) {
        var diff = (parseInt(left[i], 10) || 0) - (parseInt(right[i], 10) || 0);
        if (diff) {
            return diff > 0 ? 1 : -1;
        }
    }
    return 0;
}

// Resolves with the version on GitHub, read at most once a day; GitHub serves the file to any site.
function latestScriptVersion() {
    var cached = null;
    try {
        cached = JSON.parse(localStorage.getItem(UPDATE_CHECK_KEY));
    } catch (e) {
    }
    if (cached && Date.now() - cached.at < (cached.failed ? UPDATE_RETRY_MS : UPDATE_CHECK_MS)) {
        return $.Deferred().resolve(cached.latest || null).promise();
    }
    var remember = function (entry) {
        try {
            localStorage.setItem(UPDATE_CHECK_KEY, JSON.stringify(entry));
        } catch (e) {
        }
    };
    var result = $.Deferred();
    $.ajax({ url: SCRIPT_URL, dataType: "text" }).done(function (source) {
        var latest = parseScriptVersion(source);
        remember({ at: Date.now(), latest: latest });
        result.resolve(latest);
    }).fail(function (xhr) {
        log("Error checking for a new version: " + (xhr && xhr.statusText));
        remember({ at: Date.now(), latest: cached && cached.latest, failed: true });
        result.resolve(cached && cached.latest || null);
    });
    return result.promise();
}

// Only the corner version label changes: it turns into a gold link that updates the script.
function setupUpdateNotice() {
    latestScriptVersion().done(function (latest) {
        var label = $(".versionLabel").not(".updateAvailable");
        if (!latest || compareVersions(latest, version) <= 0 || !label.length) {
            return;
        }
        var link = $(renderUpdateLabel(latest));
        label.replaceWith(link);
        createSelector(".versionLabel.updateAvailable", "color: #e0c060 !important; font-weight: bold; text-decoration: none !important");
        // The link opens the file in a new tab for Tampermonkey; this page keeps running the old version,
        // so the label then offers the reload that starts the new one.
        link.one("click", function () {
            setTimeout(function () {
                var reload = $(renderReloadLabel(latest));
                link.replaceWith(reload);
                reload.on("click", function (event) {
                    event.preventDefault();
                    location.reload();
                });
            }, 0);
        });
    });
}

function renderReloadLabel(latest) {
    return '<a class="versionLabel updateAvailable updateReload" href="#" title="Once Tampermonkey has updated the script to ' + htmlEscape(latest) +
        ', reload war.app to run it. Tampermonkey leaves an empty tab behind; you can close it.">Reload to finish updating</a>';
}

// Opening the .user.js file is what makes Tampermonkey show its update screen.
function renderUpdateLabel(latest) {
    return '<a class="versionLabel updateAvailable" target="_blank" rel="noopener" href="' + htmlEscape(SCRIPT_URL) + '" title="Version ' + htmlEscape(latest) +
        ' is available (you have ' + htmlEscape(version) + '). Click to update.">Update to ' + htmlEscape(latest) + '</a>';
}

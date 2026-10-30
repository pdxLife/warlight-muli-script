function removePlayerDataCookie() {
    $.removeCookie("muli_wl_player");
}
function loadPlayerData() {
    let deferred = $.Deferred();
    let cookieValue = $.cookie('muli_wl_player');
    if (cookieValue) {
        try {
            window.WlPlayer = JSON.parse(cookieValue);
            log("Skipping reloading player data " + $.cookie('wlPlayerCacheValid'));
            return deferred.resolve(window.WlPlayer).promise();
        } catch (e) {
            log("Discarding unreadable player data cookie");
            removePlayerDataCookie();
        }
    }

    let $profileLink = $(".dropdown-menu a[href*='Profile']");
    if (!$profileLink.length) {
        log("Profile link not found — user may not be logged in");
        return deferred.reject().promise();
    }

    let player = {
        Name: null,
        PlayerId: null,
        ProfileId: null,
        ProfileToken: [],
        isMember: null,
        OnVacationUntil: null
    }
    let profileUrl = $profileLink.prop("href");
    $.ajax({ url: profileUrl }).done(function (response) {
        try {
            let page = $(new DOMParser().parseFromString(response, "text/html"));
            player.Name = page.find("#AccountDropDown").text().trim();
            player.PlayerId = extractPlayerId(profileUrl);
            player.ProfileId = extractProfileId(profileUrl);
            player.ProfileToken = extractProfileToken(profileUrl);
            player.isMember = page.find("#MemberIcon").length > 0;
            player.OnVacationUntil = getVacationEndDate(page);

            window.WlPlayer = player;

            $.cookie("muli_wl_player", JSON.stringify(player), { expires: new Date(new Date().getTime() + 1 * 60 * 60 * 1000) });
            deferred.resolve(player);
        } catch (e) {
            log("Error loading player data: " + e);
            deferred.reject();
        }
    }).fail(function (xhr) {
        log("Error loading player data: " + xhr.statusText);
        deferred.reject();
    });
    return deferred.promise();
}

function getVacationEndDate(page) {
    let vacationText = page.find("img[src*='Vacation']")
        .parent()
        .contents()
        .filter(function () {
            if (this.nodeType === 3) {
                return this.nodeValue.includes("vacation")
            }
            return false;
        })
        .text()
        .trim();
    let match = vacationText.match(/(\d{1,2}\/\d{1,2}\/\d{4} \d{2}:\d{2}:\d{2})/);

    if (match) {
        return new Date(match[1]);
    }
    return null;
}

/**
 * Extracts the full id of a player. The player id is built as following:
 * - first 2 digits of the profile token
 * - the profile id
 * - last 2 digits of the profile token
 */
function extractPlayerId(url) {
    let match = url.match(/p=(\d+)/);
    if (match != null) {
        return match[1];
    }
    return null;
}

function extractProfileId(url) {
    let match = url.match(/p=(\d+)/);
    if (match != null) {
        return match[1].slice(2, -2);
    }
    return null;
}

function extractProfileToken(url) {
    let match = url.match(/p=(\d+)/);
    if (match != null) {
        return [match[1].slice(0, 2), match[1].slice(-2)];
    }
    return null;
}

function signedInPlayerId() {
    var result = $.Deferred();
    playerDataReady.done(function (player) {
        result.resolve(player && player.PlayerId ? String(player.PlayerId) : null);
    }).fail(function () {
        result.resolve(null);
    });
    return result.promise();
}

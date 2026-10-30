function databaseReady() {
    log("Running main");
    runFeatures(mainFeatures());
}

function setupMaakFeatures() {
    runFeatures(maakFeatures());
}

function pageFeatures() {
    return [
        { name: "dashboard loader", match: pageIsDashboard, run: showDashboardLoader },
        { name: "Formatting toolbar for posts", section: "Forum", match: pageIsThread, run: setupTextarea },
        { name: "Bookmark link and layout tweaks in threads", section: "Forum", match: isAnyForumThread, run: setupForumThreadTweaks },
        { name: "Level previews in posts", section: "Forum", match: isAnyForumThread, run: parseForumSPLevels },
        { name: "MTL top 10 in MTL threads", section: "Forum", match: isAnyForumThread, run: setupMtlForumTop },
        { name: "Bookmark link and player search", section: "Tournaments", run: setupTournamentPage },
        { name: "custom.wl-stats.com link", section: "Tournaments", run: setupCustomTournamentLink },
        { name: "Community ladders on the Ladders page", section: "Community", run: setupCommunityLadders },
        { name: "custom.wl-stats.com link and player record on the Seasonal Ladder", section: "Community", match: pageHasUjsScenes, run: setupSeasonalLadderCustom },
        { name: "Search your friends in a team ladder proposal", section: "Community", run: setupLadderFriendSearch },
        { name: "Your standing on Community Events", section: "Community", run: setupCommunityEventsStanding },
        { name: "Community page: community events, the MTL top 10 and the 5 latest blog posts", section: "Community", match: pageIsCommunityHome, run: setupCommunityPageSummary },
        { name: "Community event standings on clan pages", section: "Clans", run: setupClanStandings },
        { name: "Sortable Common Games table", section: "Other", match: pageIsCommonGames, run: setupCommonGamesDataTable },
        { name: "Clan list search", section: "Clans", match: pageIsClanList, run: setupClanListSearch },
        { name: "Your clan's progress on the Clan War page", section: "Clans", match: pageHasUjsScenes, run: setupClanWarProgress },
        { name: "Win rates and today's games on Clan War players", section: "Clans", match: pageHasUjsScenes, run: setupClanWarPlayers },
        { name: "Your record on each template in Clan War timeslots", section: "Clans", match: pageHasUjsScenes, run: setupClanWarTimeslotRecords },
        { name: "Records by template and opponent on Clan War clans", section: "Clans", match: pageHasUjsScenes, run: setupClanWarClanRecords },
        { name: "Map search", section: "Maps & levels", match: pageIsMapsPage, run: setupMapSearch },
        { name: "Level bookmark link", section: "Maps & levels", match: pageIsLevelOverview, run: setupLevelBookmark },
        { name: "Collapse blank lines", section: "Profile", match: pageIsProfile, run: hideExtraBlanks },
        { name: "Trophies", section: "Profile", match: pageIsProfile, run: displayTrophies },
        { name: "Collapsible stat sections", section: "Profile", match: pageIsProfile, run: foldProfileStats },
        { name: "AWP World Tour stats", section: "Profile", match: pageIsProfile, run: setupAwpProfileStats },
        { name: "custom.wl-stats.com stats", section: "Profile", match: pageIsProfile, run: setupCustomProfileStats },
        { name: "MTL and Seasonal Ladder in the Ladders table", section: "Profile", match: pageIsProfile, run: setupLadderProfileRows },
        { name: "Your Quickmatch record on your profile", section: "Profile", match: pageIsProfile, run: setupQuickmatchProfileRecord },
        { name: "Sort and filter player search results", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchSort },
        { name: "Tags on players in search results", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchTags },
        { name: "Open a pasted profile link from player search", section: "Community", match: pageIsPlayerSearch, run: setupPlayerSearchShortcuts },
        { name: "Your rank next to your rating on Quickmatch leaderboards", section: "Community", match: pageIsQuickmatch, run: setupLeaderboardRank },
        { name: "Your Quickmatch record and stats", section: "Community", match: pageIsQuickmatch, run: setupQuickmatchStats },
        { name: "Player pace in game lobbies", section: "Games", match: pageIsGame, run: setupLobbyPace },
        { name: "Private chat list: players still in the game first", section: "Games", match: pageIsGame, run: setupPrivateChatList },
        { name: "Idle volume slider", section: "Idle", match: pageIsIdle, run: setupIdleVolume },
        { name: "Log of Idle's pop-ups", section: "Idle", match: pageIsIdle, run: setupIdlePopupLog },
        { name: "Check big market purchases in Idle", section: "Idle", match: pageIsIdle, run: setupIdleMarketCheck },
        { name: "Confirm before using powers and artifacts in Idle", section: "Idle", match: pageIsIdle, run: setupIdleActionConfirm },
        { name: "Better artifact copies and an artifact list in Idle", section: "Idle", match: pageIsIdle, run: setupIdleArtifactHelpers },
        { name: "Warn when Idle is open in another tab", section: "Idle", match: pageIsIdle, run: setupIdleTabWarning },
        { name: "Time to afford and best army camp in Idle", section: "Idle", match: pageIsIdle, run: setupIdleUpgradeHints },
        { name: "What a tech is missing and its market cost in Idle", section: "Idle", match: pageIsIdle, run: setupIdleTechCost },
        { name: "Count of things Idle needs you for in the tab title", section: "Idle", match: pageIsIdle, run: setupIdleAttention },
        { name: "global styles", run: setGlobalStyles },
        { name: "Map of the Week table fix", section: "Maps & levels", match: pageIsMapOfTheWeek, run: setupMapOfTheWeekStyles }
    ];
}

function mainFeatures() {
    return [
        { name: "Hidden thread formatting", section: "Forum", match: pageIsForumOverview, run: setupForumOverviewFilters },
        { name: "communitylevels.online banner", section: "Maps & levels", match: pageIsCommunityLevels, run: setupCommunityLevels },
        { name: "Hide-thread buttons", section: "Forum", match: function () { return pageIsForumOverview() || pageIsSubForum(); }, run: setupForumThreadHiding },
        { name: "private notes", match: function () { return pageIsProfile() && $("#BlockListLink").length > 0; }, run: function () { ifSettingIsEnabled('showPrivateNotesOnProfile', loadPrivateNotes); } },
        { name: "Hide ignored threads on Community page", section: "Community", match: pageIsCommunity, run: hideIgnoredForumThreadsFromCommnuityList },
        { name: "Blacklist counter", section: "Other", match: pageIsBlacklistPage, run: setupBlacklistCounter },
        { name: "Block list search", section: "Other", match: pageIsBlacklistPage, run: setupBlockListSearch },
        { name: "Mail search by player", section: "Other", match: pageIsMyMail, run: setupMailSearch },
        { name: "Total points earned", section: "Other", match: pageIsPointsPage, run: displayTotalPointsEarned },
        { name: "dashboard", match: pageIsDashboard, run: setupDashboard },
        { name: "Chat button on the dashboard", section: "Dashboard", match: pageIsDashboard, run: setupDashboardChatLink },
        { name: "Game chat from the dashboard", section: "Dashboard", match: pageIsDashboard, run: setupDashboardGameChat },
        { name: "Your-turn count in tab title and background checks", section: "Dashboard", match: pageIsDashboard, run: setupTurnAlerts },
        { name: "Sort your-turn games by time left before boot", section: "Dashboard", match: pageIsDashboard, run: setupBootTimeSort },
        { name: "Time left before boot on your-turn games", section: "Dashboard", match: pageIsDashboard, run: setupBootTimeLeft },
        { name: "Community event badges on My Games", section: "Dashboard", match: pageIsDashboard, run: setupEventBadges },
        { name: "Clan War countdown on the dashboard", section: "Dashboard", match: pageIsDashboard, run: setupClanWarCountdown },
        { name: "Open Games filter", section: "Dashboard", match: function () { return pageIsDashboard() || pageIsOpenGamesPage(); }, run: setupOpenGamesFilter },
        { name: "Mark Open Games you joined", section: "Dashboard", match: function () { return pageIsDashboard() || pageIsOpenGamesPage(); }, run: setupJoinedOpenGames },
        { name: "Refresh Open Games every few minutes", section: "Dashboard", match: pageIsDashboard, run: setupOpenGamesAutoRefresh },
        { name: "Filters on Past Games", section: "Games", match: pageIsPastGames, run: setupPastGamesFilter },
        { name: "Search all your past tournaments", section: "Tournaments", match: pageHasUjsScenes, run: setupPastTournamentsSearch },
        { name: "Filters on Open Tournaments", section: "Tournaments", match: pageHasUjsScenes, run: setupOpenTournamentsFilter },
        { name: "Notes in games", section: "Games", match: pageCanOpenGame, run: setupGameNotes },
        { name: "commit confirmation", match: pageIsGame, run: function () { ifSettingIsEnabled('confirmCommit', setupCommitConfirm); } },
        { name: "Volume of the chat and turn sounds", section: "Games", match: function () { return !pageIsIdle(); }, run: setupGameSoundVolume },
        { name: "Read chat messages aloud", section: "Games", match: function () { return pageIsGame() || pageIsChatRoom(); }, run: setupChatSpeech },
        { name: "Mute players and highlight mentions in game chat", section: "Games", match: pageIsGame, run: setupGameChatTools },
        { name: "Chat rooms: hide events, mute players, highlight mentions", section: "Community", match: pageIsChatRoom, run: setupChatRoomTools },
        { name: "Suggest names after @ in chat rooms", section: "Community", match: pageIsChatRoom, run: setupChatRoomMentionSuggest },
        { name: "Suggest names after @ in game chat", section: "Games", match: pageIsGame, run: setupGameMentionSuggest },
        { name: "hide coins", match: function () { return !pageIsDashboard(); }, run: function () { ifSettingIsEnabled('hideCoinsGlobally', hideCoinsGlobally); } },
        { name: "maak.ch features", run: function () { ifSettingIsEnabled('useMaakServices', setupMaakFeatures); } },
        { name: "New version notice", section: "Other", run: setupUpdateNotice }
    ];
}

function maakFeatures() {
    return [
        { name: "community level records", match: pageIsProfile, run: loadCommunityLevelRecords }
    ];
}

function toggleableFeatures() {
    return pageFeatures().concat(mainFeatures()).filter(function (feature) {
        return feature.section;
    });
}

function disabledFeatures() {
    try {
        var stored = JSON.parse(localStorage.getItem(DISABLED_FEATURES_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        return [];
    }
}

function saveDisabledFeatures(names) {
    try {
        localStorage.setItem(DISABLED_FEATURES_KEY, JSON.stringify(names));
    } catch (e) {
        log("Could not mirror disabled features: " + e);
    }
    return Database.update(Database.Table.Settings, { name: "disabledFeatures", value: names }, undefined);
}

function syncDisabledFeatures() {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "disabledFeatures", function (setting) {
        try {
            localStorage.setItem(DISABLED_FEATURES_KEY, JSON.stringify(setting && Array.isArray(setting.value) ? setting.value : []));
        } catch (e) {
            log("Could not mirror disabled features: " + e);
        }
    });
}

function runFeature(name, run) {
    try {
        run();
    } catch (e) {
        logError("Feature \"" + name + "\" failed: " + (e && e.stack ? e.stack : e));
    }
}

function runFeatures(features) {
    var disabled = disabledFeatures();
    features.forEach(function (feature) {
        if (feature.section && disabled.indexOf(feature.name) !== -1) {
            log("Feature \"" + feature.name + "\" is turned off");
            return;
        }
        runFeature(feature.name, function () {
            if (!feature.match || feature.match()) {
                feature.run();
            }
        });
    });
}

function DOM_ContentReady() {
    $(".order-xl-2").addClass("SideColumn");

    log("DOM content ready");
    if ($(".navbar").length > 0) {
        log("Unity is not full screen")
    } else {
        log("Unity is full screen");
        return;
    }

    // The script's hidden game frames are driven from the page that opened them, and kept silent.
    if (inScriptFrame()) {
        muteScriptFrame();
        return;
    }

    runFeature("DataTables sorting", registerDataTableSorting);
    setupWLError();
    createSelector('body > footer', 'display:none');

    $.fn.outerHTML = function (s) {
        return s ? this.before(s).remove() : jQuery("<p>").append(this.eq(0).clone()).html();
    };

    window.playerDataReady = loadPlayerData();

    runFeatures(pageFeatures());

    Database.init(function () {
        log("database is ready");
        if (pageIsDashboard()) {
            wljs_WaitDialogJS.Start(null, "Tidying Up...")
        }
        runFeatures([
            { name: "userscript menu", run: setupUserscriptMenu },
            { name: "bookmark menu", run: setupBookmarkMenu },
            { name: "feature toggle sync", run: syncDisabledFeatures },
            { name: "version check", run: checkVersion },
            { name: "main", run: databaseReady }
        ]);
    });
}

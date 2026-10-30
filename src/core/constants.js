window.timeUserscriptStart = new Date().getTime();
window.MULIS_USERSCRIPT = true;
var version = (typeof GM_info !== 'undefined') ? GM_info.script.version : '3.60.2';
var DISABLED_FEATURES_KEY = "tidyUpYourDashboard.disabledFeatures";
// Every domain war.app has used; the old ones now redirect to war.app. Bookmarks saved on any of them open on the current domain.
var SITE_HOSTS = ["war.app", "warzone.com", "warlight.net"];
var TURN_CHECK_INTERVAL = 5 * 60 * 1000;
var AWP_SITE = "https://awp.wl-stats.com";
var CUSTOM_SITE = "https://custom.wl-stats.com";
var WL_STATS_CACHE_MS = 60 * 60 * 1000;
var SERIES_CACHE_MS = 10 * 60 * 1000;
var GAMES_CACHE_MS = 5 * 60 * 1000;
var OPEN_GAMES_BOOT_UNITS = { minutes: 1, hours: 60, days: 1440 };
var CLAN_SERIES_KINDS = ["clan_league", "clan_cup", "nations_cup"];
// The players' series on the Ladders page, in order after the AWP World Tour and the MTL: P/R League,
// Titled Tuesday, then the Seasonal Ladder.
var PLAYER_SERIES_KINDS = ["league", "events", "ladder"];
var STAGED_SERIES_KINDS = ["clan_cup", "nations_cup"];
var COMMUNITY_PAGE_SERIES = ["titled-tuesday", "pr-league", "seasonal-ladder", "clan-league", "nations-cup"];
var COMMUNITY_PAGE_BLOG_POSTS = 5;
var MTL_TOP_COUNT = 10;
var SCRIPT_URL = "https://raw.githubusercontent.com/pdxLife/warlight-muli-script/main/Tidy_up_your_Dashboard.user.js";
var UPDATE_CHECK_KEY = "tidyUpYourDashboard.updateCheck";
var MAIL_PREVIEWS_KEY = "tidyUpYourDashboard.mailPreviews";
var MAIL_PREVIEW_WORDS = 15;
var IDLE_VOLUME_KEY = "tidyUpYourDashboard.idleVolume";
var PLAYER_SEARCH_KEY = "tidyUpYourDashboard.playerSearch";
var IDLE_LOG_KEY = "tidyUpYourDashboard.idleLog";
var IDLE_STORED_KEY = "tidyUpYourDashboard.idleStoredArtifacts";
var SITE_URL = "https://pdxlife.github.io/warlight-muli-script/";
var REPO_URL = "https://github.com/pdxLife/warlight-muli-script";
var MENU_SECTIONS_KEY = "tidyUpYourDashboard.menuSections";
// The settings menu's sections, in order: the key a setting or feature names, and its heading.
var MENU_SECTIONS = [["Dashboard", "Dashboard"], ["Games", "Games"], ["Tournaments", "Tournaments"], ["Community", "Ladders & community"], ["Profile", "Profile"], ["Clans", "Clans"],
    ["Idle", "Idle"], ["Forum", "Forum"], ["Maps & levels", "Maps & levels"], ["Other", "Other"], ["Third-party data", "Third-party data"]];
var UPDATE_CHECK_MS = 24 * 60 * 60 * 1000;
var UPDATE_RETRY_MS = 60 * 60 * 1000;
var PAST_TOURNAMENTS_FEATURE = "Search all your past tournaments";
var CLAN_WAR_PROGRESS_FEATURE = "Your clan's progress on the Clan War page";
var CLAN_WAR_PLAYERS_FEATURE = "Win rates and today's games on Clan War players";
var CLAN_WAR_TIMESLOT_FEATURE = "Your record on each template in Clan War timeslots";
var CLAN_WAR_CLAN_FEATURE = "Records by template and opponent on Clan War clans";
var OPEN_TOURNAMENTS_FILTER_KEY = "tidyUpYourDashboard.openTournamentsFilter";
var OPEN_TOURNAMENTS_FILTER_MIN = 6;

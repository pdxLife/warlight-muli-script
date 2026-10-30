function pageIsOpenGamesPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/OpenGames(?:[?#].*)?$/i);
}

function pageIsPointsPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/Points.*/i);
}

function pageIsDashboard() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/(?:#|\?|$).*$/i);
}

function pageIsProfile() {
    return location.href.match(/^https?:\/\/[^\/]+\/profile\?p=[0-9]+/i);
}

function pageIsLevelOverview() {
    return location.href.match(/^https?:\/\/[^\/]+\/SinglePlayer\/Level\?ID=[0-9]+$/i);
}

function pageIsMapsPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/maps/i);
}

function pageIsForumThread() {
    return location.href.match(/^https?:\/\/[^\/]+\/Forum\/[0-9]+.*/i);
}

function pageIsForumOverview() {
    return location.href.match(/^https?:\/\/[^\/]+\/Forum\/Forum.*/i);
}

function pageIsThread() {
    return location.href.match(/^https?:\/\/[^\/]+\/(Forum|Discussion|Clans\/CreateThread).*/i);
}

function pageIsSubForum() {
    return location.href.match(/^https?:\/\/[^\/]+\/Forum\/[A-Z]+.*/i);
}

function pageIsClanForumThread() {
    return location.href.match(/^https?:\/\/[^\/]+\/Discussion\/\?ID=[0-9]+.*/);
}

function pageIsClanPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/Clans\/?\?(?:[^#]*&)?ID=\d+/i);
}

function pageIsClanList() {
    return location.href.match(/^https?:\/\/[^\/]+\/Clans\/List/i);
}

function pageIsTournament() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/Tournament\?ID=[0-9]+/i);
}

function pageIsGame() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\?GameID=[0-9]+/i);
}

// War.app's client-drawn pages (Quickmatch, tournaments, ladders, chat rooms) can open a game without a page load.
function pageCanOpenGame() {
    return pageIsGame() || pageIsQuickmatch() || (!pageIsIdle() && document.getElementById("UjsCanvasHolder") !== null);
}

// A page war.app draws client-side, which can switch to another such scene (Tournaments → Past Tournaments) in place.
function pageHasUjsScenes() {
    return document.getElementById("UjsCanvasHolder") !== null;
}

function pageIsExamineMap() {
    return location.href.match(/^https?:\/\/[^\/]+\/SinglePlayer\?PreviewMap.*/i);
}

function pageIsDesignMap() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\?DesignMaps.*/i);
}

function pageIsCommonGames() {
    return location.href.match(/^https?:\/\/[^\/]+\/CommonGames\?p=[0-9]+$/i);
}

function pageIsCommunityLevels() {
    return location.href.match(/^https?:\/\/[^\/]+\/SinglePlayer\/CommunityLevels/i);
}

function pageIsCommunity() {
    return location.href.match(/^https?:\/\/[^\/]+\/Community/i);
}

function pageIsCommunityEvents() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/?\?(?:[^#]*&)?CommunityEvents=1(?:[&#]|$)/i);
}

function pageIsLadders() {
    return location.href.match(/^https?:\/\/[^\/]+\/Ladders\/?(?:[?#]|$)/i);
}

function pageIsLadderSeasons() {
    return location.href.match(/^https?:\/\/[^\/]+\/LadderSeasons\/?(?:[?#]|$)/i);
}

function pageIsLadderSeason() {
    return location.href.match(/^https?:\/\/[^\/]+\/LadderSeason\/?\?/i);
}

function pageIsLadderPlayer() {
    return location.href.match(/^https?:\/\/[^\/]+\/LadderPlayer\/?\?/i);
}

function pageIsMapOfTheWeek() {
    return location.href.match(/^https?:\/\/[^\/]+\/MapOfTheWeek.*/i);
}

function pageIsChatRoom() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/?\?(?:[^#]*&)?ChatRoom=/i);
}

function pageIsQuickmatch() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/?\?(?:[^#]*&)?Quickmatch=/i);
}

function pageIsCommunityHome() {
    return location.href.match(/^https?:\/\/[^\/]+\/Community\/?(?:[?#].*)?$/i);
}

function pageIsPlayerSearch() {
    return location.href.match(/^https?:\/\/[^\/]+\/Community\/PlayerSearch(?:[?#].*)?$/i);
}

function pageIsPastGames() {
    return location.href.match(/^https?:\/\/[^\/]+\/MultiPlayer\/PastGames(?:[?#].*)?$/i);
}

function pageIsIdle() {
    return location.href.match(/^https?:\/\/[^\/]+\/Idle(?:[\/?#].*)?$/i);
}

function pageIsMyMail() {
    return location.href.match(/^https?:\/\/[^\/]+\/Discussion\/MyMail(?:[?#].*)?$/i);
}

function pageIsBlacklistPage() {
    return location.href.match(/^https?:\/\/[^\/]+\/ManageBl(?:ack|ock)List.*/i);
}

this.$$$ = jQuery.noConflict(true);
window.wlerror = function () {
};
setupImages();

console.log("Running Muli's userscript");
if (pageIsDashboard()) {
    createSelector(".container-fluid", "display: none");
    createSelector("body", "overflow: hidden")
}

setupDatabase();
log("indexedDB setup complete");
if (disabledFeatures().indexOf(PAST_TOURNAMENTS_FEATURE) === -1) {
    watchMyTournamentsRequests();
}
if ([CLAN_WAR_PROGRESS_FEATURE, CLAN_WAR_PLAYERS_FEATURE, CLAN_WAR_TIMESLOT_FEATURE, CLAN_WAR_CLAN_FEATURE].some(function (name) {
    return disabledFeatures().indexOf(name) === -1;
})) {
    watchClanWarTraffic();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    log("Readystate complete|interactive");

    DOM_ContentReady();
} else {
    window.document.addEventListener("DOMContentLoaded", DOM_ContentReady);
    log("Readystate loading")
}



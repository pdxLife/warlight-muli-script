function foldForSearch(text) {
    return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function filterBlockList(query) {
    var needle = foldForSearch(query.trim());
    var rows = $("li[id^='ListItem_']");
    var shown = 0;
    rows.each(function () {
        var matches = needle === "" || foldForSearch($(this).find("a[href*='Profile']").text()).indexOf(needle) !== -1;
        $(this).toggleClass("tuyd-filtered", !matches);
        if (matches && this.style.display !== "none") {
            shown++;
        }
    });
    $("#BlockListSearchCount").text(needle === "" ? "" : shown + " matching");
}

function setupBlockListSearch() {
    var $list = $("li[id^='ListItem_']").first().parent("ul");
    if ($list.length === 0) {
        return;
    }
    addCSS(`
        li.tuyd-filtered { display: none; }
        #BlockListSearch { margin: 8px 0; }
        #BlockListSearchInput { padding: 4px 8px; width: 240px; max-width: 60%; background: #222; color: #ddd; border: 1px solid #555; }
        #BlockListSearchCount { margin-left: 6px; white-space: nowrap; }
    `);
    $list.before(`<div id="BlockListSearch"><input type="text" id="BlockListSearchInput" placeholder="Search players"><span id="BlockListSearchCount" class="text-muted"></span></div>`);
    $("#BlockListSearchInput").on("input", function () {
        filterBlockList($(this).val());
    });
}

function setupBlacklistCounter() {
    var $blacklist = $("li[id^='ListItem_']").first().parent("ul");
    $blacklist.before(`<span id="numBlacklisted">You have <b></b> players on your block list.</span>`);
    // war.app hides removed players with an inline display: none; the search hides rows with a class.
    var updateBlacklistCount = function () {
        $("#numBlacklisted b").text($blacklist.find("li").filter(function () {
            return this.style.display !== "none";
        }).length);
    };
    updateBlacklistCount();
    var blacklistObserver = new MutationObserver(updateBlacklistCount);
    $blacklist.each(function () {
        blacklistObserver.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    });
}

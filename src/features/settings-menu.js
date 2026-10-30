window.userscriptSettings = [
    {
        id: 'scrollGames',
        text: 'Fixed Window with Scrollable Games',
        selected: true,
        section: 'Dashboard',
        help: 'This option displays My-, Open-, Coin-Games in a scrollable box, which removes a lot of unesessary scrolling. You can find tabs to switch between the different type of games. '
    },
    {
        id: 'hideMyGamesIcons',
        text: 'Hide Icons in "My Games"',
        selected: false,
        section: 'Dashboard',
        help: 'This option hides game icons for My Games on the dashboard'
    },
    {
        id: 'autoRefreshOnFocus',
        text: 'Automatically Refresh Games on Tab-Focus',
        selected: true,
        section: 'Dashboard',
        help: 'This option automatically refreshes your games after switching back to War.app from a different tab / program. This only applies if War.app was idle for 30 or more seconds.'
    },
    {
        id: 'hideCoinsGlobally',
        text: 'Hide Coins Globally',
        selected: false,
        section: 'Other',
        help: 'This option removes everything from War.app related to Coins'
    },
    {
        id: 'useDefaultBootLabel',
        text: 'Use the Default Boot Time Label',
        selected: false,
        section: 'Dashboard'
    },
    {
        id: 'showPrivateNotesOnProfile',
        text: 'Show Private Notes on Profile',
        selected: true,
        section: 'Profile',
        help: 'This option will show you your private notes which you made on a player directly on their profile page. You can find them on the left side under the profile picture.'
    },
    {
        id: 'hideOffTopic',
        text: 'Automatically Hide Off-Topic Threads',
        selected: false,
        section: 'Forum',
        help: 'This option automatically hides all off-topic threads everytime you visit the All Forum Posts page'
    }, {
        id: 'hideWarzoneIdle',
        text: 'Automatically Hide War.app Idle Threads',
        selected: false,
        section: 'Forum',
        help: 'This option automatically hides all War.app Idle threads everytime you visit the All Forum Posts page'
    },
    {
        id: 'disableHideThreadOnDashboard',
        text: 'Disable Right-Click on the Forum Table',
        selected: false,
        section: 'Forum',
        help: 'This option will allow you to right-click forum thread on the dashboard and use the default browser options.'
    },
    {
        id: 'sortTurnsByWaiting',
        text: 'Sort Your-Turn Games by How Long They Have Waited',
        selected: false,
        section: 'Dashboard',
        help: 'Your-turn games are sorted by the time left before war.app boots you, the most urgent first. With this on, they are sorted by how long it has been your turn instead, the longest first. Turn off "Sort your-turn games by time left before boot" to keep war.app\'s own order.'
    },
    {
        id: 'turnNotifications',
        text: 'Desktop Notification When a Game Needs You',
        selected: false,
        section: 'Dashboard',
        help: 'While a dashboard tab is open, the script checks your games every 5 minutes in the background and shows a desktop notification when a game becomes your turn. Your browser asks for permission when you turn this on.'
    },
    {
        id: 'confirmCommit',
        text: 'Ask Before Committing Orders',
        selected: false,
        section: 'Games',
        help: 'In a game, pressing Commit (or Autopilot\'s Run+Commit) first asks "Commit your orders for this turn?", so a stray click or tap doesn\'t send unfinished orders. Takes effect when a game page loads.'
    },
    {
        id: 'readNewChatAloud',
        text: 'Read New Chat Messages Aloud',
        selected: false,
        section: 'Games',
        help: 'While a game or the chat rooms are open, new chat messages from other players are read aloud with your browser\'s own voice, so you can listen while entering orders. In the chat rooms, only the tab you are looking at is read, and hidden notices and muted players never are. Older messages are never read by themselves; use the 🔊 next to a message for those. Your browser only speaks after you have clicked somewhere on the page.'
    },
    {
        id: 'chatSoundVolume',
        text: 'Chat Sound Volume',
        volume: true,
        selected: 100,
        section: 'Games',
        help: 'How loud war.app\'s sound for a new chat message plays, in games and in the chat rooms, as a share of war.app\'s own volume. War.app\'s App Settings have one volume for all of its sounds (Sounds) and one for important ones such as the turn sound (Critical Sounds); this turns only the chat sound down on top of those. 0% silences it.'
    },
    {
        id: 'turnSoundVolume',
        text: 'Turn Sound Volume',
        volume: true,
        selected: 100,
        section: 'Games',
        help: 'How loud war.app\'s turn sound plays, as a share of war.app\'s Critical Sounds volume (App Settings). War.app plays it when a game advances to the next turn, and when a Quickmatch or another game you were waiting for starts. The clock ticking in the last 30 seconds is not changed. 0% silences it.'
    },
    {
        id: 'idleNotifications',
        text: 'Idle: Desktop Notification When Idle Needs You',
        selected: false,
        section: 'Idle',
        help: 'While Idle is open in a background tab, shows a desktop notification when it needs you: unclaimed powers, an artifact to claim, a tank ready to move, a battle, the daily bonus or the coin wheel. Your browser asks for permission when you turn this on.'
    },
    {
        id: 'mailPreviewSearch',
        text: 'Mail: Search the First 15 Words of Each Thread',
        selected: true,
        section: 'Other',
        help: 'Lets "Filter by words" on your mail page look in the first 15 words of each thread, not only the subject. The first time, the script opens each of your mail threads once to read them and keeps those words in this browser. Turning this off deletes them.'
    },
    {
        id: 'pastTournamentsSearch',
        text: 'Past Tournaments: Search Your Whole List',
        selected: false,
        section: 'Tournaments',
        help: 'Past Tournaments lists every tournament you were invited to, 30 at a time, with no search. With this on, its Search button searches and filters all of them. The script reads your whole list from war.app (about a second for each 1,000 tournaments), keeps it in this browser and brings it up to date each time you open Past Tournaments. Turning this off deletes the list from this browser.'
    },
    {
        id: 'useMaakServices',
        text: 'Load Community Level Records (via maak.ch)',
        selected: false,
        section: 'Third-party data',
        help: 'Shows the community level record count on profiles. (MTL and Seasonal Ladder figures on profiles, the Ladders page, the Seasonal Ladder pages, the Community page and in MTL threads come from custom.wl-stats.com and need no setting.) This data is loaded from maak.ch, a server run by the original script author, which can run code on War.app while it loads. Leave this off unless you trust that server.'
    }
];

/**
 * Creates the Userscript-Menu
 */
function setupUserscriptMenu() {
    addCSS(`
        /* The switch - the box around the slider */
        .switch {
            position: relative;
            width: 50px;
            height: 24px;
            margin-right: 30px;
            float: right;
        }

        /* Hide default HTML checkbox */
        .switch input {display:none;}

        /* The slider */
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          -webkit-transition: .4s;
          transition: .4s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          -webkit-transition: .4s;
          transition: .4s;
        }

        input:checked + .slider {
          background-color: #0E5C83;
        }

        input:focus + .slider {
          box-shadow: 0 0 1px crimson;
        }

        input:checked + .slider:before {
          -webkit-transform: translateX(26px);
          -ms-transform: translateX(26px);
          transform: translateX(26px);
        }

        /* Rounded sliders */
        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
        .settingsListItem {
            padding-top: 25px;
            font-size: 15px;
        }
        #menuSearchBar {
            position: sticky;
            top: -16px;
            z-index: 5;
            margin: -16px -16px 8px;
            padding: 12px 16px 8px;
            background: inherit;
            background-color: #1b1b1b;
            border-bottom: 1px solid #333;
        }
        #menuSearch {
            width: 100%;
            padding: 6px 10px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #222;
            color: #e0e0e0;
        }
        #menuSearchBar .text-muted {
            margin-top: 4px;
            font-size: 12px;
        }
        #userscriptMenu .modal-title {
            display: flex;
            align-items: center;
        }
        .menuLinks {
            margin-left: 16px;
            font-size: 17px;
            font-weight: normal;
            line-height: 1;
        }
        .menuSection {
            border-bottom: 1px solid #333;
        }
        .menuSectionHeader {
            display: flex;
            width: 100%;
            align-items: center;
            padding: 12px 4px;
            border: 0;
            background: none;
            color: #e0e0e0;
            font-size: 17px;
            text-align: left;
            cursor: pointer;
        }
        .menuSectionHeader:before {
            content: "▸";
            width: 18px;
            color: #888;
        }
        .menuSection.open > .menuSectionHeader:before,
        #userscriptMenu.menuSearching .menuSectionMatch > .menuSectionHeader:before {
            content: "▾";
        }
        .menuSectionCount {
            margin-left: 8px;
            padding: 0 7px;
            border-radius: 9px;
            background: #333;
            color: #aaa;
            font-size: 12px;
        }
        .menuSectionBody {
            display: none;
            padding: 0 4px 16px 22px;
        }
        .menuSection.open > .menuSectionBody,
        #userscriptMenu.menuSearching .menuSectionMatch > .menuSectionBody {
            display: block;
        }
        #userscriptMenu.menuSearching .menuSectionHidden,
        #userscriptMenu.menuSearching .menuItemHidden,
        #userscriptMenu.menuSearching .menuSection:not(.menuHeadingMatch) > .menuSectionBody > :not(.settingsListItem) {
            display: none;
        }
        .volumeSetting {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            float: right;
            margin: 0 30px 0 0;
            font-weight: normal;
        }
        .volumeSetting input {
            width: 120px;
        }
        .volumeSettingValue {
            min-width: 3em;
            text-align: right;
            color: #aaa;
            font-size: 13px;
        }
        .menuSectionBody .settingsListItem:first-child {
            padding-top: 4px;
        }
    `);
    var inputs = renderMenuSections(userscriptSettings, toggleableFeatures(), disabledFeatures(), openMenuSections(), function (setting) {
        return setting.help != undefined ? `<img tabindex="0" class="help-icon" src="${IMAGES.QUESTION}" data-content="${getSettingInfo(setting.id)}" data-toggle="popover">` : '';
    });
    $("body").append(`
        <div class="modal modal-750 fade" id="userscriptMenu" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Muli's Userscript  ${version}<span class="menuLinks"><a href="${SITE_URL}" target="_blank" rel="noopener">Website</a> · <a href="${REPO_URL}" target="_blank" rel="noopener">GitHub</a></span></h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div id="menuSearchBar"><input type="search" id="menuSearch" placeholder="Search settings and features" autocomplete="off"><div class="text-muted">Changes apply after Close &amp; Refresh.</div></div>
                ${inputs}
              </div>
              <div class="modal-footer">
                <span class="mr-auto text-muted" style="font-size: 13px">Maintained by <a href="/Profile?p=2921525624" target="_blank" rel="noopener">KKND</a> · <a href="/Forum/897130-mulis-userscript-update" target="_blank" rel="noopener">Forum thread</a> · <a href="https://discord.gg/sc99xHNuE" target="_blank" rel="noopener">Discord</a></span>
                <button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary close-userscript" data-dismiss="modal">Close & Refresh</button>
              </div>
            </div>
          </div>
        </div>
    `);
    if (typeof $().popover === 'function') {
        $("[data-toggle=popover]").popover({
            trigger: 'focus'
        });
    }
    $("#userscriptMenu").on("change", function () {
        console.log("storing settings");
        storeSettingsVariables();
    }).on("input", ".volumeSetting input", function () {
        showVolumeSetting(this);
    });
    $("#AccountDropDown").next(".dropdown-menu").append('<div class="dropdown-divider"></div><a class="dropdown-item " href="#" data-toggle="modal" data-target="#userscriptMenu">Muli\'s Userscript</a>');
    $(".close-userscript").on("click", function () {
        location.reload();
    });
    $("#userscriptMenu .menuSection[data-section='Dashboard'] > .menuSectionBody").append('<button class="btn btn-primary" data-menu-dialog="#dashboardTableSortMenu" style="margin-top:15px;">Sort Right Column Tables</button>');
    addCSS(`
        .userscriptSettingsButtons {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
        }
    `);
    $("#userscriptMenu .modal-body").append(menuSection("Backup", "Backup", null, "<div class='userscriptSettingsButtons'></div>", openMenuSections().indexOf("Backup") !== -1));
    setupMenuSections();
    //Export settings button
    $(".userscriptSettingsButtons").append('<button data-menu-dialog="#userscriptExportSettings" id="exportSettings" class="btn btn-primary">Export Settings</button>');
    //Import settings button
    $(".userscriptSettingsButtons").append('<button data-menu-dialog="#userscriptImportSettings" class="btn btn-primary">Import Settings</button>');
    $("#userscriptMenu").on("click", "[data-menu-dialog]", function () {
        openFromSettingsMenu($(this).attr("data-menu-dialog"));
    });
    //Reset hidden threads button
    $(".userscriptSettingsButtons").append('<button id="resetHiddenThreads" class="btn btn-primary">Reset Hidden Threads</button>');
    $("body").append(`
        <div class="modal fade" id="userscriptExportSettings" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Export Settings</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                Copy or download this text and save it somewhere on your computer!
                <textarea id='exportSettingsBox'></textarea>
                <a id='downloadExportSettingsFile' href='' download='tuyd_settings.txt'>Download Text-File</a>
              </div>
              <div class="modal-footer">
                <button type="button" data-dismiss="modal" class="btn btn-primary close-userscript">Close</button>
              </div>
            </div>
          </div>
        </div>
    `);
    $("body").append(`
        <div class="modal fade" id="userscriptImportSettings" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Import Settings</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <textarea id='importSettingsBox' placeholder='Copy settings here'></textarea><button id='importSettings' class="btn btn-primary">Import Settings</button>
              </div>
              <div class="modal-footer">
                <button type="button" data-dismiss="modal" class="btn btn-primary close-userscript">Close</button>
              </div>
            </div>
          </div>
        </div>
    `);
    createSelector("#exportSettingsBox, #importSettingsBox", "width:100%; height: 300px");
    $("#exportSettings").on("click", function () {
        exportSettings();
    });
    $("#importSettings").on("click", function () {
        importSettings();
    });
    $("#turnNotifications, #idleNotifications").on("change", function () {
        if (this.checked && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    });
    $("#resetHiddenThreads").on("click", function () {
        window.undoIgnore();
    });
    getSortTables(function (tables) {
        var tableCode = '';
        $.each(tables, function (key, table) {
            tableCode += '<div class="sortableLadder ' + (table.hidden ? 'tableSortHidden' : '') + '" data-name="' + table.name + '" data-tableId="' + table.id + '">' + table.name + '<div class="tableSortNavigation"><span class="tableSortUp">▲</span><span class="tableSortDown">▼</span><span class="tableSortHideShow"><img src="' + IMAGES.EYE + '"></span></div></div>'
        });
        createSelector(".sortableLadder", "border: 1px gray solid;margin: 5px;padding: 5px;background-color:rgb(25, 25, 25);");
        createSelector(".tableSortNavigation", "display: inline-block;float: right;margin-top: -2px;");
        createSelector(".tableSortNavigation span", "padding: 3px 10px; cursor: pointer");
        createSelector(".tableSortNavigation span:hover", "color: #C0D0FF");
        createSelector(".sortTableHighlight", "background-color: rgb(60, 60, 60)");
        createSelector(".tableSortHideShow img", "height: 10px");
        createSelector(".tableSortHidden", "opacity: 0.2;");
        $("body").append(`
            <div class="modal modal-500 fade" id="dashboardTableSortMenu" tabindex="-1" role="dialog">
              <div class="modal-dialog" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLongTitle">Sort dashboard tables</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div class="modal-body">
                    ${tableCode}
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>                    
                    <button type="button" class="btn btn-primary" data-dismiss="modal" onclick="window.saveTableSort()">Save</button>
                  </div>
                </div>
              </div>
            </div>
        `);
        $(".tableSortUp").on("click", function () {
            $(".sortTableHighlight").removeClass("sortTableHighlight");
            var table = $(this).closest(".sortableLadder");
            table.addClass("sortTableHighlight");
            var prev = table.prev();
            table = table.detach();
            prev.before(table)
        });
        $(".tableSortDown").on("click", function () {
            $(".sortTableHighlight").removeClass("sortTableHighlight");
            var table = $(this).closest(".sortableLadder");
            table.addClass("sortTableHighlight");
            var next = table.next();
            table = table.detach();
            next.after(table)
        });
        $(".tableSortHideShow").on("click", function () {
            $(".sortTableHighlight").removeClass("sortTableHighlight");
            var table = $(this).closest(".sortableLadder");
            table.addClass("sortTableHighlight");
            table.toggleClass("tableSortHidden")
        });
        checkUserscriptMenuButtons();
    })
}

function importSettings() {
    $('.modal').modal("hide");
    var settings;
    try {
        settings = parseSettingsBackup($("#importSettingsBox").val().trim());
    } catch (e) {
        log(e);
        CreateModal("mulisuserscript", "Error", "There was an error importing the settings.");
        return;
    }
    wljs_WaitDialogJS.Start(null, "Importing Settings...")

    Promise.all(Object.values(Database.Exports).map(function (table) {
        return Database.clear(table);
    })).then(function () {
        var additions = [];
        settings.forEach(function (data) {
            data.data.forEach(function (value) {
                additions.push(Database.add(data.table, value));
            });
        });
        return Promise.all(additions);
    }).then(function () {
        window.location.reload();
    }).catch(function (e) {
        log(e);
        wljs_WaitDialogJS.Stop();
        CreateModal("mulisuserscript", "Error", "There was an error importing the settings.");
    });
}

function parseSettingsBackup(backup) {
    var settings = JSON.parse(atob(backup));
    var importableTables = Object.values(Database.Exports);
    var isValid = Array.isArray(settings) && settings.every(function (entry) {
        return entry && importableTables.indexOf(entry.table) !== -1 && Array.isArray(entry.data);
    });
    if (!isValid) {
        throw new Error("Invalid settings backup");
    }
    return settings;
}

function exportSettings() {
    Promise.all(Object.values(Database.Exports).map(function (table) {
        return Database.readAll(table).then(function (data) {
            return { table: table, data: data };
        });
    })).then(function (settings) {
        var settingsString = btoa(JSON.stringify(settings));
        $("#exportSettingsBox").html(settingsString);
        $("#downloadExportSettingsFile").click(function () {
            this.href = "data:text/plain;charset=UTF-8," + settingsString;
        });
    });
}

// Bootstrap can't keep one dialog open on top of another: closing the top one marks the page as having no
// dialog open, and the settings menu left under it stops scrolling and taking clicks. So the menu closes
// while one of its dialogs is open, and opens again when that dialog closes.
function openFromSettingsMenu(target) {
    var menu = $("#userscriptMenu");
    menu.one("hidden.bs.modal", function () {
        $(target).one("hidden.bs.modal", function () {
            menu.modal("show");
        }).modal("show");
    }).modal("hide");
}

function getSortTables(callback) {
    var defaultTables = [
        {
            id: "#BookmarkTable",
            name: "Bookmarks",
            hidden: false,
            order: 0
        },
        {
            id: "#MapOfTheWeekTable",
            name: "Map of the Week",
            hidden: false,
            order: 4
        },
        {
            id: "#ForumTable",
            name: "Forum Posts",
            hidden: false,
            order: 5
        },
        {
            id: "#ClanForumTable",
            name: "Clan Forum Posts",
            hidden: false,
            order: 6
        },
        {
            id: "#BlogTable",
            name: "Recent Blog Posts",
            hidden: false,
            order: 7
        },
        {
            id: "#LeaderboardTable",
            name: "Coin Leaderboard",
            hidden: false,
            order: 8
        }
    ];
    if ($("#ShopTable").length > 0) {
        defaultTables.push({
            id: "#ShopTable",
            name: "War.app Shop",
            hidden: false,
            order: -1
        })
    }
    if ($(".dataTable thead td:contains('Quickmatch')").length > 0) {
        defaultTables.push({
            id: ".dataTable thead:contains('Quickmatch')",
            name: "Quickmatch",
            hidden: false,
            order: 1
        })
    }
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, "tableSort", function (tableData) {
        if (tableData && tableData.value.length > 3) {
            // war.app no longer has a tournaments table on the dashboard.
            var tables = tableData.value.filter(function (table) {
                return table.id !== "#MyTournamentsTable";
            });
            if ($("#ShopTable").length > 0 && !arrayHasObjWithId(tables, "#ShopTable")) {
                tables.push({
                    id: "#ShopTable",
                    name: "War.app Shop",
                    hidden: false,
                    order: -1
                })
            }
            if ($(".dataTable thead td:contains('Quickmatch')").length > 0 && !arrayHasObjWithId(tables, ".dataTable thead:contains('Quickmatch')")) {
                tables.push({
                    id: ".dataTable thead:contains('Quickmatch')",
                    name: "Quickmatch",
                    hidden: false,
                    order: 1
                })
            }
            callback($(tables).sort(compareTable));
        } else {
            callback($(defaultTables).sort(compareTable))
        }
    })
}

function arrayHasObjWithId(arr, id) {
    var found = false;
    $.each(arr, function (key, val) {
        if (val.id == id) {
            found = true;
        }
    });
    return found;
}

window.saveTableSort = function () {
    var tables = [];
    $.each($("#dashboardTableSortMenu div.sortableLadder"), function (key, table) {
        var order = key;
        var id = $(table).attr('data-tableId');
        var hidden = $(table).hasClass("tableSortHidden");
        var name = $(table).attr('data-name');
        tables.push({
            id: id,
            name: name,
            hidden: hidden,
            order: order
        })
    });
    var tableSort = {
        name: "tableSort",
        value: tables
    };
    Database.update(Database.Table.Settings, tableSort, undefined, function () {
        // A hidden table is removed from the page, so only a reload can bring it back.
        location.reload();
    })
};

function compareTable(a, b) {
    if (a.order < b.order) return -1;
    if (a.order > b.order) return 1;
    return 0;
}

window.getSettingInfo = function (id) {
    var help = "";
    $.each(userscriptSettings, function (key, setting) {
        if (setting.id == id) {
            help = setting.help;
        }
    });
    return help;
};

function checkUserscriptMenuButtons() {
    $.each(userscriptSettings, function (key, set) {
        Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, set.id, function (setting) {
            var value = setting ? setting.value : set.selected;
            if (set.volume) {
                showVolumeSetting($("#" + set.id).val(Math.round(volumeSettingLevel(value) * 100)));
            } else {
                $("#" + set.id).prop("checked", value);
            }
        })
    });
}

function showVolumeSetting(input) {
    $(input).next(".volumeSettingValue").text($(input).val() + "%");
}

// One foldable section per area, holding that area's settings and then its feature switches.
function renderMenuSections(settings, features, disabled, open, helpIcon) {
    var order = MENU_SECTIONS.map(function (entry) {
        return entry[0];
    });
    var groups = {};
    var add = function (section, html) {
        if (order.indexOf(section) === -1) {
            order.push(section);
        }
        (groups[section] = groups[section] || []).push(html);
    };
    settings.forEach(function (setting) {
        var control = setting.volume ?
            '<label class="volumeSetting"><input id="' + setting.id + '" type="range" min="0" max="100" step="5" aria-label="' + htmlEscape(setting.text) + '"><span class="volumeSettingValue"></span></label>' :
            '<label class="switch"><input id="' + setting.id + '" type="checkbox"><div class="slider round"></div></label>';
        add(setting.section || "Other", '<div class="settingsListItem">' + setting.text + helpIcon(setting) + control + '</div>');
    });
    features.forEach(function (feature) {
        add(feature.section, '<div class="settingsListItem">' + htmlEscape(feature.name) + '<label class="switch"><input class="featureToggle" data-feature="' + htmlEscape(feature.name) +
            '" type="checkbox"' + (disabled.indexOf(feature.name) === -1 ? ' checked' : '') + '><div class="slider round"></div></label></div>');
    });
    return order.filter(function (section) {
        return groups[section];
    }).map(function (section) {
        var label = (MENU_SECTIONS.filter(function (entry) {
            return entry[0] === section;
        })[0] || [section, section])[1];
        return menuSection(section, label, groups[section].length, groups[section].join(""), open.indexOf(section) !== -1);
    }).join("");
}

function menuSection(key, label, count, body, open) {
    return '<div class="menuSection' + (open ? " open" : "") + '" data-section="' + htmlEscape(key) + '"><button type="button" class="menuSectionHeader">' + htmlEscape(label) +
        (count ? '<span class="menuSectionCount">' + htmlEscape(count) + '</span>' : "") + '</button><div class="menuSectionBody">' + body + '</div></div>';
}

function openMenuSections() {
    try {
        var stored = JSON.parse(localStorage.getItem(MENU_SECTIONS_KEY));
        if (Array.isArray(stored)) {
            return stored;
        }
    } catch (e) {
    }
    return ["Dashboard"];
}

function setupMenuSections() {
    var menu = $("#userscriptMenu");
    menu.on("click", ".menuSectionHeader", function () {
        if (menu.hasClass("menuSearching")) {
            return;
        }
        $(this).parent().toggleClass("open");
        try {
            localStorage.setItem(MENU_SECTIONS_KEY, JSON.stringify(menu.find(".menuSection.open").map(function () {
                return $(this).attr("data-section");
            }).get()));
        } catch (e) {
        }
    });
    menu.on("input", "#menuSearch", function () {
        filterMenu(menu, $(this).val());
    });
}

// While searching, only matching switches show, in their sections opened; a section whose heading
// matches shows all of its switches and its buttons (e.g. "backup").
function filterMenu(menu, query) {
    var needle = String(query || "").trim().toLowerCase();
    menu.toggleClass("menuSearching", needle !== "");
    menu.find(".menuSection").each(function () {
        var section = $(this);
        var headingMatches = needle !== "" && section.children(".menuSectionHeader").text().toLowerCase().indexOf(needle) !== -1;
        var any = headingMatches;
        section.find(".settingsListItem").each(function () {
            var hit = needle === "" || headingMatches || $(this).text().toLowerCase().indexOf(needle) !== -1;
            $(this).toggleClass("menuItemHidden", !hit);
            any = any || hit;
        });
        section.toggleClass("menuSectionHidden", !any).toggleClass("menuSectionMatch", needle !== "" && any).toggleClass("menuHeadingMatch", headingMatches);
    });
}

function storeFeatureToggles() {
    var disabled = [];
    $("#userscriptMenu .featureToggle").each(function () {
        if (!$(this).prop("checked")) {
            disabled.push($(this).attr("data-feature"));
        }
    });
    return saveDisabledFeatures(disabled);
}

function storeSettingsVariables() {
    storeFeatureToggles();
    $.each(userscriptSettings, function (key, set) {
        var setting = {
            name: set.id,
            value: set.volume ? Number($("#" + set.id).val()) : $("#" + set.id).prop("checked")
        };
        Database.update(Database.Table.Settings, setting, undefined, function () {
        })
    });
}

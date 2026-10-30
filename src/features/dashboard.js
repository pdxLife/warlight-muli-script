function domRefresh() {
    $("body").hide(0).show(0);
    $(window).trigger('resize')
}

function hideTable(selector) {
    $(selector).closest("table").remove()
}

function hideCoinsGlobally() {
    $("#LeaderboardTable").prev().remove();
    $("#LeaderboardTable").css({
        opacity: 0,
        cursor: 'default'
    });
    $("#LeaderboardTable a").css('display', 'none');
    $("body").find("a[href='/Coins/']").css('display', 'none');

    $("a[href='/Win-Money']").css('display', 'none');
    $("#OpenTournamentTable").css('display', 'none');
}

function setupDashboard() {
    playerDataReady.done(setupVacationAlert);

    hideBlacklistedThreads();
    setupBasicDashboardStyles();
    var dashboard = fetchDashboard();
    refreshMyGames(dashboard);
    ifSettingIsEnabled('hideCoinsGlobally', function () {
        hideCoinsGlobally()
    });
    ifSettingIsEnabled('useDefaultBootLabel', function () {
        createSelector(".BootTimeLabel", "z-index:50;");
    }, function () {
        createSelector(".BootTimeLabel", "color:white !important;font-weight:normal!important;font-style:italic;font-size:13px!important;z-index:50;");
    });
    ifSettingIsEnabled("hideMyGamesIcons", function () {
        createSelector("#MyGamesTable td div > img, #MyGamesTable td div a > img", "display:none;");
    });
    ifSettingIsEnabled("scrollGames", function () {
        setupFixedWindowWithScrollableGames();
    }, function () {
        createSelector("body", "overflow: auto");
        addCSS(`
            @media (max-width: 1050px) {
               #MyGamesTable > thead > tr * {
                    font-size: 14px;
                }
                #MyGamesTable > thead > tr > td > div:nth-of-type(1) {
                    margin-top: 5px!important;
                    display: block;
                    float: left;
                    padding-right: 5px;
                }
            }

            @media (max-width: 750px) {
                #MyGamesTable > thead > tr > td > div:nth-of-type(1) {
                    display:none;
                }
            }`)
    }, function () {
        setupRightColumn(true);
        refreshOpenGames(dashboard);
    });
    $("label#MultiDayRadio").on("click", function () {
        registerGameTabClick()
    });
    $("label#RealTimeRadio").on("click", function () {
        registerGameTabClick()
    });
    $("label#BothRadio").on("click", function () {
        registerGameTabClick()
    });
    $(window).resize(function () {
        ifSettingIsEnabled("scrollGames", function () {
            refreshSingleColumnSize();
        });
    });
    window.setTimeout(setupRefreshFunction, 0);
}

function showDashboardLoader() {
    $("body").append("<div class='loader' style='    background: black;position: fixed;left: 0;right: 0;top: 0;bottom: 0;z-index: 100;'></div>");
    $(".container-fluid").show();
    window.lastClick = new Date();
}

window.showGamesActive = "ShowMyGames";

function setupBasicDashboardStyles() {
    createSelector(".GameRow a", "font-size:16px !important;");
    createSelector(".GameRow", "font-size:15px");
    createSelector("a", "outline: none");
    createSelector("#MyGamesTable td > a > img", 'display:none');
    createSelector("#MyGamesTable td span a img, #MyGamesTable td span a img", "display:inherit;");
    createSelector(".GameRow:hover", "background-color:rgb(50, 50, 50);cursor:pointer;");
    createSelector(".GameRow a:hover", "text-decoration:none;");
    createSelector(".ui-buttonset label", "font-size:11px;");
    createSelector("#OpenGamesTable label[id$='Radio']:hover", " border: 1px solid #59b4d4;background: #0078a3 50% 50% repeat-x;font-weight: bold;color: #ffffff;");
    createSelector("img", "position: relative;z-index:50;");
    createSelector("input", "z-index: 98;position: relative;");
    createSelector(".ui-tooltip", "background: #EBEBEB;padding: 4px;font-style: italic;");
    addCSS(`
        .MyGamesGameBoxOpenSeat {
            font-size:11px;
        }
        .MyGamesGameBox {
            position:relative;
        }
    `);
    addCSS(`
        .GameRow td:nth-of-type(2) {
            position: relative;
        }
        .GameRow td:nth-of-type(2) > a {
            width: 100%;
            position: absolute;
            display: block;
            height: 100%;
            margin-top: -5px;
            margin-left: -6px;
            padding-left: 5px;
        }
    `);
    addCSS(`
    .MyGamesGameBox span:not(.MyGamesGameBoxDot) {
        position: relative;
        top: -4px;
    }
    `);
}

function setupFixedWindowStyles() {
    createSelector('html, body', 'width: 100%; position:fixed; height: 100%');
    createSelector('#PastGamesTable', 'width: 100%;');
    createSelector('body > .dataTable, #OpenTournamentTable', 'display:none;');
    addCSS(`  
        .leftColumn .dataTable tbody {
          display: block;
          overflow-y: auto;
        }

        .leftColumn .dataTable tr {
          display: table;
          width: 100%;
        }
         .leftColumn, .SideColumn {
            max-width:900px;
        }
        .SideColumn {
            overflow-y: auto;
        }
    `);

    createSelector("#switchGameRadio label:hover", "border: 1px solid rgb(89, 180, 212);border-image-source: initial;border-image-slice: initial;border-image-width: initial;border-image-outset: initial;border-image-repeat: initial;background:rgb(0, 120, 163);font-weight: bold;color: rgb(255, 255, 255);");
    createSelector("h2 + span", "margin-right: 50px;");
    createSelector("body", "overflow:hidden");
    createSelector(".adsbygoogle", "margin-top: 25px;");
    createSelector("#refreshAll", "margin: 5px;float: right;");
    createSelector("#RestoreLotteryGamesBtn", "display:none");
    createSelector('#ForumTable tbody tr td, #ClanForumTable tbody tr td', 'overflow:hidden;position:relative');
    createSelector('#ForumTable tbody tr td > a, #ClanForumTable tbody tr td > a', 'width: 100%;display: block;height: 100%;float: left;position: absolute;overflow: hidden;z-index: 1;');
    createSelector('#ForumTable tbody tr td span, #ClanForumTable tbody tr td span', 'display: inline-block;z-index: 1;float: left;position: relative;');
    createSelector('#ForumTable tbody tr:not(:last-child):hover, #ClanForumTable tbody tr:hover', 'background-color:rgb(50, 50, 50)');
    createSelector('#ForumTable tbody tr td a[href="/Forum/Forum"]', 'position: relative;');
    createSelector('#ClanForumTable tbody tr td a[href="/Clans/Forum"]', 'position: relative;');
    $("body").scrollTop(0)
}

function setupFixedWindowWithScrollableGames() {
    var gameButtons = `
        <div style="margin: 5px;" id="switchGameRadio" class="btn-group"> <label for="ShowMyGames" class="active btn btn-primary" role="button"><input type="radio" id="ShowMyGames" name="switchGames" checked="checked" class="ui-helper-hidden-accessible">My Games</label> 
            <label for="ShowOpenGames" class="btn btn-primary" role="button">
                <input type="radio" id="ShowOpenGames" name="switchGames" class="ui-helper-hidden-accessible">Open Games
            </label>
            <label for="ShowPastGames" class="btn btn-primary" role="button">
                <input type="radio" id="ShowPastGames" name="switchGames" class="ui-helper-hidden-accessible">Past Games
           </label>
        </div>`;
    setupleftColumn(gameButtons);
}

function setupleftColumn(gameButtons) {
    var mainContainer = $("body > .container-fluid");
    var myGamesContainer = $('<div id="myGamesContainer"></div>');
    $("#MyGamesTable").wrap(myGamesContainer);
    myGamesContainer = $("#myGamesContainer");
    var openGamesContainer = $('<div id="openGamesContainer"></div>');
    $("#OpenGamesTable").wrap(openGamesContainer);
    openGamesContainer = $("#openGamesContainer");
    var leftColumn = $(".row.p-3 .pb-4");
    leftColumn.find("> br").remove();
    leftColumn.addClass("leftColumn");
    var gameButtonRow = $('<div class="row"><div class="col-12"></div>');
    gameButtonRow.css("padding-top", "25px");
    mainContainer.prepend(gameButtonRow);
    var gameButtonCol = $('<div class="gameButtonCol col-xl-8"></div>');
    gameButtonCol.css("max-width", "900px");
    gameButtonRow.prepend(gameButtonCol);
    gameButtonCol.append(gameButtons);
    gameButtonCol.append($('#refreshAll').detach());
    openGamesContainer.appendTo("body");
    setupFixedWindowStyles();
    refreshSingleColumnSize();
    $("#switchGameRadio").find("label").on("click", function (e) {
        e.preventDefault();
        var newShowGames = $(this).attr("for");
        if (newShowGames != showGamesActive) {
            $.each($("#switchGameRadio").find("label"), function () {
                $(this).removeClass("active");
            });
            $(this).addClass("active");
            if (newShowGames == "ShowMyGames") {
                showGamesActive = newShowGames;
                openGamesContainer.appendTo("body");
                myGamesContainer.appendTo(leftColumn);
                $("#pastGamesContainer").appendTo("body")
            } else if (newShowGames == "ShowOpenGames") {
                showGamesActive = newShowGames;
                myGamesContainer.appendTo("body");
                openGamesContainer.appendTo(leftColumn);
                $("#pastGamesContainer").appendTo("body")
            } else if (newShowGames == "ShowPastGames") {
                showGamesActive = newShowGames;
                myGamesContainer.appendTo("body");
                openGamesContainer.appendTo("body");
                if ($("#pastGamesContainer").length) {
                    $("#pastGamesContainer").appendTo(leftColumn)
                } else {
                    leftColumn.append("<div id='pastGamesContainer'></div>");
                    refreshPastGames();
                }
            }
            refreshSingleColumnSize()
        }
    });
}

function registerGameTabClick() {
    if (new Date() - lastClick > 2000) {
        $("#openGamesContainer tbody").scrollTop(0);
        lastClick = new Date();
    }
    window.setTimeout(function () {
        domRefresh();
    }, 1);
}

function setupRightColumn(isInit) {
    if (isInit) {
        createSelector(".SideColumn > table:not(:last-child)", "margin-bottom: 17px;")
    }
    //Bookmarks
    if (isInit) {
        setupBookmarkTable();
    } else {
        refreshBookmarks()
    }
    sortRightColumnTables(function () {

    })
}

function setupVacationAlert() {
    var vacationEnd = WlPlayer.OnVacationUntil;
    if (new Date(vacationEnd) > new Date()) {
        $(".container-fluid.pl-0").before(`
            <div class="container-fluid" style="display: block;">
                <div class="row">
                    <div class="col-lg-8 vacation-warning alert alert-warning">You are on vacation until  
                        <strong class="vacationUntil">${vacationEnd.toLocaleString()}</strong></div>
                </div>
            </div>
        `);
    }
    addCSS(`
        .vacation-warning {
            border: none;
            background: rgba(255,200,180,0.1);
            max-width: 900px;
            margin-bottom: 0;
        }
    `)
}

function sortRightColumnTables(callback) {
    var sideColumn = $(".SideColumn");
    getSortTables(function (tables) {
        $.each(tables, function (key, table) {
            if (table.hidden == true) {
                hideTable(table.id)
            } else {
                var table = $(table.id).closest("table");
                table = table.detach();
                sideColumn.append(table)
            }
        });
        $(".SideColumn > br").remove();
        callback();
    })
}

function makePlayerBoxesClickable(parent) {
    $.each($(parent).find(".GameRow"), function (key, row) {
        var href = $(this).find("a").attr("href");
        var children = $(this).find(".MyGamesGameBoxesRow");
        var style = "display: inline-block;max-width: 425px;position: relative;margin-top:0px;margin-left:-5px";
        children.wrapInner("<a/>").children(0).unwrap().attr("style", style).attr("href", href)
    })
}

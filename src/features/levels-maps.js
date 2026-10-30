var mapData;

function setupMapSearch() {
    $("#PerPageBox").closest("tr").after('<tr><td></td><td><input id="mapSearchQuery" placeholder="Map Name"><br><button id="mapSearchBtn">Search</button><button style="margin: 4px" id="mapSearchResetBtn">Reset</button></td></tr>');

    $('#mapSearchQuery').on('keypress', function (event) {
        if (event.which === 13) {
            searchMaps();
        }
    });

    $("#mapSearchBtn").on("click", function () {
        searchMaps();
    });

    $("#FilterBox, #SortBox, #PerPageBox").on("change", function () {
        $("#mapSearchQuery").val("");
        $("#searchResultsTitle").remove()
    })

}

function searchMaps() {
    if (mapData == undefined) {
        $("<div />").load('Ajax/EnumerateMaps?Filter=' + '__all' + '&Sort=' + 1 + "&PerPage=" + 2147483647 + "&Offset=" + 0, function (data) {
            mapData = data;
            filterMaps(this);
        })
    } else {
        var maps = $("<div />").html(mapData);
        filterMaps(maps);
    }
}

function filterMaps(selector) {
    var query = $("#mapSearchQuery").val();
    $.each($(selector).find("div"), function (key, div) {
        if ($(div).text().trim().toLowerCase().replace(/(rated.*$)/, "").indexOf(query.toLowerCase()) == -1) {
            $(div).remove()
        }
    });

    var count = $(selector).find("div").length;
    $('#MapsContainer').empty();
    $(selector).detach().appendTo('#MapsContainer');
    $("#MapsContainer tr:last-of-type").html("Showing maps 1 - " + count + " of " + count);
    $("#ReceivePager").html("Showing maps 1 - " + count + " of " + count);
    $("#searchResultsTitle").length > 0 ? $("#searchResultsTitle").html("Searchresults for <i>" + query + "</i>") : $("#ReceivePager").after("<h2 id='searchResultsTitle'>Searchresults for <i>" + query + "</i></h2>")

}

function loadCommunityLevelRecords() {
    var playerId = location.href.match(/p=(\d+)/)[1];
    $.ajax({
        type: 'GET',
        url: `https://maak.ch/wl/v2/api.php?player=${playerId}`,
        dataType: 'jsonp',
        crossDomain: true
    }).done(function (response) {
        if (response.data) {
            var records = response.data;
            $("h3:contains('Single-player stats')").after(`<font class="text-muted">Community Levels:</font> <span><a href="http://communitylevels.online" target="_blank"> ${htmlEscape(records)} record${records != 1 ? "s" : ""}</a></span>`);
        }
    }).fail(function (e) {
        log("Error loading community level records: " + e.statusText);
    });
}

function setupMapOfTheWeekStyles() {
    addCSS(`
        .dataTable table {
        display: block;
        }
    `)
}

function setupCommunityLevels() {
    $("h1").after(`
        <div class="alert alert-success" role="alert">
            Visit <a target="_blank" href="http://communitylevels.online/">communitylevels.online</a> for advanced search options!
        </div>
    `);
}

function renderLevelRow(level) {
    if (!level) {
        return;
    }
    return `
        <tr>
            <td style="position: relative">
                <img src="${htmlEscape(safeUrl(level.MAP_IMAGE))}" width="140" height="80" style="position:relative">
            </td>
            <td>
                <a style="font-size: 17px; color: white" 
                    href="/SinglePlayer/Level?ID=${htmlEscape(level.ID)}">${htmlEscape(level.NAME)}
                </a> &nbsp;&nbsp;
                <font color="gray">${htmlEscape(level.LIKES)} likes, ${htmlEscape(level.WINS)} wins in ${htmlEscape(level.ATTEMPTS)} attempts</font><br>
                <font color="gray">Created by</font> ${level.CREATOR_CLAN_ID > 0 ? '<a href="/Clans/?ID=' + htmlEscape(level.CREATOR_CLAN_ID) + '" title="' + htmlEscape(level.CREATOR_CLAN_NAME) + '"><img border="0" style="vertical-align: middle" src="' + htmlEscape(safeUrl(level.CREATOR_CLAN_IMAGE)) + '"></a>' : ''} <a href="/Profile?p=${htmlEscape(level.CREATOR_ID)}">${htmlEscape(level.CREATOR_NAME)}</a><br>
                <font color="gray">Record holder:</font> ${level.RECORD_HOLDER_CLAN_ID > 0 ? '<a href="/Clans/?ID=' + htmlEscape(level.RECORD_HOLDER_CLAN_ID) + '" title="' + htmlEscape(level.RECORD_HOLDER_CLAN_NAME) + '"><img border="0" style="vertical-align: middle" src="' + htmlEscape(safeUrl(level.RECORD_HOLDER_CLAN_IMAGE)) + '"></a>' : ''} ${level.RECORD_HOLDER_NAME ? '<a href="/Profile?p=' + htmlEscape(level.RECORD_HOLDER_ID) + '">' + htmlEscape(level.RECORD_HOLDER_NAME) + '</a>' + htmlEscape(getTurnText(level.RECORD_TURNS)) : 'None'}<br>
                <font color="gray">Win rate: </font>${htmlEscape(level.WIN_RATE)}%<br>
            </td>
            <td><span style="font-size: 17px"><a href="/SinglePlayer?Level=${htmlEscape(level.ID)}">Play</a></span></td>
        </tr>`
}

function getTurnText(turns) {
    return ` in ${turns} ${turns > 1 ? 'turns' : 'turn'}`
}

function parseForumSPLevels() {
    var path = 'SinglePlayer';
    var regex = new RegExp(path, 'i');
    $('.region a').each(function () {
        var href = $(this).attr('href');
        if (href && href.match(regex)) {
            parseSPLevel(this, href);
        }
    });
    addCSS(`
        table.SPTable {
            width:100%;
            background: rgba(255,255,255,0.05)
        }
        .SPTable tr {
            display: flex;
            align-items: stretch;
        }
        .SPTable td:last-child {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            margin-right: 5px;
        }
    `)
}

function parseSPLevel(elem, href) {
    var levelId = getLevelId(href);
    if (levelId) {
        $.ajax({
            type: 'GET',
            url: "/SinglePlayer/Level?ID=" + levelId,
            dataType: 'text'
        }).done(function (response) {
            var row = renderLevelRow(parseLevelPage(response, levelId));
            if (row !== undefined) {
                var table = $("<table class='SPTable'></table>");
                table.append(row);
                $(elem).replaceWith(table);
                table.find("tr td").css("text-align", "left");
            }
        }).fail(function (e) {
            log("Error parsing SP level " + levelId + ": " + e.statusText);
        });
    }
}

function parseLevelPage(html, levelId) {
    var container = new DOMParser().parseFromString(html, "text/html").getElementById("AutoContainer");
    var title = container && container.querySelector("h1");
    if (!title) {
        return undefined;
    }
    var level = { ID: levelId, NAME: title.textContent.trim() };
    var image = container.querySelector("img");
    level.MAP_IMAGE = image ? image.getAttribute("src") : "";

    container.querySelectorAll("font.text-muted").forEach(function (label) {
        var nodes = [];
        for (var node = label.nextSibling; node && node.nodeName !== "BR"; node = node.nextSibling) {
            nodes.push(node);
        }
        var text = nodes.map(function (n) { return n.textContent; }).join("").trim();
        var key = label.textContent.trim();
        if (key === "Number of attempts:") {
            level.ATTEMPTS = text;
        } else if (key === "Number of wins:") {
            level.WINS = text;
        } else if (key === "Number of likes:") {
            level.LIKES = text;
        } else if (key === "Created by") {
            readLevelPlayer(nodes, level, "CREATOR");
        } else if (key === "Record holder:") {
            readLevelPlayer(nodes, level, "RECORD_HOLDER");
            var turns = text.match(/in (\d+) turns?/);
            level.RECORD_TURNS = turns ? Number(turns[1]) : undefined;
        }
    });

    var attempts = Number(String(level.ATTEMPTS).replace(/,/g, ""));
    var wins = Number(String(level.WINS).replace(/,/g, ""));
    level.WIN_RATE = attempts > 0 ? (wins / attempts * 100).toFixed(2) : "0";
    return level;
}

function readLevelPlayer(nodes, level, prefix) {
    nodes.forEach(function (node) {
        if (node.nodeName !== "A") {
            return;
        }
        var href = node.getAttribute("href") || "";
        var clan = href.match(/Clans\/\?ID=(\d+)/i);
        var profile = href.match(/Profile\?p=(\d+)/i);
        if (clan) {
            var icon = node.querySelector("img");
            level[prefix + "_CLAN_ID"] = clan[1];
            level[prefix + "_CLAN_NAME"] = node.getAttribute("title") || "";
            level[prefix + "_CLAN_IMAGE"] = icon ? icon.getAttribute("src") : "";
        } else if (profile && !level[prefix + "_ID"]) {
            level[prefix + "_ID"] = profile[1];
            level[prefix + "_NAME"] = node.textContent.trim();
        }
    });
}

function getLevelId(href) {
    var match = href.match(/level\?id=(\d+)/i) || href.match(/level=(\d+)/i);
    if (match) {
        return match[1]
    }
}

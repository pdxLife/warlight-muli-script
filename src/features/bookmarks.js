function setupBookmarkMenu() {
    var $body = $("body");
    $body.append(`
        <div class="modal modal-500 fade" id="bookmarkMenu" tabindex="-1" role="dialog">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Add Bookmark</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div class="d-flex flex-column">
                    <div style="padding:10px" class="d-flex flex-column">
                        <label for='bookmarkName'>Name</label>
                        <input type='text' id='bookmarkName'>
                        <label for='bookmarkURL'>Url</label>
                        <input id='bookmarkURL' type='text'>
                    </div>
                     <div class="form-check">
                        <label class="form-check-label">
                            <input id='bookmarkNewWindow' type='checkbox'>
                            Open in new Window
                        </label>
                    </div>
                </div>
              </div> 
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" data-dismiss="modal" onclick='saveBookmark()'>Save</button>
              </div>
            </div>
          </div>
        </div>
    `);

    createSelector(".highlightedBookmark", "background-color:rgb(50, 50, 50);cursor:pointer;");
    $body.append("<ul class='context-menu bookmark-context'><li onclick='editBookmark()'>Edit</li><li onclick='moveBookmarkUp()'>Move up</li><li onclick='moveBookmarkDown()'>Move Down</li></ul>");
    $body.append("<ul class='context-menu thread-context'><li onclick='hideThread()'>Hide</li></ul>");
    bindCustomContextMenu()

}

function setupBookmarkTable() {
    $(".SideColumn").prepend('<table class="dataTable" id="BookmarkTable" style="text-align: left;width:100%;"><thead><tr><td style="text-align: center">Bookmarks<img alt="add" src="' + IMAGES.PLUS + '" width="15" height="15" onclick="showAddBookmark()" style="display:inline-block;float:right; opacity: 0.6; margin-right:15px; cursor: pointer"></td></tr></thead></table><br>');

    refreshBookmarks();
    bindBookmarkTable();
}

function refreshBookmarks() {
    Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
        $("#BookmarkTable tbody").remove();
        bookmarks.sort(function (a, b) {
            return a.order - b.order
        });
        var data = "<tbody>";
        $.each(bookmarks, function (key, bookmark) {
            data += '<tr data-bookmarkId="' + htmlEscape(bookmark.id) + '" data-order="' + htmlEscape(bookmark.order) + '"><td><a ' + (bookmark.newWindow ? 'target="_blank"' : "") + ' href="' + htmlEscape(safeUrl(siteRelativeUrl(bookmark.url))) + '">' + htmlEscape(bookmark.name) + '</a>';
            data += '<a onclick="deleteBookmark(' + Number(bookmark.id) + ')" style="display:inline-block;float:right; opacity: 0.6;cursor: pointer;margin-right:5px">';
            data += '<span class="ui-icon ui-icon-trash"></span></a><span class="tuydBookmarkGrip" title="Drag to move this bookmark">⋮⋮</span>';
            data += '<a class="tuydBookmarkStep tuydBookmarkDown" title="Move down" onclick="moveBookmarkStep(' + Number(bookmark.id) + ', 1)">▼</a>';
            data += '<a class="tuydBookmarkStep tuydBookmarkUp" title="Move up" onclick="moveBookmarkStep(' + Number(bookmark.id) + ', -1)">▲</a></td></tr>';
        });

        $("#BookmarkTable").append(data + '</tbody>');
        makeBookmarksSortable();
        wljs_WaitDialogJS.Stop();

        $(".loader").fadeOut("fast", function () {
            var $loader = $(".loader");
            if ($loader) {
                $loader.remove();
                window.timeUserscriptReady = new Date().getTime();
                log("Time userscript ready " + (timeUserscriptReady - timeUserscriptStart) / 1000)
            }
        })
    })


}

window.bookmarkOrder = undefined;
window.bookmarkId = undefined;
window.showAddBookmark = function () {
    $("#bookmarkMenu").modal("show");
    window.bookmarkId = undefined;
    window.bookmarkOrder = undefined;
    $("#bookmarkURL").val("");
    $("#bookmarkName").val("");
    $("#bookmarkNewWindow").prop("checked", false);
};

window.editBookmark = function () {
    Database.read(Database.Table.Bookmarks, bookmarkId, function (bookmark) {
        $("#bookmarkURL").val(bookmark.url);
        $("#bookmarkName").val(bookmark.name);
        $("#bookmarkNewWindow").prop("checked", bookmark.newWindow);
        $("#bookmarkMenu").modal("show")
    })

};

// The order for a bookmark dropped between two others (either can be missing at the ends). Orders are
// numbers sorted ascending; a new one goes halfway between its neighbours, as Move up / Move Down do.
function bookmarkOrderBetween(before, after) {
    if (before !== null && after !== null) {
        return (before + after) / 2;
    }
    if (before !== null) {
        return before + 1;
    }
    if (after !== null) {
        return after > 0 ? after / 2 : after - 1;
    }
    return 1;
}

// Bookmarks can be dragged into a new order by the grip that shows on hover, or moved one place with its
// ▲ ▼; the right-click menu's Move up / Move Down still work. jQuery UI's sortable comes with the script's
// own jQuery ($$$), so without it only the arrows and the menu are left.
function makeBookmarksSortable() {
    addCSS(`
        #BookmarkTable .tuydBookmarkGrip,
        #BookmarkTable .tuydBookmarkStep {
            float: right;
            margin-right: 6px;
            color: #888;
            visibility: hidden;
            user-select: none;
        }
        #BookmarkTable .tuydBookmarkGrip {
            cursor: grab;
        }
        #BookmarkTable .tuydBookmarkStep {
            cursor: pointer;
            font-size: 10px;
            line-height: 20px;
            text-decoration: none;
        }
        #BookmarkTable .tuydBookmarkStep:hover {
            color: #e0c060;
        }
        #BookmarkTable tbody tr:hover .tuydBookmarkGrip,
        #BookmarkTable tbody tr:hover .tuydBookmarkStep {
            visibility: visible;
        }
        #BookmarkTable tbody tr:first-child .tuydBookmarkUp,
        #BookmarkTable tbody tr:last-child .tuydBookmarkDown {
            display: none;
        }
        #BookmarkTable .tuydBookmarkDropSpot {
            height: 30px;
            background: rgba(224, 192, 96, 0.15);
        }
    `);
    if (typeof $$$ === "undefined" || !$$$.fn.sortable) {
        return;
    }
    $$$("#BookmarkTable tbody").sortable({
        handle: ".tuydBookmarkGrip",
        axis: "y",
        placeholder: "tuydBookmarkDropSpot",
        update: function (event, ui) {
            var row = ui.item;
            var order = function (element) {
                var value = element.length ? Number(element.attr("data-order")) : NaN;
                return isNaN(value) ? null : value;
            };
            var id = Number(row.attr("data-bookmarkid"));
            var next = bookmarkOrderBetween(order(row.prev("tr")), order(row.next("tr")));
            Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
                var bookmark = bookmarks.filter(function (candidate) {
                    return candidate.id === id;
                })[0];
                if (!bookmark) {
                    return;
                }
                bookmark.order = next;
                Database.update(Database.Table.Bookmarks, bookmark, bookmark.id, function () {
                    refreshBookmarks();
                });
            });
        }
    });
}

// The order for a bookmark moved one place up (step -1) or down (1): between its new neighbours, so only
// that row is written (orders are a unique index, so swapping two would collide). null at either end.
function bookmarkStepOrder(bookmarks, id, step) {
    var orders = bookmarks.slice().sort(function (a, b) {
        return a.order - b.order;
    });
    var index = orders.map(function (bookmark) {
        return bookmark.id;
    }).indexOf(id);
    orders = orders.map(function (bookmark) {
        return bookmark.order;
    });
    var to = index + step;
    if (index < 0 || to < 0 || to >= orders.length) {
        return null;
    }
    var neighbour = function (at) {
        return at >= 0 && at < orders.length ? orders[at] : null;
    };
    return step < 0 ? bookmarkOrderBetween(neighbour(to - 1), orders[to]) : bookmarkOrderBetween(orders[to], neighbour(to + 1));
}

window.moveBookmarkStep = function (id, step) {
    Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
        var order = bookmarkStepOrder(bookmarks, id, step);
        var bookmark = bookmarks.filter(function (candidate) {
            return candidate.id === id;
        })[0];
        if (order === null || !bookmark) {
            return;
        }
        bookmark.order = order;
        Database.update(Database.Table.Bookmarks, bookmark, bookmark.id, refreshBookmarks);
    });
};

window.moveBookmarkUp = function () {
    moveBookmarkStep(bookmarkId, -1);
};

window.moveBookmarkDown = function () {
    moveBookmarkStep(bookmarkId, 1);
};

window.deleteBookmark = function (id) {
    Database.delete(Database.Table.Bookmarks, id, function () {
        refreshBookmarks();
    })
};

window.saveBookmark = function () {
    $("#bookmarkMenu").hide();
    var $bookmarkURL = $("#bookmarkURL");
    var url = $bookmarkURL.val().trim();
    url = normalizeBookmarkUrl(url);

    var $bookmarkName = $("#bookmarkName");
    var name = $bookmarkName.val().trim();
    var $bookmarkNewWindow = $("#bookmarkNewWindow");
    var newWindow = $bookmarkNewWindow.prop("checked");

    if (bookmarkId === undefined) {
        Database.readAll(Database.Table.Bookmarks, function (bookmarks) {
            bookmarks.sort(function (a, b) {
                return a.order - b.order
            });
            var bookmark = {
                name: name,
                url: url,
                newWindow: newWindow,
                order: (bookmarks.length > 0) ? bookmarks[bookmarks.length - 1].order + 1 : 1
            };
            Database.add(Database.Table.Bookmarks, bookmark, function () {
                showBookmarkTable();
                refreshBookmarks();
            })
        })
    } else {
        var bookmark = {
            name: name,
            url: url,
            newWindow: newWindow,
            order: bookmarkOrder
        };
        Database.update(Database.Table.Bookmarks, bookmark, bookmarkId, function () {
            showBookmarkTable();
            refreshBookmarks();
        })
    }

    $bookmarkURL.val('');
    $bookmarkName.val('');
    $bookmarkNewWindow.prop('checked', false);
};

function normalizeBookmarkUrl(url) {
    return /^(https?:\/\/|\/(?!\/))/i.test(url) ? url : "https://" + url;
}

function showBookmarkTable() {
    var $bookmarkTable = $("#BookmarkTable");
    $bookmarkTable.show();
    if ($bookmarkTable.next().is('br')) {
        $bookmarkTable.next().show();
    }
}

window.bookmarkForumThread = function () {
    var title = stripSiteSuffix($("title").text());
    var url = window.location.href;

    showAddBookmark();
    $("#bookmarkURL").val(url);
    $("#bookmarkName").val(title);
};
window.bookmarkTournament = function () {
    var title = tournamentNameFromTitle(document.title);
    var url = window.location.href;

    showAddBookmark();
    $("#bookmarkURL").val(url);
    $("#bookmarkName").val(title);
};

window.bookmarkLevel = function () {
    var title = $("h1").text();
    var url = window.location.href;

    showAddBookmark();
    $("#bookmarkURL").val(url);
    $("#bookmarkName").val(title);
};

function addDefaultBookmark() {
    var bookmark = {
        name: "Muli's userscript (Tidy up Your Dashboard)",
        url: "/Forum/106092",
        newWindow: false,
        order: 0
    };
    Database.add(Database.Table.Bookmarks, bookmark, function () {
        showBookmarkTable();
        refreshBookmarks();
    })
}

function bindBookmarkTable() {
    $("#BookmarkTable").on("contextmenu", function (event) {
        $(".highlightedBookmark").removeClass("highlightedBookmark");
        var row = $(event.target).closest("tr");


        window.bookmarkId = Number(row.attr("data-bookmarkid"));
        window.bookmarkOrder = Number(row.attr("data-order"));

        // A bookmark's order can be 0 (the first one saved), so only a missing one rules the menu out.
        if (bookmarkId && !isNaN(bookmarkOrder)) {
            event.preventDefault();
            row.addClass("highlightedBookmark");
            // Show contextmenu
            $(".bookmark-context").finish().toggle(100).css({
                top: event.pageY + "px",
                left: event.pageX + "px"
            });
        }

    });
}

function setupLevelBookmark() {
    $("h1").after(`
       <a style="cursor:pointer;color: #5a9da5;" onclick="bookmarkLevel()">Bookmark</a><br>
    `)
}

function bindCustomContextMenu() {
    // If the document is clicked somewhere
    $(document).on("mousedown", function (e) {
        // If the clicked element is not the menu
        if (!$(e.target).parents(".context-menu").length > 0) {
            // Hide it
            $(".context-menu").hide(100);
            $(".highlightedBookmark").removeClass("highlightedBookmark")
        }
    });
    $(".context-menu li").click(function () {
        $(".context-menu").hide(100);
    });
}

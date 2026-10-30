function loadDataTableCSS() {
    var styles = document.createElement("style");
    styles.type = "text/css";
    styles.innerHTML = getDataTableCSS();
    document.body.appendChild(styles);
}

function getDataTableCSS() {
    return `table.dataTable thead td,table.dataTable thead th{padding:6px 18px 6px 6px}table.dataTable tfoot td,table.dataTable tfoot th{padding:10px 18px 6px;border-top:1px solid #111}table.dataTable thead .sorting,table.dataTable thead .sorting_asc,table.dataTable thead .sorting_desc{cursor:pointer}table.dataTable thead .sorting,table.dataTable thead .sorting_asc,table.dataTable thead .sorting_asc_disabled,table.dataTable thead .sorting_desc,table.dataTable thead .sorting_desc_disabled{background-repeat:no-repeat;background-position:center right}table.dataTable thead .sorting{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_both.png)}table.dataTable thead .sorting_asc{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_asc.png)}table.dataTable thead .sorting_desc{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_desc.png)}table.dataTable thead .sorting_asc_disabled{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_asc_disabled.png)}table.dataTable thead .sorting_desc_disabled{background-image:url(https://cdn.datatables.net/1.10.10/images/sort_desc_disabled.png)}.dataTables_wrapper{position:relative;clear:both;zoom:1}#PlayersContainer td{white-space:nowrap}

    .dataTables_filter {
	float: right;
    }

    .dataTables_filter label {
        display: inline!important;
    }    

    .dataTables_filter input {
        padding: 3px;
        border-radius: 5px;
        margin: 5px;
    }

    .dataTables_info {
        clear: both;
        padding-top: 10px;
    }

    .pagination {
        display: inline-block;
        float: right;

    }
    #foundClansTable_wrapper .row {
        width: 100%;
    }
    .paginate_button {
        display: inline;
        padding: 5px;
    }.paginate_button.active {
        text-decoration: underline;
    }`
}

function setupCommonGamesDataTable() {
    // DataTables is attached to the script's own jQuery ($$$); war.app's $ stays untouched.
    $$$(".dataTable").DataTable({
        "order": [],
        paging: false,
        sDom: 't',
        columnDefs: [{
            targets: [0],
            orderData: [0, 3]
        }, {
            targets: [1],
            orderData: [1, 2, 3, 0]
        }, {
            targets: [2],
            orderData: [2, 3, 0]
        }, {
            targets: [3],
            orderData: [3, 2, 0]
        }],
        "aoColumns": [
            {
                "orderSequence": ["asc", "desc"]
            },
            {
                "orderSequence": ["asc", "desc"]
            },
            {
                "orderSequence": ["asc", "desc"]
            },
            {
                "orderSequence": ["asc", "desc"]
            }
        ]
    });
    loadDataTableCSS();
    setupCommonGamesHead2Head();
}

function setupCommonGamesHead2Head() {
    var games = $(".dataTable tbody tr").map(function (key, row) {
        return $(row).find("td").map(function (key, td) {
            return $(td).text()
        });
    });
    var games1v1 = games.filter(function (key, val) {
        return val[2] == "1v1"
    }).length || 0;
    var wins1v1 = games.filter(function (key, val) {
        return val[2] == "1v1" && val[3] == "Won";
    }).length;
    var gamesNotCounted = games.filter(function (key, val) {
        return val[2] == "1v1" && (val[3] == "Playing"
            || val[3] == "Removed by Host"
            || val[3] == "Ended by vote");
    }).length;
    var finished = games1v1 - gamesNotCounted;
    var winRate = finished > 0 ? (wins1v1 / finished * 100).toFixed(2) + "%" : "–";
    var losses = finished - wins1v1;
    $(".dataTable").before(`
        <table cellspacing="0" cellpadding="2" width="100%" class="dataTable head2head">
           <thead>
              <tr>
                 <td colspan="2">Head-To-Head</td>
              </tr>
           </thead>
           <tbody>
              <tr>
                 <td>1v1 Games</td>
                 <td>${games1v1}</td>
              </tr>
              <tr>
                 <td>1v1 Wins</td>
                 <td>${wins1v1}</td>
              </tr>
              <tr>
                 <td>1v1 Losses</td>
                 <td>${losses}</td>
              </tr>
              <tr>
                 <td>1v1 Win Rate</td>
                 <td>${winRate}</td>
              </tr>
           </tbody>
        </table>
    `);
    addCSS(`
        .head2head {
            width: 50% !important;
            margin-bottom: 25px;
        }
    `)
}

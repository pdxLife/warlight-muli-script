if (typeof wljs_WaitDialogJS === 'undefined') {
    wljs_WaitDialogJS = {
        Start: function () { },
        Stop: function () { }
    }
}
var logData = "";

function log(entry) {
    var time = new Date().toTimeString().slice(0, 8);
    logData += `\n${time} | ${entry}`;
}

function logError(entry) {
    var time = new Date().toTimeString().slice(0, 8);
    logData += `\n${time} | ${entry}`;
}

//ctrl+shift+2
$$$(document).keydown(function (e) {
    if (e.which === 50 && e.ctrlKey && e.shiftKey) {
        getLog()
    }
});

window.logDialog = undefined;
window.getLog = function () {
    if (logDialog) {
        logDialog.html($$$('<textarea style="height:100%;width:100%">').val(logData));
        logDialog.dialog('open')
    } else {
        logDialog = $$$('<div style="overflow:hidden">').append($$$('<textarea style="height:100%;width:100%">').val(logData)).dialog({
            width: 800,
            title: "Userscript log",
            height: 400
        });
    }
};
window.onerror = windowError;

function windowError(message, source, lineno, colno, error) {
    logError(`Error on line ${lineno} col ${colno} in ${source}`);
    logError(`${JSON.stringify(error)} ${message}`);

    if (typeof $().dialog == "function") {
        window.wlerror(message, source, lineno, colno, error)
    }
}

function setupWLError() {
    window.wlerror = window.onerror;
    window.onerror = windowError;
    window.timeDomContentReady = new Date().getTime();
    log("Time DOM content ready " + (timeDomContentReady - timeUserscriptStart) / 1000);
    log("DOM content ready");

    window.WLError = function (a, b) {
        logError(a);
        null == a && (a = "");
        console.log("WLError: " + a + ", silent=" + b);
        if (-1 != a.indexOf("NotAuth")) {
            location.reload();
        } else if (-1 != a.indexOf("WarLight Server returned CouldNotConnect")) {
            if (typeof CNCDialog === 'function') CNCDialog();
        } else if (
            -1 == a.indexOf("TopLine is not defined") &&
            -1 == a.indexOf("_TPIHelper") &&
            -1 == a.indexOf("Syntax error, unrecognized expression: a[href^=http://]:not([href*=") &&
            -1 == a.indexOf("y2_cc2242") &&
            -1 == a.indexOf("Error calling method on NPObject")
        ) {
            if (-1 != a.indexOf("WARLIGHTERROR48348927984712893471394")) a = "ServerError";
            else if (-1 != a.indexOf("WARLIGHTHEAVYLOAD48348927984712893471394")) a = "HeavyLoad";
            if (typeof ReportError === 'function') ReportError(a);
            if (!b && typeof PopErrorDialog === 'function') PopErrorDialog(a);
        }
    }
}

function getRankText(n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function htmlEscape(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function safeUrl(url) {
    var value = String(url == null ? "" : url).trim();
    return /^(https?:\/\/|\/(?!\/))/i.test(value) ? value : "#";
}

function formatCount(value) {
    return htmlEscape(typeof value === "number" ? value.toLocaleString("en-US") : value);
}

// Starting a cell with = + - or @ makes a spreadsheet read it as a formula, so such cells get a leading '.
function csvCell(value) {
    var text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
    }
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

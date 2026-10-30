function siteName() {
    var meta = document.querySelector("meta[property='og:site_name']");
    return (meta && meta.getAttribute("content")) || "War.app";
}

function stripSiteSuffix(title) {
    var name = siteName().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return title.replace(new RegExp("\\s+-\\s+" + name + "(?:\\s+-.*)?$", "i"), "").trim();
}

function siteRelativeUrl(url) {
    var match = /^https?:\/\/([^\/?#]+)(.*)$/i.exec(String(url).trim());
    if (!match) {
        return url;
    }
    var host = match[1].replace(/:\d+$/, "").toLowerCase();
    var onSite = SITE_HOSTS.some(function (siteHost) {
        return host === siteHost || host.endsWith("." + siteHost);
    });
    return onSite ? (match[2] || "/") : url;
}

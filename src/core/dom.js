// war.app numbers element ids when it draws a view again in the same page (ujs_CreatorLabel_2_tmp),
// so its elements are looked up by name with an optional number. The newest one wins.
function ujsElement(name, suffix) {
    var pattern = new RegExp("^ujs_" + name + "(?:_\\d+)?" + (suffix || "") + "$");
    var matches = $("[id^='ujs_" + name + "']").filter(function () {
        return pattern.test(this.id);
    });
    return matches.length ? matches[matches.length - 1] : null;
}

function shownUjsElement(element) {
    var body = element && element.ownerDocument ? element.ownerDocument.body : document.body;
    for (; element && element !== body; element = element.parentElement) {
        if (element.style && element.style.display === "none") {
            return false;
        }
    }
    return !!element;
}

function addCSS(css) {
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    if (head) {
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);
    } else {
        $$$(document).ready(function () {
            addCSS(css)
        })
    }
}

/**
 * Create a CSS selector
 * @param name The name of the object, which the rules are applied to
 * @param rules The CSS rules
 */
function createSelector(name, rules) {
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    if (head) {
        head.appendChild(style);
        if (!(style.sheet || {}).insertRule) {
            (style.styleSheet || style.sheet).addRule(name, rules);
        } else {
            style.sheet.insertRule(name + "{" + rules + "}", 0);
        }
    } else {
        $$$(document).ready(function () {
            createSelector(name, rules)
        })
    }
}

function setGlobalStyles() {
    /** Warzone **/
    addCSS(`
        body > .container-fluid {
            font-size: 15px;
        }
        .modal-1000 .modal-dialog {
            max-width: 1000px;
        }        
        .modal-750 .modal-dialog {
            max-width: 750px;
        }
        .modal-500 .modal-dialog {
            max-width: 500px;
        }
        .modal-dialog {
            border: 1px gray solid;
        }
        .modal-header {
            background-image: radial-gradient(circle at center,#88888855,transparent),url(https://warzonecdn.com/Images/Warzone/MainNavBacking2.jpg);
            background-repeat: no-repeat,repeat;
            background-size: 100% 100%,194px 194px;
           }   
        .modal-content {
            background-image: linear-gradient(-10deg,#33333322 0%,transparent 70%),url(https://warzonecdn.com/Images/Warzone/Background2.jpg);
            background-repeat: no-repeat,repeat;
            background-size: 100% 100%,10px 15px;
            color: grey;
        }   
        .modal-content a {
            color: #5a9da5;
        }
        .modal-content .title {
            border-bottom: 1px solid #928f59;
            margin-top: 25px;
        }
        .p-4 table {
            width: 100%;
        }
        .GameRow p {
            margin: 0 !important;
        }
        h2, h3 {
            font-size: 25px;
        }
        img[src*='/Images/X.png'] {
            width: 100%; 
            height: 100%;
        }
    `);

    /** Warlight **/

    $("tr:contains('WarLight Shop'), tr:contains('War.app Shop')").closest(".dataTable").attr("id", "ShopTable");
    createSelector('.help-icon', 'display:inline-block;position:absolute; margin-left:10px;margin-top: 2px;cursor:pointer; height: 15px; width: 15px;');
    var winHeight = $(window).height();
    createSelector(".newSetting", "color: gold;font-weight: bold;");
    createSelector(".userscript-menu img", "height: 18px;display: inline-block;position: relative;margin-bottom: -5px;margin-right: 7px;");
    createSelector(".context-menu", "display: none;z-index: 100;position: absolute;overflow: hidden;border: 1px solid #CCC;white-space: nowrap;font-family: sans-serif;background: #FFF;color: #333;border-radius: 5px;padding: 0;");
    createSelector(".context-menu li", "padding: 8px 12px;cursor: pointer;list-style-type: none;");
    createSelector(".context-menu li:hover", "background-color: #DEF;");
    createSelector("#MyGamesTable thead tr", "text-align: right");
}

function setupImages() {
    window.IMAGES = {
        EYE: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAUCAYAAADlep81AAAAAXNSR0IArs4c6QAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeGVYSWZNTQAqAAAACAAEARoABQAAAAEAAAA+ARsABQAAAAEAAABGASgAAwAAAAEAAgAAh2kABAAAAAEAAABOAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAJKADAAQAAAABAAAAFAAAAAC4oG9NAAAACXBIWXMAAAsTAAALEwEAmpwYAAADH0lEQVRIDa2WS0hWQRTHuy6KKKOSMnu4theYJYgRX/SmB21qEQSFLVxkREgFRUEtW0hQRFBRC2tRm0LMoOj9IiGKHiBkYWQZFZGImalfv/91Rqe5k35oB37fOfM/M/eeO3dm7heNGKKl0+lChk4cYPiTKIraBsgHU1FQDYgUUIxcBJtNej5+tIlD7hXid2iCanhIga344RmFlMJF6IDhWAODd8CEIVXEwBRcht/g200EMZh1BTo0olVC8HUHXxmdy3iKU5DlPM0N4no4D6+NfgX/BbpNWy4fVpr2W/wBWAXLYQpYu0+wkdfYYoWEp5BcuA7dYO0DwSFIFI82DhbBBofpxCn4BLLboH55cBJc+0ijPFGIBBI5UO/2Jj4Gk4MDjEj+gTemhXYZzIH3Jldj7hHRTkGz0eV6IFkU4n5lHatyC0FfB9thmqevRXNnlGZsW/hNgXKdUGLHEReCLZYw3QQzbF6zs1OqY0f7kgToeg32qRYT6xXNhFHqhw8tcN1Q4+6AzK6r+NK0NYOflTD2Ap+ji+WD1ok1JfxZWGqT+BLQTdrgKWyC1fATfNORcdWItXElzg/6PnCPk9PaRQXgFlDDym92xins8drttMfAPLgAR0C7zTeNs5sh20/SPgvfHH2bCtIWfu6I8YJ02gp/QafR5Eea2LrZBP1rwKq9vss0f/wtx609/E41uvr1LhWmbaGZVuv0/vWtio04Cx6b5EG8TtzBrJEORaAFK9NZ1Ge0q2K1/6fOTUboFaAtaE2LeIHtRLzbJLStZ8Fd0/6X09o6bJLv8Hm6Fl730nHimo6b5AwjloO7hXXzZaAZygY9tewEzIW9YGeAMB5bi18D2o1fQVZhiskj9g/HR2i59sETnmQZuEXRTJ+BAtgKrSDTzlwCxbDesAKv4+A4WKsjUPHaifb0trl7BJMSRfgCnVJwC3y7hnDJEzWL5wzKu/aGhmbEnmE2pw92JQQ/sH49cZvO40GLtwFcc9eZq4dif6Y76KS/MqXBm2YiMlgfRq0tTW87DMVeMqga9Cfv/xkX1DdI6+YZZGK76KT+YzOt4g/tMcO6R7Vx2QAAAABJRU5ErkJggg==',
        EYE_ICON: 'data:image/png;base64,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',
        EYE_ICON_HOVER: 'data:image/png;base64,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',
        QUESTION: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeGVYSWZNTQAqAAAACAAEARoABQAAAAEAAAA+ARsABQAAAAEAAABGASgAAwAAAAEAAgAAh2kABAAAAAEAAABOAAAAAAAAAwwAAAABAAADDAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAABguP1VAAAACXBIWXMAAHf1AAB39QG+gBuGAAADrElEQVRYCb2XzUtUURiHZ0pTCFEKgjAQo2iRH+QiBEUXbQq1P6D+gShxqRGBi1pUzCJatRFpVQvBTUg7wYQIRKLPZWhtooWafYHZ9Pyu972893rvnZmCXnjmvOf9OmfmnnvOmUKhBimXyy0wCGOwBibSZRuElhpKVhdK0T6YglWoJIpRbF911XOiKNINM7AFSZFtMyTLr9zunCGyXSTqJ/0CXl7SuQPnoQPaQqTLJp9ivKjGWPZIKR4SSr4C+iKMwL6U8JhJMWGscryUYoFpHaKL4Af/Tn8cKg6crKecMPcnrYlqF5OxUR/nqEXSrsO5yOkU7I1wFHpCjjh3TMU/DP6NuRILsA5BnaBFJfkBZ81nLTbF3IO38A22QzTZeRixWN9iHwL7JTbQO7w/0DHOgsn4rgAMOK9ZQEart+FiRu6Ey5mNxeDoBXuVnqGnPnPsHaBvnScrOHdtRti0JlRborF6o0nQmQaJig9FjoSCT0Vm4Dr0wwA8hKSkbkIE6VHYF5gOymNoho8geQ31iXFjXfyxVUy/FbQevAzEksIOAfWgMSQas3kPvi5oDWPmisXiVqinNvjLCcdx+g3Oton+3vUjNaw9Fxo0Zpcm0BNFFAoLTq+o8g0aCboBe13wIwb64PpJ9akz9Ghl6xWSaGGcdM6KKvF3lejkHfqhvET8XWALfl0TMPmK0p6X7H3Eamv+bcm0n+GUj0nTiWkHjRXIX02ATC2m5zslgk9N5ELagEkbcbsmUPMjoMgJsJ0NtbwEfh0kx436xMUegRbhZOito632ERwk1q/8Fyy87bBOpaaNAI0lmZSyHKg7H3p/H7t+lrqK4yboldU3X4Jqpd8FLmsN1LQRWTJ5++E0HDZbpZbYBngDkmAjCnLoTMuC5G7FNgBxZ8B2T52gl82X1xKno9nenOkoFmNVh5ESiNWlZR68fKJzICqYouDPPozCwv44nkipEZgoVAf2M6IGovuDFlem4M8+jpVFgL+Q6BXLOxV1KfGiY9a/FbGJ4PMXEj2yzliAdXCMgskayrD5fIu9CW7DAjyAY97vdXx67qplMur9MZ0IPd+SRdLql/h/l1KbTWISms8iaO9PvSlZnlpidGHVfwTleCn5ONNjlwszqiXzEs0taFY/lFe0T2ARVkBnv6QJtAi1yegm3QEmGyhX2Snvm6Hqlklo354BOz5RI/mFppuQkJ4U5ShXF55/E4r0wRT83z+nyWkzgRYYhDHwK1u6bIOw60acrOP7fwAawRQpHCf63QAAAABJRU5ErkJggg==',
        PLUS: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAeGVYSWZNTQAqAAAACAAEARoABQAAAAEAAAA+ARsABQAAAAEAAABGASgAAwAAAAEAAgAAh2kABAAAAAEAAABOAAAAAAAABuwAAAABAAAG7AAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACi3Qz1AAAACXBIWXMAARCEAAEQhAE/RUVgAAABbUlEQVRYCe2Xu0oDURCGPRo0oFgErKzsfAPBh0jrU1iKL2Fr4VMIgp2dD6GlhaRMIUm8RY/fv8rKCXtuZtdA2IEpZs4/lx1mfhKzkinW2g4hfXRvJnSAfWmMeZnx12vSwAnqk7N6q1Vko/Ktrzr+O1QTSpbVZGQa0AIzadBvVN0N5NQusG0D7QSWcgKfOadQkgYEskbgekJwaGrigE1yvUfyTKHsAlOQBgFHBJyi25FAPe+iXQ/uDf8jKkIKyYTHc5q4MBTvYdyjO6GIBt5eybmvceqrtxooEEu5AaCnBjSurMWJZU58V10bWqjEPPPB1IAWcRGNqK5R4Sd0hP63aAmHHU5hyCUcYyziDB8KHtCn00QqEd0AP1RMheicD9BkIiqZkEl8EPhckdRx0WjoYrTZ459cTpzPaGL5snJmgX1fMY+/baCdwNJNQMQW+zHiHM1fJnDlZHCNa0ho6rrCVknFYdjvK0wo9qzt7/kXIMaNW1QFn78AAAAASUVORK5CYII='
    }
}

// The panels wear war.app's own dialog, row and button art, found by file name on the page so they
// follow war.app's updates. Their buttons use war.app's blue tint instead of its green, so the
// panels read as additions; war.app's CDN serves only the tints the game itself uses.
function warappArt(scene) {
    var sources = $(scene).find("[id$='_img']").map(function () {
        var value = $(this).css("border-image-source") || "";
        return /^url\(/.test(value) ? value : null;
    }).get();
    var find = function (pattern) {
        return sources.filter(function (value) {
            return pattern.test(value);
        })[0] || "";
    };
    var button = find(/UIButton-[0-9A-Fa-f]{6}\.png/);
    return {
        "--tuyd-dialog": find(/\/DialogBacking\.png/),
        "--tuyd-row": find(/\/DialogForeground\.png/),
        "--tuyd-button": button.replace(/UIButton-[0-9A-Fa-f]{6}/, "UIButton-242D9A")
    };
}

function registerDataTableSorting() {
    $.extend($$$.fn.dataTableExt.oSort, {
        "rank-pre": function (a) {
            return a.match(/([0-9]*)/)[1] || 9999;
        },
        "rank-asc": function (a, b) {
            return a < b;
        },
        "rank-desc": function (a, b) {
            return a > b;
        }
    });

    $.extend($$$.fn.dataTableExt.oSort, {
        "numeric-comma-pre": function (a) {
            return Number(a.replace(/,/g, ""))
        },
        "numeric-comma-asc": function (a, b) {
            return a < b;
        },
        "numeric-comma-desc": function (a, b) {
            return a > b;
        }
    });
}

function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    var area = $("<textarea>").val(text).css({ position: "fixed", left: "-10000px" }).appendTo("body");
    area[0].select();
    var copied = document.execCommand("copy");
    area.remove();
    return copied ? Promise.resolve() : Promise.reject(new Error("copy failed"));
}

function downloadText(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var link = $("<a>").attr({ href: url, download: name }).appendTo("body");
    link[0].click();
    link.remove();
    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);
}

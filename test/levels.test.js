const { test } = require("node:test");
const assert = require("node:assert/strict");
const acorn = require("acorn");
const { source, createDom, load, domGlobals } = require("./harness");

// Mirrors the markup of war.app's /SinglePlayer/Level page.
function levelPage({ recordHolder } = {}) {
    return `<!doctype html><html><head><title>Level: Fixture</title></head><body>
        <script>window.pagescriptRan = true;</script>
        <div class="container bg-gray p-4 mt-3 mb-5" id="AutoContainer">
            <table cellspacing="20" width="900"><tr>
                <td><img src="https://warappcdn.com/s3/Data/Thumbs/Maps/1/6_Big.jpg" width="500" height="300" /></td>
                <td style="vertical-align:top">
                    <h1>4 citadels</h1>
                    <font class="text-muted">Created by</font> <a href="/Profile?p=6942918868&u=aaa_1">aaa</a><img src="https://warappcdn.com/Images/SmallMemberIcon.png" title="War.app Member" /> (<a href="LevelsByCreator?p=429188">all</a>)<br />
                    <font class="text-muted">State: </font> Public<br />
                    <font class="text-muted">Number of attempts:</font> 1,254<br />
                    <font class="text-muted">Number of wins:</font> 677<br />
                    <font class="text-muted">Number of likes:</font> 105<br />
                    ${recordHolder === false ? "" : `<font class="text-muted">Record holder:</font> <a href="/Clans/?ID=837" title="501st Legion"><img border="0" src="https://warappcdn.com/s3/Data/Clans/837/Icon/849471913.png" /></a><a href="/Profile?p=99100195125&u=Jose_2">Jose</a> in 13 turns on 2026-10-11<br />`}
                    <div id="PlayLink"></div>
                </td>
            </tr></table>
        </div></body></html>`;
}

function parser(dom) {
    return load(["parseLevelPage", "readLevelPlayer"], { DOMParser: dom.window.DOMParser });
}

test("parseLevelPage reads the level card from war.app's level page", () => {
    const { dom } = createDom();
    const level = parser(dom).parseLevelPage(levelPage(), "1592396");
    assert.deepEqual(JSON.parse(JSON.stringify(level)), {
        ID: "1592396",
        NAME: "4 citadels",
        MAP_IMAGE: "https://warappcdn.com/s3/Data/Thumbs/Maps/1/6_Big.jpg",
        CREATOR_ID: "6942918868",
        CREATOR_NAME: "aaa",
        ATTEMPTS: "1,254",
        WINS: "677",
        LIKES: "105",
        RECORD_HOLDER_CLAN_ID: "837",
        RECORD_HOLDER_CLAN_NAME: "501st Legion",
        RECORD_HOLDER_CLAN_IMAGE: "https://warappcdn.com/s3/Data/Clans/837/Icon/849471913.png",
        RECORD_HOLDER_ID: "99100195125",
        RECORD_HOLDER_NAME: "Jose",
        RECORD_TURNS: 13,
        WIN_RATE: "53.99"
    });
    assert.equal(dom.window.pagescriptRan, undefined);
});

test("parseLevelPage handles levels without a record and unknown pages", () => {
    const { dom } = createDom();
    const ctx = parser(dom);
    const level = ctx.parseLevelPage(levelPage({ recordHolder: false }), "1");
    assert.equal(level.RECORD_HOLDER_NAME, undefined);
    assert.equal(ctx.parseLevelPage("<html><body>Not found</body></html>", "1"), undefined);
});

test("forum level links are replaced with a card fetched from war.app", () => {
    const { dom, $ } = createDom(`<div class="region"><a id="link" href="https://war.app/SinglePlayer/Level?ID=1592396">level</a></div>`);
    const requests = [];
    $.ajax = (options) => {
        requests.push(options);
        return $.Deferred().resolve(levelPage()).promise();
    };
    const ctx = load(["parseSPLevel", "parseLevelPage", "readLevelPlayer", "renderLevelRow", "getLevelId", "htmlEscape", "safeUrl", "getTurnText"], {
        ...domGlobals(dom, $),
        DOMParser: dom.window.DOMParser,
        log: () => { }
    });
    ctx.parseSPLevel(dom.window.document.getElementById("link"), "https://war.app/SinglePlayer/Level?ID=1592396");

    assert.deepEqual(requests.map((r) => r.url), ["/SinglePlayer/Level?ID=1592396"]);
    assert.equal($("#link").length, 0);
    assert.match($(".SPTable").text(), /4 citadels[\s\S]*Jose in 13 turns/);
});

test("maak.ch is only reachable through the opt-in setting", () => {
    const setting = source.match(/id: 'useMaakServices',\s*text: '[^']*',\s*selected: (\w+)/);
    assert.ok(setting, "useMaakServices setting exists");
    assert.equal(setting[1], "false");

    const references = new Map();
    const maakFunctions = [];
    for (const node of acorn.parse(source, { ecmaVersion: "latest" }).body) {
        if (node.type !== "FunctionDeclaration") continue;
        const body = source.slice(node.start, node.end);
        if (body.includes("https://maak.ch")) maakFunctions.push(node.id.name);
        for (const [, name] of body.matchAll(/\b([A-Za-z_]\w*)\b/g)) {
            if (name === node.id.name) continue;
            if (!references.has(name)) references.set(name, new Set());
            references.get(name).add(node.id.name);
        }
    }
    const callers = (name) => [...(references.get(name) || [])];

    const allowed = new Set(["setupMaakFeatures"]);
    const queue = [...maakFunctions];
    const seen = new Set();
    while (queue.length) {
        const fn = queue.shift();
        if (seen.has(fn) || allowed.has(fn)) continue;
        seen.add(fn);
        const fnCallers = callers(fn);
        assert.ok(fnCallers.length > 0 || !source.includes(`${fn}(`), `maak.ch code is reachable from top-level code via ${fn}, bypassing setupMaakFeatures`);
        queue.push(...fnCallers);
    }
    assert.ok(maakFunctions.length > 0);
    assert.ok(![...seen].some((fn) => ["DOM_ContentReady", "databaseReady"].includes(fn)), [...seen].join(", "));
    assert.doesNotMatch(source.slice(0, source.indexOf("function ")), /https:\/\/maak\.ch/);
});

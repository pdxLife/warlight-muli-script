const { test } = require("node:test");
const assert = require("node:assert/strict");
const acorn = require("acorn");
const { source, load } = require("./harness");

const SITE_AND_BROWSER_GLOBALS = new Set([
    "$", "$$$", "jQuery", "CNCDialog", "CreateModal", "PopErrorDialog", "ReportError",
    "Number", "String", "alert", "atob", "btoa", "clearInterval", "clearTimeout", "decodeURIComponent", "encodeURIComponent",
    "encodeURI", "isNaN", "parseInt", "setInterval", "setTimeout", "structuredClone", "unescape"
]);

function walk(node, visit) {
    if (!node || typeof node.type !== "string") return;
    visit(node);
    for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
        else if (value && typeof value.type === "string") walk(value, visit);
    }
}

test("every function the script calls or registers as a feature is defined", () => {
    const declared = new Set();
    const used = new Map();
    walk(acorn.parse(source, { ecmaVersion: "latest", locations: true }), (node) => {
        if (node.type === "FunctionDeclaration") declared.add(node.id.name);
        if (node.type === "VariableDeclarator" && node.id.type === "Identifier") declared.add(node.id.name);
        if (/Function/.test(node.type)) node.params.forEach((p) => p.type === "Identifier" && declared.add(p.name));
        if (node.type === "CatchClause" && node.param) declared.add(node.param.name);
        if (node.type === "AssignmentExpression" && node.left.type === "MemberExpression" && node.left.object.name === "window") {
            declared.add(node.left.property.name);
        }
        if (node.type === "CallExpression" && node.callee.type === "Identifier") used.set(node.callee.name, node.loc.start.line);
        if (node.type === "Property" && ["run", "match"].includes(node.key.name) && node.value.type === "Identifier") {
            used.set(node.value.name, node.loc.start.line);
        }
    });
    const missing = [...used].filter(([name]) => !declared.has(name) && !SITE_AND_BROWSER_GLOBALS.has(name));
    assert.deepEqual(missing.map(([name, line]) => `${name} (line ${line})`), []);
});

test("a failing feature is logged and later features still run", () => {
    const logs = [];
    const ctx = load(["runFeatures", "runFeature", "disabledFeatures"], { logError: (entry) => logs.push(entry), log: () => { }, localStorage: new Map() });
    const ran = [];
    ctx.runFeatures([
        { name: "first", run: () => ran.push("first") },
        { name: "broken", run: () => { throw new Error("selector changed"); } },
        { name: "broken match", match: () => { throw new Error("bad match"); }, run: () => ran.push("never") },
        { name: "skipped", match: () => null, run: () => ran.push("skipped") },
        { name: "last", match: () => ["matched"], run: () => ran.push("last") }
    ]);
    assert.deepEqual(ran, ["first", "last"]);
    assert.equal(logs.length, 2);
    assert.match(logs[0], /Feature "broken" failed: Error: selector changed/);
    assert.match(logs[1], /Feature "broken match" failed/);
});

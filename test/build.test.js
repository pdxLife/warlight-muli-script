const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const acorn = require("acorn");
const { SRC, OUTPUT, FIRST, sourceFiles, build } = require("../tools/build");

const parsed = sourceFiles().map((file) => {
    const code = fs.readFileSync(path.join(SRC, file), "utf8");
    return { file, code, ast: acorn.parse(code, { ecmaVersion: "latest" }) };
});

function walkLoadTime(node, visit) {
    if (!node || typeof node.type !== "string" || /Function/.test(node.type)) return;
    visit(node);
    for (const [key, value] of Object.entries(node)) {
        if (key === "property" && !node.computed) continue;
        if (key === "key" && !node.computed) continue;
        if (Array.isArray(value)) value.forEach((child) => walkLoadTime(child, visit));
        else if (value && typeof value.type === "string") walkLoadTime(value, visit);
    }
}

test("the committed userscript is what src/ builds", () => {
    assert.ok(fs.readFileSync(OUTPUT, "utf8") === build(), "Tidy_up_your_Dashboard.user.js is out of date: edit src/, then run npm run build");
});

test("the header holds only the metadata block", () => {
    const [header] = parsed;
    assert.equal(header.file, "header.js");
    assert.equal(header.ast.body.length, 0);
    assert.match(header.code, /^\/\/ ==UserScript==\n[\s\S]*\/\/ ==\/UserScript==\n$/);
});

test("no file reads another file's top-level variable while the script loads", () => {
    const owners = new Map();
    for (const { file, ast } of parsed) {
        for (const node of ast.body) {
            if (node.type !== "VariableDeclaration") continue;
            node.declarations.forEach((declaration) => owners.set(declaration.id.name, file));
        }
    }
    const reads = [];
    for (const { file, ast } of parsed.filter(({ file }) => !FIRST.includes(file))) {
        for (const statement of ast.body) {
            walkLoadTime(statement, (node) => {
                if (node.type !== "Identifier" || !owners.has(node.name)) return;
                const owner = owners.get(node.name);
                if (owner !== file && !FIRST.includes(owner)) reads.push(`${file} reads ${node.name} from ${owner}`);
            });
        }
    }
    assert.deepEqual(reads, []);
});

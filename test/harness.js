const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const acorn = require("acorn");
const { JSDOM } = require("jsdom");
const jqueryFactory = require("jquery");

const SCRIPT_PATH = path.join(__dirname, "..", "Tidy_up_your_Dashboard.user.js");
const source = fs.readFileSync(SCRIPT_PATH, "utf8");

// The userscript runs page setup at load time, so tests evaluate individual
// top-level functions instead of the whole file.
const functionSources = new Map();
for (const node of acorn.parse(source, { ecmaVersion: "latest" }).body) {
    if (node.type === "FunctionDeclaration") {
        functionSources.set(node.id.name, source.slice(node.start, node.end));
    }
}

function createDom(html = "", url = "https://war.app/MultiPlayer/") {
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url });
    // jsdom has no layout, so jQuery's :visible would treat every element as hidden.
    Object.defineProperty(dom.window.HTMLElement.prototype, "offsetWidth", {
        get() {
            for (let el = this; el; el = el.parentElement) {
                if (el.style.display === "none") return 0;
            }
            return 1;
        }
    });
    const $ = jqueryFactory(dom.window);
    $.fx.off = true;
    return { dom, $ };
}

function load(names, globals = {}) {
    const context = vm.createContext({ console, atob, btoa, structuredClone, ...globals });
    vm.runInContext("globalThis.window = globalThis;", context);
    for (const name of names) {
        const fn = functionSources.get(name);
        if (!fn) throw new Error(`Function ${name} not found in userscript`);
        vm.runInContext(fn, context, { filename: `${name}.js` });
    }
    return context;
}

function domGlobals(dom, $) {
    return {
        $,
        jQuery: $,
        document: dom.window.document,
        MutationObserver: dom.window.MutationObserver,
        sessionStorage: dom.window.sessionStorage
    };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

module.exports = { source, functionSources, createDom, load, domGlobals, flush };

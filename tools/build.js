const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUTPUT = path.join(ROOT, "Tidy_up_your_Dashboard.user.js");
const MARKER = "// Built from src/ by tools/build.js. Edit src/, then run npm run build.\n";
// Boot starts before every other file's top-level code has run, so nothing else may depend on the order of those files.
const FIRST = ["header.js", "core/constants.js", "core/boot.js"];

function sourceFiles() {
    const rest = fs.readdirSync(SRC, { recursive: true })
        .filter((file) => file.endsWith(".js") && !FIRST.includes(file))
        .sort();
    return [...FIRST, ...rest];
}

function build() {
    const [header, ...body] = sourceFiles().map((file) => fs.readFileSync(path.join(SRC, file), "utf8"));
    return [header, MARKER, ...body].join("");
}

if (require.main === module) {
    fs.writeFileSync(OUTPUT, build());
}

module.exports = { SRC, OUTPUT, FIRST, sourceFiles, build };
